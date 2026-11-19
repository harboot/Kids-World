import { buildHouseBalcony, railing } from './terraces.js';
import { insideClearance } from '../../core/interaction-clearance.js';
import { SURFACE_GAP } from '../../core/geometry.js';

export const SHOPS = {
  bakery: { name: 'Bakery', x: 7.4, z: 12.45, width: 5.7, depth: 5.7, yaw: Math.PI, wall: 0xf1b967, roof: 0x9b493e, accent: 0xa43c35 },
  fruit: { name: 'Fruit Shop', x: 14.2, z: 12.5, width: 5.25, depth: 5.5, yaw: Math.PI, wall: 0xb4ca89, roof: 0x4e6c5e, accent: 0x426d47 },
  fish: { name: 'Fish Shop', x: 13.6, z: -3, width: 6.0, depth: 5.5, yaw: Math.PI / 2, wall: 0x92c5c3, roof: 0x466577, accent: 0x276565 },
};

const houses = [
  // Facades face the roads even as lot widths, setbacks, and rooflines change.
  [-7.6, 14.2, 5.8, 6.6, 3.35, 2.9, Math.PI / 2, 0xe4a172, 0x9a4c44, 'cottage'],
  [-7.9, -2.35, 5.0, 6.2, 5.2, 2.8, Math.PI / 2, 0xe7b6a4, 0x814e5d, 'balcony'],
  [-8.0, -15.9, 5.2, 4.9, 4.65, 3.0, 0, 0xa9c5ab, 0x556a63, 'cottage'],
  [-18.5, -1.2, 5.6, 6.0, 4.0, 2.5, Math.PI / 2, 0xe6c480, 0x916048, 'cottage'],
  [-21.35, -16.55, 10.4, 5.65, 5.5, 3.45, 0, 0xd9a88f, 0x526e82, 'hall'],
  [-24.1, -1.2, 4.5, 5.45, 4.8, 2.5, -Math.PI / 2, 0xd5c6a3, 0x536e77, 'balcony'],
  [-24.15, 10.9, 5.8, 5.15, 3.75, 3.15, Math.PI, 0x9cbbb7, 0x6b625e, 'cottage'],
  [-8.8, -27.35, 6.35, 4.2, 4.85, 3.1, 0, 0xe4bc84, 0x88544d, 'balcony'],
  [8.9, -10.65, 5.0, 5.0, 5.0, 2.7, 0, 0xddaa8b, 0x925856, 'balcony'],
  [8.9, -16.25, 5.7, 4.25, 4.15, 2.45, Math.PI, 0xb3c0d3, 0x4b617a, 'cottage'],
  [14.3, -15.5, 4.65, 4.4, 4.2, 2.6, Math.PI, 0xebd5a2, 0x75805d, 'cottage'],
  [13.0, -25.9, 5.3, 4.5, 4.5, 3.1, 0, 0xc4c48c, 0x8c5043, 'cottage'],
  [8.1, 22.55, 5.1, 4.65, 4.0, 2.45, Math.PI, 0xe4c0a5, 0x78687f, 'cottage'],
];

const wood = 0x594138;
const trim = 0xdfb681;
const stone = 0x8e8073;
const pale = 0xf3e0b4;
const glass = 0x476575;
const shadow = { shadow: true };

export function buildBuildings(kit, getGroundHeight) {
  const { group } = kit;
  for (const [i, site] of houses.entries()) {
    const [x, z, width, depth, height, rise, yaw, wall, roof, style] = site;
    const house = group(style === 'hall' ? 'Timber Hall' : 'Village house ' + (i + 1), x, getGroundHeight(x, z), z, yaw);
    frame(kit, house, { width, depth, height, rise, wall, roof });
    residence(kit, house, width, depth, height, style, i);
    if (style === 'hall') {
      door(kit, group('Balcony door frame', -1.07, 2.4, 0, 0, house), 0, depth / 2 + 0.06, 0.90, 1.80, 0x557261);
      kit.sign(house, 'Timber Hall', 0.8, 2.9, depth / 2 + 0.10, 1.55, 0.3);
    }
  }

  for (const [kind, site] of Object.entries(SHOPS)) {
    const shop = group(site.name, site.x, getGroundHeight(site.x, site.z), site.z, site.yaw);
    frame(kit, shop, { ...site, height: 4.1, rise: kind === 'fish' ? 2.35 : 2.7 });
    storefront(kit, shop, kind, site);
  }

  const tower = group('Clock tower', 0, 0, -14);
  tower.scale.set(1.16, 1.42, 1.08);
  const clock = clockTower(kit, tower);
  const lookout = buildClockLookout(kit, clock);
  return { clock, lookout, balcony: buildHouseBalcony(kit) };
}

function frame(kit, house, { width, depth, height, rise, wall, roof }) {
  const { box, part, beam, solid } = kit;
  const half = width / 2;
  const front = depth / 2;
  box(house, stone, 0, 0.085, 0, width + 0.15, 0.58, depth + 0.15, shadow);
  box(house, wall, 0, height / 2 + 0.16, 0, width, height - 0.32, depth, shadow);
  part(house, 'gable', wall, 0, height, 0, width, rise - 0.01, depth, shadow);
  gabledRoof(kit, house, width, depth, height, rise, roof);

  for (const side of [-1, 1]) {
    const face = side * (front + 0.022);
    box(house, wood, 0, 0.38, face, width + 0.15, 0.16, 0.15);
    box(house, wood, 0, 2.38, face, width + 0.16, 0.17, 0.15);
    box(house, wood, 0, height - 0.11, face, width + 0.12, 0.24, 0.16);
    box(house, wood, 0, height + rise * 0.36, face, 0.13, rise * 0.72, 0.13);
    for (const edge of [-1, 1]) {
      const x = edge * (half - 0.095);
      box(house, wood, x, height / 2, face, 0.21, height - 0.34, 0.18);
      beam(house, wood, [x, height - 0.22, face], [x - edge * 0.65, height - 0.97, face], 0.13);
    }

    const x = side * (half + 0.035);
    box(house, wood, x, height - 0.11, 0, 0.17, 0.24, depth + 0.06);
    box(house, wood, x, 2.38, 0, 0.16, 0.17, depth + 0.06);
    box(house, wood, x, height / 2, 0, 0.13, height - 0.56, 0.19);
  }

  const chimney = width * 0.21;
  box(house, 0xa16f57, chimney, height + rise * 0.74, -depth * 0.21, 0.64, 1.65, 0.59, shadow);
  for (let i = 0; i < 4; i++) {
    box(house, 0x8e5946, chimney, height + rise * 0.74 + i * 0.25, -depth * 0.21,
      0.64 + 2 * SURFACE_GAP.detail, 0.036, 0.59 + 2 * SURFACE_GAP.detail);
  }
  box(house, wood, chimney, height + rise * 0.74 + 0.84, -depth * 0.21, 0.81, 0.18, 0.75);
  solid(house, width + 0.17, depth + 0.17, height + rise);
}

export function gabledRoof({ box, beam, part }, house, width, depth, height, rise, roof) {
  const span = width / 2 + 0.27;
  const roofDepth = depth + 0.64;
  const eave = height - 0.17;
  const peak = height + rise + 0.065;
  const roofThickness = 0.22;
  const fall = peak - eave;
  const slope = Math.atan2(fall, span);
  const panelFace = roofThickness / 2;
  for (const side of [-1, 1]) {
    beam(house, roof, [side * span, eave, 0], [0, peak, 0], roofThickness, roofDepth, shadow);
    box(house, wood, side * span, eave, 0, 0.19, 0.22, roofDepth + 0.08);
    for (const face of [-1, 1]) {
      const z = face * (roofDepth / 2 + 0.025);
      beam(house, trim, [side * span, eave, z], [0, peak, z], 0.13, 0.12);
    }
    for (let i = 1; i <= 8; i++) {
      const t = i / 9;
      // Reuse the triangular prism for a flush base and a broad, sloped
      // highlight that stays readable in the low-resolution touch renderer.
      part(house, 'gable', roof, side * (t * span + Math.sin(slope) * panelFace),
        peak - t * fall + Math.cos(slope) * panelFace, 0, 0.20, SURFACE_GAP.roof, roofDepth,
        { rotation: [0, 0, -side * slope] });
    }
  }
  box(house, wood, 0, peak + 0.065, 0, 0.22, 0.18, roofDepth + 0.12);
  for (const face of [-1, 1]) {
    beam(house, wood, [0, peak - 0.12, face * roofDepth / 2], [0, peak + 0.4, face * roofDepth / 2], 0.11);
  }
}

function window({ box }, node, x, y, z, width, height, shutters = true) {
  box(node, wood, x, y, z, width + 0.15, height + 0.15, 0.08);
  box(node, glass, x, y, z + 0.048, width, height, 0.05);
  box(node, 0x7c9a9c, x, y + height * 0.23, z + 0.073 + SURFACE_GAP.detail / 2,
    width * 0.84, height * 0.44, SURFACE_GAP.detail);
  for (const offset of [-0.5, 0, 0.5]) {
    box(node, pale, x + offset * width, y, z + 0.09, 0.05, height + 0.06, 0.055);
  }
  box(node, pale, x, y + height * 0.09, z + 0.1175 + SURFACE_GAP.detail - 0.03, width + 0.03, 0.055, 0.06);
  box(node, trim, x, y - height / 2 - 0.05, z + 0.13, width + 0.23, 0.12, 0.29);
  if (!shutters) return;
  for (const side of [-1, 1]) {
    const sx = x + side * (width / 2 + 0.19);
    box(node, wood, sx, y, z + 0.016, 0.32, height * 0.98, 0.08);
    for (const h of [-0.23, 0.22]) box(node, trim, sx, y + height * h, z + 0.066, 0.32, 0.064, 0.045);
  }
}

function door({ box, part }, node, x, z, width = 0.93, height = 1.97, color = 0x986749) {
  box(node, wood, x, height / 2 + 0.11, z, width + 0.15, height + 0.17, 0.16);
  const panelZ = z + 0.1;
  const panelDepth = 0.08;
  const relief = SURFACE_GAP.detail;
  box(node, color, x, height / 2 + 0.1, panelZ, width, height, panelDepth);
  for (let i = 1; i <= 3; i++) {
    box(node, wood, x + width * (i / 4 - 0.5), height / 2 + 0.1, panelZ + (panelDepth + relief) / 2,
      0.023, height - 2 * relief, relief);
  }
  box(node, trim, x, 1.9, z + 0.143, width * 0.9, 0.085, 0.045);
  box(node, stone, x, 0.055, z + 0.19, width + 0.28, 0.11, 0.42);
  part(node, 'gem', 0xd8a454, x + width * 0.31, 1.03, z + 0.18, 0.061, 0.061, 0.061);
}

function residence(kit, house, width, depth, height, style, index) {
  const { box, group, beam, part } = kit;
  const z = depth / 2 + 0.06;
  const x = width * 0.26;
  const balcony = style === 'balcony';
  door(kit, house, balcony ? 0 : -x, z, 0.89, 1.96, balcony ? 0x745047 : 0x60705a);
  window(kit, house, x, 1.56, z, 0.85, 1.02);
  if (balcony) window(kit, house, -x, 1.56, z, 0.85, 1.02);
  window(kit, house, 0, height + 0.75, z, 0.65, 0.69, false);
  for (const side of [-1, 1]) {
    window(kit, house, side * x, 3.15, z, 0.74, 0.75);
    beam(house, wood, [side * (width / 2 - 0.18), 0.5, z], [side * (width / 2 - 0.76), 1.15, z], 0.118);
    const face = group('', side * (width / 2 + 0.045), 0, 0, side * Math.PI / 2, house);
    window(kit, face, -depth * 0.23, 1.53, 0, 0.79, 0.9);
    window(kit, face, depth * 0.23, 3.0, 0, 0.75, 0.72);
    if (height > 4.8) window(kit, face, -depth * 0.24, 4.32, 0, 0.63, 0.62, false);
  }

  if (balcony) {
    const deck = 2.45;
    box(house, wood, 0, deck, z + 0.39, 2.45, 0.18, 0.91);
    box(house, trim, 0, deck + 0.78, z + 0.82, 2.55, 0.14, 0.16);
    for (let i = -4; i <= 4; i++) {
      box(house, wood, i * 0.29, deck + 0.39, z + 0.81, 0.09, 0.75, 0.09);
    }
    for (const side of [-1, 1]) {
      box(house, wood, side * 1.2, deck + 0.75, z + 0.41, 0.14, 0.12, 0.85);
      beam(house, wood, [side * 0.93, deck - 0.56, z], [side * 0.93, deck, z + 0.69], 0.11);
    }
    window(kit, house, 0, 3.31, z, 0.58, 1.25, false);
  } else if (index % 2 === 0) {
    box(house, wood, x, 0.93, z + 0.17, 1.05, 0.26, 0.35);
    for (let i = -2; i <= 2; i++) {
      part(house, 'gem', i % 2 ? 0xd65b4b : 0xf2c365, x + 0.19 * i, 1.14, z + 0.21, 0.13, 0.14, 0.13);
    }
  }
}

function storefront(kit, shop, kind, { width, depth, name, accent }) {
  const { box, part, solid, sign } = kit;
  const front = depth / 2 + 0.07;
  door(kit, shop, 0, front, 0.96, 2.05, accent);
  for (const side of [-1, 1]) {
    window(kit, shop, side * width * 0.274, 1.54, front, 1.37, 1.18, false);
    window(kit, shop, side * width * 0.235, 3.28, front, 0.77, 0.86);
  }
  sign(shop, name, 0, 3.97, front + 0.12, 2.42, 0.45, { background: kind === 'bakery' ? '#742f29' : '#275449' });
  if (kind === 'fish') fish(kit, shop, 0, 4.9, front + 0.15, 1.85, 0xe1d098);
  else {
    const tilt = 0.22;
    const stripes = 12;
    const stripe = (width * 0.91 + 0.006) / stripes;
    for (let i = 0; i < stripes; i++) {
      const x = stripe * (i + 0.5 - stripes / 2);
      box(shop, i % 2 ? pale : accent, x, 2.51, front + 0.54, stripe, 0.095, 1.08,
        { rotation: [tilt, 0, 0] });
      box(shop, i % 2 ? pale : accent, x, 2.34, front + 1.06, stripe, 0.21, 0.09);
    }
  }

  for (const side of [-1, 1]) {
    const x = side * width * 0.32;
    const z = front + 0.67;
    box(shop, wood, x, 0.4, z, 1.42, 0.76, 0.73);
    box(shop, trim, x, 0.82, z, 1.56, 0.14, 0.83);
    solid(shop, 1.56, 0.83, 0.9, x, z);
    if (kind === 'bakery') {
      part(shop, 'bowl', 0xaf7948, x, 0.93, z, 0.41, 0.19, 0.32);
      for (let i = -2; i <= 2; i++) {
        const lx = x + i * 0.135;
        part(shop, 'rock', 0xd99a49, lx, 1.13, z, 0.105, 0.27, 0.14, { rotation: [0.34, 0, -0.22 + i * 0.14] });
        box(shop, 0xf2cb85, lx, 1.13, z + 0.12, 0.06, 0.03, 0.02, { rotation: [0, 0, -0.4] });
      }
    } else if (kind === 'fruit') {
      for (let i = 0; i < 3; i++) {
        const bin = x + (i - 1) * 0.46;
        box(shop, 0xb2845d, bin, 0.98, z + 0.28, 0.44, 0.22, 0.08);
        box(shop, wood, bin - 0.24, 0.98, z, 0.06, 0.22, 0.58);
        for (let row = 0; row < 3; row++) {
          for (const dx of [-0.1, 0.1]) {
            const fruitZ = z + (row - 1) * 0.17;
            const color = [0xcf4840, 0xb3bd5d, 0xe99837][i];
            part(shop, 'rock', color, bin + dx, 1.01, fruitZ, 0.108, i === 1 ? 0.13 : 0.093, 0.095);
            if (i === 1) box(shop, wood, bin + dx, 1.11, fruitZ, 0.026, 0.065, 0.024);
          }
        }
      }
    } else {
      for (let i = -1; i <= 1; i++) fish(kit, shop, x + i * 0.36, 0.955, z + 0.15, 0.43, i === 0 ? 0x7d9b9d : 0xaac9bd, -Math.PI / 2);
      part(shop, 'barrel', 0x886341, x + side * 0.96, 0.4, z + 0.18, 0.32, 0.8, 0.33);
    }
  }
}

function fish({ group, part }, node, x, y, z, size, color, pitch = 0) {
  const model = group('Decorative fish', x, y, z, 0, node);
  model.rotation.x = pitch;
  part(model, 'rock', color, 0.07 * size, 0, 0, size * 0.34, size * 0.15, size * 0.058);
  part(model, 'gable', color, -size * 0.43, 0, 0, size * 0.32, size * 0.29, size * 0.055,
    { rotation: [0, 0, -Math.PI / 2] });
  part(model, 'gem', 0x244241, size * 0.24, size * 0.03, size * 0.041, size * 0.038, size * 0.038, size * 0.025);
}

function clockTower(kit, tower) {
  const { group, box, part, beam, solid, sign } = kit;
  const width = 4.8;
  const depth = 4.6;
  const base = 0xc6b293;
  const accent = 0x9d846e;
  box(tower, base, 0, 3.55, 0, width, 7.1, depth, shadow);
  box(tower, stone, 0, 0.25, 0, width + 0.3, 0.5, depth + 0.31, shadow);
  box(tower, 0xe4cf9c, 0, 6.52, 0, 5.03, 0.38, 4.83);
  box(tower, 0x4c584f, 0, 7.37, 0, 5.15, 0.42, 4.96, shadow);
  box(tower, 0xd4a776, 0, 8.39, 0, 3.86, 1.87, 3.72, shadow);
  box(tower, wood, 0, 9.27, 0, 4.15, 0.3, 3.99);
  part(tower, 'cone', 0x48685f, 0, 11.16, 0, 3.09, 3.74, 3.02, shadow);
  part(tower, 'barrel', 0xd49c4e, 0, 13.12, 0, 0.15, 0.75, 0.15);
  part(tower, 'gem', 0xe7bb68, 0, 13.55, 0, 0.25, 0.29, 0.25);
  beam(tower, wood, [0, 13.24, 0], [0, 14.33, 0], 0.058);
  part(tower, 'banner', 0xa53a39, 0.43, 14.03, 0, 0.85, 0.47, 1);

  const hands = [];
  for (let side = 0; side < 4; side++) {
    const face = group('', 0, 0, 0, side * Math.PI / 2, tower);
    const z = (side % 2 ? width : depth) / 2;
    const x = (side % 2 ? depth : width) / 2;
    for (const edge of [-1, 1]) {
      for (let row = 0; row < 12; row++) {
        const step = row % 2 ? 0.22 : 0.34;
        box(face, row % 3 ? accent : 0xe4cba6, edge * (x - step), 0.62 + row * 0.49, z + 0.013,
          step * 2, 0.44, 0.16);
      }
    }
    const y = 5.15;
    const backingDepth = 0.19;
    const backingZ = z + 0.064;
    const dialZ = backingZ + backingDepth / 2 + SURFACE_GAP.detail;
    const markerDepth = 0.027;
    const markerZ = dialZ + SURFACE_GAP.detail - markerDepth / 2;
    const hourZ = markerZ + markerDepth / 2 + SURFACE_GAP.detail;
    const minuteZ = hourZ + 0.043 + SURFACE_GAP.detail;
    part(face, 'drum', wood, 0, y, backingZ, 1.21, backingDepth, 1.21, { rotation: [Math.PI / 2, 0, 0] });
    part(face, 'disk', pale, 0, y, dialZ, 1.06, 1.06, 1);
    part(face, 'ring', 0xc19752, 0, y, dialZ + 0.005, 1.02, 1.02, 0.30);
    for (let hour = 0; hour < 12; hour++) {
      const angle = hour * Math.PI / 6;
      const major = hour % 3 === 0;
      box(face, wood, -Math.sin(angle) * 0.84, y + Math.cos(angle) * 0.84, markerZ,
        major ? 0.103 : 0.061, major ? 0.225 : 0.107, markerDepth, { rotation: [0, 0, angle] });
    }
    const hourHand = group('Clock hour hand', 0, y, hourZ, 0, face);
    const minuteHand = group('Clock minute hand', 0, y, minuteZ, 0, face);
    beam(hourHand, 0x263f3d, [0, 0, 0], [-0.51, 0.42, 0], 0.11, 0.043, { batch: hourHand });
    beam(minuteHand, 0x263f3d, [0, 0, 0], [0.43, 0.69, 0], 0.079, 0.043, { batch: minuteHand });
    hands.push({ hourHand, minuteHand });
    part(face, 'gem', 0xb58747, 0, y, minuteZ + 0.04, 0.13, 0.13, 0.055);
    window(kit, face, -0.72, 8.39, z * 0.81, 0.49, 0.84, false);
    window(kit, face, 0.72, 8.39, z * 0.81, 0.49, 0.84, false);
  }
  const doorX = -0.96;
  door(kit, tower, doorX, depth / 2 + 0.05, 1.33, 2.33, 0x51736a);
  sign(tower, 'Clock Tower', doorX, 2.72, depth / 2 + 0.14, 1.91, 0.34);
  solid(tower, (width + 0.3) * tower.scale.x, (depth + 0.31) * tower.scale.z, 13.5 * tower.scale.y);
  const facade = tower.position.z + depth / 2 * tower.scale.z;
  return {
    hands, facade,
    repairSite: { x: 1.68, z: facade + 0.49 },
    lowerDoor: { x: doorX * tower.scale.x, z: facade + 0.28 },
  };
}

function buildClockLookout(kit, clock) {
  const { group, box, beam, sign } = kit;
  const elevation = 10.62;
  const deck = group('Clock Tower lookout', 0, elevation, 0);
  const front = -7.8;
  const back = clock.facade - 0.05;
  const width = 8.4;
  const half = width / 2;
  const footprint = { x: 0, z: (front + back) / 2, width, depth: front - back };
  const slab = 0xa58c70;
  const capHeight = 0.11;
  const baseHeight = 0.42 - capHeight;
  const rim = SURFACE_GAP.trim;
  const innerWidth = width - 2 * rim;
  box(deck, slab, 0, -capHeight - baseHeight / 2, footprint.z, width, baseHeight, footprint.depth, shadow);
  // Fit the inset and its rim across the walkable surface at the same height.
  box(deck, 0xc9b691, 0, -capHeight / 2, footprint.z, innerWidth, capHeight, footprint.depth - 2 * rim, shadow);
  const spans = [[[-half, 0, front], [half, 0, front], 15]];
  for (const side of [-1, 1]) {
    const x = half * side;
    box(deck, slab, side * (half - rim / 2), -capHeight / 2, footprint.z, rim, capHeight, footprint.depth, shadow);
    box(deck, slab, 0, -capHeight / 2, footprint.z + side * (footprint.depth - rim) / 2, innerWidth, capHeight, rim, shadow);
    spans.push([[x, 0, back], [x, 0, front], 6], [[x, 0, back], [side * 2.85, 0, back], 3]);
    beam(deck, wood, [x * 0.83, -0.39, front - 0.54], [x * 0.59, -2.23, back], 0.29, 0.29, shadow);
  }
  railing(kit, deck, spans, 0xe5c798, wood);

  const upstairs = group('Clock Tower upper entrance', 0, elevation, clock.facade - 0.31);
  box(upstairs, stone, 0, 1.14, 0, 1.97, 2.29, 0.65, shadow);
  door(kit, upstairs, 0, 0.38, 1.20, 1.97, 0x51736a);
  box(upstairs, 0xd5b885, 0, 2.25, 0.07, 2.09, 0.21, 0.91);
  sign(upstairs, 'Down to Village', 0, 2.22, 0.54, 1.66, 0.31);

  return {
    upperDoor: { x: 0, z: clock.facade + 0.34 },
    elevation,
    surface(x, z, feet = 0) {
      if (feet >= elevation - 0.28 && insideClearance(footprint, x, z)) return elevation;
    },
    blocks(x, z, radius, feet, from) {
      if (feet < elevation - 0.28 || !insideClearance(footprint, from.x, from.z)) return false;
      return !insideClearance(footprint, x, z) || Math.abs(x) > half - radius || z > front - radius || z < back + radius;
    },
  };
}
