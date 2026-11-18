import { flowerGarden } from './areas/flower-garden/index.js';
import { snowBasin } from './areas/snow-basin.js';
import { woodenHouse } from './areas/wooden-house/index.js';
import { createGame } from './core/game.js';

export const areas = { garden: flowerGarden, snow: snowBasin, 'wooden-house': woodenHouse };

export function startGame(game) {
  return createGame({
    game,
    loadThree: () => import('./vendor/three.module.min.js'),
    areas,
    defaultArea: 'garden',
  });
}
