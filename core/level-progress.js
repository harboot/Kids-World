import { isPublicArea } from './area-registry.js';

const progressKey = 'kids-world-completed-levels';

export function createLevelProgress(areas, getStorage = () => globalThis.localStorage) {
  const completed = new Set();

  function refresh() {
    try {
      const saved = JSON.parse(getStorage().getItem(progressKey));
      if (!Array.isArray(saved)) return;
      for (const id of saved) {
        if (isPublicArea(areas, id)) completed.add(id);
      }
    } catch {
      // The current game still tracks completions if storage is unavailable.
    }
  }

  function complete(id) {
    if (!isPublicArea(areas, id)) return;
    refresh();
    if (completed.has(id)) return;
    completed.add(id);
    try {
      getStorage().setItem(progressKey, JSON.stringify([...completed]));
    } catch {
      // Keep the completion for the current game.
    }
  }

  refresh();
  return { complete, refresh, has: id => completed.has(id) };
}
