import { arendelleVillage } from './areas/arendelle-village/index.js';
import { flowerGarden } from './areas/flower-garden/index.js';
import { snowBasin } from './areas/snow-basin.js';
import { woodenHouse } from './areas/wooden-house/index.js';
import { frozenCastle } from './areas/frozen-castle/index.js';
import { secretApartment } from './areas/secret-apartment/index.js';
import { createGame } from './core/game.js';

export const areas = {
  garden: { ...flowerGarden, show: true },
  snow: { ...snowBasin, show: true },
  'wooden-house': { ...woodenHouse, show: true },
  'frozen-castle': { ...frozenCastle, show: true },
  'arendelle-village': { ...arendelleVillage, show: true },
  'secret-apartment': { ...secretApartment, show: false },
};

export function startGame(game) {
  return createGame({
    game,
    loadThree: () => import('./vendor/three.module.min.js'),
    areas,
    defaultArea: 'garden',
  });
}
