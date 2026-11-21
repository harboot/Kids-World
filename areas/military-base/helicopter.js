import { SURFACE_GAP } from '../../core/geometry.js';
import { buildCabin } from './helicopter-cabin.js';
import { helipad } from './layout.js';
import { ink } from './scenery.js';

// The airframe points along +Z. With +Y up, its right side is -X.
export const passengerEye = [-.55, 2.56, 1.20];
export const parkedHeading = .91;
export const passengerDoor = [-2.34, 2.56, 1.27];
const exitDoor = [-2.71, 0, 1.27];

export function buildHelicopter(kit, moving, document) {
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
  part(aircraft, 'cap', ink.moss, 0, 1.48, 2.47, 1.26, .51, .84);
  for (const side of [-1, 1]) {
    box(aircraft, ink.glass, side * 1.30, 2.24, -.64, .14, .52, .83, [0, 0, -side * .18]);
    box(aircraft, ink.glassLight, side * 1.37, 2.40, -.66, .031, .11, .71);
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
  const door = buildCabin(kit, moving, aircraft, document);
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
