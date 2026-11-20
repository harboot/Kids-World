import { isPublicArea, validateAreaRegistry } from './area-registry.js';
import { createAudio } from './audio.js';
import { createControls } from './controls.js';
import { createDroneView, isDroneView, replaceDroneView } from './drone-view.js';
import { createMissionHud } from './hud.js';
import { createInteractions } from './interactions.js';
import { createLevelProgress } from './level-progress.js';
import { PLAYER_RADIUS } from './movement.js';
import { createPlayer } from './player.js';
import { createView } from './renderer.js';
import { areaURL, createWorldManager, historyArrival, resolveArea } from './world-manager.js';

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
  const levelList = game.querySelector('#completed-levels');
  const restart = game.querySelector('#restart');
  const menuMessage = game.querySelector('#menu-message');
  const notice = game.querySelector('#notice');
  const heading = game.querySelector('#menu-title');
  const areaName = game.querySelector('.wordmark small');
  const missionHud = createMissionHud(game);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = document.querySelector('meta[name="theme-color"]');
  const touchDevice = matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
  game.dataset.input = touchDevice ? 'touch' : 'mouse';

  let drone;
  let route;
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
  const initialArea = resolveArea(new URL(location.href), areas, defaultArea, restoringHistory ? null : savedArea());
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
        stopPlaying();
        showError('The WebGL context was lost. Reload the page to continue exploring.');
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
    camera, playing: playerInput, touchMode,
    runAction(item) {
      item.act({ heardCue: !item.silent && audio.effect('interact'), sit, travel, relocate });
    },
  });
  const controls = createControls(THREE, {
    game, canvas, joystick: game.querySelector('#joystick'), thumb: game.querySelector('#joystick-thumb'),
    playing: playerInput, touchMode, seated: () => player.seated,
    look: player.look, interact: interactions.interact,
    jump() { if (player.jump()) audio.effect('jump'); },
    pause() { menu(true); },
  });
  let travelTimer;
  let previousFrame = null;

  function syncView(url = new URL(location.href)) {
    const visit = worlds.active;
    route = { drone: isDroneView(url), arrival: historyArrival(visit.id, history.state) };
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
  }

  function changeDroneView(enabled) {
    replaceDroneView(new URL(location.href), history, enabled);
    syncView();
  }

  function stopPlaying() {
    window.clearTimeout(travelTimer);
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

  function prepareVisit(arrival) {
    const { definition, area } = worlds.active;
    const spawn = arrival && Object.hasOwn(area.arrivals ?? {}, arrival) ? area.arrivals[arrival] : definition.spawn;
    player.reset(spawn, area);
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
    clearVisitPresentation();
    worlds.reset();
    prepareVisit();
    menu(false);
  }

  function enterArea(id, historyMode, arrival) {
    game.dataset.state = 'traveling';
    stopPlaying();
    clearVisitPresentation();
    try {
      const { definition } = worlds.load(id);
      prepareVisit(arrival);
      audio.setArea(definition.music);
      view.sceneChanged();
      showArea(id);
      if (historyMode) {
        const state = arrival ? { area: id, arrival } : null;
        history[historyMode](state, '', areaURL(new URL(location.href), id));
      }
      rememberArea(areas, id);
      menu(false);
    } catch (error) {
      console.error(error);
      showError('This area failed to load. Reload the page to try again.');
    }
  }

  function travel(id, heardCue, arrival) {
    if (!playerInput() || id === worlds.active.id || !isPublicArea(areas, id)) return;
    game.dataset.state = 'traveling';
    stopPlaying();
    if (heardCue) travelTimer = window.setTimeout(() => enterArea(id, 'pushState', arrival), 180);
    else enterArea(id, 'pushState', arrival);
  }

  chooseLevel.addEventListener('click', () => {
    if (levelPicker.open || !worlds.active || game.dataset.state === 'traveling') return;
    if (playing()) menu(true);
    progress.refresh();
    levelList.replaceChildren();
    for (const [id, area] of Object.entries(areas)) {
      if (!progress.canSelect(id)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = area.title;
      button.addEventListener('click', () => {
        if (id === worlds.active.id) resetArea();
        else enterArea(id, 'pushState');
      });
      levelList.append(button);
    }
    if (!levelList.childElementCount) levelList.textContent = 'Complete a level to replay it here.';
    levelPicker.showModal();
  });

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
    audio.unlock();
    if (game.dataset.state === 'menu' && pointerType) {
      game.dataset.input = pointerType === 'mouse' ? 'mouse' : 'touch';
    }
    controls.clear();
    interactions.hide();
    start.blur();
    game.dataset.state = 'playing';
    missionHud.update(worlds.active.area.missionStatus);
    view.invalidate();
    audio.setPlaying(true);
  }

  start.addEventListener('click', event => startPlaying(event.pointerType));
  droneEntry.addEventListener('click', () => {
    changeDroneView(true);
    startPlaying();
  });

  function restoreArea() {
    const url = new URL(location.href);
    const id = resolveArea(url, areas, defaultArea);
    const arrival = historyArrival(id, history.state);
    if (worlds.active?.id === id && route && route.arrival === arrival && route.drone !== isDroneView(url)) {
      syncView(url);
      return;
    }
    if (worlds.active?.id !== id || arrival) {
      enterArea(id, null, arrival);
      return;
    }
    rememberArea(areas, id);
    resetArea();
  }

  restart.addEventListener('click', resetArea);
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
    if (playerInput()) {
      player.move(dt, controls.sample(dt), worlds.active);
      worlds.update(dt, camera.position, elapsed);
      missionHud.update(worlds.active.area.missionStatus);
      interactions.update();
    }
    drone?.update();
    view.render(worlds.active?.scene, playerInput(), drone?.camera);
    requestAnimationFrame(frame);
  }

  enterArea(initialArea, 'replaceState', restoringHistory ? historyArrival(initialArea, history.state) : undefined);
  requestAnimationFrame(frame);
}
