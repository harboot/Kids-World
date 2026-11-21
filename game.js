import { arendelleVillage } from './areas/arendelle-village/index.js';
import { flowerGarden } from './areas/flower-garden/index.js';
import { snowBasin } from './areas/snow-basin/index.js';
import { woodenHouse } from './areas/wooden-house/index.js';
import { frozenCastle } from './areas/frozen-castle/index.js';
import { princessGallery } from './areas/princess-gallery/index.js';
import { militaryBase } from './areas/military-base/index.js';
import { secretApartment } from './areas/secret-apartment/index.js';
import { createGame } from './core/game.js';

function publicArea(area, folder) {
  return { ...area, show: true, thumbnail: new URL(`./areas/${folder}/${folder}.jpg`, import.meta.url).href };
}

export const areas = {
  garden: publicArea(flowerGarden, 'flower-garden'),
  snow: publicArea(snowBasin, 'snow-basin'),
  'wooden-house': publicArea(woodenHouse, 'wooden-house'),
  'frozen-castle': publicArea(frozenCastle, 'frozen-castle'),
  'arendelle-village': publicArea(arendelleVillage, 'arendelle-village'),
  'princess-gallery': publicArea(princessGallery, 'princess-gallery'),
  'military-base': publicArea(militaryBase, 'military-base'),
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
