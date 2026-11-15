import * as THREE from 'three';

let feltBumpTex: THREE.CanvasTexture | null = null;
const stageFloorCache = new Map<string, THREE.CanvasTexture>();
const patternTexCache = new Map<string, THREE.CanvasTexture>();

export function getFeltBumpTexture(): THREE.CanvasTexture {
  if (feltBumpTex) return feltBumpTex;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 80 + Math.floor(Math.random() * 110);
    ctx.strokeStyle = `rgba(${v},${v},${v},0.38)`;
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
  options?: {
    roughness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    bumpScale?: number;
    map?: THREE.Texture;
  }
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: options?.map ? 0xffffff : color,
    map: options?.map ?? null,
    roughness: options?.roughness ?? 0.92,
    metalness: 0.02,
    bumpMap: getFeltBumpTexture(),
    bumpScale: options?.bumpScale ?? 0.04,
    emissive: options?.emissive ?? 0x000000,
    emissiveIntensity: options?.emissiveIntensity ?? 0,
  });
}

function addFeltGrain(ctx: CanvasRenderingContext2D, w: number, h: number, count = 1800): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(x, y, 2, 2);
  }
}

export function getStripePatternTex(
  key: string,
  colA: string,
  colB: string,
  stripeWidth = 24,
  diagonal = false
): THREE.CanvasTexture {
  const cacheKey = `stripe:${key}`;
  const cached = patternTexCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colA;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = colB;
  if (diagonal) {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    for (let x = -size; x < size; x += stripeWidth * 2) {
      ctx.fillRect(x, -size, stripeWidth, size * 2);
    }
    ctx.restore();
  } else {
    for (let x = 0; x < size; x += stripeWidth * 2) {
      ctx.fillRect(x, 0, stripeWidth, size);
    }
  }
  addFeltGrain(ctx, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache.set(cacheKey, tex);
  return tex;
}

export function getPolkaPatternTex(
  key: string,
  bgCol: string,
  dotCol: string,
  dotRadius = 15,
  grid = 64
): THREE.CanvasTexture {
  const cacheKey = `polka:${key}`;
  const cached = patternTexCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = dotCol;
  for (let row = 0; row <= size / grid + 1; row++) {
    for (let col = 0; col <= size / grid + 1; col++) {
      const offset = (row % 2) * (grid * 0.5);
      ctx.beginPath();
      ctx.arc(col * grid + offset, row * grid, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  addFeltGrain(ctx, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache.set(cacheKey, tex);
  return tex;
}

export function getCorduroyPatternTex(key: string, baseCol: string, ribCol: string): THREE.CanvasTexture {
  const cacheKey = `cord:${key}`;
  const cached = patternTexCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseCol;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = ribCol;
  for (let x = 0; x < size; x += 8) {
    ctx.fillRect(x, 0, 3, size);
  }
  addFeltGrain(ctx, size, size, 1200);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache.set(cacheKey, tex);
  return tex;
}

export function getBookCoverTex(): THREE.CanvasTexture {
  const cacheKey = 'book_compendium';
  const cached = patternTexCache.get(cacheKey);
  if (cached) return cached;

  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e7c63c';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#25272d';
  ctx.fillRect(14, 16, w - 28, 130);

  ctx.fillStyle = '#f5f2e6';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ZOMBIE', w / 2, 74);

  ctx.fillStyle = '#e7c63c';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('COMPENDIUM', w / 2, 114);

  // Cute mini zombie icon on cover
  ctx.fillStyle = '#8eb872';
  ctx.beginPath();
  ctx.arc(190, 198, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#25272d';
  ctx.fillRect(166, 158, 48, 16);

  // Page lines on bottom left
  ctx.fillStyle = '#3d331d';
  for (let y = 168; y < 224; y += 14) {
    ctx.fillRect(28, y, 110, 5);
  }

  addFeltGrain(ctx, w, h, 800);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache.set(cacheKey, tex);
  return tex;
}

export function getBibTex(): THREE.CanvasTexture {
  const cacheKey = 'brains_bib';
  const cached = patternTexCache.get(cacheKey);
  if (cached) return cached;

  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f7efe3';
  ctx.fillRect(0, 0, w, h);

  // Lace scallop border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.setLineDash([]);

  ctx.fillStyle = '#e87c9b';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BRAINS', w / 2, h / 2 + 8);

  addFeltGrain(ctx, w, h, 900);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache.set(cacheKey, tex);
  return tex;
}

export function getBrainTex(bgCol: string, lineCol: string): THREE.CanvasTexture {
  const cacheKey = `brain:${bgCol}:${lineCol}`;
  const cached = patternTexCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let i = 0; i < 24; i++) {
    const x = 20 + Math.random() * (size - 40);
    const y = 20 + Math.random() * (size - 40);
    ctx.beginPath();
    ctx.arc(x, y, 16 + Math.random() * 14, Math.random() * Math.PI, Math.random() * Math.PI + 2.4);
    ctx.stroke();
  }
  addFeltGrain(ctx, size, size, 1000);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache.set(cacheKey, tex);
  return tex;
}
