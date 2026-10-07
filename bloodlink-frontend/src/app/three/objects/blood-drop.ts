import * as THREE from 'three';

/**
 * Teardrop silhouette as a lathe profile: a round lower bulb that tapers into
 * a sharp tip. Revolving a profile gives a far cleaner outline than deforming
 * a sphere, which is what made the previous drop read as an egg.
 */
function createDropProfile(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];

  const centerY = -0.12;
  const radiusX = 0.8;
  const radiusY = 0.74;

  // Lower bulb: quarter ellipse from the bottom pole to the widest point.
  const bulbSteps = 22;
  for (let i = 0; i <= bulbSteps; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * (i / bulbSteps);
    points.push(new THREE.Vector2(radiusX * Math.cos(angle), centerY + radiusY * Math.sin(angle)));
  }

  // Upper taper: concave shoulder pulling into the tip.
  const tipSteps = 28;
  for (let i = 1; i <= tipSteps; i++) {
    const s = i / tipSteps;
    const radius = radiusX * Math.pow(1 - s, 1.55) * (1 + 1.05 * s * (1 - s));
    points.push(new THREE.Vector2(Math.max(radius, 0), centerY + 1.2 * s));
  }

  return points;
}

export interface BloodDrop {
  object: THREE.Group;
  update(elapsed: number): void;
  setOpacity(value: number): void;
  dispose(): void;
}

export function createBloodDrop(): BloodDrop {
  const object = new THREE.Group();

  const geometry = new THREE.LatheGeometry(createDropProfile(), 72);
  geometry.computeVertexNormals();

  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  const basePositions = new Float32Array(position.array);

  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x740c1b,
    roughness: 0.07,
    metalness: 0,
    transmission: 0.55,
    thickness: 1.5,
    ior: 1.38,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    emissive: 0x2c0309,
    emissiveIntensity: 0.32,
    envMapIntensity: 1.3,
    transparent: true,
    opacity: 1
  });

  const shell = new THREE.Mesh(geometry, shellMaterial);
  object.add(shell);

  // Inner core read through the transmissive shell: fakes the dense, light-
  // absorbing centre of a real blood droplet.
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xb81a30,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const core = new THREE.Mesh(geometry.clone(), coreMaterial);
  core.scale.setScalar(0.62);
  core.position.y = -0.08;
  object.add(core);

  const radial = new THREE.Vector3();

  return {
    object,

    update(elapsed) {
      // Surface-tension ripple, damped towards the tip so the silhouette stays
      // crisp while the body still feels like liquid.
      for (let i = 0; i < position.count; i++) {
        const x = basePositions[i * 3];
        const y = basePositions[i * 3 + 1];
        const z = basePositions[i * 3 + 2];

        const planar = Math.hypot(x, z);
        if (planar < 0.0001) continue;

        const angle = Math.atan2(z, x);
        const wobble =
          0.02 * Math.sin(elapsed * 2.1 + y * 4.4 + angle * 3) +
          0.012 * Math.sin(elapsed * 3.05 - y * 6.1 + angle * 2);

        const damp = Math.min(1, planar / 0.35);
        radial.set(x / planar, 0, z / planar).multiplyScalar(wobble * damp);

        position.setXYZ(i, x + radial.x, y + 0.006 * Math.sin(elapsed * 1.8 + planar * 5), z + radial.z);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();

      shellMaterial.emissiveIntensity = 0.28 + 0.07 * Math.sin(elapsed * 1.7);
      coreMaterial.opacity = (0.34 + 0.08 * Math.sin(elapsed * 2.2)) * shellMaterial.opacity;
    },

    setOpacity(value) {
      shellMaterial.opacity = value;
      coreMaterial.opacity = 0.4 * value;
    },

    dispose() {
      geometry.dispose();
      core.geometry.dispose();
      shellMaterial.dispose();
      coreMaterial.dispose();
    }
  };
}
