import * as THREE from 'three';
import { onFrame } from '../../core/render-loop';
import { prefersReducedMotion } from '../../core/motion';
import { getViewportTier } from '../../core/viewport';
import { createRenderer, fitToElement } from '../renderer';
import { createStudioEnvironment } from '../environment';
import { createCellField } from '../objects/red-cells';
import { createParticleField } from '../objects/particles';

const CELL_COUNT: Record<string, number> = { mobile: 18, tablet: 34, desktop: 56 };
const PARTICLE_COUNT: Record<string, number> = { mobile: 70, tablet: 140, desktop: 220 };

export interface AmbientSceneHandle {
  dispose(): void;
}

/**
 * Page-wide erythrocyte field sitting behind all content.
 *
 * Deliberately low-contrast and slow: it has to add depth to every section
 * without competing with text anywhere on the page.
 */
export function createAmbientScene(canvas: HTMLCanvasElement): AmbientSceneHandle {
  const reduced = prefersReducedMotion();
  const tier = getViewportTier();
  const scaleFactor = reduced ? 0.45 : 1;

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = createStudioEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60);
  camera.position.set(0, 0, 11);

  scene.add(new THREE.AmbientLight(0x45101c, 1.2));

  const keyLight = new THREE.PointLight(0xff5566, 55, 48);
  keyLight.position.set(5, 4, 9);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x5e1221, 30, 44);
  fillLight.position.set(-7, -3, 5);
  scene.add(fillLight);

  const cells = createCellField({
    count: Math.round((CELL_COUNT[tier] ?? 40) * scaleFactor),
    bounds: new THREE.Vector3(12, 8, 7),
    scale: 1.5,
    scaleVariance: 1.1,
    driftScale: 1.1
  });
  scene.add(cells.object);

  const particles = createParticleField({
    count: Math.round((PARTICLE_COUNT[tier] ?? 150) * scaleFactor),
    spread: 24,
    color: 0xc4344a,
    size: 0.07,
    opacity: 0.3
  });
  scene.add(particles.object);

  const stopFit = fitToElement(renderer, camera, canvas);

  // Gentle parallax tied to the pointer, skipped on touch where there is none.
  let targetX = 0;
  let targetY = 0;
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    targetX = (event.clientX / innerWidth - 0.5) * 1.5;
    targetY = (event.clientY / innerHeight - 0.5) * 0.8;
  };
  addEventListener('pointermove', onPointerMove, { passive: true });

  // Scroll parallax: the field drifts as the page moves, reinforcing depth.
  let scrollOffset = 0;
  const onScroll = () => {
    scrollOffset = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const stopFrames = onFrame((elapsed) => {
    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (-targetY - scrollOffset * 2.4 - camera.position.y) * 0.02;
    camera.lookAt(targetX * 0.3, -targetY * 0.15, 0);

    cells.update(elapsed);
    particles.update(elapsed, 0);
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      stopFrames();
      stopFit();
      removeEventListener('pointermove', onPointerMove);
      removeEventListener('scroll', onScroll);
      scene.environment?.dispose();
      renderer.dispose();
    }
  };
}
