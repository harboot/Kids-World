import { addCleaningSparkles, createCleaningMissions } from './cleaning.js';
import { buildFurniture } from './furniture.js';
import { buildInterior, createHouseBuilder, HOUSE_DEPTH, HOUSE_WIDTH } from './interior.js';

const ID = 'wooden-house';

export const woodenHouse = {
  title: 'Wooden House',
  heading: ['Wooden', 'House'],
  description: 'Stand on the footprints and look toward each mess. You can tidy up in any order.',
  canvasLabel: '3D wooden house interior',
  themeColor: '#f4e5cf',
  music: ID,
  width: HOUSE_WIDTH,
  depth: HOUSE_DEPTH,
  spawn: { x: 0, z: 3.35 },
  load: loadHouse,
};

function loadHouse({ THREE, scene, signal, playCue = () => {}, reducedMotion = () => false, completeLevel }) {
  const obstacles = [];
  const builder = createHouseBuilder(THREE, scene, obstacles);
  const exit = buildInterior(THREE, scene, builder);
  const models = buildFurniture(THREE, scene, builder);
  builder.batchArchitecture();
  const sparkles = addCleaningSparkles(THREE, scene);
  const cleaning = createCleaningMissions(THREE, scene, models, {
    playCue, reducedMotion, signal,
    celebrate(finalTask) {
      completeLevel?.(ID);
      sparkles.show(finalTask, reducedMotion());
    },
  });

  return {
    obstacles,
    blocksGround: cleaning.blocksGround,
    interactions: [...cleaning.interactions, exit],
    get objective() { return cleaning.objective; },
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
