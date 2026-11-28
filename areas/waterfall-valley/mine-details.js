import { seededRandom } from '../../core/random.js';
import { detailKit, detailRegion } from './detail-kit.js';
import { barrel, bench, cart, crate, lantern, table, toolsOnRack } from './detail-props.js';
import { crystalSites } from './detail-sites.js';
import { CLIFF_Z, faces, LOWER_X, nearest, UPPER_X } from './landform.js';
import { mineLake } from './mine-layout.js';
import { addFootbridge, createTimberKit } from './structures.js';

export function addMineDetails({ THREE, scene, mine, document, register }) {
  const collision = [], decks = [];
  const veins = new Map();
  const ground = mine.floor.sample;
  const region = name => detailRegion(THREE, scene, name, ground, { cave: true, document, collision, decks });
  const random = seededRandom(47352);
  const metal = 0x626a68, dark = 0x474643, rust = 0x995d43, pale = 0xa88a66;

  for (const station of [
    { lower: true, x: -22.5, z: -31.2, sign: [-21.35,-28.6,0.98], crate: [-22.7,-30.1],
      mission: [-19.8,-30.8], wheel: [-24,-32.8], depot: [-23.7,-33.6] },
    { lower: false, x: 14.8, z: -34.2, sign: [15.5,-31.2,0.8], crate: [14.77,-35.32],
      mission: [18.2,-34.1], wheel: [14.25,-37.5], depot: [12.8,-35.25] },
  ]) {
    const title = station.lower ? 'Lower' : 'Upper';
    const id = title.toLowerCase();
    const zone = region(title + ' station and cargo depot');
    const [signX,signZ,yaw] = station.sign;
    zone.sign(title.toUpperCase() + ' STATION', signX, signZ, yaw, 2.35);
    const { x,z } = station;
    // Cargo platforms meet the existing wagon bed above the railhead.
    const platformY = nearest(mine.main,x,z).y + 0.88;
    const raised = zone.group(title + ' wagon-height cargo platform',x,z,0,platformY);
    const kit = detailKit(THREE,raised,true);
    for(let i=0;i<11;i++) kit.box(i%3?0x8b684c:0x9b7655,0,-0.12,(i-5)*0.39,2.12,0.23,0.381);
    for(const dx of [-0.82,0.82]) for(const dz of [-1.64,0,1.61]) {
      const h=Math.max(0.21,platformY-ground(x+dx,z+dz));
      kit.box(dark,dx,-h/2,dz,0.17,h,0.17);
    }
    const entry= z+4.0, start=z+2.13, base=ground(x,entry);
    kit.beam(0x957252,[0,-0.049,2.13],[0,base-platformY-0.049,4.0],2.12,0.105);
    kit.finish();
    decks.push({
      surface(px,pz,margin=0){
        if(Math.abs(px-x)>1.06-margin || pz<z-2.14 || pz>entry)return;
        return pz<=start?platformY:platformY+(base-platformY)*(pz-start)/(entry-start);
      },
      railing:()=>false,
    });
    register('cargo-' + (station.lower ? 'loading' : 'unloading'), raised, station.mission);
    register('railway-' + id + '-station', null, station.mission);
    const [cx,cz]=station.crate;
    const load=zone.group(station.lower?'Ore shipment crates':'Upper storage crates',cx,cz,0,platformY);
    const stack=detailKit(THREE,load,true);
    crate(stack,0,0,0,0.66,0.17);
    if(station.lower){
      crate(stack,0.58,0,-0.53,0.52,0.05);
      crate(stack,-0.08,0.688,-0.12,0.35,-0.14);
      register('cargo-ore-crate',load,[cx+0.7,cz+0.75],platformY);
      const box=zone.group('Railway supplies crate',x-0.4,z-1.08,0,platformY);
      const parts=detailKit(THREE,box,true);
      crate(parts,0,0,0,.57,0.3,0x916348);
      parts.finish();
      zone.bounds(box,0,0,0,.62,.62,.61);
      register('cargo-supplies-crate',box,[x+0.57,z-0.65],platformY);
    }
    stack.finish();
    zone.bounds(load,0,0,0,0.71,0.75,station.lower?1.08:0.7);
    const [wx,wz]=station.wheel, wy=ground(wx,wz);
    for(let i=0;i<2;i++){
      zone.kit.part('ring',metal,wx+i*0.36,wy+0.41,wz-i*0.17,0.88,0.88,0.88,0.15*i,0.12);
      zone.kit.part('cylinder',dark,wx+i*0.36,wy+0.41,wz-i*0.17,0.25,0.15,0.25,0,Math.PI/2);
    }
    zone.solid(wx+0.16,wy,wz,1.18,.48,.86);
    barrel(zone.kit,wx+0.68,wy,wz+0.44,0.58);
    bench(zone.kit,x-1.65,ground(x-1.65,z+1.8),z+1.8,1.35);
    for(const side of [-1,1]){
      const yy=platformY+2.55;
      zone.kit.box(dark,x+side*.98,platformY+1.3,z-1.71,.15,2.6,.16);
      lantern(zone.kit,x+side*.91,yy-0.39,z-1.66);
    }
    zone.kit.box(dark,x,platformY+2.59,z-1.72,2.09,.14,.19);
    const [dx,dz]=station.depot,dy=ground(dx,dz);
    if(station.lower){
      const ore=zone.group('Lower cargo ore bin',dx,dz);
      const bin=detailKit(THREE,ore,true);
      for(const a of [-1,1]) bin.box(0x865c3e,a*.65,.31,0,.115,.62,1.12);
      bin.box(0x775331,0,.33,-.54,1.38,.62,.11);
      for(let i=0;i<13;i++) bin.part('stone',i%2?0x797672:0x9d8267,(random()-.5)*1.14,.25+random()*.3,
        (random()-.5)*.86,.31,.34,.32,random()*6);
      bin.finish();
      zone.bounds(ore,0,0,0,1.47,1.18,.68);
      zone.kit.beam(metal,[dx+1,dy,dz],[dx+1,dy+1.85,dz],.12);
      zone.kit.beam(metal,[dx+1,dy+1.85,dz],[dx+.1,dy+1.85,dz],.13);
      zone.kit.part('ring',metal,dx+.2,dy+1.52,dz,.32,.34,.25);
    }else{
      const hut=zone.group('Upper mine cargo warehouse',dx,dz);
      const warehouse=detailKit(THREE,hut,true);
      warehouse.box(0x78583f,0,1.04,-0.98,2.05,2.08,.11);
      for(const side of [-1,1]){
        warehouse.box(0x775a45,side*0.95,1.0,0,.12,2.0,2.03);
        warehouse.box(0x8a694b,side*.6,2.12,0,1.27,.15,2.18,0,0,-side*.19);
        warehouse.box(dark,side*.96,1.02,.97,.13,2.06,.13);
        zone.bounds(hut,side*.95,0,0,.14,2.03,2.1);
      }
      zone.bounds(hut,0,0,-.98,2.05,.12,2.08);
      warehouse.finish();
      zone.label(hut,'CARGO STORAGE',1.62,.24,0,2.11,1.08);
    }
    zone.finish();
  }

  const workshop=region('Northern rail workshop');
  workshop.sign('RAIL WORKSHOP', -24.7,-82.1,0.22,2.05);
  const work=workshop.group('Mine workbench, vise and hand tools',-27.6,-83.1);
  const workKit=detailKit(THREE,work,true);
  table(workKit,0,0,0,2.08,.81,.9);
  workKit.box(metal,-.65,1.02,.03,.35,.27,.32);
  workKit.beam(metal,[-.91,1.1,.03],[-.42,1.1,.03],.038,.038,'cylinder');
  for(const [x,z] of [[-.12,-.11],[.32,.09],[.66,-.02]]) workKit.beam(pale,[x,.959,z],[x+.22,.959,z+.12],.033);
  toolsOnRack(workKit,0,1.03,-.49);
  workKit.box(0x6d513b,0,1.57,-.55,2.02,1.35,.11);
  lantern(workKit,.74, .95,.09);
  workKit.finish();
  workshop.bounds(work,0,0,0,2.15,.93,1.9);
  for(const [x,z] of [[-24.2,-83.6],[-26.1,-83.6]]) {
    barrel(workshop.kit,x,ground(x,z),z,.6,0x665449);
    workshop.solid(x,ground(x,z),z,.63,.63,.71);
  }
  const shelf=workshop.group('Shelves with spare rail and supplies',-30,-82.9);
  const items=detailKit(THREE,shelf,true);
  for(const side of [-1,1])items.box(dark,side*.79,.86,0,.08,1.72,.48);
  for(const yy of [.24,.77,1.28])items.box(0x916e4f,0,yy,0,1.73,.075,.53);
  crate(items,-.39,.28,0,.34);
  crate(items,.39,.807,0,.48);
  items.part('ring',metal,-.41,1.09,0,.5,.49,.47);
  items.beam(metal,[-.67,1.35,-.09],[.77,1.35,-.09],.083);
  items.finish();
  workshop.bounds(shelf,0,0,0,1.8,.59,1.75);
  cart(workshop.kit,-33.8,ground(-33.8,-82.4),-82.4,0x715b4e);
  workshop.solid(-33.8,ground(-33.8,-82.4),-82.4,1.25,1.4,.84);
  workshop.finish();

  const machines=region('Slate gallery mining equipment');
  const crusher=machines.group('Idle crusher and conveyor',3,-69.2,-0.28);
  const plant=detailKit(THREE,crusher,true);
  plant.box(dark,0,.23,-.54,1.5,.45,1.1);
  plant.box(rust,0,.87,-.62,1.38,.9,1.02);
  for(const side of [-1,1]){
    plant.box(metal,side*.59,1.45,-.62,.24,.54,.96,0,0,-side*.33);
    plant.part('ring',metal,side*.75,.92,-.56,.74,.74,.74,Math.PI/2);
    plant.box(metal,side*.5,.49,1.01,.11,.99,.12);
    plant.beam(rust,[side*.5,.84,-.21],[side*.5,.48,1.9],.1);
  }
  plant.beam(0x414748,[0,.81,-.21],[0,.49,1.91],.75,.095);
  for(let i=0;i<5;i++)plant.box(0x565c58,0,.835-i*.061,-.08+i*.37,.75,.038,.13);
  plant.finish();
  machines.bounds(crusher,0,0,.45,1.56,2.98,1.75);
  const drill=machines.group('Trolley-mounted rock drill',0,-67.9,.43);
  const drillKit=detailKit(THREE,drill,true);
  drillKit.box(0x655141,0,.17,0,.91,.27,1.21);
  for(const side of [-1,1])drillKit.beam(metal,[side*.33,.21,-.37],[0,1.27,.25],.08);
  drillKit.part('cylinder',rust,0,1.09,.13,.28,.76,.27,0,Math.PI/2);
  drillKit.beam(metal,[0,1.09,.44],[0,1.09,1.11],.074,.064,'cylinder');
  drillKit.finish();
  machines.bounds(drill,0,0,.22,1.05,1.6,1.45);
  const pulley=machines.group('Hand winch and pulley',-1.7,-69.4);
  const winch=detailKit(THREE,pulley,true);
  winch.box(dark,0,.32,0,.87,.62,.73);
  winch.part('cylinder',metal,0,.67,0,.57,.67,.57,0,0,Math.PI/2);
  winch.part('ring',rust,.49,.69,0,.69,.69,.69,Math.PI/2);
  winch.beam(metal,[.48,.7,0],[.48,1.0,.15],.055);
  winch.finish();
  machines.bounds(pulley,0,0,0,1.2,.8,1.03);
  machines.sign('SLATE GALLERY', 6.86,-71.2,Math.PI,1.75);
  machines.finish();

  const power=region('Abandoned mine power station');
  const engine=power.group('Inactive diesel generator',23.2,-61.9,0.29);
  const gen=detailKit(THREE,engine,true);
  const green=0x586a60;
  gen.box(dark,0,.15,0,2.05,.27,1.23);
  gen.box(green,-.1,.65,0,1.67,.83,1.07);
  gen.part('cylinder',green,.59,.71,.03,.93,.94,.93,0,0,Math.PI/2);
  gen.box(metal,-.98,.62,0,.12,.76,.92);
  gen.box(0x464e49,-.99,.62,.005,.123,.66,.77);
  for(let i=0;i<6;i++)gen.box(0x798374,-1.063,.39+i*.092,.01,.045,.042,.72);
  gen.part('cylinder',rust,-.6,1.31,-.29,.15,.61,.15);
  gen.beam(metal,[.19,.23,.5],[.19,.23,1.0],.13,.13,'cylinder');
  gen.box(0xd6ad62,-.15,.79,.544,.34,.2,.024);
  gen.finish();
  power.bounds(engine,0,0,0,2.12,1.3,1.66);
  register('mine-generator',engine,[23.5,-60.7]);
  const panel=power.group('Generator control panel',25.8,-64.4,0.03);
  const panelParts=detailKit(THREE,panel,true);
  panelParts.box(metal,0,.78,0,.88,1.55,.56);
  panelParts.box(0x454c49,0,1.22,.293,.74,.47,.074);
  panelParts.part('cylinder',0x6a514b,-.21,1.32,.347,.1,.037,.1,0,Math.PI/2);
  panelParts.part('cylinder',0xb1aa8b,.1,1.32,.347,.13,.038,.13,0,Math.PI/2);
  panelParts.box(0x66685e,.13,1.13,.343,.28,.094,.032);
  panelParts.box(0xa1724d,-.2,1.12,.367,.071,.145,.055);
  panelParts.finish();
  power.bounds(panel,0,0,0,.92,.66,1.56);
  register('mine-power-control-panel',panel,[25.7,-63.55]);
  for(const [x,z] of [[24.38,-64.4],[22.8,-64.6]]) {
    const y=ground(x,z);
    power.kit.box(0x6f7163,x,y+0.89,z,.75,1.77,.55);
    power.kit.box(0xa7a385,x+.19,y+.95,z+.294,.08,.15,.063);
    power.solid(x,y,z,.78,.63,1.78);
  }
  const line=[[23.45,-62.45],[23.8,-63.1],[24.55,-63.71],[25.8,-64.18]];
  for(let i=1;i<line.length;i++){
    const [x,z]=line[i-1],[xx,zz]=line[i];
    power.kit.beam(0x464641,[x,ground(x,z)+.04,z],[xx,ground(xx,zz)+.04,zz],.066,.066,'cylinder');
  }
  const vent=power.group('Idle belt-driven ventilation fan',21.2,-63.55);
  const fan=detailKit(THREE,vent,true);
  fan.box(dark,0,.35,0,.92,.71,.42);
  fan.part('ring',metal,0,1.22,.07,1.13,1.13,1.1);
  for(let i=0;i<4;i++)fan.box(0x848674,0,1.22,.06,.16,.82,.074,0,0,i*Math.PI/4);
  fan.part('cylinder',rust,0,1.22,.14,.25,.13,.25,0,Math.PI/2);
  fan.finish();
  power.bounds(vent,0,0,0,1.14,.56,1.8);
  power.sign('POWER STATION\nCAUTION: LIVE CABLING',21.3,-61.45,0.26,1.88);
  power.finish();

  const crystals=region('Crystal Cavern');
  const crystalMesh=faces(THREE,new THREE.Group(),'Crystal facets',
    new THREE.MeshBasicMaterial({ vertexColors:true,toneMapped:false }));
  const shape=new THREE.Color(0xffffff), sides=6;
  const rim=(i,y,r)=>[Math.cos(i*Math.PI*2/sides)*r,y,Math.sin(i*Math.PI*2/sides)*r];
  for(let i=0;i<sides;i++){
    const a=rim(i,0,.75), b=rim(i+1,0,.75), c=rim(i+1,.68,1), d=rim(i,.68,1);
    crystalMesh.quad(b,a,d,c,shape);
    crystalMesh.triangle(c,d,[.17,1.18,-.1],shape);
  }
  const facets=crystalMesh.finish().geometry;
  const palette=new Map();
  function crystal(color,x,y,z,height,width,rx,rz,yaw=random()*Math.PI*2,batch=palette){
    if(!batch.has(color))batch.set(color,[]);
    const shape = new THREE.Object3D();
    shape.position.set(x,y,z);
    shape.rotation.set(rx,yaw,rz);
    shape.scale.set(width,height,width);
    shape.updateMatrix();
    batch.get(color).push(shape.matrix.clone());
  }
  function deposit(id,x,z,color,approach,scale=1){
    const node=crystals.group(id ? id.replaceAll('-',' ') : 'Crystal outcrop',x,z);
    const base=node.position.y;
    const kit=detailKit(THREE,node,true);
    const miningBatch=id?new Map():palette;
    const makeShard=(cx,cy,cz,h,w,rx,rz)=>crystal(color,id?cx-x:cx,id?cy-base:cy,id?cz-z:cz,
      h,w,rx,rz,undefined,miningBatch);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5, r=.45+random()*.27;
      const dx=Math.cos(a)*r*scale, dz=Math.sin(a)*r*scale;
      const h=ground(x+dx,z+dz);
      kit.part('stone',0x526373,dx,h-base+.17,dz,.61*scale,.51*scale,.56*scale,random()*6);
      makeShard(x+dx,h+.04,z+dz,scale*(.63+random()*.79),scale*(.16+random()*.14),dz*.57,-dx*.54);
    }
    makeShard(x,base+.03,z,scale*1.86,scale*.34,.1,-.22);
    kit.finish();
    crystals.bounds(node,0,0,0,1.42*scale,1.42*scale,1.84*scale);
    if(id) {
      register(id,node,approach);
      const cluster=new THREE.Group();
      cluster.name='Mineable crystal formation';
      node.add(cluster);
      veins.set(id,{ cluster,batch:miningBatch });
    }
  }
  for(const site of crystalSites)deposit(site.id,site.x,site.z,site.color,site.approach);
  for(const [x,z,color,scale] of [[-24.1,-61.2,0xe1a64e,.64],[-8.4,-60.9,0x5ec9f6,.61],
    [-8.7,-53.4,0xa37ded,.7],[-18.3,-65.6,0x71dab0,.5],[-14.3,-68.3,0xe7b361,.48],
    [-47.1,-46.3,0x60d3dd,.34],[-39.2,-45.1,0xb783ef,.42]])deposit(null,x,z,color,null,scale);
  for(const [x,z,color] of [[-11,-53,0x58c8ff],[-21,-60,0xc48afa],[-11,-66,0x74deab],[-25,-60,0xe1a64e]]) {
    const ceiling=mine.ceiling.sample(x,z);
    for(let i=0;i<3;i++)crystal(color,x+i*.32,ceiling-.025,z+i*.21,.48+i*.16,.15,2.7,-.17*i);
  }
  for (const [z,color] of [[-59.5,0xe1a64e],[-62.2,0xb585ec],[-64.1,0x61bae8]]) {
    // Find the east wall on the same contour used to build the cavern shell.
    let x=-8;
    while (x < 1 && mine.opening.sample(x,z) > 0.16) x+=0.1;
    if(x>=1)continue;
    const y=ground(x,z);
    for(let i=0;i<3;i++){
      crystal(color,x-0.09,y+1.15+i*0.39,z+(i-1)*0.19,0.48+i*.23,0.14,0.04,1.17-i*.13,0.16);
    }
  }
  const position=facets.getAttribute('position'), normals=facets.getAttribute('normal');
  const shading=[];
  for(let i=0;i<position.count;i++) {
    const s=.76+normals.getX(i)*.13+normals.getY(i)*.13+normals.getZ(i)*.07;
    shading.push(s,s,s);
  }
  facets.setAttribute('color',new THREE.Float32BufferAttribute(shading,3));
  function renderCrystals(batch,parent) {
    for(const [color,matrices] of batch){
      const material=new THREE.MeshBasicMaterial({color,vertexColors:true,toneMapped:false});
      const instances=new THREE.InstancedMesh(facets,material,matrices.length);
      instances.name='Mineral facets';
      matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));
      parent.add(instances);
    }
  }
  renderCrystals(palette,crystals.root);
  for(const {cluster,batch} of veins.values())renderCrystals(batch,cluster);
  crystals.sign('CRYSTAL GALLERY',-16.8,-54.05,0.5,1.74);
  crystals.finish();

  const lake=region('Echo Lake shore and overlook');
  const timber=createTimberKit(THREE,lake.root);
  const approachY=ground(-32.5,-47), deckY=Math.max(mineLake.y+.62,ground(-38.5,-45.8)+.06);
  const boardwalk=addFootbridge(THREE,timber,ground,
    [-32.5,-47,approachY],[-38.5,-45.8,deckY],1.75);
  const overlook=addFootbridge(THREE,timber,ground,
    [-38.5,-45.8,deckY],[-43,-44.9,deckY],2.36);
  timber.finish();
  decks.push(boardwalk,overlook);
  lake.sign('ECHO LAKE',-33.9,-45.65,.46,1.53);
  lake.kit.box(dark,-43.02,deckY+.56,-44.9,.13,1.13,2.11,.197);
  lake.kit.box(0x9b7557,-43.02,deckY+1.08,-44.9,.14,.12,2.22,.197);
  lake.solid(-43.02,deckY,-44.9,.17,2.12,1.15,.197);
  lake.finish();

  const stories=region('Abandoned sidings and tunnel markers');
  stories.sign('LOWER STATION ←',-26.5,-48.1,1.03,1.98);
  stories.sign('LIFT ACCESS →',-7,-35.8,-0.34,1.58);
  const closed=stories.group('Boarded secondary working',-4.0,-66.7,-.35);
  const barricade=detailKit(THREE,closed,true);
  for(const x of [-.82,.82])barricade.box(dark,x,.92,0,.16,1.85,.16);
  barricade.box(dark,0,1.86,0,1.84,.16,.17);
  for(let i=0;i<3;i++)barricade.box(i%2?0x8d6549:0x785740,0,.45+i*.52,.055,1.76,.26,.11,0,0,(i-1)*.15);
  barricade.finish();
  stories.bounds(closed,0,0,0,1.83,.24,1.95);
  stories.label(closed,'SIDING 04 CLOSED',1.45,.21,0,1.86,.09);
  const toolY=ground(-36.2,-70.5);
  toolsOnRack(stories.kit,-36.2,toolY,-70.5);
  const [ax,az]=[-35.8,-69.6];
  for(let i=0;i<4;i++){
    const y=ground(ax,az+i*.18);
    stories.kit.beam(0x6c5140,[ax,y+.15,az+i*.21],[ax+1.0,y+.29+i*.09,az+i*.21+.34],.14);
  }
  for(let i=0;i<6;i++)stories.kit.box(0x6f5440,-37.1,toolY+.16+i*.23,-69.8,.56,.055,.11,0,-.12,-.18);
  for(const offset of [-.28,.28])stories.kit.beam(0x966c48,[-37.1+offset,toolY,-69.62],[-37.35+offset,toolY+1.53,-69.93],.076);
  const barrow=stories.group('Old wheelbarrow',-29,-68.8,.65);
  const wheelbarrow=detailKit(THREE,barrow,true);
  wheelbarrow.part('cylinder',metal,0,.25,.59,.43,.13,.43,0,0,Math.PI/2);
  for(const x of [-.26,.26])wheelbarrow.beam(pale,[0,.3,.55],[x,.54,-.83],.075);
  wheelbarrow.box(rust,0,.49,-.05,.57,.25,.8);
  wheelbarrow.box(0x534643,0,.623,-.07,.47,.024,.64);
  wheelbarrow.finish();
  stories.bounds(barrow,0,0,-.07,.66,1.36,.68);
  stories.finish();

  register('lower-cave-entrance',null,[LOWER_X,CLIFF_Z+0.3]);
  register('upper-cave-entrance',null,[UPPER_X,CLIFF_Z+0.3]);
  for(const [id,x,z] of [['railway-crystal-junction',-20,-40],['railway-shaft-junction',25,-72],
    ['railway-echo-lake-trestle',-40,-52]]) {
    const line=nearest(mine.main,x,z);
    register(id,null,[x,z],line.y);
  }
  return { collision,decks,veins };
}
