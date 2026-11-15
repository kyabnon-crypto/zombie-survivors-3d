import * as THREE from 'three';
import { getGrassFloorTexture, makeFeltMaterial } from './FeltMaterials';

export const ARENA_RADIUS = 38;

export interface GraveyardArena {
  group: THREE.Group;
  obstacles: Array<{ x: number; z: number; r: number }>;
  fireflies: THREE.Points;
  update: (time: number) => void;
}

export function buildGraveyardArena(scene: THREE.Scene): GraveyardArena {
  const group = new THREE.Group();
  const obstacles: Array<{ x: number; z: number; r: number }> = [];

  // Moonlit felt sky & fog
  scene.background = new THREE.Color(0x0c162b);
  scene.fog = new THREE.FogExp2(0x0f1c36, 0.015);

  // Ambient + Moon directional light + Warm rim fill
  const hemi = new THREE.HemisphereLight(0x88b4ff, 0x1a2822, 0.95);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xcde2ff, 1.55);
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

  // Glowing full moon in sky
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xeaf4ff })
  );
  moonMesh.position.set(28, 34, -46);
  group.add(moonMesh);

  // Main felt grass circular floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: getGrassFloorTexture(),
    roughness: 0.95,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS + 2, ARENA_RADIUS + 2.6, 1.6, 48), floorMat);
  floor.position.y = -0.8;
  floor.receiveShadow = true;
  group.add(floor);

  // Stitched wooden/stone border ring around arena
  const borderMat = makeFeltMaterial(0x3d3247);
  const borderRing = new THREE.Mesh(new THREE.TorusGeometry(ARENA_RADIUS + 0.5, 0.65, 10, 48), borderMat);
  borderRing.rotation.x = Math.PI / 2;
  borderRing.position.y = 0.12;
  group.add(borderRing);

  // Tombstones (R.I.P.)
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
    slab.receiveShadow = true;
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

  // Yarn/Felt trees around outer perimeter
  const trunkMat = makeFeltMaterial(0x543c2c);
  const leafColors = [0x2a5c49, 0x366d56, 0x244f4c];
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

  // Warm lanterns near cardinal points
  const lanternPostMat = makeFeltMaterial(0x2a2433);
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd275,
    emissive: 0xffaa33,
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

    const light = new THREE.PointLight(0xffb44c, 4.5, 16);
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
    color: 0xc6ff8a,
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
    fireflies,
    update(time: number) {
      const positions = fireGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < fireflyCount; i++) {
        const y = positions.getY(i) + Math.sin(time * 2.1 + i) * 0.008;
        positions.setY(i, Math.max(0.5, Math.min(5.2, y)));
      }
      positions.needsUpdate = true;
    },
  };
}
