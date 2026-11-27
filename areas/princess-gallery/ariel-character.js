import { addGroup } from '../../core/geometry.js';
import { buildPrincessFace } from './princess-face.js';

export function buildArielCharacter(THREE, room, parts) {
  const { part, beam, batch, matte } = parts;
  const skin = matte(0xf0b492);
  const pearl = matte(0xffefd4);
  const ginger = matte(0xaf2147);
  const copper = matte(0xe74b4f);
  const streak = matte(0xf57863);
  const violet = matte(0x9b5ac5);
  const violetLight = matte(0xca8ede);
  const emerald = matte(0x278c71);
  const jade = matte(0x40b292);
  const seafoam = matte(0x72d5b2);
  const actor = addGroup(THREE, room, 'Ariel character');
  const spine = addGroup(THREE, actor, 'Ariel swimming pose');
  const details = new THREE.Group();
  part(details, 'sphere', skin, 0, .42, .011, .245, .392, .173);
  part(details, 'sphere', skin, 0, .69, 0, .239, .185, .152);
  part(details, 'drum', skin, 0, .84, .035, .093, .235, .105);
  for (const side of [-1, 1]) {
    const shell = addGroup(THREE, details, '', side * .125, .555, .143);
    shell.rotation.z = side * -.24;
    part(shell, 'sphere', violet, 0, 0, 0, .152, .135, .094);
    for (let i = -1; i <= 1; i++) {
      part(shell, 'sphere', violetLight, i * .047, .007, .071, .026, .092, .024).rotation.z = -i * .21;
    }
  }
  part(details, 'sphere', pearl, 0, .549, .212, .031, .047, .031);
  batch(details, spine);

  const head = addGroup(THREE, spine, 'Ariel head', 0, 1.08, .047);
  buildPrincessFace(THREE, parts, head, {
    skin, blush: matte(0xe8967b), brow: matte(0x772940), lip: matte(0xb53659), iris: matte(0x2783b1), pearl,
  }, false, { jaw: .14, eyeWidth: 1.05 });
  const hair = new THREE.Group();
  part(hair, 'sphere', ginger, 0, .09, -.125, .365, .408, .292);
  part(hair, 'sphere', copper, -.147, .252, .173, .242, .145, .111).rotation.z = -.36;
  part(hair, 'sphere', copper, .141, .235, .154, .204, .108, .129).rotation.z = .36;
  part(hair, 'sphere', streak, -.139, .288, .237, .208, .045, .052).rotation.z = -.35;
  part(hair, 'sphere', copper, .277, -.14, -.052, .133, .253, .172).rotation.z = -.18;
  part(hair, 'sphere', pearl, -.303, -.131, .036, .042, .061, .038);
  part(hair, 'sphere', pearl, .303, -.131, .042, .042, .061, .038);
  batch(hair, head);

  const curls = addGroup(THREE, head, 'Ariel flowing hair', 0, -.09, -.14);
  const locks = new THREE.Group();
  for (const [i, [x, y, z, long, lean]] of [
    [-.22, -.15, -.125, .353, -.24], [.09, -.19, -.179, .419, .20], [.25, -.24, -.146, .373, .26],
    [-.09, -.47, -.232, .308, -.37], [.18, -.46, -.29, .321, -.45],
  ].entries()) {
    const curl = part(locks, 'sphere', i % 2 ? ginger : copper, x, y, z, .166, long, .154);
    curl.rotation.set(.39 + i * .095, 0, lean);
    const line = part(locks, 'sphere', streak, x + .081, y, z + .103, .052, long * .80, .058);
    line.rotation.copy(curl.rotation);
  }
  batch(locks, curls);

  const arms = [-1, 1].map(side => {
    const shoulder = addGroup(THREE, spine, 'Ariel shoulder', side * .205, .703, 0);
    part(shoulder, 'sphere', skin, 0, -.025, 0, .087, .094, .082);
    part(shoulder, 'sphere', skin, 0, -.116, 0, .080, .164, .075);
    const elbow = addGroup(THREE, shoulder, '', 0, -.254, .003);
    part(elbow, 'sphere', skin, 0, -.035, 0, .070, .083, .068);
    part(elbow, 'sphere', skin, 0, -.110, 0, .061, .145, .062);
    part(elbow, 'sphere', skin, .007, -.240, .025, .062, .081, .044);
    part(elbow, 'sphere', skin, -side * .042, -.224, .041, .027, .054, .037).rotation.z = side * -.27;
    return { side, shoulder, elbow };
  });

  const hip = addGroup(THREE, spine, 'Ariel tail', 0, .21, -.012);
  part(hip, 'sphere', emerald, 0, -.147, 0, .255, .320, .178);
  part(hip, 'sphere', seafoam, 0, -.063, .145, .184, .162, .065);
  part(hip, 'sphere', jade, 0, -.365, -.048, .188, .280, .140).rotation.x = .20;
  for (const side of [-1, 1]) {
    part(hip, 'sphere', seafoam, side * .179, -.035, .035, .11, .125, .145).rotation.z = side * -.69;
    for (let i = 0; i < 4; i++) {
      part(hip, 'sphere', jade, side * (.052 + .023 * (i % 2)), -.202 - i * .061, .166 - i * .013,
        .051, .026, .023);
    }
  }
  const tail = addGroup(THREE, hip, 'Ariel articulated tail tip', 0, -.460, -.045);
  part(tail, 'sphere', jade, 0, -.050, 0, .154, .182, .128);
  part(tail, 'sphere', jade, 0, -.206, -.02, .130, .329, .112).rotation.x = .12;
  part(tail, 'sphere', emerald, 0, -.429, -.039, .086, .191, .072);
  const fan = addGroup(THREE, tail, 'Ariel tail fins', 0, -.537, -.047);
  for (const side of [-1, 1]) {
    const f = addGroup(THREE, fan, '', side * .046, 0, 0);
    f.rotation.z = side * .68;
    part(f, 'sphere', jade, 0, -.196, .014, .154, .285, .051);
    part(f, 'sphere', seafoam, 0, -.220, .047, .119, .232, .034);
    beam(f, jade, [0, -.038, .052], [side * .048, -.39, .077], .014);
  }

  function pose(time, still) {
    const swim = still ? 0 : Math.sin(time * 3.65);
    spine.rotation.set(still ? .10 : .26 + .105 * swim, 0, .088 * swim);
    head.rotation.set(still ? .105 : .07 - .068 * swim, still ? 0 : -.45, -.074 + .041 * swim);
    curls.rotation.set(.11 + .19 * swim, -.13 * swim, .17 * swim);
    hip.rotation.x = .31 + .29 * swim;
    tail.rotation.x = .43 + (still ? 0 : .39 * Math.sin(time * 3.65 - 1.03));
    fan.rotation.x = -.07 + (still ? 0 : .30 * Math.sin(time * 3.65 - 1.61));
    for (const { side, shoulder, elbow } of arms) {
      shoulder.rotation.set(-.24 - side * .12 + .17 * swim, side * .15, side * (.55 + .14 * swim));
      elbow.rotation.set(-.43 + .12 * swim, 0, side * -.28);
    }
  }
  pose(0, true);
  return { actor, pose };
}
