import { addGroup } from '../../core/geometry.js';
import { buildPrincessFace } from './princess-face.js';

// The skirt and hips rest on the mattress while the upper body pivots at the waist.
export function buildAuroraCharacter(THREE, bed, parts, mattressTop) {
  const { part, beam, batch, matte } = parts;
  const { lerp, smoothstep } = THREE.MathUtils;
  const actor = addGroup(THREE, bed, 'Aurora character', 0, mattressTop + .25, .25);
  const dress = matte(0xc53e79);
  const silk = matte(0xe773a8);
  const rose = matte(0xb34076);
  const collar = matte(0xffdfec);
  const antique = matte(0xc28b43);
  const gold = matte(0xf0c676);
  const hair = matte(0xbb7c32);
  const blond = matte(0xe6b553);
  const highlight = matte(0xf7d47e);
  const skin = matte(0xf4bd9c);
  const pearl = matte(0xfff7ee);

  const skirt = new THREE.Group();
  part(skirt, 'sphere', dress, 0, -.049, .565, .535, .222, .845);
  for (let i = -3; i <= 3; i++) {
    const offset = Math.abs(i);
    const fold = part(skirt, 'sphere', i % 2 ? silk : dress, i * .134, -.045 - offset * .016,
      .654 + offset * .029, .15, .195 - offset * .027, .79 - offset * .095);
    fold.rotation.y = i * .175;
  }
  part(skirt, 'sphere', rose, 0, -.007, 1.325, .385, .099, .135);
  part(skirt, 'sphere', collar, 0, -.012, 1.424, .298, .074, .069);
  for (let i = -2; i <= 2; i++) {
    part(skirt, 'gem', gold, i * .125, .059 - Math.abs(i) * .008, 1.400 - .021 * i * i,
      .027, .018, .038);
  }
  batch(skirt, actor);

  const body = addGroup(THREE, actor, 'Aurora upper body');
  const bodice = new THREE.Group();
  part(bodice, 'sphere', dress, 0, .257, 0, .292, .341, .204);
  part(bodice, 'sphere', silk, 0, .293, .112, .166, .252, .119);
  part(bodice, 'drum', antique, 0, .076, 0, .245, .061, .173);
  part(bodice, 'sphere', skin, 0, .578, .011, .235, .124, .156);
  part(bodice, 'drum', skin, 0, .705, 0, .095, .201, .106);
  part(bodice, 'gem', gold, 0, .446, .229, .04, .056, .026);
  for (const side of [-1, 1]) {
    beam(bodice, collar, [side * .032, .47, .208], [side * .214, .615, .120], .069, .10);
    beam(bodice, gold, [side * .089, .123, .197], [side * .141, .396, .207], .018);
  }
  batch(bodice, body);

  const head = addGroup(THREE, body, 'Aurora head', 0, 1.005, .017);
  const setEyes = buildPrincessFace(THREE, parts, head, {
    skin, blush: matte(0xe69a8e), brow: matte(0x85522c), lip: matte(0xb74667), iris: matte(0x7967a8), pearl,
  }, true);
  const hairAndCrown = new THREE.Group();
  part(hairAndCrown, 'sphere', hair, 0, .036, -.136, .330, .387, .243);
  for (const side of [-1, 1]) {
    part(hairAndCrown, 'sphere', blond, side * .143, .239, .143, .209, .111, .139).rotation.z = side * -.43;
    part(hairAndCrown, 'sphere', highlight, side * .114, .258, .210, .161, .051, .069).rotation.z = side * -.44;
    part(hairAndCrown, 'sphere', blond, side * .281, -.191, -.044, .121, .255, .136).rotation.z = side * .24;
    part(hairAndCrown, 'sphere', blond, side * .351, -.469, -.064, .119, .239, .117).rotation.z = side * -.24;
    part(hairAndCrown, 'sphere', highlight, side * .366, -.635, -.037, .080, .165, .075).rotation.z = side * .28;
  }
  const circlet = new THREE.TorusGeometry(1, .067, 6, 32);
  part(hairAndCrown, circlet, antique, 0, .344, -.016, .239, .210, .237).rotation.x = Math.PI / 2;
  for (const [x, height, z] of [[-.18, .108, .133], [0, .169, .195], [.18, .108, .133]]) {
    const point = part(hairAndCrown, 'gem', gold, x, .346 + height * .35, z, .063, height, .049);
    point.rotation.z = x * -.85;
  }
  part(hairAndCrown, 'gem', dress, 0, .411, .240, .028, .042, .020);
  batch(hairAndCrown, head);

  const arms = [-1, 1].map(side => {
    const label = side < 0 ? 'left' : 'right';
    const arm = addGroup(THREE, body, 'Aurora ' + label + ' shoulder', side * .263, .523, .017);
    part(arm, 'sphere', silk, 0, -.092, 0, .121, .164, .118);
    part(arm, 'sphere', rose, 0, -.197, 0, .080, .133, .074);
    const elbow = addGroup(THREE, arm, 'Aurora ' + label + ' elbow', 0, -.289, 0);
    part(elbow, 'sphere', dress, 0, -.116, 0, .066, .152, .061);
    part(elbow, 'drum', collar, 0, -.232, .003, .065, .058, .064);
    part(elbow, 'sphere', skin, -side * .014, -.285, .012, .064, .088, .050);
    return { side, arm, elbow };
  });

  return function pose(blend, time, reducedMotion) {
    const rise = smoothstep(blend, .08, .92);
    const breath = reducedMotion ? 0 : Math.sin(time * 1.9);
    const glance = reducedMotion ? 0 : Math.sin(time * 1.15) * .05;
    body.rotation.x = lerp(-1.525, -.315, rise) + breath * .012;
    body.scale.z = 1 + breath * .018;
    head.rotation.set(lerp(.08, .17, rise) + breath * .025, lerp(-.13, .50 + glance, rise),
      lerp(-.10, -.05, rise));
    setEyes(smoothstep(blend, .20, .60));
    for (const { side, arm, elbow } of arms) {
      arm.rotation.set(lerp(-.03 - side * .065, -.40 + side * .14, rise),
        0, side * lerp(.34, .44, rise));
      elbow.rotation.set(lerp(-.10 - side * .075, -.74 + side * .17, rise) + breath * .034,
        0, -side * lerp(.60 + side * .13, .42, rise));
    }
  };
}
