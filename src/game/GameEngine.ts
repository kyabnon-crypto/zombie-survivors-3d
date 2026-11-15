import * as THREE from 'three';
import { ZOMBIE_CHARACTERS, type ZombieCharDef } from '../data/characters';
import { PATCH_CATALOG, type PatchDef } from '../data/patches';
import { SoundEngine } from '../audio/SoundEngine';
import { ARENA_RADIUS, buildGraveyardArena, type GraveyardArena } from './Arena';
import { buildEnemyPuppet, buildPlayablePuppet, type EnemyKind, type PuppetRig } from './CharacterModels';
import { makeFeltMaterial } from './FeltMaterials';

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  kills: number;
  buttons: number;
  elapsed: number;
  wave: number;
  fever: number;
  feverActive: boolean;
  feverTimeLeft: number;
  dashCooldownRatio: number;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  activePatches: Record<string, number>;
}

export interface GameCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onLevelUp: (choices: Array<{ patch: PatchDef; nextLevel: number }>) => void;
  onGameOver: (victory: boolean, summary: HudSnapshot) => void;
  onFloatingText: (screenX: number, screenY: number, text: string, color: string) => void;
}

interface EnemyEntity {
  id: number;
  kind: EnemyKind;
  mesh: THREE.Group;
  animPart: THREE.Object3D;
  animPart2?: THREE.Object3D;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  stunTimer: number;
  hitFlash: number;
  poisonTimer: number;
  slipSpin: number;
  isBoss: boolean;
}

interface ProjectileEntity {
  kind: 'rabbit' | 'eyeball' | 'arcane';
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
  bouncesLeft: number;
  hitIds: Set<number>;
}

interface TrapEntity {
  kind: 'banana' | 'acid';
  mesh: THREE.Group;
  x: number;
  z: number;
  radius: number;
  life: number;
  tickTimer: number;
  damage: number;
}

interface PickupEntity {
  kind: 'xp' | 'button' | 'bread';
  mesh: THREE.Mesh;
  x: number;
  z: number;
  value: number;
  life: number;
}

interface CottonParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

export class GameEngine {
  private container: HTMLElement;
  private sound: SoundEngine;
  private callbacks: GameCallbacks;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private arena: GraveyardArena;

  private charDef: ZombieCharDef = ZOMBIE_CHARACTERS[0];
  private playerRig: PuppetRig | null = null;
  private playerX = 0;
  private playerZ = 0;
  private playerYaw = 0;
  private playerScaleBounce = 1;

  // Input state
  private joyX = 0;
  private joyZ = 0;
  private keys = new Set<string>();
  public autoAttack = true;

  // Player stats
  private hp = 100;
  private maxHp = 100;
  private speedMult = 1;
  private damageMult = 1;
  private pickupRadius = 4.2;
  private xp = 0;
  private xpNext = 45;
  private level = 1;
  private kills = 0;
  private buttons = 0;
  private fever = 0;
  private feverActive = false;
  private feverTimer = 0;
  private invulnTimer = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirZ = 1;

  // Attack & patch timers
  private primaryTimer = 0;
  private bananaTimer = 1.5;
  private rabbitTimer = 1.0;
  private eyeballTimer = 1.8;
  private flaskTimer = 2.4;
  private chickenTimer = 2.6;
  private whiskAngle = 0;
  private whiskMeshes: THREE.Mesh[] = [];
  private activePatches: Record<string, number> = {};

  // World entities
  private nextEnemyId = 1;
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private traps: TrapEntity[] = [];
  private pickups: PickupEntity[] = [];
  private particles: CottonParticle[] = [];
  private shockwaves: ShockwaveRing[] = [];

  // Shared geometries & materials
  private cottonGeo = new THREE.SphereGeometry(0.18, 7, 7);
  private cottonMat = makeFeltMaterial(0xfaf8f2, { roughness: 1 });
  private xpGeo = new THREE.OctahedronGeometry(0.24, 0);
  private xpMat = new THREE.MeshStandardMaterial({ color: 0xb16cff, emissive: 0x7a2cff, emissiveIntensity: 0.9 });
  private buttonGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12);
  private buttonMat = new THREE.MeshStandardMaterial({ color: 0xffd15c, emissive: 0xaa6600, emissiveIntensity: 0.4, roughness: 0.4 });
  private breadGeo = new THREE.BoxGeometry(0.42, 0.3, 0.32);
  private breadMat = makeFeltMaterial(0xd9964e);

  // Loop state
  private rafId = 0;
  private lastTime = 0;
  private animClock = 0;
  private elapsed = 0;
  private spawnTimer = 0;
  private wave = 1;
  private bossSpawned = false;
  private running = false;
  private paused = false;
  private ended = false;
  private hitstopTimer = 0;
  private shakeStrength = 0;
  private hudSyncTimer = 0;
  private lobbyPreviewMode = true;

  constructor(container: HTMLElement, sound: SoundEngine, callbacks: GameCallbacks) {
    this.container = container;
    this.sound = sound;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);
    this.arena = buildGraveyardArena(this.scene);

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.setLobbyCharacter(ZOMBIE_CHARACTERS[0].id);
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // Adaptive FOV for Portrait vs Landscape mobile/tablet!
    this.camera.fov = w < h ? 58 : 46;
    this.camera.updateProjectionMatrix();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (!this.running || this.paused) return;
    if (k === ' ') {
      e.preventDefault();
      this.triggerDash();
    } else if (k === 'j') {
      this.triggerPrimaryAttack(true);
    } else if (k === 'e' || k === 'k') {
      this.triggerFever();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  public setJoystick(nx: number, nz: number): void {
    this.joyX = nx;
    this.joyZ = nz;
  }

  public setLobbyCharacter(charId: string): void {
    const found = ZOMBIE_CHARACTERS.find((c) => c.id === charId) || ZOMBIE_CHARACTERS[0];
    this.charDef = found;
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
    }
    this.playerRig = buildPlayablePuppet(found.id);
    this.playerRig.root.position.set(0, 0, 0);
    this.scene.add(this.playerRig.root);
  }

  public startRun(charId: string, autoAttackMode: boolean): void {
    this.clearEntities();
    this.lobbyPreviewMode = false;
    this.autoAttack = autoAttackMode;
    this.setLobbyCharacter(charId);

    this.playerX = 0;
    this.playerZ = 0;
    this.playerYaw = 0;
    this.maxHp = this.charDef.hp;
    this.hp = this.maxHp;
    this.speedMult = 1;
    this.damageMult = 1;
    this.pickupRadius = 4.4;
    this.xp = 0;
    this.xpNext = 45;
    this.level = 1;
    this.kills = 0;
    this.buttons = 0;
    this.fever = 25;
    this.feverActive = false;
    this.feverTimer = 0;
    this.invulnTimer = 0.5;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.elapsed = 0;
    this.wave = 1;
    this.spawnTimer = 0.4;
    this.bossSpawned = false;
    this.ended = false;
    this.paused = false;
    this.running = true;

    this.activePatches = { [this.charDef.startingPatch]: 1 };
    this.syncWhiskMeshes();

    // Seed a few initial enemies around player so action starts immediately!
    for (let i = 0; i < 6; i++) {
      this.spawnEnemy('scissor');
    }
    this.sound.startBgm('main');
    this.emitHud();
  }

  public returnToLobby(): void {
    this.clearEntities();
    this.running = false;
    this.paused = false;
    this.lobbyPreviewMode = true;
    this.playerX = 0;
    this.playerZ = 0;
    this.playerYaw = 0;
    this.setLobbyCharacter(this.charDef.id);
    this.sound.stopBgm();
  }

  public setPaused(p: boolean): void {
    this.paused = p;
  }

  public applyPatch(patchId: string): void {
    const cur = this.activePatches[patchId] || 0;
    this.activePatches[patchId] = cur + 1;

    if (patchId === 'cotton_padding') {
      this.maxHp += 25;
      this.hp = Math.min(this.maxHp, this.hp + 35);
    } else if (patchId === 'stitch_boots') {
      this.speedMult += 0.12;
    } else if (patchId === 'gold_button') {
      this.pickupRadius += 1.4;
      this.damageMult += 0.12;
    } else if (patchId === 'spring_whisk') {
      this.syncWhiskMeshes();
    }

    this.paused = false;
    this.emitHud();
  }

  private syncWhiskMeshes(): void {
    for (const m of this.whiskMeshes) {
      this.scene.remove(m);
    }
    this.whiskMeshes = [];
    const lv = this.activePatches['spring_whisk'] || 0;
    if (lv <= 0) return;

    const count = Math.min(5, 1 + lv);
    const whiskMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ee, metalness: 0.78, roughness: 0.22 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), whiskMat);
      m.scale.set(0.75, 1.5, 0.75);
      this.scene.add(m);
      this.whiskMeshes.push(m);
    }
  }

  private clearEntities(): void {
    this.enemies.forEach((e) => this.scene.remove(e.mesh));
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.traps.forEach((t) => this.scene.remove(t.mesh));
    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.shockwaves.forEach((s) => this.scene.remove(s.mesh));
    this.whiskMeshes.forEach((m) => this.scene.remove(m));

    this.enemies = [];
    this.projectiles = [];
    this.traps = [];
    this.pickups = [];
    this.particles = [];
    this.shockwaves = [];
    this.whiskMeshes = [];
  }

  public triggerDash(): void {
    if (!this.running || this.paused || this.dashCooldown > 0) return;
    const baseCd = Math.max(0.75, 1.65 - (this.activePatches['stitch_boots'] || 0) * 0.14);
    this.dashCooldown = baseCd;
    this.dashTimer = 0.22;
    this.invulnTimer = Math.max(this.invulnTimer, 0.32);

    const { dx, dz } = this.getMoveVector();
    if (Math.hypot(dx, dz) > 0.1) {
      this.dashDirX = dx;
      this.dashDirZ = dz;
    } else {
      this.dashDirX = Math.sin(this.playerYaw);
      this.dashDirZ = Math.cos(this.playerYaw);
    }
    this.spawnCottonBurst(this.playerX, 0.6, this.playerZ, 8);
    this.sound.playDash();
  }

  public triggerFever(): void {
    if (!this.running || this.paused || this.fever < 100 || this.feverActive) return;
    this.fever = 0;
    this.feverActive = true;
    this.feverTimer = 8.0;
    this.invulnTimer = Math.max(this.invulnTimer, 1.5);
    this.shakeStrength = 0.55;
    this.spawnShockwave(this.playerX, this.playerZ, 0xff5fd7, 9.5);
    this.spawnFloatingAtWorld(this.playerX, 2.4, this.playerZ, 'ZOMBIE FEVER!!', '#ff7cf5');
    this.sound.playFever();
    this.sound.startBgm('fever');

    // Blast nearby enemies on activation
    for (const e of this.enemies) {
      const dist = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
      if (dist < 8.5) {
        this.damageEnemy(e, 65 * this.damageMult, true);
      }
    }
    this.emitHud();
  }

  public triggerPrimaryAttack(manual = false): void {
    if (!this.running || this.paused) return;
    if (!manual && this.primaryTimer > 0) return;
    if (manual && this.primaryTimer > 0.15) return;

    const feverFactor = this.feverActive ? 0.55 : 1.0;
    this.primaryTimer = this.charDef.attackCooldown * feverFactor;
    this.playerScaleBounce = 1.24;

    const nearest = this.findNearestEnemy(this.playerX, this.playerZ, this.charDef.attackRange + 3);
    if (nearest) {
      this.playerYaw = Math.atan2(nearest.x - this.playerX, nearest.z - this.playerZ);
    }

    if (this.charDef.id === 'green_glassy') {
      // Ranged arcane book bolts!
      const count = this.feverActive ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.24;
        const ang = this.playerYaw + spread;
        this.spawnProjectile('arcane', this.playerX, 1.0, this.playerZ, Math.sin(ang) * 18, Math.cos(ang) * 18, this.charDef.attackPower * this.damageMult, 0);
      }
      this.sound.playKick();
      return;
    }

    // Melee AoE strike (Red Hatter spin kick, Blue Partin cone smash, Chef whisk slash)
    const range = this.charDef.attackRange * (this.feverActive ? 1.35 : 1.0);
    const dmg = this.charDef.attackPower * this.damageMult * (this.feverActive ? 1.45 : 1.0);
    const ringColor =
      this.charDef.id === 'red_hatter' ? 0xff6259 : this.charDef.id === 'blue_partin' ? 0x45c4ff : 0xc07dff;

    this.spawnShockwave(this.playerX, this.playerZ, ringColor, range);
    this.sound.playKick();

    let hitAny = false;
    for (const e of this.enemies) {
      const dist = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
      if (dist <= range + e.radius) {
        this.damageEnemy(e, dmg, true);
        hitAny = true;
      }
    }
    if (hitAny && this.charDef.id === 'blue_partin') {
      this.shakeStrength = Math.max(this.shakeStrength, 0.22);
    }
  }

  private getMoveVector(): { dx: number; dz: number } {
    let dx = this.joyX;
    let dz = this.joyZ;
    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }
    return { dx, dz };
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const rawDt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.animClock += rawDt;

    if (this.lobbyPreviewMode && this.playerRig) {
      this.arena.update(this.animClock);
      this.playerRig.root.rotation.y = Math.sin(this.animClock * 0.7) * 0.45;
      this.animatePuppet(this.playerRig, true, this.animClock);
      const isPortrait = (this.container.clientWidth || 1) < (this.container.clientHeight || 1);
      this.camera.position.set(0, isPortrait ? 4.4 : 3.6, isPortrait ? 7.8 : 6.4);
      this.camera.lookAt(0, 1.15, 0);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.running && !this.paused && !this.ended) {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= rawDt;
      } else {
        this.stepSimulation(rawDt);
      }
    }

    this.updateCamera(rawDt);
    this.arena.update(this.animClock);
    this.renderer.render(this.scene, this.camera);
  };

  private stepSimulation(dt: number): void {
    this.elapsed += dt;
    this.wave = this.elapsed < 35 ? 1 : this.elapsed < 75 ? 2 : 3;

    // Fever timer
    if (this.feverActive) {
      this.feverTimer -= dt;
      if (this.feverTimer <= 0) {
        this.feverActive = false;
        this.sound.startBgm('main');
      }
    }

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.primaryTimer > 0) this.primaryTimer -= dt;

    // Player movement
    const { dx, dz } = this.getMoveVector();
    let moving = false;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.playerX += this.dashDirX * 22 * dt;
      this.playerZ += this.dashDirZ * 22 * dt;
      moving = true;
    } else if (Math.hypot(dx, dz) > 0.08) {
      const spd = this.charDef.speed * this.speedMult * (this.feverActive ? 1.32 : 1.0);
      this.playerX += dx * spd * dt;
      this.playerZ += dz * spd * dt;
      this.playerYaw = Math.atan2(dx, dz);
      moving = true;
    }

    // Clamp to arena & obstacles
    const distFromCenter = Math.hypot(this.playerX, this.playerZ);
    if (distFromCenter > ARENA_RADIUS - 1.2) {
      const s = (ARENA_RADIUS - 1.2) / distFromCenter;
      this.playerX *= s;
      this.playerZ *= s;
    }
    for (const obs of this.arena.obstacles) {
      const ox = this.playerX - obs.x;
      const oz = this.playerZ - obs.z;
      const d = Math.hypot(ox, oz);
      const minD = obs.r + 0.65;
      if (d < minD && d > 0.001) {
        this.playerX = obs.x + (ox / d) * minD;
        this.playerZ = obs.z + (oz / d) * minD;
      }
    }

    if (this.playerRig) {
      this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
      this.playerRig.root.rotation.y = this.playerYaw;
      this.playerScaleBounce += (1 - this.playerScaleBounce) * Math.min(1, dt * 14);
      const s = this.playerScaleBounce * (this.feverActive ? 1.15 : 1.0);
      this.playerRig.root.scale.set(s, s, s);
      // Invulnerability blink
      this.playerRig.root.visible = this.invulnTimer <= 0 || Math.floor(this.animClock * 18) % 2 === 0;
      this.animatePuppet(this.playerRig, moving, this.animClock);
    }

    // Auto primary attack
    if (this.autoAttack && this.primaryTimer <= 0 && this.enemies.length > 0) {
      const near = this.findNearestEnemy(this.playerX, this.playerZ, this.charDef.attackRange + 1.2);
      if (near) {
        this.triggerPrimaryAttack(false);
      }
    }

    // Update Patch Weapons
    this.updatePatches(dt);

    // Spawn Enemies & Boss
    this.updateSpawning(dt);

    // Update World Entities
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateTraps(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);

    // Sync HUD at ~15Hz
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.065) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private animatePuppet(rig: PuppetRig, moving: boolean, t: number): void {
    // Quantize time slightly for authentic stop-motion puppet feel!
    const qt = Math.floor(t * 16) / 16;
    const speed = moving ? 11 : 3.5;
    const amp = moving ? 0.68 : 0.08;
    const swing = Math.sin(qt * speed) * amp;

    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArm.rotation.x = -swing * 0.85;
    rig.rightArm.rotation.x = swing * 0.85;
    rig.body.position.y = moving ? Math.abs(Math.sin(qt * speed)) * 0.14 : Math.sin(qt * 3) * 0.03;
    rig.head.rotation.z = Math.sin(qt * speed * 0.5) * (moving ? 0.09 : 0.04);
  }

  private updatePatches(dt: number): void {
    // 1. Spring Whisk orbiting
    const whiskLv = this.activePatches['spring_whisk'] || 0;
    if (whiskLv > 0 && this.whiskMeshes.length > 0) {
      this.whiskAngle += dt * (3.2 + whiskLv * 0.45);
      const orbitR = 2.6 + whiskLv * 0.22;
      this.whiskMeshes.forEach((m, idx) => {
        const ang = this.whiskAngle + (idx / this.whiskMeshes.length) * Math.PI * 2;
        const wx = this.playerX + Math.cos(ang) * orbitR;
        const wz = this.playerZ + Math.sin(ang) * orbitR;
        m.position.set(wx, 1.0, wz);
        m.rotation.y += dt * 12;
        m.rotation.x = Math.PI / 2;

        for (const e of this.enemies) {
          if (Math.hypot(e.x - wx, e.z - wz) < e.radius + 0.7 && e.hitFlash <= 0) {
            this.damageEnemy(e, (14 + whiskLv * 5) * this.damageMult, false);
          }
        }
      });
    }

    // 2. Banana Slip Trap
    const bananaLv = this.activePatches['banana_slip'] || 0;
    if (bananaLv > 0) {
      this.bananaTimer -= dt;
      if (this.bananaTimer <= 0) {
        this.bananaTimer = Math.max(1.4, 3.4 - bananaLv * 0.38);
        this.spawnBananaTrap(this.playerX, this.playerZ, 22 + bananaLv * 9);
      }
    }

    // 3. Magic Rabbit Homing Missile
    const rabbitLv = this.activePatches['magic_rabbit'] || 0;
    if (rabbitLv > 0) {
      this.rabbitTimer -= dt;
      if (this.rabbitTimer <= 0) {
        this.rabbitTimer = Math.max(0.7, 1.8 - rabbitLv * 0.2);
        const count = rabbitLv >= 4 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const target = this.findNearestEnemy(this.playerX, this.playerZ, 20);
          if (target) {
            const ang = Math.atan2(target.x - this.playerX, target.z - this.playerZ) + i * 0.35;
            this.spawnProjectile('rabbit', this.playerX, 1.1, this.playerZ, Math.sin(ang) * 14, Math.cos(ang) * 14, (24 + rabbitLv * 8) * this.damageMult, 0);
          }
        }
      }
    }

    // 4. Eyeball Bounce
    const eyeLv = this.activePatches['eyeball_bounce'] || 0;
    if (eyeLv > 0) {
      this.eyeballTimer -= dt;
      if (this.eyeballTimer <= 0) {
        this.eyeballTimer = Math.max(0.9, 2.2 - eyeLv * 0.22);
        const target = this.findNearestEnemy(this.playerX, this.playerZ, 18);
        const ang = target ? Math.atan2(target.x - this.playerX, target.z - this.playerZ) : this.playerYaw;
        this.spawnProjectile('eyeball', this.playerX, 1.0, this.playerZ, Math.sin(ang) * 15, Math.cos(ang) * 15, (20 + eyeLv * 7) * this.damageMult, 2 + eyeLv);
      }
    }

    // 5. Poison Flask
    const flaskLv = this.activePatches['poison_flask'] || 0;
    if (flaskLv > 0) {
      this.flaskTimer -= dt;
      if (this.flaskTimer <= 0) {
        this.flaskTimer = Math.max(1.8, 3.6 - flaskLv * 0.32);
        const target = this.findNearestEnemy(this.playerX, this.playerZ, 14);
        const tx = target ? target.x : this.playerX + (Math.random() - 0.5) * 8;
        const tz = target ? target.z : this.playerZ + (Math.random() - 0.5) * 8;
        this.spawnAcidTrap(tx, tz, 2.4 + flaskLv * 0.3, 10 + flaskLv * 4);
      }
    }

    // 6. Chicken Honk Shockwave
    const chickenLv = this.activePatches['chicken_honk'] || 0;
    if (chickenLv > 0) {
      this.chickenTimer -= dt;
      if (this.chickenTimer <= 0) {
        this.chickenTimer = Math.max(1.6, 3.5 - chickenLv * 0.35);
        const rad = 4.6 + chickenLv * 0.55;
        this.spawnShockwave(this.playerX, this.playerZ, 0xf5c842, rad);
        for (const e of this.enemies) {
          if (Math.hypot(e.x - this.playerX, e.z - this.playerZ) <= rad + e.radius) {
            this.damageEnemy(e, (18 + chickenLv * 8) * this.damageMult, true);
          }
        }
      }
    }
  }

  private updateSpawning(dt: number): void {
    this.spawnTimer -= dt;
    const maxEnemies = this.wave === 1 ? 26 : this.wave === 2 ? 42 : 55;
    if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
      const batch = this.wave === 1 ? 2 : this.wave === 2 ? 3 : 4;
      for (let i = 0; i < batch; i++) {
        const r = Math.random();
        let kind: EnemyKind = 'scissor';
        if (this.wave >= 2 && r > 0.72) kind = 'vacuum';
        else if (r > 0.45) kind = 'crow';
        this.spawnEnemy(kind);
      }
      this.spawnTimer = this.wave === 1 ? 1.35 : this.wave === 2 ? 1.0 : 0.85;
    }

    if (this.wave >= 3 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnEnemy('boss_patch');
      this.spawnFloatingAtWorld(this.playerX, 2.8, this.playerZ, 'BOSS 出現: キャプテン・パッチ！', '#ff5983');
      this.shakeStrength = 0.45;
    }
  }

  private spawnEnemy(kind: EnemyKind): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * 8;
    const x = Math.max(-ARENA_RADIUS + 2, Math.min(ARENA_RADIUS - 2, this.playerX + Math.cos(angle) * dist));
    const z = Math.max(-ARENA_RADIUS + 2, Math.min(ARENA_RADIUS - 2, this.playerZ + Math.sin(angle) * dist));

    const model = buildEnemyPuppet(kind);
    model.root.position.set(x, 0, z);
    this.scene.add(model.root);

    const scaleHp = 1 + this.elapsed * 0.012;
    const stats =
      kind === 'boss_patch'
        ? { hp: 1450, speed: 3.4, radius: 1.45, damage: 22, isBoss: true }
        : kind === 'vacuum'
          ? { hp: 78 * scaleHp, speed: 3.1, radius: 0.75, damage: 14, isBoss: false }
          : kind === 'crow'
            ? { hp: 32 * scaleHp, speed: 5.1, radius: 0.62, damage: 9, isBoss: false }
            : { hp: 46 * scaleHp, speed: 3.8, radius: 0.68, damage: 11, isBoss: false };

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      mesh: model.root,
      animPart: model.animPart,
      animPart2: model.animPart2,
      x,
      z,
      vx: 0,
      vz: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      radius: stats.radius,
      damage: stats.damage,
      stunTimer: 0,
      hitFlash: 0,
      poisonTimer: 0,
      slipSpin: 0,
      isBoss: stats.isBoss,
    });
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.poisonTimer > 0) {
        e.poisonTimer -= dt;
        e.hp -= 12 * dt;
        if (e.hp <= 0) {
          this.killEnemy(i);
          continue;
        }
      }

      if (e.stunTimer > 0) {
        e.stunTimer -= dt;
        e.x += e.vx * dt;
        e.z += e.vz * dt;
        e.vx *= 0.88;
        e.vz *= 0.88;
        if (e.slipSpin > 0) {
          e.slipSpin -= dt;
          e.mesh.rotation.y += dt * 18;
        }
      } else {
        const dx = this.playerX - e.x;
        const dz = this.playerZ - e.z;
        const dist = Math.hypot(dx, dz) || 1;
        e.x += ((dx / dist) * e.speed + e.vx) * dt;
        e.z += ((dz / dist) * e.speed + e.vz) * dt;
        e.vx *= 0.82;
        e.vz *= 0.82;
        e.mesh.rotation.y = Math.atan2(dx, dz);

        // Animate parts
        if (e.kind === 'scissor' && e.animPart2) {
          const snap = Math.abs(Math.sin(this.animClock * 9 + e.id)) * 0.45;
          e.animPart.rotation.z = 0.1 + snap;
          e.animPart2.rotation.z = -0.1 - snap;
        } else if (e.kind === 'crow' && e.animPart2) {
          const flap = Math.sin(this.animClock * 13 + e.id) * 0.55;
          e.animPart.rotation.z = flap;
          e.animPart2.rotation.z = -flap;
        } else if (e.kind === 'boss_patch') {
          e.mesh.position.y = Math.abs(Math.sin(this.animClock * 4.5)) * 0.25;
        }

        // Player collision
        if (dist < e.radius + 0.65 && this.invulnTimer <= 0) {
          if (this.feverActive) {
            this.damageEnemy(e, 45 * this.damageMult, true);
          } else {
            this.hp = Math.max(0, this.hp - e.damage);
            this.invulnTimer = 0.72;
            this.shakeStrength = 0.35;
            this.sound.playHurt();
            this.spawnCottonBurst(this.playerX, 0.9, this.playerZ, 7);
            this.emitHud();
            if (this.hp <= 0) {
              this.endRun(false);
              return;
            }
          }
        }
      }

      // Soft separation between enemies
      for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
        const other = this.enemies[j];
        const sx = e.x - other.x;
        const sz = e.z - other.z;
        const sd = Math.hypot(sx, sz);
        const minD = e.radius + other.radius;
        if (sd < minD && sd > 0.001) {
          const push = (minD - sd) * 0.4;
          e.x += (sx / sd) * push;
          e.z += (sz / sd) * push;
          other.x -= (sx / sd) * push;
          other.z -= (sz / sd) * push;
        }
      }

      e.mesh.position.x = e.x;
      e.mesh.position.z = e.z;
      const bounceScale = e.hitFlash > 0 ? 1.15 : 1.0;
      const baseS = e.isBoss ? 1.85 : 1.0;
      e.mesh.scale.setScalar(baseS * bounceScale);
    }
  }

  private damageEnemy(e: EnemyEntity, amount: number, knockback: boolean): void {
    e.hp -= amount;
    e.hitFlash = 0.12;
    if (knockback) {
      const dx = e.x - this.playerX;
      const dz = e.z - this.playerZ;
      const d = Math.hypot(dx, dz) || 1;
      const force = e.isBoss ? 3.5 : 8.5;
      e.vx += (dx / d) * force;
      e.vz += (dz / d) * force;
      e.stunTimer = Math.max(e.stunTimer, e.isBoss ? 0.06 : 0.18);
    }

    this.spawnCottonBurst(e.x, 0.9, e.z, 3);
    this.sound.playHit(amount >= 30);

    if (Math.random() < 0.38 || e.isBoss) {
      this.spawnFloatingAtWorld(e.x, e.isBoss ? 3.2 : 1.6, e.z, `${Math.round(amount)}`, '#fff3b0');
    }

    if (e.hp <= 0) {
      const idx = this.enemies.indexOf(e);
      if (idx !== -1) this.killEnemy(idx);
    }
  }

  private killEnemy(idx: number): void {
    const e = this.enemies[idx];
    this.scene.remove(e.mesh);
    this.enemies.splice(idx, 1);

    this.kills += 1;
    this.fever = Math.min(100, this.fever + (e.isBoss ? 50 : 4.5));
    this.spawnCottonBurst(e.x, 0.9, e.z, e.isBoss ? 22 : 9);

    // Drop XP orb + occasional gold button or healing bread
    this.spawnPickup('xp', e.x, e.z, e.isBoss ? 120 : 12);
    if (Math.random() < 0.45 || e.isBoss) {
      this.spawnPickup('button', e.x + 0.4, e.z - 0.3, e.isBoss ? 25 : 1);
    }
    if (Math.random() < 0.06) {
      this.spawnPickup('bread', e.x - 0.4, e.z + 0.3, 20);
    }

    if (e.isBoss) {
      this.hitstopTimer = 0.14;
      this.shakeStrength = 0.7;
      this.spawnShockwave(e.x, e.z, 0xffd166, 12);
      this.endRun(true);
    }
  }

  private spawnProjectile(
    kind: ProjectileEntity['kind'],
    x: number,
    y: number,
    z: number,
    vx: number,
    vz: number,
    damage: number,
    bouncesLeft: number
  ): void {
    const geo =
      kind === 'rabbit'
        ? new THREE.SphereGeometry(0.32, 10, 10)
        : kind === 'eyeball'
          ? new THREE.SphereGeometry(0.28, 12, 12)
          : new THREE.OctahedronGeometry(0.26, 0);
    const mat =
      kind === 'rabbit'
        ? makeFeltMaterial(0xffffff, { emissive: 0x3ec6e0, emissiveIntensity: 0.45 })
        : kind === 'eyeball'
          ? new THREE.MeshStandardMaterial({ color: 0xf7f7f0, emissive: 0x5be37d, emissiveIntensity: 0.35 })
          : new THREE.MeshStandardMaterial({ color: 0xf5d742, emissive: 0xf5a623, emissiveIntensity: 0.75 });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.projectiles.push({
      kind,
      mesh,
      x,
      y,
      z,
      vx,
      vz,
      damage,
      life: 2.6,
      bouncesLeft,
      hitIds: new Set<number>(),
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Gentle homing for magic rabbit
      if (p.kind === 'rabbit') {
        const target = this.findNearestEnemy(p.x, p.z, 12);
        if (target) {
          const spd = Math.hypot(p.vx, p.vz);
          const ang = Math.atan2(target.x - p.x, target.z - p.z);
          p.vx += (Math.sin(ang) * spd - p.vx) * Math.min(1, dt * 6);
          p.vz += (Math.cos(ang) * spd - p.vz) * Math.min(1, dt * 6);
        }
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y + Math.sin(this.animClock * 14 + i) * 0.12, p.z);
      p.mesh.rotation.y += dt * 10;

      let removed = false;
      for (const e of this.enemies) {
        if (p.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) < e.radius + 0.45) {
          p.hitIds.add(e.id);
          this.damageEnemy(e, p.damage, true);
          if (p.bouncesLeft > 0) {
            p.bouncesLeft -= 1;
            const next = this.enemies.find((cand) => !p.hitIds.has(cand.id) && Math.hypot(cand.x - p.x, cand.z - p.z) < 11);
            if (next) {
              const spd = Math.hypot(p.vx, p.vz);
              const ang = Math.atan2(next.x - p.x, next.z - p.z);
              p.vx = Math.sin(ang) * spd;
              p.vz = Math.cos(ang) * spd;
            } else {
              p.vx = -p.vx;
              p.vz = -p.vz;
            }
          } else {
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
            removed = true;
          }
          break;
        }
      }
      if (removed) continue;
    }
  }

  private spawnBananaTrap(x: number, z: number, damage: number): void {
    const grp = new THREE.Group();
    const bananaMat = makeFeltMaterial(0xf5cf38, { emissive: 0x665200, emissiveIntensity: 0.25 });
    for (let k = 0; k < 3; k++) {
      const peel = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 4, 8), bananaMat);
      const a = (k / 3) * Math.PI * 2;
      peel.position.set(Math.cos(a) * 0.18, 0.14, Math.sin(a) * 0.18);
      peel.rotation.z = Math.PI / 3;
      peel.rotation.y = a;
      grp.add(peel);
    }
    grp.position.set(x, 0, z);
    this.scene.add(grp);
    this.traps.push({ kind: 'banana', mesh: grp, x, z, radius: 1.25, life: 11, tickTimer: 0, damage });
  }

  private spawnAcidTrap(x: number, z: number, radius: number, damage: number): void {
    const grp = new THREE.Group();
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 20),
      new THREE.MeshStandardMaterial({
        color: 0x45e87c,
        emissive: 0x22aa55,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.65,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.05;
    grp.add(pool);
    grp.position.set(x, 0, z);
    this.scene.add(grp);
    this.traps.push({ kind: 'acid', mesh: grp, x, z, radius, life: 4.5, tickTimer: 0, damage });
  }

  private updateTraps(dt: number): void {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.traps.splice(i, 1);
        continue;
      }

      if (t.kind === 'banana') {
        for (const e of this.enemies) {
          if (Math.hypot(e.x - t.x, e.z - t.z) < t.radius + e.radius) {
            e.stunTimer = 1.25;
            e.slipSpin = 1.25;
            this.sound.playSlip();
            this.spawnFloatingAtWorld(e.x, 1.9, e.z, 'SLIP!', '#ffe066');
            this.damageEnemy(e, t.damage * this.damageMult, true);
            this.scene.remove(t.mesh);
            this.traps.splice(i, 1);
            break;
          }
        }
      } else {
        t.tickTimer -= dt;
        if (t.tickTimer <= 0) {
          t.tickTimer = 0.45;
          for (const e of this.enemies) {
            if (Math.hypot(e.x - t.x, e.z - t.z) < t.radius + e.radius) {
              e.poisonTimer = 1.2;
              this.damageEnemy(e, t.damage * this.damageMult, false);
            }
          }
        }
      }
    }
  }

  private spawnPickup(kind: PickupEntity['kind'], x: number, z: number, value: number): void {
    const mesh =
      kind === 'xp'
        ? new THREE.Mesh(this.xpGeo, this.xpMat)
        : kind === 'button'
          ? new THREE.Mesh(this.buttonGeo, this.buttonMat)
          : new THREE.Mesh(this.breadGeo, this.breadMat);
    mesh.position.set(x, 0.4, z);
    this.scene.add(mesh);
    this.pickups.push({ kind, mesh, x, z, value, life: 22 });
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }

      p.mesh.rotation.y += dt * 3.5;
      p.mesh.position.y = 0.42 + Math.sin(this.animClock * 5 + i) * 0.1;

      const dx = this.playerX - p.x;
      const dz = this.playerZ - p.z;
      const dist = Math.hypot(dx, dz);

      if (dist < this.pickupRadius) {
        const pull = 14 * dt;
        p.x += (dx / (dist || 1)) * pull;
        p.z += (dz / (dist || 1)) * pull;
        p.mesh.position.x = p.x;
        p.mesh.position.z = p.z;
      }

      if (dist < 0.95) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        this.sound.playPickup();

        if (p.kind === 'xp') {
          this.xp += p.value;
          if (this.xp >= this.xpNext) {
            this.xp -= this.xpNext;
            this.level += 1;
            this.xpNext = Math.round(this.xpNext * 1.32 + 18);
            this.triggerLevelUpModal();
          }
        } else if (p.kind === 'button') {
          this.buttons += p.value;
        } else {
          this.hp = Math.min(this.maxHp, this.hp + p.value);
          this.spawnFloatingAtWorld(this.playerX, 2.0, this.playerZ, `+${p.value} HP`, '#6eff9c');
        }
      }
    }
  }

  private triggerLevelUpModal(): void {
    this.paused = true;
    this.sound.playLevelUp();

    const pool = PATCH_CATALOG.filter((p) => (this.activePatches[p.id] || 0) < p.maxLevel);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    if (shuffled.length === 0) {
      this.hp = Math.min(this.maxHp, this.hp + 30);
      this.paused = false;
      return;
    }

    const choices = shuffled.map((patch) => ({
      patch,
      nextLevel: (this.activePatches[patch.id] || 0) + 1,
    }));
    this.callbacks.onLevelUp(choices);
  }

  private spawnCottonBurst(x: number, y: number, z: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 90) break;
      const m = new THREE.Mesh(this.cottonGeo, this.cottonMat);
      m.position.set(x, y, z);
      const s = 0.6 + Math.random() * 0.9;
      m.scale.setScalar(s);
      this.scene.add(m);
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.2 + Math.random() * 4.5;
      this.particles.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 3.5 + Math.random() * 4.2,
        vz: Math.sin(ang) * spd,
        life: 0.48 + Math.random() * 0.25,
        maxLife: 0.72,
      });
    }
  }

  private spawnShockwave(x: number, z: number, color: number, maxScale: number): void {
    const geo = new THREE.RingGeometry(0.6, 0.98, 28);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.14, z);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, life: 0.28, maxLife: 0.28, maxScale });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.12, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar((p.life / p.maxLife) * 1.1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shockwaves.splice(i, 1);
        continue;
      }
      const prog = 1 - s.life / s.maxLife;
      const curScale = 0.6 + prog * s.maxScale;
      s.mesh.scale.setScalar(curScale);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.85;
    }
  }

  private updateCamera(dt: number): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const isPortrait = w < h;

    const targetY = isPortrait ? 17.5 : 13.5;
    const targetZOff = isPortrait ? 14.5 : 12.2;

    if (this.shakeStrength > 0) {
      this.shakeStrength = Math.max(0, this.shakeStrength - dt * 1.8);
    }
    const sx = (Math.random() - 0.5) * this.shakeStrength;
    const sy = (Math.random() - 0.5) * this.shakeStrength;

    const desiredX = this.playerX + sx;
    const desiredY = targetY + sy;
    const desiredZ = this.playerZ + targetZOff;

    this.camera.position.x += (desiredX - this.camera.position.x) * Math.min(1, dt * 8);
    this.camera.position.y += (desiredY - this.camera.position.y) * Math.min(1, dt * 8);
    this.camera.position.z += (desiredZ - this.camera.position.z) * Math.min(1, dt * 8);
    this.camera.lookAt(this.playerX, 0.8, this.playerZ - 0.8);
  }

  private findNearestEnemy(x: number, z: number, maxRange: number): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestD = maxRange;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private spawnFloatingAtWorld(wx: number, wy: number, wz: number, text: string, color: string): void {
    const v = new THREE.Vector3(wx, wy, wz);
    v.project(this.camera);
    if (v.z > 1) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const sx = (v.x * 0.5 + 0.5) * w;
    const sy = (-v.y * 0.5 + 0.5) * h;
    this.callbacks.onFloatingText(sx, sy, text, color);
  }

  private buildSnapshot(): HudSnapshot {
    const boss = this.enemies.find((e) => e.isBoss);
    const maxCd = Math.max(0.75, 1.65 - (this.activePatches['stitch_boots'] || 0) * 0.14);
    return {
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      xp: this.xp,
      xpNext: this.xpNext,
      level: this.level,
      kills: this.kills,
      buttons: this.buttons,
      elapsed: this.elapsed,
      wave: this.wave,
      fever: Math.floor(this.fever),
      feverActive: this.feverActive,
      feverTimeLeft: this.feverTimer,
      dashCooldownRatio: Math.max(0, Math.min(1, this.dashCooldown / maxCd)),
      bossName: boss ? '暴走キャプテン・パッチ' : null,
      bossHp: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
      bossMaxHp: boss ? boss.maxHp : 1,
      activePatches: { ...this.activePatches },
    };
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.buildSnapshot());
  }

  private endRun(victory: boolean): void {
    this.ended = true;
    this.running = false;
    this.sound.stopBgm();
    this.callbacks.onGameOver(victory, this.buildSnapshot());
  }
}
