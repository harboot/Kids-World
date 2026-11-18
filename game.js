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
const PLAYER_RADIUS = 0.34;
const JUMP_SPEED = 6.3;
const GRAVITY = 15;
const WALK_SPEED = 4.6;
const INTERACTION_RADIUS = 2.35;
const touchDevice = matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
game.dataset.input = touchDevice ? 'touch' : 'mouse';

function showError(message) {
  game.dataset.state = 'error';
  menuMessage.textContent = message;
  notice.textContent = '';
  start.hidden = true;
  restart.disabled = true;
  interaction.hidden = true;
}

async function boot() {
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
  } catch (error) {
    console.error(error);
    showError('This area failed to load. Reload the page to try again.');
  }
}

function addPassage(THREE, scene, passage) {
  const door = new THREE.Group();
  door.position.set(passage.x, 0, passage.z);
  const frame = new THREE.MeshLambertMaterial({ color: 0x3a6971 });
  const plank = new THREE.MeshLambertMaterial({ color: 0x78b6ad });
  const trim = new THREE.MeshLambertMaterial({ color: 0xf4dba2 });
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  function part(x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.receiveShadow = true;
    door.add(mesh);
  }

  part(0, 1.38, 0, 1.75, 2.76, 0.15, plank);
  part(0, 2.91, 0.01, 2.37, 0.3, 0.34, frame);
  part(0, 2.92, 0.19, 0.98, 0.1, 0.04, trim);
  part(0, 0.06, 0.15, 2.36, 0.12, 0.51, frame);
  for (const side of [-1, 1]) {
    part(side * 0.99, 1.45, 0, 0.26, 2.9, 0.32, frame);
    part(side * 0.45, 1.38, 0.09, 0.03, 2.65, 0.035, frame);
  }
  part(0.54, 1.37, 0.14, 0.16, 0.18, 0.1, trim);
  scene.add(door);
}

function explore(THREE, renderer, level) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.07, 115);
  const world = level.build(THREE, scene, touchDevice, PLAYER_RADIUS);
  const { passage } = level;
  addPassage(THREE, scene, passage);
  world.obstacles.push({
    left: passage.x - 1.19, right: passage.x + 1.19,
    front: passage.z - 0.16, back: passage.z + 0.24, height: 3.06,
  });
  const interactions = [...(world.interactions ?? []), {
    x: passage.x, z: passage.z, label: passage.label,
    act() {
      clearInput();
      game.dataset.state = 'traveling';
      window.location.assign(passage.href);
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
  let stickPointer = null;
  let lookPointer = null;
  let lockRequested = false;
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
    yaw = 0;
    pitch = 0;
    elevation = 0;
    verticalSpeed = 0;
    grounded = true;
    speed.set(0, 0);
    camera.position.set(level.spawn.x, EYE_HEIGHT, level.spawn.z);
    updateCamera();
    world.reset?.();
    renderPending = true;
  }

  function menu(paused) {
    clearInput();
    speed.set(0, 0);
    game.dataset.state = paused ? 'paused' : 'menu';
    startLabel.textContent = paused ? 'Resume exploring' : 'Explore';
    menuMessage.textContent = paused ? 'Take a break, then continue exploring.' : initialMessage;
    renderPending = true;
  }

  function begin() {
    clearInput();
    notice.textContent = '';
    start.blur();
    game.dataset.state = 'playing';
  }

  function lockFailed() {
    if (!lockRequested) return;
    lockRequested = false;
    notice.textContent = 'Pointer Lock was unavailable. Select Explore to try again.';
  }

  start.addEventListener('click', event => {
    if (game.dataset.state === 'menu' && event.pointerType) {
      game.dataset.input = event.pointerType === 'mouse' ? 'mouse' : 'touch';
    }
    if (touchMode()) {
      begin();
      return;
    }
    lockRequested = true;
    try {
      canvas.requestPointerLock()?.catch(lockFailed);
    } catch {
      lockFailed();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      lockRequested = false;
      begin();
    } else if (playing() && !touchMode()) {
      menu(true);
    }
  });
  document.addEventListener('pointerlockerror', lockFailed);

  restart.addEventListener('click', () => {
    resetWorld();
    menu(false);
    notice.textContent = '';
    if (document.pointerLockElement === canvas) document.exitPointerLock();
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
    const { x, z } = camera.position;
    let nearest = null;
    let best = INTERACTION_RADIUS;
    for (const object of interactions) {
      const distance = Math.hypot(x - object.x, z - object.z);
      if (distance < best) {
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
    interactionPoint.set(nearby.x, 1.38, nearby.z).project(camera);
    const { x, y, z } = interactionPoint;
    const inView = z >= -1 && z <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1;
    const left = inView ? clamp(50 + 50 * x, 22, 78) : 50;
    const top = inView ? clamp(50 - 50 * y, 20, 71) : 68;
    interaction.style.setProperty('--interaction-x', `${left.toFixed(1)}%`);
    interaction.style.setProperty('--interaction-y', `${top.toFixed(1)}%`);
  }

  function interact() {
    nearestInteraction()?.act();
    updateInteraction();
  }

  interaction.addEventListener('click', interact);
  window.addEventListener('pageshow', event => {
    if (event.persisted && game.dataset.state === 'traveling') menu(true);
  });

  function jump() {
    if (!grounded) return;
    verticalSpeed = JUMP_SPEED;
    grounded = false;
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
  }, { capture: true, passive: true });

  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && document.pointerLockElement === canvas) {
      document.exitPointerLock();
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
    if (!playing() || !touchMode() || stickPointer !== null) return;
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
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });

  function overlaps(obstacle, x, z) {
    if (obstacle.touches) return obstacle.touches(x, z);
    const dx = x - clamp(x, obstacle.left, obstacle.right);
    const dz = z - clamp(z, obstacle.front, obstacle.back);
    return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
  }

  function blocked(x, z) {
    return world.animals?.blocks(x, z, elevation) ||
      world.obstacles.some(obstacle => elevation < obstacle.height && overlaps(obstacle, x, z));
  }

  function vertical(dt, position) {
    let surface = world.animals?.surface(position.x, position.z, elevation) ?? 0;
    for (const obstacle of world.obstacles) {
      if (obstacle.height <= elevation && overlaps(obstacle, position.x, position.z)) {
        surface = Math.max(surface, obstacle.height);
      }
    }
    verticalSpeed -= GRAVITY * dt;
    elevation = Math.max(surface, elevation + verticalSpeed * dt);
    grounded = elevation === surface && verticalSpeed <= 0;
    if (grounded) verticalSpeed = 0;
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
    if (!blocked(x, position.z)) position.x = x;
    if (!blocked(position.x, z)) position.z = z;
    vertical(dt, position);
    camera.updateMatrixWorld();
  }

  function frame(stamp) {
    const dt = previousFrame === null ? 0 : Math.min((stamp - previousFrame) / 1000, 0.05);
    previousFrame = stamp;
    if (playing()) {
      const horizontal = Number(keys.has('lookRight')) - Number(keys.has('lookLeft'));
      const vertical = Number(keys.has('lookDown')) - Number(keys.has('lookUp'));
      const dx = mouseDelta.x * 0.0022 + horizontal * dt * 1.65;
      const dy = mouseDelta.y * 0.0022 + vertical * dt * 1.65;
      mouseDelta.set(0, 0);
      if (dx || dy) look(dx, dy);
      move(dt);
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
    clearInput();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    showError('The WebGL context was lost. Reload the page to continue exploring.');
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
