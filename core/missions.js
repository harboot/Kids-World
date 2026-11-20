const emptyInventory = [];

function sameMissions(missions, previous) {
  return missions.length === previous.length && previous.every((row, index) => {
    const mission = missions[index];
    return mission?.id === row.id && mission.title === row.title && mission.current === row.current &&
      mission.total === row.total && mission.complete === row.complete;
  });
}

export function normalizeMissionStatus(status, previous) {
  if (!Array.isArray(status?.missions)) throw new TypeError('Mission status must provide a missions array.');
  const { missions } = status;
  const hint = status.hint ?? '';
  const inventory = status.inventory ?? emptyInventory;
  if (typeof hint !== 'string') throw new TypeError('Mission hint must be text.');
  if (!Array.isArray(inventory)) throw new TypeError('Mission inventory must be an array of item names.');
  const hintText = hint.trim();

  if (previous && hintText === previous.hint && inventory.length === previous.inventory.length &&
      previous.inventory.every((item, index) => item === inventory[index]) && sameMissions(missions, previous.missions)) {
    return previous;
  }

  const ids = new Set();
  let completed = 0;
  const rows = Array.from(missions, mission => {
    const { id, title, current, total, complete } = mission ?? {};
    if (typeof id !== 'string' || !id.trim() || ids.has(id)) {
      throw new TypeError(`Mission ID "${id}" must be nonempty and unique.`);
    }
    if (typeof title !== 'string' || !title.trim()) throw new TypeError(`Mission "${id}" must have a title.`);
    if (!Number.isInteger(current) || !Number.isInteger(total) || total < 1 || current < 0 || current > total) {
      throw new RangeError(`Mission "${id}" must have whole-number progress between zero and a positive total.`);
    }
    if (typeof complete !== 'boolean') throw new TypeError(`Mission "${id}" must declare completion as true or false.`);
    ids.add(id);
    completed += Number(complete);
    return { id, title, current, total, complete };
  });
  for (const item of inventory) {
    if (typeof item !== 'string' || !item.trim()) throw new TypeError('Mission inventory items must have names.');
  }

  return { missions: rows, completed, hint: hintText, inventory: [...inventory] };
}
