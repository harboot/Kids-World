import { overlaps } from '../../core/movement.js';
import { buildCorridor, HALL } from './corridor.js';
import { COLORS, lighterProp } from './geometry.js';
import { STEP } from './missions.js';
import { buildPool } from './pool.js';

const GLASS_WIDTH = 3.8;

function terraceDoors(THREE, architecture, { b, x: offset }, reducedMotion) {
  const z = HALL.south;
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9cc3cb, metalness: 0.2, roughness: 0.16, transparent: true, opacity: 0.27, depthWrite: false,
  });
  for (const side of [-1, 1]) {
    b.part(COLORS.ink, side * (GLASS_WIDTH / 2 + 0.04), 1.28, z, 0.12, 2.56, 0.27);
    b.solid(side * (GLASS_WIDTH / 2 + 0.04), z, 0.12, 0.27);
  }
  b.part(COLORS.ink, 0, 2.562, z, GLASS_WIDTH + 0.16, 0.11, 0.28);
  b.part(COLORS.steel, 0, 0.012, z, GLASS_WIDTH, 0.024, 0.27);
  architecture.sign(b.root, ['POOL TERRACE'], 0, 2.83, z - 0.146, 1.96, 0.35, { yaw: Math.PI });
  architecture.sign(b.root, ['RESIDENT LIFT  ↑'], 0, 2.83, z + 0.146, 1.96, 0.35);

  const panels = [-1, 1].map(side => {
    const panel = architecture.group(b.root, 'Sliding terrace glass', 0, 0, z + 0.17);
    const p = architecture.builder(panel);
    const width = GLASS_WIDTH / 2;
    architecture.box(panel, glass, 0, 1.296, 0, width - 0.14, 2.41, 0.016);
    for (const edge of [-1, 1]) {
      p.part(COLORS.ink, edge * (width / 2 - 0.044), 1.29, 0, 0.078, 2.49, 0.09);
      p.part(COLORS.ink, 0, edge < 0 ? 0.072 : 2.508, 0, width - 0.16, 0.082, 0.091);
      p.part(COLORS.steel, -side * 0.61, 1.15, edge * 0.075, 0.061, 0.33, 0.07);
      p.part(COLORS.ivory, 0, 1.48, edge * 0.011, width - 0.17, 0.022, 0.005);
    }
    p.finish();
    return { panel, side };
  });
  let openness = 0;
  let target = 0;
  function pose() {
    for (const { panel, side } of panels) panel.position.x = side * (GLASS_WIDTH / 4 + openness * GLASS_WIDTH / 2);
  }

  return {
    interaction: {
      x: offset, z, anchorY: 1.38, radius: 2.5,
      reachable: position => Math.abs(position.z - z) > 0.69,
      get active() { return openness === target; },
      get label() { return target ? 'Close terrace doors' : 'Open terrace doors'; },
      act() { if (this.active) target = 1 - target; },
    },
    blocks(x, pz) {
      return (openness !== 1 || target !== 1) &&
        overlaps({ left: -GLASS_WIDTH / 2, right: GLASS_WIDTH / 2, front: z - 0.09, back: z + 0.24 }, x, pz);
    },
    reset() {
      openness = target = 0;
      pose();
    },
    update(dt) {
      if (openness === target) return;
      const step = reducedMotion() ? 1 : dt / 0.65;
      openness = target ? Math.min(1, openness + step) : Math.max(0, openness - step);
      pose();
    },
  };
}

export function buildFloor8(THREE, architecture, zone, reducedMotion, mission) {
  buildCorridor(THREE, architecture, zone, 8, [
    { x: -7.95, width: 1.27, number: '8E' },
    { x: -4.5, width: 1.27, number: '8F' },
    { x: 0, width: GLASS_WIDTH, glass: true },
    { x: 6.0, width: 1.27, number: '8G' },
  ]);
  const doors = terraceDoors(THREE, architecture, zone, reducedMotion);
  const pool = buildPool(THREE, architecture, zone);
  const table = pool.gazeboTable;
  const lighter = lighterProp(architecture, table, 'Collectible lighter', 0.10, 0.026, -0.23, 0.36);
  const syncLighter = () => { lighter.visible = mission.step < STEP.FLOOR_17; };

  return {
    interactions: [doors.interaction, {
      x: zone.x + table.position.x + lighter.position.x, z: table.position.z + lighter.position.z,
      anchorY: 0.84, radius: 1.66, label: 'Pick Up Lighter', silent: true,
      reachable: position => pool.insideGazebo(position.x - zone.x, position.z),
      get active() { return mission.ready(STEP.GAZEBO); },
      act() {
        mission.takeLighter();
        syncLighter();
      },
    }],
    blocks: (x, z) => doors.blocks(x, z) || pool.blocks(x, z),
    ceiling(x, z) {
      if (Math.abs(x) < GLASS_WIDTH / 2 + 0.16 && Math.abs(z - HALL.south) < 0.3) return 2.50;
      return pool.ceiling(x, z);
    },
    reset() {
      doors.reset();
      pool.reset();
      syncLighter();
    },
    update(dt) {
      doors.update(dt);
      pool.update(dt, reducedMotion());
    },
  };
}
