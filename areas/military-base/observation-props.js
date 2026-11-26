import { binocularPoint, northPost, lookout } from './layout.js';
import { ink } from './scenery.js';

// Five fixed in-world views. No simultaneous render targets.
export const cctvViews = Object.freeze([
  { name: 'South Gate', eye: [-6.7,4.5,60.6], target: [0,1.3,52] },
  { name: 'Headquarters', eye: [-5.2,6.2,9.3], target: [-11,1.3,14] },
  { name: 'Motor Pool', eye: [51.4,5.1,36.8], target: [32,1.1,44] },
  { name: 'Helipad', eye: [11.5,5.1,-31.3], target: [22,1.2,-35] },
  { name: 'North Post', eye: [-8.14,3.2,-56.1], target: [-6,1,-49] },
]);

export function buildNorthPost(kit) {
  const { group, box, sign, solid } = kit;
  const { x,z,width:w,depth:d,floor } = northPost;
  const room = group('North Post CCTV room',x,0,z);
  const h=2.65,t=.22,door=1.55;
  kit.groundShadow(room,.3,-.3,w+1,d+1);
  box(room,ink.footing,0,floor/2,0,w+.22,floor,d+.24);
  solid(room,0,0,w+.22,d+.24,floor);
  function wall(xx,zz,ww,dd) {
    box(room,0x729582,xx,floor+h/2,zz,ww,h,dd);
    solid(room,xx,zz,ww,dd,floor+h);
  }
  wall(0,-d/2+t/2,w,t);
  for(const s of [-1,1]) {
    wall(s*(w/2-t/2),0,t,d-2*t);
    const wing=(w-door)/2;
    wall(s*(door+wing)/2,d/2-t/2,wing,t);
    box(room,ink.dark,s*(door/2+.06),floor+1.06,d/2+.03,.12,2.12,.18);
    const leaf=group('North Post open door',s*(door/2+.09),floor,d/2-.45,0,room);
    box(leaf,ink.teal,0,1.04,0,.09,2.08,.70);
    box(leaf,ink.steel,-s*.07,1.06,-.19,.05,.11,.08);
    solid(leaf,0,0,.10,.70,2.08);
    box(room,ink.dark,s*1.58,1.73,d/2+.02,.80,.68,.10);
    box(room,0xe8d6a2,s*1.58,1.73,d/2+.085,.69,.57,.04,[],true);
  }
  box(room,0x729582,0,floor+2.12+(h-2.12)/2,d/2-t/2,door,h-2.12,t);
  box(room,ink.roof,0,floor+h+.13,0,w+.38,.26,d+.38);
  box(room,ink.dark,0,floor+h+.30,0,w+.5,.10,d+.5);
  sign(room,'NORTH POST',0,2.59,d/2+.16,2.65,.34,{sub:'CCTV CONTROL'});
  // Five decorative monitor displays. Live views occupy the main game canvas only.
  const desk=group('CCTV control desk',0,floor,-1.28,0,room);
  box(desk,ink.steel,0,.77,0,3.85,.13,.70);
  for(const s of [-1,1]) box(desk,ink.dark,s*1.70,.37,0,.17,.74,.60);
  solid(desk,0,0,3.85,.70,.84);
  for(let i=0;i<cctvViews.length;i++) {
    const xx=(i-2)*.74;
    const monitor=group('CCTV monitor '+(i+1),xx,1.20,-.10,0,desk);
    box(monitor,ink.dark,0,0,0,.69,.49,.12);
    box(monitor,0x315969,0,0,.071,.60,.39,.025,[],true);
    // Stylized security feed graphic and small green online light.
    box(monitor,0x567e87,0,-.105,.09,.57,.08,.012,[],true);
    box(monitor,0x76998c,-.17,-.008,.092,.18,.14,.013,[],true);
    box(monitor,0x9bb7a6,.15,-.026,.093,.18,.10,.014,[],true);
    box(monitor,0x8df0ad,.27,-.218,.074,.042,.035,.022,[],true);
    box(monitor,ink.steel,0,-.33,0,.10,.18,.12);
    sign(monitor,'CAM '+(i+1),0,.33,.03,.46,.13,{style:'gold'});
  }
  box(desk,ink.dark,0,.86,.22,.75,.07,.25);
  for(let i=0;i<5;i++) box(desk,0x9bbaa8,(i-2)*.12,.906,.22,.075,.022,.12,[],true);
  const button=group('CCTV interaction button',0,.85,.24,0,desk);
  box(button,ink.dark,0,0,0,.24,.065,.23);
  box(button,0x77f1b3,0,.045,0,.13,.045,.13,[],true);
  box(room,0xffebc4,0,floor+h-.08,0,1.3,.065,.24,[],true);
  return room;
}

export function buildObservationProps(kit) {
  const { group, box, part, beam, sign } = kit;
  const {x,y,z} = binocularPoint;
  const mount=group('Night vision binoculars',x,y,z,-1.95);
  box(mount,ink.dark,0,.07,0,.52,.14,.52);
  kit.solid(mount,0,0,.30,.30,1.17);
  part(mount,'post',ink.steel,0,.60,0,.075,1.09,.075);
  box(mount,ink.dark,0,1.19,0,.62,.22,.30);
  for(const s of [-1,1]) {
    part(mount,'drum',ink.dark,s*.18,1.28,.16,.13,.52,.13,[Math.PI/2,0,0]);
    part(mount,'drum',0x77aa8e,s*.18,1.28,.43,.099,.025,.099,[Math.PI/2,0,0],true);
    part(mount,'drum',ink.rubber,s*.18,1.28,-.13,.108,.12,.108,[Math.PI/2,0,0]);
  }
  box(mount,0x83c8a1,0,1.34,-.015,.08,.055,.12,[],true);
  // Place small housings near their actual virtual viewpoint, without creating lights.
  cctvViews.forEach(({eye,target},i)=>{
    const [ex,ey,ez]=eye;
    const yaw=Math.atan2(target[0]-ex,target[2]-ez);
    const cam=group('CCTV camera '+(i+1),ex,ey,ez,yaw);
    box(cam,ink.steel,0,.08,-.18,.24,.23,.26);
    box(cam,ink.pale,0,0,0,.30,.21,.44,[.23,0,0]);
    box(cam,ink.dark,0,-.04,.24,.24,.17,.055,[.23,0,0]);
    part(cam,'drum',ink.glassLight,0,-.04,.274,.067,.026,.067,[Math.PI/2+.23,0,0]);
    box(cam,0xff7761,.11,-.04,.276,.028,.028,.018,[],true);
  });
  return { binocular:binocularPoint, console:{x:northPost.x,z:northPost.z-.72,y:northPost.floor}, cameras:cctvViews };
}
