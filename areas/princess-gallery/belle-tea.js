import { cueSource, entryCue, galleryCues } from './interaction-audio.js';
import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { addGallerySign, addSolid, spaceTransform } from './parts.js';

const tableSite = { x: .10, z: 2.53 };
const tabletop = 1.21;

export function buildEnchantedTea({ THREE, document, room, parts, exhibit, obstacles, palette, playCue = () => {} }) {
  const { part, beam, batch, matte } = parts;
  const { gold, oak, dark, cream, wine, glow } = palette;
  const porcelain = matte(0xffead0);
  const band = matte(0x697b9c);
  const tea = matte(0x733e2c);
  const ink = matte(0x4f3442);
  const blush = matte(0xd28780);
  const table = addGroup(THREE, room, 'Belle enchanted tea table', tableSite.x, 0, tableSite.z);
  const decor = new THREE.Group();
  const { toLocal, toWorld } = spaceTransform(exhibit);
  const { clamp, smoothstep } = THREE.MathUtils;
  const barrel = new THREE.CylinderGeometry(1, 1, 1, 48);
  part(decor, barrel, dark, 0, 1.055, 0, 2.12, .212, 1.42);
  part(decor, barrel, oak, 0, 1.152, 0, 2.163, .116, 1.46);
  part(decor, barrel, gold, 0, 1.141, 0, 2.169, .030, 1.469);
  part(decor, barrel, wine, 0, tabletop + .012, 0, 1.64, .024, 1.07);
  for (const side of [-1, 1]) {
    for (const dz of [-.63, .63]) {
      beam(decor, dark, [side * 1.48, .092, dz * 1.14], [side * 1.35, 1.02, dz], .168);
      part(decor, 'sphere', oak, side * 1.48, .089, dz * 1.14, .132, .089, .119);
      part(decor, 'gem', gold, side * 1.46, .83, dz, .101, .135, .105);
    }
  }
  const rim = new THREE.TorusGeometry(1, .045, 7, 40);
  part(decor, rim, gold, 0, tabletop + .028, 0, 1.615, 1.049, .277).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    beam(decor, dark, [side * 1.08, 1.053, 1.08], [side * 1.08, .81, 1.40], .093);
  }
  part(decor, 'box', gold, 0, .81, 1.418, 2.65, .64, .115);
  part(decor, 'box', dark, 0, .81, 1.485, 2.51, .55, .056);
  const sign = addGallerySign(THREE, document, table, ['Enchanted Tea', 'Come close to see it dance'],
    0, .81, 1.513 + SURFACE_GAP.detail, 2.46, .50);
  if (sign) sign.name = 'Belle tea table sign';
  addSolid(obstacles, ...toWorld(tableSite.x, tableSite.z), 4.25, 2.79, 1.47, exhibit.rotation);

  function lathe(profile) {
    return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 30);
  }
  function tube(points, radius) {
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))),
      15, radius, 7, false);
  }
  function face(model, width, y, z) {
    for (const side of [-1, 1]) {
      part(model, 'sphere', ink, side * width, y, z, .030, .043, .013);
      part(model, 'sphere', blush, side * width * 1.32, y - .046, z - .011, .036, .019, .012);
      beam(model, ink, [0, y - .060, z + .015], [side * width * .50, y - .044, z + .007], .010);
    }
  }

  const pot = addGroup(THREE, table, 'Belle dancing teapot', -.36, tabletop - .002, -.06);
  const potDetails = new THREE.Group();
  const potShape = lathe([
    [0, .027], [.27, .027], [.32, .071], [.41, .166], [.474, .315], [.46, .455],
    [.385, .57], [.28, .639], [.25, .676], [.23, .683], [0, .683],
  ]);
  const lid = lathe([[.245, 0], [.278, .032], [.245, .076], [.161, .117], [.057, .147], [0, .148]]);
  part(potDetails, potShape, porcelain, 0, 0, 0, 1, 1, 1);
  part(potDetails, lid, band, 0, .665, 0, 1, 1, 1);
  part(potDetails, 'sphere', gold, 0, .838, 0, .092, .075, .092);
  for (const [r, y] of [[.286, .077], [.265, .708]]) {
    part(potDetails, rim, gold, 0, y, 0, r, r, r).rotation.x = Math.PI / 2;
  }
  part(potDetails, tube([[-.365, .485, 0], [-.60, .543, 0], [-.713, .414, 0],
    [-.642, .245, 0], [-.395, .209, 0]], .064), band, 0, 0, 0, 1, 1, 1);
  part(potDetails, tube([[.389, .271, .025], [.55, .30, .025], [.641, .427, .035],
    [.746, .555, .050]], .085), porcelain, 0, 0, 0, 1, 1, 1);
  part(potDetails, 'sphere', gold, .761, .567, .052, .108, .064, .101).rotation.z = .36;
  part(potDetails, 'sphere', tea, .812, .585, .051, .058, .020, .064).rotation.z = .36;
  face(potDetails, .127, .407, .443);
  batch(potDetails, pot);

  const saucer = lathe([[0, .011], [.275, .011], [.337, .025], [.367, .064],
    [.353, .089], [.326, .078], [.248, .043], [0, .043]]);
  const cupShape = lathe([
    [0, .035], [.121, .035], [.169, .063], [.21, .161], [.233, .311],
    [.235, .34], [.210, .345], [.196, .312], [.180, .175], [.126, .097], [0, .095],
  ]);
  const grip = tube([[.20, .254, 0], [.298, .296, 0], [.361, .249, 0],
    [.331, .158, 0], [.194, .134, 0]], .034);
  const cups = [[.75, .64, .23], [-1.23, .48, -.26], [.88, -.30, .34]].map(([x, z, yaw], i) => {
    part(decor, saucer, porcelain, x, tabletop + .028, z, 1, 1, 1);
    part(decor, rim, gold, x, tabletop + .110, z, .352, .352, .192).rotation.x = Math.PI / 2;
    const cup = addGroup(THREE, table, 'Belle dancing cup ' + (i + 1), x, tabletop + .038, z, yaw);
    const china = new THREE.Group();
    part(china, cupShape, porcelain, 0, 0, 0, 1, 1, 1);
    part(china, grip, band, 0, 0, 0, 1, 1, 1);
    part(china, rim, gold, 0, .339, 0, .229, .229, .151).rotation.x = Math.PI / 2;
    part(china, 'drum', tea, 0, .207, 0, .188, .016, .188);
    face(china, .069, .212, .203);
    batch(china, cup);
    return { cup, x, z, yaw, phase: i * 1.93 };
  });

  const candles = addGroup(THREE, table, 'Belle magic candles', -.19, tabletop + .021, -.89);
  const candelabra = new THREE.Group();
  const candleLight = matte(0xffd783, { emissive: 0xff9c45, emissiveIntensity: .63 });
  part(candelabra, 'drum', gold, 0, .047, 0, .29, .094, .22);
  part(candelabra, 'drum', gold, 0, .342, 0, .066, .62, .066);
  for (const [x, y, h] of [[-.34, .45, .27], [0, .66, .34], [.34, .45, .27]]) {
    beam(candelabra, gold, [0, .25, 0], [x, y, 0], .061);
    part(candelabra, 'drum', gold, x, y, 0, .116, .081, .116);
    part(candelabra, 'drum', cream, x, y + h / 2, 0, .067, h, .067);
    part(candelabra, 'gem', glow, x, y + h + .099, 0, .070, .136, .067);
    part(candelabra, 'gem', candleLight, x + .013, y + h + .119, .029, .041, .088, .041);
  }
  batch(candelabra, candles);
  batch(decor, table);

  let nearby = false;
  let blend = 0;
  let time = 0;
  function pose() {
    const intensity = smoothstep(blend, 0, 1);
    const beat = Math.sin(time * 3.4);
    pot.position.set(-.36 + intensity * .13 * beat,
      tabletop - .002 + intensity * (.21 + .12 * Math.sin(time * 6.8)), -.06);
    pot.rotation.set(intensity * .16 * Math.cos(time * 3.4), intensity * .52 * beat,
      intensity * (.12 + .15 * Math.cos(time * 6.8)));
    for (const { cup, x, z, yaw, phase } of cups) {
      const spin = time * 3.4 + phase;
      cup.position.set(x + intensity * .086 * Math.sin(spin),
        tabletop + .038 + intensity * (.17 + .11 * Math.cos(spin * 2)), z);
      cup.rotation.set(intensity * .21 * Math.cos(spin), yaw + intensity * .92 * Math.sin(spin),
        intensity * .26 * Math.cos(spin + .30));
    }
    candleLight.emissiveIntensity = .63 + intensity * (.43 + .21 * Math.sin(time * 6.8));
  }
  const local = [0, 0];
  const audio = entryCue(playCue,galleryCues.belle,cueSource(...toWorld(tableSite.x,tableSite.z),EYE_HEIGHT));
  return {
    reset() {
      audio.reset();
      nearby = false;
      time = blend = 0;
      pose();
    },
    update(dt, player, still) {
      const [x, z] = toLocal(player.x, player.z, local);
      const radius = nearby ? 4.32 : 4.02;
      nearby = Math.abs(player.y - EYE_HEIGHT) < 1.28 &&
        (x - tableSite.x) ** 2 + (z - tableSite.z) ** 2 <= radius * radius;
      audio.update(nearby,dt);
      if (!nearby && !blend) return false;
      blend = still ? Number(nearby) : clamp(blend + dt * (nearby ? 2.3 : -1.9), 0, 1);
      time = still || blend === 0 ? 0 : (time + dt) % (Math.PI * 2 / 3.4);
      pose();
      return nearby && blend >= .58;
    },
  };
}
