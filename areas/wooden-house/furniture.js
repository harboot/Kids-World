import { colors, rug } from './interior.js';

const { cream, linen, honey, walnut, oak, gold, rose, brick, mint, sage, teal, blue, plum, ink, leaf } = colors;
// Keep indoor jumps in the aisles so the camera stays below the ceiling.
const FURNITURE_HEIGHT = 1.43;
const smooth = t => t * t * (3 - 2 * t);
const clamp = t => Math.max(0, Math.min(1, t));

function move(object, from, to, progress, arc = 0) {
  const t = smooth(progress);
  object.position.set(
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t + arc * 4 * t * (1 - t),
    from[2] + (to[2] - from[2]) * t,
  );
  object.rotation.y = (from[3] ?? 0) * (1 - t) + (to[3] ?? 0) * t;
}

export function buildFurniture(THREE, scene, builder) {
  const { group, part, solid } = builder;

  function legs(parent, x, z, height, tint = walnut) {
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) part(parent, tint, side * x, height / 2, end * z, 0.13, height, 0.13);
    }
  }

  function plant(parent, x, y, z, size) {
    const pot = group('Potted plant', x, y, z, parent);
    pot.scale.setScalar(size);
    part(pot, brick, 0, 0.14, 0, 0.29, 0.27, 0.29, 'taper');
    part(pot, walnut, 0, 0.272, 0, 0.253, 0.027, 0.253, 'round');
    for (const [px, py, pz, angle, color] of [
      [0, 0.48, 0, 0, leaf], [0.084, 0.43, 0.032, -0.54, sage], [-0.095, 0.4, 0.057, 0.65, 0x86a867],
      [0.033, 0.41, -0.089, -0.26, leaf],
    ]) {
      part(pot, color, px, py, pz, 0.138, 0.33, 0.111, 'facet').rotation.z = angle;
    }
  }

  function books(parent, x, y, z, tints) {
    tints.forEach((tint, i) => {
      const height = 0.28 + (i % 3) * 0.061;
      const book = group('Book', x + i * 0.112, y + height / 2, z, parent);
      if (i === tints.length - 1) book.rotation.z = -0.16;
      part(book, tint, 0, 0, 0, 0.099, height, 0.25);
      part(book, linen, 0, height * 0.21, 0.126, 0.072, 0.024, 0.009);
    });
  }

  function bedroom() {
    const x = -4.55;
    const z = -3.45;
    const bed = group('Bed frame', x, 0, z);
    rug(builder, -4.22, -2.91, 3.03, 3.38, brick, 0xe2a693);
    legs(bed, 0.82, 1.16, 0.31);
    part(bed, honey, 0, 0.37, 0, 1.86, 0.25, 2.6);
    part(bed, cream, 0, 0.565, 0, 1.74, 0.24, 2.48);
    part(bed, oak, 0, 0.77, -1.26, 1.91, 1.35, 0.13);
    part(bed, honey, 0, 1.445, -1.26, 2.01, 0.105, 0.18);
    part(bed, honey, 0, 0.34, 1.26, 1.91, 0.49, 0.14);
    solid(x, z, 1.92, 2.67, FURNITURE_HEIGHT);

    const nightstand = group('Bedside table', -2.96, 0, -4.54);
    legs(nightstand, 0.28, 0.26, 0.28);
    part(nightstand, oak, 0, 0.46, 0, 0.73, 0.43, 0.68);
    part(nightstand, honey, 0, 0.47, 0.347, 0.64, 0.26, 0.026);
    part(nightstand, gold, 0, 0.48, 0.375, 0.08, 0.08, 0.06, 'ball');
    part(nightstand, walnut, -0.08, 0.706, -0.047, 0.24, 0.06, 0.24, 'round');
    part(nightstand, gold, -0.08, 0.901, -0.047, 0.053, 0.37, 0.053, 'round');
    part(nightstand, rose, -0.08, 1.092, -0.047, 0.415, 0.29, 0.415, 'taper').rotation.z = Math.PI;
    part(nightstand, linen, 0.204, 0.711, 0.1, 0.169, 0.065, 0.24);
    solid(-2.96, -4.54, 0.73, 0.68, FURNITURE_HEIGHT);

    const textiles = group('Bedding', x, 0, z, scene);
    const pillows = [0, 1].map(i => {
      const pillow = group(`Pillow ${i + 1}`, 0, 0, 0, textiles);
      part(pillow, i ? linen : 0xffdfaf, 0, 0, 0, 0.76, 0.22, 0.5, 'ball');
      part(pillow, i ? 0xe4c5a4 : 0xdcaa7b, 0.29, 0.02, 0, 0.037, 0.12, 0.37, 'ball');
      return pillow;
    });
    const blanket = group('Quilt', 0, 0, 0, textiles);
    part(blanket, teal, 0, 0, 0, 1.68, 0.105, 1.69);
    part(blanket, mint, 0, 0.027, -0.734, 1.67, 0.098, 0.224);
    for (const side of [-1, 1]) {
      part(blanket, teal, side * 0.817, -0.116, 0.03, 0.067, 0.17, 1.61);
      part(blanket, gold, side * 0.74, 0.058, 0.06, 0.033, 0.019, 1.48);
    }
    for (const pz of [-0.4, 0.05, 0.49]) {
      for (const px of [-0.47, 0, 0.47]) {
        part(blanket, pz === 0.05 ? gold : mint, px, 0.059, pz, 0.123, 0.014, 0.123).rotation.y = Math.PI / 4;
      }
    }
    const folds = group('Bunched quilt', 0, 0.074, 0.21, blanket);
    part(folds, sage, 0.06, 0.045, 0.27, 1.49, 0.2, 0.4, 'ball').rotation.y = -0.17;
    part(folds, teal, -0.03, 0.01, -0.03, 1.57, 0.22, 0.48, 'ball').rotation.y = 0.21;
    const messyPillows = [[-0.42, 0.77, -0.56, 0.48], [0.26, 0.77, -0.2, -0.79]];
    const tidyPillows = [[-0.43, 0.77, -0.92], [0.43, 0.77, -0.92]];
    const messyQuilt = [-0.33, 0.775, 0.48, -0.265];
    const tidyQuilt = [0, 0.745, 0.347];
    return {
      id: 'bed', label: 'Make bed', x, z, anchorY: 0.85, duration: 0.75,
      viewingZone: { x: -2.24, z: -3.28, width: 1.12, depth: 1.28 },
      clearance: { x: -4.35, z: -3.45, width: 2.7, depth: 2.83 },
      render(t) {
        pillows.forEach((pillow, i) => move(pillow, messyPillows[i], tidyPillows[i], t, 0.13));
        move(blanket, messyQuilt, tidyQuilt, t, 0.1);
        blanket.scale.set(0.73 + 0.27 * smooth(t), 1, 0.65 + 0.35 * smooth(t));
        folds.visible = t < 1;
        folds.scale.y = 1 - smooth(t);
      },
    };
  }

  function kitchen() {
    const x = 2.2;
    const z = -4.62;
    const kitchen = group('Kitchen', x, 0, z);
    for (const cx of [-1.02, 0, 1.06]) {
      const cabinetHeight = cx === 0 ? 0.79 : 0.94;
      part(kitchen, sage, cx, cabinetHeight / 2, 0, 1.04, cabinetHeight, 0.935);
      part(kitchen, mint, cx, 0.456, 0.493, 0.918, 0.68, 0.054);
      part(kitchen, walnut, cx, 0.707, 0.535, 0.23, 0.038, 0.055);
    }
    for (const cx of [-1.032, 1.052]) part(kitchen, linen, cx, 0.965, 0, 1.057, 0.09, 1.02);
    for (const edge of [-1, 1]) part(kitchen, linen, 0.007, 0.965, edge * 0.432, 1.02, 0.09, 0.156);
    part(kitchen, 0x8ea5a4, 0, 0.84, 0.006, 1.038, 0.149, 0.74);
    part(kitchen, 0x617c80, 0, 0.919, 0.006, 0.87, 0.014, 0.61);
    for (const side of [-1, 1]) part(kitchen, 0xb5cece, side * 0.488, 1.011, 0, 0.065, 0.033, 0.75);
    for (const end of [-1, 1]) part(kitchen, 0xb5cece, 0, 1.011, end * 0.373, 0.99, 0.033, 0.063);
    part(kitchen, 0xb6cecb, 0, 1.188, -0.36, 0.072, 0.36, 0.072, 'round');
    part(kitchen, 0xa2babc, 0, 1.344, -0.203, 0.075, 0.079, 0.355);
    part(kitchen, 0xb6cecb, 0, 1.304, -0.047, 0.082, 0.11, 0.086, 'round');
    part(kitchen, 0xb5cece, 0.2, 1.062, -0.36, 0.19, 0.041, 0.055);
    solid(x, z, 3.09, 1.02, FURNITURE_HEIGHT);

    part(kitchen, ink, 2.18, 0.49, 0, 1.12, 0.965, 0.965);
    part(kitchen, 0x544a50, 2.18, 0.47, 0.494, 0.92, 0.57, 0.052);
    part(kitchen, 0x6f8188, 2.18, 0.46, 0.527, 0.71, 0.35, 0.03);
    part(kitchen, walnut, 2.18, 0.728, 0.552, 0.69, 0.055, 0.078);
    for (const offset of [-0.31, -0.105, 0.105, 0.31]) {
      part(kitchen, gold, 2.18 + offset, 0.865, 0.51, 0.092, 0.052, 0.092, 'round').rotation.x = Math.PI / 2;
    }
    part(kitchen, 0x6f6b71, 2.18, 0.982, 0, 1.12, 0.044, 0.985);
    for (const dx of [-0.25, 0.25]) {
      for (const dz of [-0.24, 0.24]) {
        part(kitchen, ink, 2.18 + dx, 1.014, dz, 0.38, 0.036, 0.38, 'round');
        part(kitchen, walnut, 2.18 + dx, 1.033, dz, 0.2, 0.009, 0.2, 'round');
      }
    }
    solid(x + 2.18, z, 1.12, 0.985, FURNITURE_HEIGHT);

    const fridge = group('Fridge', 5.58, 0, -4.61);
    part(fridge, plum, 0, 1.03, 0, 1.04, 2.06, 1.09);
    part(fridge, 0xd8a6a2, 0, 0.67, 0.566, 1, 1.21, 0.09);
    part(fridge, 0xe0b1ae, 0, 1.668, 0.566, 1, 0.746, 0.09);
    for (const y of [1.04, 1.54]) part(fridge, linen, -0.349, y, 0.63, 0.065, 0.256, 0.08);
    part(fridge, cream, 0.185, 1.688, 0.617, 0.23, 0.26, 0.025).rotation.z = -0.17;
    part(fridge, teal, 0.16, 1.797, 0.64, 0.083, 0.066, 0.029, 'ball');
    solid(5.58, -4.61, 1.04, 1.22, 2.06);

    for (const cx of [-1.33, 1.4, 2.43]) {
      part(kitchen, oak, cx, 2.41, -0.493, 0.99, 0.68, 0.43);
      part(kitchen, honey, cx, 2.408, -0.263, 0.89, 0.59, 0.042);
      part(kitchen, gold, cx + 0.32, 2.275, -0.226, 0.086, 0.071, 0.067, 'ball');
    }
    part(kitchen, oak, -1.24, 1.58, -0.49, 1.21, 0.08, 0.48);
    for (const [px, tint] of [[-1.58, blue], [-1.24, cream], [-0.95, gold]]) {
      part(kitchen, tint, px, 1.755, -0.405, 0.21, 0.27, 0.2, 'taper');
      part(kitchen, walnut, px, 1.899, -0.405, 0.221, 0.037, 0.215, 'round');
    }

    const kitchenware = group('Kitchenware', x, 0, z, scene);
    part(kitchen, walnut, 0.965, 1.025, -0.087, 0.8, 0.033, 0.7);
    for (const side of [-1, 1]) part(kitchen, oak, 0.965 + side * 0.399, 1.082, -0.087, 0.036, 0.112, 0.7);
    const dishes = [
      { name: 'Plate 1', from: [-0.21, 0.967, 0.071, 0.18], to: [0.723, 1.252, -0.09], tint: linen },
      { name: 'Plate 2', from: [0.135, 1.009, 0.156, -0.18], to: [0.877, 1.252, -0.09], tint: blue },
      { name: 'Plate 3', from: [-0.947, 1.04, 0.237, 0.15], to: [1.033, 1.252, -0.09], tint: cream },
      { name: 'Cup 1', from: [-0.988, 1.133, -0.219, -0.18], to: [1.502, 1.13, -0.21, 0.05], tint: gold, cup: true },
      { name: 'Cup 2', from: [0.515, 1.097, 0.216, 0.34], to: [1.502, 1.13, 0.08, 0.05], tint: rose, cup: true },
    ].map(dish => {
      const mesh = group(dish.name, 0, 0, 0, kitchenware);
      const stain = group(`Stain on ${dish.name}`, 0, 0, 0, mesh);
      if (dish.cup) {
        part(mesh, dish.tint, 0, 0, 0, 0.174, 0.222, 0.174, 'taper');
        part(mesh, walnut, 0, 0.111, 0, 0.134, 0.01, 0.134, 'round');
        part(mesh, dish.tint, 0.099, 0.034, 0, 0.082, 0.094, 0.047, 'ball');
        part(stain, 0xa36d3a, 0.025, 0.114, -0.012, 0.063, 0.015, 0.055, 'ball');
      } else {
        part(mesh, dish.tint, 0, 0, 0, 0.432, 0.057, 0.432, 'taper');
        part(mesh, linen, 0, 0.029, 0, 0.342, 0.014, 0.342, 'round');
        part(stain, 0xad7040, -0.049, 0.04, 0.012, 0.16, 0.018, 0.121, 'ball');
        part(stain, 0x958052, 0.057, 0.04, -0.082, 0.091, 0.017, 0.074, 'ball');
      }
      return { ...dish, mesh, stain };
    });
    const utensils = group('Utensils', 0, 0, 0, kitchenware);
    part(utensils, 0xafbabe, 0, 0, -0.06, 0.04, 0.025, 0.23);
    part(utensils, 0xafbabe, 0, 0.008, 0.09, 0.079, 0.031, 0.096, 'ball');
    part(utensils, oak, 0.087, 0.004, -0.034, 0.041, 0.03, 0.242);
    const water = part(kitchenware, 0x7ed6e8, 0, 1.094, -0.047, 0.028, 0.329, 0.028, 'round', false);
    water.name = 'Running water';
    const bubbles = Array.from({ length: 7 }, () =>
      part(kitchenware, 0xdaf4f1, 0, 1, 0, 0.08, 0.08, 0.08, 'ball', false));

    return {
      id: 'dishes', label: 'Wash dishes', x: x + 0.15, z: z + 0.2, anchorY: 1.12, duration: 1.2,
      viewingZone: { x: 2.25, z: -2.46, width: 1.34, depth: 1.02 },
      clearance: { x: 2.2, z: -4.24, width: 2.88, depth: 1.98 },
      render(t, moving) {
        for (const [i, dish] of dishes.entries()) {
          const stage = clamp((t - 0.19 - i * 0.071) / 0.49);
          move(dish.mesh, dish.from, dish.to, stage, 0.27);
          dish.mesh.rotation.z = dish.cup ? 0 : smooth(stage) * Math.PI / 2;
          const dirty = 1 - smooth(clamp((t - 0.09 - i * 0.055) / 0.42));
          dish.stain.visible = dirty > 0;
          dish.stain.scale.setScalar(dirty);
        }
        move(utensils, [-0.61, 1.028, 0.28, 0.47], [0.99, 1.058, 0.165, Math.PI / 2], clamp((t - 0.5) / 0.45), 0.18);
        water.visible = moving && t < 0.92;
        water.scale.x = water.scale.z = 0.025 + 0.004 * Math.sin(t * 135);
        bubbles.forEach((bubble, i) => {
          const phase = (t * 2.8 + i / bubbles.length) % 1;
          bubble.visible = water.visible && t > 0.04;
          bubble.position.set(Math.cos(i * 2.39) * phase * 0.36, 0.97 + phase * 0.47, Math.sin(i * 2.39) * phase * 0.3);
          bubble.scale.setScalar((i % 2 ? 0.112 : 0.086) * Math.sin(Math.PI * phase));
        });
      },
    };
  }

  function painting() {
    const x = -6.195;
    const z = -0.89;
    const hook = group('Painting mount', x, 1.84, z, scene);
    hook.rotation.y = Math.PI / 2;
    const frame = group('Landscape painting', 0, 0, 0, hook);
    part(frame, walnut, 0, 0, 0, 1.36, 0.986, 0.078);
    part(frame, gold, 0, 0, 0.047, 1.244, 0.873, 0.026);
    part(frame, 0x9ecfcb, 0, 0, 0.065, 1.154, 0.775, 0.025, 'box', false);
    part(frame, 0xffd890, 0.315, 0.198, 0.083, 0.23, 0.23, 0.019, 'ball', false);
    part(frame, 0xf3e8cf, -0.321, 0.22, 0.084, 0.27, 0.059, 0.025, 'ball', false);
    part(frame, 0x75978c, -0.23, -0.11, 0.092, 0.63, 0.43, 0.031, 'peak').rotation.y = Math.PI / 4;
    part(frame, 0x91aa83, 0.22, -0.168, 0.116, 0.68, 0.36, 0.031, 'peak').rotation.y = Math.PI / 4;
    part(frame, 0x618773, 0, -0.3, 0.139, 1.15, 0.168, 0.019, 'box', false);
    part(frame, 0xbad7c4, 0.135, -0.295, 0.159, 0.45, 0.027, 0.016).rotation.z = 0.06;
    return {
      id: 'painting', label: 'Straighten painting', x: x + 0.08, z, anchorY: 1.84, duration: 0.52,
      viewingZone: { x: -4.1, z: -0.89, width: 1.32, depth: 1.04 },
      clearance: { x: -5.61, z: -0.89, width: 1.38, depth: 1.38 },
      render(t) { frame.rotation.z = 0.27 * (1 - smooth(t)); },
    };
  }

  function livingRoom() {
    const x = -5.86;
    const z = 1.49;
    rug(builder, -3.91, 1.77, 4.57, 3.42, teal, 0x93b6b3);
    const tvStand = group('TV cabinet', x, 0, z);
    tvStand.rotation.y = Math.PI / 2;
    legs(tvStand, 0.88, 0.24, 0.2);
    part(tvStand, walnut, 0, 0.417, 0, 2.14, 0.445, 0.642);
    part(tvStand, oak, 0, 0.65, 0, 2.23, 0.09, 0.7);
    for (const side of [-1, 1]) {
      part(tvStand, honey, side * 0.615, 0.417, 0.331, 0.995, 0.36, 0.033);
      part(tvStand, gold, side * 0.236, 0.407, 0.37, 0.068, 0.068, 0.061, 'ball');
    }
    solid(x, z, 0.7, 2.23, 1.62);

    part(tvStand, ink, 0, 1.176, -0.02, 1.68, 0.878, 0.205);
    part(tvStand, ink, 0, 0.718, -0.025, 0.68, 0.07, 0.345);
    part(tvStand, 0x5b5559, 0, 1.184, 0.094, 1.55, 0.761, 0.043);
    const display = group('TV display', x + 0.118, 1.185, z, scene);
    display.rotation.y = Math.PI / 2;
    const program = group('TV program', 0, 0, 0, display);
    part(program, 0xc38cae, 0, 0, 0, 1.474, 0.682, 0.024, 'box', false);
    part(program, 0xeab6a1, 0, -0.12, 0.016, 1.474, 0.442, 0.015, 'box', false);
    part(program, 0xffdb87, -0.29, 0.012, 0.031, 0.371, 0.371, 0.012, 'ball', false);
    const cloud = part(program, 0xf8e6d8, 0.29, 0.192, 0.043, 0.34, 0.062, 0.012, 'ball', false);
    const littleCloud = part(program, 0xf3d0bc, -0.22, 0.246, 0.052, 0.2, 0.036, 0.012, 'ball', false);
    part(program, 0x8884aa, 0, -0.179, 0.057, 1.474, 0.319, 0.014, 'box', false);
    for (let i = 0; i < 5; i++) {
      const wave = part(program, i % 2 ? 0xf0bbad : 0xa49ac2, -0.45 + i * 0.221,
        -0.083 - i * 0.043, 0.071, 0.232, 0.012, 0.013, 'box', false);
      wave.rotation.z = 0.04;
    }
    const onLight = part(display, 0x9de0ab, 0.735, -0.381, 0.009, 0.039, 0.036, 0.019, 'ball', false);
    const darkPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.478, 0.686), new THREE.MeshBasicMaterial({
      color: 0x202533, transparent: true, opacity: 0, toneMapped: false,
    }));
    darkPanel.name = 'Dark TV screen';
    darkPanel.position.z = 0.092;
    display.add(darkPanel);

    const sofa = group('Sofa', -2.07, 0, 1.65);
    sofa.rotation.y = -Math.PI / 2;
    legs(sofa, 0.98, 0.43, 0.22, honey);
    part(sofa, teal, 0, 0.333, 0, 2.27, 0.319, 1.105);
    part(sofa, sage, 0, 0.8, -0.42, 2.27, 0.8, 0.302);
    for (const side of [-1, 1]) {
      part(sofa, mint, side * 0.467, 0.548, 0.064, 0.919, 0.168, 0.787);
      part(sofa, sage, side * 1.03, 0.646, 0.072, 0.263, 0.38, 0.991);
      const cushion = part(sofa, side > 0 ? gold : rose, side * 0.73, 0.765, -0.218, 0.42, 0.46, 0.244, 'ball');
      cushion.rotation.set(-0.28, 0, side * 0.26);
    }
    solid(-2.07, 1.65, 1.13, 2.32, FURNITURE_HEIGHT);

    const tableX = -3.49;
    const tableZ = 2.32;
    const table = group('Coffee table', tableX, 0, tableZ);
    legs(table, 0.28, 0.53, 0.43, honey);
    part(table, oak, 0, 0.504, 0, 0.83, 0.13, 1.43);
    part(table, blue, -0.102, 0.585, -0.34, 0.23, 0.043, 0.34).rotation.y = 0.2;
    part(table, linen, -0.102, 0.612, -0.34, 0.207, 0.016, 0.32).rotation.y = 0.2;
    plant(table, 0.143, 0.57, 0.341, 0.66);
    solid(tableX, tableZ, 0.83, 1.43, FURNITURE_HEIGHT);

    const bench = group('Wooden bench', -4.26, 0, 4.73);
    legs(bench, 0.62, 0.206, 0.47);
    part(bench, oak, 0, 0.52, 0, 1.65, 0.113, 0.58);
    for (const side of [-1, 1]) part(bench, honey, side * 0.65, 0.68, 0.225, 0.113, 0.48, 0.11);
    part(bench, oak, 0, 0.894, 0.237, 1.65, 0.182, 0.104);
    solid(-4.26, 4.73, 1.65, 0.58, FURNITURE_HEIGHT);
    plant(tvStand, -0.96, 0.695, 0.038, 0.68);

    let time = 0;
    return {
      id: 'tv', label: 'Turn off TV', x: x + 0.12, z, anchorY: 1.2, duration: 0.52,
      viewingZone: { x: -3.56, z: 0.81, width: 1.13, depth: 0.86 },
      clearance: { x: -5.57, z: 1.49, width: 1.66, depth: 2.36 },
      render(t) {
        darkPanel.material.opacity = smooth(t);
        darkPanel.visible = t > 0;
        program.visible = t < 1;
        onLight.visible = t < 0.2;
        if (t === 0) time = 0;
      },
      idle(dt) {
        time += dt;
        cloud.position.x = 0.24 + Math.sin(time * 1.12) * 0.21;
        littleCloud.position.x = -0.29 + Math.sin(time * 0.81) * 0.18;
      },
    };
  }

  function playCorner() {
    rug(builder, 3.83, 2.18, 3.88, 3.21, brick, 0xe4b187);
    const shelf = group('Bookshelf', 5.9, 0, -1.05);
    shelf.rotation.y = -Math.PI / 2;
    part(shelf, honey, 0, 0.835, -0.209, 1.48, 1.67, 0.1);
    for (const side of [-1, 1]) part(shelf, oak, side * 0.744, 0.84, 0, 0.11, 1.68, 0.48);
    for (const y of [0.105, 0.583, 1.102, 1.68]) part(shelf, oak, 0, y, 0, 1.57, 0.087, 0.496);
    books(shelf, -0.604, 0.155, 0.039, [teal, cream, gold, rose, sage, blue, plum]);
    books(shelf, -0.49, 0.63, 0.039, [rose, teal, blue, gold, cream]);
    books(shelf, -0.635, 1.148, 0.039, [plum, sage, cream, teal]);
    plant(shelf, 0.42, 1.723, 0.049, 0.9);
    solid(5.9, -1.05, 0.496, 1.59, 1.7);

    const x = 4.86;
    const z = 3.09;
    const chest = group('Toy box', x, 0, z);
    part(chest, walnut, 0, 0.076, 0, 1.32, 0.149, 0.79);
    for (const end of [-1, 1]) {
      part(chest, end < 0 ? teal : sage, 0, 0.353, end * 0.38, 1.37, 0.52, 0.095);
      part(chest, mint, end * 0.666, 0.353, 0, 0.106, 0.52, 0.841);
    }
    part(chest, gold, 0, 0.354, -0.442, 0.224, 0.235, 0.061).rotation.z = Math.PI / 4;
    part(chest, cream, 0, 0.354, -0.479, 0.1, 0.1, 0.034, 'ball');
    solid(x, z, 1.438, 0.857, FURNITURE_HEIGHT);
    const lid = group('Toy box lid', x, 0.63, z + 0.4, scene);
    part(lid, mint, 0, 0.013, -0.407, 1.426, 0.116, 0.89);
    part(lid, oak, 0, 0.006, -0.803, 1.427, 0.129, 0.088);
    part(lid, walnut, 0, 0.005, -0.881, 0.328, 0.061, 0.075);

    const scattered = [
      [2.86, 0.129, 1.7, -0.36, blue], [3.35, 0.135, 2.81, -0.27, rose],
      [4.41, 0.128, 1.63, 0.28, gold], [2.55, 0.126, 2.37, 0.53, sage],
    ];
    const toys = scattered.map(([tx, ty, tz, angle, tint], i) => {
      const toy = group(`Toy block ${i + 1}`, 0, 0, 0, scene);
      part(toy, tint, 0, 0, 0, 0.262, 0.249, 0.251);
      part(toy, linen, 0, 0.127, 0, 0.111, 0.013, 0.114).rotation.y = Math.PI / 4;
      part(toy, walnut, 0, 0, 0.128, 0.103, 0.103, 0.009, 'ball');
      return { toy, from: [tx, ty, tz, angle] };
    });
    const teddy = group('Teddy bear', 0, 0, 0, scene);
    part(teddy, honey, 0, 0.239, 0, 0.3, 0.39, 0.263, 'ball');
    part(teddy, honey, 0, 0.5, 0.033, 0.343, 0.319, 0.326, 'ball');
    part(teddy, cream, 0, 0.46, 0.161, 0.204, 0.14, 0.115, 'ball');
    part(teddy, walnut, 0, 0.484, 0.213, 0.077, 0.05, 0.057, 'ball');
    for (const side of [-1, 1]) {
      part(teddy, honey, side * 0.128, 0.63, 0.025, 0.133, 0.137, 0.11, 'ball');
      part(teddy, rose, side * 0.128, 0.633, 0.071, 0.073, 0.075, 0.044, 'ball');
      part(teddy, ink, side * 0.065, 0.523, 0.174, 0.037, 0.042, 0.027, 'ball');
      part(teddy, honey, side * 0.151, 0.22, 0.016, 0.105, 0.232, 0.111, 'ball').rotation.z = side * 0.42;
      part(teddy, oak, side * 0.092, 0.075, 0.107, 0.154, 0.141, 0.193, 'ball');
    }
    part(teddy, teal, 0, 0.353, 0.127, 0.175, 0.082, 0.051, 'ball');
    toys.push({ toy: teddy, from: [4.13, 0, 2.51, 2.3] });

    const car = group('Toy car', 0, 0, 0, scene);
    part(car, rose, 0, 0.158, 0, 0.449, 0.145, 0.248);
    part(car, brick, -0.034, 0.247, 0, 0.235, 0.115, 0.219);
    part(car, blue, 0.088, 0.247, 0, 0.02, 0.078, 0.178);
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        part(car, ink, side * 0.151, 0.077, end * 0.128, 0.147, 0.065, 0.147, 'round').rotation.x = Math.PI / 2;
      }
    }
    toys.push({ toy: car, from: [3.71, 0, 1.59, -0.81] });

    const destinations = toys.map((_, i) => [x + (i % 3 - 1) * 0.28, i === 4 ? 0.15 : 0.26, z + (i < 3 ? -0.18 : 0.14), 0]);
    return {
      id: 'toys', label: 'Put away toys', x: 3.81, z: 2.42, anchorY: 0.61, duration: 1.03,
      viewingZone: { x: 0.84, z: 2.22, width: 1.18, depth: 1.62 },
      clearance: { x: 3.83, z: 2.18, width: 3.88, depth: 3.21, mark: false },
      render(t) {
        toys.forEach(({ toy, from }, i) => {
          const p = clamp((t - i * 0.064) / 0.49);
          toy.visible = p < 1;
          move(toy, from, destinations[i], p, 1.04);
          toy.rotation.z = 0.28 * Math.sin(p * Math.PI) * (i % 2 ? 1 : -1);
          if (toy === teddy) toy.scale.setScalar(1 - 0.45 * smooth(p));
        });
        lid.rotation.x = 1.07 * (1 - smooth(clamp((t - 0.81) / 0.19)));
      },
    };
  }

  return [bedroom(), kitchen(), painting(), livingRoom(), playCorner()];
}
