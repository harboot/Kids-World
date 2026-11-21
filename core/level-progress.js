import { isPublicArea } from './area-registry.js';

const progressKey = 'kids-world-completed-levels';

export function createLevelProgress(areas, getStorage = () => globalThis.localStorage) {
  const completed = new Set();
  // A revised mission list gets its own badge while other areas keep their existing records.
  const recordFor = id => areas[id].completionRevision ? `${id}@${areas[id].completionRevision}` : id;
  const records = new Map(Object.keys(areas).filter(id => isPublicArea(areas, id)).map(id => [recordFor(id), id]));

  function refresh() {
    try {
      const saved = JSON.parse(getStorage().getItem(progressKey));
      if (!Array.isArray(saved)) return;
      for (const record of saved) {
        const id = records.get(record);
        if (id !== undefined) completed.add(id);
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
      getStorage().setItem(progressKey, JSON.stringify([...completed].map(recordFor)));
    } catch {
      // Keep the completion for the current game.
    }
  }

  refresh();
  return { complete, refresh, has: id => completed.has(id) };
}
