import { buildRoyalGateway } from '../shared/royal-gateway.js';
import { exhibits, GALLERY_DEPTH, GALLERY_WIDTH } from './exhibits.js';
import { buildGallery } from './gallery.js';

const CASTLE_ID = 'frozen-castle';
const spawn = { x: 0, z: 54.3 };
const returnSite = { x: 0, z: 58.67 };
const hint = 'Visit Rapunzel and jump onto the observation platform to make her wave. Approach Snow White and the seven dwarfs to see them react. Find Cinderella’s glass slipper on the ballroom stairs. Approach the enchanted rose to wake Aurora. Move away to let her sleep again. Take the stairs or the Adventure Wing lift to the Glass Walkway, or stop at a snack cart for a taste. Board Ariel’s shipwreck and open the treasure chest. Approach the story displays in the five preview rooms.';

export const princessGallery = {
  id: 'princess-gallery',
  title: 'Princess Gallery',
  heading: ['Princess', 'Gallery'],
  description: 'Explore the Central Atrium, then take the Glass Walkway for a view into every exhibit.',
  canvasLabel: '3D enchanted exhibition park with Rapunzel, Snow White, Cinderella, Aurora, and Ariel',
  themeColor: '#705184',
  music: 'garden',
  width: GALLERY_WIDTH,
  depth: GALLERY_DEPTH,
  spawn,
  load({ THREE, scene, viewmodel, camera, hud, signal, playCue = () => {},
    reducedMotion = () => false, isPlayerGrounded = () => true, carryPlayer = () => {},
    isLevelComplete = () => false, completeLevel = () => {}, notify = () => {} }) {
    const document = hud?.ownerDocument;
    const obstacles = [];
    const missions = exhibits.map(({ id, mission }) => ({ id, title: mission, current: 0, total: 1, complete: false }));
    const missionById = new Map(missions.map(mission => [mission.id, mission]));
    let remaining = missions.length;
    let recorded = isLevelComplete(princessGallery.id);
    let released = false;
    function resetVisit() {
      remaining = missions.length;
      for (const mission of missions) {
        mission.current = 0;
        mission.complete = false;
      }
      people.reset();
      carts.reset();
      lift.reset();
      for (const visit of exhibitVisits) visit.reset?.();
    }
    const isActive = () => !released && !signal?.aborted;
    const { exhibitVisits, ceiling, walkway, lift, people, carts } = buildGallery(THREE, scene, document, obstacles, {
      viewmodel, camera, playCue, reducedMotion, isActive, carryPlayer,
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
      }, ...lift.interactions, ...carts.interactions, ...exhibitVisits.flatMap(visit => visit.interactions ?? [])],
      missionStatus: { missions, hint },
      getCeilingHeight: (x, z) => lift.getCeilingHeight(x, z) ?? ceiling - 0.4,
      blocksGround(x, z, radius, feet) {
        return lift.blocksGround(x, z, radius, feet) || walkway.blocksGround(x, z, radius, feet);
      },
      getGroundHeight(x, z, feet) {
        const upper = lift.getGroundHeight(x, z, feet) ?? walkway.getGroundHeight(x, z, feet);
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
        lift.update(dt, player);
        people.update(dt, still, player);
        carts.update(dt, still);
        for (const visit of exhibitVisits) {
          const interacted = visit.update(dt, player, grounded, still);
          const mission = missionById.get(visit.id);
          if (!interacted || mission.complete) continue;
          mission.current = 1;
          mission.complete = true;
          remaining--;
          if (remaining === 0) {
            if (!recorded) completeLevel(princessGallery.id);
            recorded = true;
            notify('Princess Gallery complete! You explored all ten exhibits.');
          }
        }
      },
      reset: resetVisit,
      unload() {
        released = true;
        resetVisit();
      },
    };
  },
};
