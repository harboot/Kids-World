import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { addGallerySign, addSolid } from './parts.js';

const sites = [
  { name: 'Popcorn', x: -10.8, z: 49, yaw: 1.16, color: 0xae5266, accent: 0xe7a158, build: popcorn },
  { name: 'Cotton Candy', x: -23.7, z: -18.3, yaw: -1.46, color: 0xb3629a, accent: 0x8eacd1, build: cottonCandy },
  { name: 'Hot Dogs', x: 8.5, z: -20, yaw: -.40, color: 0x7d5343, accent: 0xd79455, build: hotDogs },
  { name: 'Cold Drinks', x: 26.25, z: -2.8, yaw: -1.08, color: 0x45788c, accent: 0x6eb09e, build: drinks },
];

function popcorn({ THREE, part, beam, group, colors }) {
  const { cream, gold, cherry, butter, navy, pane, print } = colors;
  part(group, 'box', navy, -.56, 1.30, -.085, .96, .14, .70);
  for (const x of [-1.01, -.11]) for (const z of [-.40, .225]) {
    beam(group, gold, [x, 1.36, z], [x, 1.99, z], .058);
  }
  part(group, 'box', cherry, -.56, 2.025, -.085, .98, .11, .74);
  for (const z of [-.400, .225]) part(group, 'box', pane, -.56, 1.67, z, .86, .61, .012);
  for (const x of [-.996, -.124]) part(group, 'box', pane, x, 1.67, -.085, .012, .61, .61);

  const cup = new THREE.CylinderGeometry(.184, .121, .33, 12, 1, true).toNonIndexed();
  const stripes = Array.from({ length: cup.getAttribute('position').count }, (_, index) => {
    const color = Math.floor(index / 6) % 2 ? cherry.color : cream.color;
    return [color.r, color.g, color.b];
  }).flat();
  cup.setAttribute('color', new THREE.Float32BufferAttribute(stripes, 3));
  function fill(x, z, y, cols, scatter) {
    for (let i = 0; i < cols; i++) {
      const angle = i * 2.40;
      const spread = scatter * Math.sqrt((i + .5) / cols);
      part(group, 'ball', i % 3 ? butter : cream, x + Math.cos(angle) * spread, y + .058 * Math.sin(i * 3.5),
        z + Math.sin(angle) * spread, .060, .056, .057);
    }
  }
  for (const [x, z] of [[.32, .23], [.83, -.05]]) {
    // The stripes are part of the cup surface.
    part(group, cup, print, x, 1.407, z, 1, 1, 1);
    part(group, 'drum', cream, x, 1.577, z, .184, .020, .184);
    fill(x, z, 1.61, 15, .147);
  }
  for (const [x, z] of [[-.80, -.21], [-.60, .035], [-.33, -.095]]) fill(x, z, 1.41, 11, .145);
}

function cottonCandy({ part, beam, group, colors }) {
  const { gold, cream, pink, lilac, ice, cherry } = colors;
  for (const x of [-.93, .88]) beam(group, gold, [x, 1.26, -.14], [x, 2.01, -.14], .045);
  beam(group, gold, [-.93, 2.00, -.14], [.88, 2.00, -.14], .049);
  for (const [i, x, z] of [[0, -.72, -.08], [1, -.34, .11], [2, .08, -.19], [3, .48, .08], [4, .81, -.15]]) {
    const fluff = [pink, ice, lilac, pink, ice][i];
    part(group, 'cone', cream, x, 1.48, z, .077, .38, .077).rotation.z = Math.PI;
    for (const [dx, dy, dz, scale] of [[-.045, 0, 0, 1], [.11, .055, .034, .68], [0, .16, -.003, .78]]) {
      part(group, 'sphere', fluff, x + dx, 1.78 + dy, z + dz, .16 * scale, .16 * scale, .129 * scale);
    }
  }
  part(group, 'box', cherry, 0, 1.29, .37, .94, .082, .31);
  for (const x of [-.32, -.14, .11, .30]) part(group, 'drum', cream, x, 1.34, .37, .027, .035, .027);
}

function hotDogs({ part, beam, group, colors }) {
  const { navy, gold, bun, cherry, butter, pickle, cream } = colors;
  part(group, 'box', navy, -.46, 1.314, -.08, 1.25, .13, .82);
  for (const x of [-1.03, .11]) part(group, 'box', cream, x, 1.413, -.08, .071, .10, .84);
  for (let i = 0; i < 9; i++) {
    part(group, 'box', gold, -.97 + i * .126, 1.384, -.08, .034, .036, .765);
  }
  for (const [x, z, yell] of [[-.82, -.18, true], [-.49, -.06, false], [-.16, -.135, true]]) {
    part(group, 'sphere', bun, x, 1.459, z, .132, .084, .247);
    part(group, 'sphere', cherry, x, 1.527, z, .074, .057, .239);
    for (let i = 0; i < 7; i++) {
      beam(group, yell ? butter : pickle, [x + (i % 2 ? .039 : -.039), 1.579, z - .16 + i * .049],
        [x + (i % 2 ? -.039 : .039), 1.579, z - .111 + i * .049], .023);
    }
  }
  for (const [x, material] of [[.52, cherry], [.84, butter]]) {
    part(group, 'drum', material, x, 1.450, -.10, .081, .37, .081);
    part(group, 'cone', cream, x, 1.663, -.10, .052, .100, .052);
  }
}

function drinks({ part, beam, group, colors }) {
  const { ice, navy, cherry, butter, cream, pickle } = colors;
  part(group, 'box', navy, -.42, 1.382, -.10, 1.30, .272, .84);
  part(group, 'box', ice, -.42, 1.524, -.10, 1.254, .060, .794);
  for (const [i, x, z] of [[0, -.9, -.34], [1, -.60, .10], [2, -.35, -.24], [3, -.08, .11], [4, .05, -.26]]) {
    const tint = [cherry, butter, pickle, cherry, butter][i];
    part(group, 'drum', tint, x, 1.694, z, .085, .318, .085);
    part(group, 'sphere', tint, x, 1.858, z, .084, .077, .083);
    part(group, 'drum', tint, x, 1.929, z, .044, .106, .044);
    part(group, 'drum', cream, x, 1.996, z, .05, .040, .05);
    part(group, 'box', cream, x, 1.729, z + .083 + SURFACE_GAP.detail, .118, .123, .028);
  }
  for (const [x, z, tint] of [[.59, .25, cherry], [.87, -.20, pickle]]) {
    part(group, 'drum', tint, x, 1.426, z, .123, .32, .123);
    part(group, 'drum', cream, x, 1.588, z, .138, .053, .138);
    beam(group, cream, [x, 1.595, z], [x + .043, 1.796, z + .017], .032);
  }
}

function awningGeometry(THREE) {
  const vertices = [];
  function point(x, z) {
    return [x, 2.52 + .272 * Math.cos((z + .047) * Math.PI / 1.64), z];
  }
  for (let i = 0; i < 12; i++) {
    const a = -.82 + i * 1.64 / 12, b = a + 1.64 / 12;
    for (const corner of [point(-.5, a), point(-.5, b), point(.5, b), point(-.5, a), point(.5, b), point(.5, a)]) {
      vertices.push(...corner);
    }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  roof.computeVertexNormals();
  return roof;
}

export function buildConcessions({ THREE, document, parent, parts, obstacles }) {
  const { part, beam, batch, matte } = parts;
  const cloth = color => matte(color, { side: THREE.DoubleSide });
  const colors = {
    cream: matte(0xf7e1b7), gold: matte(0xb88a49), navy: matte(0x45415d), cherry: matte(0xae483e),
    butter: matte(0xf6c869), bun: matte(0xca8d54), pickle: matte(0x6c9465), pink: matte(0xea9eb0),
    ice: matte(0xa5dce1), lilac: matte(0xc498ca),
    print: matte(0xffffff, { vertexColors: true }),
    pane: new THREE.MeshPhongMaterial({ color: 0xf7e4bb, shininess: 65, transparent: true, opacity: .27,
      depthWrite: false, side: THREE.DoubleSide }),
  };
  const stripe = awningGeometry(THREE);
  const wheels = new THREE.TorusGeometry(1, .12, 7, 22);
  const rubber = matte(0x363345);
  const whiteCloth = cloth(0xf6ddbc);
  const root = addGroup(THREE, parent, 'Princess Gallery snack carts');
  for (const { name, x, z, yaw, color, accent, build } of sites) {
    const cart = addGroup(THREE, root, name + ' cart', x, 0, z, yaw);
    const group = new THREE.Group();
    const painted = matte(color);
    const trim = matte(accent);
    const canopy = cloth(color);
    const { cream, gold, navy } = colors;

    part(group, 'box', navy, 0, .46, 0, 2.33, .19, 1.15);
    part(group, 'box', painted, 0, .796, 0, 2.28, .64, 1.14);
    part(group, 'box', cream, 0, 1.168, 0, 2.52, .164, 1.31);
    part(group, 'box', trim, 0, 1.091, 0, 2.49, .052, 1.287);
    for (const dx of [-.68, 0, .68]) {
      part(group, 'box', trim, dx, .812, .579, .565, .408, .073);
      part(group, 'box', painted, dx, .812, .616 + SURFACE_GAP.detail, .46, .309, .036);
      part(group, 'gem', gold, dx, .812, .651, .073, .115, .026);
    }
    for (const side of [-1, 1]) {
      const wx = side * 1.172;
      for (const w of [[-.37, .331], [.40, .212]]) {
        const [wheelZ, radius] = w;
        part(group, wheels, rubber, wx, radius * 1.10, wheelZ, radius, radius, radius).rotation.y = Math.PI / 2;
        part(group, 'drum', gold, wx + side * .026, radius * 1.10, wheelZ, radius * .52, .078, radius * .52).rotation.z = Math.PI / 2;
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          beam(group, trim, [wx, radius * 1.10, wheelZ],
            [wx, radius * (1.10 + Math.sin(angle) * .93), wheelZ + Math.cos(angle) * radius * .93], .041);
        }
      }
      for (const dz of [-.499, .498]) {
        beam(group, gold, [side * 1.135, 1.245, dz], [side * 1.135, 2.624, dz], .058);
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * .294;
      const fabric = i % 2 ? whiteCloth : canopy;
      part(group, stripe, fabric, x, 0, 0, .294, 1, 1);
      for (const dz of [-.82, .82]) {
        part(group, 'sphere', fabric, x, 2.47, dz, .147, .132, .035);
      }
    }
    // The sign faces the service side.
    for (const sign of [-1, 1]) {
      beam(group, gold, [-1.32, 2.49, sign * .838], [1.32, 2.49, sign * .838], .047);
    }
    part(group, 'box', gold, 0, 2.465, .851, 1.83, .365, .11);
    addGallerySign(THREE, document, cart, [name], 0, 2.465, .906 + SURFACE_GAP.detail, 1.74, .288);
    build({ THREE, group, part, beam, colors });
    batch(group, cart);
    addSolid(obstacles, x, z, 2.58, 1.34, 2.51, yaw);
  }
}
