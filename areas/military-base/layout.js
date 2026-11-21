export const WIDTH = 154;
export const DEPTH = 150;
export const SPAWN = { x: 0, z: 70.1 };

export const fence = { west: -70, east: 70, north: -63, south: 61, gate: 7.5, approach: 72 };
export const headquarters = { x: -14, z: -4, width: 20, depth: 19, yaw: .13 };
export const helipad = { x: 21, z: -35, radius: 9.45 };
export const surveyPads = [
  { x: 5.0, z: -43, yaw: -.31 },
  { x: 39, z: -27, yaw: .58 },
];
export const lookout = { x: 62.5, z: 47.5, width: 5.6, depth: 6, height: 3.75, rampWidth: 2.35, rampEnd: 58.5 };
export const checkpoints = [
  { x: 0, z: fence.south, name: '01  /  SOUTH GATE' },
  { x: -64.8, z: 7, name: '02  /  WEST POST' },
  { x: -7, z: -57, name: '03  /  NORTH POST' },
];
export const antennas = [
  { x: -4.0, z: -43.5, kind: 'dish' },
  { x: 56, z: -44, kind: 'array' },
  { x: -55, z: -46, kind: 'relay' },
];
export const motorPool = { x: 34, z: 31 };
export const repairTank = { x: motorPool.x + 12.5, z: motorPool.z + 14.2, yaw: 0.22 };
export const hospital = { x: 23.5, z: -3.5 };
export const supplyDepot = { x: 47, z: 1 };

export const radarControl = { x: -3, z: -34.8 };
export const securityPanels = [
  { x: -5.03, z: fence.south - 4.2, guard: 'South Gate guard west', name: 'South Gate' },
  { x: 50.55, z: 39.1, guard: 'Garage checkpoint guard', name: 'Motor Pool' },
  { x: lookout.x + 1.86, z: lookout.z - 1.95, y: lookout.height, guard: 'Lookout checkpoint guard', name: 'South Lookout' },
];
