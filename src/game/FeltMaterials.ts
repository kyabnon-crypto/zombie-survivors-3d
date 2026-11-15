import * as THREE from 'three';

let feltBumpTex: THREE.CanvasTexture | null = null;
let grassFloorTex: THREE.CanvasTexture | null = null;

export function getFeltBumpTexture(): THREE.CanvasTexture {
  if (feltBumpTex) return feltBumpTex;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Wool felt fibers + micro-fuzz
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 90 + Math.floor(Math.random() * 90);
    ctx.strokeStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.lineWidth = 1;
    const angle = Math.random() * Math.PI * 2;
    const len = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  feltBumpTex = tex;
  return tex;
}

export function getGrassFloorTexture(): THREE.CanvasTexture {
  if (grassFloorTex) return grassFloorTex;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1f3b32';
  ctx.fillRect(0, 0, size, size);

  // Felt turf patches
  const patchColors = ['#24463b', '#1b332b', '#2b5244', '#182d27'];
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = patchColors[i % patchColors.length];
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 18 + Math.random() * 44;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle cross-stitch grid lines for handcrafted diorama look
  ctx.strokeStyle = 'rgba(130, 185, 155, 0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  for (let p = 64; p < size; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Felt fuzz fibers
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  grassFloorTex = tex;
  return tex;
}

export function makeFeltMaterial(
  color: THREE.ColorRepresentation,
  options?: { roughness?: number; emissive?: THREE.ColorRepresentation; emissiveIntensity?: number; bumpScale?: number }
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options?.roughness ?? 0.92,
    metalness: 0.02,
    bumpMap: getFeltBumpTexture(),
    bumpScale: options?.bumpScale ?? 0.035,
    emissive: options?.emissive ?? 0x000000,
    emissiveIntensity: options?.emissiveIntensity ?? 0,
  });
}
