import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addGallerySign, spaceTransform } from './parts.js';

export const WALKWAY_HEIGHT = 15.6;
const halfSpan = 1.55;
const socketDepth = 3.05;
const railHeight = 1.12;
const stepsPerFlight = 42;
const flightLength = 13.3;
const flightRise = WALKWAY_HEIGHT / 2;
const landingDepth = 3.25;
const surfaceTolerance = .21;

const ring = [[-16, 33], [-27, 24], [-30, 7], [-29, -18], [-17, -27], [3, -29], [14.5, -30],
  [25, -24], [34, -11], [33, 10], [26, 25], [11, 32], [-4, 32]];

export const walkwayStairs = [
  { entry: [-16, 33], x: -16, z: 40, lowerX: -21.15, exit: 'Grand Lobby',
    floorApproach: [[-4, 41], [-12, 39.3], [-19.5, 38], [-21.15, 39.6]] },
  { entry: [14.5, -30], x: 14.5, z: -26.2, lowerX: 19.65, exit: 'Royal Wing',
    floorApproach: [[25, -24], [23.9, -26.55], [21.75, -28.2], [19.65, -26.6]] },
];

function corners(x, z, half, depth = 0) {
  return [[x - half, z + depth], [x + half, z + depth]];
}

function bounds(points) {
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  return {
    left: Math.min(...xs), right: Math.max(...xs),
    front: Math.min(...zs), back: Math.max(...zs),
  };
}

function onDeck(points, height) {
  const sides = points.map(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    // Every deck polygon winds counterclockwise in XZ.
    return { ax, az, dx: bx - ax, dz: bz - az };
  });
  return { ...bounds(points), height, sides };
}

function spanBetween(a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const ux = dx / length, uz = dz / length;
  function section(point, distance, width = halfSpan) {
    const x = point[0] + ux * distance, z = point[1] + uz * distance;
    return [[x - uz * width, z + ux * width], [x + uz * width, z - ux * width]];
  }
  return { section, length };
}

export function buildWalkway({ THREE, document, parent, parts, exhibits, ceiling }) {
  const walkway = addGroup(THREE, parent, 'Princess Gallery Glass Walkway');
  const components = new THREE.Group();
  const { part, beam, batch, matte } = parts;
  const bronze = matte(0xb98c53);
  const navy = matte(0x465475);
  const stone = matte(0xc3acc0);
  const crystal = matte(0xcffff6, { emissive: 0x6db6c7, emissiveIntensity: .38 });
  const glass = matte(0xa7e9ec, {
    transparent: true, opacity: .39, depthWrite: false, side: THREE.DoubleSide,
  });
  const railGlass = matte(0xb9edf0, {
    transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide,
  });
  const decks = [], rails = [];
  const glassFaces = [], glassRails = [];
  const lift = ([x, z], y) => [x, y, z];
  const high = () => WALKWAY_HEIGHT;

  function surface(points, height) {
    decks.push(onDeck(points, height));
  }

  function face(target, points) {
    for (let i = 1; i + 1 < points.length; i++) target.push(...points[0], ...points[i], ...points[i + 1]);
  }

  function addGeometry(name, positions, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const model = new THREE.Mesh(geometry, material);
    model.name = name;
    model.layers.set(PLAYER_ONLY_LAYER);
    walkway.add(model);
  }

  function post([x, z], y, cap = false) {
    part(components, 'drum', bronze, x, y + railHeight / 2, z, .075, railHeight, .075);
    if (cap) part(components, 'gem', crystal, x, y + railHeight, z, .125, .19, .125);
  }

  function guard(a, b, ay, by = ay, paneWidth = 2.15) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    rails.push({ ...bounds([a, b]), a, dx, dz, dy: by - ay, ay, length2: length ** 2 });
    const count = Math.ceil(length / paneWidth);
    const sample = t => [a[0] + dx * t, a[1] + dz * t];
    for (let i = 0; i < count; i++) {
      const p = sample(i / count), q = sample((i + 1) / count);
      const low = THREE.MathUtils.lerp(ay, by, i / count);
      const high = THREE.MathUtils.lerp(ay, by, (i + 1) / count);
      const glassA = sample((i + .04) / count), glassB = sample((i + .96) / count);
      beam(components, bronze, lift(p, low + railHeight), lift(q, high + railHeight), .078, .11);
      beam(components, navy, lift(p, low + .11), lift(q, high + .11), .076, .13);
      face(glassRails, [lift(glassA, low + .23), lift(glassB, high + .23),
        lift(glassB, high + railHeight - .065), lift(glassA, low + railHeight - .065)]);
      if (i > 0) post(p, low);
    }
  }

  function trim(a, b, y = WALKWAY_HEIGHT) {
    beam(components, navy, lift(a, y - .105), lift(b, y - .105), .218, .24);
    beam(components, bronze, lift(a, y + SURFACE_GAP.detail), lift(b, y + SURFACE_GAP.detail), .055, .18);
  }

  function glassFloor(points) {
    surface(points, high);
    face(glassFaces, points.toReversed().map(point => lift(point, WALKWAY_HEIGHT)));
  }

  function hang([x, z]) {
    const y = WALKWAY_HEIGHT;
    beam(components, bronze, [x, y + railHeight, z], [x, ceiling - .09, z], .065);
    part(components, 'drum', navy, x, ceiling - .15, z, .29, .25, .29);
    part(components, 'gem', crystal, x, y + 2.1, z, .13, .27, .13);
  }

  function glassSpan(a, b, offsetA, offsetB = 0, endWidth = halfSpan, closedEnd = false) {
    const { length, section } = spanBetween(a, b);
    const start = section(a, offsetA);
    const end = section(b, -offsetB, endWidth);
    const points = [start[0], start[1], end[1], end[0]];
    glassFloor(points);
    for (const i of [0, 1]) {
      trim(start[i], end[i]);
      guard(start[i], end[i], WALKWAY_HEIGHT);
    }
    if (closedEnd) {
      trim(...end);
      guard(...end, WALKWAY_HEIGHT, WALKWAY_HEIGHT, endWidth * 2 + .1);
      for (const point of end) post(point, WALKWAY_HEIGHT, true);
    }
    const usable = length - offsetA - offsetB;
    const panels = Math.ceil(usable / 3.3);
    for (let i = 1; i < panels; i++) {
      const t = i / panels;
      const cross = section(a, offsetA + usable * t, THREE.MathUtils.lerp(halfSpan, endWidth, t));
      beam(components, bronze, lift(cross[0], WALKWAY_HEIGHT - .047), lift(cross[1], WALKWAY_HEIGHT - .047), .09, .16);
      if (i === Math.floor(panels / 2) && !closedEnd) cross.forEach(hang);
    }
    return { start, end };
  }

  const connections = ring.map(() => []);
  for (const [index, point] of ring.entries()) {
    const next = (index + 1) % ring.length;
    const socket = glassSpan(point, ring[next], socketDepth, socketDepth);
    connections[index].push(socket.start);
    connections[next].push(socket.end);
  }
  function connect(start, end, widening, closedEnd) {
    const index = ring.findIndex(([x, z]) => x === start[0] && z === start[1]);
    const socket = glassSpan(ring[index], end, socketDepth, 0, widening, closedEnd);
    connections[index].push(socket.start);
  }

  for (const exhibit of exhibits) {
    const { toWorld, toLocal } = spaceTransform(exhibit);
    const front = exhibit.bounds.depth / 2;
    const [, approachZ] = toLocal(...exhibit.approach);
    const door = toWorld(0, front);
    // Follow the centre of the facade opening, even where the hall meets it at an angle.
    const distance = exhibit.id === 'rapunzel' ? 4.5 : 3.85;
    const lookout = door.map((value, axis) => value + (value - exhibit.approach[axis]) * distance / (approachZ - front));
    connect(exhibit.approach, lookout, 2.20, true);
    addGroup(THREE, walkway, exhibit.id + ' overlook', lookout[0], WALKWAY_HEIGHT, lookout[1]);
  }
  for (const staircase of walkwayStairs) connect(staircase.entry, [staircase.x, staircase.z], halfSpan, false);

  for (const [index, sockets] of connections.entries()) {
    const center = ring[index];
    const ordered = sockets.flat().sort(([ax, az], [bx, bz]) =>
      Math.atan2(az - center[1], ax - center[0]) - Math.atan2(bz - center[1], bx - center[0]));
    glassFloor(ordered);
    for (const [i, a] of ordered.entries()) {
      const b = ordered[(i + 1) % ordered.length];
      post(a, WALKWAY_HEIGHT, true);
      if (sockets.some(socket => socket.includes(a) && socket.includes(b))) continue;
      trim(a, b);
      guard(a, b, WALKWAY_HEIGHT);
    }
  }

  function buildStaircase({ x, z, lowerX, exit }) {
    const far = z + flightLength;
    const upper = x;
    const [left, right] = [Math.min(lowerX, upper) - halfSpan, Math.max(lowerX, upper) + halfSpan];
    const turning = [[left, far], [right, far], [right, far + landingDepth], [left, far + landingDepth]];
    surface(turning, () => flightRise);
    part(components, 'box', stone, (left + right) / 2, flightRise - .22, far + landingDepth / 2,
      right - left, .44, landingDepth);
    part(components, 'box', navy, (left + right) / 2, flightRise - .465, far + landingDepth / 2,
      right - left - .13, .13, landingDepth - .13);

    for (const [a, b] of [
      [turning[0], turning[3]], [turning[3], turning[2]], [turning[2], turning[1]],
      [[Math.min(lowerX, upper) + halfSpan, far], [Math.max(lowerX, upper) - halfSpan, far]],
    ]) {
      guard(a, b, flightRise);
      trim(a, b, flightRise);
    }
    for (const point of turning) post(point, flightRise, true);

    for (const [center, base, reverse] of [[lowerX, 0, false], [upper, flightRise, true]]) {
      const height = (_x, zAt) => {
        const t = THREE.MathUtils.clamp((zAt - z) / flightLength, 0, 1);
        return base + flightRise * (reverse ? 1 - t : t);
      };
      surface([...corners(center, z, halfSpan), ...corners(center, far, halfSpan).reverse()], height);
      const run = flightLength / stepsPerFlight;
      const rise = flightRise / stepsPerFlight;
      // Keep tread height within half a riser of the continuous walking surface.
      for (let i = 0; i < stepsPerFlight; i++) {
        const top = base + (i + .5) * rise;
        const treadZ = reverse ? far - (i + .5) * run : z + (i + .5) * run;
        part(components, 'box', i % 2 ? stone : navy, center, top - .23, treadZ, halfSpan * 2, .46, run);
        const nosing = treadZ + (reverse ? run : -run) / 2;
        part(components, 'box', bronze, center, top - .055, nosing, halfSpan * 2, .067, .044);
      }
      for (const side of [-1, 1]) {
        const edge = center + side * halfSpan;
        const a = [edge, z], b = [edge, far];
        guard(a, b, height(...a), height(...b));
        post(a, height(...a), true);
        if (edge !== left && edge !== right) post(b, flightRise);
        beam(components, navy, lift(a, height(...a) - .36), lift(b, height(...b) - .36), .18, .25);
      }
    }

    // Suspended supports leave the ground promenade open beneath the high flight.
    for (const edge of [left, right]) for (const supportZ of [far + .08, far + landingDepth - .15]) {
      beam(components, bronze, [edge, flightRise + railHeight, supportZ], [edge, ceiling - .08, supportZ], .10);
    }
    const arrow = addGroup(THREE, walkway, exit + ' glass staircase', lowerX, 0, z - .25, Math.PI);
    part(arrow, 'box', bronze, 0, 2.73, 0, 3.2, .82, .23).layers.set(PLAYER_ONLY_LAYER);
    const sign = addGallerySign(THREE, document, arrow, ['Glass Walkway ↑'], 0, 2.73, .115 + SURFACE_GAP.detail, 3.03, .66);
    if (sign) sign.layers.set(PLAYER_ONLY_LAYER);
    for (const i of [-1, 1]) {
      part(arrow, 'drum', navy, i * halfSpan, 1.48, 0, .086, 2.96, .086).layers.set(PLAYER_ONLY_LAYER);
    }
  }

  for (const staircase of walkwayStairs) buildStaircase(staircase);
  components.traverse(object => { if (object.isMesh) object.layers.set(PLAYER_ONLY_LAYER); });
  batch(components, walkway);
  addGeometry('Suspended glass bridge floor', glassFaces, glass);
  addGeometry('Glass guard panels', glassRails, railGlass);

  function covers(deck, x, z) {
    const epsilon = 1e-6;
    return x >= deck.left - epsilon && x <= deck.right + epsilon &&
      z >= deck.front - epsilon && z <= deck.back + epsilon &&
      deck.sides.every(({ ax, az, dx, dz }) => dx * (z - az) - dz * (x - ax) >= -epsilon);
  }

  return {
    getGroundHeight(x, z, feet = 0) {
      // Multiple decks can share the same XZ site. Use the highest one within reach of the feet.
      let ground;
      for (const deck of decks) {
        if (!covers(deck, x, z)) continue;
        const y = deck.height(x, z);
        if (feet >= y - surfaceTolerance && (ground === undefined || y > ground)) ground = y;
      }
      return ground;
    },
    blocksGround(x, z, radius, feet) {
      const clearance = radius + .06;
      for (const rail of rails) {
        if (x <= rail.left - clearance || x >= rail.right + clearance ||
            z <= rail.front - clearance || z >= rail.back + clearance) continue;
        const dx = x - rail.a[0], dz = z - rail.a[1];
        const t = THREE.MathUtils.clamp((dx * rail.dx + dz * rail.dz) / rail.length2, 0, 1);
        const y = rail.ay + rail.dy * t;
        if (feet >= y - surfaceTolerance && feet < y + 1.51 &&
            (dx - rail.dx * t) ** 2 + (dz - rail.dz * t) ** 2 < clearance ** 2) return true;
      }
      // Head clearance under the stair stringers, with room to step onto the foot of each flight.
      return decks.some(deck => {
        if (!covers(deck, x, z)) return false;
        const y = deck.height(x, z);
        return feet < y - surfaceTolerance && feet + 2.27 > y;
      });
    },
  };
}
