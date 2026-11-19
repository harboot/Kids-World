import { SHOPS } from './buildings.js';
import { GATE } from './decorations.js';
import { CITY_SIGN } from './harbor.js';

export function villageInteractions(isActive, notify) {
  const returnGate = {
    ...GATE,
    z: GATE.z - 0.5,
    anchorY: 2.3,
    radius: 2.25,
    label: 'Return to Frozen Castle',
    get active() { return isActive(); },
    act({ travel, heardCue }) {
      if (isActive()) travel('frozen-castle', heardCue, 'arendelle-village');
    },
  };

  function comingSoon(site, label, message) {
    return {
      ...site,
      label,
      get active() { return isActive(); },
      act() { if (isActive()) notify(message); },
    };
  }

  const shops = [SHOPS.bakery, SHOPS.fruit].map(({ name, x, z, depth, yaw }) => {
    const dx = Math.sin(yaw);
    const dz = Math.cos(yaw);
    const doorX = x + dx * (depth / 2 + 0.23);
    const doorZ = z + dz * (depth / 2 + 0.23);
    return comingSoon({
      x: doorX, z: doorZ, anchorY: 1.65, radius: 2,
      reachable: player => (player.x - doorX) * dx + (player.z - doorZ) * dz >= 0,
    }, 'Visit ' + name, name + ' — Coming Soon');
  });

  return [
    returnGate,
    ...shops,
    comingSoon({ ...CITY_SIGN, anchorY: 1.35, radius: 2.05 }, 'To The City', 'City Adventure — Coming Soon'),
  ];
}
