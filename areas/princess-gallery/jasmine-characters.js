import { addGroup } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { AGRABAH_BALCONY } from './jasmine-palace.js';
import { addRoundSolid } from './parts.js';
import { buildPrincessFace } from './princess-face.js';

export const LAMP_SITE = Object.freeze({ x: -4.57, z: 5.37 });
const lampCue = [[69, { duration: .24, level: .10 }], [76, { duration: .46, level: .12 }, .12],
  [83, { endPitch: 88, duration: .76, level: .08 }, .26]];

export function buildAgrabahCharacters(context) {
  const { THREE, room, parts, colors, obstacles, toWorld } = context;
  const { part, batch, beam, matte } = parts;
  const { cream, teal, blue, gold, brass, dark } = colors;
  const skin = matte(0xbc7e57);
  const warm = matte(0xa7674f);
  const hair = matte(0x2e263e);
  const plum = matte(0x9b456a);
  const silk = matte(0x66aea3);
  const shade = matte(0x3b736e);
  const violet = matte(0x686092);
  const lip = matte(0x824250);
  const blush = matte(0xd98c76);
  const eye = matte(0x687852);

  const jasmineX = -2.07;
  const jasmineZ = 1.57;
  const jasmine = addGroup(THREE, room, 'Jasmine', jasmineX, AGRABAH_BALCONY, jasmineZ, .21);
  const figure = new THREE.Group();
  // Distinct tapered harem trousers and slippers instead of a single skirt shell.
  const trousers = new THREE.LatheGeometry([[.09,.14],[.20,.21],[.28,.47],[.25,.76],[.17,1.02],[.14,1.12]].map(([r,y])=>new THREE.Vector2(r,y)),12);
  part(figure, 'sphere', teal, 0, .94, 0, .31, .25, .22);
  for(const side of [-1,1]) {
    part(figure,trousers,teal,side*.19,0,0,1,1,.77);
    part(figure,'drum',brass,side*.19,.17,0,.105,.075,.093);
    part(figure,'sphere',blue,side*.19,.085,.10,.115,.086,.205);
  }
  part(figure, 'sphere', silk, 0, 1.28, .018, .34, .39, .233);
  part(figure, 'drum', brass, 0, 1.035, 0, .31, .091, .25);
  part(figure, 'gem', gold, 0, 1.11, .245, .096, .12, .04);
  part(figure, 'gem', blue, 0, 1.32, .24, .084, .15, .04);
  part(figure, 'drum', skin, 0, 1.61, .02, .13, .24, .13);
  for (const side of [-1, 1]) {
    part(figure, 'sphere', shade, side * .32, .53, .135, .083, .32, .072).rotation.z = side * -.12;
    part(figure, 'sphere', silk, side * .34, 1.45, -.002, .14, .16, .14);
    const wrist = [side * .51, 1.22 + (side + 1) * .085, .19 + (side + 1) * .065];
    beam(figure, skin, [side * .34, 1.39, 0], wrist, .111);
    part(figure, 'sphere', skin, ...wrist, .081, .084, .102);
    part(figure, 'sphere', brass, wrist[0] - side * .04, wrist[1] + .02, wrist[2] - .04, .081, .065, .076);
    part(figure, 'gem', gold, side * .31, 1.745, -.01, .060, .12, .056);
  }
  const jasmineHead = addGroup(THREE, jasmine, 'Jasmine head', 0, 1.90, .036);
  const hairModel = addGroup(THREE, figure, 'Braided hair', 0, 1.9, .036);
  part(hairModel, 'sphere', hair, 0, .052, -.115, .355, .375, .325);
  part(hairModel, 'sphere', hair, -.17, .235, .097, .22, .128, .192).rotation.z = .47;
  part(hairModel, 'sphere', hair, .15, .24, .085, .22, .119, .19).rotation.z = -.40;
  for (let i = 0; i < 4; i++) {
    part(hairModel, 'sphere', hair, .09 + i * .061, -.25 - i * .16, -.24 - i * .015,
      .15 - i * .021, .17 - i * .011, .126 - i * .013).rotation.z = .31;
  }
  part(hairModel, 'drum', gold, .268, -.72, -.285, .085, .069, .082).rotation.z = .40;
  part(hairModel, 'gem', blue, -.092, .285, .223, .093, .112, .066).rotation.z = .22;
  batch(figure, jasmine);
  buildPrincessFace(THREE, parts, jasmineHead, { skin, blush, brow: hair, lip, iris: eye, pearl: cream }, false, { jaw: .23, eyeWidth: 1.04 });
  addRoundSolid(obstacles, ...toWorld(jasmineX, jasmineZ), .30, AGRABAH_BALCONY + 2.28);

  const aladinX = 3.92, aladinZ = 5.33;
  const aladin = addGroup(THREE, room, 'Aladin', aladinX, 0, aladinZ, -.33);
  const costume = new THREE.Group();
  part(costume, 'sphere', cream, 0, 1.32, 0, .33, .40, .22);
  part(costume, 'drum', plum, 0, 1.025, .008, .327, .145, .24);
  part(costume, 'gem', gold, -.19, 1.049, .24, .08, .10, .036);
  part(costume, 'drum', warm, 0, 1.671, 0, .13, .18, .13);
  for (const side of [-1, 1]) {
    part(costume, 'sphere', cream, side * .185, .61, -.02, .197, .43, .19).rotation.z = side * .18;
    part(costume, 'sphere', dark, side * .249, .16, .04, .15, .148, .25).rotation.y = side * .17;
    part(costume, 'sphere', violet, side * .24, 1.347, .124, .15, .38, .122).rotation.z = -side * .18;
    part(costume, 'sphere', violet, side * .33, 1.46, .01, .15, .16, .15);
    const hand = [side * .47, 1.13 + (side - 1) * .085, .19];
    beam(costume, skin, [side * .36, 1.41, -.015], hand, .122);
    part(costume, 'sphere', warm, ...hand, .080, .091, .09);
  }
  const aladinHead = addGroup(THREE, aladin, 'Aladin head', 0, 1.925, .029);
  const hat = addGroup(THREE, costume, 'Wrapped head scarf', 0, 1.925, .029);
  part(hat, 'sphere', hair, 0, .07, -.096, .333, .337, .236);
  part(hat, 'sphere', plum, .008, .295, -.011, .352, .154, .288).rotation.z = .17;
  part(hat, 'sphere', violet, -.016, .36, -.052, .315, .157, .252).rotation.z = -.13;
  part(hat, 'gem', gold, .106, .335, .244, .072, .096, .062);
  part(hat, 'sphere', plum, -.297, .036, -.126, .10, .239, .13).rotation.z = -.34;
  batch(costume, aladin);
  buildPrincessFace(THREE, parts, aladinHead, { skin: warm, blush, brow: hair, lip, iris: eye, pearl: cream });
  addRoundSolid(obstacles, ...toWorld(aladinX, aladinZ), .42, 2.43);

  return buildLamp(context);
}

function buildLamp({ THREE, room, parts, colors, obstacles, toWorld, camera, isActive, reducedMotion, playCue }) {
  const { part, beam, batch, matte } = parts;
  const { x, z } = LAMP_SITE;
  const [wx, wz] = toWorld(x, z);
  const { gold, brass, blue, cream, shade, teal, dark } = colors;
  const stand = addGroup(THREE, room, 'Agrabah magic lamp', x, 0, z, -.14);
  const pedestal = new THREE.Group();
  part(pedestal, 'drum', shade, 0, .14, 0, .87, .28, .87);
  part(pedestal, 'drum', blue, 0, .59, 0, .65, .65, .65);
  part(pedestal, 'drum', brass, 0, .955, 0, .79, .128, .79);
  part(pedestal, 'drum', teal, 0, 1.035, 0, .72, .050, .72);
  for (let i = 0; i < 8; i++) {
    const theta = i * Math.PI / 4;
    part(pedestal, 'gem', gold, Math.sin(theta) * .663, .64, Math.cos(theta) * .663, .085, .135, .085);
  }
  const teapot = new THREE.LatheGeometry([[.31, 0], [.44, .075], [.49, .18], [.45, .29],
    [.32, .36], [.18, .41], [.20, .46], [.12, .50], [0, .54]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
  part(pedestal, teapot, gold, 0, 1.065, 0, 1, 1, .74);
  part(pedestal, 'drum', brass, 0, 1.503, 0, .215, .052, .165);
  part(pedestal, 'gem', cream, 0, 1.644, 0, .061, .085, .059);
  const handle = curve(THREE, [[-.34, 1.25], [-.52, 1.20], [-.69, 1.31],
    [-.67, 1.48], [-.52, 1.55], [-.36, 1.43]]);
  part(pedestal, new THREE.TubeGeometry(handle, 14, .049, 6), brass, 0, 0, 0, 1, 1, 1);
  const spout = curve(THREE, [[.32, 1.24], [.57, 1.26], [.73, 1.38], [.87, 1.56], [.99, 1.62]]);
  part(pedestal, new THREE.TubeGeometry(spout, 13, .065, 8), gold, 0, 0, 0, 1, 1, 1);
  part(pedestal, 'sphere', dark, 1.0, 1.623, 0, .065, .030, .050).rotation.z = .3;
  batch(pedestal, stand);
  addRoundSolid(obstacles, wx, wz, .86, 1.66);

  const apparition = addGroup(THREE, stand, 'Jin emerging from the lamp', .99, 1.63, 0, .14);
  const figure = new THREE.Group();
  const smoke = matte(0x7669aa, { emissive: 0x4c397e, emissiveIntensity: .31 });
  const lilac = matte(0xa59bc2);
  const mist = matte(0x64b8ba, { emissive: 0x328194, emissiveIntensity: .26 });
  const bright = matte(0x9cd3cb);
  const mask = matte(0x413757);
  const glow = matte(0xe9c989, { emissive: 0xe3a34c, emissiveIntensity: .55 });
  const curl = curve(THREE, [[0, 0], [.32, .22], [.19, .49], [-.17, .58], [-.30, .83], [-.18, 1.05]]);
  const spiral = new THREE.TubeGeometry(curl, 23, .15, 8);
  const vertices = spiral.getAttribute('position');
  for (let section = 0; section <= 23; section++) {
    const t = section / 23;
    const center = curl.getPointAt(t);
    const radius = .10 + t * 1.55;
    for (let j = 0; j <= 8; j++) {
      const i = section * 9 + j;
      vertices.setXYZ(i, center.x + (vertices.getX(i) - center.x) * radius,
        center.y + (vertices.getY(i) - center.y) * radius, vertices.getZ(i) * radius);
    }
  }
  spiral.computeVertexNormals();
  part(figure, spiral, smoke, 0, 0, 0, 1, 1, 1);
  part(figure, 'sphere', mist, -.14, 1.15, 0, .46, .47, .32);
  part(figure, 'sphere', smoke, -.16, .92, 0, .31, .18, .26);
  part(figure, 'drum', gold, -.14, 1.404, 0, .32, .085, .24);
  part(figure, 'drum', mist, -.14, 1.52, 0, .159, .224, .13);
  for (const side of [-1, 1]) {
    const shoulder = [-.14 + side * .373, 1.27, 0];
    const elbow = [-.14 + side * .61, 1.20, .09];
    const wrist = [-.14 + side * .76, 1.42 + .12 * side, .24];
    part(figure, 'sphere', lilac, ...shoulder, .18, .19, .17);
    beam(figure, mist, elbow, wrist, .144);
    beam(figure, mist, shoulder, elbow, .174);
    part(figure, 'sphere', brass, ...wrist, .106, .078, .103);
    part(figure, 'sphere', bright, wrist[0] + side * .065, wrist[1] + .068, wrist[2], .109, .108, .078);
    part(figure, 'gem', glow, -.14 + side * .96, 1.29 + side * .18, .058, .063, .143, .064);
  }
  part(figure, 'gem', glow, .53, .56, -.25, .068, .12, .068);
  part(figure, 'gem', glow, -.65, .79, .09, .09, .153, .057);
  const head = addGroup(THREE, apparition, 'Jin head', -.14, 1.85, .022);
  part(figure, 'sphere', smoke, -.16, 1.95, -.04, .355, .339, .288);
  part(figure, 'sphere', lilac, -.107, 2.124, -.013, .30, .18, .27).rotation.z = -.25;
  part(figure, 'gem', gold, -.12, 2.11, .218, .083, .11, .061);
  part(figure, 'gem', brass, -.44, 1.74, .006, .076, .14, .062);
  batch(figure, apparition);
  buildPrincessFace(THREE, parts, head, { skin: bright, blush: mist, brow: mask, lip: mask, iris: smoke, pearl: cream });

  let time = 0;
  let appearing = false;
  function near(position) {
    return position && Math.abs(position.y - EYE_HEIGHT) < .20 &&
      Math.hypot(position.x - wx, position.z - wz) <= 2.45;
  }
  const interaction = {
    x: wx, z: wz, anchorY: 1.46, radius: 2.45, label: 'Rub the magic lamp', silent: true,
    reachable: near,
    get active() { return isActive() && !appearing; },
    act() {
      if (!this.active || !near(camera?.position)) return;
      appearing = true;
      time = 0;
      playCue(lampCue,{x:wx,z:wz,eyeY:EYE_HEIGHT,range:8,near:2.5,floorTolerance:2.4});
      pose(reducedMotion());
    },
  };
  function pose(still) {
    const blend = appearing ? still ? 1 : Math.min(1, time / .89, (5.6 - time) / .66) : 0;
    apparition.visible = blend > 0;
    if (apparition.visible) {
      const ease = blend * blend * (3 - 2 * blend);
      apparition.scale.setScalar(Math.max(.001, ease));
      apparition.rotation.y = .14 + (still ? 0 : Math.sin(time * 2.23) * .11);
    }
  }
  function reset() {
    appearing = false;
    time = 0;
    apparition.rotation.y = .14;
    apparition.scale.setScalar(1);
    apparition.visible = false;
  }
  reset();
  return {
    interaction, reset,
    update(dt, still) {
      if (!appearing) return;
      time += dt;
      if (time >= 5.6) reset();
      else pose(still);
    },
  };
}

function curve(THREE, points) {
  return new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));
}
