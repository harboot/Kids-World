import { buildPrincessFace } from './princess-face.js';
import { addGroup } from '../../core/geometry.js';
import { MULAN_STAGE } from './mulan-garden.js';

const rest = { time: 0, shift: 0, turn: -.22, bow: 0, arm: .28, lift: -.19, elbow: -.27, wrist: -.02, free: -.23 };
const frames = [
  rest,
  { time: .72, shift: -.12, turn: -.26, bow: .23, arm: .71, lift: -.32, elbow: -.88, wrist: -.45, free: -.57 },
  { time: 1.55, shift: -.40, turn: -.50, bow: -.07, arm: 2.02, lift: -.32, elbow: -.43, wrist: .65, free: -.92 },
  { time: 2.40, shift: -.10, turn: -.06, bow: .04, arm: 1.62, lift: -.65, elbow: -.36, wrist: -.20, free: -1.21 },
  { time: 3.24, shift: .39, turn: .42, bow: -.05, arm: 2.30, lift: -.30, elbow: -.52, wrist: .38, free: -.78 },
  { time: 4.12, shift: .22, turn: .24, bow: .07, arm: .98, lift: -.61, elbow: -.80, wrist: -.59, free: -.46 },
  { time: 4.87, shift: .03, turn: -.18, bow: .24, arm: .43, lift: -.23, elbow: -.46, wrist: -.22, free: -.28 },
  { ...rest, time: 5.65 },
];
export const MULAN_DEMONSTRATION_TIME = frames.at(-1).time;

export function buildMulanCharacter({ THREE, room, parts, colors }) {
  const { part, beam, batch, matte } = parts;
  const { x, z, top } = MULAN_STAGE;
  const skin = matte(0xd09772);
  const rouge = matte(0xba6e67);
  const hair = matte(0x322638);
  const tunic = matte(0x398981);
  const cloth = matte(0x58a49a);
  const piping = matte(0xeab184);
  const sash = matte(0xa83759);
  const pants = matte(0x384360);
  const boot = matte(0x3f3043);
  const steel = matte(0xbad7dc);
  const facets = new THREE.DodecahedronGeometry(1);
  const clothShell = new THREE.CylinderGeometry(.28, .39, .42, 8);
  const tunicShell = new THREE.CylinderGeometry(.34, .285, .51, 8);
  const actor = addGroup(THREE, room, 'Mulan', x, top, z);
  const body = addGroup(THREE, actor, 'Mulan body');
  const torso = new THREE.Group();
  // The waist is the shared articulation point; a continuous hip volume overlaps both legs.
  const hips = addGroup(THREE, actor, 'Mulan hips', 0, .78, 0);
  part(hips, facets, pants, 0, -.025, 0, .29, .19, .18);
  const waistJoint = addGroup(THREE, actor, 'Mulan waist pivot', 0, .78, 0);
  waistJoint.add(body);
  body.position.y = -.78;

  part(torso, clothShell, tunic, 0, .89, 0, 1, 1.24, .78);
  part(torso, tunicShell, cloth, 0, 1.27, 0, 1, 1, .72);
  part(torso, 'drum', sash, 0, 1.069, 0, .327, .105, .236);
  const collar = part(torso, facets, piping, 0, 1.50, .115, .25, .09, .133);
  collar.rotation.z = -.12;
  beam(torso, tunic, [-.152, 1.51, .23], [.155, 1.13, .229], .10, .05);
  beam(torso, piping, [-.194, 1.51, .238], [.116, 1.13, .25], .034, .045);
  part(torso, 'gem', colors.gold, .15, 1.066, .242, .060, .057, .029);
  part(torso, 'drum', skin, 0, 1.62, .018, .12, .24, .11);
  batch(torso, body);

  const head = addGroup(THREE, body, 'Mulan head', 0, 1.831, .014);
  const portrait = new THREE.Group();
  buildPrincessFace(THREE, parts, head, { skin, blush: rouge, brow: hair, lip: matte(0x963b50), iris: matte(0x4a3031), pearl: colors.cream }, false, { jaw: .20, eyeWidth: .95 });
  part(portrait, facets, hair, 0, .101, -.11, .345, .312, .256);
  part(portrait, facets, hair, -.109, .228, .090, .235, .119, .193).rotation.z = .35;
  part(portrait, facets, hair, .146, .225, .081, .182, .134, .172).rotation.z = -.48;
  part(portrait, facets, hair, -.05, .38, -.109, .192, .164, .179).rotation.z = .13;
  part(portrait, 'gem', sash, .093, .342, -.011, .098, .062, .083);
  beam(portrait, sash, [.116, .338, -.035], [.228, .164, -.066], .048, .028);
  part(portrait, 'box', colors.gold, -.108, .337, .089, .244, .035, .032).rotation.z = -.25;
  for (const side of [-1, 1]) {
    part(portrait, 'gem', colors.gold, side * .306, -.112, .036, .031, .046, .026);
  }
  batch(portrait, head);

  const arms = [-1, 1].map(side => {
    const shoulder = addGroup(THREE, body, 'Mulan shoulder', side * .294, 1.45, -.013);
    const sleeve = new THREE.Group();
    part(sleeve, facets, cloth, 0, -.025, 0, .132, .12, .132);
    part(sleeve, facets, cloth, 0, -.129, 0, .147, .220, .146);
    part(sleeve, 'drum', tunic, 0, -.253, 0, .111, .076, .104);
    batch(sleeve, shoulder);

    const elbow = addGroup(THREE, shoulder, 'Mulan elbow', 0, -.285, .006);
    const cuff = new THREE.Group();
    part(cuff, facets, tunic, 0, -.024, 0, .105, .09, .104);
    part(cuff, facets, tunic, 0, -.106, .005, .103, .15, .098);
    part(cuff, 'drum', piping, 0, -.206, 0, .078, .062, .077);
    part(cuff, facets, skin, 0, -.263, .009, .074, .088, .082);
    batch(cuff, elbow);
    return { shoulder, elbow };
  });
  const sword = addGroup(THREE, arms[1].elbow, 'Mulan practice sword', 0, -.267, .028);
  const swordParts = new THREE.Group();
  part(swordParts, 'box', boot, 0, -.023, 0, .066, .19, .064);
  part(swordParts, 'box', colors.gold, 0, -.138, 0, .234, .046, .081);
  part(swordParts, 'gem', colors.gold, 0, .081, 0, .045, .049, .039);
  const blade = new THREE.Shape([
    [-.062, -.155], [.062, -.155], [.064, -.777], [.044, -.856],
    [-.044, -.856], [-.064, -.777],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  part(swordParts, new THREE.ExtrudeGeometry(blade, { depth: .035, bevelEnabled: false }),
    steel, 0, 0, -.0175, 1, 1, 1);
  batch(swordParts, sword);

  const legs = [-1, 1].map(side => {
    const leg = addGroup(THREE, hips, 'Mulan leg', side * .165, 0, 0);
    const clothes = new THREE.Group();
    part(clothes, facets, pants, 0, -.255, 0, .174, .405, .151);
    part(clothes, 'box', boot, 0, -.582, .011, .231, .26, .234);
    part(clothes, facets, boot, 0, -.709, .068, .133, .09, .206);
    batch(clothes, leg);
    return leg;
  });

  function pose(from, to = from, blend = 0) {
    const mix = key => THREE.MathUtils.lerp(from[key], to[key], blend);
    const shift = mix('shift');
    const bow = mix('bow');
    // Rotate the torso about the hips, not the floor. Both leg roots stay inside the tunic.
    waistJoint.rotation.set(bow, mix('turn'), -shift * .38);
    hips.rotation.y = mix('turn') * .35;
    head.rotation.set(-bow * .28, -waistJoint.rotation.y * .28, shift * .21);
    arms[0].shoulder.rotation.set(-.27, 0, mix('free'));
    arms[0].elbow.rotation.x = -.35 - Math.abs(shift) * .60;
    arms[1].shoulder.rotation.set(mix('lift'), 0, mix('arm'));
    arms[1].elbow.rotation.x = mix('elbow');
    sword.rotation.z = mix('wrist');
    legs[0].rotation.set(.11 + shift * .43, -.14, -.18 + shift * .37);
    legs[1].rotation.set(-.12 + shift * .46, .14, .17 + shift * .37);
  }

  pose(rest);
  return {
    reset() { pose(rest); },
    perform(time, still) {
      if (still) {
        pose(frames[2]);
        return;
      }
      const index = frames.findIndex(frame => frame.time > time);
      const to = frames[index < 0 ? frames.length - 1 : index];
      const from = frames[index < 0 ? frames.length - 2 : index - 1];
      pose(from, to, THREE.MathUtils.smoothstep(time, from.time, to.time));
    },
  };
}
