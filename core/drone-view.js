import { createCoordinatePicker, formatCoordinate, formatCoordinates } from './coordinate-picker.js';
import { releaseCapture } from './controls.js';

const fitMargin = 1.12;
const minZoom = 0.8;
const maxZoom = 16;
const dragThreshold = 6;

export function isDroneView(url) {
  return url.searchParams.get('view') === 'drone';
}

export function replaceDroneView(url, history, enabled) {
  const target = new URL(url);
  if (enabled) target.searchParams.set('view', 'drone');
  else target.searchParams.delete('view');
  history.replaceState(history.state, '', target);
}

export function createDroneCamera(THREE) {
  const camera = new THREE.OrthographicCamera();
  camera.rotation.x = -Math.PI / 2;
  const { clamp } = THREE.MathUtils;
  let centerX, centerZ, width, depth, aspect;

  function move(x, z) {
    camera.position.x = clamp(x, centerX - width / 2, centerX + width / 2);
    camera.position.z = clamp(z, centerZ - depth / 2, centerZ + depth / 2);
    camera.updateMatrixWorld();
  }

  function resize(nextAspect) {
    if (aspect === nextAspect) return false;
    aspect = nextAspect;
    const halfHeight = Math.max(depth, width / aspect) * fitMargin / 2;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    return true;
  }

  function reset() {
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    move(centerX, centerZ);
  }

  function focus(definition, override, nextAspect) {
    const x = override?.center?.x ?? 0;
    const z = override?.center?.z ?? 0;
    const nextWidth = override?.width ?? definition.width;
    const nextDepth = override?.depth ?? definition.depth;
    if (x === centerX && z === centerZ && nextWidth === width && nextDepth === depth) return false;
    centerX = x;
    centerZ = z;
    width = nextWidth;
    depth = nextDepth;
    const clearance = Math.max(width, depth, 64);
    camera.position.y = clearance + 24;
    camera.near = 0.1;
    camera.far = camera.position.y + clearance;
    aspect = undefined;
    resize(nextAspect);
    reset();
    return true;
  }

  function pan(x, y, rect) {
    if (!rect.width || !rect.height) return;
    const horizontal = (camera.right - camera.left) / (camera.zoom * rect.width);
    const vertical = (camera.top - camera.bottom) / (camera.zoom * rect.height);
    move(camera.position.x - x * horizontal, camera.position.z - y * vertical);
  }

  function zoom(factor, clientX, clientY, rect) {
    const next = clamp(camera.zoom * factor, minZoom, maxZoom);
    if (camera.zoom === next || !rect.width || !rect.height) return;
    const scale = 1 / camera.zoom - 1 / next;
    const x = (clientX - rect.left) / rect.width - 0.5;
    const z = (clientY - rect.top) / rect.height - 0.5;
    camera.zoom = next;
    camera.updateProjectionMatrix();
    move(camera.position.x + x * (camera.right - camera.left) * scale,
      camera.position.z + z * (camera.top - camera.bottom) * scale);
  }

  return { camera, focus, resize, reset, pan, zoom };
}

export function bindDroneControls(canvas, { signal, enabled, pan, zoom, select }) {
  const pointers = new Map();
  let moved = false;

  function clear() {
    const ids = [...pointers.keys()];
    pointers.clear();
    for (const id of ids) releaseCapture(canvas, id);
  }

  canvas.addEventListener('pointerdown', event => {
    if (!enabled() || event.button !== 0) return;
    const { pointerId, clientX: x, clientY: y } = event;
    moved = pointers.size > 0;
    pointers.set(pointerId, { x, y });
    canvas.setPointerCapture(pointerId);
  }, { signal });

  canvas.addEventListener('pointermove', event => {
    const point = pointers.get(event.pointerId);
    if (!point || !enabled()) return;
    const { clientX: x, clientY: y } = event;
    const dx = x - point.x;
    const dy = y - point.y;
    if (pointers.size === 1) {
      if (!moved && Math.hypot(dx, dy) < dragThreshold) return;
      moved = true;
      pan(dx, dy);
    } else if (pointers.size === 2) {
      const [first, second] = pointers.values();
      const other = first === point ? second : first;
      const before = Math.hypot(point.x - other.x, point.y - other.y);
      const after = Math.hypot(x - other.x, y - other.y);
      pan(dx / 2, dy / 2);
      if (before > 0 && after > 0) zoom(after / before, (x + other.x) / 2, (y + other.y) / 2);
    }
    point.x = x;
    point.y = y;
  }, { signal });

  canvas.addEventListener('pointerup', event => {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    pointers.delete(event.pointerId);
    if (enabled() && !moved && Math.hypot(event.clientX - point.x, event.clientY - point.y) < dragThreshold) {
      select(event.clientX, event.clientY);
    }
  }, { signal });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => {
      if (pointers.delete(event.pointerId)) moved = true;
    }, { signal });
  }
  canvas.addEventListener('wheel', event => {
    if (!enabled()) return;
    event.preventDefault();
    const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    const amount = Math.max(-400, Math.min(400, event.deltaY * units));
    zoom(Math.exp(-amount * 0.002), event.clientX, event.clientY);
  }, { signal, passive: false });
  signal.addEventListener('abort', clear, { once: true });
  return clear;
}

export function createDroneView(THREE, { game, canvas, aspect, enabled, invalidate, exit }) {
  const browser = game.ownerDocument.defaultView;
  const panel = game.querySelector('#drone-panel');
  const title = game.querySelector('#drone-area');
  const coordinates = game.querySelector('#drone-coordinates');
  const copy = game.querySelector('#drone-copy');
  const reset = game.querySelector('#drone-reset');
  const exitButton = game.querySelector('#drone-exit');
  const feedback = game.querySelector('#drone-feedback');
  const marker = game.querySelector('#drone-marker');
  const orbit = createDroneCamera(THREE);
  const pick = createCoordinatePicker(THREE);
  const screen = new THREE.Vector3();
  let visit, input, cancelGesture, originalVisibility, point, feedbackTimer;

  function updateMarker() {
    if (point) {
      screen.copy(point).project(orbit.camera);
      marker.hidden = Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1;
      marker.style.left = `${(screen.x + 1) * 50}%`;
      marker.style.top = `${(1 - screen.y) * 50}%`;
    } else marker.hidden = true;
    invalidate();
  }

  function message(text = '', temporary = false) {
    clearTimeout(feedbackTimer);
    if (feedback.textContent !== text) feedback.textContent = text;
    feedbackTimer = temporary ? setTimeout(() => message(), 2800) : undefined;
  }

  function select(next) {
    point = next;
    copy.disabled = !point;
    coordinates.hidden = !point;
    if (point) {
      coordinates.textContent = `X: ${formatCoordinate(point.x)}  Y: ${formatCoordinate(point.y)}  Z: ${formatCoordinate(point.z)}`;
    } else coordinates.textContent = '';
    updateMarker();
  }

  function stop() {
    if (!visit) return;
    input.abort();
    visit.viewmodel.visible = originalVisibility;
    canvas.setAttribute('aria-label', visit.definition.canvasLabel);
    visit = input = cancelGesture = undefined;
    delete game.dataset.view;
    panel.hidden = true;
    select(null);
    message();
  }

  function update() {
    if (!visit) return;
    if (orbit.focus(visit.definition, visit.area.droneView, aspect())) {
      select(null);
      message();
    } else if (orbit.resize(aspect())) updateMarker();
  }

  function start(next) {
    if (visit === next) return;
    stop();
    visit = next;
    input = new AbortController();
    const { signal } = input;
    visit.lifetime.signal.addEventListener('abort', stop, { once: true, signal });
    originalVisibility = visit.viewmodel.visible;
    visit.viewmodel.visible = false;
    game.dataset.view = 'drone';
    panel.hidden = false;
    title.textContent = visit.definition.title;
    canvas.setAttribute('aria-label', `Top-down view of ${visit.definition.title}`);
    update();
    orbit.reset();
    updateMarker();

    cancelGesture = bindDroneControls(canvas, {
      signal, enabled,
      pan(x, y) {
        orbit.pan(x, y, canvas.getBoundingClientRect());
        updateMarker();
      },
      zoom(factor, x, y) {
        orbit.zoom(factor, x, y, canvas.getBoundingClientRect());
        updateMarker();
      },
      select(x, y) {
        select(pick(visit.scene, orbit.camera, visit.viewmodel, x, y, canvas.getBoundingClientRect()));
        message(point ? '' : 'No surface at that point.', !point);
      },
    });

    reset.addEventListener('click', () => {
      orbit.reset();
      updateMarker();
    }, { signal });
    exitButton.addEventListener('click', exit, { signal });
    browser.addEventListener('keydown', event => {
      if (enabled() && event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        exit();
      }
    }, { signal });
    copy.addEventListener('click', async () => {
      if (!point) return;
      const selected = point;
      const activeInput = input;
      let result;
      try {
        await browser.navigator.clipboard.writeText(formatCoordinates(selected));
        result = 'Coordinates copied.';
      } catch {
        result = 'Clipboard unavailable. Select the coordinates to copy them.';
      }
      if (input === activeInput && point === selected) message(result, true);
    }, { signal });
  }

  return {
    get camera() { return visit && orbit.camera; },
    start, stop, update,
    cancelGesture() { cancelGesture?.(); },
  };
}
