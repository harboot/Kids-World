export function hasArea(areas, id) {
  return typeof id === 'string' && Object.hasOwn(areas, id);
}

export function isPublicArea(areas, id) {
  return hasArea(areas, id) && areas[id]?.show === true;
}

export function validateAreaRegistry(areas) {
  for (const [id, area] of Object.entries(areas)) {
    if (area == null || !Object.hasOwn(area, 'show') || typeof area.show !== 'boolean') {
      throw new TypeError(`Area "${id}" must declare "show" as true or false.`);
    }
  }
}
