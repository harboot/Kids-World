import { floorRise } from './layout.js';
import { crack, exposedBrick, ink } from './masonry.js';

const shopColors = [0x77604c, 0x46645e, 0x8c6550, 0x6c5f50, 0x786548];
const specialties = ['雜貨', '布店', '茶舖', '陶器', '米行'];
const boardColors = [0x6d4b35, 0x876445, 0x76573d, 0x997654];

export function marketRow(kit, layout, { x, z, yaw, span, bays, depth, side = 0 }, random) {
  const face = kit.wall(x, z, yaw);
  const spacing = span / bays;
  const recess = 1.85;
  const cos = Math.round(Math.cos(yaw));
  const sin = Math.round(Math.sin(yaw));
  function solid(u, v, width, length, height) {
    layout.solid(x + cos * u + sin * v, z - sin * u + cos * v,
      cos ? width : length, cos ? length : width, height, side);
  }

  const backDepth = depth - recess;
  const backCenter = -(depth + recess) / 2;
  face(ink.plaster, 0, floorRise / 2, backCenter, span, floorRise, backDepth);
  solid(0, backCenter, span, backDepth, floorRise);
  layout.addCeiling(x - sin * recess / 2, z - cos * recess / 2, cos ? span : recess,
    cos ? recess : span, floorRise, side);

  for (let i = 0; i < bays; i++) {
    const u = (i + .5) * spacing - span / 2;
    const open = i > 0 && i < bays - 1 && (bays < 5 || i % 2 === 0);
    const tailor = side === 1 && bays === 4 && i === 2;
    const paint = tailor ? 0x65776d : shopColors[i % shopColors.length];
    const opening = spacing - .91;
    const pier = .455;
    for (const s of [-1, 1]) {
      const edge = u + s * (spacing - pier) / 2;
      face(ink.plaster, edge, floorRise / 2, -recess / 2, pier, floorRise, recess);
      solid(edge, -recess / 2, pier, recess, floorRise);
    }
    face(ink.plaster, u, 2.91, -recess / 2, opening, .68, recess);
    face(paint, u, 2.48, .065, opening + .26, .27, .14);
    face(0xa99272, u, 2.51, .146, opening * .73, .178, .036);
    face.label(tailor ? '裁縫店' : specialties[i % specialties.length], u, 2.512, .18, .61, .186);
    face(ink.wood, u, .09, -.045, opening, .14, .18);

    for (const s of [-1, 1]) {
      face(paint, u + s * (opening / 2 - .048), 1.24, .025, .092, 2.18, .14);
    }
    if (open) {
      if (tailor) tailorShop(face, solid, u, opening);
      else stockedCounter(face, solid, u, opening, i, paint);
    } else {
      solid(u, -.83, opening, 1.76, floorRise);
      for (let plank = 0; plank < 11; plank++) {
        const w = (opening - .12) / 11;
        face(boardColors[(plank * 7 + i) % boardColors.length],
          u + (plank - 5) * w, 1.22, -.086, w - .012, 2.13, .11);
      }
      face(ink.wood, u, 1.6, -.01, opening - .16, .09, .06, 0, .028);
      face(ink.iron, u + .06, 1.03, .042, .26, .08, .07);
    }
    if (i % 2 === 0) {
      exposedBrick(face, u - spacing * .46, .67, .38, .92, random);
      crack(face, u + spacing * .44, .36, 1.32);
    }
  }
}

function stockedCounter(face, solid, x, width, index, paint) {
  const counterX = x + width * .22;
  const counterWidth = width * .51;
  face(ink.wood, counterX, .42, -.67, counterWidth, .82, .71);
  face(paint, counterX, .865, -.67, counterWidth + .07, .078, .77);
  solid(counterX, -.67, counterWidth + .07, .77, .905);
  for (let j = 0; j < 6; j++) {
    const u = counterX + (j - 2.5) * counterWidth * .14;
    face(j % 2 ? 0x9f7044 : 0xc2a978, u, 1.018, -.55, .15, .23, .145, 0, .09 * (j % 3 - 1));
    face(0xcebea1, u, 1.14, -.55, .14, .041, .13);
  }
  for (const y of [.66, 1.36, 1.94]) {
    face(ink.wood, x, y, -1.72, width - .20, .068, .30);
    for (let j = 0; j < 5; j++) {
      face(boardColors[(index + j) % boardColors.length], x + (j - 2) * width * .17,
        y + .155, -1.64, .30, .22, .19, 0, .045 * (j - 2));
    }
  }
  const px = x - width * .29;
  face(0x92704d, px, .23, -1.44, .48, .46, .38);
  face(0xb2a07d, px, .47, -1.44, .42, .086, .32);
  solid(px, -1.44, .48, .38, .5);
}

function tailorShop(face, solid, x, width) {
  const fabrics=[0x9b5949,0x8c9a84,0xb6a17b,0x53636d,0xd0c1a6];
  // Cutting table, folded cloth, and a treadle sewing machine on the right.
  const table=x+width*.25;
  face(ink.wood,table,.82,-.76,width*.43,.105,.68);
  for(const s of [-1,1]){
    face(ink.wood,table+s*width*.17,.40,-.76,.09,.75,.61);
    face(ink.iron,table+s*.18,.26,-.76,.05,.045,.47);
  }
  solid(table,-.76,width*.43,.68,.88);
  face(0x373735,table, .905,-.77,.53,.075,.34);
  face(0x303533,table+.18,1.09,-.77,.17,.31,.18);
  face(0x303533,table,1.22,-.77,.49,.12,.18);
  face(0x363b38,table-.21,1.13,-.77,.10,.15,.15);
  face(ink.iron,table-.22,1.025,-.77,.018,.12,.018);
  face(ink.brass,table+.27,1.09,-.77,.035,.21,.21);
  for(let j=0;j<3;j++)face(fabrics[j],table-.25,.91+j*.034,-.47,.28,.03,.24);
  // Two shelves, folded textiles and stacked fabric bolts.
  for(const y of [.47,1.02]){
    face(ink.wood,x,y,-1.68,width-.22,.07,.28);
    for(let j=0;j<6;j++){
      const u=x+(j-2.5)*width*.14;
      for(let k=0;k<3;k++)face(fabrics[(j+k)%5],u,y+.072+k*.07,-1.62,.31,.065,.24);
    }
  }
  for(let j=0;j<4;j++){
    const u=x-width*.40+j*.17;
    face(fabrics[j],u,.42,-1.15,.14,.78,.20,0,.04*(j-1.5));
    face(0xb49c7a,u,.83,-1.15,.12,.04,.16);
  }
  // Hanging jackets and shirts are readable from the courtyard.
  face(ink.wood,x-.08,2.12,-1.48,width-.44,.075,.08);
  for(let j=0;j<3;j++){
    const u=x+(j-1)*.65, paint=fabrics[(j+1)%5];
    face(ink.iron,u,2.04,-1.40,.035,.16,.04);
    face(ink.wood,u,1.95,-1.40,.40,.045,.06);
    face(paint,u,1.59,-1.38,.43,.68,.09);
    for(const s of [-1,1])face(paint,u+s*.25,1.66,-1.38,.16,.46,.10,0,s*.26);
    face(0xddd0b0,u,1.87,-1.316,.13,.12,.03);
    for(let k=0;k<3;k++)face(ink.dark,u,1.69-k*.13,-1.315,.025,.025,.025);
  }
}
