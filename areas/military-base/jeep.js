import { ink } from './scenery.js';
import { createVehicleDriving } from '../../core/vehicle-driving.js';
import { tankConfig } from './tank-driving.js';

export const jeepDimensions = Object.freeze({ width: 2.22, depth: 4.36, eyeHeight: 2.02, seatX: .43, seatZ: -.64,
  boardX: 1.51, boardZ: -.48, trackOffset: .94, pitch: -.18 });
export function createJeepDriving(options) {
  return createVehicleDriving({ ...options, dimensions: jeepDimensions, config: tankConfig, label: 'Jeep' });
}
export function buildDrivableJeep(kit, moving, x, z, yaw) {
  const { group, movingSolid } = kit;
  const { part, box, beam, groundShadow } = moving;
  const car = group('Entrance patrol jeep', x, 0, z, yaw);
  groundShadow(car, .35, -.25, 3.24, 5.44, .048);
  box(car, ink.dark, 0, .51, 0, 1.77, .22, 3.96);
  box(car, 0x72b466, 0, .81, -.10, 1.77, .49, 3.74);
  box(car, 0x98cc7f, 0, 1.15, 1.14, 1.62, .22, 1.29);
  box(car, ink.dark, 0, .93, 1.835, 1.13, .38, .075);
  for (let i=-2;i<=2;i++) box(car, ink.steel, i*.173,.94,1.893,.07,.26,.039);
  const wheels = [];
  for (const side of [-1,1]) {
    for (const zz of [-1.20,1.18]) {
      const steering = group('Jeep steering axle',side*.94,.43,zz,0,car);
      const wheel = group('Jeep road wheel',0,0,0,0,steering);
      part(wheel,'drum',ink.rubber,0,0,0,.41,.30,.41,[0,0,Math.PI/2]);
      part(wheel,'drum',0x829083,side*.176,0,0,.25,.055,.25,[0,0,Math.PI/2]);
      part(wheel,'drum',ink.dark,side*.218,0,0,.094,.052,.094,[0,0,Math.PI/2]);
      box(wheel,ink.steel,side*.248,.16,0,.035,.06,.05);
      wheels.push({ wheel, steering, side, front:zz>0 });
    }
    box(car, ink.olive, side*.82, 1.0, -.81,.17,.61,1.9);
    box(car, 0xffedc8, side*.67,1.03,1.87,.25,.22,.14,[],true);
    box(car, 0xff6055, side*.69,.97,-2.0,.19,.14,.10,[],true);
    box(car, ink.dark, side*.42,1.11,-.61,.58,.19,.60);
    box(car, ink.dark, side*.42,1.36,-.91,.57,.65,.18,[.12,0,0]);
    beam(car, ink.dark,[side*.78,.95,-1.58],[side*.63,1.93,-.91],.095);
    beam(car, ink.dark,[side*.63,1.93,-.91],[side*.73,1.83,.47],.095);
    beam(car, ink.dark,[side*.72,1.22,.45],[side*.72,1.82,.59],.09);
  }
  box(car,ink.dark,0,1.94,-.9,1.32,.085,.085);
  // Clear windshield opening and dashboard; no opaque pane blocking first-person view.
  box(car,ink.dark,0,1.83,.59,1.52,.09,.09);
  box(car,ink.dark,0,1.22,.45,1.52,.13,.17);
  box(car,ink.steel,0,1.30,.29,1.50,.19,.28);
  box(car,0x9ccbc1,.43,1.41,.15,.25,.08,.035,[],true);
  const steeringWheel = group('Jeep steering wheel',.43,1.43,.02,0,car);
  steeringWheel.rotation.x = -.28;
  part(steeringWheel,'rotorRing',ink.dark,0,0,0,.22,.22,.22,[Math.PI/2,0,0]);
  box(steeringWheel,ink.dark,0,0,0,.34,.04,.04);
  box(steeringWheel,ink.steel,0,0,0,.07,.07,.065);
  part(car,'drum',ink.rubber,0,.99,-2.02,.41,.30,.41,[Math.PI/2,0,0]);
  box(car,ink.dark,0,.48,1.96,2.1,.17,.23);
  const hull = movingSolid(car,0,0,jeepDimensions.width,jeepDimensions.depth,1.96);
  const travel=[0,0];
  function pose(px,pz,heading,left=0,right=0,throttle=0,steer=0) {
    car.position.set(px,0,pz); car.rotation.y=heading;
    travel[0]+=left;travel[1]+=right;
    for(const {wheel,steering,side,front} of wheels) {
      wheel.rotation.x=travel[side>0?1:0]/.41;
      steering.rotation.y=front?steer*.38:0;
    }
    steeringWheel.rotation.z=-steer*.7;
    hull();
  }
  return { ground:car, ownObstacles:[hull.obstacle], pose, reset(){travel.fill(0);pose(x,z,yaw);} };
}
