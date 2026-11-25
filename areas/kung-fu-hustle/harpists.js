import { EYE_HEIGHT } from '../../core/player.js';
import { floorRise, gallery } from './layout.js';

export const harpistRoom = Object.freeze({ x: -4.385714285714286, y: 2*floorRise, z: gallery.rear, halfWidth: 1.96, sill: 2*floorRise+.28, lintel: 2*floorRise+2.66 });
export const harpistOpening = [
  [harpistRoom.x-harpistRoom.halfWidth,harpistRoom.sill], [harpistRoom.x+harpistRoom.halfWidth,harpistRoom.sill],
  [harpistRoom.x+harpistRoom.halfWidth,harpistRoom.lintel], [harpistRoom.x-harpistRoom.halfWidth,harpistRoom.lintel],
];
const pitches=[62,69,74,76,74,69,67,64,62,64,69,74,81,76,74,69,67,62];
const interval=.42, travel=2.1;
export const harpistDuration=(pitches.length-1)*interval+travel;

export function buildHarpists(THREE, scene, playCue=()=>{}) {
  const root=new THREE.Group();root.name='The Harpists';root.position.set(harpistRoom.x,harpistRoom.y,harpistRoom.z);scene.add(root);
  const cloth=0x38454c, trim=0x273338, skin=0xb49070, hat=0x252d31;
  const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.91});
  function group(parent,name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function batch(parent,name,build){
    const positions=[],colors=[],color=new THREE.Color();
    function add(g,p,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
      g.scale(sx,sy,sz);g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);
      const a=g.getAttribute('position'),idx=g.getIndex();color.setHex(p);
      for(let i=0;i<(idx?idx.count:a.count);i++){const n=idx?idx.getX(i):i;positions.push(a.getX(n),a.getY(n),a.getZ(n));colors.push(color.r,color.g,color.b);}
      g.dispose();
    }
    const b=(p,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),p,x,y,z,1,1,1,rx,ry,rz);
    const o=(p,x,y,z,w,h,d,n=12,m=7)=>add(new THREE.SphereGeometry(1,n,m),p,x,y,z,w,h,d);
    const t=(p,x,y,z,r1,r2,h,n=12,sx=1,sz=1)=>add(new THREE.CylinderGeometry(r1,r2,h,n),p,x,y,z,sx,1,sz);
    build(b,o,t,add);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function musician(name,x,z,seated){
    const g=group(root,name,x,0,z), torso=group(g,'Robe torso',0,seated?.55:.94,0);
    batch(torso,'Traditional dark changshan',(b,o,t)=>{
      t(cloth,0,.23,0,.23,.22,.49,12,1,.68);
      o(cloth,0,.43,0,.235,.125,.146);
      t(trim,0,.48,0,.082,.096,.085,12);
      t(skin,0,.54,0,.063,.070,.10);
      for(let i=0;i<5;i++){b(trim,.052,.08+i*.073,.145,.090,.015,.024);o(0x687174,.012,.08+i*.073,.162,.016,.013,.010,6,4);}
    });
    batch(g,'Long robe and shoes',(b,o,t)=>{
      if(seated){o(cloth,0,.48,.13,.25,.19,.30);t(cloth,0,.25,.23,.21,.25,.46,12,1,.94);b(0x6e5039,0,.48,-.06,.51,.08,.40);for(const s of [-1,1])b(0x6e5039,s*.20,.24,-.11,.07,.48,.08);}
      else t(cloth,0,.50,0,.22,.29,.96,12,1,.72);
      for(const s of [-1,1])o(0x25272a,s*.113,.058,seated?.31:.07,.092,.064,.15,10,5);
    });
    const head=group(torso,'Head',0,.57,0);
    batch(head,'Face, round sunglasses and felt hat',(b,o,t,add)=>{
      o(skin,0,.135,0,.125,.172,.125,14,9);o(skin,0,.035,.034,.096,.082,.096);
      for(const s of [-1,1]){o(skin,s*.123,.12,0,.024,.043,.028);o(0x17191c,s*.056,.159,.12,.048,.046,.016,12,6);b(trim,s*.102,.16,.060,.017,.017,.12);}
      b(0x24272a,0,.159,.136,.029,.011,.014);o(skin,0,.105,.137,.025,.038,.034);b(0x735543,0,.042,.128,.062,.011,.012);
      t(hat,0,.246,0,.205,.215,.035,20,1,.86);t(hat,0,.31,-.006,.115,.146,.12,14,1,.91);t(0x485257,0,.265,-.006,.147,.148,.027,14,1,.91);
    });
    const arms=[-1,1].map(s=>{
      const upper=group(g,'Upper sleeve '+s),lower=group(g,'Forearm sleeve '+s),hand=group(g,'Hand '+s);
      batch(upper,'Loose sleeve',(b,o,t)=>{t(cloth,0,-.15,0,.109,.095,.30,10);o(cloth,0,-.02,0,.103,.10,.102);});
      batch(lower,'Cuffed sleeve',(b,o,t)=>{t(cloth,0,-.14,0,.097,.083,.28,10);t(0xb9b4a4,0,-.274,0,.083,.080,.048,10);});
      batch(hand,'Plucking fingers',(b,o)=>{o(skin,0,0,0,.053,.047,.074,10,6);for(let i=0;i<4;i++)o(skin,(i-1.5)*.022,-.01,.059,.014,.019,.039,7,5);});
      return {s,upper,lower,hand};
    });
    return {g,head,torso,arms,seated};
  }
  const seated=musician('Seated Harpist',-.56,-.87,true), standing=musician('Standing Harpist',1.16,-1.03,false);
  const instrument=group(root,'Guzheng',-.56,.88,-.25);
  batch(instrument,'Wooden guzheng, strings and bridges',(b,o,t)=>{
    b(0x533b29,0,0,0,1.94,.14,.45);b(0x846044,0,.077,0,1.83,.035,.39);
    for(const x of [-.86,.86]){b(0x483324,x,.065,0,.12,.08,.45);for(const z of [-.14,.14])b(0x55402f,x,-.48,z,.09,.83,.09);}
    for(let i=0;i<17;i++){const z=-.17+i*.0205;const x=-.38+i*.045;b(0xc1b18a,0,.108,z,1.68,.008,.007);b(0x6b4c35,x,.104,z,.055,.057,.017);}
  });
  const waves=group(scene,'Harpist sound waves'),waveGeometry=new THREE.TorusGeometry(1,.022,6,32,Math.PI*1.46);
  const pool=Array.from({length:6},()=>{
    const g=group(waves,'Flying sound wave');g.visible=false;
    const m=new THREE.MeshBasicMaterial({color:0x9de7ff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    for(const s of [-1,1]){const arc=new THREE.Mesh(waveGeometry,m);arc.rotation.z=s*.45;arc.scale.set(1,.38,1);arc.position.y=s*.12;g.add(arc);}
    return {g,m,born:-Infinity};
  });
  const down=new THREE.Vector3(0,-1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),delta=new THREE.Vector3();
  function aim(g,x,y,z,ex,ey,ez,len){a.set(x,y,z);b.set(ex,ey,ez);delta.subVectors(b,a);const length=delta.length();g.position.copy(a);g.quaternion.setFromUnitVectors(down,delta.normalize());g.scale.y=length/len;}
  let active=false,time=0,next=0;
  const trigger={x:harpistRoom.x,z:harpistRoom.z+.87,anchorY:harpistRoom.y+1.35,radius:1.9,label:'Play Music',silent:true,
    get active(){return !active;},reachable(p){return Math.abs(p.y-harpistRoom.y-EYE_HEIGHT)<.7&&p.z>=harpistRoom.z+.3&&p.z<=gallery.court+.03;},
    act(){if(active)return;active=true;time=0;next=0;emit();pose();}};
  function emit(){
    const p=pitches[next],w=pool[next%pool.length];w.born=next*interval;w.g.visible=true;next++;
    // Original pentatonic plucks, using the game's sound/mute/lifetime service.
    playCue([[p,{duration:.48,level:.16,attack:.004,wave:'triangle'}],[p+12,{duration:.19,level:.047,attack:.003,wave:'sine'}]]);
  }
  function pose(){
    const beat=active?time/interval*Math.PI:0;
    for(const n of [seated,standing]){
      const groove=active?Math.sin(beat*.5):0;
      n.g.rotation.y=n.seated?0:.15*groove;
      n.g.rotation.z=n.seated?0:.035*groove;
      n.head.rotation.x=active?(n.seated?.12:.11)*Math.sin(beat):0;
      n.head.rotation.y=n.seated?0:.18*groove;
      for(const l of n.arms){const s=l.s, pluck=active?Math.sin(beat+s*Math.PI/2):0;
        const gesture=!n.seated&&active ? .5+.5*pluck : 0;
        const sy=n.seated?.95:1.34, ex=s*(n.seated?.33:.25+.10*gesture),ey=n.seated?.82:1.04+.19*gesture,ez=n.seated?.23:.04+.13*gesture;
        const hx=s*(n.seated?.44+.22*pluck:.25+.22*gesture),hy=n.seated?1.01+.035*pluck:.78+.49*gesture,hz=n.seated?.60+.045*pluck:.045+.30*gesture;
        l.hand.rotation.set(n.seated?0:-.45*gesture,0,n.seated?0:s*.32*gesture);
        aim(l.upper,s*.20,sy,0,ex,ey,ez,.30);aim(l.lower,ex,ey,ez,hx,hy,hz,.29);l.hand.position.set(hx,hy,hz);
      }
    }
    for(const w of pool){const age=time-w.born;w.g.visible=active&&age>=0&&age<travel;if(!w.g.visible)continue;
      const t=age/travel;w.g.position.set(harpistRoom.x-.56,harpistRoom.y+1.56+.38*t,harpistRoom.z+.08+27*t);w.g.scale.setScalar(.54+2.1*t);w.m.opacity=.68*(1-t)*Math.min(1,.15+age*14);
    }
  }
  function reset(){active=false;time=0;next=0;for(const w of pool)w.born=-Infinity;pose();}
  function update(dt){if(!active||!Number.isFinite(dt)||dt<=0)return;time+=dt;if(time>=harpistDuration){reset();return;}while(next<pitches.length&&time>=next*interval)emit();pose();}
  reset();return {root,waves,trigger,update,reset,get playing(){return active;}};
}
