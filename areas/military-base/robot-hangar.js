import { EYE_HEIGHT } from '../../core/player.js';
import { ink } from './scenery.js';

export const hangarSite = Object.freeze({ x:-39.5,z:-37, height:28, deck:15, halfWidth:10.5, halfDepth:5.3,
  innerWidth:7.65, innerDepth:3.0, liftZ:6.9, liftHalfWidth:1.65, liftHalfDepth:1.6 });
const armor=0x939c9b, light=0xb9c2be, steel=0x59696e, dark=0x29383e, joint=0x3b474a, rust=0x8c453e, red=0xd84f48;

function buildMech(kit,root) {
  const {group,box,part,beam,solid}=kit;
  const mech=group('Titan maintenance mech',0,0,0,0,root);
  // Faceted shells over a dark articulated frame; all geometry uses existing static batches.
  for(const s of [-1,1]){
    const leg=group(s<0?'Left mech leg':'Right mech leg',s*2.65,0,0,0,mech);
    box(leg,dark,0,.53,.65,3.1,1.06,4.4);
    part(leg,'track',steel,0,1.18,.65,3.0,1.35,4.1);
    part(leg,'crown',light,0,1.13,1.48,2.86,1.15,2.0);
    for(const x of [-.94,0,.94])box(leg,dark,x,.62,2.84,.075,.52,.05);
    part(leg,'octagon',joint,0,2.35,-.15,.92,1.28,.92);
    part(leg,'track',armor,0,4.65,.06,2.55,5.2,2.35,[0,0,s*.045]);
    part(leg,'track',light,0,4.85,1.16,1.57,3.8,.36,[0,0,s*.045]);
    box(leg,rust,s*.79,4.15,1.34,.18,1.9,.075);
    for(const side of [-1,1])beam(leg,steel,[side*.88,2.2,-.84],[side*.88,6.18,-.84],.18,.18,'drum');
    part(leg,'drum',joint,0,7.55,0,1.18,.93,1.18,[0,0,Math.PI/2]);
    part(leg,'track',light,0,7.62,1.12,2.32,1.9,.65);
    part(leg,'track',armor,0,10.15,-.08,2.98,4.9,2.64,[0,0,-s*.10]);
    part(leg,'track',light,s*.43,10.4,1.14,1.88,3.55,.47,[0,0,-s*.10]);
    box(leg,dark,-s*.78,10.3,1.39,.18,2.5,.075,[0,0,-s*.10]);
    solid(leg,0,.65,3.12,4.4,13.2);
  }
  part(mech,'track',joint,0,12.85,0,6.7,2.5,3.0);
  part(mech,'track',armor,0,13.30,1.1,5.4,2.45,1.5);
  part(mech,'tip',light,0,12.50,1.85,2.0,2.0,.48,[0,0,Math.PI]);
  part(mech,'track',dark,0,15.45,0,5.2,3.25,3.25);
  for(let j=0;j<3;j++)box(mech,steel,0,14.5+j*.68,1.64,3.15-j*.22,.24,.34);
  part(mech,'track',armor,0,19.0,0,8.45,5.8,4.2);
  part(mech,'track',light,0,19.83,1.94,5.4,3.4,1.02);
  for(const s of [-1,1]){
    part(mech,'track',light,s*2.43,19.7,1.95,2.9,3.1,1.05,[0,0,-s*.24]);
    box(mech,rust,s*2.45,19.3,2.50,1.75,.11,.075,[0,0,-s*.24]);
    for(let j=0;j<3;j++)box(mech,dark,s*2.72,17.7+j*.35,1.96,1.16,.12,.21,[0,0,-s*.32]);
    part(mech,'track',steel,s*2.28,19.3,-1.99,2.9,3.75,.64);
  }
  part(mech,'drum',dark,0,18.82,2.54,1.04,.44,1.04,[Math.PI/2,0,0]);
  part(mech,'drum',steel,0,18.82,2.80,.84,.18,.84,[Math.PI/2,0,0]);
  part(mech,'drum',0xe9d9a6,0,18.82,2.92,.48,.10,.48,[Math.PI/2,0,0],'powered');
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4;
    box(mech,dark,Math.sin(a)*.70,18.82+Math.cos(a)*.70,2.94,.15,.24,.075,[0,0,-a]);
  }
  part(mech,'octagon',joint,0,22.6,0,.93,1.38,.93);
  const head=group('Titan armored helmet',0,25.0,0,0,mech);
  part(head,'track',dark,0,0,0,2.5,3.35,2.5);
  part(head,'track',light,0,.53,.05,2.85,2.55,2.75);
  part(head,'crown',armor,0,1.56,-.03,2.65,.87,2.5);
  box(head,dark,0,.28,1.46,2.18,.74,.27);
  box(head,red,0,.35,1.62,1.91,.30,.08,[], 'powered');
  for(const s of [-1,1]){
    part(head,'track',steel,s*1.07,-.44,1.22,.64,1.33,.68,[0,0,-s*.24]);
    box(head,light,s*1.39,.24,-.04,.23,1.35,1.6);
    box(head,rust,s*.90,.92,1.43,.11,.65,.08,[0,0,s*.28]);
  }
  part(head,'track',armor,0,-1.02,.91,1.56,.62,1.05);
  for(const s of [-1,1]){
    const arm=group(s<0?'Left mech arm':'Right mech arm',s*5.12,0,0,0,mech);
    part(arm,'drum',joint,0,20.65,0,1.54,1.14,1.54,[0,0,Math.PI/2]);
    part(arm,'track',armor,s*.36,21.15,0,3.62,3.25,3.86,[0,0,-s*.19]);
    part(arm,'crown',light,s*.54,21.7,.03,3.2,1.42,3.65,[0,0,-s*.20]);
    part(arm,'tip',steel,s*1.53,22.1,-.55,1.16,2.02,1.7,[0,0,-s*.39]);
    part(arm,'track',steel,s*.48,18.4,0,2.25,3.58,2.25,[0,0,-s*.12]);
    part(arm,'track',light,s*.48,18.48,1.04,1.44,2.68,.50);
    part(arm,'drum',joint,s*.63,16.10,0,1.06,.82,1.06,[0,0,Math.PI/2]);
    box(arm,red,s*.63,16.10,1.03,.38,.68,.18,[],'powered');
    part(arm,'track',armor,s*.78,14.16,.06,2.25,3.50,2.35);
    part(arm,'track',light,s*.78,14.32,1.02,1.61,2.65,.63);
    for(let j=0;j<4;j++)box(arm,dark,s*.78,13.75+j*.26,1.36,.87,.09,.06);
    part(arm,'octagon',dark,s*.78,12.18,.02,.72,.72,.72);
    part(arm,'track',steel,s*.78,11.33,.08,1.63,1.53,1.48);
    for(let j=0;j<4;j++)box(arm,armor,s*.78+(j-1.5)*.34,10.45,.35,.28,.80,.56);
    box(arm,steel,s*.78-s*.85,11.1,.74,.36,.86,.54,[.3,0,s*.26]);
  }
  return mech;
}

export function buildRobotHangar(kit,moving,{camera,reducedMotion=()=>false,carryPlayer=()=>{},notify=()=>{}}={}) {
  const {group,box,beam,solid,sign}=kit;
  const h=hangarSite, H=h.deck;
  const root=group('Robot Hangar',h.x,0,h.z);
  kit.groundShadow(root,0,0,24,16);
  // A painted, walkable maintenance apron (not a solid slab that obstructs footsteps).
  box(root,0x687674,0,.045,0,23.2,.09,17.3);
  for(const s of [-1,1]) {
    box(root,ink.yellow,s*11.2,.101,0,.11,.018,16.8);
    box(root,ink.yellow,0,.101,s*8.45,22.4,.018,.11);
  }
  buildMech(kit,root);
  const frame=group('Titan hangar support gantry',0,0,0,0,root);
  for(const s of [-1,1])for(const e of [-1,1]){
    const x=s*11.05,z=e*5.95;
    box(frame,steel,x,14.6,z,.66,29.2,.66);
    box(frame,dark,x,.23,z,1.25,.46,1.25);
    solid(frame,x,z,1.25,1.25,29.2);
    for(const y of [3,9,15,21,27])box(frame,light,x,y,z,.86,.22,.86);
    beam(frame,steel,[x,1,z],[s*8.2,8,z],.25);
    beam(frame,steel,[x,23,z],[s*7.0,20.5,z*.34],.30);
    box(frame,ink.yellow,x,15.85,z,.92,.36,.92);
  }
  for(const s of [-1,1]){
    box(frame,steel,s*11.05,29,0,.68,.72,12.6);
    for(let y=5;y<27;y+=5.5){
      beam(frame,steel,[s*11.05,y,-5.95],[s*11.05,y+5.2,5.95],.22);
      beam(frame,steel,[s*11.05,y,5.95],[s*11.05,y+5.2,-5.95],.22);
    }
    box(frame,steel,0,29,s*5.95,22.8,.66,.66);
    box(frame,dark,0,27.9,s*5.95,18,.24,.28);
    for(const x of [-7,0,7]){
      box(frame,dark,x,27.62,s*5.95,.96,.36,.65);
      box(frame,0xffdfa4,x,27.39,s*5.95,.82,.08,.52,[],'powered');
    }
  }
  sign(root,'ROBOT HANGAR',0,4.1,-7.2,6.9,.68,{sub:'TITAN / INSPECTION BAY',yaw:Math.PI});
  sign(root,'TITAN',-9.0,3.0,5.96,3.3,.60,{sub:'MECH MAINTENANCE'});
  const deck=group('Robot inspection catwalk',0,H,0,0,root);
  const W=h.halfWidth,D=h.halfDepth,I=h.innerWidth,J=h.innerDepth;
  for(const s of [-1,1]){
    box(deck,steel,s*(W+I)/2,-.14,0,W-I,.28,D*2);
    box(deck,steel,0,-.14,s*(D+J)/2,I*2,.28,D-J);
    for(let z=-D+.4;z<D;z+=.62)box(deck,0x778d8e,s*(W+I)/2,.012,z,W-I-.23,.023,.055);
    for(let x=-I+.35;x<I;x+=.62)box(deck,0x778d8e,x,.012,s*(D+J)/2,.055,.023,D-J-.16);
  }
  function rail(parent,x1,z1,x2,z2,draw=kit){
    const len=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(len/1.35));
    for(let k=0;k<=n;k++){
      const a=k/n,x=x1+(x2-x1)*a,z=z1+(z2-z1)*a;
      draw.box(parent,ink.yellow,x,.55,z,.085,1.10,.085);
    }
    for(const y of [.56,1.07])draw.beam(parent,ink.yellow,[x1,y,z1],[x2,y,z2],.075);
  }
  for(const s of [-1,1]){
    rail(deck,s*W,-D,s*W,D);
    rail(deck,s*I,-J,s*I,J);
    rail(deck,-I,s*J,I,s*J);
  }
  rail(deck,-W,-D,W,-D);
  rail(deck,-W,D,-h.liftHalfWidth,D);rail(deck,h.liftHalfWidth,D,W,D);
  // Roofless lift with two rail-gates: enter from south at ground, exit north at the deck.
  const shaft=group('Robot lift shaft',0,0,h.liftZ,0,root);
  const A=h.liftHalfWidth,B=h.liftHalfDepth;
  for(const s of [-1,1]){
    box(shaft,dark,s*(A+.19),(H+2.0)/2,0,.21,H+2.0,.32);
    solid(shaft,s*(A+.19),0,.21,.32,H+2.0);
    box(shaft,steel,s*(A+.19),H+2,0,.44,.26,.49);
    for(const y of [1,H+1])box(shaft,0xffcc66,s*(A+.19),y,.19,.12,.18,.09,[],'powered');
  }
  const cabin=group('Open robot lift platform',0,0,0,0,shaft);
  moving.box(cabin,dark,0,-.14,0,A*2,.28,B*2);
  moving.box(cabin,steel,0,-.016,0,A*2-.14,.032,B*2-.12);
  for(const s of [-1,1])rail(cabin,s*A,-B,s*A,B,moving);
  const gates=[-1,1].map(s=>{
    const g=group('Robot lift safety gate',0,0,s*B,0,cabin);
    rail(g,-A,0,A,0,moving);return g;
  });
  moving.box(cabin,dark,A-.29,1.0,0,.28,.34,.48);
  moving.box(cabin,0x64b9ff,A-.46,1.06,0,.075,.13,.13,[],true);
  const dockGate=group('Upper landing safety gate',0,H,D,0,root);
  rail(dockGate,-A,0,A,0,moving);
  let stop=0,trip=null;
  const inside=(x,z,margin=0)=>Math.abs(x-h.x)<=A-margin&&Math.abs(z-(h.z+h.liftZ))<=B-margin;
  const ring=(x,z)=>{const dx=Math.abs(x-h.x),dz=Math.abs(z-h.z);return dx<=W+.00001&&dz<=D+.00001&&(dx>=I-.00001||dz>=J-.00001);};
  const at=(p,y)=>Boolean(p)&&Math.abs(p.y-EYE_HEIGHT-y)<.26;
  function pose(){
    gates[0].scale.setScalar(!trip&&stop===1?0:1);
    gates[1].scale.setScalar(!trip&&stop===0?0:1);
    dockGate.scale.setScalar(!trip&&stop===1?0:1);
  }
  function request(target){trip={target,elapsed:0,duration:reducedMotion()?.45:7};pose();}
  function reachableRide(p){return !trip&&inside(p.x,p.z,.36)&&at(p,cabin.position.y);}
  const ride={x:h.x,z:h.z+h.liftZ,radius:2.15,get anchorY(){return cabin.position.y+1.1;},
    get label(){return stop?'Ride lift down':'Ride lift up';},get active(){return !trip;},reachable:reachableRide,
    act(){if(camera&&reachableRide(camera.position))request(1-stop);}};
  const calls=[0,1].map(i=>({x:h.x,z:h.z+(i?4.25:9.35),radius:1.35,anchorY:(i?H:0)+1.1,
    label:i?'Call lift to catwalk':'Call lift to ground',get active(){return !trip&&stop!==i;},
    reachable(p){return at(p,i?H:0)&&Math.hypot(p.x-this.x,p.z-this.z)<=this.radius;},
    act(){if(this.active&&camera&&this.reachable(camera.position))request(i);}}));
  function update(dt,p){
    if(!trip)return;
    const previous=cabin.position.y;
    trip.elapsed+=dt;
    const k=Math.min(1,trip.elapsed/trip.duration),a=k*k*(3-2*k);
    cabin.position.y=(stop+(trip.target-stop)*a)*H;
    if(p&&inside(p.x,p.z)&&p.y-EYE_HEIGHT>=previous-.09&&p.y-EYE_HEIGHT<=previous+1.5)carryPlayer(cabin.position.y-previous);
    if(k===1){stop=trip.target;trip=null;pose();notify(stop?'Inspection catwalk reached.':'Ground level reached.');}
  }
  function getGroundHeight(x,z,feet=0){
    if(inside(x,z)&&feet>=cabin.position.y-.09&&feet<=cabin.position.y+1.5)return cabin.position.y;
    if(feet>=H-.09&&ring(x,z))return H;
  }
  function blocksGround(x,z,radius,feet=0,from){
    if(!from)return false;
    const inLift=inside(from.x,from.z);
    const onDeck=feet>=H-.09&&ring(from.x,from.z);
    const riding=inLift&&feet>=cabin.position.y-.09&&feet<=cabin.position.y+1.5;
    if(riding||onDeck){
      const allowed=(xx,zz)=>{
        if(riding&&inside(xx,zz))return true;
        if((onDeck||(riding&&!trip&&stop===1))&&ring(xx,zz))return true;
        if(onDeck&&!trip&&stop===1&&inside(xx,zz))return true;
        if(riding&&!trip&&stop===0&&zz>=h.z+h.liftZ+B&&Math.abs(xx-h.x)<=A)return true;
        return false;
      };
      // At ground the open front is an ordinary exit, but other sides remain fenced.
      if(riding&&!trip&&stop===0&&z>=h.z+h.liftZ+B+radius)return false;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;if(!allowed(x+Math.cos(a)*radius,z+Math.sin(a)*radius))return true;}
      return false;
    }
    // Enter the lift only through the ground gate. Don't allow walking into an empty shaft.
    if(inside(x,z,-radius)){
      const fromFront=from.z>=h.z+h.liftZ+B-radius;
      if(trip||stop!==0||!fromFront||Math.abs(x-h.x)>A-radius)return true;
    }
    return false;
  }
  pose();
  return {interactions:[ride,...calls],getGroundHeight,blocksGround,update,reset(){stop=0;trip=null;cabin.position.y=0;pose();}};
}
