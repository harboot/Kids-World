import { metadata } from './metadata.js';
import { music } from './music.js';
import { courtyardLayout } from './layout.js';
import { buildHandOfGod } from './hand-of-god.js';
import { buildCourtyard } from './scene.js';

export default {
  ...metadata,
  music,
  load({ THREE, scene, touch, camera, viewmodel, playCue }) {
    const layout = courtyardLayout();
    const courtyard = buildCourtyard(THREE, scene, layout, touch, viewmodel, camera, playCue);
    const cinematic = buildHandOfGod({ THREE, scene, camera, viewmodel, beast: courtyard.beast, setCraterOpen: courtyard.setCraterOpen });
    return {
      obstacles: layout.obstacles,
      jumpSpeed: 7.65,
      fallGravity: 36,
      interactions: [cinematic.trigger, courtyard.sauce.trigger, courtyard.donut.trigger, courtyard.axeGang.trigger, courtyard.harpists.trigger],
      reset() { cinematic.reset(); courtyard.sauce.reset(); courtyard.donut.reset(); courtyard.axeGang.reset(); courtyard.harpists.reset(); },
      unload() { cinematic.reset(); courtyard.sauce.reset(); courtyard.donut.reset(); courtyard.axeGang.reset(); courtyard.harpists.reset(); },
      update(dt, player) { courtyard.update(dt, player); cinematic.update(dt, player); },
      getGroundHeight: layout.getGroundHeight,
      getCeilingHeight: layout.getCeilingHeight,
      blocksGround: layout.blocksGround,
      canDropFrom: layout.canDropFrom,
      missionStatus: { missions: [] },
    };
  },
};
