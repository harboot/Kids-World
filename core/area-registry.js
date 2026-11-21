export function hasArea(areas, id) {
  return typeof id === 'string' && Object.hasOwn(areas, id);
}

export function isPublicArea(areas, id) {
  return hasArea(areas, id) && areas[id]?.show === true;
}

function validateMetadata(id, area) {
  if (!id.trim() || area.id !== id) {
    throw new TypeError(`Area "${id}" must provide an "id" matching its registry key.`);
  }
  for (const key of ['width', 'depth']) {
    if (!Number.isFinite(area[key]) || area[key] <= 0) {
      throw new TypeError(`Area "${id}" must provide a positive, finite "${key}".`);
    }
  }
  for (const key of ['x', 'z']) {
    if (!Number.isFinite(area.spawn?.[key])) throw new TypeError(`Area "${id}" must provide a finite "spawn.${key}".`);
  }
  for (const key of ['yaw', 'elevation']) {
    if (area.spawn[key] !== undefined && !Number.isFinite(area.spawn[key])) {
      throw new TypeError(`Area "${id}" must provide a finite "spawn.${key}" when specified.`);
    }
  }
  for (const key of ['title', 'description', 'canvasLabel', 'themeColor', 'loadingMessage']) {
    if (key === 'loadingMessage' && area[key] === undefined) continue;
    if (typeof area[key] !== 'string' || !area[key].trim()) {
      throw new TypeError(`Area "${id}" must provide a nonempty "${key}" string.`);
    }
  }
  const { heading, completionRevision } = area;
  if (!Array.isArray(heading) || heading.length !== 2 ||
      typeof heading[0] !== 'string' || typeof heading[1] !== 'string' || !(heading[0].trim() || heading[1].trim())) {
    throw new TypeError(`Area "${id}" must provide a two-string "heading" with visible text.`);
  }
  if (completionRevision !== undefined && (!Number.isSafeInteger(completionRevision) || completionRevision < 1)) {
    throw new TypeError(`Area "${id}" must provide a positive integer "completionRevision" when specified.`);
  }
}

export function validateAreaRegistry(areas) {
  for (const [id, area] of Object.entries(areas)) {
    if (area == null || !Object.hasOwn(area, 'show') || typeof area.show !== 'boolean') {
      throw new TypeError(`Area "${id}" must declare "show" as true or false.`);
    }
    if (typeof area.loadModule !== 'function') {
      throw new TypeError(`Area "${id}" must provide a "loadModule" function.`);
    }
    validateMetadata(id, area);
  }
}

export async function loadAreaDefinition(id, area) {
  const importing = area.loadModule();
  if (typeof importing?.then !== 'function') {
    throw new TypeError(`Area "${id}" must return a Promise from "loadModule".`);
  }
  const definition = (await importing)?.default;
  if (typeof definition?.load !== 'function') {
    throw new TypeError(`Area "${id}" must default-export a definition with a "load" function.`);
  }
  validateMetadata(id, definition);
  return definition;
}
