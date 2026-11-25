import { beastPosition } from './the-beast.js';
import { EYE_HEIGHT } from '../../core/player.js';
export const bookPosition=Object.freeze({x:18.75,y:13.13,z:5.83});
export const durations=Object.freeze({'book-rise':1.4,lift:5,aim:.8,dive:1.25,impact:10});
const outline=[[-.65,-1.6],[-1.1,-1.1],[-1.35,-.4],[-2.25,.35],[-2.45,.75],[-2.24,1.02],[-1.85,.96],[-1.12,.43],[-1.16,2.35],[-1.03,2.75],[-.77,2.83],[-.55,2.6],[-.43,1.17],[-.35,3.17],[-.18,3.48],[.12,3.5],[.32,3.2],[.37,1.25],[.53,2.98],[.72,3.21],[.99,3.12],[1.08,2.82],[.94,1.02],[1.25,2.19],[1.47,2.4],[1.7,2.25],[1.73,1.95],[1.52,.1],[1.17,-.9],[.62,-1.55]];
const smooth=t=>t*t*(3-2*t);
export function buildHandOfGod({THREE,scene,camera,viewmodel,beast}){
  const book=new THREE.Group();book.name='Hand of God floating book';scene.add(book);
  function box(parent,name,color,w,h,d,x,y,z){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9}));m.name=name;m.position.set(x,y,z);parent.add(m);return m;
  }
  box(book,'Book pages',0xe6d5ab,.58,.13,.78,0,0,0);
  for(const y of [-.085,.085])box(book,'Book cover',0x823b24,.65,.04,.84,0,y,0);
  box(book,'Book spine',0x592b1b,.065,.20,.84,-.31,0,0);
  box(book,'Gold title panel',0xd3ad59,.30,.008,.40,.05,.109,0);
  book.rotation.x=.2;
  const shape=new THREE.Shape(outline.map(([x,y])=>new THREE.Vector2(x,y)));
  const hand=new THREE.Group();hand.name='Hand of God first-person palm';viewmodel.add(hand);
  const palm=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.07,bevelThickness:.06}),new THREE.MeshBasicMaterial({color:0xc88e66}));
  palm.scale.setScalar(.12);hand.add(palm);hand.position.set(.12,-.17,-.85);hand.rotation.z=-.15;hand.visible=false;
  // Beveled, darkened footprint gives a recessed appearance without altering collision.
  const crater=new THREE.Group();crater.name='Hand of God impact crater';scene.add(crater);
  crater.position.set(beastPosition.x,.045,beastPosition.z);crater.rotation.x=-Math.PI/2;
  const floor=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0x655244,roughness:1}));
  floor.name='Handprint recessed-looking floor';crater.add(floor);
  const rimPositions=[];
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length];
    const v=(p,s,h)=>[p[0]*s,p[1]*s,h];
    rimPositions.push(...v(a,1,0),...v(b,1,0),...v(b,1.09,.075),...v(a,1,0),...v(b,1.09,.075),...v(a,1.09,.075));
  }
  const rimGeo=new THREE.BufferGeometry();rimGeo.setAttribute('position',new THREE.Float32BufferAttribute(rimPositions,3));rimGeo.computeVertexNormals();
  crater.add(new THREE.Mesh(rimGeo,new THREE.MeshStandardMaterial({color:0x96816a,roughness:1,side:THREE.DoubleSide})));
  crater.scale.setScalar(1.85);crater.visible=false;
  const start=new THREE.Vector3(),top=new THREE.Vector3(),aimPoint=new THREE.Vector3(beastPosition.x,.1,beastPosition.z);
  const landing=new THREE.Vector3(beastPosition.x+3,EYE_HEIGHT,beastPosition.z+4);
  const startQ=new THREE.Quaternion(),aimQ=new THREE.Quaternion();
  const matrix=new THREE.Matrix4(),up=new THREE.Vector3(0,1,0);
  let state='idle',time=0,idle=0,release=null,armed=true;
  const phases=Object.keys(durations);
  const trigger={x:bookPosition.x,z:bookPosition.z,anchorY:bookPosition.y,radius:1.8,automatic:true,silent:true,label:'Hand of God',
    get active(){return state==='idle'&&armed;},
    reachable(p){return Math.abs(p.y-bookPosition.y)<2;},
    act({guideCamera}){
      if(!trigger.active||!camera||!guideCamera)return;
      start.copy(camera.position);startQ.copy(camera.quaternion);
      top.set(beastPosition.x+1.2,32,beastPosition.z+1.8);
      aimQ.setFromRotationMatrix(matrix.lookAt(top,aimPoint,up));
      release=guideCamera(()=>{});if(!release)return;
      state='book-rise';time=0;armed=false;
    }
  };
  function reset(){
    release?.({x:landing.x,z:landing.z,elevation:0,yaw:0});release=null;
    state='idle';time=idle=0;armed=false;hand.visible=crater.visible=false;book.visible=true;
    book.position.set(bookPosition.x,bookPosition.y,bookPosition.z);beast.setDefeated(false);
  }
  function pose(){
    const t=Math.min(1,time/durations[state]),s=smooth(t);
    if(state==='book-rise')book.position.y=bookPosition.y+1.5*s;
    if(state==='lift'){
      // Rise clear of the upper corridor before drifting toward the courtyard.
      camera.position.copy(start);camera.position.y+=(top.y-start.y)*s;
      const drift=smooth(Math.max(0,(t-.28)/.72));
      camera.position.x+=(top.x-start.x)*drift;camera.position.z+=(top.z-start.z)*drift;
    }
    if(state==='aim'){camera.quaternion.slerpQuaternions(startQ,aimQ,s);hand.visible=true;}
    if(state==='dive'){
      const strike=t*t;
      camera.position.lerpVectors(top,landing,strike);
      camera.lookAt(aimPoint);
    }
    if(state==='impact'){camera.position.copy(landing);camera.lookAt(aimPoint);}
    camera.updateMatrixWorld();
  }
  function update(dt,p){
    if(!Number.isFinite(dt)||dt<=0)return;
    if(state==='idle'){
      idle+=dt;book.position.set(bookPosition.x,bookPosition.y+Math.sin(idle*2)*.12,bookPosition.z);
      if(!p||Math.hypot(p.x-bookPosition.x,p.z-bookPosition.z)>2.4||!trigger.reachable(p))armed=true;
      return;
    }
    while(dt>1e-8&&state!=='idle'){
      const step=Math.min(dt,durations[state]-time);time+=step;dt-=step;pose();
      if(time<durations[state]-1e-8)break;
      const next=phases[phases.indexOf(state)+1];time=0;
      if(!next){reset();break;}
      state=next;
      if(state==='lift')book.visible=false;
      if(state==='impact'){hand.visible=false;crater.visible=true;beast.setDefeated(true);}
      pose();
    }
  }
  return {trigger,update,reset,get state(){return state;}};
}
