import { colors, rug } from './interior.js';
import { FRONT, UPSTAIRS } from './layout.js';

const { cream, linen, oak, walnut, gold, rose, teal, blue, ink, mint, plum } = colors;
const cue = (pitch, endPitch, duration, level, offset = 0) =>
  [pitch, { endPitch, duration, level, attack: .008, wave: 'triangle' }, offset];

function person({ group, part }, parent, name, { x, y = 0, z, skin, hair, shirt, pants, scale = 1 }) {
  const root = group(name, x, y, z, parent);
  root.scale.setScalar(scale);
  part(root, shirt, 0, .97, 0, .49, .55, .32, 'ball');
  part(root, pants, 0, .66, 0, .42, .19, .27, 'ball');
  part(root, skin, 0, 1.23, .008, .17, .19, .16, 'round');
  const head = group(name + ' head', 0, 1.43, .015, root);
  part(head, skin, 0, 0, 0, .46, .44, .42, 'ball');
  part(head, hair, 0, .131, -.055, .478, .27, .418, 'ball');
  part(head, skin, 0, -.01, .207, .093, .085, .066, 'ball');
  part(head, 0xa35d50, 0, -.089, .186, .11, .023, .043, 'ball');
  const arms = [];
  const legs = [];
  const eyes = [];
  for (const side of [-1, 1]) {
    part(head, skin, side * .212, -.018, .006, .105, .142, .083, 'ball');
    eyes.push(part(head, ink, side * .095, .037, .188, .045, .052, .028, 'ball'));
    part(head, 0xe5877d, side * .137, -.044, .166, .067, .037, .038, 'ball');
    const arm = group(name + ' arm', side * .235, 1.117, .019, root);
    part(arm, shirt, 0, -.16, 0, .145, .34, .15, 'ball');
    part(arm, skin, 0, -.337, .02, .13, .15, .133, 'ball');
    arms.push(arm);
    const leg = group(name + ' leg', side * .109, .65, 0, root);
    part(leg, pants, 0, -.256, 0, .177, .52, .18, 'ball');
    part(leg, walnut, 0, -.563, .065, .18, .13, .25, 'ball');
    legs.push(leg);
  }
  return { root, head, arms, legs, eyes };
}

export function buildFamily(scene, builder) {
  const { group, part, solid } = builder;
  const door = group('Wooden House front door', -.94, 0, FRONT, scene);
  for (let i = 0; i < 6; i++) {
    part(door, i % 2 ? 0xb07e55 : 0xc79365, .155 + i * .31, 1.16, 0, .307, 2.32, .14);
  }
  for (const z of [-.085, .085]) {
    for (const y of [.35, 1.92]) part(door, walnut, .93, y, z, 1.75, .115, .065);
    part(door, gold, 1.63, 1.10, 1.23 * z, .122, .12, .095, 'ball');
    part(door, teal, .94, 1.46, 1.56 * z, .63, .21, .052);
  }

  const mother = person(builder, scene, 'Mother cooking', {
    x: 4.44, z: -3.30, skin: 0xd89b74, hair: 0x603b2c, shirt: 0xd07b65, pants: 0x5b745e, scale: .99,
  });
  part(mother.head, 0x603b2c, 0, .085, -.217, .28, .30, .28, 'ball');
  part(mother.root, linen, 0, .84, .154, .37, .49, .095, 'ball');
  const spoon = group('Cooking spoon', 0, -.37, .06, mother.arms[1]);
  part(spoon, oak, 0, 0, .105, .053, .046, .27);
  part(spoon, oak, 0, -.008, .25, .113, .056, .15, 'ball');
  const cookingPot = group('Soup pot', 4.44, 1.055, -4.40);
  part(cookingPot, 0xa25e54, 0, .165, 0, .53, .29, .53, 'taper');
  part(cookingPot, 0xf0bc69, 0, .311, 0, .478, .026, .478, 'round');
  for (const side of [-1, 1]) part(cookingPot, walnut, side * .30, .228, 0, .155, .076, .13);
  const steam = group('Soup steam', 4.44, 1.42, -4.40, scene);
  const wisps = [0, 1, 2].map(i => part(steam, linen, i * .09 - .09, .15, 0, .105, .19, .105, 'ball', false));
  solid(4.44, -3.29, .49, .45, 1.8);

  const tableX = 3.08;
  const tableZ = 2.28;
  const table = group('Family dining table and chairs', tableX, 0, tableZ);
  part(table, oak, 0, .89, 0, 2.35, .17, 1.29);
  part(table, 0xcc8b73, 0, .985, 0, .50, .027, 1.31);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      part(table, walnut, side * .98, .41, end * .51, .13, .81, .13);
      const chair = group('Dining chair', side * .63, 0, end * 1.03, table);
      part(chair, end === -1 ? teal : rose, 0, .45, 0, .52, .12, .48);
      part(chair, oak, 0, .79, end * .23, .52, .52, .084);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) part(chair, walnut, sx * .205, .2, sz * .183, .078, .4, .078);
      }
    }
  }
  solid(tableX, tableZ, 2.35, 2.61, 1.45);
  const placeSettings = group('Moving place settings', tableX, 0, tableZ, scene);
  const plates = Array.from({ length: 4 }, (_, i) => {
    const plate = group('Place setting ' + (i + 1), 0, 0, 0, placeSettings);
    part(plate, i % 2 ? mint : linen, 0, 0, 0, .42, .057, .42, 'round');
    part(plate, cream, 0, .032, 0, .31, .021, .31, 'round');
    part(plate, gold, .27, .017, 0, .041, .024, .29);
    return plate;
  });

  const cageX = -5.98;
  const cageZ = -4.34;
  const cage = group('Birdcage with perch and seed bowl', cageX, 0, cageZ);
  part(cage, oak, 0, .82, 0, 1.18, .13, 1.12);
  for (const x of [-.44, .44]) {
    for (const z of [-.42, .42]) part(cage, walnut, x, .39, z, .105, .79, .105);
  }
  for (const [y, diameter] of [[.94, .98], [2.02, 1.02], [2.13, .79]]) part(cage, walnut, 0, y, 0, diameter, .077, diameter, 'round');
  part(cage, gold, 0, 2.205, 0, .45, .12, .45, 'taper');
  for (let i = 0; i < 14; i++) {
    const angle = i * (2 * Math.PI / 14);
    part(cage, 0x987850, .464 * Math.cos(angle), 1.49, .464 * Math.sin(angle), .034, 1.09, .034, 'round');
  }
  part(cage, oak, 0, 1.32, 0, .80, .043, .045);
  part(cage, cream, .26, 1.015, .19, .21, .075, .20, 'taper');
  const seed = part(cage, gold, .26, 1.052, .19, .166, .037, .16, 'ball');
  seed.visible = false;
  solid(cageX, cageZ, 1.22, 1.15, 2.28);

  const dad = person(builder, scene, 'Father playing with the bird', {
    x: -4.58, z: -4.10, skin: 0xb87855, hair: 0x49332b, shirt: 0x67939d, pants: 0x4e6457, scale: 1.035,
  });
  part(dad.head, 0x54352c, 0, -.056, .19, .199, .056, .049, 'ball');
  solid(-4.58, -4.1, .52, .48, 1.75);
  const bird = group('Bird in the cage', cageX, 1.34, cageZ, scene);
  part(bird, 0xe9ae49, 0, .11, 0, .27, .28, .225, 'ball');
  part(bird, 0xeab352, 0, .275, .073, .219, .205, .211, 'ball');
  part(bird, 0xe47446, 0, .249, .201, .092, .072, .13, 'facet');
  part(bird, 0x7a9a70, 0, .072, -.17, .14, .075, .29, 'facet').rotation.x = -.27;
  const wings = [-1, 1].map(side => {
    part(bird, ink, side * .087, .306, .129, .032, .036, .031, 'ball');
    part(bird, gold, side * .058, .013, .08, .039, .085, .079, 'ball');
    return part(bird, 0x7cab78, side * .115, .119, -.023, .12, .167, .24, 'ball');
  });

  const boy = person(builder, scene, 'Boy sleeping in the blue bedroom', {
    x: -4.56, y: UPSTAIRS + .87, z: -2.81, skin: 0xd99a71, hair: 0x63402c, shirt: 0x739fcb, pants: 0x598399, scale: .68,
  });
  const girl = person(builder, scene, 'Girl playing with dolls', {
    x: 2.52, y: UPSTAIRS - .09, z: -3.86, skin: 0xc28761, hair: 0x57402e, shirt: 0xc27a9a, pants: 0x8d659d, scale: .72,
  });
  for (const side of [-1, 1]) {
    part(girl.head, 0x57402e, side * .207, .066, -.052, .22, .24, .22, 'ball');
    part(girl.head, rose, side * .267, .125, .002, .115, .091, .08, 'ball');
  }
  const girlBed = group('Rose bedroom bed', 4.72, UPSTAIRS, -3.72);
  part(girlBed, oak, 0, .29, 0, 1.62, .37, 2.56);
  part(girlBed, plum, 0, .68, -1.22, 1.75, 1.31, .15);
  part(girlBed, linen, 0, .53, 0, 1.58, .22, 2.47);
  part(girlBed, rose, 0, .66, .38, 1.59, .12, 1.58);
  part(girlBed, cream, 0, .74, -.83, 1.18, .18, .43, 'ball');
  for (const x of [-.45, 0, .45]) part(girlBed, gold, x, .732, .75, .13, .022, .13).rotation.y = Math.PI / 4;
  solid(4.72, -3.72, 1.76, 2.62, UPSTAIRS + 1.45, UPSTAIRS);

  const spacePicture = group('Blue bedroom planets', -7.19, UPSTAIRS + 1.94, -5.275);
  part(spacePicture, walnut, 0, 0, 0, 1.36, .86, .09);
  part(spacePicture, 0x365677, 0, 0, .057, 1.23, .73, .034);
  part(spacePicture, gold, -.23, -.03, .081, .32, .29, .032, 'ball');
  part(spacePicture, rose, -.23, -.03, .105, .47, .045, .028).rotation.z = -.32;
  part(spacePicture, blue, .28, .12, .081, .23, .23, .03, 'ball');
  for (const [x, y] of [[-.45, .19], [.45, -.17], [.12, -.2]]) {
    part(spacePicture, linen, x, y, .083, .045, .05, .023).rotation.z = Math.PI / 4;
  }
  const rosePicture = group('Rose bedroom flowers', 5.22, UPSTAIRS + 1.84, -5.275);
  part(rosePicture, plum, 0, 0, 0, .83, .93, .09);
  part(rosePicture, linen, 0, 0, .056, .7, .80, .031);
  part(rosePicture, teal, 0, -.13, .08, .045, .32, .022);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    part(rosePicture, rose, .12 * Math.cos(a), .18 + .12 * Math.sin(a), .081, .18, .16, .04, 'ball');
  }
  part(rosePicture, gold, 0, .18, .101, .13, .12, .025, 'ball');

  rug(builder, 2.21, -3.12, 2.85, 2.84, plum, 0xe8b9c9, UPSTAIRS);
  const dollhouse = group('Rose bedroom dollhouse', .94, UPSTAIRS, -4.74);
  part(dollhouse, plum, 0, .42, 0, 1.09, .84, .53);
  for (const side of [-1, 1]) {
    part(dollhouse, rose, side * .252, .93, 0, .64, .105, .6).rotation.z = -side * .45;
    part(dollhouse, mint, side * .29, .595, .273, .26, .25, .034);
  }
  part(dollhouse, cream, 0, .22, .28, .28, .44, .042);
  solid(.94, -4.74, 1.15, .6, UPSTAIRS + 1.12, UPSTAIRS);
  const dolls = [rose, blue, gold].map((tint, i) => {
    const doll = group('Doll ' + (i + 1), 1.83 + i * .55, UPSTAIRS, -2.86, scene);
    part(doll, tint, 0, .16, 0, .23, .29, .21, 'taper');
    part(doll, 0xedb586, 0, .355, .01, .179, .175, .174, 'ball');
    part(doll, walnut, 0, .419, -.02, .18, .107, .166, 'ball');
    for (const side of [-1, 1]) part(doll, ink, side * .036, .368, .089, .022, .026, .021, 'ball');
    return doll;
  });
  solid(2.52, -3.82, .57, .57, UPSTAIRS + 1.31, UPSTAIRS);

  let time = 0;
  let stirring = 0;
  let waving = 0;
  let singing = 0;
  let playing = 0;
  let awake = false;
  const ease = t => t * t * (3 - 2 * t);
  const task = (id, label, hint, x, z, floor, anchorY, radius, duration, sound, render) =>
    ({ id, label, hint, x, z, floor, anchorY: floor + anchorY, radius, duration, sound, render });

  const tasks = {
    door: task('door', 'Open front door', 'Walk up the garden path and look at the front door.', 0, FRONT, 0, 1.27, 2.6, .68,
      [cue(54, 37, .18, .16), cue(67, 51, .11, .09, .36)], t => { door.rotation.y = 1.63 * ease(t); }),
    mother: task('mother', 'Help Mom stir the soup', 'Find Mom at the stove beside the downstairs sink.', 4.44, -3.30, 0, 1.14, 2.35, 1.25,
      [cue(51, 68, .12, .10), cue(54, 76, .15, .11, .26), cue(68, 79, .2, .10, .68)], (t, moving) => {
        stirring = moving ? Math.sin(t * Math.PI) : 0;
      }),
    table: task('table', 'Set the dining table', 'Look at the dining table with four chairs on the ground floor.', tableX, tableZ, 0, 1.03, 2.7, .95,
      [cue(81, 73, .11, .13), cue(84, 76, .12, .12, .24), cue(88, 81, .13, .10, .48)], t => {
        plates.forEach((plate, i) => {
          const p = ease(Math.min(1, Math.max(0, t * 1.6 - i * .17)));
          const x = i % 2 ? .64 : -.64;
          const z = i < 2 ? -.32 : .32;
          plate.position.set(x * p, 1.01 + i * .055 * (1 - p) + Math.sin(p * Math.PI) * .17, z * p);
        });
      }),
    father: task('father', 'Whistle with Dad', 'Find Dad beside the birdcage on the ground floor.', -4.58, -4.10, 0, 1.29, 2.15, 1.1,
      [cue(74, 81, .15, .14), cue(79, 84, .17, .12, .18), cue(85, 93, .14, .10, .53)], (t, moving) => {
        waving = moving ? Math.sin(t * Math.PI) : 0;
        singing = waving;
      }),
    bird: task('bird', 'Feed the bird', 'Look at the seed bowl in the cage beside Dad.', cageX, cageZ, 0, 1.52, 2.1, 1,
      [cue(90, 96, .085, .12), cue(86, 94, .10, .11, .14), cue(92, 100, .13, .09, .36)], (t, moving) => {
        seed.visible = t > .10;
        singing = moving ? Math.sin(t * Math.PI) : 0;
      }),
    wake: task('wake', 'Gently wake the boy', 'Climb the stairs on the right and find the boy sleeping in the blue bedroom.', -4.56, -3.38, UPSTAIRS, 1.02, 2.9, 1.10,
      [cue(61, 67, .22, .11), cue(72, 76, .24, .10, .34), cue(76, 81, .29, .10, .64)], t => {
        awake = t >= 1;
        const p = ease(t);
        boy.root.position.set(-4.56 - 1.42 * p, UPSTAIRS + .87 * (1 - p), -2.81 - 1.15 * p);
        boy.root.rotation.set(-Math.PI / 2 * (1 - p), -.27 * p, 0);
        boy.eyes.forEach(eye => { eye.scale.y = .009 + p * .043; });
      }),
    girl: task('girl', 'Play dolls with the girl', 'Upstairs, enter the rose bedroom and look at the girl beside her dollhouse.', 2.36, -3.14, UPSTAIRS, .72, 2.15, 1.5,
      [cue(76, 81, .16, .12), cue(81, 85, .17, .13, .22), cue(84, 91, .19, .12, .51), cue(88, 92, .23, .10, .77)], (t, moving) => {
        playing = moving ? Math.sin(t * Math.PI) : 0;
      }),
  };
  tasks.wake.approach = player => player.z < -.80 && player.x < 0;
  tasks.girl.approach = player => player.z < -.80 && player.x > 0;

  function pose(still) {
    const t = still ? 0 : time;
    mother.root.rotation.y = Math.PI - .23 - stirring * .16;
    mother.arms[0].rotation.set(-.83, 0, -.22);
    mother.arms[1].rotation.set(-1.15 + Math.sin(t * (4 + stirring * 3)) * .22, 0, .16 + Math.cos(t * 4) * .16);
    mother.head.rotation.x = .14 + stirring * .17;
    wisps.forEach((wisp, i) => {
      const rise = (t * .53 + i / 3) % 1;
      wisp.position.set(Math.sin(t * 1.8 + i) * .16, .075 + rise * .56, .10);
      wisp.scale.setScalar(.13 * Math.sin(rise * Math.PI));
    });
    dad.root.rotation.y = -1.71;
    dad.head.rotation.y = .12 + Math.sin(t * 1.3) * .15;
    dad.arms[0].rotation.set(-.95 - waving * .39, 0, -.29 + Math.sin(t * 4) * .21);
    dad.arms[1].rotation.z = .12;
    const hop = Math.abs(Math.sin(t * 2.8));
    bird.position.set(cageX + Math.sin(t * 1.35) * .18, 1.34 + (hop ** 10) * (.09 + singing * .31), cageZ);
    bird.rotation.y = Math.sin(t * 1.26) * 1.18 + .5;
    wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * singing * Math.sin(t * 17) * .67; });
    if (!awake) boy.head.rotation.z = Math.sin(t * 1.35) * .045;
    else boy.head.rotation.z = .03;
    girl.root.rotation.y = -.18;
    girl.legs.forEach((leg, i) => { leg.rotation.x = -1.19; leg.rotation.z = i ? .26 : -.26; });
    girl.arms[0].rotation.x = -1.01 + .23 * Math.sin(t * 3.2);
    girl.arms[1].rotation.x = -.76 - .42 * Math.sin(t * 3.2);
    girl.head.rotation.x = .18 + Math.sin(t * 2.1) * .08;
    dolls.forEach((doll, i) => {
      const bounce = (i === 1 ? .19 : .03) + .24 * playing;
      doll.position.y = UPSTAIRS + bounce * Math.max(0, Math.sin(t * 3.2 + i * 1.8));
      doll.rotation.y = .18 + Math.sin(t * 2 + i) * (.23 + playing);
    });
  }

  return {
    tasks,
    get awake() { return awake; },
    blocks(x, z, radius, feet) {
      if (feet >= 2.32) return false;
      const dx = x - door.position.x;
      const dz = z - door.position.z;
      const cos = Math.cos(door.rotation.y);
      const sin = Math.sin(door.rotation.y);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      const gapX = Math.max(0, -localX, localX - 1.86);
      const gapZ = Math.max(0, Math.abs(localZ) - .09);
      return Math.hypot(gapX, gapZ) < radius;
    },
    update(dt, still) {
      time += dt;
      pose(still);
    },
    reset() {
      time = 0;
      pose(true);
    },
  };
}
