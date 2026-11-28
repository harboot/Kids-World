export const CLIFF_Z = -22;
export const LOWER_LEVEL = 1.4;
export const UPPER_LEVEL = 21;
export const LOWER_X = -14;
export const UPPER_X = 17;
export const LAKE_LEVEL = 0.45;
export const GRID = 2;
export const X_MIN = -72;

export const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const mix = (a, b, t) => a + (b - a) * t;
export function smooth(min, max, value) {
  const t = clamp((value - min) / (max - min));
  return t * t * (3 - 2 * t);
}

export function route(points) {
  const segments = [];
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    const [x, z, y] = points[i - 1];
    const [endX, endZ, endY] = points[i];
    const dx = endX - x;
    const dz = endZ - z;
    const length = Math.hypot(dx, dz);
    segments.push({ x, z, y, endY, dx, dz, length, distance });
    distance += length;
  }
  return { points, segments, length: distance };
}

export function nearest({ segments }, x, z) {
  let result;
  let closest = Infinity;
  for (const segment of segments) {
    const { x: startX, z: startZ, y, endY, dx, dz, length, distance } = segment;
    const t = clamp(((x - startX) * dx + (z - startZ) * dz) / (length * length));
    const squared = (x - startX - dx * t) ** 2 + (z - startZ - dz * t) ** 2;
    if (squared < closest) {
      closest = squared;
      result = { offset: Math.sqrt(squared), distance: distance + t * length, y: mix(y, endY, t) };
    }
  }
  return result;
}

// The broad bends on the east face leave room for both walkers and overlooks.
export const hikingTrail = route([
  [UPPER_X, CLIFF_Z, UPPER_LEVEL], [23, -15, 21], [33, -13, 20.2], [44, -6, 17],
  [46, 6, 13.6], [40, 15, 10.8], [30, 19, 7.8], [25, 28, 5.2],
  [30, 38, 3.2], [20, 46, 2.1], [9, 46, 2], [4, 46, 1.9],
]);

export const westTrail = route([
  [-4, 46, 1.9], [-16, 44, 2.65], [-21, 39, 3.5], [-27, 31, 3.4], [-30, 21, 2.8],
  [-33, 9, 2.4], [-36, -4, 1.8], [-36, -15, 1.6], [-36, -18, LOWER_LEVEL],
]);

export const lake = { x: -5, z: -2, rx: 27, rz: 24 };
export function lakeDistance(x, z) {
  return Math.hypot((x - lake.x) / lake.rx, (z - lake.z) / lake.rz)
    + 0.035 * Math.sin(x * 0.39 + z * 0.24) + 0.043 * Math.sin(z * 0.35);
}

export function riverCenter(z) {
  return 2.7 * Math.sin((z - 16) * 0.073) + (z - 26) * 0.11;
}

export function riverWidth(z) {
  return 4.8 + 0.65 * Math.sin(z * 0.33) + 0.65 * Math.sin(z * 0.13);
}

export function riverLevel(z) {
  return LAKE_LEVEL - 0.55 * smooth(28, 31, z) - 0.41 * smooth(51, 53, z) - 0.72 * smooth(64, 67, z);
}

export function portalHeight(x) {
  return mix(LOWER_LEVEL, UPPER_LEVEL, smooth(-4, 9, x));
}

export function valleyWall(x, z) {
  const span = 39 + 4 * Math.cos(z * 0.085) + 5 * Math.exp(-((z + 4) ** 2) / 225)
    - 10 * smooth(42, 74, z);
  return Math.max(Math.abs(x + 3 * Math.sin(z * 0.12)) - span, z - (61 + 5 * Math.cos(x * 0.11)));
}

export function terrainHeight(x, z) {
  const east = nearest(hikingTrail, x, z);
  const west = nearest(westTrail, x, z);
  const lakeEdge = lakeDistance(x, z);
  const riverEdge = Math.abs(x - riverCenter(z)) / riverWidth(z);
  const wrinkles = Math.sin(x * 0.28 + z * 0.1) * 0.48 + Math.cos(z * 0.22 - x * 0.09) * 0.54;
  let y = 2.1 + wrinkles + smooth(0, 13, valleyWall(x, z)) * (25 + 5 * Math.cos(z * 0.14 + x * 0.12));
  y += 3.7 * Math.exp(-((x + 36) ** 2 + (z - 14) ** 2) / 235);
  y += 6 * Math.exp(-((x - 41) ** 2 + (z + 13) ** 2) / 290);
  y = mix(LAKE_LEVEL - 3 + 3.6 * smooth(0.53, 1.08, lakeEdge), y, smooth(1, 1.24, lakeEdge));
  if (z > 13 && z < 78) {
    const channel = riverLevel(z) - 1.45 + 1.6 * smooth(0.48, 1.16, riverEdge);
    y = mix(y, Math.min(y, channel), smooth(13, 22, z) * (1 - smooth(69, 78, z)) * (1 - smooth(1.05, 1.7, riverEdge)));
  }
  y = mix(west.y, y, smooth(2.4, 8.5, west.offset));
  y = mix(east.y, y, smooth(2.8, 14, east.offset));
  // Match the open cave's floor all the way across each portal.
  const apron = Math.max(1 - smooth(4.3, 7.5, Math.abs(x - LOWER_X)),
    1 - smooth(5.9, 10, Math.abs(x - UPPER_X)));
  return mix(y, portalHeight(x), apron * (1 - smooth(CLIFF_Z, -11, z)));
}

export function cliffRelief(x) {
  const portalDistance = Math.min(Math.abs(x - LOWER_X), Math.abs(x - UPPER_X));
  return smooth(5.2, 8.8, portalDistance) * (1.03 + 0.77 * Math.sin(x * 0.39) + 0.36 * Math.cos(x * 0.75));
}

export function cliffTop(x) {
  return 26.2 + 2.8 * Math.cos(x * 0.13) + 1.4 * Math.sin(x * 0.39)
    + 13 * smooth(29, 66, Math.abs(x)) + 4 * Math.exp(-((x - UPPER_X) ** 2) / 109);
}

export function bedrockHeight(x, z) {
  const peaks = [
    [-55, -48, 63, 26], [-35, -76, 69, 19], [-7, -63, 53, 25],
    [20, -77, 75, 22], [48, -57, 66, 24], [68, -82, 80, 27],
  ];
  let y = 25 + 2.1 * Math.sin(x * 0.22 + z * 0.16);
  for (const [px, pz, height, radius] of peaks) {
    const slope = clamp(1 - Math.hypot((x - px) * 0.84, z - pz) / radius);
    y = Math.max(y, 24 + (height - 24) * slope ** 1.06 + 4 * Math.sin(x * 0.61 - z * 0.37) * slope);
  }
  return mix(cliffTop(x), y, smooth(CLIFF_Z, CLIFF_Z - 12, z));
}

// Both meshes and collision use the same piecewise-linear surface.
export function heightGrid(x0, x1, z0, z1, height) {
  const columns = (x1 - x0) / GRID + 1;
  const rows = (z1 - z0) / GRID + 1;
  const points = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const x = x0 + GRID * column;
      const z = z0 + GRID * row;
      return [x, height(x, z), z];
    }));
  return {
    points,
    triangles: function* () {
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < columns - 1; i++) {
          const a = points[j][i], b = points[j][i + 1], c = points[j + 1][i], d = points[j + 1][i + 1];
          if ((i + j) % 2) yield* [[a, c, d], [a, d, b]];
          else yield* [[a, c, b], [b, c, d]];
        }
      }
    },
    sample(x, z) {
      const u = clamp((x - x0) / GRID, 0, columns - 1);
      const v = clamp((z - z0) / GRID, 0, rows - 1);
      const i = Math.min(columns - 2, Math.floor(u)), j = Math.min(rows - 2, Math.floor(v));
      const s = u - i, t = v - j;
      const a = points[j][i][1], b = points[j][i + 1][1], c = points[j + 1][i][1], d = points[j + 1][i + 1][1];
      if ((i + j) % 2) return s < t ? a + (d - c) * s + (c - a) * t : a + (b - a) * s + (d - b) * t;
      return s + t < 1 ? a + (b - a) * s + (c - a) * t : d + (d - c) * (s - 1) + (d - b) * (t - 1);
    },
  };
}

export function faces(THREE, scene, name, material) {
  const positions = [], colors = [];
  function triangle(a, b, c, color) {
    if (a === b || b === c || c === a) return;
    positions.push(...a, ...b, ...c);
    const palette = Array.isArray(color) ? color : [color, color, color];
    for (const tint of palette) colors.push(tint.r, tint.g, tint.b);
  }
  return {
    triangle,
    quad(a, b, c, d, color) {
      triangle(a, b, c, color);
      triangle(a, c, d, color);
    },
    finish() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      scene.add(mesh);
      return mesh;
    },
  };
}
