import { EYE_HEIGHT } from '../../core/player.js';
import { overlaps } from '../../core/movement.js';
import { buildGym } from './gym.js';
import { automaticGlassDoors } from './terrace-doors.js';
import { buildRescueHelicopter, buildTerraceFountain } from './terrace-props.js';
import { buildCorridor, HALL } from './corridor.js';
import { lighterProp } from './geometry.js';
import { STEP } from './missions.js';
import { buildPool } from './pool.js';

const GLASS_WIDTH = 3.8;

export function buildFloor8(THREE, architecture, zone, reducedMotion, mission) {
  buildCorridor(THREE, architecture, zone, 8, [{ x: 0, width: GLASS_WIDTH, glass: true }]);
  architecture.sign(zone.b.root, ['POOL TERRACE'], 0, 2.83, HALL.south - .146, 1.96, .35, { yaw: Math.PI });
  architecture.sign(zone.b.root, ['RESIDENT LIFT  ↑'], 0, 2.83, HALL.south + .146, 1.96, .35);
  const doors = automaticGlassDoors(THREE, architecture, zone.b.root, {
    name: 'Sliding terrace glass', x: 0, z: HALL.south, width: GLASS_WIDTH, reducedMotion,
    onMove: mission.doorCue, onCross: () => mission.activity('terrace'),
  });
  const pool = buildPool(THREE, architecture, zone);
  const gym = buildGym(THREE, architecture, zone, reducedMotion, mission);
  const fountain = buildTerraceFountain(architecture, zone, mission);
  const helicopter = buildRescueHelicopter(architecture, zone);
  const table = pool.gazeboTable;
  const lighter = lighterProp(architecture, table, 'Collectible lighter', 0.10, 0.026, -0.23, 0.36);
  const syncLighter = () => { lighter.visible = mission.step < STEP.FLOOR_17; };

  return {
    interactions: [gym.interaction, fountain.interaction, {
      x: zone.x + table.position.x + lighter.position.x, z: table.position.z + lighter.position.z,
      anchorY: 0.84, radius: 1.66, label: 'Pick Up Lighter', silent: true,
      reachable: position => pool.insideGazebo(position.x - zone.x, position.z),
      get active() { return mission.ready(STEP.GAZEBO); },
      act() {
        mission.takeLighter();
        syncLighter();
      },
    }],
    blocks: (x, z) => doors.blocks(x, z) || gym.blocks(x, z) || pool.blocks(x, z) || helicopter.blocks(x, z),
    ceiling(x, z) {
      if (Math.abs(x) < GLASS_WIDTH / 2 + 0.16 && Math.abs(z - HALL.south) < 0.3) return 2.50;
      return Math.min(pool.ceiling(x, z), gym.ceiling(x, z));
    },
    reset() {
      doors.reset();
      pool.reset();
      gym.reset();
      fountain.reset();
      helicopter.reset();
      syncLighter();
    },
    update(dt, position) {
      const still = reducedMotion();
      const x = position.x - zone.x;
      doors.update(dt, x, position.z);
      gym.update(dt, x, position.z, still);
      pool.update(dt, still);
      fountain.update(dt, still);
      helicopter.update(dt, still, mission.hasActivity('rescue'));
      if (position.y - EYE_HEIGHT > .42 && zone.walkables.some(item => overlaps(item, x, position.z))) {
        mission.activity('lounger');
      }
    },
  };
}
