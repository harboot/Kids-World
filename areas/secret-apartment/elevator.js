import { overlaps, PLAYER_RADIUS } from '../../core/movement.js';
import { COLORS, ceilingLight } from './geometry.js';

const HALF_OPENING = 1.17;
const CABIN_WIDTH = 3.55;
const CABIN_DEPTH = 3.25;
const PANEL_HEIGHT = 2.46;
const BUTTON_Y = 1.61;
const DOOR_TIME = 0.62;
const TRAVEL_TIME = 0.55;
const STOPS = [
  { id: 'basement', number: 'B', label: 'Basement' },
  { id: 'floor8', number: '8', label: 'Floor 8' },
  { id: 'floor17', number: '17', label: 'Floor 17' },
];

function buildCabin(THREE, architecture, zone, doorMaterial, lampMaterial) {
  const { b, doorZ } = zone;
  const back = doorZ - CABIN_DEPTH;
  const center = (doorZ + back) / 2;
  const rail = 0xa19a83;
  b.part(0x666b6b, 0, -0.09, center, CABIN_WIDTH, 0.18, CABIN_DEPTH);
  b.part(0x93928d, 0, 0.001, doorZ + 0.01, 2.38, 0.03, 0.27);
  b.part(0xc4beb0, 0, 2.61, center, CABIN_WIDTH, 0.16, CABIN_DEPTH);
  b.block(0xb5b1a4, 0, 1.31, back, CABIN_WIDTH, 2.62, 0.14);
  for (const side of [-1, 1]) {
    const x = side * CABIN_WIDTH / 2;
    b.block(0xa29c8f, x, 1.31, center, 0.15, 2.62, CABIN_DEPTH);
    b.part(COLORS.walnut, x - side * 0.082, 0.54, center - 0.055, 0.05, 1.04, CABIN_DEPTH - 0.28);
    b.part(rail, x - side * 0.155, 0.96, center - 0.15, 0.065, 0.065, 2.48);
    for (const z of [back + 0.43, doorZ - 0.74]) b.part(rail, x - side * 0.121, 0.96, z, 0.14, 0.045, 0.067);
    b.part(0xb8a68a, side * (HALF_OPENING + 0.1), 1.3, doorZ + 0.148, 0.2, 2.6, 0.13);
  }
  b.part(0xb8a68a, 0, 2.54, doorZ + 0.148, 2.74, 0.13, 0.13);
  ceilingLight(b, 0, center, 2.59, 1.48, 2.53);
  b.part(COLORS.ink, 0, BUTTON_Y + 0.02, back + 0.11, 2.72, 0.68, 0.12);
  architecture.sign(b.root, ['SELECT FLOOR'], 0, 2.11, back + 0.084, 1.6, 0.20);
  const buttons = STOPS.map((stop, i) => {
    const x = (i - 1) * 0.85;
    const z = back + 0.231;
    b.part(COLORS.brass, x, BUTTON_Y, back + 0.18, 0.42, 0.39, 0.06);
    architecture.sign(b.root, [stop.number], x, BUTTON_Y, z, 0.36, 0.31);
    return { ...stop, x, z };
  });
  b.part(0x3a3933, 1.64, 1.35, doorZ + 0.171, 0.295, 0.45, 0.095);
  const call = { x: 1.64, z: doorZ + 0.23, y: 1.35 };
  architecture.sign(b.root, ['↑'], call.x, call.y + 0.036, call.z, 0.18, 0.19);
  const lamp = architecture.box(b.root, lampMaterial, call.x, 1.214, call.z, 0.085, 0.023, 0.02);
  const indicator = STOPS.map(stop => architecture.sign(b.root, [stop.number], 0, 2.83, doorZ + 0.17,
    0.64, 0.29, { color: '#ffd884' }));

  const panels = [-1, 1].map(side => {
    const panel = architecture.group(b.root, 'Sliding elevator door', 0, 0, doorZ);
    architecture.box(panel, doorMaterial, 0, PANEL_HEIGHT / 2, 0, HALF_OPENING - 0.012, PANEL_HEIGHT, 0.105);
    const detail = architecture.builder(panel);
    detail.part(0xb4b7b3, -side * 0.49, PANEL_HEIGHT / 2, 0.057, 0.028, PANEL_HEIGHT - 0.025, 0.024);
    detail.finish();
    return { side, panel };
  });

  return {
    buttons, call,
    pose(open) {
      for (const { side, panel } of panels) panel.position.x = side * (HALF_OPENING / 2 + open * HALF_OPENING);
      lamp.visible = open < 1;
    },
    show(stop) {
      indicator.forEach((sign, i) => { sign.visible = STOPS[i].id === stop; });
    },
    inCabin(position) {
      return Math.abs(position.x - zone.x) < CABIN_WIDTH / 2 - 0.19 &&
        position.z < doorZ - 0.74 && position.z > back;
    },
    blocks(x, z) {
      return panels.some(({ panel }) => overlaps({
        left: panel.position.x - HALF_OPENING / 2, right: panel.position.x + HALF_OPENING / 2,
        front: doorZ - 0.062, back: doorZ + 0.062,
      }, x, z));
    },
  };
}

export function createElevator(THREE, architecture, zones, {
  onArrival, reducedMotion, canAccess = () => true,
}) {
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x979d9e, metalness: 0.31, roughness: 0.42 });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffae47 });
  const cabins = Object.fromEntries(STOPS.map(({ id }) =>
    [id, buildCabin(THREE, architecture, zones[id], doorMaterial, lampMaterial)]));
  let stop, state, progress, pending;

  function arrive(id) {
    stop = id;
    for (const cabin of Object.values(cabins)) cabin.show(id);
  }

  function begin(next) {
    state = next;
    progress = 0;
  }

  const interactions = STOPS.flatMap(({ id }) => {
    const zone = zones[id];
    const cabin = cabins[id];
    return [{
      x: zone.x + cabin.call.x, z: cabin.call.z, anchorY: cabin.call.y, radius: 2.25,
      label: 'Call elevator',
      reachable: position => position.z > zone.doorZ + 0.16,
      get active() { return stop === id && state === 'closed'; },
      act() { if (this.active) begin('opening'); },
    }, ...cabin.buttons.map(destination => ({
      x: zone.x + destination.x, z: destination.z, anchorY: BUTTON_Y, radius: 2.5, aimRadius: 0.35,
      label: 'Go to ' + destination.label,
      reachable: cabin.inCabin,
      get active() {
        return stop === id && state === 'open' && destination.id !== id && canAccess(destination.id);
      },
      act({ relocate }) {
        if (!this.active) return;
        pending = { id: destination.id, relocate };
        begin('closing');
      },
    }))];
  });

  return {
    interactions,
    reset() {
      pending = null;
      begin('closed');
      arrive('basement');
      for (const cabin of Object.values(cabins)) cabin.pose(0);
    },
    blocks(id, x, z) {
      if (id === stop && (state === 'closing' || state === 'traveling') &&
          Math.abs(z - zones[id].doorZ) < 0.43 && Math.abs(x) < HALF_OPENING + PLAYER_RADIUS) return true;
      return cabins[id].blocks(x, z);
    },
    ceiling(id, x, z) {
      const doorZ = zones[id].doorZ;
      const underCabin = Math.abs(x) < CABIN_WIDTH / 2 && z > doorZ - CABIN_DEPTH && z <= doorZ;
      const underLintel = Math.abs(x) < HALF_OPENING + 0.15 && z > doorZ && z < doorZ + 0.29;
      return underCabin || underLintel ? 2.44 : Infinity;
    },
    update(dt) {
      if (state === 'open' || state === 'closed') return;
      if (state === 'traveling') {
        progress += dt;
        if (progress >= TRAVEL_TIME) {
          const { id, relocate } = pending;
          const { x, doorZ } = zones[id];
          pending = null;
          arrive(id);
          begin('opening');
          onArrival(id);
          relocate({ x, z: doorZ - CABIN_DEPTH / 2, yaw: Math.PI });
        }
        return;
      }
      progress = reducedMotion() ? 1 : Math.min(1, progress + dt / DOOR_TIME);
      const eased = progress * progress * (3 - 2 * progress);
      cabins[stop].pose(state === 'opening' ? eased : 1 - eased);
      if (progress === 1) begin(state === 'opening' ? 'open' : 'traveling');
    },
    get moving() { return state === 'closing' || state === 'traveling'; },
    inCabin(position) { return cabins[stop].inCabin(position); },
  };
}
