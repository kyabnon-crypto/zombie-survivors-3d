import * as THREE from 'three';
import type { StageDef } from '../data/stages';
import { getStageFloorTexture, makeFeltMaterial } from './FeltMaterials';

export const ARENA_RADIUS = 38;

export interface StageArena {
  group: THREE.Group;
  obstacles: Array<{ x: number; z: number; r: number }>;
  lights: THREE.Light[];
  update: (time: number) => void;
  dispose: () => void;
}

export function buildStageArena(scene: THREE.Scene, stage: StageDef): StageArena {
  const group = new THREE.Group();
  const obstacles: Array<{ x: number; z: number; r: number }> = [];
  const lights: THREE.Light[] = [];

  scene.background = new THREE.Color(stage.skyColor);
  scene.fog = new THREE.FogExp2(stage.fogColor, 0.015);

  const hemiColor =
    stage.theme === 'lab'
      ? 0x7affd4
      : stage.theme === 'finale' || stage.theme === 'all_bosses'
        ? 0xff708d
        : stage.theme === 'desert'
          ? 0xffe0a6
          : stage.theme === 'bakery' || stage.theme === 'carnival'
            ? 0xffb8dc
            : 0x88b4ff;
  const hemi = new THREE.HemisphereLight(hemiColor, 0x1a2024, 1.0);
  scene.add(hemi);
  lights.push(hemi);

  const moonLight = new THREE.DirectionalLight(
    stage.theme === 'finale' || stage.theme === 'all_bosses' ? 0xffb3b3 : 0xdde8ff,
    1.55
  );
  moonLight.position.set(18, 32, -20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.near = 2;
  moonLight.shadow.camera.far = 90;
  const d = 34;
  moonLight.shadow.camera.left = -d;
  moonLight.shadow.camera.right = d;
  moonLight.shadow.camera.top = d;
  moonLight.shadow.camera.bottom = -d;
  moonLight.shadow.bias = -0.001;
  scene.add(moonLight);
  lights.push(moonLight);

  // Moon / Sky Orb
  const moonColor =
    stage.theme === 'all_bosses'
      ? 0xffe066
      : stage.theme === 'finale'
        ? 0xff4d6d
        : stage.theme === 'lab'
          ? 0x9bffd0
          : stage.theme === 'desert' || stage.theme === 'kitchen'
            ? 0xffe0a3
            : 0xeaf4ff;
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: moonColor })
  );
  moonMesh.position.set(28, 34, -46);
  group.add(moonMesh);

  // Main felt floor
  const isChecker =
    stage.theme === 'kitchen' ||
    stage.theme === 'prison' ||
    stage.theme === 'carnival' ||
    stage.theme === 'all_bosses';
  const floorMat = new THREE.MeshStandardMaterial({
    map: getStageFloorTexture(stage.id, stage.floorBaseColor, stage.floorPatchColors, isChecker),
    roughness: 0.94,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS + 2, ARENA_RADIUS + 2.6, 1.6, 48), floorMat);
  floor.position.y = -0.8;
  floor.receiveShadow = true;
  group.add(floor);

  const borderRing = new THREE.Mesh(
    new THREE.TorusGeometry(ARENA_RADIUS + 0.5, 0.65, 10, 48),
    makeFeltMaterial(stage.borderColor)
  );
  borderRing.rotation.x = Math.PI / 2;
  borderRing.position.y = 0.12;
  group.add(borderRing);

  // Themed Props & Obstacles per Stage Theme
  buildThemedProps(group, obstacles, stage);

  // Perimeter trees / pillars
  const trunkMat = makeFeltMaterial(0x543c2c);
  const leafPalette: Record<string, number[]> = {
    graveyard: [0x2a5c49, 0x366d56, 0x244f4c],
    kitchen: [0xa84a6f, 0x873b66, 0xbf637b],
    lab: [0x267360, 0x328c6e, 0x1c594f],
    carnival: [0xd94848, 0xf2c94c, 0x3ec6e0],
    stadium: [0x2d6e3e, 0x3a854c, 0x255933],
    prison: [0x454959, 0x2d303d, 0x5c6073],
    desert: [0xb88b4a, 0x8c6d3b, 0xd4a95e],
    toyland: [0x7a48a6, 0x3ec6e0, 0xff7096],
    bakery: [0xff85a8, 0xf7c5d6, 0xd96b8c],
    library: [0x5a6e3e, 0x736236, 0x455430],
    highway: [0xf07822, 0x454f63, 0xff9f45],
    finale: [0x9e1b3b, 0x6b122c, 0xd9385a],
    all_bosses: [0xffd15c, 0x9b5de5, 0xff4d6d, 0x3ec6e0],
  };
  const cols = leafPalette[stage.theme] || leafPalette.graveyard;

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const dist = ARENA_RADIUS - 2.2 - (i % 2) * 2.5;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 2.8, 10), trunkMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    tree.add(trunk);

    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(1.5 + (i % 3) * 0.25, 14, 12),
      makeFeltMaterial(cols[i % cols.length])
    );
    puff.position.y = 3.2;
    puff.castShadow = true;
    tree.add(puff);

    group.add(tree);
    obstacles.push({ x, z, r: 0.9 });
  }

  // Lanterns
  const lanternPostMat = makeFeltMaterial(0x2a2433);
  const lampHex =
    stage.theme === 'lab'
      ? 0x6bffa8
      : stage.theme === 'all_bosses'
        ? 0xffe066
        : stage.theme === 'finale'
          ? 0xff5277
          : stage.theme === 'highway'
            ? 0xff9e44
            : stage.theme === 'bakery' || stage.theme === 'carnival'
              ? 0xff9ec4
              : 0xffb44c;
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: lampHex,
    emissive: lampHex,
    emissiveIntensity: 1.8,
  });
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dist = 16;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const post = new THREE.Group();
    post.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.2, 8), lanternPostMat);
    pole.position.y = 1.6;
    post.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), lanternGlowMat);
    lamp.position.y = 3.2;
    post.add(lamp);

    const light = new THREE.PointLight(lampHex, 4.5, 16);
    light.position.y = 3.2;
    post.add(light);

    group.add(post);
    obstacles.push({ x, z, r: 0.65 });
  }

  // Ambient fireflies
  const fireflyCount = 70;
  const posArr = new Float32Array(fireflyCount * 3);
  for (let i = 0; i < fireflyCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * ARENA_RADIUS;
    posArr[i * 3] = Math.cos(a) * r;
    posArr[i * 3 + 1] = 0.6 + Math.random() * 4.5;
    posArr[i * 3 + 2] = Math.sin(a) * r;
  }
  const fireGeo = new THREE.BufferGeometry();
  fireGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const fireMat = new THREE.PointsMaterial({
    color: lampHex,
    size: 0.24,
    transparent: true,
    opacity: 0.78,
  });
  const fireflies = new THREE.Points(fireGeo, fireMat);
  group.add(fireflies);

  scene.add(group);

  return {
    group,
    obstacles,
    lights,
    update(time: number) {
      const positions = fireGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < fireflyCount; i++) {
        const y = positions.getY(i) + Math.sin(time * 2.1 + i) * 0.008;
        positions.setY(i, Math.max(0.5, Math.min(5.2, y)));
      }
      positions.needsUpdate = true;
    },
    dispose() {
      scene.remove(group);
      lights.forEach((l) => scene.remove(l));
    },
  };
}

function buildThemedProps(
  group: THREE.Group,
  obstacles: Array<{ x: number; z: number; r: number }>,
  stage: StageDef
): void {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.2;
    const dist = 13 + (i % 3) * 8;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const prop = new THREE.Group();
    prop.position.set(x, 0, z);
    prop.rotation.y = -angle;

    if (stage.theme === 'kitchen') {
      const mat = makeFeltMaterial(i % 2 === 0 ? 0xc8843f : 0x8e99ad);
      const box = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.9, 1.4, 14), mat);
      box.position.y = 0.7;
      box.castShadow = true;
      prop.add(box);
    } else if (stage.theme === 'lab') {
      const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.4, 14), makeFeltMaterial(0x3a4a4e));
      vat.position.y = 0.7;
      vat.castShadow = true;
      prop.add(vat);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.72, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x4dff88, emissive: 0x22cc66, emissiveIntensity: 1.1 })
      );
      dome.position.y = 1.45;
      prop.add(dome);
    } else if (stage.theme === 'carnival') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.1, 12), makeFeltMaterial(0xe04848));
      base.position.y = 0.55;
      prop.add(base);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.3, 12), makeFeltMaterial(0xf7e9d2));
      top.position.y = 1.7;
      top.castShadow = true;
      prop.add(top);
    } else if (stage.theme === 'stadium') {
      const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 2.4, 12), makeFeltMaterial(0xc48f5a));
      bat.position.y = 1.2;
      bat.castShadow = true;
      prop.add(bat);
    } else if (stage.theme === 'prison') {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.4, 14), makeFeltMaterial(i % 2 === 0 ? 0x282830 : 0xebd74c));
      drum.position.y = 0.7;
      drum.castShadow = true;
      prop.add(drum);
    } else if (stage.theme === 'desert') {
      const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.8, 4), makeFeltMaterial(0xc9a86b));
      obelisk.position.y = 1.4;
      obelisk.castShadow = true;
      prop.add(obelisk);
    } else if (stage.theme === 'toyland') {
      const blockColors = [0xff6b8b, 0x3ec6e0, 0xf2c94c, 0x9b5de5];
      const blk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), makeFeltMaterial(blockColors[i % 4]));
      blk.position.y = 0.7;
      blk.castShadow = true;
      prop.add(blk);
    } else if (stage.theme === 'bakery') {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.65, 1.0, 14), makeFeltMaterial(0x704328));
      cup.position.y = 0.5;
      prop.add(cup);
      const icing = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), makeFeltMaterial(0xff99bb));
      icing.position.y = 1.15;
      icing.castShadow = true;
      prop.add(icing);
    } else if (stage.theme === 'library') {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.1), makeFeltMaterial(0xe3c342));
      b1.position.y = 0.28;
      prop.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 1.0), makeFeltMaterial(0x5280b8));
      b2.position.y = 0.83;
      b2.rotation.y = 0.3;
      b2.castShadow = true;
      prop.add(b2);
    } else if (stage.theme === 'highway') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.1, 14), makeFeltMaterial(0xf07822));
      cone.position.y = 1.05;
      cone.castShadow = true;
      prop.add(cone);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.54, 0.36, 14), makeFeltMaterial(0xf5f5f0));
      stripe.position.y = 1.05;
      prop.add(stripe);
    } else if (stage.theme === 'finale' || stage.theme === 'all_bosses') {
      const pillarColor = stage.theme === 'all_bosses' ? (i % 2 === 0 ? 0x5c227a : 0x7a1b3d) : 0x4a1628;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 2.4, 12), makeFeltMaterial(pillarColor));
      pillar.position.y = 1.2;
      pillar.castShadow = true;
      prop.add(pillar);
      const crownColor = stage.theme === 'all_bosses' && i % 2 === 1 ? 0xff4fd8 : 0xffd15c;
      const crown = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({ color: crownColor, emissive: crownColor, emissiveIntensity: 0.9 })
      );
      crown.position.y = 2.8;
      prop.add(crown);
    } else {
      // Graveyard tombstones
      const stoneMat = makeFeltMaterial(0x525c6e);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.9, 0.55), stoneMat);
      slab.position.y = 0.9;
      slab.castShadow = true;
      prop.add(slab);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 14), stoneMat);
      top.rotation.x = Math.PI / 2;
      top.position.y = 1.85;
      prop.add(top);
    }

    group.add(prop);
    obstacles.push({ x, z, r: 1.0 });
  }
}
