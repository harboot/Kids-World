const moveCodes = { KeyW: 'forward', KeyA: 'left', KeyS: 'backward', KeyD: 'right' };
const lookCodes = { ArrowUp: 'lookUp', ArrowDown: 'lookDown', ArrowLeft: 'lookLeft', ArrowRight: 'lookRight' };
const inputCodes = { ...moveCodes, ...lookCodes };

export function createControls(THREE, { game, canvas, joystick, thumb, playing, seated, touchMode, look, jump, interact, pause }) {
  const keys = new Set();
  const presses = new Map();
  const stickAxis = new THREE.Vector2();
  const mouseDelta = new THREE.Vector2();
  const motion = new THREE.Vector2();
  let stickPointer = null;
  let lookPointer = null;

  function resetStick() {
    stickPointer = null;
    stickAxis.set(0, 0);
    thumb.style.transform = '';
  }

  function clearInput() {
    keys.clear();
    for (const pointerId of presses.keys()) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    }
    presses.clear();
    lookPointer = null;
    mouseDelta.set(0, 0);
    if (stickPointer !== null && joystick.hasPointerCapture(stickPointer)) joystick.releasePointerCapture(stickPointer);
    resetStick();
  }

  canvas.addEventListener('click', () => {
    if (!playing() || touchMode() || document.pointerLockElement === canvas) return;
    // The arrow keys and the interaction button are available without a lock.
    canvas.requestPointerLock?.()?.catch(() => {});
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      if (!playing()) document.exitPointerLock();
    } else if (playing() && !touchMode()) {
      pause();
    }
  });

  window.addEventListener('mousemove', event => {
    if (!playing() || document.pointerLockElement !== canvas) return;
    mouseDelta.x += event.movementX;
    mouseDelta.y += event.movementY;
  }, { passive: true });

  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && playing()) {
      pause();
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
    if (!playing() || seated() || !touchMode() || stickPointer !== null) return;
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
    pause();
  });

  function sample(dt) {
    const horizontal = Number(keys.has('lookRight')) - Number(keys.has('lookLeft'));
    const vertical = Number(keys.has('lookDown')) - Number(keys.has('lookUp'));
    const dx = horizontal * dt * 1.65 + mouseDelta.x * 0.0022;
    const dy = vertical * dt * 1.65 + mouseDelta.y * 0.0022;
    mouseDelta.set(0, 0);
    if (dx || dy) look(dx, dy);

    const strafe = Number(keys.has('right')) - Number(keys.has('left'));
    const advance = Number(keys.has('backward')) - Number(keys.has('forward'));
    motion.set(strafe, advance);
    if (stickAxis.lengthSq() > 0.01) motion.add(stickAxis);
    return motion.clampLength(0, 1);
  }

  return {
    clear: clearInput,
    sample,
    releaseMouse() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
  };
}
