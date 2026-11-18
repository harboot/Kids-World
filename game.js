import { flowerGarden } from './areas/flower-garden/index.js';
import { snowBasin } from './areas/snow-basin.js';
import { createGame } from './core/game.js';

export function startGame(game) {
  return createGame({
    game,
    loadThree: () => import('./vendor/three.module.min.js'),
    areas: { garden: flowerGarden, snow: snowBasin },
    defaultArea: 'garden',
  });
}
