import * as THREE from 'three';
import { getViewportTier } from '../core/viewport';

/** Pixel-ratio ceilings per tier: the main lever for 3D cost on weak GPUs. */
const MAX_PIXEL_RATIO: Record<string, number> = {
  mobile: 1.3,
  tablet: 1.5,
  desktop: 1.65
};

export function maxPixelRatio(): number {
  return MAX_PIXEL_RATIO[getViewportTier()] ?? 1.5;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const base = {
    canvas,
    alpha: true,
    failIfMajorPerformanceCaveat: false,
    stencil: false,
    depth: true
  } as const;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      ...base,
      antialias: getViewportTier() !== 'mobile',
      powerPreference: 'default'
    });
  } catch {
    renderer = new THREE.WebGLRenderer({
      ...base,
      antialias: false
    });
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio()));

  // Filmic tone mapping is what keeps the bright rim lights from clipping to
  // flat white and gives the render its cinematic falloff.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return renderer;
}

/**
 * Keeps a renderer and camera matched to an element's box via ResizeObserver,
 * which also catches layout changes that never fire a window resize event.
 */
export function fitToElement(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  element: HTMLElement,
  onResize?: (width: number, height: number) => void
): () => void {
  const apply = () => {
    const { width, height } = element.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio()));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    onResize?.(width, height);
  };

  const observer = new ResizeObserver(apply);
  observer.observe(element);
  apply();

  return () => observer.disconnect();
}

/** Recursively frees geometries and materials owned by a subtree. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as Partial<THREE.Mesh>;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
