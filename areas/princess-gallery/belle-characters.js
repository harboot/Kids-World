import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { addRoundSolid, spaceTransform } from './parts.js';
import { buildPrincessFace } from './princess-face.js';

function buildReadingBelle(THREE, room, parts, palette) {
  const { part, beam, batch, matte } = parts;
  const { gold, goldLeaf, cream, wine } = palette;
  const skin = matte(0xf0ba95);
  const brunette = matte(0x633930);
  const auburn = matte(0x965537);
  const satin = matte(0xe7ab38);
  const silk = matte(0xffcd65);
  const pearl = matte(0xffefda);
  const belle = addGroup(THREE, room, 'Belle reading', -3.48, 0, -.53, .40);
  const details = new THREE.Group();
  const dress = new THREE.LatheGeometry([
    [.72, 0], [.89, .071], [.88, .24], [.805, .49], [.665, .75],
    [.475, .99], [.269, 1.24], [.237, 1.34],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 48);
  const folds = dress.getAttribute('position');
  for (let i = 0; i < folds.count; i++) {
    const x = folds.getX(i), z = folds.getZ(i);
    const fold = 1 + .073 * Math.cos(Math.atan2(x, z) * 9) * (1 - folds.getY(i) / 1.35);
    folds.setX(i, x * fold);
    folds.setZ(i, z * fold);
  }
  dress.computeVertexNormals();
  part(details, dress, satin, 0, 0, 0, 1, 1, .77);
  for (let index = 0; index < 8; index++) {
    const a = Math.PI * index / 4;
    const gathering = part(details, 'sphere', silk, Math.sin(a) * .63, .655, Math.cos(a) * .48, .176, .332, .079);
    gathering.rotation.set(Math.cos(a) * -.43, a, Math.sin(a) * .39, 'YXZ');
    part(details, 'gem', goldLeaf, Math.sin(a) * .74, .45, Math.cos(a) * .56, .045, .12, .083);
  }
  part(details, 'sphere', satin, 0, 1.31, 0, .248, .17, .193);
  part(details, 'sphere', goldLeaf, 0, 1.511, -.027, .29, .339, .205);
  part(details, 'drum', silk, 0, 1.267, 0, .256, .067, .199);
  part(details, 'sphere', skin, 0, 1.751, .026, .238, .101, .174);
  part(details, 'drum', skin, 0, 1.835, .007, .106, .209, .102);
  for (const side of [-1, 1]) {
    part(details, 'sphere', silk, side * .266, 1.705, .011, .146, .084, .132).rotation.z = side * .40;
    beam(details, silk, [side * .032, 1.626, .177], [side * .208, 1.793, .144], .052);
    const elbow = [side * .324, 1.383, .145];
    beam(details, skin, [side * .266, 1.682, 0], elbow, .11);
    part(details, 'sphere', pearl, ...elbow, .065, .068, .063);
    beam(details, pearl, elbow, [side * .248, 1.487, .38], .115);
    part(details, 'sphere', pearl, side * .259, 1.483, .398, .070, .071, .084);
  }
  const book = addGroup(THREE, details, '', 0, 1.506, .393);
  book.rotation.x = .34;
  for (const side of [-1, 1]) {
    const page = addGroup(THREE, book, '', side * .148, 0, 0);
    page.rotation.z = .25 * side;
    part(page, 'box', wine, 0, -.019, 0, .30, .044, .307);
    part(page, 'box', cream, 0, .021, 0, .267, .048, .276);
    for (let i = 0; i < 3; i++) {
      part(page, 'box', gold, 0, .046 + SURFACE_GAP.detail, -.068 + i * .055, .182, .009, .011);
    }
  }
  batch(details, belle);

  const head = addGroup(THREE, belle, 'Belle head', 0, 2.043, .044);
  head.rotation.set(.17, -.09, -.069);
  buildPrincessFace(THREE, parts, head, {
    skin, blush: matte(0xd5967d), brow: brunette, lip: matte(0xab425d), iris: matte(0x785f46), pearl,
  }, false, { jaw: .19, eyeWidth: .94 });
  const hair = new THREE.Group();
  part(hair, 'sphere', brunette, 0, .083, -.126, .334, .357, .263);
  part(hair, 'sphere', brunette, 0, .29, -.237, .216, .229, .176);
  part(hair, 'sphere', goldLeaf, 0, .305, -.345, .134, .122, .102);
  for (const side of [-1, 1]) {
    part(hair, 'sphere', auburn, side * .164, .237, .159, .186, .123, .114).rotation.z = -side * .47;
    part(hair, 'sphere', brunette, side * .248, -.051, -.109, .127, .282, .160).rotation.z = side * -.29;
    part(hair, 'sphere', brunette, side * .159, -.294, -.226, .145, .229, .124).rotation.z = side * -.32;
    part(hair, 'gem', goldLeaf, side * .305, -.132, .053, .038, .062, .043);
  }
  batch(hair, head);
  return belle;
}

function buildBeast(THREE, room, parts, palette) {
  const { part, beam, batch, matte } = parts;
  const { gold, goldLeaf, cream, wine } = palette;
  const fur = matte(0x986147);
  const warm = matte(0xc48860);
  const mane = matte(0x694638);
  const tuft = matte(0x583d3a);
  const horn = matte(0xa39276);
  const hornTip = matte(0xd0b595);
  const jacket = matte(0x3d5681);
  const facing = matte(0x526f99);
  const trousers = matte(0x4c4256);
  const nose = matte(0x4c3341);
  const eye = matte(0x539ac8);
  const beast = addGroup(THREE, room, 'The Beast in the library', 3.18, 0, -2.31, -.37);
  const details = new THREE.Group();
  part(details, 'sphere', trousers, 0, 1.07, -.018, .51, .449, .283);
  for (const side of [-1, 1]) {
    const x = side * .29;
    const leg = part(details, 'sphere', trousers, x, .66, .013, .192, .56, .197);
    leg.rotation.z = side * .083;
    part(details, 'sphere', fur, side * .356, .265, .021, .176, .218, .194);
    part(details, 'sphere', warm, side * .362, .143, .131, .239, .143, .278);
    for (let i = -1; i <= 1; i++) {
      part(details, 'gem', cream, side * .362 + i * .084, .116, .355, .048, .041, .067);
    }
    part(details, 'sphere', jacket, side * .243, .97, -.188, .255, .51, .206).rotation.z = side * .18;
  }
  part(details, 'sphere', jacket, 0, 1.61, -.057, .679, .635, .341);
  part(details, 'sphere', facing, 0, 1.805, -.07, .71, .42, .305);
  part(details, 'sphere', cream, 0, 1.776, .267, .254, .375, .117);
  part(details, 'sphere', wine, 0, 1.695, .359, .143, .24, .074);
  part(details, 'gem', goldLeaf, 0, 1.928, .344, .144, .107, .067);
  for (const side of [-1, 1]) {
    beam(details, gold, [side * .25, 2.07, .258], [side * .15, 1.658, .348], .065);
    beam(details, gold, [side * .15, 1.658, .348], [side * .33, 1.291, .24], .059);
    for (let i = 0; i < 3; i++) {
      part(details, 'sphere', goldLeaf, side * .342, 1.47 + i * .154, .256 + i * .027, .051, .055, .047);
    }
    const arm = addGroup(THREE, details, '', side * .591, 1.928, -.055);
    arm.rotation.set(side < 0 ? -.35 : -.089, 0, side * .24);
    part(arm, 'sphere', jacket, 0, -.187, 0, .219, .328, .217);
    const elbow = addGroup(THREE, arm, '', 0, -.374, .014);
    elbow.rotation.x = side < 0 ? -.53 : -.23;
    part(elbow, 'sphere', facing, 0, -.114, 0, .166, .257, .157);
    part(elbow, 'drum', gold, 0, -.290, .005, .146, .081, .138);
    part(elbow, 'sphere', fur, 0, -.381, .035, .17, .202, .143);
    for (let i = 0; i < 3; i++) {
      part(elbow, 'sphere', warm, (i - 1) * .087, -.482, .103, .048, .082, .051);
    }
  }
  batch(details, beast);

  const head = addGroup(THREE, beast, 'Beast horned head', 0, 2.56, .042);
  head.rotation.set(.018, .15, -.04);
  const face = new THREE.Group();
  part(face, 'sphere', mane, 0, -.081, -.109, .571, .625, .381);
  part(face, 'sphere', fur, 0, .035, .072, .434, .492, .340);
  part(face, 'sphere', tuft, 0, .338, -.008, .391, .204, .331);
  part(face, 'sphere', warm, 0, -.187, .344, .316, .234, .217);
  part(face, 'sphere', nose, 0, -.071, .522, .160, .094, .089);
  part(face, 'sphere', tuft, 0, -.354, .219, .175, .216, .180);
  for (const side of [-1, 1]) {
    part(face, 'sphere', mane, side * .365, -.158, .003, .269, .393, .245).rotation.z = side * .24;
    part(face, 'ball', warm, side * .348, -.286, .248, .142, .209, .135).rotation.z = side * -.32;
    part(face, 'sphere', mane, side * .456, .102, -.029, .179, .134, .145).rotation.z = side * .35;
    part(face, 'sphere', warm, side * .484, .104, .062, .110, .066, .067).rotation.z = side * .34;
    part(face, 'sphere', cream, side * .17, .135, .369, .095, .081, .039);
    part(face, 'sphere', eye, side * .161, .127, .400, .052, .059, .026);
    part(face, 'sphere', nose, side * .155, .126, .421, .032, .036, .016);
    part(face, 'sphere', cream, side * .149 - .016, .147, .434, .014, .014, .008);
    part(face, 'sphere', mane, side * .183, .221, .362, .114, .038, .064).rotation.z = side * -.22;
    beam(face, nose, [0, -.254, .548], [side * .173, -.243, .500], .025);
    beam(face, nose, [side * .173, -.243, .500], [side * .245, -.189, .465], .023);
    part(face, 'cone', cream, side * .206, -.216, .491, .056, .115, .048).rotation.z = side * -.21;
    const curve = new THREE.CatmullRomCurve3([
      [side * .286, .291, -.049], [side * .397, .449, -.107],
      [side * .434, .647, -.159], [side * .359, .797, -.190],
    ].map(point => new THREE.Vector3(...point)));
    const geometry = new THREE.TubeGeometry(curve, 14, .115, 8, false);
    const points = geometry.getAttribute('position');
    for (let i = 0; i <= 14; i++) {
      const center = curve.getPointAt(i / 14);
      const scale = 1 - .92 * i / 14;
      for (let j = 0; j < 9; j++) {
        const k = i * 9 + j;
        points.setXYZ(k, center.x + (points.getX(k) - center.x) * scale,
          center.y + (points.getY(k) - center.y) * scale, center.z + (points.getZ(k) - center.z) * scale);
      }
    }
    geometry.computeVertexNormals();
    part(face, geometry, horn, 0, 0, 0, 1, 1, 1);
    part(face, 'sphere', hornTip, side * .359, .797, -.190, .016, .022, .015);
  }
  batch(face, head);
  return beast;
}

export function buildBelleCharacters({ THREE, room, parts, palette, exhibit, obstacles }) {
  const { toWorld } = spaceTransform(exhibit);
  const belle = buildReadingBelle(THREE, room, parts, palette);
  const beast = buildBeast(THREE, room, parts, palette);
  addRoundSolid(obstacles, ...toWorld(belle.position.x, belle.position.z), .88, 2.58);
  addRoundSolid(obstacles, ...toWorld(beast.position.x, beast.position.z), 1.02, 3.41);
}
