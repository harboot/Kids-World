import { EYE_HEIGHT } from '../../core/player.js';
import { wingX } from './layout.js';

// East market bay 2 is centered at z=1.375. Keep the NPC in front of it,
// outside the recessed shop and clear of the stairs and upper galleries.
export const tailorPosition=Object.freeze({x:wingX(1,13.72,1.375),y:0,z:1.375});
const frontYaw=-Math.PI/2;
const skin=0xc08c68, shirt=0xe5dfd0, suspenders=0x494039, pants=0x454341, shoes=0x292a28;
const mix=(a,b,t)=>a+(b-a)*t;

export function buildTailor(THREE,scene,layout,onEncounter=()=>{}, sound=()=>{}){
  const root=new THREE.Group();root.name='Tailor — Hung Gar master';
  root.position.set(tailorPosition.x,tailorPosition.y,tailorPosition.z);
  root.rotation.y=frontYaw;scene.add(root);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.88});
  const metal=new THREE.MeshStandardMaterial({color:0xbfc3c3,metalness:.48,roughness:.35,flatShading:true});
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
  batch('Tailor white shirt and suspenders',upper,(o,b,t)=>{
    o(pants,0,-.025,0,.205,.13,.13,10,5);
    // Loose cotton shirt, with broad chest planes and a high-waisted trouser line.
    o(shirt,0,.285,0,.258,.32,.157,12,7);
    o(0xd2cbbd,0,.105,.015,.226,.132,.149,10,5);
    o(skin,0,.516,.127,.088,.105,.047,10,6);
    for(const s of [-1,1]){
      b(0xf1eadb,s*.075,.502,.158,.082,.205,.037,0,0,-s*.43);
      // Front and rear straps curve over the shoulder, rather than forming a vest.
      b(suspenders,s*.153,.303,.146,.046,.465,.025,0,0,-s*.055);
      b(suspenders,s*.153,.303,-.146,.046,.465,.025,0,0,-s*.055);
      o(suspenders,s*.158,.535,0,.024,.038,.125,8,5);
      b(0xa69679,s*.141,.195,.169,.051,.048,.015);
      b(0x51483f,s*.141,.195,.181,.034,.030,.012);
    }
    for(let j=0;j<4;j++)o(0xb4aa98,0,.12+j*.083,.166,.013,.014,.009,6,4);
    t(skin,0,.61,0,.066,.082,.17,10);
  });
  const head=group('Tailor head',upper,0,.66,0);
  batch('Tailor shaped face and short hair',head,(o,b)=>{
    // Long, narrow face and exposed high forehead; hair recedes at the temples.
    o(skin,0,.165,0,.137,.235,.139,16,10);
    o(0xb9825e,0,.046,.046,.107,.119,.112,12,7);
    o(0x292b29,0,.211,-.108,.124,.146,.058,12,7);
    for(const s of [-1,1]){
      o(0x292b29,s*.124,.210,-.035,.034,.127,.088,10,6);
      o(skin,s*.137,.128,.002,.031,.060,.031,8,5);
      o(0xa26f53,s*.095,.106,.093,.039,.065,.044,8,5);
      o(0x96684e,s*.058,.188,.122,.052,.031,.031,10,6);
      o(0xe0cbb4,s*.058,.192,.146,.034,.015,.012,8,5);
      o(0x332821,s*.058,.192,.156,.013,.016,.008,8,5);
      b(0x49392e,s*.060,.225,.139,.082,.018,.020,0,0,s*.17);
      b(0xa47558,s*.067,.156,.145,.061,.010,.013,0,0,-s*.12);
      b(0x9f6e51,s*.064,.081,.140,.013,.055,.012,0,0,s*.35);
    }
    o(0xc9946b,0,.147,.151,.031,.067,.048,10,6);
    o(0xb77e59,0,.114,.180,.039,.028,.031,10,5);
    o(0x81543d,0,.057,.145,.052,.010,.010,8,4);
    o(0xc28a65,0,.041,.139,.048,.013,.016,8,4);
    // Small forehead creases and a short combed-back tuft at the crown.
    for(let j=0;j<2;j++)b(0xac7958,0,.274+j*.038,.131-j*.014,.108-j*.02,.007,.009);
    o(0x30302d,-.047,.354,-.069,.070,.029,.061,10,5);
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
      t(shirt,0,-.105,0,.120,.107,.23,10);o(shirt,0,-.025,0,.123,.10,.112,10,6);t(0xf0e8d8,0,-.216,0,.112,.109,.045,10);
      t(skin,0,-.235,0,.077,.071,.15,9);o(skin,0,-.31,0,.073,.075,.071,9,5);
    });
    const fore=segment(root,'Tailor '+side+' forearm',.32,(o,b,t)=>{
      t(skin,0,-.16,0,.064,.080,.32,10);
      o(skin,0,-.35,.014,.079,.072,.070,10,6);
      for(let j=0;j<4;j++)o(0xc38e69,(j-1.5)*.035,-.395,.035,.020,.027,.033,8,5);
      o(0xb67d59,s*.052,-.327,.034,.03,.048,.034,8,5);
    });
    // Nine closely stacked hollow iron rings follow each forearm's articulation.
    batch('Tailor '+side+' iron rings',fore.g,(o,b,t,add)=>{
      for(let j=0;j<9;j++)add(new THREE.TorusGeometry(.105-j*.0016,.017,8,16),0xffffff,0,-.027-j*.0335,0,1,1,1,Math.PI/2);
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
    upper.rotation.y=.035*t;
    head.rotation.y=-.035*t;
    for(const l of limbs){
      const s=l.s;
      // Horse stance: both shoes stay on the pavement and spread outward,
      // knees bend while the waist lowers.
      const footX=s*mix(.125,.43,t),footZ=s*mix(0,.10,t);
      l.shoe.position.set(footX,0,footZ);l.shoe.rotation.y=s*.18*t;
      point.set(s*.125,hipY,0);end.set(s*mix(.125,.31,t),mix(.54,.43,t),.19*t+footZ*.45);
      place(l.thigh,point,end);
      point.copy(end);end.set(footX,.11,footZ);place(l.shin,point,end);
      // Both fists raised near the face, with elbows bent and rings facing forward.
      point.set(s*.245,hipY+.50,0);
      end.set(s*mix(.28,.35,t),hipY+mix(.19,.36,t),mix(.015,.25,t));
      place(l.arm,point,end);
      point.copy(end);
      end.set(s*mix(.28,.245,t),hipY+mix(-.12,.68,t),mix(.035,.29,t));
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
    const before=blend;
    blend+=Math.sign(target-blend)*Math.min(Math.abs(target-blend),Math.min(dt,.1)/(ready?.23:.42));
    let yaw=0;
    if(ready){const angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-frontYaw),Math.cos(Math.atan2(dx,dz)-frontYaw));yaw=Math.max(-.85,Math.min(.85,angle));}
    turn+=(yaw-turn)*(1-Math.exp(-7*Math.min(dt,.1)));
    root.rotation.y=frontYaw+turn;
    pose(blend*blend*(3-2*blend));
    if(ready&&before<1&&blend>=1)sound('tailorRings',tailorPosition,5);
    if(ready&&blend>=1)onEncounter('tailor');
  }};
}
