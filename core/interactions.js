const INTERACTION_RADIUS = 2.35;

export function nearestInteraction(items, position, inView) {
  let nearest = null;
  let best = Infinity;
  for (const item of items) {
    if (item.active === false || (item.reachable && !item.reachable(position))) continue;
    const distance = Math.hypot(position.x - item.x, position.z - item.z);
    if (distance < best && distance <= (item.radius ?? INTERACTION_RADIUS) &&
        (!(item.requiresView || item.aimRadius) || !inView || inView(item))) {
      nearest = item;
      best = distance;
    }
  }
  return nearest;
}

export function createInteractions(THREE, { button, glyph, label, camera, playing, touchMode, runAction }) {
  const point = new THREE.Vector3();
  const { clamp } = THREE.MathUtils;
  let items = [];
  let pinned = null;

  function project(item) {
    point.set(item.x, item.anchorY ?? 1.38, item.z).project(camera);
    const { x, y, z } = point;
    const onScreen = z >= -1 && z <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1;
    return onScreen && (!item.aimRadius || Math.hypot(x * camera.aspect, y) <= item.aimRadius);
  }

  function nearby() {
    return playing() ? pinned ?? nearestInteraction(items, camera.position, project) : null;
  }

  function update() {
    const item = nearby();
    button.hidden = !item;
    if (!item) return;
    const key = touchMode() ? '↗' : 'M';
    if (glyph.textContent !== key) glyph.textContent = key;
    if (label.textContent !== item.label) label.textContent = item.label;
    let left = 50;
    let top = 68;
    if (!pinned && project(item)) {
      left = clamp(50 + 50 * point.x, 22, 78);
      top = clamp(50 - 50 * point.y, 20, 71);
    }
    button.style.setProperty('--interaction-x', `${left.toFixed(1)}%`);
    button.style.setProperty('--interaction-y', `${top.toFixed(1)}%`);
  }

  function interact() {
    const item = nearby();
    if (!item) return;
    runAction(item);
    update();
  }

  button.addEventListener('click', interact);
  button.addEventListener('touchend', event => {
    if (!touchMode()) return;
    // Handle taps even when a preceding joystick gesture suppresses the click.
    event.preventDefault();
    const { clientX, clientY } = event.changedTouches[0];
    if (button.contains(document.elementFromPoint(clientX, clientY))) interact();
  }, { passive: false });

  return {
    setItems(next) {
      items = next;
      pinned = null;
      button.hidden = true;
    },
    pin(prompt) { pinned = prompt; },
    hide() { button.hidden = true; },
    update,
    interact,
  };
}
