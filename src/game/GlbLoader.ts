import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export type GlbMotionMode = 'idle' | 'walking' | 'running';

export interface LoadedGlbCharacter {
  group: THREE.Group;
  hasAnimations: boolean;
  setMotion: (mode: GlbMotionMode, timeScale?: number) => void;
  update: (dt: number) => void;
}

interface CachedGlbAsset {
  template: THREE.Group;
  animations: THREE.AnimationClip[];
}

const loader = new GLTFLoader();
const assetCache = new Map<string, Promise<CachedGlbAsset | null>>();

function loadCachedAsset(url: string, targetHeight: number): Promise<CachedGlbAsset | null> {
  const existing = assetCache.get(url);
  if (existing) return existing;

  const promise = new Promise<CachedGlbAsset | null>((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.y, 0.01);
        const scale = targetHeight / maxDim;
        scene.scale.setScalar(scale);

        // Recompute bounds after scale and anchor feet at y = 0
        const scaledBox = new THREE.Box3().setFromObject(scene);
        const center = new THREE.Vector3();
        scaledBox.getCenter(center);
        scene.position.x -= center.x;
        scene.position.z -= center.z;
        scene.position.y -= scaledBox.min.y;

        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });

        const template = new THREE.Group();
        template.add(scene);
        resolve({ template, animations: gltf.animations || [] });
      },
      undefined,
      () => resolve(null)
    );
  });

  assetCache.set(url, promise);
  return promise;
}

function createGlbInstance(asset: CachedGlbAsset): LoadedGlbCharacter {
  const group = SkeletonUtils.clone(asset.template) as THREE.Group;
  const animations = asset.animations;

  if (animations.length === 0) {
    let clock = 0;
    let currentMode: GlbMotionMode = 'idle';
    let currentScale = 1;
    return {
      group,
      hasAnimations: false,
      setMotion(mode, timeScale = 1) {
        currentMode = mode;
        currentScale = timeScale;
      },
      update(dt) {
        const speed = (currentMode === 'running' ? 12 : currentMode === 'walking' ? 7 : 3) * currentScale;
        clock += dt * speed;
        group.position.y = currentMode === 'idle' ? Math.sin(clock) * 0.02 : Math.abs(Math.sin(clock)) * 0.1;
      },
    };
  }

  const mixer = new THREE.AnimationMixer(group);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of animations) {
    actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  }

  let activeAction: THREE.AnimationAction | null = null;
  let currentMode: GlbMotionMode | null = null;

  const fadeTo = (action: THREE.AnimationAction | undefined, timeScale: number) => {
    if (!action) return false;
    action.setEffectiveTimeScale(timeScale);
    if (activeAction === action) return true;
    action.reset().setEffectiveWeight(1).play();
    if (activeAction) {
      activeAction.crossFadeTo(action, 0.16, true);
    }
    activeAction = action;
    return true;
  };

  const setMotion = (mode: GlbMotionMode, timeScale = 1) => {
    if (currentMode === mode && activeAction) {
      activeAction.setEffectiveTimeScale(mode === 'idle' && !actions['idle'] ? 0 : timeScale);
      return;
    }
    currentMode = mode;

    if (mode === 'running') {
      if (!fadeTo(actions['running'], timeScale)) {
        fadeTo(actions['walking'], timeScale * 1.45);
      }
    } else if (mode === 'walking') {
      if (!fadeTo(actions['walking'], timeScale)) {
        fadeTo(actions['running'], timeScale * 0.7);
      }
    } else {
      if (!fadeTo(actions['idle'], timeScale)) {
        const fallback = actions['walking'] || actions['running'];
        if (fadeTo(fallback, 0)) {
          fallback.time = 0;
        }
      }
    }
  };

  setMotion('idle', 1);

  return {
    group,
    hasAnimations: true,
    setMotion,
    update(dt) {
      mixer.update(dt);
    },
  };
}

/**
 * Loads an optional .glb model with SkeletonUtils cloning and AnimationMixer support.
 * Returns null on 404/failure so callers seamlessly fall back to procedural felt puppets.
 */
export async function loadAnimatedGlb(url: string, targetHeight = 1.9): Promise<LoadedGlbCharacter | null> {
  const asset = await loadCachedAsset(url, targetHeight);
  if (!asset) return null;
  return createGlbInstance(asset);
}

/**
 * Backward-compatible helper returning only the normalized Group.
 */
export async function loadNormalizedGlb(url: string, targetHeight = 1.9): Promise<THREE.Group | null> {
  const loaded = await loadAnimatedGlb(url, targetHeight);
  return loaded ? loaded.group : null;
}
