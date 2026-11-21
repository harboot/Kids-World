import { addGroup } from '../../core/geometry.js';
import { buildBelleCharacters } from './belle-characters.js';
import { buildBelleLibrary } from './belle-library.js';
import { buildEnchantedTea } from './belle-tea.js';
import { spaceTransform } from './parts.js';

export function buildBelle(context) {
  const { THREE, bay, parts, exhibit } = context;
  const { matte } = parts;
  const room = addGroup(THREE, bay, 'Belle castle library');
  const palette = {
    oak: matte(0x8c5945),
    dark: matte(0x52323c),
    ivory: matte(0xd6b7a0),
    cream: matte(0xf7e1ba),
    gold: matte(0xbe8748),
    goldLeaf: matte(0xe8ae5b),
    wine: matte(0x81415c),
    glow: matte(0xffce76, { emissive: 0xff9d59, emissiveIntensity: .68 }),
  };
  const library = { ...context, room, palette };
  const ground = buildBelleLibrary(library);
  buildBelleCharacters(library);
  const tea = buildEnchantedTea(library);
  const { toLocal } = spaceTransform(exhibit);
  const local = [0, 0];
  return {
    getGroundHeight(x, z) {
      toLocal(x, z, local);
      return ground(local[0], local[1]);
    },
    update(dt, player, _grounded, still) {
      return tea.update(dt, player, still);
    },
    reset: tea.reset,
  };
}
