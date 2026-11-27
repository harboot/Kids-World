import { EYE_HEIGHT } from '../../core/player.js';

// The clearing is southwest of the frozen lake, away from the other mission sites.
export const TROLL_PLATFORM = Object.freeze({ x: -21, z: 18, height: 1.4, topRadius: 1.5, baseRadius: 3.9 });
export const TROLL_SITES = Object.freeze([
  [-25.8,15.5],[-26.2,20.1],[-24.5,22.6],[-20.3,23.7],
  [-16.4,22.8],[-15.8,18],[-16.7,13.7],[-24.5,13.1],
].map(Object.freeze));
const cue = [
  [48,{duration:.18,level:.13,wave:'triangle'}],
  [60,{duration:.15,level:.09},.15],
  [67,{duration:.23,level:.1},.30],
  [72,{duration:.32,level:.08},.48],
];

export function createTrollGathering({THREE,scene,kit,ground,reducedMotion,playCue,notify,onComplete,playerRadius=.34}) {
  const {x,z,height,topRadius,baseRadius}=TROLL_PLATFORM;
  const base=ground(x,z), top=base+height;
  const {material,obstacles,cone,box}=kit;
  const group=new THREE.Group();
  group.name='Troll Gathering';
  scene.add(group);
  // The visible faceted platform and the continuous walk surface share exactly the
  // same square-ring profile; no jump, teleport, or invisible step is necessary.
  const outline=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
  const outer=outline.map(([dx,dz])=>[dx*baseRadius,0,dz*baseRadius]);
  const inner=outline.map(([dx,dz])=>[dx*topRadius,height,dz*topRadius]);
  const vertices=[],colors=[];
  const shades=[0x78858d,0x87959a,0x697982,0x849198];
  function triangle(a,b,c,color) {
    const tint=new THREE.Color(color);
    for(const p of [a,b,c]) {vertices.push(...p);colors.push(tint.r,tint.g,tint.b);}
  }
  for(let i=0;i<outline.length;i++) {
    const j=(i+1)%outline.length;
    triangle(inner[i],inner[j],outer[j],shades[i%4]);
    triangle(inner[i],outer[j],outer[i],shades[(i+1)%4]);
    triangle([0,height,0],inner[j],inner[i],0xa7b7bc);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const platform=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));
  platform.name='Troll Gathering flat rock';
  platform.position.set(x,base,z);
  platform.receiveShadow=true;
  group.add(platform);
  function surface(px,pz) {
    const r=Math.max(Math.abs(px-x),Math.abs(pz-z));
    if(r>=baseRadius)return null;
    return base+height*Math.min(1,(baseRadius-r)/(baseRadius-topRadius));
  }

  const facet=new THREE.DodecahedronGeometry(1,0);
  const granite=material(0x78848b), light=material(0x9ba6a9);
  const dark=material(0x47575b), moss=material(0x59794a);
  const mossLight=material(0x78985a), snow=material(0xdceaf0);
  const white=material(0xf2f6e9), eyeInk=material(0x283136);
  const purple=material(0xa68cce), cyan=material(0x73c8d4);
  function part(parent,shape,mat,px,py,pz,sx,sy,sz) {
    const mesh=new THREE.Mesh(shape,mat);
    mesh.position.set(px,py,pz);
    mesh.scale.set(sx,sy,sz);
    parent.add(mesh);
    return mesh;
  }
  const trolls=TROLL_SITES.map(([tx,tz],i)=>{
    const y=ground(tx,tz), size=.84+(i%4)*.09;
    const root=new THREE.Group();
    root.name='Troll '+(i+1);
    root.position.set(tx,y,tz);
    root.rotation.y=Math.atan2(x-tx,z-tz);
    group.add(root);
    const rock=new THREE.Group();
    rock.name='Sleeping troll rock '+(i+1);
    root.add(rock);
    part(rock,facet,granite,0,.39,0,.69,.48,.61);
    part(rock,facet,i%2?snow:moss,.08,.68,-.08,.52,.21,.43);
    const body=new THREE.Group();
    body.name='Awake troll '+(i+1);
    root.add(body);
    body.scale.setScalar(size);
    // Short stone legs, round torso, moss collar, broad nose and ears.
    for(const side of [-1,1])part(body,facet,dark,side*.25,.18,.09,.26,.22,.37);
    part(body,facet,granite,0,.67,0,.55,.54,.43);
    part(body,facet,moss,0,.94,-.05,.58,.23,.46);
    part(body,facet,light,0,1.29,.09,.49,.42,.39);
    for(const side of [-1,1]){
      part(body,facet,granite,side*.47,1.32,.04,.20,.18,.16);
      part(body,facet,white,side*.17,1.4,.405,.105,.105,.066);
      part(body,facet,eyeInk,side*.17,1.4,.46,.046,.055,.028);
    }
    part(body,facet,light,0,1.29,.46,.15,.125,.15);
    part(body,box,dark,0,1.13,.421,.22,.045,.03);
    part(body,facet,mossLight,-.09,1.63,-.02,.42,.16,.33);
    const crystal=part(body,cone,i%2?purple:cyan,.18,.94,.39,.10,.25,.10);
    crystal.rotation.z=.25;
    const arms=[-1,1].map(side=>{
      const arm=new THREE.Group();
      arm.position.set(side*.46,.85,0);
      body.add(arm);
      part(arm,facet,granite,side*.19,-.23,.02,.24,.35,.24);
      part(arm,facet,light,side*.26,-.43,.07,.25,.21,.26);
      return arm;
    });
    obstacles.push({
      height:y+size*1.7,
      touches(px,pz){return Math.hypot(px-tx,pz-tz)<.66+playerRadius;}
    });
    return {root,rock,body,arms,size,delay:i*.13};
  });
  let complete=false, awake=false, elapsed=0, progress=0, time=0;
  function pose(still=false) {
    for(const [i,troll] of trolls.entries()){
      const p=still?Number(awake):Math.max(0,Math.min(1,(progress-troll.delay)/1.05));
      const ease=p*p*(3-2*p);
      troll.rock.visible=p<.8;
      troll.rock.scale.set(1-.23*ease,1-.65*ease,1-.23*ease);
      troll.body.visible=p>.06;
      troll.body.scale.set(troll.size,troll.size*Math.max(.12,ease),troll.size);
      const bounce=awake&&p===1&&!still?Math.abs(Math.sin(time*3+i*.9))*.075:0;
      troll.body.position.y=bounce;
      troll.arms[0].rotation.z=-.12;
      troll.arms[1].rotation.z=.12+ease*(1.7+(still?0:.3*Math.sin(time*6+i)));
    }
  }
  function reset(){
    complete=awake=false;
    elapsed=progress=time=0;
    pose();
  }
  function update(dt,eye,grounded=true){
    if(!eye)return;
    const distance=Math.hypot(eye.x-x,eye.z-z);
    const onTop=grounded&&Math.abs(eye.x-x)<=topRadius-.12&&Math.abs(eye.z-z)<=topRadius-.12&&
      Math.abs(eye.y-EYE_HEIGHT-top)<.12;
    if(!awake&&onTop){
      awake=true;
      elapsed=0;
      playCue?.(cue);
      notify?.('The stones are waking up!');
    }
    if(awake&&distance>11){awake=false;elapsed=0;}
    const still=Boolean(reducedMotion?.());
    time=(time+dt)%600;
    const duration=1.05+trolls.at(-1).delay;
    progress=still?(awake?duration:0):Math.max(0,Math.min(duration,progress+(awake?dt:-dt)));
    if(awake){
      elapsed+=dt;
      if(!complete&&(still||elapsed>=duration)&&progress>=duration){
        complete=true;
        notify?.('Troll Gathering complete!');
        onComplete?.();
      }
    }
    pose(still);
  }
  reset();
  return {surface,update,reset,get complete(){return complete;}};
}
