import { SURFACE_GAP, paintCanvasTexture } from '../../core/geometry.js';
import { hitsBody, localPoint } from './ride.js';

export function detailKit(THREE, parent, cave = false) {
  const material = cave
    ? new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    : new THREE.MeshLambertMaterial({ flatShading: true });
  material.name = cave ? 'Mine detail palette' : 'Outdoor detail palette';
  const batches = new Map();
  const pose = new THREE.Object3D(), axis = new THREE.Vector3(0, 1, 0), vector = new THREE.Vector3();
  const shapes = {
    box: () => new THREE.BoxGeometry(1, 1, 1),
    cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 9),
    taper: () => new THREE.CylinderGeometry(0.26, 0.5, 1, 8),
    stone: () => new THREE.IcosahedronGeometry(0.5, 0),
    body: () => new THREE.IcosahedronGeometry(0.5, 1),
    ring: () => new THREE.TorusGeometry(0.39, 0.105, 5, 12),
  };

  function store(shape, color) {
    if (!batches.has(shape)) batches.set(shape, []);
    pose.updateMatrix();
    batches.get(shape).push({ matrix: pose.matrix.clone(), color: new THREE.Color(color) });
  }
  function part(shape, color, x, y, z, width, height, depth, yaw = 0, pitch = 0, roll = 0) {
    pose.position.set(x, y, z);
    pose.rotation.set(pitch, yaw, roll);
    pose.scale.set(width, height, depth);
    store(shape, color);
  }
  function beam(color, a, b, width, depth = width, shape = 'box') {
    pose.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    vector.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    pose.scale.set(width, vector.length(), depth);
    pose.quaternion.setFromUnitVectors(axis, vector.normalize());
    store(shape, color);
  }

  return {
    part, beam,
    box: (...args) => part('box', ...args),
    finish(merge = false) {
      if (merge) {
        const positions = [], colors = [];
        for (const [shape, entries] of batches) {
          const source = shapes[shape]();
          const points = source.getAttribute('position');
          const count = source.index?.count ?? points.count;
          for (const { matrix, color } of entries) {
            for (let i = 0; i < count; i++) {
              vector.fromBufferAttribute(points, source.index ? source.index.getX(i) : i).applyMatrix4(matrix);
              positions.push(vector.x, vector.y, vector.z);
              colors.push(color.r, color.g, color.b);
            }
          }
          source.dispose();
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        material.vertexColors = true;
        parent.add(new THREE.Mesh(geometry, material));
        return;
      }
      for (const [shape, entries] of batches) {
        const mesh = new THREE.InstancedMesh(shapes[shape](), material, entries.length);
        for (const [i, entry] of entries.entries()) {
          mesh.setMatrixAt(i, entry.matrix);
          mesh.setColorAt(i, entry.color);
        }
        parent.add(mesh);
      }
    },
  };
}

export function detailRegion(THREE, scene, name, ground, { cave = false, document, collision = [], decks = [] } = {}) {
  const root = new THREE.Group();
  root.name = name;
  scene.add(root);
  const kit = detailKit(THREE, root, cave);
  const wood = cave ? 0x79573c : 0x936644;
  const dark = cave ? 0x4c3b33 : 0x5f4636;
  const steel = cave ? 0x59656a : 0x676e70;
  function group(name, x, z, yaw = 0, y = ground(x, z)) {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(x, y, z);
    node.rotation.y = yaw;
    root.add(node);
    return node;
  }
  function solid(x, y, z, width, length, height, yaw = 0) {
    collision.push({ x, y, z, width, length, height, yaw });
  }
  function bounds(node, x, y, z, width, length, height) {
    const point = localPoint(node.position.x, node.position.z, node.rotation.y, x, z);
    solid(point.x, node.position.y + y, point.z, width, length, height, node.rotation.y);
  }
  function label(node, text, width, height, x, y, z, color = '#f2dfae') {
    if (!document?.createElement) return;
    const plane = paintCanvasTexture(THREE, document, 384, 128, ctx => {
      ctx.clearRect(0, 0, 384, 128);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = color;
      const rows = text.split('\n');
      rows.forEach((row, i) => ctx.fillText(row, 192, 64 + (i - (rows.length - 1) / 2) * 48, 355));
    });
    if (!plane) return;
    const material = new THREE.MeshBasicMaterial({ map: plane, transparent: true, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(x, y, z + SURFACE_GAP.detail);
    node.add(mesh);
  }
  function sign(text, x, z, yaw = 0, width = 1.65, y = ground(x, z)) {
    const pole = group(text.replace('\n', ' '), x, z, yaw, y);
    const local = detailKit(THREE, pole, cave);
    local.box(dark, 0, 0.76, 0, 0.115, 1.6, 0.12);
    local.box(wood, 0, 1.43, 0.073, width, 0.44, 0.115);
    local.box(dark, 0, 1.66, 0.078, width + 0.05, 0.055, 0.12);
    label(pole, text, width * 0.96, 0.39, 0, 1.43, 0.132);
    local.finish();
    bounds(pole, 0, 0, 0, 0.13, 0.13, 1.65);
    return pole;
  }
  return { root, kit, cave, ground, wood, dark, steel, group, sign, label, solid, bounds, decks, finish: kit.finish };
}

export function detailsBlock(items, x, z, radius, feet) {
  return items.some(body => feet < body.y + body.height && feet + 1.8 > body.y + 0.03 && hitsBody(x, z, radius, body));
}
