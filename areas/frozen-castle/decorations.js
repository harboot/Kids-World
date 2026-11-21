import { snowflake } from './palace.js';

export function buildDecorations(THREE, builder) {
  const { architecture, group, part, beam, solid, ice, materials } = builder;
  const { frost, pearl, blue, deep, glass, lilac, silver, light } = materials;

  const crest = group('Winter crest relief', 0, 3.42, 13.62, architecture);
  crest.rotation.y = Math.PI;
  part(crest, 'drum', deep, 0, 0, 0, 1.80, .18, 1.80).rotation.x = Math.PI / 2;
  part(crest, 'drum', glass, 0, 0, .125, 1.59, .13, 1.59).rotation.x = Math.PI / 2;
  snowflake(builder, crest, light, 0, 0, .222, 1.16);
  for (const side of [-1, 1]) {
    part(crest, 'gem', lilac, side * 1.95, 0, .082, .23, .38, .13);
  }

  const throne = group('Ice Throne', 0, 1.6, -11.36, architecture);
  part(throne, 'drum', deep, 0, 0.14, 0, 2.37, 0.28, 1.45);
  part(throne, 'box', glass, 0, 0.49, 0, 2.38, 0.62, 1.77);
  part(throne, 'box', frost, 0, 0.83, 0.08, 2.11, 0.18, 1.48);
  part(throne, 'gem', silver, 0, 2.71, -0.64, 0.76, 1.89, 0.31);
  snowflake(builder, throne, light, 0, 2.45, -0.31, 0.43);
  for (const side of [-1, 1]) {
    part(throne, 'gem', lilac, side * 0.79, 2.19, -0.69, 0.58, 1.64, 0.27);
    part(throne, 'gem', glass, side * 1.43, 1.77, -0.69, 0.58, 1.01, 0.29);
    part(throne, 'box', pearl, side * 1.12, 1.11, 0.16, 0.28, 0.31, 1.4);
    part(throne, 'gem', silver, side * 1.12, 1.32, 0.87, 0.24, 0.43, 0.23);
  }
  solid(0, -11.36, 4.45, 2.65, 5.93);
  const throneInteraction = {
    x: 0, z: -10.7, radius: 1.75, anchorY: 2.61, label: 'Sit on Ice Throne',
    reachable: player => player.z > -10.07 && Math.abs(player.x) < 1.65 && player.y >= 3,
    act({ sit }) { sit({ x: 0, y: 3.73, z: -11.18, yaw: Math.PI }, 'Stand up'); },
  };

  const fountain = group('Frozen fountain', 8.45, 0, -3.7, architecture);
  part(fountain, 'drum', blue, 0, 0.28, 0, 1.98, 0.56, 1.98);
  part(fountain, 'drum', frost, 0, 0.55, 0, 2.06, 0.18, 2.06);
  part(fountain, 'drum', glass, 0, 0.65, 0, 1.79, 0.056, 1.79);
  part(fountain, 'gem', silver, 0, 1.42, 0, 0.6, 1.06, 0.6);
  const droplets = group('Fountain ice droplets', 8.45, 0, -3.7);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    beam(fountain, pearl, [x * 0.44, 1.67, z * 0.44], [x * 1.43, 0.72, z * 1.43], 0.063);
    part(droplets, 'gem', light, x, 1.15, z, 0.1, 0.16, 0.1);
  }
  solid(8.45, -3.7, 3.54, 3.54, 1.9);

  for (const [x, z, rotation] of [[-7.75, 5.55, -0.7], [11.65, -8.6, -1.6]]) {
    const sculpture = group('Ice bird sculpture', x, 0, z, architecture);
    sculpture.rotation.y = rotation;
    part(sculpture, 'drum', deep, 0, 0.18, 0, 0.9, 0.36, 0.9);
    part(sculpture, 'gem', glass, 0, 0.99, 0, 0.52, 0.53, 0.77);
    beam(sculpture, pearl, [0, 1.05, 0.22], [0, 1.87, 0.64], 0.24);
    part(sculpture, 'ball', frost, 0, 1.92, 0.69, 0.23, 0.26, 0.28);
    part(sculpture, 'gem', lilac, 0, 1.9, 0.93, 0.15, 0.11, 0.24);
    for (const side of [-1, 1]) {
      part(sculpture, 'gem', silver, side * 0.37, 1.34, -0.18, 0.26, 0.81, 0.71).rotation.z = side * -0.57;
    }
    solid(x, z, 1.68, 1.78, 2.06);
  }

  const chandelier = group('Crystal chandelier', 0, 7.0, 0.05);
  const chandelierGlow = ice(0x77a5c2, 0x24455c);
  const rings = part(chandelier, 'drum', deep, 0, -0.35, 0, 1.83, 0.13, 1.83);
  rings.rotation.y = Math.PI / 8;
  part(chandelier, 'drum', chandelierGlow, 0, -0.23, 0, 1.78, 0.13, 1.78);
  part(chandelier, 'gem', chandelierGlow, 0, -1.15, 0, 0.56, 1.34, 0.56);
  beam(chandelier, glass, [0, -0.17, 0], [0, 4.72, 0], 0.16);
  for (let i = 0; i < 8; i++) {
    const angle = (i + 0.5) * Math.PI / 4;
    const x = 1.72 * Math.cos(angle);
    const z = 1.72 * Math.sin(angle);
    beam(chandelier, pearl, [x, -0.18, z], [0, 1.48, 0], 0.10);
    part(chandelier, 'gem', chandelierGlow, x, -0.75, z, 0.2, 0.73 + (i % 2) * 0.25, 0.2);
    part(chandelier, 'gem', frost, x * 0.75, -0.73, z * 0.75, 0.1, 0.48, 0.1);
  }
  const aurora = buildAurora(THREE, group);
  return { throneInteraction, droplets, chandelierGlow, aurora };
}

function buildAurora(THREE, group) {
  const aurora = group('Ceiling aurora', 0, 7.8, -5.8);
  const positions = [];
  const colors = [];
  const indices = [];
  const color = new THREE.Color();
  for (let i = 0; i <= 28; i++) {
    const x = (i - 14) * 0.65;
    const z = Math.sin(i * 0.25) * 1.45;
    const y = Math.sin(i * 0.41) * 0.47;
    positions.push(x, y, z, x, y + 0.22 + 0.68 * Math.sin(i * Math.PI / 28), z + 0.43);
    color.setHSL(0.43 + i / 28 * 0.33, 0.74, 0.69);
    colors.push(color.r, color.g, color.b, color.r * 0.38, color.g * 0.49, color.b * 0.53);
    const j = i * 2;
    if (i > 0) indices.push(j - 2, j - 1, j, j, j - 1, j + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const ribbon = new THREE.Mesh(geometry, material);
  aurora.add(ribbon);
  aurora.visible = false;
  return aurora;
}
