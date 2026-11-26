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
  { x: 67.3, z: -8.5, name: '04  /  EAST POST' },
];
export const antennas = [
  { x: -4.0, z: -43.5, kind: 'dish' },
];
export const motorPool = { x: 34, z: 31 };
export const repairTank = { x: motorPool.x + 12.5, z: motorPool.z + 14.2, yaw: 0.22 };
export const hospital = { x: 23.5, z: -3.5 };
export const supplyDepot = { x: 47, z: 1 };

export const radarControl = { x: -3, z: -34.8 };
export const securityPanels = [
  { x: -5.03, z: fence.south - 4.2, yaw: Math.PI, guard: 'South Gate guard west', name: 'South Gate' },
  { x: -65.6, z: 2.8, yaw: Math.PI / 2, guard: 'West checkpoint guard', name: 'West Post' },
  { x: 67.3, z: -5.4, yaw: -Math.PI / 2, guard: 'East checkpoint guard', name: 'East Post' },
];

// Ordered route on the main paved roads, away from parked vehicles.
export const tankTestCheckpoints = [{ x: 62, z: 5 }, { x: -30, z: -52 }, { x: -40, z: 48 }];
export const northPost = { x: checkpoints[2].x - 1.14, z: checkpoints[2].z - 1.5, width: 4.6, depth: 4.0, floor: .135 };
export const binocularPoint = { x: lookout.x - 1.72, y: lookout.height, z: lookout.z - 1.70 };

export const generatorSite = Object.freeze({ x: -12, z: 33.2, width: 7.6, depth: 7.6, floor: .135, darkRadius: 14 });
