import * as THREE from 'three';
import { onFrame } from '../../core/render-loop';
import { prefersReducedMotion } from '../../core/motion';
import { getViewportTier } from '../../core/viewport';
import { createRenderer, fitToElement } from '../renderer';
import { createStudioEnvironment } from '../environment';
import { createBloodDrop } from '../objects/blood-drop';
import { createParticleField } from '../objects/particles';

const RING_POOL = 3;

export interface IntroStageHandle {
  /** 0 → hidden, 1 → fully formed. Drives the drop's entrance. */
  setReveal(value: number): void;
  /** 0 → at rest, 1 → camera has pushed through the drop. */
  setExitProgress(value: number): void;
  /** Emits an expanding shockwave ring, called on each R peak. */
  pulse(): void;
  dispose(): void;
}

interface Ring {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  age: number;
  active: boolean;
}

export function createIntroStage(canvas: HTMLCanvasElement): IntroStageHandle {
  const reduced = prefersReducedMotion();
  const tier = getViewportTier();

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = createStudioEnvironment(renderer);

  const baseDistance = tier === 'mobile' ? 5.6 : 6.3;
  const baseHeight = 0;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0.12, baseDistance);

  scene.add(new THREE.HemisphereLight(0xffc8cf, 0x120307, 0.7));

  const keyLight = new THREE.DirectionalLight(0xfff4f5, 2.1);
  keyLight.position.set(-3.2, 3.4, 5.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xff6a7c, 1.6);
  rimLight.position.set(3.4, -0.8, -3.2);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0xff4d63, 28, 14);
  fillLight.position.set(0.4, 0.2, 3.4);
  scene.add(fillLight);

  const drop = createBloodDrop();
  scene.add(drop.object);

  const particles = createParticleField({
    count: reduced ? 40 : tier === 'mobile' ? 70 : 140,
    spread: 11,
    color: 0xff5566,
    size: 0.04,
    opacity: 0.4
  });
  scene.add(particles.object);

  // Pre-allocated shockwave rings: reused so a 5 second intro never allocates
  // geometry mid-animation.
  const ringGeometry = new THREE.RingGeometry(0.92, 1, 72);
  const rings: Ring[] = Array.from({ length: RING_POOL }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6b7d,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, age: 0, active: false };
  });

  const stopFit = fitToElement(renderer, camera, canvas);

  let reveal = 0;
  let exitProgress = 0;

  function render(elapsed: number, delta: number): void {
    // Entrance: overshoot slightly then settle, so the drop "lands".
    const eased = 1 - Math.pow(1 - reveal, 3);
    const overshoot = Math.sin(reveal * Math.PI) * 0.06;
    const scale = (0.58 + 0.62 * eased + overshoot) * (1 + exitProgress * 1.45);

    drop.object.scale.setScalar(scale);
    drop.object.rotation.y = elapsed * 0.22;
    drop.object.position.y = baseHeight + (1 - eased) * 1.4 + Math.sin(elapsed * 0.9) * 0.05;
    drop.setOpacity(Math.max(0, eased * (1 - exitProgress * 1.35)));
    drop.update(elapsed);

    // Dolly through the drop for the hand-off into the page.
    camera.position.z = baseDistance - exitProgress * 5.4;
    camera.updateProjectionMatrix();

    keyLight.intensity = 2.1 * eased;
    rimLight.intensity = 1.6 * eased;
    fillLight.intensity = 22 + 10 * Math.sin(elapsed * 2.1);

    for (const ring of rings) {
      if (!ring.active) continue;
      ring.age += delta;
      const t = ring.age / 1.5;
      if (t >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        ring.material.opacity = 0;
        continue;
      }
      const radius = 0.7 + t * 2.6;
      ring.mesh.position.y = baseHeight;
      ring.mesh.scale.setScalar(radius);
      ring.material.opacity = 0.5 * (1 - t) * (1 - t) * (1 - exitProgress);
    }

    particles.update(elapsed, delta);
    renderer.render(scene, camera);
  }

  const stopFrames = onFrame(render);

  return {
    setReveal(value) {
      reveal = THREE.MathUtils.clamp(value, 0, 1);
    },

    setExitProgress(value) {
      exitProgress = THREE.MathUtils.clamp(value, 0, 1);
    },

    pulse() {
      const ring = rings.find((candidate) => !candidate.active);
      if (!ring) return;
      ring.age = 0;
      ring.active = true;
      ring.mesh.visible = true;
    },

    dispose() {
      stopFrames();
      stopFit();
      drop.dispose();
      ringGeometry.dispose();
      for (const ring of rings) ring.material.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    }
  };
}
