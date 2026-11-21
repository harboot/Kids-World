import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';

export const BALLOON = { x: .04, z: 21.39, deck: .18, rise: 24 };
const halfWidth = 1.6;
const halfDepth = 1.25;
const boarding = { x: BALLOON.x, z: BALLOON.z - 2.28, yaw: Math.PI };

function envelopeGeometry(THREE) {
  const rings = [
    [0, .68], [.58, 1.04], [1.42, 1.83], [2.54, 2.68], [3.92, 3.43],
    [5.49, 3.67], [6.74, 3.43], [7.69, 2.69], [8.29, 1.65], [8.59, .55], [8.64, 0],
  ];
  const positions = [];
  const colors = [];
  const indices = [];
  const panels = 16;
  const subdivisions = 3;
  const stride = subdivisions + 1;
  const palette = [0xe78342, 0xf5c45c, 0xd66447, 0x639a96, 0xf0ac59, 0xf4d77f, 0xd66447, 0x71aaa2]
    .map(hex => new THREE.Color(hex));
  const tint = new THREE.Color();
  for (let panel = 0; panel < panels; panel++) {
    for (let r = 0; r < rings.length; r++) {
      for (let side = 0; side <= subdivisions; side++) {
        const angle = (panel + side / subdivisions) * Math.PI * 2 / panels;
        const [y, width] = rings[r];
        const radius = width * (1 - .024 * Math.cos(side * 2 * Math.PI / subdivisions));
        positions.push(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
        const shade = (side === 0 || side === subdivisions ? .83 : 1) * (r < 2 ? .78 + r * .1 : 1);
        tint.copy(palette[panel % palette.length]).multiplyScalar(shade);
        colors.push(tint.r, tint.g, tint.b);
        if (r === rings.length - 1 || side === subdivisions) continue;
        const a = panel * rings.length * stride + r * stride + side;
        indices.push(a, a + 1, a + stride);
        if (r < rings.length - 2) indices.push(a + 1, a + stride + 1, a + stride);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function addBalloon(THREE, { scene, mesh, box, facet, matte, batchParts, carryPlayer, reducedMotion, signal }) {
  const { x, z, deck, rise } = BALLOON;
  const root = addGroup(THREE, scene, 'Flower Garden hot air balloon', x, 0, z);
  const pad = addGroup(THREE, scene, 'Balloon landing circle', x, 0, z);
  const rope = matte(0x745444);
  const dark = matte(0x744627);
  const honey = matte(0xba864d);
  const tan = matte(0xe1ad68);
  const brass = matte(0xe1a853);
  const steel = matte(0x4f4840);
  const stone = matte(0xd4c195);
  const marker = matte(0xd28251);
  const sand = matte(0xbd9c6e);
  const round = new THREE.CylinderGeometry(1, 1, 1, 28);
  const thinRope = new THREE.CylinderGeometry(1, 1, 1, 6);
  const part = (parent, geometry, material, x, y, z, w, h, d) =>
    mesh(geometry, material, x, y, z, w, h, d, parent);
  const padTop = .044;
  part(pad, round, stone, 0, padTop - .024, 0, 2.95, .048, 2.95);
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI / 10;
    part(pad, box, i % 5 === 0 ? marker : honey, Math.sin(angle) * 2.65, padTop + .009,
      Math.cos(angle) * 2.65, .52, .018, i % 5 === 0 ? .17 : .075).rotation.y = angle;
  }
  batchParts(pad);
  part(root, box, dark, 0, deck - .065, 0, halfWidth * 2, .13, halfDepth * 2);
  for (let i = 0; i < 9; i++) {
    part(root, box, i % 3 === 0 ? honey : tan, (i - 4) * .344, deck - .015 + SURFACE_GAP.detail,
      0, .335, .03, 2.41);
  }
  const tie = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  function cable(from, to, radius) {
    tie.subVectors(to, from);
    const cord = part(root, thinRope, rope, (from.x + to.x) / 2, (from.y + to.y) / 2,
      (from.z + to.z) / 2, radius, tie.length(), radius);
    cord.quaternion.setFromUnitVectors(up, tie.normalize());
  }

  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      part(root, box, dark, side * 1.51, .535, end * 1.16, .155, .94, .155);
      part(root, box, brass, side * 1.51, 1.027, end * 1.16, .20, .074, .2);
      cable(new THREE.Vector3(side * 1.5, .96, end * 1.14), new THREE.Vector3(side * .47, 4.25, end * .47), .031);
    }
    part(root, box, dark, side * 1.53, .56, 0, .15, .76, 2.25);
    part(root, box, dark, 0, .56, side * 1.17, 2.88, .76, .15);
    part(root, box, tan, side * 1.53, .96, 0, .214, .10, 2.25);
    part(root, box, tan, 0, .96, side * 1.17, 2.88, .10, .2);
    for (let i = 0; i < 5; i++) {
      const py = .269 + i * .148;
      part(root, box, i % 2 ? honey : tan, side * 1.535, py, 0, .172, .111, 2.26);
      part(root, box, i % 2 ? honey : tan, 0, py, side * 1.18, 2.87, .111, .171);
    }
    for (let i = -5; i <= 5; i++) {
      part(root, box, honey, i * .248, .567, side * 1.263, .052, .715, .04);
    }
    for (let i = -4; i <= 4; i++) {
      part(root, box, honey, side * 1.626, .567, i * .237, .039, .715, .05);
    }
    const bag = part(root, facet, sand, side * 1.49, .51, -1.31, .27, .39, .16);
    bag.rotation.z = side * .22;
    part(root, thinRope, rope, side * 1.47, .80, -1.32, .072, .18, .057);
  }
  part(root, round, steel, 0, 3.57, 0, .32, .2, .32);
  part(root, round, brass, 0, 3.7, 0, .27, .19, .27);
  const flame = part(root, facet, new THREE.MeshBasicMaterial({ color: 0xffbe62 }), 0, 3.96, 0, .12, .29, .12);
  part(root, round, rope, 0, 4.3, 0, .69, .17, .69);
  batchParts(root);
  const envelope = part(root, envelopeGeometry(THREE), new THREE.MeshLambertMaterial({ vertexColors: true }),
    0, 4.33, 0, 1, 1, 1);
  envelope.name = 'Striped balloon envelope';

  function inside(px, pz, margin = 0) {
    return Math.abs(px - x) < halfWidth - .18 - margin && Math.abs(pz - z) < halfDepth - .17 - margin;
  }

  let offset = 0;
  let target = 0;
  let moving = false;
  let riderExit;
  const standingDeck = deck + SURFACE_GAP.detail;
  const active = () => !signal?.aborted;
  const ride = {
    get x() { return offset > 0 ? x : boarding.x; },
    get z() { return offset > 0 ? z : boarding.z; },
    get anchorY() { return offset > 0 ? offset + 1.32 : .64; },
    get label() { return offset > 0 ? 'Bring the balloon down' : 'Ride the hot air balloon'; },
    get active() { return active() && !moving; },
    radius: 1.73,
    reachable(position) {
      const feet = position.y - EYE_HEIGHT;
      return offset > 0 ? inside(position.x, position.z) && feet > offset + standingDeck - .1 :
        position.z < z - halfDepth && Math.abs(feet) < .6;
    },
    act({ relocate }) {
      if (!this.active) return;
      if (offset === 0) {
        relocate({ x, z, elevation: standingDeck, yaw: 0 });
        riderExit = relocate;
        target = rise;
      } else {
        target = 0;
      }
      moving = true;
    },
  };

  return {
    ride,
    blocks(x, z, radius, feet, from) {
      const distanceX = Math.abs(x - BALLOON.x);
      const distanceZ = Math.abs(z - BALLOON.z);
      if (distanceX >= halfWidth + radius || distanceZ >= halfDepth + radius) return false;
      const height = offset + standingDeck;
      if (inside(x, z, radius)) {
        if (feet >= height - .006) return false;
        return feet > offset - .16 || offset === 0;
      }
      if (from && inside(from.x, from.z) && feet >= height - .006) return true;
      return feet >= offset - .17 && feet < height + 1.12;
    },
    surface(x, z, feet) {
      const height = offset + standingDeck;
      return inside(x, z) && feet >= height - .006 ? height : -Infinity;
    },
    update(dt, player) {
      if (!active() || !moving) return;
      const previous = offset;
      const remaining = Math.abs(target - offset);
      const direction = Math.sign(target - offset);
      const step = reducedMotion?.() ? remaining : Math.min(remaining, dt * (1.2 + Math.min(previous, rise - previous, 3.9) * .41));
      offset = step === remaining ? target : offset + direction * step;
      root.position.y = offset;
      flame.scale.y = .24 + .07 * Math.sin(offset * 2.2);
      if (player && inside(player.x, player.z) && player.y - EYE_HEIGHT >= previous + standingDeck - .08) {
        carryPlayer?.(offset - previous);
      }
      if (offset !== target) return;
      moving = false;
      flame.scale.y = .18;
      if (target === 0) {
        riderExit?.(boarding);
        riderExit = undefined;
      }
    },
    reset() {
      offset = target = 0;
      moving = false;
      riderExit = undefined;
      root.position.y = 0;
      flame.scale.y = .18;
    },
    unload() { riderExit = undefined; },
  };
}
