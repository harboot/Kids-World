import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addGallerySign, addRoundSolid, addSolid, spaceTransform } from './parts.js';

const radius = 3.15;
const profiles = [
  {
    name: 'Snow White', x: 1.9, z: -2.55, yaw: .12, coat: 0x285da8, trim: 0xf4ca50, hat: 0xc6384f,
    motion: t => ({ right: 1.85, rightBend: -1.01 + .42 * Math.sin(t * 7), head: .14 * Math.sin(t * 3) }),
  },
  {
    name: 'Doc', x: -6.6, z: 3.2, yaw: .60, coat: 0xa76039, trim: 0xc8a266, hat: 0x795d39, beard: 0xe5dfc7,
    motion: t => ({ left: -.62, leftLift: -.51 + .25 * Math.sin(t * 4.5), leftBend: -.45, pitch: .20 + .18 * Math.sin(t * 4) }),
  },
  {
    name: 'Grumpy', x: -9.2, z: .05, yaw: .79, coat: 0x9a414a, trim: 0xb15453, hat: 0x673d61, beard: 0xd8c7b9,
    motion: t => ({ left: -.83, rightReach: -.83, leftBend: -.75, rightBend: -.75,
      turn: .33 * Math.sin(t * 5.6), step: .22 * Math.max(0, Math.sin(t * 5.6)) }),
  },
  {
    name: 'Happy', x: 4.35, z: 2.35, yaw: -.25, coat: 0xb87a34, trim: 0xf0b75e, hat: 0x4d723d, beard: 0xeaddc4,
    motion: t => ({ leftLift: -.89 - .31 * Math.sin(t * 5), right: .89 - .31 * Math.sin(t * 5),
      step: .29 * Math.sin(t * 5), sway: .13 * Math.sin(t * 5), bob: .065 * (1 + Math.sin(t * 10)) }),
  },
  {
    name: 'Sleepy', x: -5.6, z: -4.65, yaw: .56, seat: .16, coat: 0x647d56, trim: 0x8aab6c, hat: 0x3f637a, beard: 0xcec6bd,
    motion: t => ({ right: .31, rightReach: -1.07, rightBend: -.87 - .24 * Math.sin(t * 3.2),
      pitch: .33 * Math.sin(t * 3.2), head: -.16 }),
  },
  {
    name: 'Bashful', x: 7.0, z: -.85, yaw: -.54, coat: 0x606397, trim: 0xb99ac2, hat: 0xa9749e, beard: 0xe8d6bf,
    motion: t => ({ left: -.73, rightReach: -.74, leftBend: -.74, rightBend: -.65,
      pitch: .20 + .16 * Math.sin(t * 3.5), head: .17 + .11 * Math.sin(t * 3.5) }),
  },
  {
    name: 'Sneezy', x: -4.3, z: 9, yaw: .46, coat: 0x497c78, trim: 0x82aca1, hat: 0xbb9857, beard: 0xcbbba6,
    motion: t => {
      const sneeze = Math.max(0, Math.sin(t * 2.9)) ** 6;
      return { rightReach: -.74 - .48 * sneeze, rightBend: -.98, pitch: -.14 + .61 * sneeze,
        lean: .22 * sneeze, bob: -.05 * sneeze };
    },
  },
  {
    name: 'Dopey', x: 6.4, z: 7.65, yaw: -.55, coat: 0x83a451, trim: 0xc1c979, hat: 0x7652a0,
    motion: t => ({ right: 1.21 + .35 * Math.sin(t * 6), leftLift: -.58 + .24 * Math.sin(t * 6),
      rightBend: -.54 + .36 * Math.sin(t * 7), step: .38 * Math.sin(t * 5), sway: .20 * Math.sin(t * 5),
      bob: .074 * (1 + Math.sin(t * 10)) }),
  },
];

function createActor({ THREE, parts, bay, ground, profile, toWorld, obstacles, palette, glasses }) {
  const { part, beam, batch, matte } = parts;
  const { name, x, z, yaw, seat = 0, coat: coatColor, trim: trimColor, hat: hatColor, beard: beardColor } = profile;
  const princess = name === 'Snow White';
  const coat = matte(coatColor);
  const trim = matte(trimColor);
  const hat = matte(hatColor);
  const beard = beardColor && matte(beardColor);
  const { skin, blush, dark, white, shoe, gold, hair } = palette;
  const y = ground(x, z) + seat;
  const [wx, wz] = toWorld(x, z);
  const actor = addGroup(THREE, bay, name, x, y, z, yaw);
  const torso = addGroup(THREE, actor, name + ' body');
  const bodyY = princess ? 1.41 : .77;
  const shoulderY = princess ? 1.64 : .96;
  if (princess) {
    const skirt = part(torso, 'cone', trim, 0, .59, 0, .59, 1.12, .46);
    skirt.rotation.y = Math.PI / 12;
    part(torso, 'drum', trim, 0, .17, 0, .55, .10, .44);
    for (let i = -2; i <= 2; i++) {
      part(torso, 'sphere', trim, i * .16, .52, .33 - .05 * Math.abs(i), .12, .35, .08).rotation.z = i * .18;
    }
    part(torso, 'sphere', coat, 0, bodyY, 0, .30, .38, .22);
    part(torso, 'drum', gold, 0, 1.105, 0, .25, .079, .195);
    part(torso, 'sphere', white, 0, 1.75, -.08, .28, .141, .19);
    part(torso, 'gem', gold, 0, 1.53, .226, .079, .11, .044);
  } else {
    part(torso, 'sphere', coat, 0, bodyY, -.013, .37, .43, .25);
    part(torso, 'drum', coat, 0, .49, 0, .326, .25, .24);
    part(torso, 'drum', shoe, 0, .62, 0, .353, .095, .244);
    part(torso, 'box', gold, 0, .627, .242 + SURFACE_GAP.detail, .15, .112, .053);
    part(torso, 'box', trim, 0, .626, .278 + SURFACE_GAP.detail, .078, .053, .025);
    part(torso, 'gem', gold, 0, .851, .234, .033, .034, .022);
  }

  const head = addGroup(THREE, torso, name + ' head', 0, princess ? 1.99 : 1.27, .025);
  const headWidth = princess ? .327 : name === 'Happy' ? .443 : .393;
  const headDepth = princess ? .285 : .328;
  part(head, 'sphere', skin, 0, 0, .013, headWidth, princess ? .359 : .335, headDepth);
  if (princess) {
    part(head, 'sphere', hair, 0, .084, -.110, .381, .395, .308);
    for (const side of [-1, 1]) {
      part(head, 'sphere', hair, side * .283, -.027, -.043, .124, .317, .221).rotation.z = side * .12;
      part(head, 'sphere', hair, side * .136, .229, .164, .217, .131, .138).rotation.z = side * -.52;
      part(head, 'sphere', hat, side * .13, .417, -.007, .135, .086, .095).rotation.z = side * .47;
    }
    part(head, 'sphere', hat, 0, .40, .033, .063, .074, .079);
  } else {
    const tip = name === 'Sleepy' || name === 'Dopey' ? -.44 : name === 'Doc' ? .17 : -.22;
    part(head, 'sphere', hat, 0, .205, -.057, headWidth * 1.02, .22, .327);
    part(head, 'sphere', hat, tip * .38, .36, -.109, .255, .27, .255).rotation.z = -tip;
    part(head, 'cone', hat, tip * .77, .501, -.119, .197, .35, .188).rotation.z = -tip * 1.52;
    part(head, 'sphere', trim, tip * 1.1, .656, -.123, .081, .069, .078);
    part(head, 'sphere', trim, 0, .205, .143, headWidth * 1.005, .065, .177);
  }
  if (beard) {
    const short = name === 'Bashful' || name === 'Sneezy';
    part(head, 'sphere', beard, 0, -.205, .095, headWidth * .89, short ? .18 : .25, .252);
    for (const side of [-1, 1]) {
      part(head, 'gem', beard, side * .134, -.30, .209, .153, short ? .17 : .24, .129).rotation.z = side * .30;
      part(head, 'sphere', beard, side * .116, -.127, .318, .154, .061, .075).rotation.z = side * .15;
    }
  }

  const eyeX = princess ? .110 : .135;
  const eyeY = .054;
  const faceZ = headDepth * .91 + .016;
  for (const side of [-1, 1]) {
    part(head, 'sphere', skin, side * headWidth, -.026, -.006,
      name === 'Dopey' ? .131 : .064, name === 'Dopey' ? .163 : .09, .077);
    part(head, 'sphere', blush, side * headWidth * .65, -.056, faceZ - .025, .092, .056, .043);
    if (name === 'Sleepy') {
      beam(head, dark, [side * eyeX - .045, eyeY, faceZ + .027],
        [side * eyeX + .045, eyeY - .012, faceZ + .031], .021);
    } else {
      part(head, 'sphere', white, side * eyeX, eyeY, faceZ, .059, .070, .032);
      part(head, 'sphere', dark, side * eyeX, eyeY, faceZ + .026, .033, .045, .021);
      part(head, 'sphere', white, side * eyeX - .012, eyeY + .019, faceZ + .043, .012, .014, .008);
    }
    part(head, 'sphere', dark, side * eyeX, .146, faceZ - .013, .071, .020, .021)
      .rotation.z = name === 'Grumpy' ? side * .45 : side * -.16;
    if (name === 'Doc') part(head, glasses, gold, side * eyeX, eyeY, faceZ + .044, .084, .084, .084);
  }
  if (name === 'Doc') beam(head, gold, [-.05, eyeY, faceZ + .045], [.05, eyeY, faceZ + .045], .017);
  part(head, 'sphere', skin, 0, -.038, headDepth + .018, princess ? .051 : .092,
    princess ? .059 : .084, princess ? .072 : .105);
  const mouthY = princess ? -.137 : -.154;
  const mouthZ = faceZ + (beard ? .077 : -.002);
  const mouth = name === 'Sneezy' ? .045 : name === 'Happy' || name === 'Dopey' ? .092 : .067;
  const end = name === 'Grumpy' ? -.021 : .022;
  if (name === 'Sneezy' || name === 'Happy' || name === 'Dopey') {
    part(head, 'sphere', dark, 0, mouthY, mouthZ, mouth, name === 'Sneezy' ? .033 : .043, .030);
    if (name !== 'Sneezy') part(head, 'sphere', white, 0, mouthY + .019, mouthZ + .020, mouth * .71, .013, .010);
  } else {
    for (const side of [-1, 1]) beam(head, dark, [0, mouthY, mouthZ],
      [side * mouth, mouthY + end, mouthZ - .018], .019);
  }
  if (princess) for (const side of [-1, 1]) part(head, 'sphere', gold, side * .312, -.114, .067, .042, .054, .04);

  const arms = [-1, 1].map(side => {
    const upper = addGroup(THREE, torso, name + (side < 0 ? ' left shoulder' : ' right shoulder'),
      side * (princess ? .258 : .31), shoulderY, 0);
    const length = princess ? .32 : .232;
    part(upper, 'sphere', coat, 0, -length * .43, 0, .139, length * .62, .132);
    part(upper, 'drum', trim, 0, -length * .76, 0, .102, .066, .096);
    const forearm = addGroup(THREE, upper, name + ' elbow', 0, -length, 0);
    part(forearm, 'sphere', skin, 0, -length * .38, .017, .067, length * .47, .074);
    part(forearm, 'sphere', skin, 0, -length * .90, .029, .090, .115, .074);
    if (princess) part(upper, 'gem', hat, 0, -.092, .124, .056, .097, .044);
    if (name === 'Doc' && side > 0) {
      part(forearm, 'box', shoe, .02, -.22, .11, .32, .25, .069).rotation.z = -.19;
      part(forearm, 'box', white, .02, -.22, .148, .28, .215, .038).rotation.z = -.19;
      part(forearm, 'box', gold, .02, -.22, .173, .020, .21, .028).rotation.z = -.19;
    }
    return { upper, forearm };
  });

  const legs = [-1, 1].map(side => {
    const leg = addGroup(THREE, torso, name + ' leg', side * .146, princess ? .26 : .49, .01);
    part(leg, 'sphere', princess ? trim : coat, 0, princess ? -.091 : -.149, 0, .129, princess ? .14 : .226, .131);
    part(leg, 'sphere', shoe, 0, princess ? -.196 : -.396, .089, .139, .093, .207);
    part(leg, 'gem', gold, 0, princess ? -.122 : -.31, .184, .062, .031, .055);
    return leg;
  });

  // Face details share the head pivot and can render in material batches.
  const face = new THREE.Group();
  face.add(...head.children);
  batch(face, head);

  let blend = 0;
  let time = 0;
  let breathing = 0;
  const dozing = name === 'Sleepy';
  const studying = name === 'Doc';
  const grumpy = name === 'Grumpy';
  function pose({
    left = 0, leftLift = 0, leftBend = 0, right = 0, rightReach = 0, rightBend = 0,
    head: tilt = 0, pitch = 0, turn = 0, step = 0, bob = 0, sway = 0, lean = 0,
  }) {
    head.rotation.set((dozing ? .20 : studying ? .26 : 0) + pitch * blend, turn * blend, tilt * blend);
    torso.position.y = bob * blend;
    torso.rotation.set(lean * blend, 0, sway * blend);
    arms[0].upper.rotation.set(-.16 + left * blend, 0, -.28 + leftLift * blend);
    arms[1].upper.rotation.set((studying ? -.82 : -.16) + rightReach * blend, 0, .28 + right * blend);
    arms[0].forearm.rotation.set(-.19 + leftBend * blend, 0, .10);
    arms[1].forearm.rotation.set((studying ? -.75 : -.19) + rightBend * blend, 0, -.10);
    legs[0].rotation.x = (dozing ? -1.18 : 0) + step * blend;
    legs[1].rotation.x = (dozing ? -1.11 : 0) - step * blend;
    if (grumpy) torso.rotation.y = -.42 * turn * blend;
  }

  const greeting = profile.motion(.37);
  addRoundSolid(obstacles, wx, wz, princess ? .88 : .78, y + (princess ? 2.48 : 2.08));
  function reset() {
    blend = time = breathing = 0;
    actor.rotation.z = 0;
    pose(greeting);
  }
  reset();
  return {
    reset,
    update(dt, player, still) {
      if (!still) breathing += dt;
      actor.rotation.z = still ? 0 : .031 * Math.sin(breathing * 1.54 + profile.x) * Math.min(1, breathing * 2.5);
      const close = (player.x - wx) ** 2 + (player.z - wz) ** 2 <= radius ** 2 &&
        Math.abs(player.y - EYE_HEIGHT - y) <= 1.65;
      const target = Number(close);
      if (!close && blend === 0) return false;
      blend = still ? target : THREE.MathUtils.damp(blend, target, 9, dt);
      if (Math.abs(target - blend) < .001) blend = target;
      if (still || !blend) time = 0;
      else if (close) time += dt;
      pose(still ? greeting : profile.motion(time));
      return close;
    },
  };
}

export function buildSnowWhite({ THREE, document, bay, exhibit, parts, obstacles, outline }) {
  const { part, beam, batch, matte } = parts;
  const { toWorld, toLocal } = spaceTransform(exhibit);
  const random = seededRandom(1937);
  const components = new THREE.Group();
  const { width, depth, height } = exhibit.bounds;
  const front = depth / 2;
  const grass = matte(0xffffff, { vertexColors: true });
  const soil = matte(0x89664e);
  const bark = [matte(0x62413a), matte(0x90634a)];
  const wood = [matte(0x824f3b), matte(0xb97f51), matte(0x674038)];
  const foliage = [0x406453, 0x567e50, 0x7e9c58, 0xa1b36d].map(color => matte(color));
  const stone = [0x777e75, 0xa19a82, 0xcfc1a0].map(color => matte(color));
  const flowers = [0xdf7b92, 0xeac570, 0xad83b0, 0xf0e0bf, 0xd96059].map(color => matte(color));
  const water = matte(0x5e9c9b, { emissive: 0x367678, emissiveIntensity: .22 });
  const ripple = matte(0xa8c9b2);
  const cream = matte(0xf0d3a6);
  const gold = matte(0xc89553);
  const ember = matte(0xf5b95e, { emissive: 0xf4a444, emissiveIntensity: .7 });

  function crossSection(z) {
    const crossings = [];
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
      if (z < Math.min(az, bz) || z > Math.max(az, bz)) continue;
      if (az === bz) crossings.push(ax, bx);
      else crossings.push(ax + (bx - ax) * ((z - az) / (bz - az)));
    }
    return [Math.min(...crossings), Math.max(...crossings)];
  }

  const roadX = z => -1 + Math.sin((z + 4) * .31) * 1.08;
  function ground(x, z) {
    if (Math.abs(x) > width / 2 || Math.abs(z) > front) return;
    const [left, right] = crossSection(z);
    if (x < left || x > right) return;
    const edge = Math.min((x - left) / 2, (right - x) / 2, (front - z) / 2, (z + front) / 2, 1);
    const clear = THREE.MathUtils.smoothstep(Math.abs(x - roadX(z)), 1.6, 3.5);
    return edge * (.06 + clear * (.09 + .12 * Math.sin(x * .72 + z * .32) ** 2));
  }

  const vertices = [], tones = [], faces = [];
  const rows = [...new Set([...outline.map(([, z]) => z),
    ...Array.from({ length: 49 }, (_, index) => -front + index * depth / 48)])].sort((a, b) => a - b);
  const columns = 57;
  const tone = new THREE.Color();
  for (const [row, z] of rows.entries()) {
    const [left, right] = crossSection(z);
    for (let i = 0; i < columns; i++) {
      const x = THREE.MathUtils.lerp(left, right, i / (columns - 1));
      vertices.push(x, ground(x, z) ?? 0, z);
      const path = z > -4.02 && Math.abs(x - roadX(z)) < 1.47 + random() * .21;
      tone.setHSL(path ? .092 : .238 + .026 * Math.sin(z * .63), path ? .34 : .31,
        (path ? .50 : .35) + random() * .046 + .035 * Math.sin(x * .86 + z * .39), THREE.SRGBColorSpace);
      tones.push(tone.r, tone.g, tone.b);
      if (row && i) {
        const n = row * columns + i;
        faces.push(n - columns - 1, n - 1, n - columns, n - columns, n - 1, n);
      }
    }
  }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(tones, 3));
  terrain.setIndex(faces);
  terrain.computeVertexNormals();
  const terrainMesh = part(bay, terrain, grass, 0, 0, 0, 1, 1, 1);
  terrainMesh.name = 'Snow White woodland terrain';

  const solid = (x, z, w, d, top, yaw = 0) => addSolid(obstacles, ...toWorld(x, z), w, d, top, exhibit.rotation + yaw);
  const round = (x, z, r, top) => addRoundSolid(obstacles, ...toWorld(x, z), r, top);

  const cottage = addGroup(THREE, components, 'Seven Dwarfs cottage', -1, .13, -7.33);
  const cottageBox = (material, ...position) => part(cottage, 'box', material, ...position);
  const cottageWidth = 7.7, cottageDepth = 5.75, eaves = 3.65, ridge = 7.04;
  const wallX = cottageWidth / 2, wallZ = cottageDepth / 2;
  const foundation = .38;
  cottageBox(stone[0], 0, .12, 0, cottageWidth + .12, .46, cottageDepth + .12);
  cottageBox(cream, 0, (foundation + eaves) / 2, 0, cottageWidth, eaves - foundation, cottageDepth);
  const gableShape = new THREE.Shape([[-wallX, eaves], [wallX, eaves], [0, ridge]]
    .map(([x, y]) => new THREE.Vector2(x, y)));
  const gable = new THREE.ShapeGeometry(gableShape);
  part(cottage, gable, cream, 0, 0, wallZ, 1, 1, 1);
  part(cottage, gable, cream, 0, 0, -wallZ, 1, 1, 1).rotation.y = Math.PI;
  for (const side of [-1, 1]) {
    for (const dz of [-wallZ, wallZ]) {
      cottageBox(wood[2], side * wallX, 2.01, dz, .27, 3.36, .25);
      beam(cottage, wood[0], [side * (wallX - .2), eaves - .035, dz + Math.sign(dz) * .083],
        [0, ridge - .17, dz + Math.sign(dz) * .083], .20, .17);
    }
    cottageBox(wood[0], side * wallX, eaves - .05, 0, .25, .27, cottageDepth + .13);
    for (const dz of [-1.45, 0, 1.45]) {
      cottageBox(wood[0], side * (wallX + .04), 2.06, dz, .12, 3.16, .125);
    }
  }
  for (const y of [.52, 1.36, 3.38, 3.56]) {
    cottageBox(wood[y > 3 ? 2 : 1], 0, y, wallZ + .062, cottageWidth, .12, .15);
  }
  for (const x of [-1.56, 1.56]) {
    cottageBox(wood[0], x, 2.07, wallZ + .081, .135, 3.22, .16);
    beam(cottage, wood[0], [x, 3.46, wallZ + .091], [x * .36, 5.32, wallZ + .091], .123, .152);
  }
  cottageBox(wood[0], 0, 4.63, wallZ + .077, .16, 1.99, .15);
  part(cottage, 'drum', wood[0], 0, 4.40, wallZ + .087, .51, .16, .51).rotation.x = Math.PI / 2;
  part(cottage, 'drum', ember, 0, 4.40, wallZ + .185, .38, .09, .38).rotation.x = Math.PI / 2;
  for (const axis of [0, Math.PI / 2]) {
    const mullion = cottageBox(wood[2], 0, 4.40, wallZ + .246, .075, .74, .06);
    mullion.rotation.z = axis;
  }

  const roofColors = [0x773947, 0x8e4853, 0xa2535d, 0xb56565].map(color => matte(color));
  const overhang = wallX + .47;
  const drop = ridge - eaves + .28;
  const pitch = Math.atan2(drop, overhang);
  const slope = Math.hypot(drop, overhang);
  const roofLength = cottageDepth + 1.02;
  for (const side of [-1, 1]) {
    const roof = addGroup(THREE, cottage, 'Shingled cottage roof', side * overhang / 2, ridge - drop / 2, 0);
    roof.rotation.z = -side * pitch;
    part(roof, 'box', wood[2], 0, -.075, 0, slope, .15, roofLength);
    part(roof, 'box', roofColors[0], 0, .018, 0, slope, .036, roofLength);
    for (let row = 0; row < 10; row++) {
      for (let column = 0; column < 12; column++) {
        const dx = -slope / 2 + (row + .5) * slope / 10;
        const dz = -roofLength / 2 + (column + .5) * roofLength / 12;
        const relief = SURFACE_GAP.roof + .017 * ((row + column) % 3);
        part(roof, 'box', roofColors[Math.floor(random() * roofColors.length)], dx, relief + .018, dz,
          slope / 10 - .019, .035, roofLength / 12 - .023);
      }
    }
    for (const sideZ of [-1, 1]) {
      part(roof, 'box', wood[1], 0, -.005, sideZ * (roofLength / 2 + .06), slope + .05, .27, .16);
    }
  }
  beam(cottage, wood[2], [0, ridge + .075, -roofLength / 2], [0, ridge + .075, roofLength / 2], .24);
  const chimney = addGroup(THREE, cottage, 'Stone chimney', 2.21, 4.87, -1.30, .04);
  part(chimney, 'box', stone[0], 0, 1.10, 0, .88, 2.20, .86);
  for (let row = 0; row < 7; row++) {
    const offset = row % 2 ? .035 : -.035;
    part(chimney, 'box', stone[row % 3], offset, .27 + row * .28, .022, .89, .24, .88);
  }
  part(chimney, 'box', stone[2], 0, 2.17, 0, 1.06, .22, 1.04);
  part(chimney, 'box', wood[2], 0, 2.29 + SURFACE_GAP.detail, 0, .70, .06, .69);

  const door = addGroup(THREE, cottage, 'Arched cottage door', 0, .3, wallZ + .14);
  part(door, 'box', wood[2], 0, .95, 0, 1.84, 1.88, .30);
  part(door, 'drum', wood[2], 0, 1.84, 0, .92, .30, .92).rotation.x = Math.PI / 2;
  part(door, 'box', wood[0], 0, .91, .158, 1.54, 1.72, .05);
  part(door, 'drum', wood[0], 0, 1.76, .166, .765, .066, .765).rotation.x = Math.PI / 2;
  for (let i = -2; i <= 2; i++) {
    part(door, 'box', i % 2 ? wood[0] : wood[1], i * .293, .91, .195 + SURFACE_GAP.detail, .274, 1.70, .044);
  }
  part(door, 'drum', gold, .50, .88, .244, .106, .06, .106).rotation.x = Math.PI / 2;
  part(door, 'sphere', gold, .50, .88, .305, .067, .064, .071);
  cottageBox(stone[1], 0, .17, wallZ + .27, 2.02, .25, .67);
  solid(-1, -7.33, cottageWidth + .16, cottageDepth + .16, eaves + .20);
  solid(-1, -7.33 + wallZ + .24, 2.02, .68, .43);

  function flower(parent, x, y, z, h, color) {
    part(parent, 'drum', foliage[1], x, y + h * .44, z, .022, h, .022);
    part(parent, 'ball', foliage[2], x + .055, y + h * .41, z, .087, .038, .044).rotation.z = .39;
    part(parent, 'ball', color, x, y + h, z, .101, .077, .098);
    part(parent, 'ball', gold, x, y + h + .061, z + .019, .050, .035, .049);
  }

  for (const x of [-2.63, 2.63]) {
    const window = addGroup(THREE, cottage, 'Warm cottage window', x, 2.22, wallZ + .15);
    part(window, 'box', wood[2], 0, 0, 0, 1.45, 1.45, .20);
    part(window, 'box', ember, 0, 0, .119, 1.17, 1.16, .04);
    for (const angle of [0, Math.PI / 2]) {
      part(window, 'box', wood[0], 0, 0, .157, .092, 1.16, .046).rotation.z = angle;
    }
    for (const side of [-1, 1]) {
      part(window, 'box', foliage[0], side * .893, 0, .027, .353, 1.32, .14).rotation.y = side * -.18;
      for (const y of [-.38, .35]) part(window, 'box', wood[1], side * .893, y, .103, .29, .087, .067);
    }
    part(window, 'box', wood[2], 0, -.79, .25, 1.72, .27, .49);
    part(window, 'box', wood[1], 0, -.65, .27, 1.75, .09, .52);
    part(window, 'box', soil, 0, -.59, .27, 1.54, .06, .39);
    for (let i = 0; i < 10; i++) flower(window, (i - 4.5) * .145, -.55, .27 + .13 * Math.sin(i * 4),
      .16 + .08 * random(), flowers[i % flowers.length]);
  }

  for (let i = 0; i < 23; i++) {
    const z = front - .39 - i * .755;
    const x = roadX(z) + .23 * Math.sin(i * 2.7);
    const size = .57 + random() * .09;
    part(components, 'drum', stone[2 - i % 2], x, ground(x, z) + .017, z, size * 1.3, .056, size * .49).rotation.y = random() - .5;
  }

  const grove = [
    [-10.7, 11.3, 8.6], [11.7, 11.2, 8.2], [-13.8, 6.5, 11.4], [12.6, 5.5, 10.1],
    [-12.9, -2.4, 9.4], [12.2, -.35, 8.4], [-12.7, -7.45, 11.5], [12.7, -10.2, 10.4],
    [-9.45, -10.85, 9.6], [-6.7, -11.93, 10.2], [-2.7, -12.27, 11.8], [2.4, -12.23, 11.1],
    [5.3, -11.15, 12.3], [8.4, -10.89, 8.2], [10.6, -5.0, 6.6],
  ];
  for (const [x, z, h] of grove) {
    const groundY = ground(x, z) ?? .03;
    const tree = addGroup(THREE, components, 'Woodland tree', x, groundY, z, random() * Math.PI * 2);
    const radius = h * .045;
    part(tree, 'drum', bark[0], 0, h * .34, 0, radius, h * .68, radius).rotation.z = .045;
    part(tree, 'drum', bark[1], -.12, h * .58, .038, radius * .63, h * .51, radius * .65);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, dx = Math.cos(a) * h * .15, dz = Math.sin(a) * h * .13;
      beam(tree, bark[0], [0, h * .48, 0], [dx, h * (.69 + i * .026), dz], radius * .6);
      part(tree, 'ball', foliage[i % 3], dx, h * (.77 + .061 * i), dz, h * .215, h * .212, h * .184).rotation.y = i * 2;
      part(tree, 'ball', foliage[2 + i % 2], dx * .84, h * (.85 + .055 * i), dz * .85,
        h * .154, h * .131, h * .154).rotation.y = i * .8;
      beam(tree, bark[0], [0, .46, 0], [dx * .65, .04, dz * .65], radius * .53);
    }
    round(x, z, radius * 1.13, groundY + h);
  }

  // The pond, flower beds and furniture are arranged around a walkable clearing.
  const pond = addGroup(THREE, components, 'Woodland pond', 9.15, .28, -7.78, .24);
  part(pond, 'drum', stone[0], 0, .017, 0, 3.32, .14, 2.22);
  part(pond, 'drum', water, 0, .107, 0, 3.14, .054, 2.02);
  for (let i = 0; i < 19; i++) {
    const a = i * Math.PI * 2 / 19;
    part(pond, 'ball', stone[i % 2], 3.23 * Math.cos(a), .135, 2.07 * Math.sin(a),
      .38 + random() * .19, .14 + random() * .12, .36).rotation.y = a;
  }
  for (const [x, z] of [[.8, -.89], [-1.18, .61], [-.23, .01]]) {
    part(pond, 'drum', foliage[2], x, .148, z, .35, .025, .25);
    part(pond, 'sphere', flowers[0], x + .06, .195, z, .13, .105, .13);
    part(pond, 'sphere', ripple, x + .69, .148, z + .09, .43, .009, .052);
  }
  solid(9.15, -7.78, 5.6, 3.38, .83, .24);

  const well = addGroup(THREE, components, 'Wishing well', 8.75, ground(8.75, 7.65), 7.65);
  part(well, 'drum', stone[0], 0, .48, 0, 1.12, .96, 1.12);
  part(well, 'drum', water, 0, .970, 0, .89, .052, .89);
  for (let i = 0; i < 13; i++) {
    const a = i * Math.PI * 2 / 13;
    for (let row = 0; row < 3; row++) {
      const theta = a + row * .16;
      part(well, 'box', stone[(row + i) % 3], Math.sin(theta) * .987, (row + .5) * .31,
        Math.cos(theta) * .987, .46, .286, .285).rotation.y = theta;
    }
    part(well, 'box', stone[2], Math.sin(a) * 1.032, .99, Math.cos(a) * 1.032, .51, .211, .30).rotation.y = a;
  }
  for (const side of [-1, 1]) {
    part(well, 'box', wood[1], side * .91, 1.55, 0, .15, 2.6, .17);
    part(well, 'box', roofColors[1], 0, 3.02, side * .50, 2.41, .15, 1.38).rotation.x = side * .53;
  }
  beam(well, wood[2], [-1.16, 3.38, 0], [1.16, 3.38, 0], .14);
  beam(well, wood[2], [-.96, 2.25, 0], [.96, 2.25, 0], .11);
  beam(well, gold, [0, 2.25, 0], [0, 1.53, 0], .033);
  part(well, 'drum', wood[2], 0, 1.39, 0, .19, .30, .19);
  part(well, 'drum', gold, 0, 1.46, 0, .20, .048, .20);
  round(8.75, 7.65, 1.15, 2.6);

  const table = addGroup(THREE, components, 'Dwarfs table', -9.5, ground(-9.5, -4.72), -4.72, .15);
  part(table, 'drum', wood[2], 0, .42, 0, .31, .84, .31);
  part(table, 'drum', wood[1], 0, .90, 0, 1.24, .19, 1.04);
  part(table, 'drum', cream, 0, 1.01, 0, .43, .032, .43);
  for (const x of [-.19, 0, .21]) part(table, 'sphere', flowers[4], x, 1.102, .03, .112, .09, .096);
  round(-9.5, -4.72, 1.18, 1.16);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7 + .18;
    const x = -9.5 + 1.95 * Math.cos(a), z = -4.72 + 1.75 * Math.sin(a);
    const stool = addGroup(THREE, components, 'Dwarf stool', x, ground(x, z), z, a);
    part(stool, 'drum', wood[1], 0, .44, 0, .33, .13, .32);
    for (let leg = 0; leg < 3; leg++) {
      const theta = leg * Math.PI * 2 / 3;
      beam(stool, wood[2], [.27 * Math.cos(theta), .015, .27 * Math.sin(theta)],
        [.19 * Math.cos(theta), .42, .19 * Math.sin(theta)], .086);
    }
    round(x, z, .29, (ground(x, z) ?? 0) + .46);
  }
  for (const [x, z, r, h] of [[-5.6, -4.65, .43, .48], [-11.1, .35, .50, .53]]) {
    const base = ground(x, z);
    part(components, 'drum', bark[0], x, base + h / 2, z, r, h, r);
    part(components, 'drum', wood[1], x, base + h + .014, z, r * .92, .032, r * .92);
    part(components, 'drum', wood[0], x, base + h + .035, z, r * .66, .025, r * .66);
    round(x, z, r, base + h);
  }

  const pile = addGroup(THREE, components, 'Stacked firewood', -11.37, ground(-11.37, 2.22), 2.22, -.36);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const x = (i - (3 - row) / 2) * .41;
      const y = .21 + row * .33;
      part(pile, 'drum', bark[row % 2], x, y, 0, .216, 1.07, .216).rotation.x = Math.PI / 2;
      part(pile, 'drum', wood[1], x, y, .56, .172, .067, .172).rotation.x = Math.PI / 2;
    }
  }
  solid(-11.37, 2.22, 1.69, 1.17, 1.18, -.36);

  for (const [x, z, r] of [[-8.35, 10.6, .89], [11.7, 5.12, 1.26], [-11.8, 7.3, 1.18],
    [6.4, -10.2, 1.25], [11.4, -1.65, .94], [-11.3, -8.1, .84], [-5.7, 10.4, .71], [2.9, 10.93, .76]]) {
    const y = ground(x, z) ?? 0;
    part(components, 'ball', stone[0], x, y + r * .34, z, r, r * .58, r * .72).rotation.y = random() * 4;
    part(components, 'ball', foliage[1], x + .101, y + r * .66, z, r * .78, r * .26, r * .57);
    round(x, z, r * .73, y + r * .85);
  }
  for (const [cx, cz, width, count] of [[5.35, 0, 1.52, 28], [4.4, -3.2, 1.17, 19], [7.3, 10.7, 1.48, 24],
    [-3.85, 10.84, .87, 15], [-7.3, 6.4, 1.32, 22], [-8.9, -8.85, 1.38, 19], [11.3, 2.39, 1.14, 18]]) {
    const y = ground(cx, cz) ?? 0;
    part(components, 'ball', foliage[0], cx, y + .08, cz, width, .22, width * .85);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * width * .87;
      const x = cx + r * Math.cos(a), z = cz + r * Math.sin(a) * .8;
      if (i % 5 === 0) {
        const h = .28 + random() * .27;
        part(components, 'drum', cream, x, (ground(x, z) ?? 0) + h * .48, z, .07, h, .07);
        part(components, 'sphere', flowers[4], x, (ground(x, z) ?? 0) + h, z, .18, .11, .18);
        part(components, 'ball', cream, x - .06, (ground(x, z) ?? 0) + h + .097, z + .032, .046, .025, .038);
      } else flower(components, x, (ground(x, z) ?? 0) + .09, z, .22 + random() * .27, flowers[i % flowers.length]);
    }
  }
  for (const [x, z, size] of [[-6.8, 8.95, .72], [8.7, 2.54, .83], [-11.4, -1.55, .7], [10.7, -4.25, .87]]) {
    part(components, 'ball', foliage[0], x, ground(x, z) + size * .38, z, size, size * .70, size * .78);
    part(components, 'ball', foliage[2], x - .28, ground(x, z) + size * .63, z + .15, size * .57, size * .52, size * .56);
    round(x, z, size * .78, ground(x, z) + size * 1.12);
  }

  buildBackdrop({ THREE, document, bay, parts, outline, width, depth, height });
  const cue = addGroup(THREE, bay, 'Snow White greeting sign', -5.85, ground(-5.85, 11.65), 11.65, .09);
  part(cue, 'box', wood[2], 0, .67, 0, .145, 1.34, .15);
  part(cue, 'box', gold, 0, 1.44, 0, 3.24, .79, .12);
  addGallerySign(THREE, document, cue, ['Come Closer to Say Hello'], 0, 1.44, .06 + SURFACE_GAP.detail, 3.13, .67);
  round(-5.85, 11.65, .15, 1.78);
  batch(components, bay);

  const palette = {
    skin: matte(0xf0b99d), blush: matte(0xd9827f), dark: matte(0x352e3c), white: matte(0xffedcf),
    shoe: matte(0x49363c), gold, hair: matte(0x31273c),
  };
  const glasses = new THREE.TorusGeometry(1, .15, 6, 16);
  const actors = profiles.map(profile => createActor({ THREE, parts, bay, ground, profile, toWorld, obstacles, palette, glasses }));
  return {
    getGroundHeight(x, z) { return ground(...toLocal(x, z)); },
    update(dt, player, _grounded, still) {
      let greeted = false;
      for (const actor of actors) {
        if (actor.update(dt, player, still)) greeted = true;
      }
      return greeted;
    },
    reset() {
      for (const actor of actors) actor.reset();
    },
  };
}

function buildBackdrop({ THREE, document, bay, parts, outline, width, depth, height }) {
  const texture = paintCanvasTexture(THREE, document, 768, 576, (ink, w, h) => {
    const sky = ink.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#91b1b0');
    sky.addColorStop(.61, '#e0cf9e');
    sky.addColorStop(1, '#658972');
    ink.fillStyle = sky;
    ink.fillRect(0, 0, w, h);
    const sun = ink.createRadialGradient(w * .63, h * .33, 1, w * .63, h * .33, h * .35);
    sun.addColorStop(0, '#fff1c8d6');
    sun.addColorStop(1, '#fff1c800');
    ink.fillStyle = sun;
    ink.fillRect(0, 0, w, h);
    const random = seededRandom(708);
    for (const [color, base] of [['#98aa88', .87], ['#698d78', .95], ['#4c7564', 1.07]]) {
      ink.fillStyle = color;
      ink.fillRect(0, h * base - 60, w, h);
      for (let i = 0; i < 31; i++) {
        const x = i * w / 30 + (random() - .5) * 36;
        const y = (base - .33 - random() * .36) * h;
        ink.fillRect(x - 2, y, 4, h * base - y);
        for (let j = 0; j < 3; j++) {
          const branchY = y + j * 28;
          ink.beginPath();
          ink.ellipse(x, branchY, 11 + random() * 24 + j * 5, 14 + random() * 29, 0, 0, Math.PI * 2);
          ink.fill();
        }
      }
    }
  });
  const material = new THREE.MeshBasicMaterial({ color: texture ? 0xffffff : 0x76988a, map: texture, toneMapped: false });
  for (let i = 3; i <= 9; i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
    const length = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(bz - az, ax - bx);
    const inset = .32;
    const mesh = parts.part(bay, new THREE.PlaneGeometry(length + .16, height - .42), material,
      (ax + bx) / 2 + Math.sin(yaw) * inset, height / 2, (az + bz) / 2 + Math.cos(yaw) * inset, 1, 1, 1);
    mesh.rotation.y = yaw;
    // The upper portion of the painted scenery stays out of a top-down view.
    mesh.name = 'Snow White woodland backdrop';
  }
  const sky = new THREE.MeshBasicMaterial({ color: 0x9bb7b1, toneMapped: false });
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x * (width - .12) / width, z * (depth - .12) / depth)));
  const canopy = parts.part(bay, new THREE.ShapeGeometry(shape), sky, 0, height - .20, 0, 1, 1, 1);
  canopy.rotation.x = Math.PI / 2;
  canopy.layers.set(PLAYER_ONLY_LAYER);
}
