import * as THREE from 'three';
import { onFrame } from '../../core/render-loop';
import { beatPhase, contractionEnvelope } from '../../core/rhythm';
import { createRenderer, fitToElement } from '../renderer';
import { createStudioEnvironment } from '../environment';
import { createBloodDrop } from '../objects/blood-drop';

export interface FinalDropSceneHandle {
  dispose(): void;
}

/** Closing-CTA drop: same object as the intro, bookending the story. */
export function createFinalDropScene(canvas: HTMLCanvasElement): FinalDropSceneHandle {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = createStudioEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.z = 5.2;

  scene.add(new THREE.AmbientLight(0x50101c, 1.4));
  const keyLight = new THREE.PointLight(0xff4058, 30, 16);
  keyLight.position.set(-1.6, 2, 3);
  scene.add(keyLight);

  const drop = createBloodDrop();
  drop.object.scale.setScalar(0.78);
  scene.add(drop.object);

  const stopFit = fitToElement(renderer, camera, canvas);

  let stopFrames: (() => void) | null = null;
  const render = (elapsed: number) => {
    const contraction = contractionEnvelope(beatPhase(elapsed));
    drop.update(elapsed);
    drop.object.rotation.y = elapsed * 0.18;
    drop.object.position.y = Math.sin(elapsed * 0.8) * 0.12;
    drop.object.scale.setScalar(0.78 * (1 + 0.035 * contraction));
    keyLight.intensity = 30 + contraction * 26;
    renderer.render(scene, camera);
  };

  const visibility = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !stopFrames) stopFrames = onFrame(render);
      else if (!visible && stopFrames) {
        stopFrames();
        stopFrames = null;
      }
    },
    { threshold: 0 }
  );
  visibility.observe(canvas);

  return {
    dispose() {
      stopFrames?.();
      visibility.disconnect();
      stopFit();
      drop.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    }
  };
}
