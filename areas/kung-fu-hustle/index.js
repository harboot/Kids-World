import { metadata } from './metadata.js';
import { music } from './music.js';
import { courtyardLayout } from './layout.js';
import { buildHandOfGod } from './hand-of-god.js';
import { buildCourtyard } from './scene.js';

export default {
  ...metadata,
  music,
  load({ THREE, scene, touch, camera, viewmodel }) {
    const layout = courtyardLayout();
    const courtyard = buildCourtyard(THREE, scene, layout, touch);
    const cinematic = buildHandOfGod({ THREE, scene, camera, viewmodel, beast: courtyard.beast });
    return {
      obstacles: layout.obstacles,
      jumpSpeed: 7.65,
      fallGravity: 36,
      interactions: [cinematic.trigger],
      reset() { cinematic.reset(); },
      unload() { cinematic.reset(); },
      update(dt, player) { courtyard.update(dt, player); cinematic.update(dt, player); },
      getGroundHeight: layout.getGroundHeight,
      getCeilingHeight: layout.getCeilingHeight,
      blocksGround: layout.blocksGround,
      canDropFrom: layout.canDropFrom,
      missionStatus: { missions: [] },
    };
  },
};
