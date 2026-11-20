import { seededRandom } from '../../core/random.js';

export function buildIceCanopy(THREE, parent, { part, matte }, [rx, rz], ceiling) {
  const random = seededRandom(3751);
  const positions = [], colors = [];
  const ice = [0xa5dee8, 0x68afcf, 0x84c5e1, 0x507dae, 0xc8edf2, 0x7dacd6, 0x92d9e5, 0x6596c5]
    .map(color => new THREE.Color(color));
  const frost = new THREE.Color(0xebfaff);
  const deep = new THREE.Color(0x4178a5);
  function facet(a, b, c, color) {
    for (const vertex of [a, b, c]) {
      positions.push(...vertex);
      const t = Math.min(1, -vertex[1] / 14.5);
      const tint = color.clone().lerp(frost, .3 * (1 - t) ** 3).lerp(deep, .19 * t);
      colors.push(tint.r, tint.g, tint.b);
    }
  }

  function shell(rings, tip, offset) {
    const sides = rings[0].length;
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      const tint = ice[(side + offset) % ice.length];
      for (let level = 1; level < rings.length; level++) {
        const upper = rings[level - 1], lower = rings[level];
        facet(upper[side], upper[next], lower[side], tint);
        facet(upper[next], lower[next], lower[side], tint.clone().lerp(ice[(side + offset + 1) % ice.length], .35));
      }
      const lower = rings.at(-1);
      facet(lower[side], lower[next], tip, tint);
    }
  }

  const sides = 40;
  const angles = Array.from({ length: sides }, (_, i) => i / sides * 2 * Math.PI);
  const ribs = angles.map((a, i) => .92 + .11 * Math.cos(7 * a) + (i % 2 ? -.06 : .07));
  const rings = [[1, -.025, 0, 0], [.79, -2.25, -.45, .6], [.52, -5.4, -.85, .45],
    [.29, -9.05, .5, .1], [.105, -12.25, 1.1, -.4]].map(([scale, y, x, z], level) =>
    angles.map((a, i) => {
      if (!level) return [(rx + .13) * Math.cos(a), y, (rz + .13) * Math.sin(a)];
      const ridge = ribs[i] + (random() - .5) * .12;
      const angle = a + Math.sin(i * 1.87) * .055;
      const height = y + .93 * Math.cos(5 * a + level * .42) + (random() - .5) * .71;
      return [x + rx * scale * ridge * Math.cos(angle), height, z + rz * scale * ridge * Math.sin(angle)];
    }));
  shell(rings, [1.55, -14.85, -.75], 0);

  // Irregular spurs hang from the outer crown and from the shoulders of the main peak.
  for (const [count, distance, topRadius, tipDepth] of [[21, .83, 2.05, 4.7], [13, .61, 2.2, 7.1], [9, .36, 1.85, 10.55]]) {
    for (let i = 0; i < count; i++) {
      const angle = (i + random() * .56) * 2 * Math.PI / count;
      const radius = distance + (random() - .5) * .1;
      const x = rx * Math.cos(angle) * radius, z = rz * Math.sin(angle) * radius;
      const width = topRadius * (.63 + random() * .46);
      const depth = tipDepth + random() * (distance < .5 ? 2.9 : 2.5);
      const vertices = Array.from({ length: 5 }, (_, side) => {
        const a = angle + side * 2 * Math.PI / 5;
        return [Math.cos(a) * (.83 + random() * .25), Math.sin(a) * (.83 + random() * .25)];
      });
      const baseY = distance > .7 ? -.11 : distance > .5 ? -1.18 : -3.5;
      const base = vertices.map(([dx, dz]) => [x + dx * width, baseY, z + dz * width]);
      const shoulder = vertices.map(([dx, dz]) =>
        [x * .975 + dx * width * .73, (baseY - depth) * .5 + (random() - .5) * .63, z * .975 + dz * width * .73]);
      shell([base, shoulder], [x * .905, -depth, z * .91], i + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = matte(0xffffff, { vertexColors: true, emissive: 0x406883, emissiveIntensity: .22 });
  const canopy = part(parent, geometry, material, 0, ceiling, 0, 1, 1, 1);
  canopy.name = 'Inverted ice mountain';
  return canopy;
}
