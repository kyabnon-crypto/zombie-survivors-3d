import * as THREE from 'three';

let feltBumpTex: THREE.CanvasTexture | null = null;
const stageFloorCache = new Map<string, THREE.CanvasTexture>();

export function getFeltBumpTexture(): THREE.CanvasTexture {
  if (feltBumpTex) return feltBumpTex;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

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

export function getStageFloorTexture(
  stageId: string,
  baseColor: string,
  patchColors: string[],
  checker = false
): THREE.CanvasTexture {
  const cached = stageFloorCache.get(stageId);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  if (checker) {
    const step = 128;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        if (((x / step + y / step) | 0) % 2 === 0) {
          ctx.fillStyle = patchColors[0] || baseColor;
          ctx.fillRect(x, y, step, step);
        }
      }
    }
  } else {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = patchColors[i % patchColors.length];
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 18 + Math.random() * 44;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(255, 245, 220, 0.08)';
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
  stageFloorCache.set(stageId, tex);
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
