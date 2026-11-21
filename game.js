import { metadata as village } from './areas/arendelle-village/metadata.js';
import { metadata as garden } from './areas/flower-garden/metadata.js';
import { metadata as castle } from './areas/frozen-castle/metadata.js';
import { metadata as base } from './areas/military-base/metadata.js';
import { metadata as gallery } from './areas/princess-gallery/metadata.js';
import { metadata as apartment } from './areas/secret-apartment/metadata.js';
import { metadata as snow } from './areas/snow-basin/metadata.js';
import { metadata as house } from './areas/wooden-house/metadata.js';
import { createGame } from './core/game.js';

function publicArea(metadata, folder, loadModule) {
  return { ...metadata, show: true, thumbnail: new URL(`./areas/${folder}/${folder}.jpg`, import.meta.url).href, loadModule };
}

export const areas = {
  garden: publicArea(garden, 'flower-garden', () => import('./areas/flower-garden/index.js')),
  snow: publicArea(snow, 'snow-basin', () => import('./areas/snow-basin/index.js')),
  'wooden-house': publicArea(house, 'wooden-house', () => import('./areas/wooden-house/index.js')),
  'frozen-castle': publicArea(castle, 'frozen-castle', () => import('./areas/frozen-castle/index.js')),
  'arendelle-village': publicArea(village, 'arendelle-village', () => import('./areas/arendelle-village/index.js')),
  'princess-gallery': publicArea(gallery, 'princess-gallery', () => import('./areas/princess-gallery/index.js')),
  'military-base': publicArea(base, 'military-base', () => import('./areas/military-base/index.js')),
  'secret-apartment': {
    ...apartment, show: false, loadModule: () => import('./areas/secret-apartment/index.js'),
  },
};

export function startGame(game) {
  return createGame({
    game,
    loadThree: () => import('./vendor/three.module.min.js'),
    areas,
    defaultArea: 'garden',
  });
}
