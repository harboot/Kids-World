import { buildRoyalGateway } from '../shared/royal-gateway.js';
import { GALLERY_DEPTH, GALLERY_WIDTH } from './exhibits.js';
import { buildGallery } from './gallery.js';

const CASTLE_ID = 'frozen-castle';
const spawn = { x: 0, z: 54.3 };
const returnSite = { x: 0, z: 58.67 };
const missionStatus = {
  missions: [],
  hint: 'Visit Rapunzel and jump onto the observation platform to make her wave. Approach Snow White and the seven dwarfs to see them react. Find Cinderella’s glass slipper on the ballroom stairs. Take the Glass Walkway for a view from above, or stop at a snack cart for a taste.',
};

export const princessGallery = {
  id: 'princess-gallery',
  title: 'Princess Gallery',
  heading: ['Princess', 'Gallery'],
  description: 'Explore the Central Atrium, then take the Glass Walkway for a view into every exhibit.',
  canvasLabel: '3D enchanted exhibition park with Rapunzel, Snow White, and Cinderella',
  themeColor: '#705184',
  music: 'garden',
  width: GALLERY_WIDTH,
  depth: GALLERY_DEPTH,
  spawn,
  load({ THREE, scene, viewmodel, camera, hud, signal, playCue = () => {},
    reducedMotion = () => false, isPlayerGrounded = () => true }) {
    const document = hud?.ownerDocument;
    const obstacles = [];
    let released = false;
    const isActive = () => !released && !signal?.aborted;
    const { exhibitVisits, ceiling, walkway, people, carts } = buildGallery(THREE, scene, document, obstacles, {
      viewmodel, camera, playCue, reducedMotion, isActive,
    });
    const setReturnGlow = buildRoyalGateway(THREE, scene, document, obstacles, {
      ...returnSite, yaw: Math.PI, title: 'Return to Frozen Castle',
    });
    setReturnGlow(true);

    return {
      obstacles,
      arrivals: { [CASTLE_ID]: spawn },
      interactions: [{
        ...returnSite, radius: 2.72, anchorY: 1.85, label: 'Return to Frozen Castle', destination: CASTLE_ID,
        reachable: player => player.z < returnSite.z,
        get active() { return isActive(); },
        act({ travel, heardCue }) {
          if (this.active) travel(CASTLE_ID, heardCue, princessGallery.id);
        },
      }, ...carts.interactions],
      missionStatus,
      getCeilingHeight: () => ceiling - 0.4,
      blocksGround: walkway.blocksGround,
      getGroundHeight(x, z, feet) {
        const upper = walkway.getGroundHeight(x, z, feet);
        if (upper !== undefined) return upper;
        for (const visit of exhibitVisits) {
          const ground = visit.getGroundHeight?.(x, z);
          if (ground !== undefined) return ground;
        }
        return 0;
      },
      update(dt, player) {
        if (!isActive() || !player) return;
        const grounded = isPlayerGrounded();
        const still = reducedMotion();
        people.update(dt, still, player);
        carts.update(dt, still);
        for (const visit of exhibitVisits) visit.update?.(dt, player, grounded, still);
      },
      reset() {
        people.reset();
        carts.reset();
        for (const visit of exhibitVisits) visit.reset?.();
      },
      unload() {
        released = true;
        people.reset();
        carts.reset();
        for (const visit of exhibitVisits) visit.reset?.();
      },
    };
  },
};
