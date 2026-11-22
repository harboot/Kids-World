export const SUMMIT_HEIGHT = 8.1;
export const LAKE_LEVEL = Math.fround(-0.38);

// x, z, elevation. The east approach climbs around the head of the basin.
export const MOUNTAIN_TRAIL = Object.freeze([
  [17, -12, 0], [17, -16, 0.55], [14, -20, 2.15], [13, -25, 3.9],
  [9, -27, 5.55], [5, -26, 7.05], [1, -24, SUMMIT_HEIGHT], [-3, -24, SUMMIT_HEIGHT],
].map(Object.freeze));

function smoothstep(min, max, value) {
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

function trailAt(x, z) {
  let distance = Infinity;
  let elevation = 0;
  for (let i = 1; i < MOUNTAIN_TRAIL.length; i++) {
    const [ax, az, ay] = MOUNTAIN_TRAIL[i - 1];
    const [bx, bz, by] = MOUNTAIN_TRAIL[i];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const gap = Math.hypot(x - ax - t * dx, z - az - t * dz);
    if (gap < distance) {
      distance = gap;
      elevation = ay + t * (by - ay);
    }
  }
  return { distance, elevation };
}

export function addSnowTerrain(THREE, scene, width, depth) {
  // A finer grid follows the mountain. The basin floor and outer snowfields use two-unit cells.
  const xMin = -width / 2;
  const zMin = -depth / 2;
  const fineEnd = -12;
  const fineRows = fineEnd - zMin;
  const rows = [zMin];
  while (rows.at(-1) < depth / 2) {
    const z = rows.at(-1);
    rows.push(z + (z < fineEnd ? 1 : 2));
  }
  const cols = width / 2;
  const stride = cols + 1;
  const positions = [];
  const colors = [];
  const land = [];
  const ice = [];
  const heights = new Float32Array(stride * rows.length);
  const powder = new THREE.Color(0xd8e8f1);
  const drift = new THREE.Color(0xc4dbe9);
  const packed = new THREE.Color(0xaecbdc);
  const lakeBlue = new THREE.Color(0x79b6cb);
  const cliff = new THREE.Color(0x698ba3);
  const color = new THREE.Color();

  for (const z of rows) {
    for (let col = 0; col <= cols; col++) {
      const x = xMin + col * 2;
      const wave = Math.sin(x * 0.59 + z * 0.21) * Math.cos(z * 0.56 - x * 0.13);
      const edge = Math.max(Math.abs(x) - 26, z - 25);
      const rolls = smoothstep(0, 5, edge) * (0.24 + wave * 0.18);
      const ridge = Math.hypot((x + 3) / 12, (z + 24) / 8.9);
      const mountain = SUMMIT_HEIGHT * (1 - smoothstep(0.35, 1, ridge + wave * 0.035)) *
        (1 - smoothstep(-18, -15, z));
      const trail = trailAt(x, z);
      const trailBlend = 1 - smoothstep(2.0, 5.2, trail.distance);
      const lakeRim = Math.hypot((x + 3.8) / 10.6, (z + 3.6) / 11.2) + wave * 0.04;
      const lake = (1 - smoothstep(0.86, 1.10, lakeRim)) *
        (1 - smoothstep(4, 6, x)) * (1 - smoothstep(6.55, 8, z));
      const y = rolls + mountain + (trail.elevation - mountain) * trailBlend + LAKE_LEVEL * lake;
      heights[positions.length / 3] = y;
      positions.push(x, y, z);

      // The path and shaded faces are painted into the terrain triangles.
      color.copy(powder).lerp(drift, 0.23 + wave * 0.16);
      color.lerp(cliff, (1 - smoothstep(0.47, 0.87, ridge)) * smoothstep(0.34, 0.65, ridge) * 0.75);
      color.lerp(packed, (1 - smoothstep(0.75, 2.9, trail.distance)) * (1 - smoothstep(-14, -11, z)));
      color.lerp(lakeBlue, lake * (0.88 + wave * 0.1));
      colors.push(color.r, color.g, color.b);
    }
  }

  function triangle(a, b, c) {
    const indices = heights[a] === LAKE_LEVEL && heights[b] === LAKE_LEVEL && heights[c] === LAKE_LEVEL ? ice : land;
    indices.push(a, b, c);
  }

  for (let row = 0; row < rows.length - 1; row++) {
    for (let col = 0; col < cols; col++) {
      const a = row * stride + col;
      triangle(a, a + stride, a + 1);
      triangle(a + 1, a + stride, a + stride + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(land.concat(ice));
  geometry.addGroup(0, land.length, 0);
  geometry.addGroup(land.length, ice.length, 1);
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, [
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 34, specular: 0x7ea9b9 }),
  ]);
  ground.name = 'Snow Basin terrain';
  ground.receiveShadow = true;
  scene.add(ground);

  function sample(x, z, grade = false) {
    const gridX = Math.min(cols, Math.max(0, (x - xMin) / 2));
    const col = Math.min(cols - 1, Math.floor(gridX));
    const gridZ = Math.min(depth, Math.max(0, z - zMin));
    const row = Math.min(rows.length - 2, gridZ < fineRows ? Math.floor(gridZ) : fineRows + Math.floor((gridZ - fineRows) / 2));
    const cellDepth = rows[row + 1] - rows[row];
    const u = gridX - col;
    const v = (zMin + gridZ - rows[row]) / cellDepth;
    const a = row * stride + col;
    const topLeft = heights[a];
    const topRight = heights[a + 1];
    const bottomLeft = heights[a + stride];
    const bottomRight = heights[a + stride + 1];
    if (u + v <= 1) {
      const dx = topRight - topLeft;
      const dz = bottomLeft - topLeft;
      return grade ? Math.hypot(dx / 2, dz / cellDepth) : topLeft + u * dx + v * dz;
    }
    const dx = bottomRight - bottomLeft;
    const dz = bottomRight - topRight;
    return grade ? Math.hypot(dx / 2, dz / cellDepth) : bottomRight - (1 - u) * dx - (1 - v) * dz;
  }

  return {
    getGroundHeight: (x, z) => sample(x, z),
    getGroundTraction: (x, z) => sample(x, z) <= LAKE_LEVEL + 0.002 ? 0.15 : 1,
    blocksGround(x, z, radius) {
      return Math.abs(x) + radius > width / 2 || Math.abs(z) + radius > depth / 2 || sample(x, z, true) > 0.76;
    },
  };
}
