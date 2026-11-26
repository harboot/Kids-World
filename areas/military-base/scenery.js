import { addGroup, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';

export const ink = {
  concrete: 0xc8bda4, pale: 0xebe1ca, footing: 0x788b86,
  asphalt: 0x5e707c, seam: 0x77888d, white: 0xf7eedc, yellow: 0xffcb4a,
  dark: 0x263f50, steel: 0x526e7c, teal: 0x309085, paleTeal: 0xa0d0b9,
  olive: 0x73ad5f, moss: 0x407f57, roof: 0x3e755f, sand: 0xc8a974,
  glass: 0x2a586a, glassLight: 0x7cbbc7, rubber: 0x283442, red: 0xd56d55,
};

function profile(THREE, coordinates) {
  const shape = new THREE.Shape(coordinates.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}

export function createScenery(THREE, scene, document, playerRadius = PLAYER_RADIUS) {
  const geometry = new Map();
  const batches = new Map();
  const labels = [];
  const obstacles = [];
  const transform = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const vertical = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const staticMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
  const unlitMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  let shadowInk;
  const factories = {
    box: () => new THREE.BoxGeometry(),
    drum: () => new THREE.CylinderGeometry(1, 1, 1, 10),
    post: () => new THREE.CylinderGeometry(0.78, 1, 1, 7),
    cone: () => new THREE.ConeGeometry(1, 1, 7),
    disk: () => new THREE.CircleGeometry(1, 40),
    octagon: () => new THREE.CylinderGeometry(1, 1, 1, 8),
    podium: () => new THREE.CylinderGeometry(.80, 1, 1, 8),
    dome: () => new THREE.SphereGeometry(1, 12, 6, 0, 2 * Math.PI, 0, Math.PI / 2),
    gable: () => profile(THREE, [[-.5, 0], [.5, 0], [0, 1]]),
    shadow: () => new THREE.PlaneGeometry(),
    rotorRing: () => new THREE.TorusGeometry(1, .18, 5, 14).rotateX(-Math.PI / 2),
    cap: () => new THREE.SphereGeometry(1, 10, 5),
    rock: () => new THREE.IcosahedronGeometry(1, 0),
    track: () => profile(THREE, [[-.38, -.5], [.38, -.5], [.5, -.16], [.5, .27], [.36, .5], [-.34, .5], [-.5, .24], [-.5, -.24]]),
    crown: () => profile(THREE, [[-.5, 0], [.5, 0], [.34, 1], [-.34, 1]]),
    arch: () => profile(THREE, Array.from({ length: 13 }, (_, i) => {
      const angle = Math.PI * i / 12;
      return [-0.5 * Math.cos(angle), Math.sin(angle)];
    })),
    tip: () => profile(THREE, [[-.5, -.5], [.5, -.5], [0, .5]]),
  };

  function group(name, x, y, z, yaw = 0, parent = scene) {
    return addGroup(THREE, parent, name, x, y, z, yaw);
  }

  function shape(name) {
    if (!geometry.has(name)) geometry.set(name, factories[name]());
    return geometry.get(name);
  }

  function part(node, kind, tint, x, y, z, width, height, depth, rotation = [], unlit = false) {
    transform.position.set(x, y, z);
    transform.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
    transform.scale.set(width, height, depth);
    transform.updateMatrix();
    node.updateWorldMatrix(true, false);
    const world = new THREE.Matrix4().multiplyMatrices(node.matrixWorld, transform.matrix);
    const sector = kind === 'shadow' ? '' : [world.elements[12] < 0, world.elements[14] < 0].join(',');
    const key = [kind, unlit, sector].join(':');
    if (!batches.has(key)) batches.set(key, { kind, unlit, entries: [] });
    batches.get(key).entries.push({ tint, world });
  }

  function box(node, tint, x, y, z, w, h, d, rotation, unlit) {
    part(node, 'box', tint, x, y, z, w, h, d, rotation, unlit);
  }

  function beam(node, tint, a, b, width, depth = width, kind = 'box', draw = part) {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    transform.quaternion.setFromUnitVectors(vertical, direction.normalize());
    const { x, y, z } = transform.rotation;
    draw(node, kind, tint, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
      width, length, depth, [x, y, z]);
  }

  function solid(node, x, z, width, depth, top) {
    node.updateWorldMatrix(true, false);
    const center = new THREE.Vector3(x, 0, z).applyMatrix4(node.matrixWorld);
    const angle = Math.atan2(node.matrixWorld.elements[8], node.matrixWorld.elements[0]);
    const height = center.y + top;
    const footprint = { x: center.x, z: center.z, width, depth, yaw: angle };
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    if (Math.abs(sine * cosine) < 1e-6) {
      const quarterTurn = Math.abs(sine) > 0.5;
      obstacles.push({ ...rectangleBounds(center.x, center.z, quarterTurn ? depth : width, quarterTurn ? width : depth), height, footprint });
      return;
    }
    obstacles.push({
      ...rectangleBounds(center.x, center.z, Math.abs(cosine) * width + Math.abs(sine) * depth,
        Math.abs(sine) * width + Math.abs(cosine) * depth),
      height, footprint,
      touches(px, pz) {
        const dx = px - center.x;
        const dz = pz - center.z;
        const u = Math.max(0, Math.abs(dx * cosine - dz * sine) - width / 2);
        const v = Math.max(0, Math.abs(dx * sine + dz * cosine) - depth / 2);
        return u * u + v * v < playerRadius * playerRadius;
      },
    });
  }

  function movingSolid(node, x, z, width, depth, top) {
    const center = new THREE.Vector3();
    let cosine, sine;
    const obstacle = {
      height: -Infinity,
      footprint: { x: 0, z: 0, width, depth, yaw: 0 },
      touches(px, pz) {
        const dx = px - center.x;
        const dz = pz - center.z;
        const u = Math.max(0, Math.abs(dx * cosine - dz * sine) - width / 2);
        const v = Math.max(0, Math.abs(dx * sine + dz * cosine) - depth / 2);
        return u * u + v * v < playerRadius * playerRadius;
      },
    };
    obstacles.push(obstacle);
    const sync = (active = true) => {
      if (!active) {
        obstacle.height = -Infinity;
        return;
      }
      node.updateWorldMatrix(true, false);
      center.set(x, 0, z).applyMatrix4(node.matrixWorld);
      const angle = Math.atan2(node.matrixWorld.elements[8], node.matrixWorld.elements[0]);
      cosine = Math.cos(angle);
      sine = Math.sin(angle);
      obstacle.height = center.y + top;
      Object.assign(obstacle.footprint, { x: center.x, z: center.z, yaw: angle });
    };
    sync();
    sync.obstacle = obstacle;
    return sync;
  }

  function sign(node, text, x, y, z, width, height, { yaw = 0, style = 'green', sub = '', bothSides = false } = {}) {
    const board = group(text, x, y, z, yaw, node);
    box(board, style === 'gold' ? ink.dark : ink.roof, 0, 0, 0, width + .14, height + .12, .13);
    if (!document) return;
    for (const side of bothSides ? [1, -1] : [1]) labels.push({ board, text, width, height, side, style, sub });
  }

  function buildLabels() {
    if (!labels.length) return;
    const names = new Map();
    for (const label of labels) {
      const key = JSON.stringify([label.text, label.style, label.sub]);
      if (!names.has(key)) names.set(key, names.size);
      label.index = names.get(key);
    }
    const columns = 4;
    const rows = Math.ceil(names.size / columns);
    const cellWidth = 256;
    const cellHeight = 80;
    const map = paintCanvasTexture(THREE, document, columns * cellWidth, rows * cellHeight, ctx => {
      const drawn = new Set();
      for (const { text, style, sub, index } of labels) {
        if (drawn.has(index)) continue;
        drawn.add(index);
        const x = index % columns * cellWidth;
        const y = Math.floor(index / columns) * cellHeight;
        const gold = style === 'gold';
        ctx.fillStyle = gold ? '#eac473' : style === 'medical' ? '#e6e8d6' : '#304e47';
        ctx.fillRect(x, y, cellWidth, cellHeight);
        ctx.strokeStyle = gold ? '#3c4b38' : style === 'medical' ? '#946157' : '#adb487';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, cellWidth - 12, cellHeight - 12);
        ctx.fillStyle = gold ? '#253a37' : style === 'medical' ? '#923e35' : '#f4ecd4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 34px system-ui, sans-serif';
        ctx.fillText(text, x + 128, y + (sub ? 31 : 42), 231);
        if (sub) {
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText(sub, x + 128, y + 59, 220);
        }
      }
    });
    if (!map) return;
    const positions = [];
    const uv = [];
    const indices = [];
    const point = new THREE.Vector3();
    for (const { board, width, height, side, index } of labels) {
      board.updateWorldMatrix(true, false);
      const base = positions.length / 3;
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        point.set(side * (u - .5) * width, (v - .5) * height, side * (.065 + SURFACE_GAP.detail)).applyMatrix4(board.matrixWorld);
        positions.push(point.x, point.y, point.z);
        uv.push((index % columns * cellWidth + 2 + u * (cellWidth - 4)) / (columns * cellWidth),
          1 - (Math.floor(index / columns) * cellHeight + 2 + (1 - v) * (cellHeight - 4)) / (rows * cellHeight));
      }
      indices.push(base, base + 1, base + 2, base + 3, base, base + 2);
    }
    const surface = new THREE.BufferGeometry();
    surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    surface.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    surface.setIndex(indices);
    const mesh = new THREE.Mesh(surface, new THREE.MeshBasicMaterial({ map, toneMapped: false }));
    mesh.name = 'Military Base signs';
    scene.add(mesh);
  }

  function groundShadow(node, x, z, width, depth, y = .045, yaw = 0) {
    part(node, 'shadow', 0x344f61, x, y, z, width, depth, 1, [-Math.PI / 2, 0, yaw]);
  }

  function shadowMaterial() {
    const size = 32;
    const pixels = new Uint8Array(size * size * 4);
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const u = Math.abs((column + .5) / size * 2 - 1);
        const v = Math.abs((row + .5) / size * 2 - 1);
        const distance = Math.min(1, (u ** 4 + v ** 4) ** .25);
        const fade = THREE.MathUtils.smoothstep(distance, .52, .99);
        const index = (row * size + column) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
        pixels[index + 3] = Math.round(77 * (1 - fade));
      }
    }
    const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    map.minFilter = map.magFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  }

  function finish() {
    for (const { kind, unlit, entries } of batches.values()) {
      const material = kind === 'shadow' ? (shadowInk ??= shadowMaterial()) : unlit ? unlitMaterial : staticMaterial;
      const mesh = new THREE.InstancedMesh(shape(kind), material, entries.length);
      mesh.name = 'Military Base ' + kind + ' scenery';
      entries.forEach(({ tint, world }, index) => {
        mesh.setMatrixAt(index, world);
        mesh.setColorAt(index, color.setHex(tint));
      });
      mesh.computeBoundingSphere();
      mesh.castShadow = !unlit && kind !== 'shadow' && kind !== 'disk';
      // Decorative shadows have no coordinate surface in Drone View.
      if (kind === 'shadow') mesh.raycast = () => {};
      scene.add(mesh);
    }
    batches.clear();
    buildLabels();
  }

  function movingParts() {
    const parts = new Map();
    function add(node, kind, tint, x, y, z, w, h, d, rotation = []) {
      if (!parts.has(kind)) parts.set(kind, { entries: [] });
      const local = new THREE.Object3D();
      local.position.set(x, y, z);
      local.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
      local.scale.set(w, h, d);
      local.updateMatrix();
      parts.get(kind).entries.push({ node, local: local.matrix, tint });
    }
    function update() {
      scene.updateMatrixWorld();
      for (const { mesh, entries } of parts.values()) {
        entries.forEach(({ node, local }, index) => {
          mesh.setMatrixAt(index, matrix.multiplyMatrices(node.matrixWorld, local));
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    function build() {
      for (const [kind, partsOfKind] of parts) {
        const { entries } = partsOfKind;
        const material = kind === 'shadow' ? (shadowInk ??= shadowMaterial()) : staticMaterial;
        const mesh = new THREE.InstancedMesh(shape(kind), material, entries.length);
        mesh.name = 'Military Base animated ' + kind;
        if (kind === 'shadow') mesh.raycast = () => {};
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 130);
        entries.forEach(({ tint }, index) => mesh.setColorAt(index, color.setHex(tint)));
        partsOfKind.mesh = mesh;
        scene.add(mesh);
      }
      update();
    }
    return {
      add, build, update,
      part: add,
      groundShadow(node, x, z, width, depth, y = .048) {
        add(node, 'shadow', 0x344f61, x, y, z, width, depth, 1, [-Math.PI / 2, 0, 0]);
      },
      box(node, tint, x, y, z, width, height, depth, rotation) {
        add(node, 'box', tint, x, y, z, width, height, depth, rotation);
      },
      beam(node, tint, a, b, width, depth, kind) {
        beam(node, tint, a, b, width, depth, kind, add);
      },
    };
  }

  return { THREE, scene, group, part, box, beam, solid, movingSolid, sign, obstacles, finish, groundShadow, movingParts };
}
