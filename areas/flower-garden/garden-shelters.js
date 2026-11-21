import { addGroup } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';

export function addShelter(THREE, { scene, mesh, box, facet, matte, collision, obstacles, batchParts }, kind, x, z, roof) {
  const cow = kind === 'cow';
  const shelter = addGroup(THREE, scene, cow ? 'Cow feeding shelter' : 'Chicken nesting shelter', x, 0, z);
  const timber = matte(0x956140);
  const edge = matte(0xd3985d);
  const planks = matte(0xdbae78);
  const interior = matte(0x77563d);
  const straw = matte(0xc9a553);
  const part = (material, x, y, z, width, height, depth, shape = box) =>
    mesh(shape, material, x, y, z, width, height, depth, shelter, true);

  part(interior, 0, 0.065, 0, 3.22, 0.13, 1.7);
  for (let i = 0; i < 7; i++) {
    part(i % 2 ? edge : planks, 0, .21 + i * .215, -.819, 3.12, .198, .116);
  }
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) part(timber, side * 1.55, .87, end * .8, .19, 1.74, .18);
    for (let i = 0; i < (cow ? 4 : 7); i++) {
      part(i % 2 ? edge : planks, side * 1.55, .21 + i * .215, -.01, .12, .198, 1.41);
    }
    part(timber, side * 1.53, 1.6, 0, .2, .18, 1.8);
    part(timber, side * 1.37, 1.49, .807, .11, .49, .14).rotation.z = -side * .78;

    const pitch = -.33 * side;
    part(roof, side * .894, 1.936, 0, 1.914, .14, 2.17).rotation.z = pitch;
    for (let row = 0; row < 3; row++) {
      const run = .28 + row * .52;
      part(edge, side * run, 2.018 - run * Math.tan(.33), 1.067, .48, .045, .085).rotation.z = pitch;
    }
  }
  part(timber, 0, 1.698, .79, 3.16, .18, .18);
  part(edge, 0, 2.255, 0, .22, .116, 2.22);
  obstacles.push(collision(x, z, 3.26, 1.74, 1.66));

  const random = seededRandom(cow ? 8124 : 922);
  if (cow) {
    const trough = addGroup(THREE, shelter, 'Grass-filled feeding trough', 0, .16, .46);
    const troughPart = (material, x, y, z, w, h, d, shape = box) =>
      mesh(shape, material, x, y, z, w, h, d, trough);
    troughPart(timber, 0, .24, 0, 2.54, .14, .59);
    for (const side of [-1, 1]) {
      troughPart(edge, side * 1.21, .39, 0, .12, .31, .59);
      troughPart(edge, 0, .37, side * .26, 2.42, .24, .1);
      for (const end of [-1, 1]) troughPart(timber, side * .94, .16, end * .22, .14, .32, .15);
    }
    const greens = [0x70904a, 0x759c49, 0x9bb152].map(matte);
    for (let i = 0; i < 22; i++) {
      const tuft = troughPart(greens[i % 3], -1.09 + (i % 11) * .217, .41 + random() * .05,
        (i < 11 ? -.11 : .11) + random() * .06, .19, .14 + random() * .1, .18, facet);
      tuft.rotation.set(random() * .6, random() * 3, random() * .8 - .4);
    }
    batchParts(trough);
  } else {
    const nests = addGroup(THREE, shelter, 'Two rows of chicken nests', 0, 0, -.22);
    const egg = new THREE.SphereGeometry(1, 8, 6);
    const eggshells = [0xf5e5bf, 0xe6ba88, 0xf8eadd].map(matte);
    for (const y of [.47, .98]) {
      mesh(box, timber, 0, y, 0, 2.58, .115, 1.02, nests);
      for (let slot = -1; slot <= 1; slot++) {
        const nx = slot * .84;
        mesh(facet, straw, nx, y + .11, .16, .35, .135, .31, nests);
        for (let i = 0; i < 3; i++) {
          const shell = mesh(egg, eggshells[i], nx + (i - 1) * .143, y + .235 + random() * .028,
            i === 1 ? .24 : .12, .078, .112, .082, nests);
          shell.rotation.z = (i - 1) * .24;
        }
      }
    }
    for (let index = 0; index < 4; index++) {
      mesh(box, edge, (index - 1.5) * .84, .758, .045, .078, .66, .86, nests);
    }
    const ramp = part(planks, -.77, .244, .848, .52, .095, .76);
    ramp.rotation.x = .47;
    for (let i = 0; i < 4; i++) {
      part(edge, -.77, .376 - i * .073, .615 + i * .151, .54, .036, .059);
    }
    obstacles.push(collision(x - .77, z + 1.02, .52, .48, .26));
    batchParts(nests);
  }
  batchParts(shelter);
}
