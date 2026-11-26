import { generatorSite } from './layout.js';
import { ink } from './scenery.js';

// The old Signal Lodge footprint becomes an open power building. All equipment
// is decorative; the mission is a single fictional start-button interaction.
export function buildGenerator(kit,moving) {
  const {group,box,part,beam,solid,sign}=kit;
  const {x,z,width:w,depth:d,floor}=generatorSite;
  const room=group('Generator building',x,0,z), h=3.2,t=.24,door=2.5;
  kit.groundShadow(room,.4,-.3,w+1.2,d+1.2);
  box(room,ink.footing,0,floor/2,0,w+.45,floor,d+.55);
  solid(room,0,0,w+.45,d+.55,floor);
  function wall(xx,zz,ww,dd) {
    box(room,0x668775,xx,floor+h/2,zz,ww,h,dd);
    solid(room,xx,zz,ww,dd,floor+h);
  }
  wall(0,-d/2+t/2,w,t);
  for(const s of [-1,1]) {
    wall(s*(w/2-t/2),0,t,d-t*2);
    const wing=(w-door)/2;
    wall(s*(door+wing)/2,d/2-t/2,wing,t);
    box(room,ink.dark,s*(door/2+.09),floor+1.17,d/2+.035,.15,2.34,.20);
    const leaf=group('Generator open door',s*(door/2+.10),floor,d/2-.62,0,room);
    box(leaf,ink.teal,0,1.13,0,.12,2.26,1.13);
    box(leaf,ink.steel,-s*.07,1.11,-.31,.05,.15,.09);
    solid(leaf,0,0,.12,1.13,2.26);
    box(room,ink.dark,s*2.55,1.91,d/2+.025,1.25,.9,.11);
    box(room,0x34454a,s*2.55,1.91,d/2+.095,1.10,.75,.05);
  }
  box(room,0x668775,0,floor+2.34+(h-2.34)/2,d/2-t/2,door,h-2.34,t);
  box(room,ink.roof,0,floor+h+.12,0,w+.48,.24,d+.48);
  part(room,'crown',0x3a7a70,0,floor+h+.22,0,w+.60,1.02,d+.60);
  sign(room,'GENERATOR',0,2.91,d/2+.17,3.4,.47);
  const powered=group('Generator powered indicators',0,0,0,0,room);
  for(const zz of [-1.8,1.7]) {
    box(room,ink.dark,0,floor+h-.12,zz,1.50,.14,.27);
    box(room,0x374247,0,floor+h-.205,zz,1.32,.035,.21);
    moving.box(powered,0xffe3aa,0,floor+h-.232,zz,1.32,.025,.21,[],true);
  }
  box(room,ink.dark,0,2.55,d/2+.21,.75,.18,.25);
  moving.box(powered,0xffe3aa,0,2.43,d/2+.23,.62,.065,.18,[],true);
  for(const s of [-1,1])moving.box(powered,0xe6c88c,s*2.55,1.91,d/2+.13,1.10,.75,.025,[],true);
  const unit=group('Diesel generator',-2.22,floor,-.95,0,room);
  box(unit,ink.dark,0,.15,0,2.15,.30,3.23);
  box(unit,0x8f965d,0,.91,0,1.94,1.20,2.95);
  box(unit,ink.steel,0,1.55,0,1.85,.12,2.85);
  for(let i=0;i<9;i++)box(unit,ink.dark,.99,.97,(i-4)*.22,.035,.68,.092);
  part(unit,'drum',ink.dark,-.48,1.72,-.85,.12,.35,.12);
  beam(unit,ink.steel,[-.48,1.85,-.85],[-.48,2.68,-1.28],.13);
  solid(unit,0,0,2.15,3.23,1.75);
  const cabinets=group('Generator electrical panels',1.85,floor,-2.83,0,room);
  for(const xx of [-.7,.7]) {
    box(cabinets,0x526c70,xx,1.03,0,1.27,2.06,.64);
    box(cabinets,0x81948a,xx,1.04,.34,1.15,1.91,.075);
    box(cabinets,ink.dark,xx,1.53,.394,.65,.39,.035);
    moving.box(powered,0x6acb8e,1.85+xx,floor+1.53,-2.83+.421,.58,.31,.018,[],true);
    for(let i=0;i<4;i++)box(cabinets,ink.dark,xx-.36+i*.24,.91,.395,.13,.20,.05);
    box(cabinets,ink.dark,xx+.45,.74,.415,.075,.18,.065);
  }
  solid(cabinets,0,0,2.72,.72,2.06);
  const control=group('Generator start panel',0,floor,-2.70,0,room);
  box(control,ink.steel,0,.72,0,.76,1.44,.40);
  box(control,ink.dark,0,1.32,.23,.82,.35,.18);
  box(control,0xb7aa6d,0,1.32,.335,.18,.15,.05);
  moving.box(powered,0x78ef9d,0,floor+1.32,-2.70+.375,.14,.12,.03,[],true);
  sign(control,'START',0,1.63,.26,.70,.20,{style:'gold'});
  solid(control,0,0,.86,.58,1.50);
  // Colored cable bundles run along the rear wall and ceiling, away from the walkway.
  for(const [i,tint] of [0x343d42,0xc48d3e,0x658b8a,0xb45e48].entries()){
    const yy=2.15+i*.12;
    const route=[[-2.22,floor+1.62,-2.32],[-2.22,yy,-3.52],[.20,yy,-3.52],[1.85+i*.16,yy,-3.52],[1.85+i*.16,floor+1.96,-3.13]];
    for(let k=1;k<route.length;k++)beam(room,tint,route[k-1],route[k],.072);
  }
  let enabled=false;
  function setPowered(value){enabled=Boolean(value);powered.scale.setScalar(enabled?1:0);}
  setPowered(false);
  return {panel:{x,z:z-2.38,y:floor},setPowered,get powered(){return enabled;}};
}
