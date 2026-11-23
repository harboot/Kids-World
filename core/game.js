import { renderAreaList } from './area-picker.js';
import { isPublicArea, validateAreaRegistry } from './area-registry.js';
import { createAudio } from './audio.js';
import { createControls } from './controls.js';
import { createDroneView, isDroneView, replaceDroneView } from './drone-view.js';
import { createFrameMeter, isFpsView } from './frame-meter.js';
import { createMissionHud } from './hud.js';
import { normalizeMissionStatus } from './missions.js';
import { createInteractions } from './interactions.js';
import { createLevelProgress } from './level-progress.js';
import { PLAYER_RADIUS } from './movement.js';
import { createPlayer } from './player.js';
import { createView } from './renderer.js';
import { AreaInitializationError, areaURL, createWorldManager, resolveArea } from './world-manager.js';

const areaKey = 'kids-world-last-area';
const controlKey = 'kids-world-controls';
const defaultControls = 'one-finger';
const controlModes = new Set([defaultControls, 'two-finger']);
const areaLoadTimeout = 30_000;

function savedArea() {
  try {
    return localStorage.getItem(areaKey);
  } catch {
    return null;
  }
}

function savedControls() {
  try {
    const mode = localStorage.getItem(controlKey);
    if (controlModes.has(mode)) return mode;
  } catch {
    // Use the default when local storage is unavailable.
  }
  return defaultControls;
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
  const joystick = game.querySelector('#joystick');
  const start = game.querySelector('#start');
  const startLabel = game.querySelector('#start-label');
  const droneEntry = game.querySelector('#open-drone');
  const chooseLevel = game.querySelector('#choose-level');
  const openSettings = game.querySelector('#open-settings');
  const settings = game.querySelector('#settings');
  const levelPicker = game.querySelector('#level-picker');
  const areaList = game.querySelector('#area-list');
  const restart = game.querySelector('#restart');
  const menuMessage = game.querySelector('#menu-message');
  const notice = game.querySelector('#notice');
  const retryArea = game.querySelector('#area-retry');
  const heading = game.querySelector('#menu-title');
  const areaName = game.querySelector('.wordmark small');
  const missionHud = createMissionHud(game);
  const frameMeter = createFrameMeter(game.querySelector('#fps-meter'));
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = document.querySelector('meta[name="theme-color"]');
  const touchDevice = matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
  game.dataset.input = touchDevice ? 'touch' : 'mouse';
  let controlMode = savedControls();
  syncControlMode();
  settings.querySelector(`#controls-${controlMode}`).checked = true;

  let drone;
  let route;
  let transition;
  let activeURL;
  let terminal = false;
  let suspended = false;
  let frameId = null;
  let previousFrame = null;
  let interactionRevision = 0;
  let guidedCamera;
  let stepDistance = 0;
  let finishStartup;
  const ready = new Promise(resolve => { finishStartup = resolve; });
  const playing = () => !terminal && !suspended && !document.hidden && game.dataset.state === 'playing';
  const playerInput = () => playing() && !drone?.camera;
  const touchMode = () => game.dataset.input === 'touch';

  function syncControlMode() {
    game.dataset.controls = controlMode;
    joystick.setAttribute('aria-label', controlMode === 'two-finger' ? 'Movement joystick' : 'Movement and steering joystick');
  }

  function showError(message) {
    drone?.stop();
    droneEntry.hidden = true;
    missionHud.reset();
    game.dataset.state = 'error';
    menuMessage.textContent = message;
    notice.textContent = '';
    startLabel.textContent = 'Reload game';
    start.hidden = false;
    start.disabled = false;
    restart.disabled = true;
    chooseLevel.disabled = true;
    openSettings.disabled = true;
    retryArea.hidden = true;
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
      game, canvas, fullscreen: game.querySelector('#fullscreen'), touchDevice, onInvalidate: scheduleFrame,
      contextLost() {
        terminate('The WebGL context was lost. Reload the page to continue exploring.');
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
    areas, camera, touch: touchDevice, playerRadius: PLAYER_RADIUS, prepare: preparePresentation,
    services: {
      hud: game, isPlaying: playerInput,
      playCue: notes => playing() && audio.playCue(notes),
      notify: message => { if (playing()) missionHud.notify(message); },
      reducedMotion: () => motionPreference.matches,
      isPlayerGrounded: () => player.grounded,
      carryPlayer: distance => { if (playing()) player.carryVertically(distance); },
      isLevelComplete: progress.has,
      completeLevel(id) {
        if (!playing()) return;
        progress.complete(id);
        view.sceneChanged();
      },
    },
  });
  const interactions = createInteractions(THREE, {
    button: game.querySelector('#interaction'),
    glyph: game.querySelector('#interaction-glyph'),
    label: game.querySelector('#interaction-label'),
    camera, playing: playerInput, allowNearby: () => !player.guided, touchMode,
    runAction(item) {
      const visit = worlds.active;
      const revision = interactionRevision;
      const current = () => worlds.active === visit && visit.state === 'active' && revision === interactionRevision;
      try {
        if (!item.silent) audio.effect('interact');
        item.act({
          sit: (...args) => { if (current()) sit(...args); },
          guideCamera: (look, options) => current() ? guideCamera(look, current, options) : undefined,
          relocate: spawn => { if (current()) relocate(spawn); },
        });
      } catch (error) {
        console.error(error);
        terminate('This interaction could not finish. Reload the game to try again.');
      }
    },
  });
  const controls = createControls(THREE, {
    game, canvas, joystick, thumb: game.querySelector('#joystick-thumb'),
    playing: playerInput, touchMode, seated: () => player.seated,
    steerWithStick: () => controlMode !== 'two-finger',
    look: player.look, interact: interactions.interact,
    jump() { if (player.jump()) audio.effect('jump'); },
    pause() { menu(true); },
  });
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
    activeURL = new URL(location.href);
    syncView();
    previousFrame = null;
  }

  function stopPlaying() {
    stopFrames();
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
    openSettings.disabled = false;
    startLabel.textContent = paused ? 'Resume exploring' : 'Explore';
    menuMessage.textContent = paused ? 'Take a break, then continue exploring.' : worlds.active.definition.description;
    notice.textContent = '';
    retryArea.hidden = true;
    view.invalidate();
    if (!paused) syncView();
  }

  function relocate(spawn) {
    controls.clear();
    stepDistance = 0;
    player.reset(spawn, worlds.active.area);
  }

  function preparePresentation({ definition, area }) {
    const { spawn } = definition;
    const ground = area.getGroundHeight?.(spawn.x, spawn.z, spawn.elevation) ?? 0;
    const items = area.interactions ?? [];
    if (!Number.isFinite(ground) || !Array.isArray(items)) throw new TypeError('Invalid area spawn or interactions.');
    if (isDroneView(new URL(location.href))) {
      // Prepare the area bounds before discarding a working visit.
      void area.droneView;
    }
    return { ground, items, missionStatus: normalizeMissionStatus(area.missionStatus) };
  }

  function prepareVisit({ ground, items, missionStatus }) {
    const { definition, area } = worlds.active;
    player.reset(definition.spawn, area, ground);
    delete game.dataset.seated;
    interactions.setItems(items);
    missionHud.update(missionStatus);
  }

  function clearVisitPresentation() {
    interactionRevision++;
    guidedCamera = undefined;
    stepDistance = 0;
    if (levelPicker.open) levelPicker.close();
    if (settings.open) settings.close();
    missionHud.reset();
    drone?.stop();
    interactions.setItems([]);
  }

  function resetArea() {
    if (terminal || suspended || transition || !worlds.active) return;
    stopPlaying();
    clearVisitPresentation();
    try {
      prepareVisit(worlds.reset());
      view.sceneChanged();
      menu(false);
    } catch (error) {
      console.error(error);
      terminate('This area could not restart. Reload the game to try again.');
    }
  }

  function cancelTransition() {
    clearTimeout(transition?.timer);
    transition = undefined;
    worlds.cancelLoad();
  }

  function disposeView() {
    try {
      view.dispose();
    } catch (error) {
      console.error('Could not finish renderer cleanup.', error);
    }
  }

  function terminate(message) {
    if (terminal) return;
    terminal = true;
    cancelTransition();
    stopPlaying();
    clearVisitPresentation();
    worlds.unload();
    disposeView();
    showError(message);
    finishStartup();
  }

  async function enterArea(id, historyMode) {
    if (terminal || suspended) return;
    if (transition?.id === id) {
      // A history navigation to the same pending area already chose its URL.
      transition.historyMode = historyMode;
      return;
    }
    cancelTransition();
    const request = { id, historyMode, url: areaURL(new URL(location.href), id) };
    transition = request;
    try {
      game.dataset.state = 'traveling';
      stopPlaying();
      if (levelPicker.open) levelPicker.close();
      if (settings.open) settings.close();
      drone?.stop();
      droneEntry.hidden = true;
      retryArea.hidden = true;
      start.hidden = true;
      start.disabled = true;
      restart.disabled = true;
      chooseLevel.disabled = true;
      openSettings.disabled = true;
      notice.textContent = areas[id].loadingMessage ?? `Loading ${areas[id].title}…`;
      view.invalidate();

      request.timer = setTimeout(() => {
        if (transition === request) worlds.cancelLoad();
      }, areaLoadTimeout);
      const visit = await worlds.load(id);
      if (transition !== request) return;
      if (!visit) throw new Error('Area loading timed out.');
      clearVisitPresentation();
      prepareVisit(visit.presentation);
      delete visit.presentation;
      audio.setScore(visit.definition.music);
      view.sceneChanged();
      showArea(id);
      if (request.historyMode) history[request.historyMode](null, '', areaURL(new URL(location.href), id));
      activeURL = new URL(location.href);
      rememberArea(areas, id);
      menu(false);
    } catch (error) {
      if (transition !== request) return;
      console.error(error);
      const { title, show } = areas[id];
      const initializationFailed = error instanceof AreaInitializationError;
      let message = `${title} could not load.`;
      if (initializationFailed) message = `${title} could not initialize.`;
      else if (!show) {
        message = navigator.onLine === false
          ? `${title} is unavailable offline. Connect to the internet and reload.`
          : `${title} is unavailable for this release. Reload to check for an update.`;
      }
      if (worlds.active && worlds.active.id !== id) {
        if (activeURL && location.href !== activeURL.href) history.replaceState(null, '', activeURL);
        menu(false);
        notice.textContent = `${message} You can keep exploring ${worlds.active.definition.title}.`;
        retryArea.href = request.url.href;
        retryArea.hidden = false;
      } else {
        terminate(show || initializationFailed ? `${message} Reload the page to try again.` : message);
      }
    } finally {
      clearTimeout(request.timer);
      if (transition === request) {
        transition = undefined;
        finishStartup();
      }
    }
  }

  openSettings.addEventListener('click', () => {
    if (openSettings.disabled || settings.open) return;
    if (playing()) menu(true);
    settings.showModal();
  });
  settings.addEventListener('change', ({ target }) => {
    if (target.name !== 'controls' || !target.checked || !controlModes.has(target.value)) return;
    controlMode = target.value;
    syncControlMode();
    controls.clear();
    try {
      localStorage.setItem(controlKey, controlMode);
    } catch {
      // Keep the selection for this page when storage is unavailable.
    }
    view.invalidate();
  });

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

  function guideCamera(look, current, { camera: rideCamera, prompt } = {}) {
    const stop = player.guide(look);
    guidedCamera = rideCamera;
    if (prompt) interactions.pin(prompt);
    game.dataset.seated = 'true';
    controls.clear();
    interactions.hide();
    return spawn => {
      if (!current() || !stop()) return;
      delete game.dataset.seated;
      guidedCamera = undefined;
      if (prompt) interactions.pin(null);
      controls.clear();
      if (spawn) relocate(spawn);
    };
  }

  function sit(pose, standLabel) {
    const revision = interactionRevision;
    player.sit(pose);
    game.dataset.seated = 'true';
    controls.clear();
    interactions.pin({
      label: standLabel,
      act() {
        if (revision !== interactionRevision || !player.seated) return;
        player.stand();
        delete game.dataset.seated;
        controls.clear();
        interactions.pin(null);
      },
    });
  }

  function startPlaying(pointerType) {
    if (terminal || suspended || document.hidden || !worlds.active || !['menu', 'paused'].includes(game.dataset.state)) return;
    audio.unlock();
    if (game.dataset.state === 'menu' && pointerType) {
      game.dataset.input = pointerType === 'mouse' ? 'mouse' : 'touch';
    }
    controls.clear();
    interactions.hide();
    start.blur();
    previousFrame = null;
    game.dataset.state = 'playing';
    syncFrameMeter();
    missionHud.update(worlds.active.area.missionStatus);
    view.invalidate();
    audio.setPlaying(true);
  }

  start.addEventListener('click', event => {
    if (game.dataset.state === 'error') location.reload();
    else startPlaying(event.pointerType);
  });
  droneEntry.addEventListener('click', () => {
    if (droneEntry.hidden || transition) return;
    changeDroneView(true);
    startPlaying();
  });

  function restoreArea(fromCache = false) {
    if (terminal || suspended) return;
    const url = new URL(location.href);
    const id = resolveArea(url, areas, defaultArea);
    if (worlds.active?.id !== id) {
      enterArea(id);
      return;
    }
    const wasTraveling = Boolean(transition);
    cancelTransition();
    activeURL = url;
    if (fromCache) {
      menu(game.dataset.state === 'paused');
      syncView(url);
      return;
    }
    if (route && (route.drone !== isDroneView(url) || route.fps !== isFpsView(url))) {
      if (wasTraveling) menu(false);
      else syncView(url);
      return;
    }
    rememberArea(areas, id);
    resetArea();
  }

  restart.addEventListener('click', resetArea);
  document.addEventListener('visibilitychange', () => {
    if (terminal || suspended) return;
    if (document.hidden) {
      if (game.dataset.state === 'playing') menu(true);
      else stopPlaying();
    } else {
      previousFrame = null;
      view.invalidate();
    }
    syncFrameMeter();
  });
  window.addEventListener('popstate', () => restoreArea());
  window.addEventListener('pagehide', event => {
    suspended = true;
    cancelTransition();
    if (game.dataset.state === 'playing') menu(true);
    else stopPlaying();
    if (levelPicker.open) levelPicker.close();
    if (settings.open) settings.close();
    drone?.stop();
    missionHud.clearNotification();
    if (!event.persisted) {
      clearVisitPresentation();
      worlds.unload();
      disposeView();
    }
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    suspended = false;
    restoreArea(true);
  });

  function scheduleFrame() {
    if (!view || terminal || suspended || document.hidden || !worlds.active || frameId !== null) return;
    const scheduled = requestAnimationFrame(stamp => {
      if (frameId !== scheduled) return;
      frameId = null;
      frame(stamp);
    });
    frameId = scheduled;
  }

  function stopFrames() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    previousFrame = null;
  }

  function frame(stamp) {
    const visit = worlds.active;
    if (terminal || suspended || document.hidden || visit?.state !== 'active') return;
    try {
      const activePlayer = playerInput();
      if (activePlayer) {
        const elapsed = previousFrame === null ? 0 : Math.min(0.25, Math.max(0, (stamp - previousFrame) / 1000));
        const dt = Math.min(elapsed, 0.05);
        previousFrame = stamp;
        stepDistance += player.move(dt, controls.sample(dt), visit);
        if (stepDistance >= 1.55) {
          audio.effect('step');
          stepDistance -= 1.55;
        }
        worlds.update(dt, camera.position, elapsed);
        if (worlds.active !== visit || terminal) return;
        missionHud.update(visit.area.missionStatus);
        interactions.update();
      }
      drone?.update();
      if (guidedCamera && (guidedCamera.aspect !== camera.aspect || guidedCamera.fov !== camera.fov)) {
        guidedCamera.aspect = camera.aspect;
        guidedCamera.fov = camera.fov;
        guidedCamera.updateProjectionMatrix();
      }
      const rendered = view.render(visit.scene, activePlayer, drone?.camera ?? guidedCamera);
      if (rendered && route?.fps) frameMeter.sample(stamp);
      if (playerInput()) scheduleFrame();
    } catch (error) {
      console.error(error);
      terminate('The game could not continue. Reload the page to try again.');
    }
  }

  const url = new URL(location.href);
  enterArea(url.href === initialURL.href ? initialArea : resolveArea(url, areas, defaultArea), 'replaceState');
  await ready;
}
