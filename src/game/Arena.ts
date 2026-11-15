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

  const hemiColor = stage.id === 'lab' ? 0x7affd4 : stage.id === 'kitchen' ? 0xffd2a6 : 0x88b4ff;
  const hemi = new THREE.HemisphereLight(hemiColor, 0x1a2024, 0.98);
  scene.add(hemi);
  lights.push(hemi);

  const moonLight = new THREE.DirectionalLight(stage.id === 'kitchen' ? 0xffe4c4 : 0xcde2ff, 1.55);
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

  // Moon / Ceiling Orb
  const moonColor = stage.id === 'lab' ? 0x9bffd0 : stage.id === 'kitchen' ? 0xffe0a3 : 0xeaf4ff;
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: moonColor })
  );
  moonMesh.position.set(28, 34, -46);
  group.add(moonMesh);

  // Main felt floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: getStageFloorTexture(stage.id, stage.floorBaseColor, stage.floorPatchColors, stage.id === 'kitchen'),
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

  // Stage-specific obstacles & props
  if (stage.id === 'graveyard') {
    const stoneMat = makeFeltMaterial(0x525c6e);
    const mossMat = makeFeltMaterial(0x417a53);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + 0.2;
      const dist = 14 + (i % 3) * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const tomb = new THREE.Group();
      tomb.position.set(x, 0, z);
      tomb.rotation.y = -angle + Math.PI * 0.5 + (i % 2 === 0 ? 0.2 : -0.2);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.9, 0.55), stoneMat);
      slab.position.y = 0.9;
      slab.castShadow = true;
      tomb.add(slab);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 14), stoneMat);
      top.rotation.x = Math.PI / 2;
      top.position.y = 1.85;
      top.castShadow = true;
      tomb.add(top);

      const moss = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), mossMat);
      moss.scale.set(1.2, 0.4, 1);
      moss.position.set(0.35, 0.15, 0.22);
      tomb.add(moss);

      group.add(tomb);
      obstacles.push({ x, z, r: 1.05 });
    }
  } else if (stage.id === 'kitchen') {
    // Giant felt loaves, pudding cups & giant cooking pots!
    const breadMat = makeFeltMaterial(0xc8843f);
    const crustMat = makeFeltMaterial(0x7d4822);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b5, metalness: 0.65, roughness: 0.3 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.15;
      const dist = 13 + (i % 3) * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const prop = new THREE.Group();
      prop.position.set(x, 0, z);
      if (i % 2 === 0) {
        const loaf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.2), breadMat);
        loaf.position.y = 0.6;
        loaf.castShadow = true;
        prop.add(loaf);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 12), crustMat);
        top.rotation.z = Math.PI / 2;
        top.position.y = 1.15;
        top.castShadow = true;
        prop.add(top);
      } else {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.9, 1.5, 16), potMat);
        pot.position.y = 0.75;
        pot.castShadow = true;
        prop.add(pot);
      }
      group.add(prop);
      obstacles.push({ x, z, r: 1.1 });
    }
  } else {
    // Alchemist Lab: glowing green acid vats & crystals
    const vatMat = makeFeltMaterial(0x3a4a4e);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: 0x4dff88,
      emissive: 0x22cc66,
      emissiveIntensity: 1.1,
    });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.3;
      const dist = 13 + (i % 3) * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const vat = new THREE.Group();
      vat.position.set(x, 0, z);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.5, 14), vatMat);
      base.position.y = 0.75;
      base.castShadow = true;
      vat.add(base);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), liquidMat);
      dome.position.y = 1.55;
      vat.add(dome);

      group.add(vat);
      obstacles.push({ x, z, r: 1.0 });
    }
  }

  // Perimeter yarn/felt trees or pillars
  const trunkMat = makeFeltMaterial(0x543c2c);
  const leafColors =
    stage.id === 'kitchen'
      ? [0xa84a6f, 0x873b66, 0xbf637b]
      : stage.id === 'lab'
        ? [0x267360, 0x328c6e, 0x1c594f]
        : [0x2a5c49, 0x366d56, 0x244f4c];

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
      makeFeltMaterial(leafColors[i % leafColors.length])
    );
    puff.position.y = 3.2;
    puff.castShadow = true;
    tree.add(puff);

    group.add(tree);
    obstacles.push({ x, z, r: 0.9 });
  }

  // Lanterns
  const lanternPostMat = makeFeltMaterial(0x2a2433);
  const lampHex = stage.id === 'lab' ? 0x6bffa8 : stage.id === 'kitchen' ? 0xff9ec4 : 0xffb44c;
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
    color: stage.id === 'lab' ? 0x7dffaa : stage.id === 'kitchen' ? 0xffd088 : 0xc6ff8a,
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
