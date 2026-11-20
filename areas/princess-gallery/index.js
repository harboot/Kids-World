import { buildRoyalGateway } from '../shared/royal-gateway.js';
import { GALLERY_DEPTH, GALLERY_WIDTH } from './exhibits.js';
import { buildGallery } from './gallery.js';

const CASTLE_ID = 'frozen-castle';
const spawn = { x: 0, z: 54.3 };
const returnSite = { x: 0, z: 58.67 };
const missionStatus = {
  missions: [],
  hint: 'Visit Rapunzel and jump onto the observation platform to make her wave. Approach Snow White and the seven dwarfs to see them react. Find Cinderella’s glass slipper on the ballroom stairs.',
};

export const princessGallery = {
  id: 'princess-gallery',
  title: 'Princess Gallery',
  heading: ['Princess', 'Gallery'],
  description: 'Explore the Central Atrium, the enchanted woodlands, and Cinderella’s palace ballroom.',
  canvasLabel: '3D enchanted exhibition park with Rapunzel, Snow White, and Cinderella',
  themeColor: '#705184',
  music: 'garden',
  width: GALLERY_WIDTH,
  depth: GALLERY_DEPTH,
  spawn,
  load({ THREE, scene, hud, signal, reducedMotion = () => false, isPlayerGrounded = () => true }) {
    const document = hud?.ownerDocument;
    const obstacles = [];
    const { exhibitVisits, ceiling } = buildGallery(THREE, scene, document, obstacles);
    const setReturnGlow = buildRoyalGateway(THREE, scene, document, obstacles, {
      ...returnSite, yaw: Math.PI, title: 'Return to Frozen Castle',
    });
    setReturnGlow(true);
    let released = false;

    return {
      obstacles,
      arrivals: { [CASTLE_ID]: spawn },
      interactions: [{
        ...returnSite, radius: 2.72, anchorY: 1.85, label: 'Return to Frozen Castle', destination: CASTLE_ID,
        reachable: player => player.z < returnSite.z,
        get active() { return !released && !signal?.aborted; },
        act({ travel, heardCue }) {
          if (this.active) travel(CASTLE_ID, heardCue, princessGallery.id);
        },
      }],
      missionStatus,
      getCeilingHeight: () => ceiling - 0.4,
      getGroundHeight(x, z) {
        for (const visit of exhibitVisits) {
          const ground = visit.getGroundHeight?.(x, z);
          if (ground !== undefined) return ground;
        }
        return 0;
      },
      update(dt, player) {
        if (released || signal?.aborted || !player) return;
        const grounded = isPlayerGrounded();
        const still = reducedMotion();
        for (const visit of exhibitVisits) visit.update?.(dt, player, grounded, still);
      },
      reset() {
        for (const visit of exhibitVisits) visit.reset?.();
      },
      unload() {
        released = true;
        for (const visit of exhibitVisits) visit.reset?.();
      },
    };
  },
};
