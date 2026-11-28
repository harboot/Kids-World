export const outdoorSites = {
  camp: { x: -16, z: 50 },
  settlement: { x: -42, z: -5 },
  pier: { x: 18.6, z: 8 },
  lookout: { x: 34, z: -16.2 },
};

export const goldSites = [
  ['gold-nugget-lower', -27, 31],
  ['gold-nugget-middle', 40, 15],
  ['gold-nugget-upper', 33, -13],
];

export const crystalSites = [
  { id: 'crystal-deposit-blue', x: -12.7, z: -53.6, approach: [-14.1, -54.7], color: 0x58c8ff },
  { id: 'crystal-deposit-violet', x: -21.2, z: -59.6, approach: [-19.5, -58.5], color: 0xc48afa },
  { id: 'crystal-deposit-green', x: -12, z: -66.2, approach: [-10.5, -65.2], color: 0x74deab },
];

export const fishPools = [
  { x: 13.9, z: 7.1, rx: 2.65, rz: 4.6 },
  { x: 4.5, z: 33.8, rx: 2.15, rz: 4.4 },
];

export function detailClearing(x, z) {
  return (x > -23 && x < -8 && z > 46.5 && z < 56.8)
    || (x < -38.2 && x > -46 && z > -12 && z < 3.5)
    || (x > 14.7 && x < 22 && z > 5.4 && z < 10.5)
    || (x > 31.5 && x < 37.8 && z > -18.9 && z < -14.3);
}
