import { renderAreaList } from './area-picker.js';
import { isPublicArea, validateAreaRegistry } from './area-registry.js';
import { createAudio } from './audio.js';
import { createControls } from './controls.js';
import { createDroneView, isDroneView, replaceDroneView } from './drone-view.js';
import { createFrameMeter, isFpsView } from './frame-meter.js';
import { createMissionHud } from './hud.js';
import { createInteractions } from './interactions.js';
import { createLevelProgress } from './level-progress.js';
import { PLAYER_RADIUS } from './movement.js';
import { createPlayer } from './player.js';
import { createView } from './renderer.js';
import { areaURL, createWorldManager, resolveArea } from './world-manager.js';

const areaKey = 'kids-world-last-area';

function savedArea() {
  try {
    return localStorage.getItem(areaKey);
  } catch {
    return null;
  }
}

function rememberArea(areas, id) {
  if (!isPublicArea(areas, id)) return;
  try {
    localStorage.setItem(areaKey, id);
  } catch {
    // Exploration still works in browsers that block local storage.
  }
}

export async function createGame({ game, loadThree, areas, defaultArea }) {
  validateAreaRegistry(areas);

  const canvas = game.querySelector('#view');
  const start = game.querySelector('#start');
  const startLabel = game.querySelector('#start-label');
  const droneEntry = game.querySelector('#open-drone');
  const chooseLevel = game.querySelector('#choose-level');
  const levelPicker = game.querySelector('#level-picker');
  const areaList = game.querySelector('#area-list');
  const restart = game.querySelector('#restart');
  const menuMessage = game.querySelector('#menu-message');
  const notice = game.querySelector('#notice');
  const heading = game.querySelector('#menu-title');
  const areaName = game.querySelector('.wordmark small');
  const missionHud = createMissionHud(game);
  const frameMeter = createFrameMeter(game.querySelector('#fps-meter'));
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = document.querySelector('meta[name="theme-color"]');
  const touchDevice = matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
  game.dataset.input = touchDevice ? 'touch' : 'mouse';

  let drone;
  let route;
  let transition;
  let finishStartup;
  const ready = new Promise(resolve => { finishStartup = resolve; });
  const playing = () => game.dataset.state === 'playing';
  const playerInput = () => playing() && !drone?.camera;
  const touchMode = () => game.dataset.input === 'touch';

  function showError(message) {
    drone?.stop();
    droneEntry.hidden = true;
    missionHud.reset();
    game.dataset.state = 'error';
    menuMessage.textContent = message;
    notice.textContent = '';
    start.hidden = true;
    restart.disabled = true;
    chooseLevel.disabled = true;
  }

  function showArea(id) {
    const definition = areas[id];
    game.dataset.level = id;
    areaName.textContent = definition.title;
    document.title = `Kids World — ${definition.title}`;
    theme.content = definition.themeColor;
    canvas.setAttribute('aria-label', definition.canvasLabel);
    heading.firstChild.textContent = definition.heading[0] + ' ';
    heading.querySelector('span').textContent = definition.heading[1];
    menuMessage.textContent = definition.description;
  }

  const restoringHistory = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  const initialURL = new URL(location.href);
  const initialArea = resolveArea(initialURL, areas, defaultArea, restoringHistory ? null : savedArea());
  showArea(initialArea);
  notice.textContent = areas[initialArea].loadingMessage ?? `Loading ${areas[initialArea].title}…`;

  let THREE;
  try {
    THREE = await loadThree();
  } catch (error) {
    console.error(error);
    showError('Three.js failed to load. Check your internet connection and reload the page.');
    return;
  }

  let view;
  try {
    view = createView(THREE, {
      game, canvas, fullscreen: game.querySelector('#fullscreen'), touchDevice,
      contextLost() {
        cancelTransition();
        stopPlaying();
        showError('The WebGL context was lost. Reload the page to continue exploring.');
        finishStartup();
      },
    });
  } catch {
    showError('WebGL 2 is unavailable. Try a browser with hardware acceleration enabled.');
    return;
  }

  const { camera } = view;
  const audio = createAudio(game.querySelector('#sound'));
  const progress = createLevelProgress(areas);
  const player = createPlayer(THREE, camera);
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: touchDevice, playerRadius: PLAYER_RADIUS,
    services: {
      hud: game, isPlaying: playerInput, playCue: audio.playCue, notify: missionHud.notify,
      reducedMotion: () => motionPreference.matches,
      isPlayerGrounded: () => player.grounded,
      carryPlayer: player.carryVertically,
      isLevelComplete: progress.has,
      completeLevel(id) {
        progress.complete(id);
        view.sceneChanged();
      },
    },
  });
  const interactions = createInteractions(THREE, {
    button: game.querySelector('#interaction'),
    glyph: game.querySelector('#interaction-glyph'),
    label: game.querySelector('#interaction-label'),
    camera, playing: () => playerInput() && !player.guided, touchMode,
    runAction(item) {
      if (!item.silent) audio.effect('interact');
      item.act({ sit, guideCamera, relocate });
    },
  });
  const controls = createControls(THREE, {
    game, canvas, joystick: game.querySelector('#joystick'), thumb: game.querySelector('#joystick-thumb'),
    playing: playerInput, touchMode, seated: () => player.seated,
    look: player.look, interact: interactions.interact,
    jump() { if (player.jump()) audio.effect('jump'); },
    pause() { menu(true); },
  });
  let previousFrame = null;

  function syncFrameMeter() {
    frameMeter.setActive(Boolean(route?.fps && playerInput() && !document.hidden));
  }

  function syncView(url = new URL(location.href)) {
    const visit = worlds.active;
    route = { drone: isDroneView(url), fps: isFpsView(url) };
    if (route.drone) {
      drone ??= createDroneView(THREE, {
        game, canvas, aspect: () => camera.aspect, enabled: playing, invalidate: view.invalidate,
        exit() { changeDroneView(false); },
      });
      drone.start(visit);
      controls.clear();
      controls.releaseMouse();
      interactions.hide();
    } else drone?.stop();
    droneEntry.hidden = !drone || route.drone;
    syncFrameMeter();
  }

  function changeDroneView(enabled) {
    replaceDroneView(new URL(location.href), history, enabled);
    syncView();
  }

  function stopPlaying() {
    frameMeter.setActive(false);
    audio.setPlaying(false);
    controls.clear();
    controls.releaseMouse();
    drone?.cancelGesture();
    player.stop();
    interactions.hide();
  }

  function menu(paused) {
    game.dataset.state = paused ? 'paused' : 'menu';
    stopPlaying();
    start.hidden = false;
    start.disabled = false;
    restart.disabled = false;
    chooseLevel.disabled = false;
    startLabel.textContent = paused ? 'Resume exploring' : 'Explore';
    menuMessage.textContent = paused ? 'Take a break, then continue exploring.' : worlds.active.definition.description;
    notice.textContent = '';
    view.invalidate();
    if (!paused) syncView();
  }

  function relocate(spawn) {
    controls.clear();
    player.reset(spawn, worlds.active.area);
  }

  function prepareVisit() {
    const { definition, area } = worlds.active;
    player.reset(definition.spawn, area);
    delete game.dataset.seated;
    interactions.setItems(area.interactions ?? []);
    missionHud.update(area.missionStatus);
  }

  function clearVisitPresentation() {
    if (levelPicker.open) levelPicker.close();
    missionHud.reset();
    drone?.stop();
  }

  function resetArea() {
    if (transition || !worlds.active) return;
    clearVisitPresentation();
    worlds.reset();
    prepareVisit();
    menu(false);
  }

  function cancelTransition() {
    transition = undefined;
    worlds.cancelLoad();
  }

  async function enterArea(id, historyMode) {
    if (transition?.id === id) {
      // A history navigation to the same pending area already chose its URL.
      transition.historyMode = historyMode;
      return;
    }
    const request = { id, historyMode };
    transition = request;
    game.dataset.state = 'traveling';
    stopPlaying();
    if (levelPicker.open) levelPicker.close();
    drone?.stop();
    droneEntry.hidden = true;
    start.hidden = true;
    start.disabled = true;
    restart.disabled = true;
    chooseLevel.disabled = true;
    notice.textContent = areas[id].loadingMessage ?? `Loading ${areas[id].title}…`;
    view.invalidate();

    try {
      const visit = await worlds.load(id);
      if (transition !== request || !visit) return;
      clearVisitPresentation();
      prepareVisit();
      audio.setScore(visit.definition.music);
      view.sceneChanged();
      showArea(id);
      if (request.historyMode) history[request.historyMode](null, '', areaURL(new URL(location.href), id));
      rememberArea(areas, id);
      menu(false);
    } catch (error) {
      if (transition !== request) return;
      console.error(error);
      const { title, show } = areas[id];
      const message = show ? `${title} could not load.` : navigator.onLine === false
        ? `${title} is unavailable offline. Connect to the internet and reload.`
        : `${title} is unavailable for this release. Reload to check for an update.`;
      if (worlds.active && worlds.active.id !== id) {
        const url = new URL(location.href);
        if (!request.historyMode && resolveArea(url, areas, defaultArea) !== worlds.active.id) {
          history.replaceState(null, '', areaURL(url, worlds.active.id));
        }
        menu(false);
        notice.textContent = `${message} You can keep exploring ${worlds.active.definition.title}.`;
      } else {
        showError(show ? `${message} Reload the page to try again.` : message);
      }
    } finally {
      if (transition === request) {
        transition = undefined;
        finishStartup();
      }
    }
  }

  chooseLevel.addEventListener('click', () => {
    if (levelPicker.open || !worlds.active || transition || game.dataset.state === 'error') return;
    if (playing()) menu(true);
    progress.refresh();
    renderAreaList(areaList, {
      areas, progress, current: worlds.active.id,
      select(id) {
        if (id === worlds.active.id) levelPicker.close();
        else enterArea(id, 'pushState');
      },
    });
    levelPicker.showModal();
  });

  function guideCamera(look) {
    const visit = worlds.active;
    const stop = player.guide(look);
    game.dataset.seated = 'true';
    controls.clear();
    interactions.hide();
    return spawn => {
      if (!stop()) return;
      delete game.dataset.seated;
      if (worlds.active === visit) relocate(spawn);
    };
  }

  function sit(pose, standLabel) {
    player.sit(pose);
    game.dataset.seated = 'true';
    controls.clear();
    interactions.pin({
      label: standLabel,
      act() {
        player.stand();
        delete game.dataset.seated;
        controls.clear();
        interactions.pin(null);
      },
    });
  }

  function startPlaying(pointerType) {
    if (!worlds.active || !['menu', 'paused'].includes(game.dataset.state)) return;
    audio.unlock();
    if (game.dataset.state === 'menu' && pointerType) {
      game.dataset.input = pointerType === 'mouse' ? 'mouse' : 'touch';
    }
    controls.clear();
    interactions.hide();
    start.blur();
    game.dataset.state = 'playing';
    syncFrameMeter();
    missionHud.update(worlds.active.area.missionStatus);
    view.invalidate();
    audio.setPlaying(true);
  }

  start.addEventListener('click', event => startPlaying(event.pointerType));
  droneEntry.addEventListener('click', () => {
    if (droneEntry.hidden || transition) return;
    changeDroneView(true);
    startPlaying();
  });

  function restoreArea() {
    const url = new URL(location.href);
    const id = resolveArea(url, areas, defaultArea);
    if (worlds.active?.id !== id) {
      enterArea(id);
      return;
    }
    const wasTraveling = Boolean(transition);
    cancelTransition();
    if (route && (route.drone !== isDroneView(url) || route.fps !== isFpsView(url))) {
      if (wasTraveling) menu(false);
      else syncView(url);
      return;
    }
    rememberArea(areas, id);
    resetArea();
  }

  restart.addEventListener('click', resetArea);
  document.addEventListener('visibilitychange', syncFrameMeter);
  window.addEventListener('popstate', restoreArea);
  window.addEventListener('pagehide', () => {
    stopPlaying();
    drone?.stop();
    missionHud.clearNotification();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) restoreArea();
  });

  function frame(stamp) {
    const elapsed = previousFrame === null ? 0 : (stamp - previousFrame) / 1000;
    const dt = Math.min(elapsed, 0.05);
    previousFrame = stamp;
    const activePlayer = playerInput();
    if (activePlayer) {
      player.move(dt, controls.sample(dt), worlds.active);
      worlds.update(dt, camera.position, elapsed);
      missionHud.update(worlds.active.area.missionStatus);
      interactions.update();
    }
    drone?.update();
    const rendered = view.render(worlds.active?.scene, activePlayer, drone?.camera);
    if (rendered && route?.fps) frameMeter.sample(stamp);
    requestAnimationFrame(frame);
  }

  const url = new URL(location.href);
  enterArea(url.href === initialURL.href ? initialArea : resolveArea(url, areas, defaultArea), 'replaceState');
  await ready;
  requestAnimationFrame(frame);
}
