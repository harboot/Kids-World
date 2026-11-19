import { overlaps } from '../../core/movement.js';
import { buildCorridor, HALL } from './corridor.js';
import { COLORS } from './geometry.js';
import { STEP } from './missions.js';
import { buildUnit17E, unitCeiling } from './unit17e.js';

export const ENTRY_X = 4.75;
export const ENTRY_WIDTH = 1.43;

export function buildFloor17(THREE, architecture, zone, reducedMotion, mission) {
  const { b, x: offset } = zone;
  buildCorridor(THREE, architecture, zone, 17, [
    { x: -7.9, width: 1.27, number: '17F' },
    { x: -4.35, width: 1.27, number: '17G' },
    { x: ENTRY_X, width: ENTRY_WIDTH, number: '17E', accent: true },
    { x: 8.26, width: 1.27, number: '17H' },
  ]);
  const z = HALL.south;
  const width = ENTRY_WIDTH - 0.12;
  const hingeX = ENTRY_X - width / 2;
  const door = architecture.group(b.root, 'Unit 17E entry door', hingeX, 0, z);
  const p = architecture.builder(door);
  p.part(COLORS.walnut, width / 2, 1.16, 0, width, 2.32, 0.10);
  for (const side of [-1, 1]) {
    p.part(0x70503d, width / 2, 1.14, side * 0.054, width - 0.19, 2.00, 0.03);
    p.part(COLORS.brass, width - 0.18, 1.02, side * 0.098, 0.21, 0.052, 0.069);
  }
  p.finish();
  architecture.sign(b.root, ['17E'], ENTRY_X, 2.63, z + 0.156, 0.66, 0.26, { background: '#493226' });
  const unit = buildUnit17E(THREE, architecture, zone, { entryX: ENTRY_X, entryWidth: ENTRY_WIDTH });
  let openness = 0;

  function kitchenInteraction(model, label, step, act) {
    return {
      x: offset + model.position.x, z: model.position.z, anchorY: model.position.y + 0.16,
      label, radius: 1.97, silent: true, requiresView: true,
      reachable: position => unit.insideKitchen(position.x - offset, position.z),
      get active() { return mission.ready(step); },
      act,
    };
  }

  return {
    unit,
    interactions: [{
      x: offset + ENTRY_X, z: z - 0.18, anchorY: 1.27, radius: 2.20, label: 'Open Unit 17E',
      reachable: position => position.z < z - 0.27,
      get active() { return mission.ready(STEP.UNIT); },
      act() { mission.openUnit(); },
    }, kitchenInteraction(unit.control, 'Activate Prop Control', STEP.CONTROL, mission.activateControl),
    kitchenInteraction(unit.oven, 'Place Lighter in Oven', STEP.OVEN, mission.startCountdown)],
    ceiling(x, pz) {
      if (Math.abs(x - ENTRY_X) < ENTRY_WIDTH / 2 && Math.abs(pz - z) < 0.29) return 2.34;
      return unitCeiling(x, pz);
    },
    reset() {
      openness = 0;
      door.rotation.y = 0;
      unit.showPuzzle(false, false);
    },
    blocks(x, pz) {
      const sin = Math.sin(door.rotation.y);
      const cos = Math.cos(door.rotation.y);
      const dx = x - hingeX;
      const dz = pz - z;
      return overlaps({ left: 0, right: width, front: -0.081, back: 0.081 },
        cos * dx - sin * dz, sin * dx + cos * dz);
    },
    update(dt) {
      if (mission.step > STEP.UNIT && openness < 1) {
        openness = reducedMotion() ? 1 : Math.min(1, openness + dt / 0.52);
        door.rotation.y = -1.67 * openness;
      }
      unit.showPuzzle(mission.ready(STEP.OVEN), mission.ready(STEP.COUNTDOWN));
    },
  };
}
