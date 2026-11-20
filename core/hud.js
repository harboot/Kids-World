import { normalizeMissionStatus } from './missions.js';

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

export function createMissionHud(game, timers = globalThis) {
  const details = game.querySelector('#mission-hud');
  const summary = game.querySelector('#mission-summary');
  const panel = game.querySelector('#mission-panel');
  const list = game.querySelector('#mission-list');
  const hintSection = game.querySelector('#mission-hint');
  const hintText = game.querySelector('#mission-hint-text');
  const inventorySection = game.querySelector('#mission-inventory');
  const inventoryText = game.querySelector('#mission-inventory-text');
  const toast = game.querySelector('#mission-toast');
  const doc = game.ownerDocument;
  let previous;
  let rows = [];
  let timer;

  // Keep native keyboard activation and scrolling available inside the HUD.
  details.addEventListener('keydown', event => {
    if (event.code === 'Space' || (event.target === panel && ['ArrowUp', 'ArrowDown'].includes(event.code))) {
      event.stopPropagation();
    }
  });

  function update(status) {
    const next = normalizeMissionStatus(status, previous);
    if (next === previous) return;
    if (!previous || next.missions.length !== rows.length ||
        next.missions.some(({ id }, index) => id !== previous.missions[index].id)) {
      rows = next.missions.map(() => {
        const row = doc.createElement('li');
        const title = doc.createElement('span');
        const count = doc.createElement('span');
        count.className = 'mission-count';
        row.append(title, count);
        return { row, title, count };
      });
      list.replaceChildren(...rows.map(({ row }) => row));
    }
    setText(summary, `${next.completed}/${next.missions.length}`);
    next.missions.forEach((mission, index) => {
      const { row, title, count } = rows[index];
      setText(title, mission.title);
      setText(count, `${mission.current}/${mission.total}`);
      row.toggleAttribute('data-complete', mission.complete);
    });
    hintSection.hidden = !next.hint;
    setText(hintText, next.hint);
    inventorySection.hidden = next.inventory.length === 0;
    setText(inventoryText, next.inventory.join(' · '));
    previous = next;
  }

  function clearNotification() {
    if (timer !== undefined) timers.clearTimeout(timer);
    timer = undefined;
    setText(toast, '');
  }

  function notify(message, { duration = 3000 } = {}) {
    if (!message || message === toast.textContent) return;
    clearNotification();
    setText(toast, message);
    timer = timers.setTimeout(clearNotification, duration);
  }

  function reset() {
    details.open = false;
    panel.scrollTop = 0;
    clearNotification();
  }

  return { update, notify, clearNotification, reset };
}
