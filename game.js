import { flowerGarden } from './areas/flower-garden/index.js';
import { snowBasin } from './areas/snow-basin.js';
import { createGame } from './core/game.js';

createGame({
  game: document.querySelector('#game'),
  loadThree: () => import('https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js'),
  areas: { garden: flowerGarden, snow: snowBasin },
  defaultArea: 'garden',
});
