import * as THREE from 'three';
import { contractionEnvelope } from '../../core/rhythm';

const { smoothstep } = THREE.MathUtils;

/**
 * Implicit heart surface:
 *   (x² + 9/4·y² + z² − 1)³ − x²z³ − 9/80·y²z³ = 0
 *
 * Evaluated with the mesh's Y and Z swapped into the formula's Z and Y, so the
 * resulting mesh has its apex on −Y (down) and its thin axis on Z (front to
 * back) without needing a post-hoc rotation.
 *
 * Negative inside, positive outside.
 */
function implicitField(x: number, y: number, z: number): number {
  const ix = x;
  const iy = z;
  const iz = y;

  const a = ix * ix + 2.25 * iy * iy + iz * iz - 1;
  return a * a * a - ix * ix * iz * iz * iz - 0.1125 * iy * iy * iz * iz * iz;
}

/**
 * Distance from the origin to the surface along a unit direction.
 *
 * The surface is star-shaped about the origin, so each ray crosses it exactly
 * once and a bisection converges reliably. Meshing this way lets a plain UV
 * sphere become a true heart volume, and conveniently concentrates the sphere's
 * dense pole vertices on the two sharpest features: the apex and the cleft.
 */
function surfaceRadius(dx: number, dy: number, dz: number): number {
  let lo = 0.02;
  let hi = 2.2;

  while (implicitField(dx * hi, dy * hi, dz * hi) < 0 && hi < 8) hi *= 1.4;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) * 0.5;
    if (implicitField(dx * mid, dy * mid, dz * mid) < 0) lo = mid;
    else hi = mid;
  }

  return (lo + hi) * 0.5;
}

/** Tube with a per-length radius, used for the great vessels and coronaries. */
function createTaperedTube(
  points: THREE.Vector3[],
  radiusAt: (t: number) => number,
  tubularSegments: number,
  radialSegments: number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const surfaceNormal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, point);

    const frameNormal = frames.normals[i];
    const frameBinormal = frames.binormals[i];
    const radius = radiusAt(t);

    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      surfaceNormal
        .set(0, 0, 0)
        .addScaledVector(frameNormal, Math.cos(angle))
        .addScaledVector(frameBinormal, Math.sin(angle))
        .normalize();

      positions.push(
        point.x + surfaceNormal.x * radius,
        point.y + surfaceNormal.y * radius,
        point.z + surfaceNormal.z * radius
      );
      normals.push(surfaceNormal.x, surfaceNormal.y, surfaceNormal.z);
      uvs.push(t, j / radialSegments);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/** Maps raw implicit-space coordinates into the normalised mesh space. */
interface HeartNormalisation {
  scale: number;
  center: THREE.Vector3;
}

interface MyocardiumResult {
  geometry: THREE.BufferGeometry;
  normalisation: HeartNormalisation;
}

function createMyocardiumGeometry(detail: 'low' | 'high'): MyocardiumResult {
  const widthSegments = detail === 'high' ? 112 : 68;
  const heightSegments = detail === 'high' ? 72 : 46;

  const geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  const position = geometry.attributes['position'] as THREE.BufferAttribute;

  const direction = new THREE.Vector3();
  const box = new THREE.Box3();

  for (let i = 0; i < position.count; i++) {
    direction.set(position.getX(i), position.getY(i), position.getZ(i)).normalize();
    const radius = surfaceRadius(direction.x, direction.y, direction.z);
    direction.multiplyScalar(radius);
    position.setXYZ(i, direction.x, direction.y, direction.z);
    box.expandByPoint(direction);
  }

  // Normalise to a height of 2 and centre, so callers can reason in units of
  // "heart heights" regardless of the implicit surface's natural extent.
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const normalise = 2 / size.y;

  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      (position.getX(i) - center.x) * normalise,
      (position.getY(i) - center.y) * normalise,
      (position.getZ(i) - center.z) * normalise
    );
  }

  geometry.computeVertexNormals();

  // Anatomical pass: everything below sculpts detail along the surface normal.
  const normal = geometry.attributes['normal'] as THREE.BufferAttribute;
  const sculpted: number[] = [];

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);

    let offset = 0;

    // Interventricular sulcus: the groove separating the ventricles, running
    // from the base down to the apex. Deeper at the front than the back.
    const sulcusLine = x + 0.2 * y + 0.03;
    const sulcus = Math.exp(-Math.pow(sulcusLine / 0.17, 2));
    const belowBase = 1 - smoothstep(y, 0.3, 0.66);
    if (nz > 0.08) offset -= 0.105 * sulcus * belowBase * smoothstep(nz, 0.08, 0.45);
    else if (nz < -0.08) offset -= 0.062 * sulcus * belowBase * smoothstep(-nz, 0.08, 0.45);

    // Atrioventricular groove: the waist where the atria meet the ventricles.
    offset -= 0.03 * Math.exp(-Math.pow((y - 0.42) / 0.12, 2));

    // Left-ventricle dominance: a symmetric heart looks like a math object.
    offset += 0.035 * smoothstep(x, 0, 0.7) * (1 - smoothstep(y, 0.35, 0.92));

    // Epicardial undulation so the surface is never perfectly analytic.
    offset +=
      0.016 * Math.sin(4.1 * x + 2.7 * y + 1.1) * Math.sin(3.4 * z + 2.1 * y) +
      0.008 * Math.sin(7.7 * y + 2.3 * x + 0.6) +
      0.004 * Math.sin(12.3 * x + 5.1 * z) * Math.sin(9.7 * y + 1.4);

    sculpted.push(x + nx * offset, y + ny * offset, z + nz * offset);
  }

  position.set(new Float32Array(sculpted));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return { geometry, normalisation: { scale: normalise, center } };
}

/**
 * Projects a direction onto the muscle surface in normalised mesh space, so
 * coronary vessels follow the same transform the myocardium received.
 */
function surfacePoint(direction: THREE.Vector3, lift: number, normalisation: HeartNormalisation): THREE.Vector3 {
  const d = direction.clone().normalize();
  const radius = surfaceRadius(d.x, d.y, d.z);
  const point = d.multiplyScalar(radius).sub(normalisation.center).multiplyScalar(normalisation.scale);
  return point.add(d.clone().normalize().multiplyScalar(lift));
}

function createGlowSprite(): THREE.Sprite {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,90,110,0.55)');
    gradient.addColorStop(0.4, 'rgba(206,32,62,0.22)');
    gradient.addColorStop(1, 'rgba(120,10,28,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    })
  );
  sprite.scale.setScalar(6.5);
  return sprite;
}

export interface AnatomicalHeart {
  /** Outer transform — callers own position, scale and presentation rotation. */
  object: THREE.Group;
  /** Local height of everything drawn, vessels included, centred on the origin. */
  readonly visualHeight: number;
  /** Local width of everything drawn. */
  readonly visualWidth: number;
  /** Latest contraction amount (0..1), for driving lights and UI. */
  readonly contraction: number;
  update(beatPhase: number, elapsed: number): void;
  setOpacity(value: number): void;
  dispose(): void;
}

export function createAnatomicalHeart(detail: 'low' | 'high' = 'high'): AnatomicalHeart {
  const object = new THREE.Group();

  // Inner group carries the anatomical tilt and the systolic twist, leaving the
  // outer group free for pointer-driven rotation.
  const body = new THREE.Group();
  body.rotation.set(0, 0, 0);
  object.add(body);

  // Wet muscle, not polished plastic: a broad soft specular from sheen rather
  // than a tight clearcoat highlight, which is what made earlier passes read
  // as a candy valentine instead of tissue.
  const myocardium = new THREE.MeshPhysicalMaterial({
    color: 0x7c1120,
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.55,
    sheen: 0.85,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0xd4707c),
    specularIntensity: 0.7,
    emissive: 0x33040c,
    emissiveIntensity: 0.12,
    envMapIntensity: 0.85,
    transparent: true,
    opacity: 1
  });

  const { geometry: muscleGeometry, normalisation } = createMyocardiumGeometry(detail);
  body.add(new THREE.Mesh(muscleGeometry, myocardium));

  const vesselMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8e2a36,
    roughness: 0.6,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.6,
    sheen: 0.5,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0xc98b92),
    specularIntensity: 0.6,
    emissive: 0x2a060d,
    emissiveIntensity: 0.1,
    envMapIntensity: 0.7,
    transparent: true,
    opacity: 1
  });

  const coronaryMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc2384a,
    roughness: 0.35,
    metalness: 0,
    clearcoat: 0.8,
    emissive: 0x4a0812,
    emissiveIntensity: 0.3,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 1
  });

  const tubeSegments = detail === 'high' ? 36 : 22;
  const tubeRadials = detail === 'high' ? 18 : 12;
  const geometries: THREE.BufferGeometry[] = [muscleGeometry];

  /*
   * The implicit surface's top is a valentine cleft, which is the single thing
   * that most betrays it as a maths object. Probing the normalised mesh puts
   * the lobe tops at x = ±0.45, y = 1.0 and the cleft floor at y = 0.79, so a
   * flattened atrial mass bridging that notch turns the two lobes into one
   * continuous base for the great vessels to emerge from.
   */
  const atriumGeometry = new THREE.SphereGeometry(1, detail === 'high' ? 48 : 28, detail === 'high' ? 32 : 20);
  geometries.push(atriumGeometry);

  const atria: { position: THREE.Vector3; scale: THREE.Vector3 }[] = [
    // Atrial mass filling the cleft.
    { position: new THREE.Vector3(0, 0.74, -0.02), scale: new THREE.Vector3(0.52, 0.3, 0.42) },
    // Right atrium, bulging just proud of the right lobe.
    { position: new THREE.Vector3(0.5, 0.68, 0.0), scale: new THREE.Vector3(0.3, 0.24, 0.3) },
    // Left atrial appendage, smaller and set slightly back.
    { position: new THREE.Vector3(-0.46, 0.7, -0.08), scale: new THREE.Vector3(0.25, 0.21, 0.25) }
  ];

  for (const atrium of atria) {
    const mesh = new THREE.Mesh(atriumGeometry, myocardium);
    mesh.position.copy(atrium.position);
    mesh.scale.copy(atrium.scale);
    body.add(mesh);
  }

  // Great vessels emerging from the base.
  const vessels: { points: THREE.Vector3[]; from: number; to: number }[] = [
    {
      // Aorta, arching up and over towards the back left.
      points: [
        new THREE.Vector3(0.08, 0.7, 0.06),
        new THREE.Vector3(0.16, 1.02, 0.0),
        new THREE.Vector3(0.06, 1.34, -0.14),
        new THREE.Vector3(-0.28, 1.46, -0.26),
        new THREE.Vector3(-0.56, 1.3, -0.32)
      ],
      from: 0.28,
      to: 0.2
    },
    {
      // Pulmonary trunk, crossing in front of the aorta.
      points: [
        new THREE.Vector3(-0.2, 0.68, 0.18),
        new THREE.Vector3(-0.3, 0.98, 0.14),
        new THREE.Vector3(-0.44, 1.24, 0.02),
        new THREE.Vector3(-0.58, 1.34, -0.1)
      ],
      from: 0.24,
      to: 0.16
    },
    {
      // Superior vena cava.
      points: [
        new THREE.Vector3(0.46, 0.62, -0.06),
        new THREE.Vector3(0.54, 0.96, -0.12),
        new THREE.Vector3(0.54, 1.26, -0.18)
      ],
      from: 0.19,
      to: 0.15
    }
  ];

  for (const vessel of vessels) {
    const geometry = createTaperedTube(
      vessel.points,
      (t) => vessel.from + (vessel.to - vessel.from) * t,
      tubeSegments,
      tubeRadials
    );
    geometries.push(geometry);
    body.add(new THREE.Mesh(geometry, vesselMaterial));
  }

  // Coronary arteries traced onto the muscle surface.
  const coronaryPaths: { directions: THREE.Vector3[]; from: number; to: number }[] = [
    {
      // Left anterior descending, following the anterior sulcus to the apex.
      directions: Array.from({ length: 9 }, (_, i) => {
        const s = i / 8;
        return new THREE.Vector3(-0.05 - 0.12 * Math.sin(s * 2.3), 0.62 - 1.5 * s, 0.46 - 0.16 * s);
      }),
      from: 0.026,
      to: 0.009
    },
    {
      // Right coronary, sweeping around the atrioventricular groove.
      directions: Array.from({ length: 9 }, (_, i) => {
        const s = i / 8;
        const angle = -0.25 + s * 1.9;
        return new THREE.Vector3(Math.cos(angle) * 0.9, 0.44 - 0.5 * s, Math.sin(angle) * 0.7);
      }),
      from: 0.024,
      to: 0.01
    },
    {
      // Circumflex branch over the left side.
      directions: Array.from({ length: 7 }, (_, i) => {
        const s = i / 6;
        const angle = Math.PI - 0.3 - s * 1.2;
        return new THREE.Vector3(Math.cos(angle) * 0.85, 0.38 - 0.62 * s, Math.sin(angle) * 0.6 + 0.25);
      }),
      from: 0.021,
      to: 0.009
    }
  ];

  for (const path of coronaryPaths) {
    const points = path.directions.map((direction) => surfacePoint(direction, 0.022, normalisation));
    const geometry = createTaperedTube(
      points,
      (t) => path.from + (path.to - path.from) * t,
      detail === 'high' ? 30 : 18,
      detail === 'high' ? 12 : 8
    );
    geometries.push(geometry);
    body.add(new THREE.Mesh(geometry, coronaryMaterial));
  }

  /*
   * The great vessels extend well above the myocardium, so the group is taller
   * and off-centre compared with the 2-unit muscle. Re-centring here and
   * reporting the true extent lets callers frame the heart by what is actually
   * drawn, instead of assuming a height of 2 and clipping the vessel tips.
   */
  body.updateMatrixWorld(true);
  const visualBounds = new THREE.Box3().setFromObject(body);
  const boundsCenter = visualBounds.getCenter(new THREE.Vector3());
  const boundsSize = visualBounds.getSize(new THREE.Vector3());
  body.position.set(-boundsCenter.x, -boundsCenter.y, 0);

  // Volumetric halo behind the mass, giving the heart atmosphere instead of a
  // hard silhouette against the background.
  const glow = createGlowSprite();
  glow.position.z = -1.4;
  object.add(glow);

  const glowMaterial = glow.material;
  const materials = [myocardium, vesselMaterial, coronaryMaterial];
  let contraction = 0;
  let opacity = 1;

  return {
    object,
    visualHeight: boundsSize.y,
    visualWidth: boundsSize.x,

    get contraction() {
      return contraction;
    },

    update(beatPhase, elapsed) {
      contraction = contractionEnvelope(beatPhase);

      // Beat on the inner body so the outer group can keep the layout scale.
      body.scale.set(
        1 + 0.048 * contraction,
        1 + 0.028 * contraction,
        1 + 0.048 * contraction
      );

      // Real ventricles twist as they contract.
      body.rotation.y = 0.03 * contraction;
      body.rotation.z = -0.01 * contraction;

      myocardium.emissiveIntensity = 0.1 + 0.5 * contraction;
      coronaryMaterial.emissiveIntensity = 0.26 + 0.6 * contraction;

      glow.scale.setScalar(6.4 + 0.5 * contraction);
      glowMaterial.opacity = (0.62 + 0.3 * contraction) * opacity;
    },

    setOpacity(value) {
      opacity = value;
      for (const material of materials) material.opacity = value;
      glowMaterial.opacity = 0.62 * value;
    },

    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      glowMaterial.map?.dispose();
      glowMaterial.dispose();
    }
  };
}
