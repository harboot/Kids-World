import { EYE_HEIGHT } from '../../core/player.js';

export const wellPosition = Object.freeze({ x: -11.12, z: 5.14 });
export const saucePosition = Object.freeze({ x: -9.62, z: 5.80 });
const drawTime = 2.2, washTime = 5.4;
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { v = clamp(v); return v*v*(3-2*v); };
const mix = (a,b,t) => a+(b-a)*t;

export function buildSauce(THREE, scene, layout) {
  const root = new THREE.Group();
  root.name = 'Sauce — barber';
  root.position.set(saucePosition.x,0,saucePosition.z);
  root.rotation.y = -Math.PI/2;
  scene.add(root);
  const mat = new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9});
  const skin=0xbb8967, hair=0x252423, cloth=0x867b6a;
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
  const torso=group(root,'Sauce torso',0,.84,0);
  batch(torso,'Slim bare chest and protruding belly',(o,b,t)=>{
    o(skin,0,.30,0,.212,.32,.139,12,8);
    o(skin,0,.07,.07,.205,.235,.205,12,8);
    o(skin,0,-.065,0,.182,.12,.135,10,6);
    for(const s of [-1,1]){
      o(skin,s*.18,.47,0,.103,.105,.106);
      o(0xad795b,s*.096,.31,.13,.079,.085,.025);
    }
    t(skin,0,.59,0,.065,.087,.15);
    o(0x85583e,0,.028,.269,.014,.012,.006,6,4);
  });
  const head=group(torso,'Sauce head',0,.66,0);
  batch(head,'Confused face and wet short hair',(o,b)=>{
    o(skin,0,.15,0,.137,.19,.133,14,9);
    o(skin,0,.055,.046,.108,.105,.105,12,7);
    o(hair,0,.265,-.027,.139,.089,.132,12,6);
    o(hair,0,.175,-.105,.119,.12,.044);
    for(const s of [-1,1]){
      o(skin,s*.138,.14,0,.027,.05,.028);
      o(hair,s*.12,.207,-.037,.035,.078,.078);
      o(0xe0c7aa,s*.057,.167,.12,.038,.015,.015,8,5);
      o(0x302823,s*.057,.167,.133,.014,.015,.008,8,5);
      b(0x3c3028,s*.058,.207,.12,.073,.014,.014,0,0,s*.19);
    }
    for(let j=0;j<5;j++)b(hair,-.085+j*.038,.256-j%2*.014,.112,.035,.085,.022,0,0,-.35);
    o(skin,0,.122,.143,.031,.05,.042);
    o(0x75483a,0,.061,.142,.048,.012,.012,8,5);
  });
  const foam=group(head,'Sauce shampoo foam');
  batch(foam,'Soap bubbles on wet hair',(o)=>{
    for(let i=0;i<9;i++)o(0xf2eee2,-.085+(i%3)*.044,.30+Math.floor(i/3)*.019,-.055+(i%4)*.038,.046,.032,.041,7,5);
  });
  batch(root,'Low waist plaid shorts and slim legs',(o,b,t)=>{
    o(cloth,0,.73,0,.205,.15,.147,12,6);
    for(const s of [-1,1]){
      t(cloth,s*.106,.51,0,.126,.115,.47,12);
      // Plaid is painted on the cylinder surface using thin, close-fitting strips.
      for(let j=0;j<12;j++){
        const a=j*Math.PI/6;
        b(j%3?0xaea18b:0x504b44,s*.106+Math.sin(a)*.123,.51,Math.cos(a)*.123,.024,.44,.007,0,a);
      }
      for(let j=0;j<4;j++)t(j%2?0x655b50:0xb5a68e,s*.106,.34+j*.11,0,.129-j*.002,.129-j*.002,.023,12);
      t(skin,s*.106,.17,0,.066,.047,.25,9);
      o(skin,s*.106,.055,.05,.073,.046,.134,10,5);
    }
    b(0x544a41,0,.77,.135,.37,.045,.025);
  });
  const down=new THREE.Vector3(0,-1,0), delta=new THREE.Vector3();
  function arm(s){
    const upper=group(root,'Sauce upper arm '+s), fore=group(root,'Sauce forearm '+s);
    batch(upper,'Upper arm',(o,b,t)=>{t(skin,0,-.14,0,.072,.06,.28);o(skin,0,-.28,0,.061,.061,.061);});
    batch(fore,'Forearm',(o,b,t)=>{t(skin,0,-.14,0,.058,.047,.28);o(skin,0,-.28,0,.058,.07,.045);});
    return {upper,fore};
  }
  const right=arm(1),left=arm(-1);
  function vec(x,y,z){return new THREE.Vector3(x,y,z);}
  function aim(g,a,b){g.position.copy(a);delta.subVectors(b,a);const length=delta.length();g.quaternion.setFromUnitVectors(down,delta.normalize());g.scale.y=length/.28;}
  function poseArm(a,s,elbow,hand){aim(a.upper,vec(s*.205,1.31,0),elbow);aim(a.fore,elbow,hand);}
  const brush=group(root,'Sauce toothbrush');
  batch(brush,'Toothbrush',(o,b)=>{b(0xc4bda3,0,0,0,.024,.025,.19);b(0xeae6da,0,.018,-.076,.033,.025,.047);});
  const scoop=group(root,'Sauce dipper');
  batch(scoop,'Hollow wooden dipper',(o,b,t,add)=>{
    t(0x79563a,0,-.045,0,.087,.071,.025);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;b(0x96704b,Math.sin(a)*.079,.005,Math.cos(a)*.079,.044,.09,.014,0,a);}
    b(0x88613e,0,.015,-.15,.035,.035,.19);
  });
  const bucket=group(scene,'Sauce well bucket');
  batch(bucket,'Wooden bucket with open top',(o,b,t,add)=>{
    t(0x725137,0,.025,0,.15,.15,.05,14);
    for(let i=0;i<14;i++){const a=i*Math.PI*2/14;b(i%2?0x92704c:0x80603f,Math.sin(a)*.17,.145,Math.cos(a)*.17,.077,.28,.025,0,a);}
    for(const y of [.065,.245])add(new THREE.TorusGeometry(.18,.012,5,14),0x514b42,0,y,0,1,1,1,Math.PI/2);
    add(new THREE.TorusGeometry(.166,.012,5,14,Math.PI),0x514b42,0,.27,0);
  });
  const water=group(bucket,'Bucket water');
  batch(water,'Water surface',(o,b,t)=>t(0x729ca0,0,0,0,.155,.155,.012,14));
  const rope=group(scene,'Well draw rope');
  batch(rope,'Rope extension',(o,b,t)=>t(0x9c8055,0,-.5,0,.012,.012,1,6));
  const splash=group(root,'Shampoo water droplets');
  batch(splash,'Falling water',(o)=>{for(let i=0;i<12;i++)o(0x9dc9cf,Math.sin(i*2.4)*.11,-(i%5)*.09,Math.cos(i*2.4)*.09,.017,.045,.017,6,4);});
  const rim={x:wellPosition.x+.62,z:wellPosition.z+.65,y:.85};
  let state='idle', time=0, idle=0;
  const trigger={x:wellPosition.x,z:wellPosition.z,anchorY:1.25,radius:2.45,label:'Timba Air',silent:true,
    get active(){return state==='idle';},
    reachable(p){return Math.abs(p.y-EYE_HEIGHT)<.85;},
    act(){if(state!=='idle')return;state='draw';time=0;render();}};
  function render(){
    const washing=state==='wash', drawing=state==='draw';
    bucket.visible=drawing||washing;rope.visible=drawing&&time<1.65;
    brush.visible=!washing;scoop.visible=washing;splash.visible=false;
    foam.visible=!washing||time<3.9;
    foam.scale.setScalar(washing?1-.85*ease((time-2.0)/1.9):1);
    head.rotation.x=washing?.12*Math.sin(time*4):.035*Math.sin(idle*2);
    if(drawing){
      const raise=ease(time/1.5), transfer=ease((time-1.5)/.7);
      bucket.position.set(mix(wellPosition.x,rim.x,transfer),mix(.12,1.04,raise)-.19*transfer,mix(wellPosition.z,rim.z,transfer));
      rope.position.set(wellPosition.x,1.69,wellPosition.z);
      rope.scale.y=Math.max(.01,1.69-(bucket.position.y+.43));
      water.position.y=.245;
    }
    if(washing){
      bucket.position.set(rim.x,rim.y,rim.z);
      const cycle=Math.min(1,Math.floor(time/2.35));
      const phase=time-cycle*2.35;
      const lift=ease((phase-.35)/.65), lower=ease((phase-1.6)/.65);
      const height=lift*(1-lower);
      const hand=vec(mix(.025,.17,height),mix(1.13,1.91,height),mix(.78,.13,height));
      poseArm(right,1,vec(.30,mix(1.04,1.55,height),mix(.37,.13,height)),hand);
      scoop.position.copy(hand);scoop.position.z+=.08;
      scoop.rotation.x=-1.15*ease((phase-1.0)/.25)*(1-ease((phase-1.6)/.25));
      const pour=phase>1.18&&phase<1.63;
      splash.visible=pour;splash.position.set(.04,1.83,.035);
      water.position.y=.245-.085*(cycle+ease((phase-.35)/.65));
      poseArm(left,-1,vec(-.35,1.43,.12),vec(-.13,1.73,.09+Math.sin(time*10)*.045));
    }else{
      const motion=Math.sin(idle*11)*.047;
      const hand=vec(.14+motion,1.56,.25);
      poseArm(right,1,vec(.31,1.15,.16),hand);
      brush.position.copy(hand);brush.rotation.y=1.15;
      poseArm(left,-1,vec(-.24,1.02,.02),vec(-.24,.76,.06));
      water.position.y=.245;
    }
  }
  function reset(){state='idle';time=0;idle=0;render();}
  function update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    idle+=dt;
    if(state!=='idle'){
      time+=dt;
      if(state==='draw'&&time>=drawTime){time-=drawTime;state='wash';}
      if(state==='wash'&&time>=washTime){reset();return;}
    }
    render();
  }
  // No new collision in the narrow existing west courtyard pedestrian route.
  reset();
  return {root,trigger,update,reset,get state(){return state;}};
}
