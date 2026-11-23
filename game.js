import { areaMetadata } from './area-catalog.js';
import { createGame } from './core/game.js';

function publicArea(metadata, folder, loadModule) {
  return { ...metadata, show: true, thumbnail: new URL(`./areas/${folder}/${folder}.jpg`, import.meta.url).href, loadModule };
}

export const areas = {
  garden: publicArea(areaMetadata['garden'], 'flower-garden', () => import('./areas/flower-garden/index.js')),
  snow: publicArea(areaMetadata['snow'], 'snow-basin', () => import('./areas/snow-basin/index.js')),
  'wooden-house': publicArea(areaMetadata['wooden-house'], 'wooden-house', () => import('./areas/wooden-house/index.js')),
  'frozen-castle': publicArea(areaMetadata['frozen-castle'], 'frozen-castle', () => import('./areas/frozen-castle/index.js')),
  'arendelle-village': publicArea(areaMetadata['arendelle-village'], 'arendelle-village', () => import('./areas/arendelle-village/index.js')),
  'princess-gallery': publicArea(areaMetadata['princess-gallery'], 'princess-gallery', () => import('./areas/princess-gallery/index.js')),
  'military-base': publicArea(areaMetadata['military-base'], 'military-base', () => import('./areas/military-base/index.js')),
  'kung-fu-hustle': publicArea(areaMetadata['kung-fu-hustle'], 'kung-fu-hustle', () => import('./areas/kung-fu-hustle/index.js')),
  'secret-apartment': {
    ...areaMetadata['secret-apartment'], show: false, loadModule: () => import('./areas/secret-apartment/index.js'),
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
