import { SURFACE_GAP } from '../../core/geometry.js';
import { helipad } from './layout.js';
import { ink } from './scenery.js';

// The airframe points along +Z. With +Y up, its right side is -X.
export const passengerEye = [-.55, 2.56, 1.20];
export const parkedHeading = .91;
export const passengerDoor = [-2.34, 2.56, 1.27];
const exitDoor = [-2.71, 0, 1.27];

function glazing(THREE, parent, material, corners) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  parent.add(new THREE.Mesh(geometry, material));
}

function cockpit(kit, moving, aircraft) {
  const { THREE, group } = kit;
  const { part, box, beam } = moving;
  const glass = new THREE.MeshBasicMaterial({
    color: 0xc1e5ef, side: THREE.DoubleSide, transparent: true, opacity: .11, depthWrite: false,
  });
  const frame = 0x476052;
  const windshield = [[-1.05, 2.01, 2.49], [1.05, 2.01, 2.49], [1.04, 3.04, 2.05], [-1.04, 3.04, 2.05]];
  glazing(THREE, aircraft, glass, windshield);
  for (let i = 0; i < windshield.length; i++) beam(aircraft, frame, windshield[i], windshield[(i + 1) % 4], .064);
  beam(aircraft, frame, [0, 2.01, 2.49], [0, 3.04, 2.05], .037);
  part(aircraft, 'cap', 0x658b50, 0, 3.08, 1.08, 1.23, .15, 1.16);
  box(aircraft, 0x495e53, 0, 2.00, 2.16, 1.88, .13, .62, [-.11, 0, 0]);
  box(aircraft, ink.dark, 0, 1.94, 1.86, 1.55, .15, .07, [-.25, 0, 0]);

  for (const x of [-.58, -.28, .02, .32, .61]) {
    part(aircraft, 'drum', 0x577381, x, 1.96, 1.812, .055, .025, .055, [Math.PI / 2 - .25, 0, 0]);
    box(aircraft, x === .02 ? ink.yellow : 0xb5dbc7, x, 1.972, 1.786, .047, .013, .014, [0, 0, .34 + x]);
  }

  let door;
  for (const side of [-1, 1]) {
    const x = side * .55;
    const seat = group(side < 0 ? 'Right passenger seat' : 'Left pilot seat', x, 0, 0, 0, aircraft);
    box(seat, 0x527169, 0, 1.43, .98, .52, .16, .59);
    box(seat, 0x46645d, 0, 1.72, .66, .51, .65, .124, [-.12, 0, 0]);
    box(seat, 0x63827b, 0, 2.07, .60, .34, .23, .16);
    box(seat, ink.dark, 0, 1.10, .95, .29, .27, .35);
    beam(aircraft, 0x465953, [x, 1.15, 1.56], [x, 1.88, 1.49], .059, .059, 'drum');
    part(aircraft, 'cap', ink.rubber, x, 1.90, 1.49, .08, .07, .08);

    const panel = group(side < 0 ? 'Right passenger door' : 'Left cockpit window', side * 1.075, 0, 2.04, 0, aircraft);
    const corners = [[0, 1.99, .01], [side * .099, 1.99, -1.71], [side * .094, 3.04, -1.71], [0, 3.04, .01]];
    glazing(THREE, panel, glass, corners);
    for (let i = 0; i < corners.length; i++) {
      beam(panel, frame, corners[i], corners[(i + 1) % 4], i === 1 || i === 3 ? .045 : .062);
    }
    if (side < 0) {
      door = panel;
      box(panel, 0x749f63, -.018, 1.825, -.87, .084, .30, 1.70);
      box(panel, ink.paleTeal, -.077, 1.92, -1.37, .07, .073, .21);
    } else box(panel, ink.moss, .018, 1.86, -.87, .08, .22, 1.70);
  }

  const pilot = group('Seated helicopter pilot', .55, .17, 1.06, 0, aircraft);
  box(pilot, 0x58775b, 0, 1.68, -.05, .38, .54, .27, [.13, 0, 0]);
  box(pilot, 0x72957b, 0, 1.76, .11, .31, .30, .081);
  box(pilot, ink.yellow, .11, 1.80, .158, .079, .034, .022);
  part(pilot, 'cap', 0xd0a074, 0, 2.16, .11, .167, .197, .155);
  part(pilot, 'cap', 0x819d6a, 0, 2.252, .094, .199, .139, .185);
  box(pilot, 0x87bdc4, 0, 2.192, .249, .264, .076, .065);
  for (const side of [-1, 1]) {
    part(pilot, 'drum', ink.dark, side * .159, 2.152, .10, .086, .066, .079, [0, 0, Math.PI / 2]);
    beam(pilot, 0x54765f, [side * .155, 1.82, -.015], [side * .18, 1.59, .251], .114);
    const palm = [side * .072, 1.73, .435];
    beam(pilot, 0x6f916e, [side * .18, 1.59, .251], palm, .104);
    part(pilot, 'cap', 0xc6956b, ...palm, .062, .06, .07);
    box(pilot, 0x536e59, side * .107, 1.40, .274, .153, .18, .45);
    box(pilot, ink.dark, side * .107, 1.15, .47, .139, .474, .15);
  }
  return door;
}

export function buildHelicopter(kit, moving) {
  const { THREE, group, movingSolid } = kit;
  const { part, box, beam } = moving;
  const ground = group('Helicopter parking position', helipad.x, 0, helipad.z, parkedHeading);
  const shade = group('Helicopter ground contact', helipad.x, 0, helipad.z, parkedHeading);
  moving.groundShadow(shade, .78, -.95, 5.2, 9.6);
  const aircraft = group('Utility helicopter', 0, SURFACE_GAP.detail * 5, 0, 0, ground);
  const hull = [];
  for (const side of [-1, 1]) {
    beam(aircraft, ink.dark, [side * 1.46, .12, -2.98], [side * 1.46, .12, 2.71], .117, .117, 'drum');
    beam(aircraft, ink.dark, [side * 1.46, .12, 2.69], [side * 1.46, .33, 3.12], .117, .117, 'drum');
    for (const z of [-1.49, 1.29]) beam(aircraft, ink.steel, [side * 1.46, .155, z], [side * .72, 1.32, z], .093);
    hull.push(movingSolid(aircraft, side * 1.46, -.06, .23, 5.69, 1.24));
  }
  part(aircraft, 'cap', 0x71b966, 0, 1.11, .01, 1.46, .36, 3.0);
  part(aircraft, 'cap', 0x69a65a, 0, 1.99, -1.34, 1.37, 1.14, 1.57);
  part(aircraft, 'cap', ink.moss, 0, 1.52, 2.08, 1.26, .52, 1.21);
  box(aircraft, 0x5b7666, 0, 1.13, 1.05, 2.11, .10, 2.29);
  for (const side of [-1, 1]) {
    box(aircraft, ink.glass, side * 1.30, 2.24, -.64, .14, .52, .83, [0, 0, -side * .18]);
    box(aircraft, ink.glassLight, side * 1.37, 2.40, -.66, .031, .11, .71);
    box(aircraft, 0x6c9b62, side * 1.13, 1.49, .90, .20, .79, 2.31);
    box(aircraft, ink.steel, side * 1.38, 1.10, .86, .28, .10, 1.46);
    box(aircraft, ink.yellow, side * 1.29, 1.68, -.87, .047, .17, .68);
    box(aircraft, side > 0 ? 0xf17554 : 0x99d37e, side * 1.27, 1.62, -1.36, .11, .13, .16);
    part(aircraft, 'drum', ink.dark, side * .63, 2.83, -1.16, .26, 1.25, .26, [Math.PI / 2, 0, 0]);
  }
  beam(aircraft, ink.olive, [0, 2.16, -2.12], [0, 2.56, -6.67], .43, .56, 'post');
  part(aircraft, 'tip', ink.moss, 0, 3.02, -6.36, 1.47, 1.52, .19, [0, Math.PI / 2, -.29]);
  box(aircraft, ink.olive, 0, 2.49, -5.66, 2.64, .13, .61);
  box(aircraft, ink.yellow, 0, 3.48, -6.59, .20, .22, .29);
  part(aircraft, 'drum', ink.dark, 0, 3.4, .08, .19, .77, .19);
  const rotor = group('Main rotor', 0, 3.83, .08, 0, aircraft);
  part(rotor, 'drum', ink.steel, 0, .02, 0, .36, .16, .36);
  for (let i = 0; i < 3; i++) {
    const blade = group('Main rotor blade', 0, 0, 0, i * Math.PI * 2 / 3, rotor);
    box(blade, ink.dark, 0, 0, 2.84, .25, .064, 5.02);
    box(blade, ink.yellow, 0, .045, 5.15, .245, .025, .32);
  }
  const tail = group('Tail rotor', .24, 2.99, -6.58, 0, aircraft);
  box(tail, ink.dark, 0, 0, 0, .10, 1.46, .14);
  box(tail, ink.yellow, .049, .62, 0, .032, .23, .14);
  box(tail, ink.yellow, .049, -.62, 0, .032, .23, .14);
  hull.push(
    movingSolid(aircraft, 0, .10, 2.62, 5.90, 3.18),
    movingSolid(aircraft, 0, -4.0, .52, 2.31, 2.56),
    movingSolid(aircraft, 0, -6.08, 2.5, .85, 3.72),
  );
  const door = cockpit(kit, moving, aircraft);
  const local = new THREE.Vector3();
  const exit = aircraft.localToWorld(local.fromArray(exitDoor));
  const standing = { x: exit.x, z: exit.z, yaw: parkedHeading + Math.PI * .76 };
  return {
    aircraft, standing,
    pose(x, y, z, yaw, bank, pitch, rotorAngle, doorAngle) {
      ground.position.set(x, y, z);
      ground.rotation.set(pitch, yaw, bank, 'YXZ');
      shade.position.set(x, .039, z);
      shade.rotation.y = yaw;
      shade.scale.setScalar(Math.max(0, 1 - y / 6));
      rotor.rotation.y = rotorAngle;
      tail.rotation.x = rotorAngle * 2.73 + .36;
      door.rotation.y = doorAngle;
      for (const sync of hull) sync(y < 1.4);
    },
  };
}
