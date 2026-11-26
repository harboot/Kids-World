import { createVehicleDriving, canPlaceVehicle, rectanglesOverlap } from '../../core/vehicle-driving.js';
import { compactTank } from './compact-tank.js';
export { rectanglesOverlap };
export const tankConfig = Object.freeze({ forward: 15, reverse: 6, acceleration: 10, braking: 14, turn: 1.5 });
const dimensions = Object.freeze({ ...compactTank, extraFootprints: [{ z: compactTank.cannonZ, width: compactTank.cannonWidth, depth: compactTank.cannonDepth }] });
export const canPlaceTank = (x,z,yaw,world) => canPlaceVehicle(x,z,yaw,world,dimensions);
export function createTankDriving(options) {
  return createVehicleDriving({ ...options, dimensions, config: tankConfig, label: 'Tank' });
}
