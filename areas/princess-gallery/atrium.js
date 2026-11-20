import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { buildIceCanopy } from './ice-canopy.js';
import { addGallerySign, addRoundSolid, addSolid } from './parts.js';

export const ATRIUM_RADII = [21.5, 19.5];

export function buildAtrium({ THREE, document, shell, parts, colors, obstacles, ceiling }) {
  const { part, beam, batch, matte } = parts;
  const { cream, ivory, blush, wine, plum, gold, moss, leaf, glow } = colors;
  const atrium = addGroup(THREE, shell, 'Central Atrium');
  const components = new THREE.Group();
  function overhead(mesh) {
    mesh.layers.set(PLAYER_ONLY_LAYER);
    return mesh;
  }
  const [rx, rz] = ATRIUM_RADII;
  const ice = overhead(buildIceCanopy(THREE, atrium, parts, ATRIUM_RADII, ceiling));
  ice.updateWorldMatrix(true, false);
  const mount = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  mount.layers.enable(PLAYER_ONLY_LAYER);
  function mountHeight(x, z) {
    mount.ray.origin.set(x, 0, z);
    return mount.intersectObject(ice, false)[0]?.point.y ?? ceiling;
  }

  function ellipseRing(y, radiusX, radiusZ, material, width) {
    for (let n = 0; n < 64; n++) {
      const a = n * Math.PI / 32, b = (n + 1) * Math.PI / 32;
      overhead(beam(components, material, [radiusX * Math.cos(a), y, radiusZ * Math.sin(a)],
        [radiusX * Math.cos(b), y, radiusZ * Math.sin(b)], width));
    }
  }

  for (const [offset, width, depth, material, edge] of [
    [0, rx - .07, rz - .07, gold, .43], [-.42, rx - .09, rz - .09, wine, .46],
    [-.78, rx - .13, rz - .13, ivory, .22],
  ]) ellipseRing(ceiling + offset, width, depth, material, edge);

  const chandelierRing = new THREE.TorusGeometry(1, .043, 7, 38);
  for (const [x, y, z, scale] of [[-14, 14.4, 7.8, .88], [14, 14.4, -7.8, .88], [0, 12.2, 49, 1.07]]) {
    const lamp = addGroup(THREE, components, 'Crystal chandelier', x, y, z);
    lamp.scale.setScalar(scale);
    const crownY = mountHeight(x, z);
    overhead(beam(components, gold, [x, y + scale * 1.2, z], [x, crownY, z], .095));
    for (const [radius, level] of [[1.68, 0], [1.03, .58], [.58, 1.02]]) {
      overhead(part(lamp, chandelierRing, gold, 0, level, 0, radius, radius, radius)).rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      const dx = Math.cos(angle) * 1.68, dz = Math.sin(angle) * 1.68;
      overhead(beam(lamp, gold, [0, 1.32, 0], [dx, .05, dz], .044));
      overhead(part(lamp, 'drum', gold, dx, .11, dz, .12, .13, .12));
      overhead(part(lamp, 'sphere', glow, dx, .29, dz, .105, .19, .105));
      overhead(part(lamp, 'gem', cream, dx, -.31, dz, .13, .30, .13));
    }
    overhead(part(lamp, 'gem', glow, 0, -.76, 0, .32, .77, .32));
  }

  const water = matte(0x5d9ca6, { emissive: 0x1a525d, emissiveIntensity: .25 });
  const spray = matte(0xaddcdb, { emissive: 0x508f9f, emissiveIntensity: .32 });
  const basin = addGroup(THREE, components, 'Swan fountain and royal sculpture');
  const drum = (material, y, radius, height) => part(basin, 'drum', material, 0, y, 0, radius, height, radius);
  drum(wine, .15, 5.45, .30);
  drum(ivory, .40, 5.24, .36);
  part(basin, new THREE.CylinderGeometry(5.04, 5.04, SURFACE_GAP.detail, 64), water, 0, .655, 0, 1, 1, 1);
  const rim = part(basin, new THREE.LatheGeometry([
    new THREE.Vector2(5.23, .56), new THREE.Vector2(5.24, .67), new THREE.Vector2(5.16, .77),
    new THREE.Vector2(4.96, .77), new THREE.Vector2(4.91, .66), new THREE.Vector2(4.91, .55),
  ], 64), ivory, 0, 0, 0, 1, 1, 1);
  rim.name = 'Fountain basin rim';
  drum(ivory, 1.02, 1.49, .64);
  drum(gold, 1.44, 1.24, .21);
  drum(ivory, 1.86, .74, .64);
  drum(wine, 2.23, 2.12, .18);
  drum(ivory, 2.38, 2.29, .18);
  drum(water, 2.49, 2.16, .034);
  drum(gold, 2.68, .60, .35);
  const lip = part(basin, chandelierRing, gold, 0, .788, 0, 5.09, 5.09, 2.60);
  lip.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const point = (radius, y) => [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    const arc = [point(1.7, 2.54), point(2.3, 2.94), point(2.98, 2.89), point(3.60, 2.27), point(4.06, .67)];
    for (let j = 1; j < arc.length; j++) beam(basin, spray, arc[j - 1], arc[j], .052);
    part(basin, 'sphere', spray, ...point(4.05, .672), .30, .02, .25);
  }
  for (const side of [-1, 1]) {
    const swan = addGroup(THREE, basin, 'Ivory swan', side * .89, 2.80, 0, side * -.21);
    part(swan, 'sphere', cream, 0, .18, -.15, .69, .40, 1.05);
    part(swan, 'gem', ivory, 0, .30, -.92, .50, .40, .74).rotation.x = -.28;
    for (const wing of [-1, 1]) {
      part(swan, 'sphere', ivory, wing * .51, .48, -.32, .22, .35, .71).rotation.x = -.48;
      part(swan, 'gem', cream, wing * .62, .61, -.50, .34, .34, .70).rotation.z = wing * -.35;
    }
    const neck = [[0, .25, .27], [0, .53, .59], [0, .98, .65], [0, 1.36, .56], [0, 1.48, .82]];
    const curve = new THREE.CatmullRomCurve3(neck.map(point => new THREE.Vector3(...point)));
    part(swan, new THREE.TubeGeometry(curve, 18, .143, 9, false), cream, 0, 0, 0, 1, 1, 1);
    part(swan, 'sphere', cream, 0, 1.48, .86, .16, .15, .22);
    part(swan, 'gem', gold, 0, 1.42, 1.10, .097, .069, .19);
    for (const eye of [-1, 1]) part(swan, 'sphere', plum, eye * .14, 1.52, .91, .027, .028, .031);
  }
  drum(gold, 3.53, .37, 1.14);
  drum(gold, 4.30, .74, .19);
  const crown = part(basin, chandelierRing, gold, 0, 4.51, 0, .78, .78, .78);
  crown.rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    part(basin, 'gem', gold, .67 * Math.cos(angle), 4.69, .67 * Math.sin(angle), .21, .38, .21);
  }
  part(basin, 'gem', glow, 0, 4.97, 0, .26, .40, .26);
  addRoundSolid(obstacles, 0, 0, 5.46, 2.6);

  // Open bays between the columns line up with all four approaches.
  for (const angle of [.45, 1.05, 2.07, 2.69, 3.61, 4.19, 5.24, 5.83]) {
    const x = (rx - 2) * Math.cos(angle);
    const z = (rz - 1.5) * Math.sin(angle);
    const pillar = addGroup(THREE, components, 'Atrium pillar', x, 0, z, -angle);
    part(pillar, 'box', plum, 0, .21, 0, 1.95, .42, 1.95);
    part(pillar, 'drum', ivory, 0, 11.7, 0, .58, 22.8, .58);
    for (const [y, radius, height] of [[.66, .86, .42], [1.12, .68, .12], [4.5, .68, .15],
      [16.7, .65, .11], [21.9, .78, .37], [22.5, .91, .36], [22.92, 1.04, .27]]) {
      part(pillar, 'drum', y > 22.8 ? cream : gold, 0, y, 0, radius, height, radius);
    }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      part(pillar, 'drum', cream, Math.cos(a) * .562, 11.57, Math.sin(a) * .562, .045, 20.61, .045);
    }
    part(pillar, 'gem', glow, 0, 3.88, .67, .33, .46, .31);
    addSolid(obstacles, x, z, 1.95, 1.95, 23, -angle);
  }

  const flowers = [matte(0xc66a81), matte(0x9e77b0), matte(0xedb65f), cream];
  for (const [x, z, yaw] of [[-11.6, 8.6, .6], [11.6, 8.6, -.6], [-11.4, -8.1, 2.55], [11.4, -8.1, -2.55]]) {
    const seat = addGroup(THREE, components, 'Atrium bench and flower bed', x, 0, z, yaw);
    part(seat, 'box', ivory, 0, .22, 0, 4.8, .44, 1.46);
    part(seat, 'box', blush, 0, .48, 0, 4.92, .15, 1.58);
    part(seat, 'box', moss, 0, .56, 0, 4.67, .09, 1.27);
    for (let i = 0; i < 13; i++) {
      const dx = (i - 6) * .345, dz = Math.cos(i * 2.4) * .36;
      const y = .83 + .12 * Math.sin(i * 2);
      part(seat, 'ball', i % 3 ? leaf : moss, dx, .62, dz, .31, .32, .39);
      part(seat, 'sphere', flowers[i % flowers.length], dx, y, dz, .16, .13, .16);
    }
    for (const side of [-1, 1]) part(seat, 'box', wine, side * 1.48, .30, .97, .19, .60, .43);
    part(seat, 'box', gold, 0, .62, 1.02, 3.65, .13, .55);
    part(seat, 'box', wine, 0, 1.02, .77, 3.7, .42, .14);
    addSolid(obstacles, x, z, 4.92, 1.58, 1, yaw);
    addSolid(obstacles, x + Math.sin(yaw), z + Math.cos(yaw), 3.7, .65, 1.22, yaw);
  }

  const signpost = addGroup(THREE, atrium, 'Atrium wayfinding sign', 5.9, 0, 12.4, -.14);
  part(signpost, 'drum', plum, 0, .17, 0, .49, .34, .49);
  part(signpost, 'drum', gold, 0, 1.77, 0, .11, 3.3, .11);
  part(signpost, 'gem', glow, 0, 3.51, 0, .2, .31, .2);
  for (const [index, title] of ['← Woodland Wing', '↑ Royal Wing', 'Adventure Wing →'].entries()) {
    const y = 2.94 - index * .55;
    part(signpost, 'box', gold, 0, y, 0, 3.24, .46, .17);
    addGallerySign(THREE, document, signpost, [title], 0, y, .085 + SURFACE_GAP.detail, 3.13, .39);
  }
  addRoundSolid(obstacles, 5.9, 12.4, .47, 3.5);
  batch(components, atrium);
}
