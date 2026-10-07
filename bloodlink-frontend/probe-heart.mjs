function implicitField(x, y, z) {
  const ix = x, iy = z, iz = y;
  const a = ix * ix + 2.25 * iy * iy + iz * iz - 1;
  return a * a * a - ix * ix * iz * iz * iz - 0.1125 * iy * iy * iz * iz * iz;
}

function surfaceRadius(dx, dy, dz) {
  let lo = 0.02, hi = 2.2;
  while (implicitField(dx * hi, dy * hi, dz * hi) < 0 && hi < 8) hi *= 1.4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) * 0.5;
    if (implicitField(dx * mid, dy * mid, dz * mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

// Replicate the meshing + normalisation to learn the real mesh-space extents.
const pts = [];
const W = 240, H = 160;
for (let j = 0; j <= H; j++) {
  const phi = (j / H) * Math.PI;
  for (let i = 0; i <= W; i++) {
    const theta = (i / W) * Math.PI * 2;
    const d = [
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ];
    const r = surfaceRadius(d[0], d[1], d[2]);
    pts.push([d[0] * r, d[1] * r, d[2] * r]);
  }
}
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const p of pts) for (let k = 0; k < 3; k++) {
  if (p[k] < min[k]) min[k] = p[k];
  if (p[k] > max[k]) max[k] = p[k];
}
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
const center = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2];
const s = 2 / size[1];
console.log('raw size', size.map((v) => v.toFixed(3)).join(' x '));
console.log('normalise scale', s.toFixed(4), 'center', center.map((v) => v.toFixed(3)).join(','));
console.log('normalised extent',
  'x', ((min[0] - center[0]) * s).toFixed(3), '..', ((max[0] - center[0]) * s).toFixed(3),
  '| y', ((min[1] - center[1]) * s).toFixed(3), '..', ((max[1] - center[1]) * s).toFixed(3),
  '| z', ((min[2] - center[2]) * s).toFixed(3), '..', ((max[2] - center[2]) * s).toFixed(3));

// Normalised surface point along a mesh-space direction.
function surf(dx, dy, dz) {
  const len = Math.hypot(dx, dy, dz);
  const d = [dx / len, dy / len, dz / len];
  const r = surfaceRadius(d[0], d[1], d[2]);
  return [(d[0] * r - center[0]) * s, (d[1] * r - center[1]) * s, (d[2] * r - center[2]) * s];
}

console.log('\n-- top profile: surface y along the x axis (z=0 plane, upward dirs) --');
for (let x = -0.9; x <= 0.901; x += 0.15) {
  // Cast upward-biased rays to find the top surface at this x.
  let best = -9;
  for (let a = 0.05; a < 1.6; a += 0.01) {
    const p = surf(Math.sin(a) * Math.sign(x || 1) * Math.abs(x) / 0.9, Math.cos(a), 0);
    if (Math.abs(p[0] - x) < 0.03 && p[1] > best) best = p[1];
  }
  console.log(`  x=${x.toFixed(2)}  topY=${best.toFixed(3)}`);
}

console.log('\n-- vertical slice at x=0 (the cleft), scanning upward rays in zy plane --');
for (const zf of [-0.6, -0.3, 0, 0.3, 0.6]) {
  const p = surf(0, 1, zf);
  console.log(`  dir(0,1,${zf})  ->  y=${p[1].toFixed(3)} z=${p[2].toFixed(3)}`);
}

console.log('\n-- lobe tops --');
for (const xf of [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]) {
  const p = surf(xf, 1, 0);
  console.log(`  dir(${xf},1,0) -> x=${p[0].toFixed(3)} y=${p[1].toFixed(3)}`);
}

console.log('\n-- half-width at various heights (ray in xy plane) --');
for (const yf of [1, 0.6, 0.3, 0, -0.3, -0.6, -0.9]) {
  const p = surf(1, yf, 0);
  console.log(`  dir(1,${yf},0) -> x=${p[0].toFixed(3)} y=${p[1].toFixed(3)}`);
}

console.log('\n-- depth (z) at various heights --');
for (const yf of [0.8, 0.4, 0, -0.4, -0.8]) {
  const p = surf(0, yf, 1);
  console.log(`  dir(0,${yf},1) -> y=${p[1].toFixed(3)} z=${p[2].toFixed(3)}`);
}
