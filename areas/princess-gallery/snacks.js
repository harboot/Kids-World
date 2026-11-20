import { addGroup } from '../../core/geometry.js';

export function createSnackModels(THREE, parts, colors) {
  const { part, beam } = parts;
  const { cream, cherry, butter, pink, bun, pickle, print, ice } = colors;
  const cup = new THREE.CylinderGeometry(.184, .121, .33, 12, 1, true).toNonIndexed();
  const stripes = Array.from({ length: cup.getAttribute('position').count }, (_, index) => {
    const color = Math.floor(index / 6) % 2 ? cherry.color : cream.color;
    return [color.r, color.g, color.b];
  }).flat();
  cup.setAttribute('color', new THREE.Float32BufferAttribute(stripes, 3));

  function kernels(group, x, y, z, count, scatter) {
    for (let i = 0; i < count; i++) {
      const angle = i * 2.40;
      const spread = scatter * Math.sqrt((i + .5) / count);
      part(group, 'ball', i % 3 ? butter : cream, x + Math.cos(angle) * spread, y + .058 * Math.sin(i * 3.5),
        z + Math.sin(angle) * spread, .060, .056, .057);
    }
  }

  return {
    kernels,
    popcorn(group) {
      part(group, cup, print, 0, 0, 0, 1, 1, 1);
      part(group, 'drum', cream, 0, .167, 0, .184, .017, .184);
      const filling = addGroup(THREE, group, 'Popcorn kernels', 0, .197, 0);
      kernels(filling, 0, 0, 0, 15, .147);
      return filling;
    },
    cotton(group, tint = pink) {
      part(group, 'cone', cream, 0, 0, 0, .077, .38, .077).rotation.z = Math.PI;
      const fluff = addGroup(THREE, group, 'Cotton candy fluff', 0, .30, 0);
      for (const [x, y, z, scale] of [[-.045, 0, 0, 1], [.11, .055, .034, .68], [0, .16, -.003, .78]]) {
        part(fluff, 'sphere', tint, x, y, z, .16 * scale, .16 * scale, .129 * scale);
      }
      return fluff;
    },
    hotDog(group, tint = butter) {
      const sandwich = addGroup(THREE, group, 'Hot dog and bun');
      part(sandwich, 'sphere', bun, 0, 0, 0, .132, .084, .247);
      part(sandwich, 'sphere', cherry, 0, .068, 0, .074, .057, .239);
      for (let i = 0; i < 7; i++) {
        const x = i % 2 ? .039 : -.039;
        beam(sandwich, tint, [x, .12, -.16 + i * .049], [-x, .12, -.111 + i * .049], .023);
      }
      return sandwich;
    },
    drink(group, tint = pickle) {
      part(group, 'drum', tint, 0, 0, 0, .123, .32, .123);
      part(group, 'drum', cream, 0, .162, 0, .138, .053, .138);
      beam(group, ice, [0, .167, 0], [.043, .338, .017], .032);
      beam(group, cream, [.043, .338, .017], [.111, .366, .036], .032);
    },
  };
}
