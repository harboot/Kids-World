import { SURFACE_GAP } from '../../core/geometry.js';

// Shared unit meshes keep the village's static architecture and props in a few instance batches.
export function createScenery(THREE, scene, document, obstacles) {
  const gable = new THREE.Shape();
  gable.moveTo(-0.5, 0);
  gable.lineTo(0.5, 0);
  gable.lineTo(0, 1);
  gable.closePath();

  const banner = new THREE.Shape();
  banner.moveTo(-0.5, 0.5);
  banner.lineTo(-0.5, -0.5);
  banner.lineTo(0, -0.32);
  banner.lineTo(0.5, -0.5);
  banner.lineTo(0.5, 0.5);
  banner.closePath();

  const factories = {
    box: () => new THREE.BoxGeometry(1, 1, 1),
    drum: () => new THREE.CylinderGeometry(1, 1, 1, 16),
    bowl: () => new THREE.CylinderGeometry(1, 0.58, 1, 14),
    barrel: () => new THREE.CylinderGeometry(0.88, 1, 1, 10),
    cone: () => new THREE.ConeGeometry(1, 1, 8),
    disk: () => new THREE.CircleGeometry(1, 24),
    rock: () => new THREE.IcosahedronGeometry(1, 0),
    cloud: () => new THREE.SphereGeometry(1, 12, 8),
    gem: () => new THREE.OctahedronGeometry(1),
    gable: () => new THREE.ExtrudeGeometry(gable, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5),
    banner: () => new THREE.ShapeGeometry(banner),
    ring: () => new THREE.TorusGeometry(1, 0.08, 5, 22),
  };
  const geometry = new Map();
  const batches = new Map();
  const transform = new THREE.Object3D();
  const tip = new THREE.Vector3();
  const vertical = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();

  function group(name, x, y, z, yaw = 0, parent = scene) {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(x, y, z);
    node.rotation.y = yaw;
    parent.add(node);
    return node;
  }

  function part(node, shape, ink, x, y, z, width, height, depth, options = {}) {
    const { rotation = [], shadow = false, batch = scene } = options;
    const key = shape + (shadow ? ':shadow' : '');
    if (!batches.has(batch)) batches.set(batch, new Map());
    const parts = batches.get(batch);
    if (!parts.has(key)) parts.set(key, { shape, shadow, entries: [] });
    transform.position.set(x, y, z);
    transform.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
    transform.scale.set(width, height, depth);
    transform.updateMatrix();
    node.updateWorldMatrix(true, false);
    const matrix = new THREE.Matrix4().multiplyMatrices(node.matrixWorld, transform.matrix);
    if (batch !== scene) matrix.premultiply(new THREE.Matrix4().copy(batch.matrixWorld).invert());
    parts.get(key).entries.push({ ink, matrix });
  }

  function box(node, ink, x, y, z, width, height, depth, options) {
    part(node, 'box', ink, x, y, z, width, height, depth, options);
  }

  function beam(node, ink, a, b, width, depth = width, options) {
    tip.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = tip.length();
    transform.quaternion.setFromUnitVectors(vertical, tip.normalize());
    const { x, y, z } = transform.rotation;
    box(node, ink, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
      width, length, depth, { ...options, rotation: [x, y, z] });
  }

  function solid(node, width, depth, height, x = 0, z = 0) {
    // Houses and fortifications use quarter turns, so their footprints are axis-aligned.
    const turn = Math.round(node.rotation.y / (Math.PI / 2));
    const cx = node.position.x + x * Math.cos(node.rotation.y) + z * Math.sin(node.rotation.y);
    const cz = node.position.z - x * Math.sin(node.rotation.y) + z * Math.cos(node.rotation.y);
    const [dx, dz] = turn % 2 ? [depth / 2, width / 2] : [width / 2, depth / 2];
    obstacles.push({ left: cx - dx, right: cx + dx, front: cz - dz, back: cz + dz, height: node.position.y + height });
  }

  function paintedTexture(width, height, paint) {
    const canvas = document?.createElement('canvas');
    if (!canvas?.getContext) return null;
    canvas.width = width;
    canvas.height = height;
    const ink = canvas.getContext('2d');
    if (!ink) return null;
    paint(ink);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function sign(node, text, x, y, z, width, height, { background = '#263f3d', yaw = 0, bothSides = false } = {}) {
    const board = group(text + ' sign', x, y, z, yaw, node);
    const boardDepth = 0.13;
    box(board, 0x57382a, 0, 0, 0, width + 0.10, height + 0.1, boardDepth);
    const map = paintedTexture(512, 112, ink => {
      ink.fillStyle = background;
      ink.fillRect(0, 0, 512, 112);
      ink.strokeStyle = '#d8b578';
      ink.lineWidth = 4;
      ink.strokeRect(7, 7, 498, 98);
      ink.fillStyle = '#fff0ca';
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.font = 'bold 57px Georgia, serif';
      ink.fillText(text, 256, 57, 456);
    });
    if (map) {
      const offset = boardDepth / 2 + SURFACE_GAP.detail;
      const positions = [];
      const uvs = [];
      const indices = [];
      // Reverse the back quad's winding and horizontal axis so the text reads
      // correctly from either side. Keep both faces in the same draw call.
      for (const side of bothSides ? [1, -1] : [1]) {
        const base = positions.length / 3;
        for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
          positions.push(side * (u - 0.5) * width, (v - 0.5) * height, side * offset);
          uvs.push(u, v);
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      const label = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map }));
      board.add(label);
    }
  }

  function finish() {
    const matte = new THREE.MeshLambertMaterial();
    const materials = {
      banner: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
      cloud: new THREE.MeshBasicMaterial({ toneMapped: false }),
    };
    for (const [parent, parts] of batches) {
      for (const { shape, shadow, entries } of parts.values()) {
        if (!geometry.has(shape)) geometry.set(shape, factories[shape]());
        const material = materials[shape] ?? matte;
        const mesh = new THREE.InstancedMesh(geometry.get(shape), material, entries.length);
        mesh.name = 'Village ' + shape + ' instances';
        mesh.castShadow = shadow;
        mesh.receiveShadow = true;
        entries.forEach(({ ink, matrix }, i) => {
          mesh.setMatrixAt(i, matrix);
          mesh.setColorAt(i, color.setHex(ink));
        });
        parent.add(mesh);
      }
    }
    batches.clear();
  }

  return { group, part, box, beam, solid, sign, paintedTexture, finish };
}

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
