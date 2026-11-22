import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { buildMagicCarpet, CARPET_DOCK } from './jasmine-carpet.js';
import { buildAgrabahCharacters, LAMP_SITE } from './jasmine-characters.js';
import { buildAgrabah } from './jasmine-palace.js';
import { addGallerySign, addRoundSolid, spaceTransform } from './parts.js';

export function buildJasmine(context) {
  const { THREE, document, bay, parts, exhibit, obstacles } = context;
  const room = addGroup(THREE, bay, 'Agrabah courtyard');
  const { part, batch, matte } = parts;
  const { toWorld, toLocal } = spaceTransform(exhibit);
  const colors = {
    sandstone: matte(0xddad80),
    cream: matte(0xf6dfb4),
    shade: matte(0xad755d),
    gold: matte(0xe8bb69),
    brass: matte(0xc58b46),
    teal: matte(0x468b87),
    blue: matte(0x366683),
    dark: matte(0x503a56),
    lantern: matte(0xffd887, { emissive: 0xe9a643, emissiveIntensity: .51 }),
  };
  const scene = { ...context, room, colors, toWorld, toLocal };
  buildAgrabah(scene);
  const lamp = buildAgrabahCharacters(scene);
  const carpet = buildMagicCarpet(scene);

  const signs = new THREE.Group();
  for (const [x, z, title, action, width] of [
    [2.15, CARPET_DOCK.z + .71, 'Magic carpet', 'Ride around the palace', 2.15],
    [LAMP_SITE.x - 1.38, LAMP_SITE.z + .76, 'Magic lamp', 'Rub the lamp', 1.91],
  ]) {
    part(signs, 'box', colors.shade, x, .45, z, .12, .90, .15);
    part(signs, 'box', colors.gold, x, 1.02, z, width, .65, .135);
    addGallerySign(THREE, document, room, [title, action], x, 1.02, z + .0675 + SURFACE_GAP.detail, width - .11, .55);
    addRoundSolid(obstacles, ...toWorld(x, z), .11, 1.35);
  }
  batch(signs, room);

  return {
    interactions: [carpet.interaction, lamp.interaction],
    update(dt, _player, _grounded, still, elapsed = dt) {
      lamp.update(elapsed, still);
      return carpet.update(elapsed, still);
    },
    reset() {
      carpet.reset();
      lamp.reset();
    },
  };
}
