import { EYE_HEIGHT } from '../../core/player.js';
import { wingX } from './layout.js';

// East market bay 2 is centered at z=1.375. Keep the NPC in front of it,
// outside the recessed shop and clear of the stairs and upper galleries.
export const tailorPosition=Object.freeze({x:wingX(1,13.72,1.375),y:0,z:1.375});
const frontYaw=-Math.PI/2;
const skin=0xc08c68, shirt=0xc6c4ac, vest=0x55574e, pants=0x454341, shoes=0x292a28;
const mix=(a,b,t)=>a+(b-a)*t;

export function buildTailor(THREE,scene,layout){
  const root=new THREE.Group();root.name='Tailor — Hung Gar master';
  root.position.set(tailorPosition.x,tailorPosition.y,tailorPosition.z);
  root.rotation.y=frontYaw;scene.add(root);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.88});
  const metal=new THREE.MeshStandardMaterial({color:0x9ba1a3,metalness:.65,roughness:.31,flatShading:true});
  function group(name,parent,x=0,y=0,z=0){
    const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
  }
  // Closed primitives, baked to one mesh per articulated body section.
  function batch(name,parent,build,mat=material){
    const pos=[],colors=[],color=new THREE.Color();
    function add(g,paint,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
      g.scale(sx,sy,sz);g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);
      const p=g.getAttribute('position'),idx=g.getIndex();color.setHex(paint);
      for(let i=0;i<(idx?idx.count:p.count);i++){
        const n=idx?idx.getX(i):i;pos.push(p.getX(n),p.getY(n),p.getZ(n));colors.push(color.r,color.g,color.b);
      }
      g.dispose();
    }
    const oval=(p,x,y,z,a,b,c,w=10,h=6)=>add(new THREE.SphereGeometry(1,w,h),p,x,y,z,a,b,c);
    const box=(p,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),p,x,y,z,1,1,1,rx,ry,rz);
    const tube=(p,x,y,z,r1,r2,len,n=8)=>add(new THREE.CylinderGeometry(r1,r2,len,n),p,x,y,z);
    build(oval,box,tube,add);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,mat);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const upper=group('Tailor torso',root,0,.99,0);
  batch('Tailor fitted jacket',upper,(o,b,t)=>{
    o(pants,0,-.025,0,.205,.13,.13,10,5);
    o(vest,0,.30,0,.245,.31,.145,10,7);
    o(shirt,0,.34,.123,.118,.24,.043,8,5);
    b(0x353a37,-.105,.38,.151,.055,.30,.035,0,0,-.22);
    b(0x353a37,.105,.38,.151,.055,.30,.035,0,0,.22);
    for(let j=0;j<3;j++)o(0x302c28,0,.13+j*.085,.169,.018,.018,.013,6,4);
    b(0x514336,0,.055,0,.37,.075,.245);
    t(skin,0,.605,0,.075,.09,.16,9);
  });
  const head=group('Tailor head',upper,0,.66,0);
  batch('Tailor shaped face and short hair',head,(o,b)=>{
    o(skin,0,.15,0,.145,.211,.142,14,9);
    o(0xb77c56,0,.055,.055,.121,.107,.106,10,6);
    o(0x292b29,0,.288,-.027,.149,.095,.145,12,6);
    for(const s of [-1,1]){
      o(0x292b29,s*.125,.205,-.035,.033,.088,.094,8,5);
      o(skin,s*.145,.133,0,.033,.058,.031,8,5);
      o(0x835f4e,s*.062,.184,.122,.052,.025,.03,8,5);
      o(0xe4d9c7,s*.062,.184,.143,.036,.015,.012,8,5);
      o(0x282622,s*.062,.184,.153,.014,.016,.007,8,5);
      b(0x292b29,s*.063,.217,.134,.082,.018,.023,0,0,s*.13);
    }
    o(0xc48d66,0,.143,.145,.033,.045,.044,8,5);
    o(0x80523c,0,.069,.136,.057,.012,.012,8,4);
    // Neat side-part, rendered as raised hair planes.
    b(0x343632,-.055,.303,.062,.13,.035,.10,0,.15,-.13);
  });
  const down=new THREE.Vector3(0,-1,0),delta=new THREE.Vector3();
  const point=new THREE.Vector3(),end=new THREE.Vector3();
  function segment(parent,name,length,draw){
    const g=group(name,parent);batch(name+' geometry',g,draw);return {g,length};
  }
  function place(seg,a,b){
    seg.g.position.copy(a);delta.subVectors(b,a);
    const len=delta.length();seg.g.quaternion.setFromUnitVectors(down,delta.normalize());
    seg.g.scale.y=len/seg.length;
  }
  const limbs=[-1,1].map(s=>{
    const side=s<0?'left':'right';
    const arm=segment(root,'Tailor '+side+' upper arm',.31,(o,b,t)=>{
      t(shirt,0,-.09,0,.108,.091,.20,9);o(shirt,0,-.025,0,.112,.09,.102,9,5);
      t(skin,0,-.235,0,.077,.071,.15,9);o(skin,0,-.31,0,.073,.075,.071,9,5);
    });
    const fore=segment(root,'Tailor '+side+' forearm',.32,(o,b,t)=>{
      t(skin,0,-.16,0,.072,.052,.32,10);
      o(skin,0,-.35,.014,.069,.087,.061,9,6);
      o(0xb67d59,s*.052,-.327,.034,.03,.048,.034,8,5);
    });
    // Five actual hollow iron rings follow each forearm's articulation.
    batch('Tailor '+side+' iron rings',fore.g,(o,b,t,add)=>{
      for(let j=0;j<5;j++)add(new THREE.TorusGeometry(.088-j*.004,.019,6,12),0xffffff,0,-.06-j*.048,0,1,1,1,Math.PI/2);
    },metal);
    const thigh=segment(root,'Tailor '+side+' thigh',.44,(o,b,t)=>{
      t(pants,0,-.21,0,.12,.085,.44,9);o(pants,0,-.03,0,.12,.10,.115,9,5);
    });
    const shin=segment(root,'Tailor '+side+' shin',.43,(o,b,t)=>{
      t(pants,0,-.21,0,.089,.065,.43,9);o(pants,0,-.018,0,.086,.085,.081,9,5);
    });
    const shoe=group('Tailor '+side+' shoe',root);
    batch('Tailor '+side+' cloth shoe',shoe,(o,b)=>{
      o(shoes,0,.075,.055,.10,.075,.17,10,5);
      b(0x716455,0,.024,.05,.175,.033,.27);
    });
    return {s,arm,fore,thigh,shin,shoe};
  });
  // Static collision is kept narrow so the shop entrance remains usable.
  layout.solid(tailorPosition.x,tailorPosition.z,.64,.64,1.65);
  let ready=false,blend=0,turn=0;
  function pose(t){
    const hipY=mix(.99,.79,t);
    upper.position.y=hipY;
    upper.rotation.y=.12*t;
    head.rotation.y=-.12*t;
    for(const l of limbs){
      const s=l.s;
      // Horse stance: both shoes stay on the pavement and spread outward,
      // knees bend while the waist lowers.
      const footX=s*mix(.125,.43,t),footZ=s*mix(0,.10,t);
      l.shoe.position.set(footX,0,footZ);l.shoe.rotation.y=s*.18*t;
      point.set(s*.125,hipY,0);end.set(s*mix(.125,.31,t),mix(.54,.43,t),.19*t+footZ*.45);
      place(l.thigh,point,end);
      point.copy(end);end.set(footX,.11,footZ);place(l.shin,point,end);
      // One forward guard and one chambered fist; no attack or damage.
      point.set(s*.245,hipY+.50,0);
      end.set(s*mix(.28,.37,t),hipY+mix(.19,.28,t),mix(.015,s<0?.23:.10,t));
      place(l.arm,point,end);
      point.copy(end);
      end.set(s*mix(.28,s<0?.15:.27,t),hipY+mix(-.12,s<0?.48:.36,t),mix(.035,s<0?.54:.30,t));
      place(l.fore,point,end);
    }
  }
  pose(0);
  return {root,get ready(){return ready;},update(dt,player){
    if(!Number.isFinite(dt)||dt<=0)return;
    const dx=player?player.x-tailorPosition.x:0,dz=player?player.z-tailorPosition.z:0;
    const distance=player?Math.hypot(dx,dz):Infinity;
    const sameFloor=!!player&&Math.abs(player.y-EYE_HEIGHT)<1.0;
    if(!sameFloor||distance>4.2)ready=false;
    else if(distance<3.1)ready=true;
    const target=ready?1:0;
    blend+=Math.sign(target-blend)*Math.min(Math.abs(target-blend),Math.min(dt,.1)/(ready?.23:.42));
    let yaw=0;
    if(ready){const angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-frontYaw),Math.cos(Math.atan2(dx,dz)-frontYaw));yaw=Math.max(-.85,Math.min(.85,angle));}
    turn+=(yaw-turn)*(1-Math.exp(-7*Math.min(dt,.1)));
    root.rotation.y=frontYaw+turn;
    pose(blend*blend*(3-2*blend));
  }};
}
