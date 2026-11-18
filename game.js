import { createAudio } from './audio.js';
import { advanceFall, floorHeight, PLAYER_RADIUS, walkElevation } from './movement.js';

const game = document.querySelector('#game');
const canvas = document.querySelector('#view');
const start = document.querySelector('#start');
const startLabel = document.querySelector('#start-label');
const restart = document.querySelector('#restart');
const fullscreen = document.querySelector('#fullscreen');
const menuMessage = document.querySelector('#menu-message');
const notice = document.querySelector('#notice');
const interaction = document.querySelector('#interaction');
const interactionGlyph = document.querySelector('#interaction-glyph');
const interactionLabel = document.querySelector('#interaction-label');
const joystick = document.querySelector('#joystick');
const thumb = document.querySelector('#joystick-thumb');

const EYE_HEIGHT = 1.68;
const JUMP_SPEED = 6.3;
const WALK_SPEED = 4.6;
const INTERACTION_RADIUS = 2.35;
const areaKey = 'kids-world-last-area';
const touchDevice = matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
game.dataset.input = touchDevice ? 'touch' : 'mouse';

function rememberArea() {
  try {
    localStorage.setItem(areaKey, game.dataset.level);
  } catch {
    // Exploration still works in browsers that block local storage.
  }
}

function showError(message) {
  game.dataset.state = 'error';
  menuMessage.textContent = message;
  notice.textContent = '';
  start.hidden = true;
  restart.disabled = true;
  interaction.hidden = true;
}

async function boot() {
  const entry = new URL(window.location.href);
  const arrivingInGarden = entry.searchParams.get('arrive') === 'garden';
  const restoringHistory = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  try {
    if (game.dataset.level === 'garden' && !arrivingInGarden && !restoringHistory &&
        localStorage.getItem(areaKey) === 'snow') {
      window.location.replace('./snow.html');
      return;
    }
  } catch {
    // Continue with the requested page if there is no saved area.
  }

  let THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js');
  } catch (error) {
    console.error(error);
    showError('Three.js failed to load. Check your internet connection and reload the page.');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchDevice, powerPreference: 'high-performance' });
  } catch {
    showError('WebGL 2 is unavailable. Try a browser with hardware acceleration enabled.');
    return;
  }

  try {
    const level = game.dataset.level === 'snow' ? (await import('./snow.js')).snowLevel :
      (await import('./garden.js')).gardenLevel;
    explore(THREE, renderer, level);
    rememberArea();
    if (arrivingInGarden) {
      entry.searchParams.delete('arrive');
      window.history.replaceState(null, '', entry);
    }
  } catch (error) {
    console.error(error);
    showError('This area failed to load. Reload the page to try again.');
  }
}

function addPassage(THREE, scene, passage) {
  const door = new THREE.Group();
  door.position.set(passage.x, 0, passage.z);
  const frame = new THREE.MeshLambertMaterial({ color: 0x589dbb });
  const panel = new THREE.MeshLambertMaterial({ color: 0x96d7e8, emissive: 0x17404d });
  const trim = new THREE.MeshBasicMaterial({ color: 0xe2faff });
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  function part(x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.receiveShadow = true;
    door.add(mesh);
  }

  part(0, 1.38, 0, 1.75, 2.76, 0.15, panel);
  part(0, 2.91, 0.01, 2.37, 0.3, 0.34, frame);
  part(0, 2.92, 0.19, 0.98, 0.1, 0.04, trim);
  part(0, 0.06, 0.15, 2.36, 0.12, 0.51, frame);
  for (const side of [-1, 1]) {
    part(side * 0.99, 1.45, 0, 0.26, 2.9, 0.32, frame);
    part(side * 0.39, 1.37, 0.092, 0.035, 1.75, 0.035, trim);
  }
  const shard = new THREE.OctahedronGeometry(1);
  for (const [x, y, sx, sy] of [[-1.16, 2.64, .28, .88], [1.12, 2.49, .24, .72], [0, 1.36, .39, .62]]) {
    const crystal = new THREE.Mesh(shard, x ? frame : trim);
    crystal.position.set(x, y, 0.13);
    crystal.scale.set(sx, sy, 0.2);
    door.add(crystal);
  }
  scene.add(door);
}

function explore(THREE, renderer, level) {
  const audio = createAudio(game.dataset.level, document.querySelector('#sound'));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.07, 115);
  scene.add(camera);
  const world = level.build(THREE, scene, touchDevice, PLAYER_RADIUS, camera);
  const { passage } = level;
  addPassage(THREE, scene, passage);
  world.obstacles.push({
    left: passage.x - 1.19, right: passage.x + 1.19,
    front: passage.z - 0.16, back: passage.z + 0.24, height: 3.06,
  });
  const interactions = [...(world.interactions ?? []), {
    x: passage.x, z: passage.z, label: passage.label,
    act({ heardCue }) {
      audio.setPlaying(false);
      clearInput();
      game.dataset.state = 'traveling';
      const leave = () => {
        if (game.dataset.state === 'traveling') window.location.assign(passage.href);
      };
      if (heardCue) window.setTimeout(leave, 180);
      else leave();
    },
  }];

  const { clamp } = THREE.MathUtils;
  const moveCodes = { KeyW: 'forward', KeyA: 'left', KeyS: 'backward', KeyD: 'right' };
  const lookCodes = { ArrowUp: 'lookUp', ArrowDown: 'lookDown', ArrowLeft: 'lookLeft', ArrowRight: 'lookRight' };
  const inputCodes = { ...moveCodes, ...lookCodes };
  const keys = new Set();
  const presses = new Map();
  const motion = new THREE.Vector2();
  const speed = new THREE.Vector2();
  const stickAxis = new THREE.Vector2();
  const mouseDelta = new THREE.Vector2();
  const interactionPoint = new THREE.Vector3();
  const falling = { feet: 0, speed: 0, grounded: true };
  let stickPointer = null;
  let lookPointer = null;
  let seated = null;
  let yaw = 0;
  let pitch = 0;
  let elevation = 0;
  let verticalSpeed = 0;
  let grounded = true;
  let previousFrame = null;
  let renderPending = true;
  const initialMessage = menuMessage.textContent;

  const playing = () => game.dataset.state === 'playing';
  const touchMode = () => game.dataset.input === 'touch';

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 68 : 62;
    camera.updateProjectionMatrix();
    renderPending = true;
  }

  function resetStick() {
    stickPointer = null;
    stickAxis.set(0, 0);
    thumb.style.transform = '';
  }

  function clearInput() {
    keys.clear();
    presses.clear();
    lookPointer = null;
    mouseDelta.set(0, 0);
    resetStick();
    interaction.hidden = true;
  }

  function updateCamera() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
  }

  function resetWorld() {
    clearInput();
    seated = null;
    delete game.dataset.seated;
    yaw = 0;
    pitch = 0;
    elevation = world.getGroundHeight?.(level.spawn.x, level.spawn.z) ?? 0;
    verticalSpeed = 0;
    grounded = true;
    speed.set(0, 0);
    camera.position.set(level.spawn.x, EYE_HEIGHT + elevation, level.spawn.z);
    updateCamera();
    world.reset?.();
    renderPending = true;
  }

  function menu(paused) {
    audio.setPlaying(false);
    clearInput();
    speed.set(0, 0);
    game.dataset.state = paused ? 'paused' : 'menu';
    startLabel.textContent = paused ? 'Resume exploring' : 'Explore';
    menuMessage.textContent = paused ? 'Take a break, then continue exploring.' : initialMessage;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    renderPending = true;
  }

  function begin() {
    clearInput();
    notice.textContent = '';
    start.blur();
    game.dataset.state = 'playing';
    audio.setPlaying(true);
  }

  start.addEventListener('click', event => {
    audio.unlock();
    if (game.dataset.state === 'menu' && event.pointerType) {
      game.dataset.input = event.pointerType === 'mouse' ? 'mouse' : 'touch';
    }
    begin();
  });

  restart.addEventListener('click', () => {
    resetWorld();
    menu(false);
    notice.textContent = '';
  });

  const enterFullscreen = game.requestFullscreen || game.webkitRequestFullscreen;
  if (enterFullscreen && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
    fullscreen.hidden = false;
    const full = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    fullscreen.addEventListener('click', async () => {
      try {
        if (full()) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          await exit.call(document);
        } else {
          await enterFullscreen.call(game);
        }
      } catch (error) {
        console.warn('Fullscreen is unavailable.', error);
      }
    });
    function syncFullscreen() {
      const label = full() ? 'Exit fullscreen' : 'Fullscreen';
      fullscreen.setAttribute('aria-label', label);
      fullscreen.setAttribute('aria-pressed', String(full()));
      fullscreen.title = label;
      resize();
    }
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
  }

  function nearestInteraction() {
    if (!playing()) return null;
    if (seated) return standPrompt;
    const { x, z } = camera.position;
    let nearest = null;
    let best = Infinity;
    for (const object of interactions) {
      if (object.active === false || (object.reachable && !object.reachable(camera.position))) continue;
      const distance = Math.hypot(x - object.x, z - object.z);
      if (distance < best && distance <= (object.radius ?? INTERACTION_RADIUS)) {
        nearest = object;
        best = distance;
      }
    }
    return nearest;
  }

  function updateInteraction() {
    const nearby = nearestInteraction();
    interaction.hidden = !nearby;
    if (!nearby) return;
    const glyph = touchMode() ? '↗' : 'M';
    if (interactionGlyph.textContent !== glyph) interactionGlyph.textContent = glyph;
    if (interactionLabel.textContent !== nearby.label) interactionLabel.textContent = nearby.label;
    let left = 50;
    let top = 68;
    if (!seated) {
      interactionPoint.set(nearby.x, nearby.anchorY ?? 1.38, nearby.z).project(camera);
      const { x, y, z } = interactionPoint;
      if (z >= -1 && z <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1) {
        left = clamp(50 + 50 * x, 22, 78);
        top = clamp(50 - 50 * y, 20, 71);
      }
    }
    interaction.style.setProperty('--interaction-x', `${left.toFixed(1)}%`);
    interaction.style.setProperty('--interaction-y', `${top.toFixed(1)}%`);
  }

  function interact() {
    const nearby = nearestInteraction();
    if (!nearby) return;
    nearby.act({ heardCue: audio.effect('interact'), sit });
    updateInteraction();
  }

  interaction.addEventListener('click', interact);
  interaction.addEventListener('touchend', event => {
    if (!touchMode()) return;
    // Handle the tap even when a preceding joystick gesture suppressed its click.
    event.preventDefault();
    const { clientX, clientY } = event.changedTouches[0];
    if (interaction.contains(document.elementFromPoint(clientX, clientY))) interact();
  }, { passive: false });
  canvas.addEventListener('click', () => {
    if (!playing() || touchMode() || document.pointerLockElement === canvas) return;
    // The arrow keys and the interaction button are available without a lock.
    canvas.requestPointerLock?.()?.catch(() => {});
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      if (!playing()) document.exitPointerLock();
    } else if (playing() && !touchMode()) {
      menu(true);
    }
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    rememberArea();
    resetWorld();
    menu(false);
  });
  window.addEventListener('pagehide', () => {
    audio.setPlaying(false);
    clearInput();
  });

  function sit(pose) {
    seated = { standing: camera.position.clone(), elevation };
    game.dataset.seated = 'true';
    clearInput();
    speed.set(0, 0);
    verticalSpeed = 0;
    camera.position.set(pose.x, pose.y, pose.z);
    yaw = pose.yaw;
    pitch = 0;
    updateCamera();
  }

  const standPrompt = {
    label: 'Stand up',
    act() {
      camera.position.copy(seated.standing);
      elevation = seated.elevation;
      verticalSpeed = 0;
      grounded = true;
      seated = null;
      delete game.dataset.seated;
      clearInput();
      updateCamera();
    },
  };

  function jump() {
    if (seated || !grounded) return;
    verticalSpeed = JUMP_SPEED;
    grounded = false;
    audio.effect('jump');
  }

  function look(dx, dy) {
    yaw -= dx;
    pitch = clamp(pitch - dy, -1.43, 1.43);
    updateCamera();
  }

  window.addEventListener('mousemove', event => {
    if (!playing() || document.pointerLockElement !== canvas) return;
    mouseDelta.x += event.movementX;
    mouseDelta.y += event.movementY;
  }, { passive: true });

  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && playing()) {
      menu(true);
      return;
    }
    if (!playing()) return;
    if (event.code === 'KeyM' || event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) {
        if (event.code === 'KeyM') interact();
        else jump();
      }
      return;
    }
    const action = inputCodes[event.code];
    if (!action) return;
    event.preventDefault();
    keys.add(action);
  });

  window.addEventListener('keyup', event => keys.delete(inputCodes[event.code]));

  function adjustStick(event) {
    if (event.pointerId !== stickPointer) return;
    const bounds = joystick.getBoundingClientRect();
    const radius = bounds.width * 0.32;
    stickAxis.set(
      (event.clientX - bounds.left - bounds.width / 2) / radius,
      (event.clientY - bounds.top - bounds.height / 2) / radius,
    ).clampLength(0, 1);
    thumb.style.transform = `translate(${stickAxis.x * radius}px, ${stickAxis.y * radius}px)`;
  }

  joystick.addEventListener('pointerdown', event => {
    if (!playing() || seated || !touchMode() || stickPointer !== null) return;
    event.preventDefault();
    stickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    adjustStick(event);
  });
  joystick.addEventListener('pointermove', adjustStick);
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    joystick.addEventListener(eventName, event => {
      if (event.pointerId === stickPointer) resetStick();
    });
  }

  canvas.addEventListener('pointerdown', event => {
    if (!playing() || !touchMode()) return;
    const { pointerId, clientX: x, clientY: y } = event;
    canvas.setPointerCapture(pointerId);
    presses.set(pointerId, { startX: x, startY: y, x, y, moved: false, time: performance.now() });
    const bounds = canvas.getBoundingClientRect();
    if (lookPointer === null && x >= bounds.left + bounds.width / 2) lookPointer = pointerId;
  });

  function trackPress(event) {
    const press = presses.get(event.pointerId);
    if (!press) return;
    press.moved ||= Math.hypot(event.clientX - press.startX, event.clientY - press.startY) >= 9;
    if (press.moved && lookPointer === event.pointerId) {
      look((event.clientX - press.x) * 0.004, (event.clientY - press.y) * 0.004);
      press.x = event.clientX;
      press.y = event.clientY;
    }
    return press;
  }

  function releasePress(event) {
    presses.delete(event.pointerId);
    if (lookPointer === event.pointerId) lookPointer = null;
  }

  canvas.addEventListener('pointermove', trackPress);
  canvas.addEventListener('pointerup', event => {
    const press = trackPress(event);
    releasePress(event);
    if (playing() && press && !press.moved && performance.now() - press.time < 450) jump();
  });
  canvas.addEventListener('pointercancel', releasePress);
  canvas.addEventListener('lostpointercapture', releasePress);
  game.addEventListener('contextmenu', event => {
    if (playing()) event.preventDefault();
  });
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !playing()) return;
    menu(true);
  });

  function walkTo(position, x, z) {
    const next = walkElevation(world, position, x, z, elevation, grounded);
    if (next === null) return;
    elevation = next;
    position.x = x;
    position.z = z;
  }

  function vertical(dt, position) {
    const floor = floorHeight(world, position.x, position.z, elevation);
    advanceFall(elevation, verticalSpeed, floor, dt, falling);
    elevation = falling.feet;
    grounded = falling.grounded;
    verticalSpeed = falling.speed;
    position.y = EYE_HEIGHT + elevation;
  }

  function move(dt) {
    const strafe = Number(keys.has('right')) - Number(keys.has('left'));
    const advance = Number(keys.has('backward')) - Number(keys.has('forward'));
    motion.set(strafe, advance);
    if (stickAxis.lengthSq() > 0.01) motion.add(stickAxis);
    motion.clampLength(0, 1);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const xMotion = cos * motion.x + sin * motion.y;
    const zMotion = -sin * motion.x + cos * motion.y;
    motion.set(WALK_SPEED * xMotion, WALK_SPEED * zMotion);
    speed.lerp(motion, 1 - Math.exp(-15 * dt));
    const { position } = camera;
    const xLimit = level.width / 2 - PLAYER_RADIUS;
    const zLimit = level.depth / 2 - PLAYER_RADIUS;
    const x = clamp(position.x + speed.x * dt, -xLimit, xLimit);
    const z = clamp(position.z + speed.y * dt, -zLimit, zLimit);
    walkTo(position, x, position.z);
    walkTo(position, position.x, z);
    vertical(dt, position);
    camera.updateMatrixWorld();
  }

  function frame(stamp) {
    const dt = previousFrame === null ? 0 : Math.min((stamp - previousFrame) / 1000, 0.05);
    previousFrame = stamp;
    if (playing()) {
      const horizontal = Number(keys.has('lookRight')) - Number(keys.has('lookLeft'));
      const vertical = Number(keys.has('lookDown')) - Number(keys.has('lookUp'));
      const dx = horizontal * dt * 1.65 + mouseDelta.x * 0.0022;
      const dy = vertical * dt * 1.65 + mouseDelta.y * 0.0022;
      mouseDelta.set(0, 0);
      if (dx || dy) look(dx, dy);
      if (!seated) move(dt);
      world.update?.(dt, camera.position);
      updateInteraction();
    }

    if (playing() || renderPending) {
      renderer.render(scene, camera);
      renderPending = false;
    }
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    audio.setPlaying(false);
    clearInput();
    showError('The WebGL context was lost. Reload the page to continue exploring.');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  resetWorld();
  menu(false);
  start.disabled = false;
  restart.disabled = false;
  notice.textContent = '';
  requestAnimationFrame(frame);
}

boot();
