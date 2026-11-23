import { addCleaningSparkles, createCleaningMissions } from './cleaning.js';
import { buildFamily } from './family.js';
import { buildFurniture } from './furniture.js';
import { buildInterior, createHouseBuilder } from './interior.js';
import { BACK, FRONT, SIDE, buildUpperFloor, houseCeiling, houseGround, upstairsBlockers } from './layout.js';
import { metadata } from './metadata.js';
import { music } from './music.js';
import { decorativeDoor, furnishUpperHall } from './upstairs-decor.js';

const ID = metadata.id;

export const woodenHouse = {
  ...metadata,
  music,
  load: loadHouse,
};

export default woodenHouse;

function loadHouse({ THREE, scene, signal, playCue = () => {}, reducedMotion = () => false, completeLevel, notify }) {
  const obstacles = [];
  const upper = upstairsBlockers();
  const builder = createHouseBuilder(THREE, scene, obstacles, upper);
  buildInterior(THREE, scene, builder);
  buildUpperFloor(builder);
  decorativeDoor(builder, 'Wooden House front door', 0, 0, 0xb57b56, scene, 1.8);
  furnishUpperHall(THREE, scene, builder);
  const [bed, dishes, painting, tv, toys] = buildFurniture(THREE, scene, builder);
  const family = buildFamily(scene, builder);
  const { mother, table, father, bird, wake, girl } = family.tasks;
  bed.ready = () => family.awake;
  const models = [mother, dishes, table, father, bird, painting, tv, wake, bed, toys, girl];
  for (const model of models) {
    const approach = model.approach;
    model.approach = player => Math.abs(player.x) < SIDE && player.z > BACK && player.z < FRONT &&
      (!approach || approach(player));
  }
  builder.batchArchitecture();
  const sparkles = addCleaningSparkles(THREE, scene);
  const cleaning = createCleaningMissions(THREE, scene, models, {
    playCue, reducedMotion, signal,
    celebrate(finalTask) {
      completeLevel?.(ID);
      sparkles.show(finalTask, reducedMotion());
      notify?.('Great job helping the whole family!');
    },
  });

  return {
    obstacles,
    getGroundHeight: houseGround,
    getCeilingHeight: houseCeiling,
    blocksGround(x, z, radius = .34, feet = 0) {
      return upper.blocks(x, z, feet) || cleaning.blocksGround(x, z, feet);
    },
    interactions: cleaning.interactions,
    get missionStatus() { return cleaning.missionStatus; },
    reset() {
      cleaning.reset();
      family.reset();
      sparkles.hide();
    },
    update(dt, position) {
      sparkles.update(dt, reducedMotion());
      cleaning.update(dt, position);
      family.update(dt, reducedMotion());
    },
    unload() {
      cleaning.reset();
      sparkles.hide();
    },
  };
}
