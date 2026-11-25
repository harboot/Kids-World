import { EYE_HEIGHT } from '../../core/player.js';
import { wingX } from './layout.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';

// East market bay 1, immediately next to the tailor (bay 2).
const z=-3.375;
export const donutPosition=Object.freeze({x:wingX(1,16.43,z),y:0,z});
export const donutCounter=Object.freeze({x:wingX(1,15.08,z),z});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const duration=2.9;
export function buildDonut(THREE,scene,layout,viewmodel,camera){
  const root=new THREE.Group();root.name='Donut — baker';
  root.position.set(donutPosition.x,0,donutPosition.z);
  root.rotation.y=-Math.PI/2;scene.add(root);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.87});
  const skin=0xc2926e,shirt=0x968d76,apron=0xe5d8bd,pants=0x4d4840;
  function group(parent,name,x=0,y=0,z=0) {
    const g=new THREE.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
  }
  function batch(parent,name,fn) {
    const positions=[], colors=[], color=new THREE.Color();
    function add(geometry,paint,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0) {
      geometry.scale(sx,sy,sz); geometry.rotateX(rx); geometry.rotateY(ry); geometry.rotateZ(rz); geometry.translate(x,y,z);
      const p=geometry.getAttribute('position'), i=geometry.getIndex(); color.setHex(paint);
      for(let k=0;k<(i?i.count:p.count);k++){const n=i?i.getX(k):k;positions.push(p.getX(n),p.getY(n),p.getZ(n));colors.push(color.r,color.g,color.b);}
      geometry.dispose();
    }
    const o=(p,x,y,z,a,b,c,w=10,h=6)=>add(new THREE.SphereGeometry(1,w,h),p,x,y,z,a,b,c);
    const b=(p,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),p,x,y,z,1,1,1,rx,ry,rz);
    const t=(p,x,y,z,a,b,h,n=10)=>add(new THREE.CylinderGeometry(a,b,h,n),p,x,y,z);
    fn(o,b,t,add);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }

  const body=group(root,'Donut body');
  batch(body,'Baker clothes and apron',(o,b,t)=>{
    o(shirt,0,1.18,0,.267,.35,.178,12,7);
    o(shirt,0,.88,0,.224,.19,.155,10,6);
    t(skin,0,1.52,0,.078,.095,.15);
    // A single broad apron bib with straps and a knee-length lower panel.
    b(apron,0,1.22,.172,.31,.37,.032,0,0,0);
    b(apron,0,.80,.178,.43,.48,.038);
    b(0xc2b599,0,.99,.207,.44,.039,.018);
    for(const s of [-1,1]){
      b(apron,s*.115,1.445,.096,.045,.24,.044,-.48,0,s*.14);
      t(pants,s*.122,.49,0,.121,.096,.71,10);
      o(0x38332d,s*.126,.084,.069,.111,.082,.163,10,5);
    }
    b(0xb9ad92,.08,.79,.205,.15,.13,.016);
  });
  const head=group(root,'Donut head',0,1.58,0);
  batch(head,'Middle-aged face and white cook cap',(o,b,t)=>{
    o(skin,0,.13,0,.159,.186,.145,14,8);
    o(0xb17d59,0,.025,.045,.129,.084,.104,12,6);
    for(const s of [-1,1]){
      o(skin,s*.153,.12,0,.036,.051,.029);
      o(0x37332d,s*.133,.194,-.041,.039,.072,.079);
      b(0x4c392d,s*.064,.189,.127,.085,.018,.020,0,0,s*.13);
      o(0xe7d0ae,s*.063,.15,.132,.038,.016,.011,8,5);
      o(0x29231e,s*.063,.15,.142,.012,.013,.009,8,5);
    }
    o(skin,0,.112,.145,.036,.052,.047);
    b(0x78513e,0,.039,.144,.085,.016,.012);
    t(0xe4d9c4,0,.278,-.005,.164,.17,.098,12);
    o(0xf0e8d4,0,.325,-.006,.165,.047,.15,12,5);
  });
  const down=new THREE.Vector3(0,-1,0),delta=new THREE.Vector3();
  function arm(s){
    const upper=group(root,'Donut upper arm '+s),fore=group(root,'Donut forearm '+s);
    batch(upper,'Rolled sleeve',(o,b,t)=>{
      t(shirt,0,-.10,0,.107,.085,.20,10);
      t(skin,0,-.245,0,.076,.07,.14,10);
      o(skin,0,-.31,0,.073,.070,.071,10,5);
    });
    batch(fore,'Baker hand and forearm',(o,b,t)=>{
      t(skin,0,-.15,0,.064,.077,.30,10);
      o(skin,0,-.32,.025,.076,.064,.057,10,5);
    });
    return {upper,fore,elbow:new THREE.Vector3(),hand:new THREE.Vector3()};
  }
  const left=arm(-1),right=arm(1);
  const shoulder=new THREE.Vector3();
  function aim(g,a,b,l){g.position.copy(a);delta.subVectors(b,a);const len=delta.length();g.quaternion.setFromUnitVectors(down,delta.normalize());g.scale.y=len/l;}
  function pose(a,s,ex,ey,ez,hx,hy,hz){
    shoulder.set(s*.225,1.40,0);a.elbow.set(ex,ey,ez);a.hand.set(hx,hy,hz);
    aim(a.upper,shoulder,a.elbow,.31);aim(a.fore,a.elbow,a.hand,.32);
  }
  function bun(parent,name,r){
    const g=group(parent,name);
    batch(g,name,(o,b)=>{
      o(0xf1dfbc,0,0,0,r,r*.69,r,14,8);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        b(0xdcc8a4,Math.sin(a)*r*.28,r*.61,Math.cos(a)*r*.28,r*.055,r*.03,r*.40,0,a);
      }
    });
    return g;
  }
  const dough=group(root,'Donut kneading dough',0,.992,.90);
  batch(dough,'Flour dough',(o)=>o(0xead5ad,0,0,0,.205,.066,.145,12,6));
  const tray=group(root,'Steamed bun display',-.64,1.00,.90);
  batch(tray,'Bamboo tray and buns',(o,b,t)=>{
    t(0xa37a49,0,.035,0,.24,.24,.07,14);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;o(0xf0dfbe,Math.sin(a)*.122,.091,Math.cos(a)*.122,.077,.055,.077,9,5);}
  });
  const offered=bun(root,'Donut offered steamed bun',.089);
  const eating=viewmodel?group(viewmodel,'Player eating steamed bun'):null;
  let held;
  if(eating){
    const grip=group(eating,'Player sleeve and hand');
    batch(grip,'First-person hand',(o,b,t)=>{
      o(0x6577a2,.14,-.23,.07,.084,.22,.084,10,6);
      o(0xffedd2,.068,-.10,.025,.073,.066,.073,10,5);
      o(0xd99d76,.038,-.037,.02,.067,.080,.057,10,6);
      o(0xd99d76,-.035,-.005,.038,.035,.055,.033,8,5);
    });
    held=bun(eating,'Held steamed bun',.095);
    held.position.set(-.018,.044,-.028);
    eating.traverse(o=>{o.layers.set(PLAYER_ONLY_LAYER);o.castShadow=false;o.receiveShadow=false;});
  }
  let near=false,blend=0,elapsed=0,clock=0,active=false,cooldown=0;
  const inRange=p=>!!p&&Math.abs(p.y-EYE_HEIGHT)<.85&&Math.hypot(p.x-donutCounter.x,p.z-z)<=1.85&&p.x<donutCounter.x+.15;
  const trigger={x:donutCounter.x,z,anchorY:1.45,radius:1.85,label:'Take Steamed Bun',
    get active(){return near&&!active&&cooldown===0&&blend>.65;},reachable:inRange,
    act(){if(!trigger.active)return;active=true;elapsed=0;near=false;offered.visible=false;if(eating)eating.visible=true;renderEating();}};
  function renderEating(){
    if(!eating)return;
    const rise=smooth(elapsed/.30)*(1-smooth((elapsed-2.50)/.40));
    const bite=t=>smooth((elapsed-t+.34)/.30)*(1-smooth((elapsed-t)/.30));
    const close=Math.max(bite(.85),bite(1.94));
    const width=Math.min(camera?.aspect??1,1);
    eating.position.set(mix(.19*width,.02*width,close),mix(-.22,-.085,close)-(1-rise)*.24,mix(-.65,-.31,close));
    eating.rotation.set(-.20*close,0,.13-.20*close);
    held.scale.setScalar(elapsed>=1.94?.04:elapsed>=.85?.60:1);
    held.visible=elapsed<1.94;
  }
  function render(){
    const k=Math.sin(clock*5);
    const press=(1-blend)*k;
    dough.scale.set(1+.08*press,1-.14*press,1+.06*press);
    pose(left,-1,-.32,1.15,.29,-.16,1.04+.045*press,.83-.055*press);
    pose(right,1,.32,mix(1.15,1.30,blend),mix(.29,.41,blend),
      mix(.16,.14,blend),mix(1.04-.045*press,1.36,blend),mix(.83+.055*press,.98,blend));
    offered.position.copy(right.hand);offered.position.y+=.075;offered.position.z+=.03;
    offered.visible=near&&!active&&cooldown===0&&blend>.65;
    head.rotation.x=.08*(1-blend)+.02*Math.sin(clock*2);
  }
  function reset(){
    near=false;blend=0;elapsed=0;clock=0;active=false;cooldown=0;
    if(eating)eating.visible=false;
    render();
  }
  function update(dt,p){
    if(!Number.isFinite(dt)||dt<=0)return;
    clock+=dt;cooldown=Math.max(0,cooldown-dt);
    if(active){
      elapsed+=dt;
      if(elapsed>=duration){active=false;cooldown=.7;if(eating)eating.visible=false;}
      else renderEating();
    }
    near=inRange(p)&&!active&&cooldown===0;
    blend+=(near?1-blend:-blend)*(1-Math.exp(-dt*8));
    render();
  }
  // The shop counter supplies the collision; the NPC stays behind it.
  reset();
  return {root,trigger,update,reset,get eating(){return active;}};
}
