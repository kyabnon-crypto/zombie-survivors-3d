import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group | null>>();

/**
 * Loads an optional .glb model, normalizes its height to ~1.9 units standing on Y=0,
 * enables shadows, and caches the base scene for cloning. Returns null on 404/failure
 * so callers seamlessly fall back to procedural felt puppets.
 */
export function loadNormalizedGlb(url: string, targetHeight = 1.9): Promise<THREE.Group | null> {
  const existing = cache.get(url);
  if (existing) {
    return existing.then((g) => (g ? g.clone(true) : null));
  }

  const p = new Promise<THREE.Group | null>((resolve) => {
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

        const wrapper = new THREE.Group();
        wrapper.add(scene);
        resolve(wrapper);
      },
      undefined,
      () => resolve(null)
    );
  });

  cache.set(url, p);
  return p.then((g) => (g ? g.clone(true) : null));
}
