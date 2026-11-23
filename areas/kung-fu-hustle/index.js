import { metadata } from './metadata.js';
import { music } from './music.js';
import { courtyardLayout } from './layout.js';
import { buildCourtyard } from './scene.js';

export default {
  ...metadata,
  music,
  load({ THREE, scene, touch }) {
    const layout = courtyardLayout();
    buildCourtyard(THREE, scene, layout, touch);
    return {
      obstacles: layout.obstacles,
      interactions: [],
      getGroundHeight: layout.getGroundHeight,
      getCeilingHeight: layout.getCeilingHeight,
      blocksGround: layout.blocksGround,
      missionStatus: { missions: [] },
    };
  },
};
