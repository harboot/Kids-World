import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addGallerySign } from './parts.js';

export const walkwayLiftSite = {
  entry: [34, -11], x: 26.20, z: -11, halfDepth: 1.54, halfWidth: 1.55,
};

const cabinRoof = 2.91;

export function buildWalkwayLift({ THREE, document, parent, parts, height, camera, isActive, reducedMotion, carryPlayer }) {
  const { part, beam, batch, matte } = parts;
  const { clamp, lerp, smoothstep } = THREE.MathUtils;
  const { x, z, halfDepth, halfWidth } = walkwayLiftSite;
  const front = x + halfDepth;
  const back = x - halfDepth;
  const stops = [0, height];
  const titles = ['ground floor', 'Glass Walkway'];
  const bronze = matte(0xbb8851);
  const navy = matte(0x465477);
  const ivory = matte(0xe0c5b2);
  const waxed = matte(0x627d90);
  const glass = matte(0xa2e4ed, { transparent: true, opacity: .30, depthWrite: false, side: THREE.DoubleSide });
  const doorGlass = matte(0x99dce4, { transparent: true, opacity: .44, depthWrite: false, side: THREE.DoubleSide });
  const gauge = matte(0xecf8db, { emissive: 0x83d6cb, emissiveIntensity: .6 });
  const root = addGroup(THREE, parent, 'Glass Walkway lift', x, 0, z, Math.PI / 2);
  const shaft = new THREE.Group();

  for (const side of [-1, 1]) {
    const lx = side * (halfWidth + .08);
    for (const end of [-1, 1]) {
      const lz = end * (halfDepth + .045);
      // Front columns are clear of the walking opening at both landings.
      part(shaft, 'box', bronze, lx, (height + cabinRoof) / 2, lz, .145, height + cabinRoof, .145);
    }
    beam(shaft, navy, [lx, 0, -halfDepth * .52], [lx, height + cabinRoof, -halfDepth * .52], .113);
    for (let base = 3.0; base < height; base += 2.85) {
      part(shaft, 'box', bronze, lx, base, 0, .10, .13, halfDepth * 2);
      part(shaft, 'box', glass, lx, base - 1.27, 0, .055, 2.40, 2.76);
    }
  }
  for (let base = 0; base <= height - 2.3; base += 2.6) {
    part(shaft, 'box', glass, 0, base + 1.31, -halfDepth - .025, 2.94, 2.43, .056);
  }
  part(shaft, 'box', navy, 0, height + cabinRoof + .06, 0, 3.29, .23, 3.17);
  batch(shaft, root);

  function doors(parent, floor, forward, name) {
    const leaves = [-1, 1].map(side => {
      const leaf = addGroup(THREE, parent, name, side * halfWidth / 2, floor, forward);
      const detail = new THREE.Group();
      part(detail, 'box', doorGlass, 0, 1.20, 0, halfWidth - .175, 2.23, .047);
      for (const dx of [-1, 1]) {
        part(detail, 'box', bronze, dx * (halfWidth / 2 - .051), 1.20, 0, .078, 2.38, .12);
      }
      for (const y of [.103, 1.10, 2.32]) part(detail, 'box', navy, 0, y, 0, halfWidth - .048, .091, .10);
      part(detail, 'gem', gauge, -side * (halfWidth / 2 - .22), 1.30, .059, .072, .12, .046);
      batch(detail, leaf);
      return { leaf, side };
    });
    return openness => {
      for (const { leaf, side } of leaves) {
        leaf.visible = openness < .995;
        leaf.position.x = side * halfWidth * (1 + openness) / 2;
        leaf.scale.x = Math.max(.005, 1 - openness);
      }
    };
  }

  const cabin = addGroup(THREE, root, 'Glass lift cabin');
  const cabinDetails = new THREE.Group();
  part(cabinDetails, 'box', navy, 0, -.145, 0, halfWidth * 2, .29, halfDepth * 2);
  part(cabinDetails, 'box', waxed, 0, -.018, 0, 2.73, .036, 2.68);
  for (const offset of [-1.12, 1.12]) {
    part(cabinDetails, 'box', bronze, offset, SURFACE_GAP.detail, 0, .045, .021, 2.56);
  }
  part(cabinDetails, 'box', bronze, 0, -.039, halfDepth - .055, 2.94, .078, .106);
  for (const side of [-1, 1]) {
    const lx = side * (halfWidth - .044);
    for (const lz of [-halfDepth + .062, halfDepth - .062]) {
      part(cabinDetails, 'box', navy, lx, 1.43, lz, .112, 2.86, .112);
    }
    part(cabinDetails, 'box', glass, lx, 1.53, 0, .06, 2.30, 2.84);
    part(cabinDetails, 'box', bronze, lx, 1.13, 0, .11, .096, 2.84);
  }
  part(cabinDetails, 'box', glass, 0, 1.52, -halfDepth + .047, 2.88, 2.36, .07);
  part(cabinDetails, 'box', bronze, 0, 1.04, -halfDepth + .09, 2.89, .102, .13);
  part(cabinDetails, 'box', navy, 0, cabinRoof + .047, 0, 3.08, .094, 3.04);
  part(cabinDetails, 'box', ivory, 0, cabinRoof - .022, 0, 2.59, .043, 2.52);
  part(cabinDetails, 'box', gauge, 0, cabinRoof - .065, 0, .89, .044, .46);
  part(cabinDetails, 'box', navy, -.94, 1.34, -halfDepth + .132, .51, .76, .11);
  for (const y of [1.18, 1.51]) part(cabinDetails, 'gem', gauge, -.94, y, -halfDepth + .204, .109, .11, .067);
  batch(cabinDetails, cabin);
  const cabinDoors = doors(cabin, 0, halfDepth - .060, 'Cabin door');
  const landings = stops.map((floor, i) => {
    const frame = addGroup(THREE, root, i === 0 ? 'Lift ground station' : 'Lift walkway station', 0, floor, 0);
    const detail = new THREE.Group();
    const lamp = matte(0xddf2e3, { emissive: 0x83d6cb, emissiveIntensity: .7 });
    for (const side of [-1, 1]) {
      part(detail, 'box', navy, side * (halfWidth - .023), 1.29, halfDepth + .021, .134, 2.58, .174);
      part(detail, 'box', bronze, side * (halfWidth - .023), .155, halfDepth + .055, .212, .31, .23);
    }
    part(detail, 'box', navy, 0, 2.52, halfDepth + .031, 3.17, .40, .18);
    part(detail, 'box', bronze, 0, 2.82, halfDepth + .065, 2.85, .54, .18);
    addGallerySign(THREE, document, frame, ['Glass Walkway Lift', i === 0 ? 'Ground floor' : 'Glass Walkway'],
      0, 2.82, halfDepth + .155 + SURFACE_GAP.detail, 2.76, .47);
    part(detail, 'box', navy, 1.30, 1.16, halfDepth + .225, .41, .62, .19);
    part(detail, 'gem', lamp, 1.30, 1.19, halfDepth + .334, .113, .121, .054);
    part(detail, 'gem', lamp, 0, 2.51, halfDepth + .133, .142, .111, .065);
    batch(detail, frame);
    return { lamp, doors: doors(frame, 0, halfDepth + .041, 'Landing door') };
  });
  root.traverse(object => {
    if (object.isMesh) object.layers.set(PLAYER_ONLY_LAYER);
  });

  let stop = 0;
  let trip = null;
  function inCabin(px, pz) {
    return px >= back && px <= front && Math.abs(pz - z) <= halfWidth;
  }
  function onFloor(player, floor) {
    return Math.abs(player.y - EYE_HEIGHT - floor) < .27;
  }
  function request(target) {
    const still = reducedMotion();
    trip = { target, elapsed: 0, doorTime: still ? .13 : .43, travelTime: still ? .19 : 4.4 };
  }
  function render(open, dock) {
    cabinDoors(open);
    for (const [index, landing] of landings.entries()) {
      const present = index === dock;
      landing.doors(present ? open : 0);
      landing.lamp.emissiveIntensity = trip ? .22 : present ? .54 : .93;
    }
  }

  const calls = stops.map((floor, i) => ({
    x: front + .36, z: z - 1.30, radius: 2.18, anchorY: floor + 1.19,
    label: i === 0 ? 'Call lift to ground floor' : 'Call lift to Glass Walkway',
    get active() { return isActive() && !trip && stop !== i; },
    reachable(player) {
      return player.x >= front + .12 && Math.abs(player.z - z) < 1.48 &&
        onFloor(player, floor) && Math.hypot(player.x - this.x, player.z - this.z) <= this.radius;
    },
    act() {
      if (this.active && camera && this.reachable(camera.position)) request(i);
    },
  }));
  const ride = {
    x: x - .82, z: z + .80, radius: 3.44,
    get anchorY() { return cabin.position.y + 1.44; },
    get label() { return 'Ride lift to ' + titles[1 - stop]; },
    get active() { return isActive() && !trip; },
    reachable(player) {
      return inCabin(player.x, player.z) && player.x <= front - PLAYER_RADIUS - .02 &&
        onFloor(player, cabin.position.y);
    },
    act() {
      if (this.active && camera && this.reachable(camera.position)) request(1 - stop);
    },
  };

  return {
    interactions: [...calls, ride],
    reset() {
      stop = 0;
      trip = null;
      cabin.position.y = 0;
      render(1, stop);
    },
    update(dt, player) {
      if (!trip) return;
      const { doorTime, travelTime, target } = trip;
      const previous = cabin.position.y;
      const inTransit = trip.elapsed += dt;
      const progress = clamp((inTransit - doorTime) / travelTime, 0, 1);
      const opening = inTransit < doorTime ? 1 - inTransit / doorTime :
        clamp((inTransit - doorTime - travelTime) / doorTime, 0, 1);
      cabin.position.y = lerp(stops[stop], stops[target], smoothstep(progress, 0, 1));
      const feet = player.y - EYE_HEIGHT;
      if (cabin.position.y !== previous && inCabin(player.x, player.z) && feet >= previous - .08 && feet <= previous + 1.4) {
        carryPlayer(cabin.position.y - previous);
      }
      if (progress === 1 && opening === 1) {
        stop = target;
        trip = null;
      }
      render(opening, progress === 0 ? stop : progress === 1 ? target : -1);
    },
    getGroundHeight(px, pz, feet = 0) {
      const floor = cabin.position.y;
      if (inCabin(px, pz) && feet >= floor - .08 && feet <= floor + 1.5) return floor;
    },
    getCeilingHeight(px, pz) {
      if (inCabin(px, pz)) return cabin.position.y + cabinRoof;
    },
    blocksGround(px, pz, radius, feet) {
      const across = Math.abs(pz - z);
      if (across >= halfWidth + radius || px < back - radius || px > front + radius) return false;
      if (across > halfWidth - radius || px < back + radius) return true;
      const floor = cabin.position.y;
      if (feet < floor - .08 || feet > floor + 1.5) return true;
      return px >= front - radius && (trip !== null || feet > floor + 1.26);
    },
  };
}
