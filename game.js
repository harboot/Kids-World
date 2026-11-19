import { arendelleVillage } from './areas/arendelle-village/index.js';
import { flowerGarden } from './areas/flower-garden/index.js';
import { snowBasin } from './areas/snow-basin.js';
import { woodenHouse } from './areas/wooden-house/index.js';
import { frozenCastle } from './areas/frozen-castle/index.js';
import { createGame } from './core/game.js';

export const areas = {
  garden: flowerGarden,
  snow: snowBasin,
  'wooden-house': woodenHouse,
  'frozen-castle': frozenCastle,
  'arendelle-village': arendelleVillage,
};

export function startGame(game) {
  return createGame({
    game,
    loadThree: () => import('./vendor/three.module.min.js'),
    areas,
    defaultArea: 'garden',
  });
}
