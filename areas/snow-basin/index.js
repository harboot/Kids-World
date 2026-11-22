import { CHOPS, CHOP_COOLDOWN, FALL_DURATION, SNOWMAN_COUNT, THROWING_POSITION, createSnowActivity, snowMissionsComplete } from './activity.js';
import { addAxe, addIceSculpture, addChopTree, addSnowPlay, showSnowmen } from './props.js';
import { addWinterScenery } from './scenery.js';
import { addSnowTerrain } from './terrain.js';
import { addIceSlide } from './slide.js';
import { createSlideRide } from './slide-ride.js';
import { bindSnowballControls } from './snowball-controls.js';
import { addSnowCharacters } from './characters.js';
import { metadata } from './metadata.js';
import { music } from './music.js';

const axeSite = { x: 0.9, z: 5.9 };
const treeSite = { x: 7.5, z: -1.85 };
const sculptureSite = { x: -2.3, z: 13.92 };
const treeClearance = 2.72;
const landingBounds = { left: treeSite.x + 2.09, right: treeSite.x + 8.12, front: treeSite.z - 1.93, back: treeSite.z + 1.93 };
const cues = {
  pickup: [[71, { duration: 0.14, level: 0.12 }], [79, { duration: 0.13, level: 0.10 }, 0.055]],
  chop: [[48, { duration: 0.084, endPitch: 35, attack: 0.005, level: 0.21, wave: 'triangle' }]],
  fall: [[50, { duration: 0.42, endPitch: 39, attack: 0.13, level: 0.13, wave: 'triangle' }]],
  land: [[43, { duration: 0.12, level: 0.18, wave: 'triangle' }],
    [76, { duration: 0.23, level: 0.10 }, 0.13], [81, { duration: 0.28, level: 0.08 }, 0.23]],
  success: [[67, { duration: 0.25, level: 0.15 }], [71, { duration: 0.25, level: 0.13 }, 0.13],
    [74, { duration: 0.26, level: 0.13 }, 0.26], [79, { duration: 0.42, level: 0.15 }, 0.39]],
  pack: [[65, { duration: 0.11, endPitch: 72, level: 0.105, wave: 'triangle' }]],
  throw: [[72, { duration: 0.12, endPitch: 55, level: 0.1 }]],
  hit: [[54, { duration: 0.13, endPitch: 37, level: 0.175, wave: 'triangle' }],
    [84, { duration: 0.12, level: 0.075 }, 0.036]],
};

export const snowBasin = {
  ...metadata,
  music,
  load: loadSnow,
};

export default snowBasin;

function loadSnow({ THREE, scene, camera, viewmodel, touch, signal, onCleanup, hud, isPlaying, playCue, playerRadius = 0.34,
  completeLevel, isLevelComplete, isPlayerGrounded, reducedMotion, notify }) {
  const { width, depth } = snowBasin;
  const terrain = addSnowTerrain(THREE, scene, width, depth);
  const ground = terrain.getGroundHeight;
  const kit = addWinterScenery({ THREE, scene, touch, width, depth, ground, document: hud?.ownerDocument });
  const { obstacles } = kit;
  const slide = addIceSlide(THREE, scene, kit, ground);
  const characters = addSnowCharacters({ THREE, scene, kit, ground, playerRadius, reducedMotion, playCue, notify });
  const axe = addAxe(THREE, scene, viewmodel, kit, axeSite);
  const pine = addChopTree(THREE, scene, kit, treeSite);
  const treeBoundary = new THREE.Mesh(new THREE.RingGeometry(treeClearance - 0.045, treeClearance, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x315e76, toneMapped: false }));
  treeBoundary.name = 'Pine clearance';
  treeBoundary.position.set(treeSite.x, 0.041, treeSite.z);
  scene.add(treeBoundary);
  const play = addSnowPlay(THREE, scene, viewmodel, kit);
  addIceSculpture(THREE, scene, kit, sculptureSite);

  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  let impactTime = Infinity;
  let completionReported = false;
  const activity = createSnowActivity({
    width, depth, obstacles,
    cue(name) {
      if (name === 'land') impactTime = 0;
      playCue?.(cues[name]);
      if (name === 'hit' || name === 'land') finishLevel();
    },
  });
  const { state } = activity;
  const ride = createSlideRide({
    THREE, camera, gate: slide.gate, ground, signal, isPlayerGrounded, reducedMotion, playCue, onLanding: finishLevel,
  });
  const missions = {
    get pine() { return activity.missions.pine; },
    get snowmen() { return activity.missions.snowmen; },
    get slide() { return ride.completed; },
  };

  function finishLevel() {
    if (completionReported || !snowMissionsComplete(missions)) return;
    completionReported = true;
    if (!isLevelComplete?.('snow')) completeLevel?.('snow');
    playCue?.(cues.success);
    notify?.('Snow Basin complete!');
  }

  // Reserve the landing side from the final chop onward. After impact the low log replaces the upright footprint.
  obstacles.push({
    left: treeSite.x - 0.57, front: treeSite.z - 0.6, back: treeSite.z + 0.6,
    get right() { return treeSite.x + (state.tree === 'upright' ? 0.57 : 5.45); },
    get height() { return state.tree === 'upright' ? 5.3 : state.tree === 'falling' ? 2.45 : 0.79; },
    touches(x, z) {
      const dx = x - treeSite.x;
      const dz = z - treeSite.z;
      if (state.tree !== 'fallen' && Math.hypot(dx, dz) < treeClearance) return true;
      if (state.tree === 'upright') return false;
      const edge = Math.max(0, -dx, dx - 5.45);
      return Math.hypot(edge, dz) < 1.05 + playerRadius;
    },
  }, {
    ...landingBounds,
    get height() { return state.tree === 'upright' ? 0 : 1.93; },
    touches(x, z) {
      const dx = Math.max(0, this.left - x, x - this.right);
      const dz = Math.max(0, this.front - z, z - this.back);
      return Math.hypot(dx, dz) < 0.47 + playerRadius;
    },
  });
  for (const [i, { x, z }] of state.targets.entries()) {
    const model = play.models[i].group;
    model.position.set(x, 0, z);
    model.rotation.y = Math.atan2(THROWING_POSITION.x - x, THROWING_POSITION.z - z);
    obstacles.push({
      get height() { return state.targets[i].intact ? 1.95 : 0; },
      touches(px, pz) {
        return Math.hypot(px - x, pz - z) < 0.80;
      },
    });
  }

  function throwBall() {
    if (!isPlaying?.() || ride.riding || !state.held) return false;
    const thrown = activity.throwBall(camera.getWorldPosition(origin), camera.getWorldDirection(direction));
    updateHeldBall();
    return thrown;
  }

  const panel = hud && bindSnowballControls(hud, signal, throwBall);
  if (panel) onCleanup?.(panel.dispose);

  function updateHeldBall() {
    play.held.visible = state.held;
    panel?.show(state.held);
  }

  function updateModels() {
    axe.axe.visible = axe.ring.visible = !state.axe;
    treeBoundary.visible = state.tree !== 'fallen';
    const fall = state.fallTime / FALL_DURATION;
    const swinging = state.cooldown > 0;
    axe.holder.visible = state.axe && (!state.held || swinging);
    if (axe.holder.visible) {
      axe.holder.position.x = Math.min(0.28, 0.32 * (camera?.aspect ?? 1));
      const lowered = Math.min(1, fall * 7, (1 - fall) * 10);
      axe.holder.position.y = -0.37 - 0.56 * lowered;
    }
    const swing = Math.sin(Math.PI * state.cooldown / CHOP_COOLDOWN);
    axe.holder.rotation.set(-0.93 * swing, 0.3 * swing, -0.56 * swing);
    const lean = fall * fall * (1 + 0.65 * (1 - fall));
    pine.tree.rotation.z = -Math.PI / 2 * lean;
    pine.shadow.position.x = treeSite.x + lean * 3.75;
    pine.shadow.scale.set(1.04 + lean * 3.25, 1, 0.91 + lean * 0.64);
    pine.setChops(state.chops);
    updateHeldBall();
    showSnowmen(play.models, state.targets);
    for (let i = 0; i < play.balls.length; i++) {
      const ball = state.projectiles[i];
      play.balls[i].visible = ball.active;
      if (ball.active) play.balls[i].position.set(ball.x, ball.y, ball.z);
    }
    for (let i = 0; i < play.puff.length; i++) {
      const part = play.puff[i];
      part.visible = impactTime < 0.56;
      if (!part.visible) continue;
      const angle = i * 2.39996;
      part.position.set(treeSite.x + 5.8 + Math.cos(angle) * (0.34 + impactTime * 3.8),
        0.16 + Math.sin(impactTime / 0.56 * Math.PI) * (0.45 + i * 0.062),
        treeSite.z + Math.sin(angle) * (0.28 + impactTime * 2.9));
      part.scale.setScalar(0.24 * (1 - impactTime / 0.56));
    }
  }

  function reset() {
    activity.reset();
    ride.reset();
    characters.reset();
    impactTime = Infinity;
    updateModels();
  }

  const missionStatus = {
    missions: [
      {
        id: 'pine', title: 'Chop Down the Pine', total: CHOPS,
        get current() { return state.chops; },
        get complete() { return missions.pine; },
      },
      {
        id: 'snowmen', title: 'Snowball Challenge', total: SNOWMAN_COUNT,
        get current() { return state.destroyed; },
        get complete() { return missions.snowmen; },
      },
      {
        id: 'slide', title: 'Ice Slide Adventure', total: 1,
        get current() { return Number(missions.slide); },
        get complete() { return missions.slide; },
      },
    ],
    get hint() {
      if (snowMissionsComplete(missions)) return 'Snow Basin complete!';
      if (state.tree === 'falling') return 'Watch the pine fall.';
      if (ride.riding) return 'Ride the ice slide to the landing.';
      if (state.held) return 'Aim and throw at the snowmen.';
      if (!missions.slide && ride.interaction.reachable(camera?.position)) return 'Slide down from the summit.';
      if (!missions.pine) return state.axe ? 'Chop the pine from the pond side.' : 'Find the axe by the frozen lake.';
      if (!missions.snowmen) return 'Approach the snow pile in the west to pick up a snowball.';
      return 'Follow the mountain trail to the ice slide.';
    },
  };
  return {
    obstacles,
    getGroundHeight: ground,
    blocksGround(x, z, radius, feet) {
      return terrain.blocksGround(x, z, radius) || slide.blocksGround(x, z, radius, feet);
    },
    get missionStatus() { return missionStatus; },
    interactions: [
      {
        ...axeSite, anchorY: 0.46, radius: 1.85, label: 'Pick up axe', silent: true,
        get active() { return !state.axe; },
        act: activity.pickUpAxe,
      },
      {
        ...treeSite, anchorY: 2.85, label: 'Chop tree', radius: 8.7, requiresView: true, silent: true,
        reachable(player) {
          const west = treeSite.x - player.x;
          const distance = Math.hypot(west, treeSite.z - player.z);
          // Give the camera room to see the pine and keep the landing side clear.
          return distance >= 5.8 && west >= distance * 0.45;
        },
        get active() { return activity.canChop(); },
        act: activity.chop,
      },
      ride.interaction,
      ...characters.interactions,
    ],
    update(dt, player) {
      activity.update(dt, player);
      characters.update(dt);
      ride.update(dt);
      if (impactTime < 0.56) impactTime += dt;
      updateModels();
    },
    reset,
    unload() {
      ride.cancel();
      if (!onCleanup) panel?.dispose();
    },
  };
}
