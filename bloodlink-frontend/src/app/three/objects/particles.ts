import * as THREE from 'three';

let spriteTexture: THREE.Texture | null = null;

/** Soft round sprite so particles read as motes of light, not square pixels. */
function getSprite(): THREE.Texture {
  if (spriteTexture) return spriteTexture;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  spriteTexture = new THREE.CanvasTexture(canvas);
  return spriteTexture;
}

export interface ParticleFieldOptions {
  count: number;
  spread: number;
  color?: number;
  size?: number;
  opacity?: number;
}

export interface ParticleField {
  object: THREE.Points;
  update(elapsed: number, delta: number): void;
}

/**
 * Depth-distributed motes. Size attenuation plus additive blending makes the
 * far ones read as out-of-focus haze, which cheaply fakes depth of field.
 */
export function createParticleField(options: ParticleFieldOptions): ParticleField {
  const { count, spread, color = 0xd3384e, size = 0.055, opacity = 0.5 } = options;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    map: getSprite(),
    transparent: true,
    opacity,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const object = new THREE.Points(geometry, material);

  return {
    object,
    update(elapsed) {
      object.rotation.y = elapsed * 0.012;
      object.rotation.x = Math.sin(elapsed * 0.05) * 0.05;
    }
  };
}
