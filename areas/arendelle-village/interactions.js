import { SHOPS } from './buildings.js';

export function villageInteractions(isActive, notify) {
  function comingSoon(site, label, message) {
    return {
      ...site,
      label,
      get active() { return isActive(); },
      act() { if (isActive()) notify(message); },
    };
  }

  return [SHOPS.bakery, SHOPS.fruit].map(({ name, x, z, depth, yaw }) => {
    const dx = Math.sin(yaw);
    const dz = Math.cos(yaw);
    const doorX = x + dx * (depth / 2 + 0.23);
    const doorZ = z + dz * (depth / 2 + 0.23);
    return comingSoon({
      x: doorX, z: doorZ, anchorY: 1.65, radius: 2,
      reachable: player => (player.x - doorX) * dx + (player.z - doorZ) * dz >= 0,
    }, 'Visit ' + name, name + ' — Coming Soon');
  });
}

export function clockDoors(clock, lookout, isActive, mark) {
  const { lowerDoor } = clock;
  const { upperDoor, elevation } = lookout;
  const doors = [
    { site: lowerDoor, height: 0, label: 'Go Up Clock Tower',
      reachable: player => player.y < 3.3 && player.z >= lowerDoor.z,
      destination: { x: 0, z: -8.95, yaw: Math.PI, elevation } },
    { site: upperDoor, height: elevation, label: 'Go Down Clock Tower',
      reachable: player => player.y >= elevation && player.z >= upperDoor.z,
      destination: { x: lowerDoor.x, z: lowerDoor.z + 2.9, yaw: Math.PI } },
  ];
  return doors.map(({ site, height, label, reachable, destination }) => {
    mark(label, { ...site, z: site.z + 0.36, width: 1.58, depth: 0.79 }, height);
    return {
      ...site, label, reachable, radius: 1.75, anchorY: height + 1.28,
      get active() { return isActive(); },
      act({ relocate }) { if (isActive()) relocate(destination); },
    };
  });
}
