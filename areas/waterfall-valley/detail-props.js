export function crate(kit, x, y, z, size = 0.65, yaw = 0, color = 0x98714a) {
  kit.box(color, x, y + size * 0.48, z, size, size * 0.96, size, yaw);
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  for (const shift of [-0.33, 0.33]) {
    kit.box(0x704e37, x + cos * size * shift, y + size * 0.49, z - sin * size * shift,
      size * 0.11, size * 0.93, size * 1.033, yaw);
  }
  kit.box(0xb2875a, x, y + size * 0.97, z, size * 0.96, size * 0.06, size * 0.96, yaw);
}

export function barrel(kit, x, y, z, size = 0.59, color = 0x815d42) {
  kit.part('cylinder', color, x, y + size * 0.56, z, size, size * 1.12, size);
  for (const offset of [0.24, 0.9]) kit.part('cylinder', 0x4f5557,
    x, y + size * offset, z, size * 1.04, size * 0.084, size * 1.04);
  kit.part('cylinder', 0xa27752, x, y + size * 1.126, z, size * 0.86, size * 0.025, size * 0.86);
}

export function bench(kit, x, y, z, size = 1.55, back = true, wood = 0x98724f) {
  for (const dx of [-0.37, 0.37]) {
    kit.box(0x5b4335, x + size * dx, y + 0.21, z, 0.12, 0.42, 0.47);
    if (back) kit.box(0x5b4335, x + size * dx, y + 0.48, z - 0.23, 0.09, 0.96, 0.09);
  }
  kit.box(wood, x, y + 0.435, z, size, 0.075, 0.47);
  if (back) kit.box(wood, x, y + 0.79, z - 0.208, size, 0.22, 0.07);
}

export function table(kit, x, y, z, width = 1.45, depth = 0.71, height = 0.74) {
  kit.box(0x966944, x, y + height, z, width, 0.078, depth);
  for (const dx of [-0.42, 0.42]) for (const dz of [-0.39, 0.39]) {
    kit.box(0x65503c, x + dx * width, y + height / 2, z + dz * depth, 0.087, height, 0.087);
  }
}

export function lantern(kit, x, y, z, glow = 0xffd486) {
  kit.part('cylinder', 0x4a504a, x, y + 0.039, z, 0.205, 0.078, 0.205);
  kit.part('cylinder', glow, x, y + 0.155, z, 0.152, 0.18, 0.152);
  kit.part('taper', 0x55574a, x, y + 0.269, z, 0.225, 0.083, 0.225);
  for (const dx of [-0.073, 0.073]) kit.box(0x4a504a, x + dx, y + 0.158, z + 0.052, 0.026, 0.18, 0.025);
  kit.part('ring', 0x55574a, x, y + 0.335, z, 0.13, 0.13, 0.13);
}

export function toolsOnRack(kit, x, y, z) {
  kit.box(0x72513b, x, y + 0.96, z - 0.075, 1.4, 0.123, 0.12);
  kit.beam(0xa77a4f, [x - 0.39, y + 0.17, z], [x - 0.29, y + 1.22, z], 0.062, 0.062, 'cylinder');
  kit.beam(0x757d79, [x - 0.57, y + 1.16, z], [x - 0.02, y + 1.19, z], 0.059);
  kit.beam(0xa77a4f, [x + 0.32, y + 0.17, z], [x + 0.49, y + 1.22, z], 0.063, 0.063, 'cylinder');
  kit.part('stone', 0x657370, x + 0.31, y + 0.15, z + 0.007, 0.26, 0.36, 0.085);
  kit.part('taper', 0xbe8b45, x - 0.02, y + 0.95, z + 0.18, 0.34, 0.18, 0.33);
  kit.part('cylinder', 0xd49c57, x - 0.02, y + 0.88, z + 0.18, 0.42, 0.05, 0.36);
}

export function cart(kit, x, y, z, color = 0x82634d) {
  for (const side of [-1, 1]) {
    for (const dz of [-0.49, 0.49]) kit.part('cylinder', 0x4a5050, x + side * 0.54,
      y + 0.25, z + dz, 0.46, 0.14, 0.46, 0, 0, Math.PI / 2);
    kit.box(color, x + side * 0.46, y + 0.53, z, 0.13, 0.49, 1.24, 0, 0, -side * 0.17);
    kit.box(0x595d58, x, y + 0.52, z + side * 0.57, 1.03, 0.49, 0.13, 0, side * 0.15);
  }
  kit.box(0x6b5647, x, y + 0.34, z, 0.94, 0.14, 1.09);
}
