// Each villager has a single moving rig with shared scenery geometry.
export function buildVillager(kit, site, ground, { name, yaw = 0, coat, apron, hair }) {
  const { group, box, part } = kit;
  const person = group(name, site.x, ground(site.x, site.z), site.z, yaw);
  const batch = { batch: person };
  const skin = 0xd49771;
  for (const side of [-1, 1]) {
    box(person, 0x51423a, side * 0.13, 0.095, 0.075, 0.18, 0.19, 0.31, batch);
    box(person, 0x4e4f52, side * 0.13, 0.40, 0, 0.175, 0.5, 0.21, batch);
    box(person, coat, side * 0.30, 0.91, 0.02, 0.14, 0.49, 0.18,
      { ...batch, rotation: [-0.18, 0, side * 0.13] });
    part(person, 'rock', skin, side * 0.34, 0.68, 0.075, 0.081, 0.09, 0.08, batch);
  }
  box(person, coat, 0, 0.88, 0, 0.48, 0.58, 0.31, batch);
  box(person, apron, 0, 0.79, 0.165, 0.34, 0.47, 0.04, batch);
  box(person, 0xdcc7a0, 0, 0.9, 0.193, 0.35, 0.055, 0.027, batch);
  part(person, 'rock', skin, 0, 1.33, 0.04, 0.225, 0.245, 0.214, batch);
  part(person, 'rock', hair, 0, 1.50, -0.002, 0.249, 0.146, 0.216, batch);
  for (const side of [-1, 1]) {
    part(person, 'gem', 0x473737, side * 0.075, 1.36, 0.228, 0.025, 0.034, 0.02, batch);
  }
  part(person, 'gem', 0x995c50, 0, 1.263, 0.231, 0.047, 0.018, 0.012, batch);

  return (elapsed, still) => {
    person.rotation.z = still ? 0 : Math.sin(elapsed * 1.8) * 0.019;
    person.rotation.y = yaw + (still ? 0 : Math.sin(elapsed * 0.85) * 0.13);
  };
}

export function buildBystanders(kit, ground) {
  const poses = [
    [-5.0, 9.5, 0.62, 0x936252, 0xd0b67f, 0x62423a],
    [5.25, -3.12, -0.78, 0x547987, 0xe0b383, 0x80503d],
    [10.92, 8.98, Math.PI * 0.8, 0xab8251, 0x857451, 0x4d3c37],
    [21.15, 12.16, 0.90, 0x688358, 0xd9ae7f, 0x8b5d40],
    [-28.32, -7.82, 1.18, 0x865570, 0xd9ac7e, 0x533835],
  ].map(([x, z, yaw, coat, apron, hair], i) =>
    buildVillager(kit, { x, z }, ground, { name: 'Village resident ' + (i + 1), yaw, coat, apron, hair }));
  return (elapsed, still) => poses.forEach((pose, i) => pose(elapsed + i * 0.81, still));
}
