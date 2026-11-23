export const HILL = { x: 16.6, z: 13.7, radiusX: 6.2, radiusZ: 8.8, height: 2.55 };
export const BACK_HILL = { x: 11.25, z: 23.45, radiusX: 11.15, radiusZ: 5.55, height: 5.15 };
export const POND = { x: -14, z: 13.5, radiusX: 5.65, radiusZ: 6.65, waterY: -0.14 };

export function shoreRadius(angle) {
  return 1 + 0.075 * Math.sin(angle * 3) + 0.055 * Math.cos(angle * 5) + 0.035 * Math.sin(angle * 2);
}

export function pondDistance(x, z) {
  const dx = (x - POND.x) / POND.radiusX;
  const dz = (z - POND.z) / POND.radiusZ;
  return Math.hypot(dx, dz) / shoreRadius(Math.atan2(dz, dx));
}

function smooth(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function naturalHeight(x, z) {
  const rise = hill => hill.height *
    (1 - smooth(Math.hypot((x - hill.x) / hill.radiusX, (z - hill.z) / hill.radiusZ)));
  const shore = pondDistance(x, z);
  const basin = -0.42 * (1 - smooth((shore - 0.76) / 0.395));
  const deepBed = -0.14 * (1 - smooth((shore - 0.82) / 0.16));
  return Math.max(rise(HILL), rise(BACK_HILL)) + basin + deepBed;
}

// Sample the same triangles that the renderer draws.
export function createTerrain(width, depth) {
  const columns = Math.ceil(width / 0.6);
  const rows = Math.ceil(depth / 0.6);
  const stride = columns + 1;
  const left = -width / 2;
  const front = -depth / 2;
  const dx = width / columns;
  const dz = depth / rows;
  const heights = new Float32Array(stride * (rows + 1));
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      heights[row * stride + col] = naturalHeight(left + col * dx, front + row * dz);
    }
  }

  function getTerrainHeight(x, z) {
    const gridX = Math.max(0, Math.min(columns, (x - left) / dx));
    const gridZ = Math.max(0, Math.min(rows, (z - front) / dz));
    const col = Math.min(columns - 1, Math.floor(gridX));
    const row = Math.min(rows - 1, Math.floor(gridZ));
    const fx = gridX - col;
    const fz = gridZ - row;
    const i = row * stride + col;
    const a = heights[i];
    const b = heights[i + 1];
    const c = heights[i + stride];
    const d = heights[i + stride + 1];
    return fx + fz <= 1 ? a + fx * (b - a) + fz * (c - a) :
      d + (1 - fx) * (c - d) + (1 - fz) * (b - d);
  }

  return { columns, rows, stride, left, front, dx, dz, heights, getTerrainHeight };
}

export function drawTerrain(THREE, scene, terrain) {
  const { columns, rows, stride, left, front, dx, dz, heights } = terrain;
  const positions = [];
  const colors = [];
  const indices = [];
  const low = new THREE.Color(0x77984f);
  const high = new THREE.Color(0x9fba6a);
  const bank = new THREE.Color(0xb4a271);
  const pondBed = new THREE.Color(0x6f9b84);
  const color = new THREE.Color();

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const x = left + col * dx;
      const z = front + row * dz;
      const y = heights[row * stride + col];
      positions.push(x, y, z);
      const shade = 0.29 + 0.12 * Math.sin(x * 0.37 + z * 0.29) + 0.13 * Math.max(0, y);
      color.copy(low).lerp(high, Math.min(1, shade));
      if (y < -0.025) color.lerp(bank, Math.min(1, -y * 4));
      if (y < POND.waterY) color.lerp(pondBed, smooth((POND.waterY - y) / 0.24));
      colors.push(color.r, color.g, color.b);
      if (row === rows || col === columns) continue;
      const i = row * stride + col;
      indices.push(i, i + stride, i + 1, i + 1, i + stride, i + stride + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);
}

export function addHillPath(THREE, { scene, getTerrainHeight, instances, matte }) {
  const points = [[10, 6.2], [12.0, 5.45], [14.1, 5.8], [15.9, 6.8], [16.9, 8.9], [17.15, 11.15], [16.6, 13.7]];
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const positions = [];
  const indices = [];
  const tufts = [];
  const segments = 52;
  // Sample across the full path so wide triangles cannot cut through the hill.
  const strips = 4;
  const stride = strips + 1;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const width = 0.57 + 0.16 * Math.sin(Math.PI * t);
    for (let j = 0; j <= strips; j++) {
      const side = 2 * j / strips - 1;
      const x = point.x + side * tangent.z * width;
      const z = point.z - side * tangent.x * width;
      positions.push(x, getTerrainHeight(x, z) + 0.038, z);
      if ((j === 0 || j === strips) && i >= 4 && i % 3 === 1) {
        const offset = side * (0.42 + 1.03 * (0.5 + 0.5 * Math.sin(i * 1.7 + side)));
        const grassX = x + offset * tangent.z;
        const grassZ = z - offset * tangent.x;
        const scale = 0.66 + (i % 5) * 0.13;
        tufts.push([grassX, getTerrainHeight(grassX, grassZ), grassZ, scale, scale, scale, i * 1.6]);
      }
    }
    if (i === segments) continue;
    for (let j = 0; j < strips; j++) {
      const a = i * stride + j;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const path = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xe6c78c, side: THREE.DoubleSide }));
  path.receiveShadow = true;
  scene.add(path);

  const blades = new THREE.BufferGeometry();
  blades.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.09, -0.05, 0, -0.02, -0.05, 0, -0.14, 0.19, 0.025,
    -0.035, -0.05, 0, 0.045, -0.05, 0, 0.03, 0.29, -0.038,
    0.02, -0.05, 0.015, 0.095, -0.05, 0.015, 0.17, 0.16, 0.10,
  ], 3));
  blades.computeVertexNormals();
  const grass = matte(0x668a43);
  grass.side = THREE.DoubleSide;
  instances(blades, grass, tufts);
}
