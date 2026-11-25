import { EYE_HEIGHT } from '../../core/player.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { masonryKit } from './masonry.js';

export const fongPosition = Object.freeze({ x: 11.05, y: 0, z: 6.95 });
export const lollipopShop = Object.freeze({ x: 12.65, z: 10.65 });
export const lollipopCart = Object.freeze({ x: 11.0, z: 8.10 });
export const kissDuration = 2.8;
const colors=[0xe34c48,0xf4cb46,0x48a96b,0x4286d3,0xf0a0b5];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// One shared rainbow spiral face with adjacent colored sectors, not stacked decals.
function candyGeometry(THREE){
  const p=[],c=[],color=new THREE.Color();
  const point=(r,a)=>[r*Math.cos(a+3.9*r),r*Math.sin(a+3.9*r),0];
  for(let s=0;s<colors.length;s++){
    color.setHex(colors[s]);
    for(let i=0;i<16;i++)for(let j=0;j<8;j++){
      const r=i/16,R=(i+1)/16,a=(s+j/8)*Math.PI*2/colors.length,b=(s+(j+1)/8)*Math.PI*2/colors.length;
      const v=[point(r,a),point(R,a),point(R,b),point(r,b)];
      for(const n of i===0?[0,1,2]:[0,1,2,0,2,3]){p.push(...v[n]);c.push(color.r,color.g,color.b);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();return g;
}
export function buildFong(THREE,scene,layout,viewmodel,playCue=()=>{}){
  function group(parent,name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function batch(parent,fn){const k=masonryKit(THREE,parent);fn(k);k.finish();}
  const candy=candyGeometry(THREE), candyMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,side:THREE.DoubleSide});
  const edgeMat=new THREE.MeshStandardMaterial({color:0xe35a4c,roughness:.6}),stickMat=new THREE.MeshStandardMaterial({color:0xf2d6a4});
  const disc=new THREE.CylinderGeometry(1,1,.13,40);disc.rotateX(Math.PI/2);
  const stick=new THREE.CylinderGeometry(.025,.025,1.0,8);
  function lolly(parent,name,x,y,z,r,tilt=0){
    const g=group(parent,name,x,y,z);g.rotation.z=tilt;g.scale.setScalar(r);
    const d=new THREE.Mesh(disc,edgeMat);d.castShadow=true;g.add(d);
    for(const s of [-1,1]){const m=new THREE.Mesh(candy,candyMat);m.position.z=s*.078;if(s<0)m.rotation.y=Math.PI;g.add(m);}
    const handle=new THREE.Mesh(stick,stickMat);handle.position.y=-1.48;handle.scale.set(1.8,1.1,1.8);g.add(handle);return g;
  }
  const sign=group(scene,'Lollipop shop decorations',lollipopShop.x,0,lollipopShop.z-1.575);sign.rotation.y=Math.PI;
  lolly(sign,'Giant spiral lollipop',0,3.80,.68,.75,-.28);
  lolly(sign,'Small shop lollipop',-1.53,2.97,.30,.30,.38);
  lolly(sign,'Small shop lollipop',1.58,2.98,.30,.32,-.38);
  const cart=group(scene,'Lollipop pushcart',lollipopCart.x,0,lollipopCart.z);cart.rotation.y=Math.PI;
  batch(cart,({box,drum,beam})=>{
    box(0x8f5643,0,.55,0,1.48,.59,.69);box(0xe1b36e,0,.89,0,1.58,.10,.78);
    box(0xc45458,0,.57,.36,1.34,.35,.035);box(0xe5bc86,0,.57,.386,1.12,.22,.016);
    for(const s of [-1,1]){
      drum(0x4f3a32,s*.77,.37,0,.73,.12,.73,0,0,Math.PI/2);
      drum(0xb99b72,s*.845,.37,0,.53,.045,.53,0,0,Math.PI/2);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(0x76543a,s*.872,.37,0,s*.872,.37+.22*Math.sin(a),.22*Math.cos(a),.025);}
    }
    for(const x of [-.54,.54]){beam(0x875f3e,x,.62,-.30,x,.91,-.96,.055);box(0x704934,x,.91,-1.02,.075,.075,.25);}
    for(let i=0;i<5;i++)box(0xab8052,(i-2)*.25,.97,0,.19,.07,.54);
  });
  for(let i=0;i<10;i++)lolly(cart,'Display lollipop',(i%5-2)*.255,1.28+Math.floor(i/5)*.32,Math.floor(i/5)*-.25,.12+(i%3)*.023,(i%3-1)*.17);
  layout.solid(lollipopCart.x,lollipopCart.z,1.74,.83,1.02);
  const root=group(scene,'Fong — lollipop seller',fongPosition.x,fongPosition.y,fongPosition.z);root.rotation.y=Math.PI;
  const skin=0xd2a07d,white=0xf0e7d7,hair=0x282421,skirt=0xb84a65;
  const torso=group(root,'Fong torso',0,.89,0);
  batch(torso,({oval,box,drum})=>{
    oval(white,0,.24,0,.405,.52,.255);oval(white,0,.045,0,.33,.19,.23);
    drum(skin,0,.50,0,.115,.14,.125);
    for(const s of [-1,1])box(0xfff6e6,s*.065,.43,.115,.115,.12,.032,0,0,s*.36);
    for(let i=0;i<4;i++)oval(0xd2c4ae,0,.10+i*.076,.133,.023,.023,.013);
  });
  batch(root,({drum,oval,box})=>{
    for(const s of [-1,1]){oval(skin,s*.10,.205,0,.13,.27,.13);oval(0x4f3b38,s*.105,.063,.05,.16,.10,.25);}
  });
  // A flared skirt with a single surface and painted floral details.
  const sg=new THREE.CylinderGeometry(.17,.30,.67,20,5);const sp=sg.getAttribute('position'),sc=[];const col=new THREE.Color();
  for(let i=0;i<sp.count;i++){const a=Math.atan2(sp.getZ(i),sp.getX(i)),y=sp.getY(i);col.setHex(Math.sin(a*7+y*25)*Math.cos(a*3-y*19)>.40?0xf0c8bd:skirt);sc.push(col.r,col.g,col.b);}
  sg.setAttribute('color',new THREE.Float32BufferAttribute(sc,3));const sm=new THREE.Mesh(sg,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true}));sm.position.y=.62;sm.castShadow=true;root.add(sm);
  const head=group(torso,'Fong head',0,.56,0);
  batch(head,({oval,box})=>{
    oval(skin,0,.145,0,.253,.328,.246);oval(skin,0,.045,.035,.183,.151,.194);
    oval(hair,0,.246,-.039,.272,.169,.257);oval(hair,0,.132,-.103,.247,.265,.091);
    for(const s of [-1,1]){
      oval(skin,s*.127,.12,0,.043,.079,.041);oval(hair,s*.111,.185,-.025,.054,.170,.137);
      oval(0xf0d5bd,s*.052,.154,.112,.060,.026,.025);oval(0x2b2521,s*.051,.153,.126,.024,.023,.013);
      box(0x49332a,s*.052,.189,.115,.063,.012,.012,0,0,-s*.12);
    }
    oval(hair,-.049,.236,.084,.165,.077,.092,0,0,-.38);
    oval(skin,0,.109,.130,.046,.067,.055);oval(0xa74b46,0,.047,.125,.066,.019,.021);
    oval(0x372a25,0,.14,-.145,.11,.11,.085);oval(0x9f4f57,0,.105,-.178,.094,.045,.078);
    oval(hair,0,-.07,-.179,.12,.34,.104);oval(hair,.018,-.258,-.163,.092,.20,.09);
  });
  const arm=group(torso,'Fong offering arm',.20,.39,0);
  batch(arm,({oval,box})=>{oval(white,0,-.10,0,.142,.25,.155);oval(skin,0,-.23,.015,.10,.18,.10);oval(skin,0,-.35,.035,.092,.105,.093);});
  const held=lolly(arm,'Fong held lollipop',0,-.12,.145,.105,.15);held.rotation.x=-.25;
  batch(torso,({oval})=>{oval(white,-.215,.27,0,.14,.25,.15);oval(skin,-.236,.067,0,.10,.21,.10);oval(skin,-.24,-.07,.025,.088,.12,.086);});
  layout.solid(fongPosition.x,fongPosition.z,.52,.48,1.83);
  const heartShape=new THREE.Shape();heartShape.moveTo(0,-.45);heartShape.bezierCurveTo(-1.1,.22,-.50,.95,0,.40);heartShape.bezierCurveTo(.50,.95,1.1,.22,0,-.45);
  const heartGeometry=new THREE.ShapeGeometry(heartShape),hearts=group(scene,'Fong floating hearts');
  const pool=Array.from({length:9},(_,i)=>{const m=new THREE.MeshBasicMaterial({color:i%2?0xff91b2:0xe94d75,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(heartGeometry,m);hearts.add(mesh);return mesh;});
  const overlay=viewmodel?group(viewmodel,'Fong kiss hearts',0,0,-.65):null;
  if(overlay)for(let i=0;i<3;i++){const m=new THREE.Mesh(heartGeometry,new THREE.MeshBasicMaterial({color:i%2?0xff91b2:0xe94d75,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));m.layers.set(PLAYER_ONLY_LAYER);m.renderOrder=20;overlay.add(m);}
  const target=new THREE.Vector3();let time=0,active=false,turn=Math.PI,lastPlayer=null;
  const trigger={x:fongPosition.x,z:fongPosition.z,anchorY:1.45,radius:1.8,label:'Buy Lollipop',silent:true,
    get active(){return !active;},reachable(p){return Math.abs(p.y-EYE_HEIGHT)<.8&&p.z<=fongPosition.z+.3;},
    act(){if(active)return;active=true;time=0;playCue([[76,{duration:.15,level:.10,wave:'sine'}],[81,{duration:.20,level:.09,wave:'triangle'},.12]]);pose();}};
  function pose(){
    const lean=active?smooth(time/.42)*(1-smooth((time-.68)/.55)):0;
    torso.rotation.x=.21*lean;head.rotation.z=-.15*lean;head.rotation.x=-.16*lean;
    arm.rotation.x=-.65-.36*lean;arm.rotation.z=-.12;
    for(let i=0;i<pool.length;i++){const m=pool[i],age=time-.35-i*.13,t=age/1.35;m.visible=active&&t>=0&&t<1;if(!m.visible)continue;
      m.position.set(root.position.x+Math.cos(i*2.4)*(.17+.50*t),1.63+t*1.04,root.position.z+Math.sin(i*2.4)*(.20+.50*t));m.rotation.y=turn;m.rotation.z=.18*Math.sin(i+t*4);m.scale.setScalar(.13+.08*t);m.material.opacity=1-t;}
    if(overlay){overlay.visible=active&&time>.28&&time<2;for(let i=0;i<overlay.children.length;i++){const m=overlay.children[i],t=Math.max(0,Math.min(1,(time-.28)/1.72));m.position.set((i-1)*(.095+.16*t),-.07+.30*t+i*.015,0);m.scale.setScalar(.065+.025*t);m.material.opacity=(1-t)*smooth(t*9);}}
  }
  function reset(){time=0;active=false;lastPlayer=null;turn=Math.PI;root.rotation.y=turn;pose();}
  function update(dt,p){if(!Number.isFinite(dt)||dt<=0)return;if(p)lastPlayer=p;
    let yaw=Math.PI;const q=lastPlayer;
    if(q&&Math.abs(q.y-EYE_HEIGHT)<1&&Math.hypot(q.x-fongPosition.x,q.z-fongPosition.z)<8){target.set(q.x-fongPosition.x,0,q.z-fongPosition.z);if(target.lengthSq()>.01)yaw=Math.atan2(target.x,target.z);}
    const delta=Math.atan2(Math.sin(yaw-turn),Math.cos(yaw-turn));turn+=delta*(1-Math.exp(-dt*6));root.rotation.y=turn;
    if(active){time+=dt;if(time>=kissDuration){active=false;time=0;}}pose();}
  reset();return {root,cart,sign,hearts,trigger,update,reset,get kissing(){return active;}};
}
