import { CHOPS, CHOP_COOLDOWN, FALL_DURATION, SNOWMAN_COUNT, createSnowActivity, snowMissionsComplete } from './snow-basin/activity.js';
import { addAxe, addIceSculpture, addChopTree, addFrozenKey, addSnowPlay, showSnowmen } from './snow-basin/props.js';
import { addWinterScenery } from './snow-basin/scenery.js';

const axeSite = { x: 0.9, z: 5.9 };
const treeSite = { x: 7.5, z: -1.85 };
const keySite = { x: 6.32, z: 0.43 };
const sculptureSite = { x: -2.3, z: 13.92 };
const treeClearance = 2.72;
const landingBounds = { left: treeSite.x + 2.09, right: treeSite.x + 8.12, front: treeSite.z - 1.93, back: treeSite.z + 1.93 };
const piles = [
  { x: -5, z: 6.4 }, { x: 4.9, z: 6.8 }, { x: -4, z: -8.6 },
  { x: 4, z: -9.6 }, { x: -10, z: -1.4 },
];

const cues = {
  pickup: [[71, { duration: 0.14, level: 0.12 }], [79, { duration: 0.13, level: 0.10 }, 0.055]],
  chop: [[48, { duration: 0.084, endPitch: 35, attack: 0.005, level: 0.21, wave: 'triangle' }]],
  fall: [[50, { duration: 0.42, endPitch: 39, attack: 0.13, level: 0.13, wave: 'triangle' }]],
  land: [[43, { duration: 0.12, level: 0.18, wave: 'triangle' }],
    [76, { duration: 0.23, level: 0.10 }, 0.13], [81, { duration: 0.28, level: 0.08 }, 0.23]],
  key: [[81, { duration: 0.17, level: 0.13 }], [86, { duration: 0.29, level: 0.13 }, 0.09]],
  success: [[67, { duration: 0.25, level: 0.15 }], [71, { duration: 0.25, level: 0.13 }, 0.13],
    [74, { duration: 0.26, level: 0.13 }, 0.26], [79, { duration: 0.42, level: 0.15 }, 0.39]],
  pack: [[65, { duration: 0.11, endPitch: 72, level: 0.105, wave: 'triangle' }]],
  throw: [[72, { duration: 0.12, endPitch: 55, level: 0.1 }]],
  hit: [[54, { duration: 0.13, endPitch: 37, level: 0.175, wave: 'triangle' }],
    [84, { duration: 0.12, level: 0.075 }, 0.036]],
};

export const snowBasin = {
  title: 'Snow Basin',
  heading: ['Snow', 'Basin'],
  description: 'Throw snowballs at three snowmen and chop the pine from the pond side. Find the Frozen Key after the tree falls.',
  canvasLabel: '3D snow basin',
  themeColor: '#e2f0f5',
  music: 'snow',
  width: 32,
  depth: 30,
  spawn: { x: 0, z: 9.4 },
  load: loadSnow,
};

function loadSnow({ THREE, scene, camera, viewmodel, touch, signal, hud, isPlaying, playCue, playerRadius = 0.34,
  completeLevel, reducedMotion, notify }) {
  const { width, depth, spawn } = snowBasin;
  const kit = addWinterScenery({ THREE, scene, touch, width, depth });
  const { obstacles } = kit;
  const axe = addAxe(THREE, scene, viewmodel, kit, axeSite);
  const pine = addChopTree(THREE, scene, kit, treeSite);
  const treeBoundary = new THREE.Mesh(new THREE.RingGeometry(treeClearance - 0.045, treeClearance, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x315e76, toneMapped: false }));
  treeBoundary.name = 'Pine clearance';
  treeBoundary.position.set(treeSite.x, 0.041, treeSite.z);
  scene.add(treeBoundary);
  const play = addSnowPlay(THREE, scene, viewmodel, kit, piles);
  const key = addFrozenKey(THREE, scene, kit, keySite);
  addIceSculpture(THREE, scene, kit, sculptureSite);

  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  let impactTime = Infinity;
  let keyTime = 0;
  let panel;
  const activity = createSnowActivity({
    width, depth, spawn, obstacles,
    clearSpot(x, z) {
      if (Math.abs(x) > width / 2 - 1.4 || Math.abs(z) > depth / 2 - 1.4) return false;
      if (Math.abs(x) < 5.7 && Math.abs(z + 0.7) < 6.0) return false;
      if (Math.hypot(x - treeSite.x, z - treeSite.z) < treeClearance + 1.02 ||
          Math.hypot(x - keySite.x, z - keySite.z) < 2.0) return false;
      const near = ({ left, right, front, back }) =>
        x >= left - 1.02 && x <= right + 1.02 && z >= front - 1.02 && z <= back + 1.02;
      return !near(landingBounds) && !obstacles.some(near);
    },
    cue(name) {
      if (name === 'land') impactTime = 0;
      if (name === 'key') key.model.visible = false;
      playCue?.(cues[name]);
      if ((name === 'hit' || name === 'key') && snowMissionsComplete(missions)) {
        completeLevel?.('snow');
        playCue?.(cues.success);
        notify?.(name === 'key' ? 'Frozen Key collected! Snow Basin complete!' : 'Snow Basin complete!');
      } else if (name === 'key') notify?.('Frozen Key collected!');
      updateThrowControls();
    },
  });
  const { state, missions } = activity;

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
  for (let i = 0; i < play.models.length; i++) {
    obstacles.push({
      get height() { return state.targets[i]?.intact ? 1.95 : 0; },
      touches(x, z) {
        const target = state.targets[i];
        return Boolean(target?.intact && Math.hypot(x - target.x, z - target.z) < 0.80);
      },
    });
  }

  function throwBall() {
    if (!isPlaying?.() || !state.held) return false;
    return activity.throwBall(camera.getWorldPosition(origin), camera.getWorldDirection(direction));
  }

  if (hud) panel = addSnowHud(hud, signal, throwBall);

  function updateThrowControls() {
    if (!panel) return;
    panel.throwButton.hidden = !state.held;
    panel.throwKey.hidden = !state.held;
  }

  function updateModels(dt = 0) {
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
    play.held.visible = state.held && !swinging;
    key.model.visible = activity.canPickUpKey();
    if (key.model.visible) {
      if (!reducedMotion?.()) keyTime += dt;
      key.pose(keyTime);
    }
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
    for (const [i, { x, z }] of state.targets.entries()) {
      const model = play.models[i].group;
      model.position.set(x, 0, z);
      model.rotation.y = Math.atan2(-x, 4 - z);
    }
    impactTime = Infinity;
    keyTime = 0;
    updateThrowControls();
    updateModels();
  }

  const missionStatus = {
    missions: [
      {
        id: 'snowmen', title: 'Destroy snowmen', total: SNOWMAN_COUNT,
        get current() { return state.destroyed; },
        get complete() { return missions.snowmen; },
      },
      {
        id: 'pine', title: 'Chop down the pine', total: CHOPS,
        get current() { return state.chops; },
        get complete() { return missions.tree; },
      },
      {
        id: 'key', title: 'Collect the Frozen Key', total: 1,
        get current() { return Number(missions.key); },
        get complete() { return missions.key; },
      },
    ],
    get hint() {
      if (state.tree === 'falling') return 'Watch the pine fall';
      if (missions.tree && !missions.key) return 'Find the key near the fallen pine';
      if (state.held && !missions.snowmen) return 'Throw at a snowman';
      if (!missions.tree && state.axe) return 'Chop from the pond side';
      if (!missions.snowmen) return 'Make a snowball';
      if (!missions.tree) return 'Find the axe';
      return '';
    },
  };
  return {
    obstacles,
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
      {
        ...keySite, anchorY: 0.59, radius: 1.7, label: 'Pick up Frozen Key', silent: true,
        get active() { return activity.canPickUpKey(); },
        act: activity.pickUpKey,
      },
      ...piles.map(site => ({
        ...site, anchorY: 0.54, radius: 2, label: 'Make snowball', silent: true,
        get active() { return activity.canMakeBall(); },
        act: activity.makeBall,
      })),
    ],
    update(dt) {
      activity.update(dt);
      if (impactTime < 0.56) impactTime += dt;
      updateModels(dt);
    },
    reset,
    unload() {
      panel?.root.remove();
    },
  };
}

function addSnowHud(hud, signal, throwBall) {
  const document = hud.ownerDocument;
  const root = document.createElement('div');
  root.className = 'snow-activity';
  const make = (tag, className, text = '') => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    root.append(element);
    return element;
  };
  const throwKey = make('p', 'snow-throw-key', 'F to throw');
  const throwButton = make('button', 'snow-throw', 'Throw');
  throwButton.type = 'button';

  document.defaultView.addEventListener('keydown', event => {
    if (event.code === 'KeyF' && !event.repeat && throwBall()) event.preventDefault();
  }, { signal });
  throwButton.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && throwBall()) event.preventDefault();
  }, { signal });
  throwButton.addEventListener('click', throwBall, { signal });
  hud.append(root);
  return { root, throwKey, throwButton };
}
