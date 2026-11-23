import { EYE_HEIGHT } from '../../core/player.js';

export const MONKEY_TREE = [-16.3, -9.3, 1.42];

export function addMonkey(THREE, { scene, mesh, facet, matte, batchParts, reducedMotion, playCue, finishMission }) {
  const [x, z] = MONKEY_TREE;
  const perch = new THREE.Group();
  perch.name = 'Monkey lookout';
  perch.position.set(x + 1.16, 3.52, z + 1.67);
  scene.add(perch);

  const branchStart = new THREE.Vector3(x + .42, 3.36, z + .69);
  const branchDirection = perch.position.clone().sub(branchStart);
  const branchMid = branchStart.clone().addScaledVector(branchDirection, .5);
  mesh(new THREE.CylinderGeometry(.072, .16, 1, 6), matte(0x935d3b),
    branchMid.x, branchMid.y, branchMid.z, 1, branchDirection.length(), 1, scene, true)
    .quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), branchDirection.normalize());

  const coat = matte(0x885034);
  const face = matte(0xe9b782);
  const innerEar = matte(0xd68d77);
  const eyes = matte(0x382823);
  const tailPath = new THREE.CatmullRomCurve3([
    [0, 0, 0], [.23, -.2, .14], [.36, -.48, .19],
    [.47, -.68, .24], [.65, -.71, .29], [.74, -.57, .29],
  ].map(point => new THREE.Vector3(...point)));
  const tail = mesh(new THREE.TubeGeometry(tailPath, 13, .057, 6, false), coat,
    0, 0, 0, 1, 1, 1, perch, true);
  tail.name = 'Swaying monkey tail';

  const monkey = new THREE.Group();
  monkey.name = 'Upside-down monkey';
  perch.add(monkey);
  const part = (material, x, y, z, sx, sy, sz) => mesh(facet, material, x, y, z, sx, sy, sz, monkey, true);
  part(coat, 0, .47, 0, .29, .33, .24);
  part(face, 0, .47, .172, .18, .23, .10);
  part(coat, 0, .88, .01, .33, .30, .25);
  part(face, 0, .88, .201, .267, .226, .095);
  part(face, 0, .796, .261, .145, .095, .061);
  part(eyes, 0, .808, .317, .044, .028, .022);
  for (const side of [-1, 1]) {
    part(coat, side * .304, .896, 0, .115, .143, .087);
    part(innerEar, side * .324, .896, .065, .067, .089, .028);
    part(eyes, side * .092, .925, .284, .038, .048, .026);
    part(coat, side * .315, .53, .03, .084, .245, .085).rotation.z = side * .31;
    part(face, side * .384, .348, .03, .074, .083, .067);
    part(coat, side * .13, .205, -.011, .074, .155, .081).rotation.z = -side * .22;
    part(face, side * .165, .071, .036, .088, .061, .098);
  }
  batchParts(monkey);
  let time = 0;
  let near = false;
  let reveal = 0;

  function pose(still) {
    tail.rotation.z = still ? 0 : Math.sin(time * 3.1) * .25;
    tail.rotation.x = still ? 0 : Math.cos(time * 2.4) * .13;
    monkey.visible = reveal > .02;
    monkey.position.y = .85 - reveal * .95;
    monkey.rotation.z = Math.PI + (still ? 0 : Math.sin(time * 3.1) * .105);
  }

  pose(true);
  return {
    update(dt, player) {
      time += dt;
      const distance = player ? Math.hypot(player.x - x, player.z - z) : Infinity;
      const approaching = distance < (near ? 3.35 : 2.65) && Math.abs(player.y - EYE_HEIGHT) < 1.5;
      if (approaching && !near) {
        playCue?.([
          [76, { endPitch: 83, duration: .085, level: .17, wave: 'triangle' }],
          [79, { endPitch: 88, duration: .12, level: .14, wave: 'triangle' }, .10],
          [84, { endPitch: 75, duration: .16, level: .12 }, .21],
        ]);
        finishMission('monkey');
      }
      near = approaching;
      const still = reducedMotion?.();
      const target = Number(near);
      reveal = still ? target : THREE.MathUtils.clamp(reveal + Math.sign(target - reveal) * dt * 2.8,
        Math.min(reveal, target), Math.max(reveal, target));
      pose(still);
    },
    reset() {
      time = reveal = 0;
      near = false;
      pose(true);
    },
  };
}
