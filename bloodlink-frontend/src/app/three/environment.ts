import * as THREE from 'three';

interface LightCard {
  position: [number, number, number];
  color: number;
  size: number;
  intensity: number;
}

/**
 * A three-point studio lighting rig baked into an environment map.
 *
 * Physical materials need real reflections to read as wet tissue or liquid;
 * point lights alone leave them looking like plastic. Building the rig as
 * emissive cards and running it through PMREM gives proper specular highlights
 * and soft bounce without shipping an HDR file.
 */
const RIG: LightCard[] = [
  { position: [-9, 7, 9], color: 0xfff2f3, size: 5.5, intensity: 4.6 }, // key, upper left
  { position: [10, 3, 5], color: 0xff93a1, size: 4.5, intensity: 3.2 }, // rose rim, right
  { position: [0, -7, -7], color: 0xff2f47, size: 4, intensity: 2.1 }, // deep red bounce
  { position: [0, 11, -2], color: 0xffe3e7, size: 3, intensity: 2.4 } // soft top
];

export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene();

  env.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(24, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x120307, side: THREE.BackSide })
    )
  );

  for (const card of RIG) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(card.size * 2, card.size * 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(card.color).multiplyScalar(card.intensity),
        side: THREE.DoubleSide
      })
    );
    mesh.position.set(...card.position);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();

  env.traverse((node) => {
    const mesh = node as Partial<THREE.Mesh>;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (!Array.isArray(material)) material?.dispose();
  });

  return texture;
}
