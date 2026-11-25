import { footprint, gateHalfWidth, gateZ, perimeterCap } from './layout.js';
import { crack, exposedBrick, ink, laundry, roof } from './masonry.js';

const gatePierWidth = .77;
const gatePierX = gateHalfWidth + gatePierWidth / 2;

function perimeterWall(kit, layout, random, x1, z1, x2, z2) {
  const { wall } = kit;
  const width = Math.hypot(x2 - x1, z2 - z1);
  const x = (x1 + x2) / 2;
  const z = (z1 + z2) / 2;
  const yaw = Math.atan2(z1 - z2, x2 - x1);
  const draw = wall(x, z, yaw);
  draw(ink.plaster, 0, .87, 0, width + .10, 1.74, .52);
  draw(ink.cream, 0, perimeterCap.height - .09, 0, width + .17, .18, perimeterCap.width);
  draw(ink.band, 0, .17, 0, width + .12, .34, .63);
  layout.perimeter(x1, z1, x2, z2);
  const bays = Math.floor(width / 3.1);
  for (let i = 0; i < bays; i++) {
    const u = ((i + .5) / bays - .5) * width;
    draw(ink.band, u, .99, 0, .39, 1.98, .68);
    draw(ink.stone, u, 1.99, 0, .52, .12, .76);
    for (const v of [-1, 1]) {
      const face = wall(x + .264 * Math.sin(yaw) * v, z + .264 * Math.cos(yaw) * v,
        v === 1 ? yaw : yaw + Math.PI);
      const patchX = (u + width / bays * (i % 2 ? .27 : -.27)) * v;
      face.chip(0xa78a72, patchX, .78, .012, 1.62, 1.20, i * .19);
      if (i % 4 !== 2) {
        exposedBrick(face, patchX, .60 + random() * .36, .87 + random() * .96, .63 + random() * .59, random);
      }
      if (i % 2 === 0) crack(face, patchX + .45, .53, 1.16);
    }
  }
}

function pavedYard(kit, random, coverKit, craterPolygon, craterContains) {
  const { beam } = kit;
  kit.ground(craterPolygon);
  if(coverKit)coverKit.groundCover(craterPolygon);
  const pavers = [0xa18c78, 0xb0987e, 0xaa9482, 0xb6a18a, 0x988575, 0xb7a087];
  const [rearX, rearZ] = footprint[1];
  const [shoulderX, shoulderZ] = footprint[2];
  const [frontX, frontZ] = footprint[3];
  const firstRow = rearZ + 1.2;
  const rowSpacing = 1.06;
  const rows = Math.floor((frontZ - .62 - firstRow) / rowSpacing) + 1;
  for (let row = 0; row < rows; row++) {
    const z = firstRow + row * rowSpacing;
    const edge = z < shoulderZ
      ? rearX + (shoulderX - rearX) * (z - rearZ) / (shoulderZ - rearZ)
      : shoulderX + (frontX - shoulderX) * (z - shoulderZ) / (frontZ - shoulderZ);
    for (let col = -22; col <= 22; col++) {
      const x = col * 1.28 + (row % 2) * .55;
      if (Math.abs(x) > edge - .77) continue;
      const pavingKit=coverKit&&craterContains(x,z,.85)?coverKit:kit;
      const {box}=pavingKit;
      const path = Math.abs(x) < 2.6 || z < -6 || z > 8.3 || Math.abs(x) > 13 + (z + 7.5) * .48;
      const paint = pavers[Math.floor(random() * pavers.length)];
      if (random() < (path ? .84 : .14)) {
        if (random() < .20) {
          pavingKit.pavement(paint, x, z, .68 + random() * .55, .67 + random() * .35, random() * 6);
        } else {
          box(paint, x, -.044, z, 1.16 + random() * .07, .09 + random() * .019, .96, (random() - .5) * .048, 0, 0, false);
        }
      } else if (random() < .38) {
        pavingKit.pavement(paint, x, z, .75 + random() * .44, .54 + random() * .39, random() * 6);
      }
    }
  }

  for (const [[x1, z1], [x2, z2]] of footprint.map((point, i) => [point, footprint[(i + 1) % footprint.length]])) {
    beam(0x867362, x1, -.16, z1, x2, -.16, z2, .30);
  }
}

function openShop(kit, layout, x, z, width, depth, height, plaster, produce, barber = false, candy = false) {
  const { box, drum, leaf } = kit;
  const wall = .24;
  const openHeight = 2.24;
  for (const side of [-1, 1]) {
    const edge = x + side * (width - wall) / 2;
    box(plaster, edge, height / 2, z, wall, height, depth);
    layout.solid(edge, z, wall, depth, height);
  }
  box(plaster, x, height / 2, z + (depth - wall) / 2, width - 2 * wall, height, wall);
  layout.solid(x, z + (depth - wall) / 2, width, wall, height);
  box(ink.wood, x, (height + openHeight) / 2, z - (depth - wall) / 2,
    width - 2 * wall, height - openHeight, wall);
  box(0x8d7561, x, height - .116, z, width - 2 * wall, .22, depth - 2 * wall);
  box(0x927b67, x, .023, z, width - 2 * wall, .048, depth - wall);

  layout.addCeiling(x, z, width - 2 * wall, depth - 2 * wall, height - .226, 0);
  if (barber) {
    // One old-fashioned barber chair, mirror, counter and striped barber pole.
    const chairX = x + .62, chairZ = z + .12;
    drum(0x4b4945, chairX, .07, chairZ, .69, .14, .69);
    drum(0x766f62, chairX, .34, chairZ, .24, .45, .24);
    box(0x4d3b32, chairX, .59, chairZ, .65, .15, .62);
    box(0x803e35, chairX, .69, chairZ, .59, .14, .57);
    box(0x803e35, chairX, 1.03, chairZ + .26, .59, .65, .15, 0, -.14);
    box(0x57382e, chairX, 1.39, chairZ + .30, .30, .16, .13);
    for (const s of [-1, 1]) {
      box(0x655b4d, chairX + s*.30, .81, chairZ, .07, .28, .075);
      box(ink.wood, chairX + s*.30, .95, chairZ, .11, .09, .53);
    }
    box(0x615a50, chairX, .37, chairZ - .49, .52, .07, .34);
    box(0x615a50, chairX, .49, chairZ - .32, .08, .30, .09, 0, -.25);
    layout.solid(chairX, chairZ - .12, .76, 1.12, 1.48);
    const rear = z + depth/2 - wall;
    box(ink.wood, chairX, 1.64, rear - .038, .94, 1.05, .076);
    box(0x9aa6a2, chairX, 1.64, rear - .085, .79, .90, .024);
    box(0xb7c3be, chairX - .23, 1.78, rear - .105, .06, .48, .012, 0, 0, -.34);
    box(ink.wood, chairX, 1.02, rear - .25, 1.30, .11, .49);
    layout.solid(chairX, rear - .25, 1.30, .49, 1.08);
    for (let j=0;j<3;j++) drum([0x77684d,0xd2bd93,0x526a5d][j], chairX-.31+j*.19, 1.16, rear-.27, .095,.16,.095);
    const poleX=x-width/2+.31, poleZ=z-depth/2-.08;
    for (let j=0;j<8;j++) drum([0xa94d44,0xe2d4b6,0x526c78,0xe2d4b6][j%4],
      poleX, .94+j*.14,poleZ,.16,.14,.16);
    for(const y of [.83,2.04]) drum(ink.iron,poleX,y,poleZ,.22,.10,.22);
    return;
  }
  if (candy) {
    const shelfZ=z+depth/2-.49;
    for(const y of [.60,1.12,1.68]){
      box(0x9e6951,x,y,shelfZ,width-.88,.09,.46);
      for(let j=0;j<7;j++){
        const u=x+(j-3)*.43;
        drum(0xe5c7a1,u,y+.19,shelfZ,.28,.29,.28);
        for(let k=0;k<3;k++)drum([0xe14d48,0xe8bc48,0x68a66e,0x4a83bc][(j+k)%4],u+(k-1)*.07,y+.34+k*.025,shelfZ,.072,.09,.072);
      }
    }
    layout.solid(x,shelfZ,width-.88,.46,2.0);
    box(0xa96855,x-.97,.43,z-.33,1.20,.86,.82);
    box(0xe2bd86,x-.97,.90,z-.33,1.30,.08,.94);
    layout.solid(x-.97,z-.33,1.30,.94,.94);
    return;
  }
  const shelfZ = z + depth / 2 - .49;
  const shelfWidth = width - .86;
  for (const dy of [.63, 1.16, 1.72]) {
    box(0x816549, x, dy, shelfZ, shelfWidth, .105, .52);
    for (let i = 0; i < 6; i++) {
      const u = x + (i - 2.5) * shelfWidth / 7;
      const tall = (i % 3 + 2) * .07;
      const paint = [0xa37f51, 0x715e4d, 0xb19471, 0x728078][(i + (produce ? 0 : 2)) % 4];
      drum(paint, u, dy + .053 + tall / 2, shelfZ, .24, tall, .24);
      drum(ink.band, u, dy + .064 + tall, shelfZ, .19, .045, .19);
    }
  }
  for (const side of [-1, 1]) {
    box(ink.wood, x + side * shelfWidth / 2, .98, shelfZ, .095, 1.97, .49);
  }
  layout.solid(x, shelfZ, shelfWidth, .52, 2);

  const counterX = x + (produce ? .96 : -.99);
  const counterZ = z - .42;
  box(0x715440, counterX, .40, counterZ, 1.20, .8, 1.23);
  box(0xa68962, counterX, .835, counterZ, 1.30, .12, 1.32);
  layout.solid(counterX, counterZ, 1.30, 1.32, .92);
  for (const dz of [-.34, .16]) {
    box(0x826344, counterX, .923, counterZ + dz, 1.09, .095, .37);
    for (let j = 0; j < 5; j++) {
      const u = counterX + (j - 2) * .174;
      if (produce) {
        leaf(dz < 0 ? 0xb87c39 : 0x81884a, u, 1.031, counterZ + dz, .155, .14, .17);
      } else {
        drum(j % 2 ? 0xa4866c : 0x7f6956, u, 1.066, counterZ + dz, .13, .19 + j % 2 * .04, .13);
      }
    }
  }
}

function ruinedShop(kit, layout, x, z, width, depth, height, plaster, random) {
  const { box, beam, wall } = kit;
  const left = x - width / 2;
  const back = z + depth / 2 - .16;
  function section(cx, cz, w, d, h) {
    box(plaster, cx, h / 2, cz, w, h, d);
    layout.solid(cx, cz, w, d, h);
  }

  section(left + .16, z, .32, depth, height);
  section(left + .32 + 1.02, back, 2.04, .31, height);
  section(x + width / 2 - .64, back, 1.28, .31, 1.06);
  section(x + width / 2 - .16, z - .16, .30, depth - .67, .76);

  const facade = wall(x, back + .158, 0);
  exposedBrick(facade, -.83, 1.72, 1.3, 2.13, random);
  crack(facade, -.53, 1.12, 1.91);
  const roofZ = z - .42;
  for (let i = 0; i < 7; i++) {
    box(i % 2 ? ink.roof : ink.ridge, left + (i + .5) * .29, height + .12, z,
      .283, .14, depth + .39, 0, .16, .022 * (i % 3));
  }
  for (let i = 0; i < 3; i++) {
    const u = z + (i - 1) * .96;
    beam(ink.wood, x - .85, height - .18, u, x + .57 + i * .23, height - .37 - i * .29, u + .15, .16);
  }
  beam(ink.wood, left + .47, .07, roofZ, x + .92, 1.43, z + .72, .18);
  for (let i = 0; i < 22; i++) {
    const u = left + .45 + random() * (width - .80);
    const v = z - depth / 2 + .37 + random() * (depth - .49);
    const size = .16 + random() * .34;
    box(i % 3 ? ink.brick : ink.stone, u, size * .24, v, size, size * .48, size * .76, random() * 4, .17, .25);
  }
}

function shops(kit, layout, random) {
  const { box, wall, drum } = kit;
  const buildings = [
    { x: -11.8, z: 10.65, width: 4.45, depth: 3.3, height: 2.95, awning: 0x9b5149, plaster: 0xb89674, faceY: Math.PI },
    { x: 12.65, z: 10.65, width: 4.9, depth: 3.15, height: 3.18, awning: 0xc65b68, plaster: 0xd1b19a, faceY: Math.PI },
    { x: -23.85, z: 10.85, width: 3.75, depth: 3.45, height: 4.12, awning: 0xa36d51, plaster: 0xa98468, faceY: Math.PI },
    { x: 23.80, z: 10.85, width: 3.9, depth: 3.40, height: 3.66, awning: 0x956462, plaster: 0xb59b85, faceY: Math.PI },
    { x: -20.75, z: -4.35, width: 2.95, depth: 4.35, height: 3.85, awning: 0x7a6e55, plaster: 0xab8e75, faceY: Math.PI },
    { x: 22.80, z: .6, width: 3, depth: 4.0, height: 4.75, awning: 0x875a49, plaster: 0xaa886f, faceY: 0 },
  ];
  for (const [i, { x, z, width, depth, height, awning, plaster, faceY }] of buildings.entries()) {
    if (i === 0 || i === 2) continue; // Replaced by the three wall-side kiosks below.
    if (i === 3) {
      ruinedShop(kit, layout, x, z, width, depth, height, plaster, random);
      continue;
    }
    const opened = i < 2;
    if (opened) openShop(kit, layout, x, z, width, depth, height, plaster, i === 0, false, i === 1);
    else {
      box(plaster, x, height / 2, z, width, height, depth);
      layout.solid(x, z, width, depth, height);
    }
    const direction = Math.cos(faceY);
    const facade = wall(x, z + direction * depth / 2, faceY);
    const back = wall(x, z - direction * depth / 2, faceY + Math.PI);
    const flank = wall(x + width / 2, z, Math.PI / 2);
    for (const draw of opened ? [back, flank] : [facade, back, flank]) {
      draw(ink.band, 0, .19, .025, draw === flank ? depth : width, .38, .075);
      draw.chip(0x917760, -.64, 1.33, .012, 1.93, 2.73);
      exposedBrick(draw, -.86, .99, 1.25, 1.51, random);
      crack(draw, .96, .64, 1.48, i % 2 ? 1 : -1);
    }
    back(ink.shade, .55, 1.28, .04, 1.35, 1.38, .11);
    back(awning, .55, 1.28, .107, 1.24, 1.26, .07);
    for (const u of [-.39, 0, .39]) back(ink.pane, .55 + u, 1.28, .154, .32, 1.05, .039);
    back(ink.wood, .55, .59, .143, 1.52, .12, .28);
    for (let stripe = -3; stripe <= 3; stripe++) {
      back(stripe % 2 ? ink.linen : awning, .55 + stripe * .22, 2.12, .34, .214, .05, .67, .25);
    }
    if (!opened) {
      facade(ink.dark, .06, 1.10, .057, width * .65, 2.19, .13);
      for (let plank = 0; plank < 9; plank++) {
        const u = .06 + (plank - 4) * width * .067;
        facade([ink.wood, 0x85664d, 0x765442][(i + plank) % 3], u, 1.04, .139, width * .061, 1.95, .085);
      }
      facade(ink.band, .06, 1.75, .185, width * .63, .096, .06, 0, .042);
    }
    facade(0x493e36, .06, 2.31, .124, width * .56, .35, .10);
    facade(awning, .06, 2.32, .194, width * .51, .25, .052, 0, -.029);
    if (i === 1) facade.label('糖果店', .06, 2.32, .239, 1.22, .19);
    if (height > 3.4) {
      facade(ink.shade, .35, height - .67, .033, 1.12, .83, .08);
      for (let j = -1; j <= 1; j++) facade(0x7c8881, .35 + j * .28, height - .67, .091, .25, .68, .04);
      facade(ink.band, .35, height - 1.13, .12, 1.25, .12, .26);
    }
    for (let stripe = -5; stripe <= 5; stripe++) {
      const paint = stripe % 2 ? 0xc7ad94 : awning;
      const u = stripe * width / 15;
      facade(paint, u, 2.39 - Math.abs(stripe) * .007, .59, width / 15 - .006, .056, 1.15, .28);
      facade(paint, u, 2.19 - Math.abs(stripe) * .007, 1.145, width / 15 - .011, .16 + (stripe % 3) * .028, .046);
    }
    const lanternZ = z + direction * (depth / 2 + .66);
    const lanternX = x - direction * width * .37;
    drum(0x9f4233, lanternX, 2.01, lanternZ, .28, .33, .28);
    drum(ink.band, lanternX, 2.20, lanternZ, .16, .064, .16);
    box(ink.brass, lanternX, 1.79, lanternZ, .038, .12, .038);

    if (i === 5) {
      const roofFace = wall(x, z, 0);
      for (let j = -7; j <= 7; j++) {
        roofFace(j % 3 === 0 ? 0x7c6553 : 0x67574d, j * (width + .54) / 15,
          height + .13 + (j % 4) * .015, 0, (width + .50) / 15, .13, depth + .60, .15, .032);
      }
    } else {
      roof(wall(x, z, 0), width + .6, depth + .63, height, random);
      for (const end of [-1, 1]) {
        kit.gable(plaster, x + end * width / 2, height, z, depth, Math.tan(.29) * depth / 2, .15, -end * Math.PI / 2);
      }
    }
  }
}

function wallKiosks(kit, layout, random) {
  const depth = 3.30, width = 3.65, z = gateZ - .33 - depth/2;
  // Front-west perimeter: backs touch the inside face of the existing wall.
  // The three entrances all face the courtyard (negative Z).
  const kiosks = [
    { x: -17.80, height: 3.15, paint: 0xb89a76, awning: 0x9b5149, kind: 'produce' },
    { x: -13.85, height: 3.05, paint: 0xb7a486, awning: 0x64786c, kind: 'barber' },
    { x: -9.90, height: 3.22, paint: 0xa98468, awning: 0xa36d51, kind: 'dry-goods' },
  ];
  for (const {x,height,paint,awning,kind} of kiosks) {
    openShop(kit,layout,x,z,width,depth,height,paint,kind==='produce',kind==='barber');
    const facade=kit.wall(x,z-depth/2,Math.PI);
    facade(ink.band,0,2.56,.036,width,.14,.12);
    facade(ink.wood,0,2.39,.135,2.15,.28,.10);
    facade(awning,0,2.39,.196,2.02,.19,.025);
    for(let j=-5;j<=5;j++){
      facade(j%2?ink.linen:awning,j*.30,2.22,.43,.295,.06,.85,.25);
      facade(j%2?ink.linen:awning,j*.30,2.08,.84,.295,.14,.05);
    }
    facade(ink.band,-width/2+.13,1.14,.055,.16,2.18,.12);
    facade(ink.band,width/2-.13,1.14,.055,.16,2.18,.12);
    exposedBrick(kit.wall(x+width/2,z,Math.PI/2),-.35,1.24,.82,.94,random);
    roof(kit.wall(x,z,0),width+.24,depth+.24,height,random);
    for(const end of [-1,1]) kit.gable(paint,x+end*width/2,height,z,depth,Math.tan(.29)*depth/2,.13,-end*Math.PI/2);
  }
}

function courtyardProps(kit, layout, random) {
  const { box, drum, leaf, beam } = kit;
  for (const [x, z, size] of [
    [-5.8, -4.7, .85], [6.4, -6.2, 1], [-9, 7.85, .88],
    [9.65, 7.98, .77], [15.65, 11.68, .92], [-22.0, 8.15, .9],
    [gatePierX + 1.3, gateZ - .73, 1.07], [-gatePierX - 1.25, gateZ - .81, .80],
  ]) {
    drum(0x8c614b, x, size * .29, z, size * .58, size * .58, size * .58);
    drum(0x64513c, x, size * .55, z, size * .52, size * .10, size * .52);
    layout.solid(x, z, size * .58, size * .58, size * .58);
    for (let i = 0; i < 7; i++) {
      const yaw = i * Math.PI * 2 / 7;
      const dx = Math.sin(yaw) * size * (.24 + random() * .24);
      const dz = Math.cos(yaw) * size * (.24 + random() * .24);
      const y = size * (.80 + random() * .55);
      beam(0x626547, x, size * .53, z, x + dx, y, z + dz, .043);
      leaf([0x626f47, 0x777d4e, 0x8c8a4f][i % 3],
        x + dx, y, z + dz, size * .24, size * .12, size * .50, yaw, -.34);
    }
  }

  for (const [x, z] of [[-14.48, 11.25], [15.69, 10.42], [-21.68, 11.55], [21.35, 9.7], [7.6, -6.65]]) {
    box(0x806349, x, .34, z, .70, .68, .65);
    box(0xa37d54, x, .695, z, .72, .073, .67);
    for (const side of [-1, 1]) {
      box(0x624b39, x + side * .23, .34, z + .337, .085, .66, .041);
      box(0x624b39, x, .34 + side * .22, z + .339, .70, .070, .044);
    }
    layout.solid(x, z, .72, .67, .73);
  }

  for (const [x, z, spread] of [[-9.1, -6.48, 1.5], [9.3, -6.45, 1.4], [-12.5, 8.14, .92], [13.28, 8.01, .88]]) {
    for (let i = 0; i < 6; i++) {
      const px = x + (random() - .5) * spread;
      const pz = z + (random() - .5) * .8;
      const yaw = random() * Math.PI;
      if (i % 2) box(0xb4a48a, px, .022 + i * .004, pz, .14 + random() * .12, .009, .13, yaw, .06, 0, false);
      else kit.pavement(0x8a7560, px, pz, .42, .31, yaw);
    }
  }

  // A rack in the yard and a low wooden bench under the rear galleries.
  for (const x of [9.0, 12.12]) {
    box(0x977757, x, .96, 3.22, .11, 1.92, .12, 0, 0, .035);
    beam(ink.wood, x, 0, 2.69, x, .96, 3.22, .082);
    beam(ink.wood, x, 0, 3.76, x, .96, 3.22, .082);
    layout.solid(x, 3.22, .11, .12, 1.92);
  }
  laundry(kit.wall(10.56, 3.22, 0), 0, 1.81, 0, 3);
  box(ink.wood, -5.78, .47, -8.71, 1.80, .13, .43);
  for (const x of [-6.44, -5.13]) box(ink.band, x, .21, -8.71, .15, .42, .32);
  layout.solid(-5.78, -8.71, 1.8, .43, .54);
}

export function courtyard(kit, layout, random, coverKit, craterPolygon, craterContains) {
  const { box, drum, ring, beam } = kit;
  pavedYard(kit, random, coverKit, craterPolygon, craterContains);
  const edges = footprint.map((point, i) => [point, footprint[(i + 1) % footprint.length]]);
  for (const [[x1, z1], [x2, z2]] of edges) {
    if (z1 === gateZ && z2 === gateZ) {
      perimeterWall(kit, layout, random, x1, z1, gatePierX, gateZ);
      perimeterWall(kit, layout, random, -gatePierX, gateZ, x2, z2);
      continue;
    }
    perimeterWall(kit, layout, random, x1, z1, x2, z2);
  }
  for (const side of [-1, 1]) {
    const x = side * gatePierX;
    box(ink.band, x, 1.575, gateZ, gatePierWidth, 3.15, .87);
    layout.solid(x, gateZ, gatePierWidth, .87, 3.15);
    box(ink.cream, x, 3.15, gateZ, .95, .19, 1.02);
    drum(ink.band, x, 3.44, gateZ, .35, .40, .35);
    const face = kit.wall(x, gateZ + .437, 0);
    exposedBrick(face, 0, 1.14, .74, 1.68, random);
  }
  shops(kit, layout, random);
  wallKiosks(kit, layout, random);
  courtyardProps(kit, layout, random);

  // A wrought-iron arch with two closed gate leaves.
  function archY(x) { return 3.10 + 1.62 * (1 - (x / gatePierX) ** 2); }
  const archSegments = Math.ceil(2 * gatePierX / .40);
  const archPoints = Array.from({ length: archSegments + 1 }, (_, i) => gatePierX * (2 * i / archSegments - 1));
  for (const [offset, height, depth] of [[0, .135, .151], [-.43, .083, .108]]) {
    const top = archPoints.map(x => [x, archY(x) + offset + height / 2]);
    const bottom = archPoints.map(x => [x, archY(x) + offset - height / 2]).reverse();
    kit.extrude('Gate arch strip', ink.iron, [...top, ...bottom], depth, 0, 0, gateZ - depth / 2);
  }
  for (let i = 0; i < archPoints.length - 1; i++) {
    const a = archPoints[i];
    const b = archPoints[i + 1];
    beam(ink.iron, a, archY(a) - .43, gateZ, b, archY(b), gateZ, .066);
  }
  for (const [i, letter] of Array.from('永安里').entries()) {
    const x = (i - 1) * 1.16;
    const y = archY(x) - .15;
    drum(ink.wood, x, y, gateZ, 1.00, .18, 1.00, 0, Math.PI / 2);
    drum(0xb5956c, x, y, gateZ, .87, .196, .87, 0, Math.PI / 2);
    kit.gateLetter(letter, x, y, gateZ);
  }
  const centerGap = .045;
  const leafWidth = gateHalfWidth - centerGap;
  const barCount = Math.ceil(leafWidth / .26);
  for (const side of [-1, 1]) {
    const leafX = side * (gateHalfWidth + centerGap) / 2;
    box(ink.iron, leafX, .34, gateZ, leafWidth, .44, .13);
    box(ink.iron, leafX, 1.30, gateZ, leafWidth, .08, .12);
    beam(ink.iron, side * .128, .50, gateZ, side * (gateHalfWidth - .068), 1.96, gateZ, .102);
    for (let i = 0; i < barCount; i++) {
      const x = centerGap + (i + .5) * leafWidth / barCount;
      const y = 2.42 + .22 * (1 - x / gateHalfWidth);
      const width = i === 0 || i === barCount - 1 ? .105 : .061;
      box(ink.iron, side * x, y / 2, gateZ, width, y, .074);
    }
  }
  layout.solid(0, gateZ, 2 * gateHalfWidth, .22, 3.12);

  // Stone well and timber frame relocated beside the west courtyard.
  const wellX = -11.12;
  const wellZ = 5.14;
  const wellY = -.04;
  kit.frame(wellX, wellY, wellZ, 0, () => {
  drum(ink.dark, 0, .08, 0, 1.73, .16, 1.73);
  ring(ink.band, 0, .45, 0, 2.03, .90, 2.03);
  ring(ink.shade, 0, .45, 0, 1.53, .90, 1.53);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 14; i++) {
      const angle = (i + (row % 2) / 2) * Math.PI * 2 / 14;
      const radius = row === 2 ? .895 : .90;
      box(i % 3 === 0 ? ink.cream : ink.stone, 0 + Math.sin(angle) * radius, .15 + row * .29,
        0 + Math.cos(angle) * radius, .385, .275, row === 2 ? .39 : .26, angle);
    }
  }
  layout.solid(wellX, wellZ, 2.13, 2.13, .89 + wellY);
  for (const side of [-1, 1]) box(ink.wood, 0 + side * 1.14, 1.31, 0, .16, 2.63, .17);
  for (const side of [-1, 1]) layout.solid(wellX + side * 1.14, wellZ, .16, .17, 2.63 + wellY);
  box(ink.wood, 0, 2.63, 0, 2.72, .19, .18);
  box(ink.brass, 0, 2.12, 0, .044, .86, .044);
  });
}
