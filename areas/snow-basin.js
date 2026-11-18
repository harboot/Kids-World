import { addIceDoor } from './ice-door.js';
import { CHOPS, CHOP_COOLDOWN, FALL_DURATION, createSnowActivity } from './snow-basin/activity.js';
import { addAxe, addCastleDoor, addChopTree, addSnowPlay, showSnowmen } from './snow-basin/props.js';
import { addWinterScenery } from './snow-basin/scenery.js';

const axeSite = { x: 0.9, z: 5.9 };
const treeSite = { x: 7.5, z: -1.85 };
const piles = [
  { x: -5, z: 6.4 }, { x: 4.9, z: 6.8 }, { x: -4, z: -8.6 },
  { x: 4, z: -9.6 }, { x: -10, z: -1.4 },
];

const cues = {
  pickup: [[71, { duration: 0.14, level: 0.12 }], [79, { duration: 0.13, level: 0.10 }, 0.055]],
  chop: [[48, { duration: 0.084, endPitch: 35, attack: 0.005, level: 0.21, wave: 'triangle' }]],
  fall: [[50, { duration: 0.42, endPitch: 39, attack: 0.13, level: 0.13, wave: 'triangle' }]],
  spawn: [[43, { duration: 0.12, level: 0.18, wave: 'triangle' }],
    [72, { duration: 0.18, level: 0.11 }], [76, { duration: 0.16, level: 0.095 }, 0.07],
    [81, { duration: 0.19, level: 0.085 }, 0.135]],
  pack: [[65, { duration: 0.11, endPitch: 72, level: 0.105, wave: 'triangle' }]],
  throw: [[72, { duration: 0.12, endPitch: 55, level: 0.1 }]],
  hit: [[54, { duration: 0.13, endPitch: 37, level: 0.175, wave: 'triangle' }],
    [84, { duration: 0.12, level: 0.075 }, 0.036]],
};

export const snowBasin = {
  title: 'Snow Basin',
  heading: ['Snow', 'Basin'],
  description: 'Look for the axe near the frozen pond. The marked pine has a winter surprise!',
  canvasLabel: '3D snow basin',
  themeColor: '#e2f0f5',
  music: 'snow',
  width: 32,
  depth: 30,
  spawn: { x: 0, z: 9.4 },
  load: loadSnow,
};

function loadSnow({ THREE, scene, camera, viewmodel, touch, signal, hud, isPlaying, playCue, playerRadius = 0.34,
  isLevelComplete, completeLevel }) {
  const { width, depth } = snowBasin;
  const kit = addWinterScenery({ THREE, scene, touch, width, depth });
  const { obstacles } = kit;
  const axe = addAxe(THREE, scene, viewmodel, kit, axeSite);
  const pine = addChopTree(THREE, scene, kit, treeSite);
  const play = addSnowPlay(THREE, scene, viewmodel, kit, piles);
  const returnDoor = addIceDoor(THREE, scene, obstacles, {
    x: 0, z: -14.36, destination: 'garden', label: 'Return to Flower Garden',
  });
  let cleared = false;
  const castle = addCastleDoor(THREE, scene, kit, {
    x: -2.3, z: 13.92,
    available: () => cleared || Boolean(isLevelComplete?.('snow')),
    announce() {
      if (!panel) return;
      panel.notice.textContent = 'Frozen Castle — Coming Soon';
      noticeTime = 3;
    },
  });

  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  let noticeTime = 0;
  let impactTime = Infinity;
  let panel;
  const activity = createSnowActivity({
    width, depth, obstacles,
    clearSpot(x, z) {
      if (Math.abs(x) > width / 2 - 1.4 || Math.abs(z) > depth / 2 - 1.4) return false;
      if (Math.abs(x) < 5.7 && Math.abs(z + 0.7) < 6.0) return false;
      return !obstacles.some(obstacle => obstacle.height > 0 && Number.isFinite(obstacle.left) &&
        x >= obstacle.left - 1.02 && x <= obstacle.right + 1.02 &&
        z >= obstacle.front - 1.02 && z <= obstacle.back + 1.02);
    },
    cue(name) {
      if (name === 'spawn') {
        impactTime = 0;
        for (const [i, { x, z }] of state.targets.entries()) {
          const model = play.models[i].group;
          model.position.set(x, 0, z);
          model.rotation.y = Math.atan2(-x, 4 - z);
        }
      }
      if (name === 'hit' && state.destroyed === 5 && !cleared && !isLevelComplete?.('snow')) {
        cleared = true;
        completeLevel?.('snow');
        castle.refresh();
      }
      playCue?.(cues[name]);
      updateHUD();
    },
  });
  const { state } = activity;

  // Reserve the landing side from the final chop onward. After impact the low log replaces the upright footprint.
  obstacles.push({
    left: treeSite.x - 0.57, front: treeSite.z - 0.6, back: treeSite.z + 0.6,
    get right() { return treeSite.x + (state.tree === 'upright' ? 0.57 : 5.45); },
    get height() { return state.tree === 'upright' ? 5.3 : state.tree === 'falling' ? 2.45 : 0.79; },
    touches(x, z) {
      const dx = x - treeSite.x;
      const dz = z - treeSite.z;
      if (state.tree === 'upright') return Math.hypot(dx, dz) < 1.22 + playerRadius;
      const edge = Math.max(0, -dx, dx - 5.45);
      return Math.hypot(edge, dz) < 1.05 + playerRadius;
    },
  }, {
    left: treeSite.x + 2.09, right: treeSite.x + 8.12, front: treeSite.z - 1.93, back: treeSite.z + 1.93,
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

  function updateHUD() {
    if (!panel) return;
    const ready = state.tree === 'fallen';
    panel.progress.textContent = ready ? `Snowmen: ${state.destroyed} / 5` : `Tree: ${state.chops} / ${CHOPS} chops`;
    panel.progress.hidden = !state.axe;
    panel.complete.hidden = state.destroyed !== 5;
    panel.throwButton.hidden = !state.held;
    panel.throwKey.hidden = !state.held;
  }

  function updateModels() {
    axe.axe.visible = axe.ring.visible = !state.axe;
    axe.holder.visible = state.axe && !state.held;
    if (axe.holder.visible) {
      axe.holder.position.x = Math.min(0.28, 0.32 * (camera?.aspect ?? 1));
    }
    const swing = Math.sin(Math.PI * state.cooldown / CHOP_COOLDOWN);
    axe.holder.rotation.set(-0.93 * swing, 0.3 * swing, -0.56 * swing);
    const fall = state.fallTime / FALL_DURATION;
    const lean = fall * fall * (1 + 0.65 * (1 - fall));
    pine.tree.rotation.z = -Math.PI / 2 * lean;
    pine.shadow.position.x = treeSite.x + lean * 3.75;
    pine.shadow.scale.set(1.04 + lean * 3.25, 1, 0.91 + lean * 0.64);
    pine.setChops(state.chops);
    castle.refresh();
    play.held.visible = state.held;
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
    noticeTime = 0;
    impactTime = Infinity;
    if (panel) panel.notice.textContent = '';
    updateHUD();
    updateModels();
  }

  reset();
  return {
    obstacles,
    interactions: [
      returnDoor, castle,
      {
        ...axeSite, anchorY: 0.46, radius: 1.85, label: 'Pick up axe', silent: true,
        get active() { return !state.axe; },
        act: activity.pickUpAxe,
      },
      {
        ...treeSite, anchorY: 1.06, radius: 2.4, label: 'Chop tree', silent: true,
        reachable: player => player.x < treeSite.x - 0.18,
        get active() { return activity.canChop(); },
        act: activity.chop,
      },
      ...piles.map(site => ({
        ...site, anchorY: 0.54, radius: 2, label: 'Make snowball', silent: true,
        get active() { return activity.canMakeBall(); },
        act: activity.makeBall,
      })),
    ],
    update(dt, playerPosition) {
      activity.update(dt, playerPosition);
      if (impactTime < 0.56) impactTime += dt;
      if (noticeTime > 0) {
        noticeTime = Math.max(0, noticeTime - dt);
        if (!noticeTime) panel.notice.textContent = '';
      }
      updateModels();
    },
    reset,
    unload() {
      reset();
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
  const progress = make('p', 'snow-progress');
  progress.setAttribute('role', 'status');
  const complete = make('p', 'snow-complete', 'All snowmen cleared!');
  complete.setAttribute('role', 'status');
  const notice = make('p', 'snow-notice');
  notice.setAttribute('role', 'status');
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
  return { root, progress, complete, notice, throwKey, throwButton };
}
