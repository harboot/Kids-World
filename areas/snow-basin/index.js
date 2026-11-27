import { CHOPS, CHOP_COOLDOWN, FALL_DURATION, SNOWMAN_COUNT, THROWING_POSITION, createSnowActivity, snowMissionsComplete } from './activity.js';
import { addAxe, addIceSculpture, addChopTree, addSnowPlay, showSnowmen } from './props.js';
import { createTrollGathering } from './trolls.js';
import { createOlafNose } from './olaf-nose.js';
import { createMarshmallow } from './marshmallow.js';
import { createCabin } from './cabin.js';
import { addWinterScenery } from './scenery.js';
import { addSnowTerrain } from './terrain.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { createSkating, SKATE_CHECKPOINTS } from './skating.js';
import { ICE_TOWER, addIceTower } from './ice-tower.js';
import { addIceSlide } from './slide.js';
import { createSlideRide } from './slide-ride.js';
import { bindSnowballControls } from './snowball-controls.js';
import { addSnowCharacters } from './characters.js';
import { metadata } from './metadata.js';
import { music } from './music.js';
import { SURFACE_GAP } from '../../core/geometry.js';

const axeSite = { x: 0.9, z: 5.9 };
const treeSite = { x: 7.5, z: -1.85 };
const sculptureSite = { x: -2.3, z: 13.92 };
const treeClearance = 2.9;
const chopRadius = 4.35;
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
  const cabin = createCabin({ THREE, scene, kit, ground, reducedMotion, playCue, notify, onComplete: finishLevel });
  const slide = addIceSlide(THREE, scene, kit, ground);
  const tower = addIceTower(THREE, scene, kit, { camera, ground, signal, isPlayerGrounded, reducedMotion, playCue });
  let fedSven = false;
  let reachedTower = false;
  const skating = createSkating({ THREE, scene, ground, terrain, playCue, notify, onComplete: finishLevel });
  const characters = addSnowCharacters({
    THREE, scene, kit, ground, playerRadius, reducedMotion, playCue, notify,
    onFeedSven() {
      fedSven = true;
      finishLevel();
    },
  });
  const olafNose = createOlafNose({ THREE, scene, kit, ground, characters, reducedMotion, playCue, notify, onComplete: finishLevel });
  const trolls = createTrollGathering({ THREE, scene, kit, ground, reducedMotion, playCue, notify, playerRadius, onComplete: finishLevel });
  const marshmallow = createMarshmallow({ THREE, scene, kit, ground, reducedMotion, playCue, notify, playerRadius, onComplete: finishLevel });
  const axe = addAxe(THREE, scene, viewmodel, kit, axeSite);
  const pine = addChopTree(THREE, scene, kit, treeSite);
  const treeBoundary = new THREE.Mesh(new THREE.RingGeometry(treeClearance - 0.045, treeClearance, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x315e76, toneMapped: false }));
  treeBoundary.name = 'Pine clearance';
  treeBoundary.position.set(treeSite.x, SURFACE_GAP.roof, treeSite.z);
  const boundaryPoints = treeBoundary.geometry.getAttribute('position');
  for (let i = 0; i < boundaryPoints.count; i++) {
    boundaryPoints.setY(i, ground(treeSite.x + boundaryPoints.getX(i), treeSite.z + boundaryPoints.getZ(i)));
  }
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
      if (name === 'land') {
        impactTime = 0;

      }
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
    get olaf() { return olafNose.complete; },
    get sven() { return fedSven; },
    get tower() { return reachedTower; },
    get skating() { return skating.complete; },
    get cabin() { return cabin.complete; },
    get marshmallow() { return marshmallow.complete; },
    get trolls() { return trolls.complete; },
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
    if (!isPlaying?.() || ride.riding || tower.riding || !state.held) return false;
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

  function canReachTree(player) {
    if (!player) return false;
    const west=treeSite.x-player.x;
    const distance=Math.hypot(west,treeSite.z-player.z);
    return distance<=chopRadius && west>=distance*.45 &&
      (player.y===undefined||Math.abs(player.y-EYE_HEIGHT-ground(player.x,player.z))<.8);
  }
  function equipNearbyAxe(player) {
    if(state.tree==='upright')state.axe=canReachTree(player);
    else if(state.tree==='fallen')state.axe=false;
  }

  function poseHeldAxe(fall) {
    const holder = axe.holder;
    const swinging = state.cooldown > 0;
    holder.visible = state.axe && (!state.held || swinging) && !ride.riding && !tower.riding;
    const restX = Math.min(0.28, 0.32 * (camera?.aspect ?? 1));
    const progress = swinging ? 1 - state.cooldown / CHOP_COOLDOWN : 1;
    let side = 1;
    if (progress < 0.2) {
      side += 0.32 * THREE.MathUtils.smoothstep(progress, 0, 0.2);
    } else if (progress < 0.68) {
      side = 1.32 - 2.47 * THREE.MathUtils.smoothstep(progress, 0.2, 0.68);
    } else {
      side = -1.15 + 2.15 * THREE.MathUtils.smoothstep(progress, 0.68, 1);
    }
    const swing = Math.sin(Math.PI * progress);
    const lowered = Math.min(1, fall * 7, (1 - fall) * 10);
    holder.position.set(restX * side, -0.37 + swing * 0.14 - 0.56 * lowered, -0.88 - swing * 0.16);
    holder.rotation.set(-0.24 * swing, 0.57 * (side - 1), -0.36 * (side - 1));
  }

  function updateModels() {
    axe.axe.visible = false;
    axe.ring.visible = false;
    treeBoundary.visible = state.tree !== 'fallen';
    const fall = state.fallTime / FALL_DURATION;
    poseHeldAxe(fall);
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
    tower.reset();
    characters.reset();
    olafNose.reset();
    marshmallow.reset();
    trolls.reset();
    fedSven = false;
    reachedTower = false;
    skating.reset();
    cabin.reset();

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
      {
        id: 'olaf', title: "Olaf's Missing Nose", total: 1,
        get current() { return Number(missions.olaf); },
        get complete() { return missions.olaf; },
      },
      {
        id: 'sven', title: 'Feed Sven', total: 1,
        get current() { return Number(missions.sven); },
        get complete() { return missions.sven; },
      },
      {
        id: 'tower', title: 'Ice Tower Lookout', total: 1,
        get current() { return Number(missions.tower); },
        get complete() { return missions.tower; },
      },
      {
        id: 'skating', title: 'Ice Skating Challenge', total: SKATE_CHECKPOINTS.length,
        get current() { return skating.current; },
        get complete() { return missions.skating; },
      },
      {
        id: 'cabin', title: 'Warm Up the Cabin', total: 1,
        get current() { return Number(missions.cabin); },
        get complete() { return missions.cabin; },
      },
      {
        id: 'marshmallow', title: 'Meet Marshmallow', total: 1,
        get current() { return Number(missions.marshmallow); },
        get complete() { return missions.marshmallow; },
      },
      {
        id: 'trolls', title: 'Troll Gathering', total: 1,
        get current() { return Number(missions.trolls); },
        get complete() { return missions.trolls; },
      },
    ],
    get hint() {
      if (snowMissionsComplete(missions)) return 'Snow Basin complete!';
      if (state.tree === 'falling') return 'Watch the pine fall.';
      if (ride.riding || tower.riding) return 'Ride the ice slide to the landing.';
      if (tower.interaction.active && tower.atTop(camera?.position)) return 'Slide down Ice Tower.';
      if (state.held) return 'Aim and throw at the snowmen.';
      if (!missions.slide && ride.interaction.reachable(camera?.position)) return 'Slide down from the summit.';
      if (!missions.pine) return state.axe ? 'Chop the pine from the pond side.' : 'Approach the marked pine from the pond side to equip the axe.';
      if (!missions.snowmen) return 'Approach the snow pile in the west to pick up a snowball.';
      if (!missions.slide) return 'Follow the mountain trail to the ice slide.';
      if (!missions.olaf) return olafNose.carrying ? 'Bring the carrot back to Olaf.' : "Find Olaf's glowing carrot in the northwest snowfield.";
      if (!missions.sven) return 'Offer Sven a carrot near the winter cabin.';
      if (!missions.tower) return 'Climb the spiral stairs to the top of Ice Tower.';
      if (!missions.skating) return skating.equipped ? 'Skate through three golden rings on the frozen lake.' : 'Put on the ice skates by the frozen lake.';
      if (!missions.cabin) return 'Enter the winter cabin and light the fireplace.';
      if (!missions.marshmallow) return 'Visit the giant snow mound near the southern ice hill.';
      return 'Climb the large flat rock in the northeast clearing to wake the trolls.';
    },
  };
  return {
    obstacles,
    getGroundHeight: (x, z, feet) => Math.max(ground(x, z), tower.surface(x, z, feet) ?? -Infinity, trolls.surface(x, z) ?? -Infinity),
    getGroundTraction: skating.getGroundTraction,
    blocksGround(x, z, radius, feet, from) {
      return terrain.blocksGround(x, z, radius) || slide.blocksGround(x, z, radius, feet) ||
        tower.blocksGround(x, z, radius, feet, from);
    },
    get missionStatus() { return missionStatus; },
    interactions: [
      {
        ...treeSite, anchorY: 2.85, label: 'Chop tree', radius: chopRadius, requiresView: true, silent: true,
        reachable: canReachTree,
        get active() { return activity.canChop(); },
        act: activity.chop,
      },
      tower.interaction,
      ride.interaction,
      characters.interaction,
      skating.interaction,
      cabin.interaction,
      ...olafNose.interactions,
    ],
    update(dt, player) {
      const riding=ride.riding||tower.riding;
      equipNearbyAxe(riding?undefined:player);
      activity.update(dt, riding?undefined:player);
      characters.update(dt, riding ? undefined : player);
      if (!riding && player && (isPlayerGrounded?.() ?? true)) {
        const feet = player.y - EYE_HEIGHT;
        if (!reachedTower && Math.abs(feet - ICE_TOWER.deckHeight) < 0.15 &&
            tower.surface(player.x, player.z, feet) === ICE_TOWER.deckHeight) {
          reachedTower = true;
          notify?.('Ice Tower Lookout complete!');
          finishLevel();
        }
        skating.update(player, true);
      }
      olafNose.update(dt, riding?undefined:player, isPlayerGrounded?.()??true);
      tower.update(dt, riding?undefined:player);
      marshmallow.update(dt, riding ? undefined : player);
      trolls.update(dt, riding ? undefined : player, isPlayerGrounded?.() ?? true);
      cabin.update(dt);
      ride.update(dt);
      if (impactTime < 0.56) impactTime += dt;
      updateModels();
    },
    reset,
    unload() {
      ride.cancel();
      tower.cancel();
      if (!onCleanup) panel?.dispose();
    },
  };
}
