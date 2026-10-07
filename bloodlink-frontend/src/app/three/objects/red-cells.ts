import * as THREE from 'three';

/** Biconcave disc: the real erythrocyte silhouette, not a sphere. */
function createCellGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(0.12, 18, 12);
  const position = geometry.attributes['position'] as THREE.BufferAttribute;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const dimple = 0.34 * Math.exp(-(x * x + z * z) / 0.05);
    position.setXYZ(i, x * (1 - dimple), y * 0.44, z * (1 - dimple));
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createCellMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x8e1f2e,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xff8d96),
    emissive: 0x240309,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.92,
    envMapIntensity: 1.1
  });
}

export interface CellFieldOptions {
  count: number;
  /** Half-extent of the spawn box on each axis. */
  bounds: THREE.Vector3;
  scale?: number;
  scaleVariance?: number;
  /** Keeps cells out of a sphere at the origin so they never clip the hero mesh. */
  clearRadius?: number;
  driftScale?: number;
}

export interface CellField {
  object: THREE.InstancedMesh;
  update(elapsed: number): void;
}

interface CellState {
  base: THREE.Vector3;
  phase: number;
  speed: number;
  drift: number;
  scale: number;
  spin: THREE.Vector3;
  tilt: THREE.Euler;
}

/**
 * Drifting erythrocyte field rendered as a single InstancedMesh.
 *
 * The previous implementation added one Mesh per cell, so a 70-cell background
 * cost 70 draw calls. Instancing collapses that to one while still allowing
 * per-cell position, rotation and scale.
 */
export function createCellField(options: CellFieldOptions): CellField {
  const { count, bounds, scale = 1, scaleVariance = 0.5, clearRadius = 0, driftScale = 1 } = options;

  const geometry = createCellGeometry();
  const material = createCellMaterial();
  const object = new THREE.InstancedMesh(geometry, material, count);
  object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  object.frustumCulled = false;

  const cells: CellState[] = [];

  for (let i = 0; i < count; i++) {
    const base = new THREE.Vector3(
      (Math.random() - 0.5) * 2 * bounds.x,
      (Math.random() - 0.5) * 2 * bounds.y,
      (Math.random() - 0.5) * 2 * bounds.z
    );

    if (clearRadius > 0) {
      const planar = Math.hypot(base.x, base.y);
      if (planar < clearRadius) {
        const push = clearRadius / Math.max(planar, 0.0001);
        base.x *= push;
        base.y *= push;
      }
    }

    cells.push({
      base,
      phase: Math.random() * Math.PI * 2,
      speed: 0.06 + Math.random() * 0.14,
      drift: (0.2 + Math.random() * 0.5) * driftScale,
      scale: scale * (1 - scaleVariance / 2 + Math.random() * scaleVariance),
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2
      ),
      tilt: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    });
  }

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const position = new THREE.Vector3();
  const scaleVector = new THREE.Vector3();

  return {
    object,
    update(elapsed) {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const t = elapsed * cell.speed + cell.phase;

        position.set(
          cell.base.x + Math.sin(t) * cell.drift,
          cell.base.y + Math.cos(t * 0.73) * cell.drift * 0.7,
          cell.base.z + Math.sin(t * 0.51) * cell.drift * 0.85
        );

        euler.set(
          cell.tilt.x + elapsed * cell.spin.x,
          cell.tilt.y + elapsed * cell.spin.y,
          cell.tilt.z + elapsed * cell.spin.z
        );
        quaternion.setFromEuler(euler);
        scaleVector.setScalar(cell.scale);

        matrix.compose(position, quaternion, scaleVector);
        object.setMatrixAt(i, matrix);
      }
      object.instanceMatrix.needsUpdate = true;
    }
  };
}
