import { seededRandom } from '../../core/random.js';
import { detailKit, detailRegion } from './detail-kit.js';
import { barrel, bench, cart, crate, lantern, table, toolsOnRack } from './detail-props.js';
import { goldSites, outdoorSites } from './detail-sites.js';
import { faces, LAKE_LEVEL, mix } from './landform.js';
import { localPoint } from './ride.js';
import { addFootbridge, createTimberKit } from './structures.js';

export function addOutdoorDetails({ THREE, scene, terrain, document, register }) {
  const ground = terrain.sample;
  const collision = [], decks = [], waterStructures = [];
  const region = name => detailRegion(THREE, scene, name, ground, { document, collision, decks });

  function bridge(parent, x, z, endX, endZ, width, endY = ground(endX, endZ)) {
    const kit = createTimberKit(THREE, parent);
    const deck = addFootbridge(THREE, kit, ground, [x, z, ground(x, z)], [endX, endZ, endY], width);
    kit.finish();
    decks.push(deck);
    return deck;
  }

  const camp = region('Riverside campsite');
  const { x: campX, z: campZ } = outdoorSites.camp;
  const tentCloth = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const tentSites = [
    [-20.1, 49.5, 0.7, 0xb66c48], [-14.5, 54.1, 2.73, 0x489292], [-10.7, 50.8, -1.37, 0xcfa34c],
  ];
  for (const [i, [x, z, yaw, hex]] of tentSites.entries()) {
    const node = camp.group('Canvas tent ' + (i + 1), x, z, yaw);
    const cloth = faces(THREE, node, 'Tensioned canvas and open flap', tentCloth);
    const color = new THREE.Color(hex), hem = color.clone().multiplyScalar(0.76);
    function edge(side, forward) {
      const p = localPoint(x, z, yaw, side, forward);
      return [side, ground(p.x,p.z) - node.position.y + 0.018, forward];
    }
    const a=edge(-1.48,-1.28), b=[0,1.82,-1.24], c=edge(1.48,-1.28);
    const d=edge(-1.53,1.32), e=[0,1.87,1.25], f=edge(1.53,1.32);
    cloth.quad(a, d, e, b, color);
    cloth.quad(b, e, f, c, hem);
    cloth.triangle(a, b, c, hem);
    cloth.triangle(d, e, edge(-0.72,1.39), color);
    cloth.triangle(e, f, edge(0.72,1.39), hem);
    cloth.finish();
    const poles = detailKit(THREE, node);
    poles.box(0x634e38, 0, 0.91, -1.25, 0.06, 1.8, 0.06);
    poles.beam(0xc5b17d, e, [0.86, 0.015, 1.8], 0.024);
    poles.beam(0xc5b17d, e, [-0.86, 0.015, 1.8], 0.024);
    poles.box(0x574c37, 0, 0.03, 0, 2.69, 0.072, 2.48);
    poles.finish();
    camp.bounds(node, 0, 0, 0, 2.9, 2.55, 1.65);
  }
  const ashes = camp.group('Cold stone campfire', campX, campZ);
  const hearth = detailKit(THREE, ashes);
  const random = seededRandom(8831);
  for (let i = 0; i < 13; i++) {
    const a = i * Math.PI * 2 / 13;
    hearth.part('stone', i % 2 ? 0x686b68 : 0x888173, Math.cos(a) * 0.76, 0.113, Math.sin(a) * 0.76,
      0.31, 0.26, 0.31, random() * 6);
  }
  hearth.part('cylinder', 0x50443b, 0, 0.047, 0, 1.25, 0.055, 1.25);
  hearth.beam(0x4b342a, [-0.42,0.08,-0.2], [0.38,0.16,0.2], 0.19, 0.19, 'cylinder');
  hearth.beam(0x72523b, [0.32,0.09,-0.41], [-0.25,0.13,0.36], 0.17, 0.17, 'cylinder');
  for (const [x, z] of [[-0.67, -0.56], [0.74, -0.49], [0.15, 0.64]]) {
    hearth.beam(0x554b3d, [x,0,z], [0,1.48,0], 0.053, 0.053, 'cylinder');
  }
  hearth.beam(0x545751, [0,1.49,0], [0,0.75,0], 0.022);
  hearth.part('taper', 0x444947, 0, 0.59, 0, 0.48, 0.33, 0.48, 0, Math.PI);
  hearth.part('cylinder', 0x565953, 0, 0.75, 0, 0.48, 0.045, 0.48);
  hearth.finish();
  camp.bounds(ashes, 0, 0, 0, 1.69, 1.69, 1.49);
  register('campfire', ashes, [campX + 1.4, campZ]);
  for (const [x, z, yaw] of [[-18.3, 51.2, 0.6], [-15.1, 47.9, -0.62]]) {
    const y = ground(x, z), endX = Math.cos(yaw) * 0.86, endZ = Math.sin(yaw) * 0.86;
    camp.kit.beam(0x6c5037, [x-endX,y+0.23,z-endZ], [x+endX,y+0.23,z+endZ], 0.46, 0.46, 'cylinder');
    camp.solid(x, y, z, 1.72, 0.46, 0.45, -yaw);
  }
  const tableY = ground(-11.4, 54.2);
  table(camp.kit, -11.4, tableY, 54.2);
  camp.solid(-11.4, tableY, 54.2, 1.5, 0.74, 0.8);
  for (const [x, z] of [[-12.85, 54.4], [-10.5, 53.55]]) {
    const y = ground(x,z);
    bench(camp.kit,x,y,z,0.47);
    camp.solid(x,y,z,0.48,0.5,0.9);
  }
  lantern(camp.kit, -11.55, tableY + 0.78, 54.35);
  camp.kit.part('body', 0x55664f, -10.85, tableY + 0.16, 54.76, 0.47, 0.49, 0.24);
  camp.kit.box(0xb69a5f, -10.85, tableY + 0.33, 54.79, 0.39, 0.17, 0.17);
  camp.kit.part('cylinder', 0x6f956f, -11.12, tableY + 0.86, 54.07, 0.14, 0.17, 0.14);
  lantern(camp.kit, -18.6, ground(-18.6, 48.7), 48.7);
  const firewood = camp.group('Stack of split firewood', -19.0, 54.1, 0.35);
  const stack = detailKit(THREE, firewood);
  for (let i = 0; i < 10; i++) stack.part('cylinder', i % 2 ? 0x886344 : 0xa77c55,
    (i % 4 - 1.5) * 0.21, 0.12 + Math.floor(i / 4) * 0.178, 0, 0.235, 0.79, 0.235, 0, Math.PI / 2);
  stack.finish();
  camp.bounds(firewood, 0, 0, 0, 0.94, 0.82, 0.57);
  register('camp-firewood', firewood, [-18.1, 53.6]);
  camp.sign('RIVERSIDE CAMP\nWATERFALL TRAIL NORTH', -13.4, 47.5, Math.PI, 2.2);
  camp.finish();

  const settlement = region('Abandoned miners’ settlement');
  buildCabin(settlement, -42.0, -7.6, 4.55, 4.3, 'Miners’ bunkhouse', true);
  buildCabin(settlement, -42.65, -1.35, 4.6, 4.05, 'Watchman’s cabin', false);
  buildCabin(settlement, -38.6, 2.45, 2.75, 2.55, 'Equipment shed', false, 2.05);
  settlement.sign('OLD MINE\nBRIDGE NORTH', -38.8, -13.25, Math.PI / 2, 1.7);
  for (const [x,z] of [[-40,-4.5],[-39.1,-0.4],[-43.8,1.9]]) {
    const y = ground(x,z);
    crate(settlement.kit,x,y,z,0.72,0.15);
    barrel(settlement.kit,x+0.68,y,z-0.12,0.56);
    settlement.solid(x+0.27,y,z,1.34,0.79,0.88);
  }
  cart(settlement.kit, -39.3, ground(-39.3,-11), -11);
  settlement.solid(-39.3, ground(-39.3,-11), -11, 1.15, 1.3, 0.84);
  toolsOnRack(settlement.kit,-39.2,ground(-39.2,0.75),0.75);
  const tankY = ground(-44.05, 1.9);
  settlement.kit.part('cylinder',0x718180,-44.05,tankY+1.25,1.9,1.42,1.25,1.42);
  settlement.kit.part('taper',0x84938d,-44.05,tankY+1.94,1.9,1.47,0.21,1.47);
  for (const side of [-1,1]) settlement.kit.box(0x5a4437,-44.05+side*0.49,tankY+0.35,1.9,0.14,0.7,1.05);
  settlement.solid(-44.05,tankY,1.9,1.48,1.48,2.06);
  for (let i=0;i<4;i++) settlement.kit.beam(0x876444,[-42.8-i*0.22,tankY+0.21,2.65],[-42.8-i*0.22,tankY+0.26,4.55],0.23,0.23,'cylinder');
  fence(settlement,[[-45.4,-4],[-45,-1.45],[-44.8,0.7]]);
  settlement.finish();

  const fishing = region('Lakeside fishing pier');
  const { x: pierX, z: pierZ } = outdoorSites.pier;
  const pierEnd = 15.25;
  const fishingDeck = bridge(fishing.root, pierX, pierZ, pierEnd, pierZ, 2.13, LAKE_LEVEL + 0.47);
  waterStructures.push(fishingDeck);
  const pierY = fishingDeck.surface(16.15, pierZ);
  const rods = fishing.group('Spare fishing rod', 16.15, pierZ - 0.66, -Math.PI / 2, pierY);
  const tackle = detailKit(THREE, rods);
  tackle.beam(0x966d41, [0, 0.22, 0], [0, 1.35, 1.25], 0.045);
  tackle.beam(0x505d5a, [0, 1.35, 1.25], [0, 1.53, 1.91], 0.026);
  const parkedLine = new THREE.Group();
  parkedLine.name = 'Parked fishing line';
  rods.add(parkedLine);
  const line = detailKit(THREE, parkedLine);
  line.beam(0xa6b4a9, [0, 1.53, 1.91], [0, -0.34, 1.91], 0.012);
  line.finish();
  tackle.part('ring', 0x565d51, 0.045, 0.58, 0.37, 0.16, 0.16, 0.16, Math.PI / 2);
  tackle.finish();
  register('fishing-rod', rods, [16.5, pierZ], pierY);
  register('fishing-location', null, [15.85, pierZ], fishingDeck.surface(15.85,pierZ));
  const basket = fishing.group('Fishing basket', 18.15, 8.6, 0, fishingDeck.surface(18.15,pierZ));
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.284,0.193,0.375,10,1,true),
    new THREE.MeshLambertMaterial({color:0xb48d55,flatShading:true,side:THREE.DoubleSide}));
  shell.position.y=0.195;
  basket.add(shell);
  const wicker = detailKit(THREE, basket);
  wicker.part('cylinder',0x886642,0,0.079,0,0.431,0.079,0.431);
  for(const [y,width] of [[0.12,0.444],[0.25,0.516],[0.382,0.588]]) {
    wicker.part('ring',0x927244,0,y,0,width,width,0.24,0,Math.PI/2);
  }
  wicker.beam(0xa98251,[-.23,.27,0],[-.208,.49,0],.041);
  wicker.beam(0xa98251,[-.208,.49,0],[.208,.49,0],.041);
  wicker.beam(0xa98251,[.208,.49,0],[.23,.27,0],.041);
  wicker.finish();
  crate(fishing.kit, 17.55, fishingDeck.surface(17.55,pierZ), 8.67, 0.39, 0.03, 0x6d7b5a);
  const seatY = ground(19.05, 9.33);
  bench(fishing.kit, 19.05, seatY, 9.33, 1.45);
  fishing.solid(19.05,seatY,9.33,1.45,0.52,0.96);
  fishing.sign('FISHING PIER', 20.7, 7.22, Math.PI / 2, 1.54);
  fishing.finish();

  const trail = region('Waterfall hiking trail details');
  const lookout = outdoorSites.lookout;
  bridge(trail.root, 34, -13.55, lookout.x, lookout.z - 1, 2.9, ground(34,-13.55) - 0.04);
  for (const [text,x,z,yaw] of [
    ['WATERFALL ↑', -29.2, 29, 0.42], ['CAMP →', -9.4, 48, Math.PI], ['UPPER FALLS ↑', 39.3, 16.85, 0.55],
    ['LOOKOUT ←', 35.6, -12.1, -0.4], ['LOWER MINE →', -34, -14.35, 0.72],
  ]) trail.sign(text,x,z,yaw,1.45);
  for (const [x,z] of [[-27.7,26],[-31.2,13],[-38.2,-4],[25.1,36],[30.0,24],[44.1,11.4],[43.3,-8.3]]) {
    const y = ground(x,z);
    trail.kit.box(0x886749,x,y+0.36,z,0.12,0.72,0.115);
    trail.kit.box(0xe6bc53,x,y+0.63,z,0.143,0.14,0.14);
  }
  fence(trail, [[31,-16],[32,-16.25]]);
  fence(trail, [[43.1,1.7],[43.1,3.7],[42.5,6.0]]);
  for (const [x,z] of [[-27.2,35.6],[24.8,35.2],[42.3,16.7]]) {
    const y=ground(x,z);
    bench(trail.kit,x,y,z,1.65);
    trail.solid(x,y,z,1.7,0.52,0.96);
  }
  for (const [x, z] of [[-24,34],[-30,24],[-26,14],[22,35],[28,33],[42.1,18],[47,5],[34,-11]]) {
    for (let i=0;i<9;i++) {
      const px=x+(random()-.5)*2.6,pz=z+(random()-.5)*2.4,y=ground(px,pz);
      if (y < LAKE_LEVEL+0.4) continue;
      const size=0.08+random()*0.19;
      trail.kit.beam(0x668b39,[px,y,pz],[px+0.05,y+size,pz],0.019);
      trail.kit.part('stone', i%3===0?0xefc867:i%3===1?0xdca1b5:0xece2b6,
        px+0.05,y+size,pz,0.135,0.075,0.135,random()*6);
    }
    trail.kit.part('stone',0x70757c,x,ground(x,z)+0.22,z,0.76,0.54,0.56,random()*6);
    trail.kit.part('body',0x658a43,x+0.67,ground(x+0.67,z)+0.21,z,0.76,0.54,0.59);
  }
  const logY=ground(32,34);
  trail.kit.beam(0x796048,[31,logY+0.15,34.1],[33,logY+0.2,34.45],0.35,0.36,'cylinder');
  const goldGeometry=new THREE.IcosahedronGeometry(0.5,0);
  const goldPositions=goldGeometry.getAttribute('position');
  const faceColors=[];
  for(let i=0;i<goldPositions.count;i+=3){
    const color=new THREE.Color([0xd78d20,0xf2be45,0xffd35f,0xbb7320][(i/3)%4]);
    for(let j=0;j<3;j++)faceColors.push(color.r,color.g,color.b);
  }
  goldGeometry.setAttribute('color',new THREE.Float32BufferAttribute(faceColors,3));
  const goldMaterial=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,
    emissive:0x7d4910,emissiveIntensity:0.24});
  for(const [i,[id,x,z]] of goldSites.entries()){
    const nugget=trail.group('Trail gold nugget '+(i+1),x,z);
    const stone=new THREE.Mesh(goldGeometry,goldMaterial);
    stone.position.y=0.22;
    stone.scale.set(.68,.47,.52);
    stone.rotation.set(.21,i*1.75,-.23);
    nugget.add(stone);
    const chip=new THREE.Mesh(goldGeometry,goldMaterial);
    chip.position.set(.31,.13,.15);
    chip.scale.set(.26,.26,.24);
    chip.rotation.set(-.28,.58,.11);
    nugget.add(chip);
    register(id,nugget,[x,z]);
  }
  trail.finish();

  function fence(region, points) {
    const post = points.map(([x,z]) => [x,ground(x,z),z]);
    for (const [x,y,z] of post) region.kit.box(region.dark,x,y+0.4,z,0.14,0.91,0.14);
    for (let i=1;i<post.length;i++) {
      const a=post[i-1], b=post[i], [x,y,z]=a, [xx,yy,zz]=b;
      const distance=Math.hypot(xx-x,zz-z), yaw=Math.atan2(xx-x,zz-z);
      for (const height of [0.42,0.77]) region.kit.beam(region.wood,[x,y+height,z],[xx,yy+height,zz],0.09);
      region.solid((x+xx)/2,Math.min(y,yy),(z+zz)/2,0.14,distance,1.02,yaw);
    }
  }

  function buildCabin(region, x, z, width, depth, name, open, wallHeight=2.45) {
    const yaw=Math.PI/2, half=depth/2;
    const floorY=Math.max(...[-half,half,0].flatMap(dx=>[-width/2,width/2,0].map(dz=>ground(x+dx,z+dz))))+0.035;
    const node=region.group(name,x,z,yaw,floorY);
    const kit=detailKit(THREE,node);
    const plank=0x846044, trim=0xb29269, roof=0x504d46;
    kit.box(0x6f523a,0,-0.093,0,width,0.186,depth);
    for(const sx of [-1,1]) for(const sz of [-1,1]) {
      const a=x+sz*(half-.22), b=z-sx*(width/2-.22);
      const h=Math.max(.14,floorY-ground(a,b)+0.15);
      kit.box(0x654f3c,sx*(width/2-.22),-h/2,sz*(half-.22),0.28,h,0.28);
    }
    function wall(px,pz,w,d) {
      kit.box(plank,px,wallHeight/2,pz,w,wallHeight,d);
      for(let i=1;i<9;i++) kit.box(i%3?0x936e4c:0xa28055,px,i*wallHeight/9,pz,w+0.023,0.036,d+0.023);
      region.bounds(node,px,0,pz,w,d,wallHeight);
    }
    wall(0,-half,width,0.15);
    for(const side of [-1,1]) {
      wall(side*(width/2-0.055),0,0.14,depth);
      for(const l of [-half,half]) kit.box(trim,side*(width/2-0.015),wallHeight/2,l,0.17,wallHeight,0.18);
    }
    const opening = open ? 1.24 : 0.95;
    const span=(width-opening)/2;
    for(const side of [-1,1]) wall(side*(opening/2+span/2),half,span,0.15);
    kit.box(plank,0,wallHeight-0.15,half,opening,0.3,0.174);
    if(!open) {
      kit.box(0x72513b,0,1.04,half+0.036,opening,2.08,0.13);
      kit.box(0xceab68,0.33,0.95,half+0.122,0.09,0.07,0.047);
      region.bounds(node,0,0,half,opening,0.18,2.1);
    }
    if(width>4){
      const side=1, px=side*(width/2+0.045);
      kit.box(trim,px,1.44,-0.1,0.125,0.82,0.92);
      kit.box(0x39454a,px+0.075,1.44,-0.10,0.035,0.64,0.73);
      kit.box(trim,px+0.108,1.44,-0.1,0.024,0.66,0.049);
      kit.box(trim,px+0.111,1.44,-0.10,0.025,0.049,0.72);
      kit.box(0x65503f,px+0.041,1.016,-0.10,0.19,0.083,1.02);
    }
    const rise=0.82;
    for(const side of [-1,1]) {
      const over=width/2+.24, slope=Math.atan2(rise,over), length=Math.hypot(over,rise);
      kit.box(roof,side*over/2,wallHeight+rise/2,0,length+0.025,0.16,depth+0.52,0,0,-side*slope);
      for (const v of [-0.4,0,0.4]) kit.box(0x625b4f,side*over/2,wallHeight+rise/2+0.087,depth*v,
        length,0.039,0.065,0,0,-side*slope);
    }
    const gable=faces(THREE,node,'Cabin gables',new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));
    const color=new THREE.Color(plank);
    for(const side of [-1,1]){
      const zz=side*(half-0.05);
      const a=[-width/2,wallHeight,zz],b=[width/2,wallHeight,zz],c=[0,wallHeight+rise-0.045,zz];
      if(side===1)gable.triangle(a,b,c,color);else gable.triangle(b,a,c,color);
    }
    gable.finish();
    if(open){
      const start=x+half, end=start+1.85, base=ground(end,z);
      kit.beam(0x9e7651,[0,0,half],[0,base-floorY,half+1.85],1.34,0.12);
      const surface=(px,pz,margin=0)=>{
        const delta=Math.abs(pz-z);
        if(px>=start && px<=end && delta<=0.65-margin)return mix(floorY,base,(px-start)/1.85);
        if(px>=x-half && px<=start && delta<=width/2-margin)return floorY;
      };
      decks.push({ surface, railing:()=>false });
      kit.box(0x634736,-1.36,0.24,-0.75,0.86,0.48,1.79);
      kit.box(0xbbaa86,-1.36,0.49,-0.75,0.83,0.14,1.75);
      kit.box(0x5e806c,-1.36,0.57,-0.43,0.8,0.068,0.98);
      kit.box(0xdec7a0,-1.36,0.58,-1.35,0.59,0.13,0.34);
      region.bounds(node,-1.36,0,-0.75,0.9,1.8,0.7);
      table(kit,1.28,0,0.17,0.76,0.63);
      bench(kit,1.32,0,1.08,0.45);
      crate(kit,1.42,0,-1.35,0.48);
      for(let i=0;i<3;i++) kit.box(0x986947,1.26,0.31+i*0.37,-1.69,1.12,0.075,0.34);
      lantern(kit,1.3,0.79,0.13);
      kit.box(0x4f3e34,0,1.54,-half+0.091,1.52,0.88,0.043);
      kit.box(0xc4aa74,0,1.54,-half+0.118,1.4,0.76,0.015);
      for(const [x0,y,x1,y1] of [[-.58,1.4,.24,1.44],[.23,1.42,.5,1.75],[-.27,1.73,.16,1.54],[-.52,1.8,-.28,1.73]]) {
        kit.beam(0x6e6e60,[x0,y,-half+0.13],[x1,y1,-half+0.13],0.031,0.01);
      }
      region.label(node,'MINE SURVEY',1.1,0.25,0,1.76,-half+0.125,'#4a3e30');
      region.bounds(node,1.28,0,0.17,0.79,0.66,0.79);
      region.bounds(node,1.32,0,1.08,0.48,0.52,0.95);
    }
    region.label(node,name.toUpperCase(),width*0.77,0.24,0,wallHeight-0.16,half+0.096);
    kit.finish();
  }

  return { collision, decks, waterStructures, basket };
}
