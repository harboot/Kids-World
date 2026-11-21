import { addCleaningSparkles, createCleaningMissions } from './cleaning.js';
import { buildFurniture } from './furniture.js';
import { buildInterior, createHouseBuilder } from './interior.js';
import { metadata } from './metadata.js';
import { music } from './music.js';

const ID = metadata.id;

export const woodenHouse = {
  ...metadata,
  music,
  load: loadHouse,
};

export default woodenHouse;

function loadHouse({ THREE, scene, signal, playCue = () => {}, reducedMotion = () => false, completeLevel, notify }) {
  const obstacles = [];
  const builder = createHouseBuilder(THREE, scene, obstacles);
  buildInterior(THREE, scene, builder);
  const models = buildFurniture(THREE, scene, builder);
  builder.batchArchitecture();
  const sparkles = addCleaningSparkles(THREE, scene);
  const cleaning = createCleaningMissions(THREE, scene, models, {
    playCue, reducedMotion, signal,
    celebrate(finalTask) {
      completeLevel?.(ID);
      sparkles.show(finalTask, reducedMotion());
      notify?.('Great job! The house is sparkling clean!');
    },
  });

  return {
    obstacles,
    blocksGround: cleaning.blocksGround,
    interactions: cleaning.interactions,
    get missionStatus() { return cleaning.missionStatus; },
    reset() {
      cleaning.reset();
      sparkles.hide();
    },
    update(dt) {
      sparkles.update(dt, reducedMotion());
      cleaning.update(dt);
    },
    unload() {
      cleaning.reset();
      sparkles.hide();
    },
  };
}
