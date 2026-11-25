import { EYE_HEIGHT } from '../../core/player.js';

export const brotherSumPosition = Object.freeze({ x: -8.04, y: -.04, z: -.56 });
export const danceDuration = 16 * .56;
const beat = .56;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };

export function buildAxeGang(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'Axe Gang formation';
  group.position.set(brotherSumPosition.x, brotherSumPosition.y, brotherSumPosition.z);
  scene.add(group);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .84 });
  const suit = 0x292b30, lapel = 0x3b3c42, shirt = 0xe3ded1, skin = 0xbb8967, hair = 0x262321;
  function part(parent, name, build) {
    const positions = [], colors = [], color = new THREE.Color();
    function add(g, paint, x, y, z, sx=1, sy=1, sz=1, rx=0, ry=0, rz=0) {
      g.scale(sx,sy,sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x,y,z);
      const p=g.getAttribute('position'), index=g.getIndex(); color.setHex(paint);
      for(let i=0;i<(index?index.count:p.count);i++) {
        const n=index?index.getX(i):i; positions.push(p.getX(n),p.getY(n),p.getZ(n)); colors.push(color.r,color.g,color.b);
      }
      g.dispose();
    }
    const box=(p,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),p,x,y,z,1,1,1,rx,ry,rz);
    const oval=(p,x,y,z,w,h,d,n=10,m=6)=>add(new THREE.SphereGeometry(1,n,m),p,x,y,z,w,h,d);
    const tube=(p,x,y,z,a,b,h,n=10)=>add(new THREE.CylinderGeometry(a,b,h,n),p,x,y,z);
    build(box,oval,tube,add);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,material); mesh.name=name; mesh.castShadow=true; parent.add(mesh); return mesh;
  }
  function node(parent,name,x=0,y=0,z=0) {
    const g=new THREE.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
  }
  function template(leader) {
    const root=new THREE.Group();
    const torso=node(root,'Torso');
    part(torso,'Suit jacket',(b,o,t)=>{
      o(suit,0,.24,0,.235,.305,.144,12,7);
      o(suit,0,.035,0,.205,.13,.132);
      b(shirt,0,.37,.133,.145,.26,.025);
      b(0x303036,0,.19,.144,.12,.18,.022);
      for(const s of [-1,1]) {
        b(lapel,s*.086,.345,.149,.071,.27,.028,0,0,-s*.28);
        b(shirt,s*.055,.475,.14,.067,.09,.027,0,0,s*.40);
      }
      if(leader) {
        for(const s of [-1,1]) b(0xbeb6a7,s*.047,.428,.167,.085,.061,.024,0,0,s*.18);
        b(0x938d83,0,.428,.184,.035,.046,.022);
        b(0xe6dcd0,-.15,.32,.137,.066,.019,.02);
      } else {
        b(0x212125,0,.343,.157,.048,.22,.022);
        b(0x37383c,0,.447,.165,.057,.052,.024,0,0,.68);
      }
      for(let i=0;i<3;i++) o(0x111215,0,.055+i*.075,.159,.014,.014,.009,6,4);
      t(skin,0,.56,0,.063,.08,.14);
    });
    const head=node(torso,'Head',0,.60,0);
    part(head,leader?'Brother Sum face and swept hair':'Gang member face and fedora',(b,o,t,add)=>{
      o(skin,0,.14,0,.132,.185,.132,14,9);
      o(skin,0,.04,.036,.102,.091,.104,12,7);
      o(hair,0,.245,-.045,.137,.098,.124,12,7);
      for(const s of [-1,1]) {
        o(skin,s*.132,.12,0,.027,.047,.028,8,5);
        o(hair,s*.116,.18,-.045,.031,.081,.075,8,5);
        b(0x473127,s*.055,.18,.123,.073,.015,.015,0,0,-s*.16);
        o(0xdac2a5,s*.054,.149,.126,.032,.012,.012,8,4);
        o(0x26221e,s*.054,.149,.137,.012,.013,.006,8,5);
      }
      o(skin,0,.108,.139,.028,.052,.040,10,6);
      b(0x734c39,0,.041,.138,.064,.010,.012);
      if(leader) {
        for(const s of [-1,1]) {
          b(hair,s*.027,.065,.147,.050,.016,.017,0,0,s*.15);
          b(hair,s*.112,.115,.064,.021,.074,.035,0,0,-s*.15);
        }
        o(hair,0,.012,.125,.032,.041,.021,8,5);
        for(let i=0;i<7;i++) {
          const x=(i-3)*.034;
          o(0x383431,x,.293-Math.abs(x)*.29,-.038,.025,.027,.105,8,5);
        }
      } else {
        add(new THREE.CylinderGeometry(.184,.19,.032,16),0x232329,0,.253,0,1,1,.86);
        add(new THREE.CylinderGeometry(.112,.137,.108,12),0x303036,0,.315,-.006,1,1,.94);
        add(new THREE.CylinderGeometry(.139,.139,.025,12),0x17181c,0,.275,-.006,1,1,.94);
      }
    });
    for(const s of [-1,1]) {
      const upper=node(root,'Upper arm '+s), fore=node(root,'Forearm '+s), hand=node(root,'Hand '+s);
      part(upper,'Suit sleeve',(b,o,t)=>{t(suit,0,-.145,0,.088,.072,.29);o(suit,0,-.285,0,.073,.066,.073);});
      part(fore,'Suit forearm',(b,o,t)=>{t(suit,0,-.135,0,.069,.055,.27);t(shirt,0,-.278,0,.056,.056,.043);});
      part(hand,'Hand',(b,o)=>{o(skin,0,0,0,.064,.082,.051,10,6);o(skin,-s*.047,.017,.02,.027,.041,.03,8,5);});
      const thigh=node(root,'Thigh '+s), shin=node(root,'Shin '+s), shoe=node(root,'Shoe '+s);
      part(thigh,'Trouser thigh',(b,o,t)=>{t(suit,0,-.205,0,.107,.085,.41);o(suit,0,-.38,0,.083,.078,.084);});
      part(shin,'Trouser shin',(b,o,t)=>{t(suit,0,-.20,0,.082,.065,.40);});
      part(shoe,'Black shoe',(b,o)=>{o(0x19191b,0,.065,.057,.095,.072,.149,10,5);b(0x111114,0,.021,.052,.17,.032,.25);});
      if(!leader&&s===1) {
        const axe=node(hand,'Axe prop',0,.13,0);
        part(axe,'Wooden handle and silver axe head',(b,o,t)=>{
          t(0x805a3e,0,.045,0,.022,.022,.52,8);
          b(0x777b80,0,.244,0,.09,.088,.066);
          b(0xa9aaad,.077,.244,0,.16,.124,.043,0,0,-.15);
          b(0xd0d0cb,.15,.25,0,.023,.13,.045,0,0,-.15);
        });
      }
    }
    return root;
  }
  const leader=template(true), member=template(false), dancers=[];
  function addDancer(root,name,x,z,scale=1) {
    root.name=name; root.position.set(x,0,z); root.scale.setScalar(scale); group.add(root);
    const limbs=[-1,1].map(s=>({s,upper:root.getObjectByName('Upper arm '+s),fore:root.getObjectByName('Forearm '+s),hand:root.getObjectByName('Hand '+s),thigh:root.getObjectByName('Thigh '+s),shin:root.getObjectByName('Shin '+s),shoe:root.getObjectByName('Shoe '+s)}));
    dancers.push({root,torso:root.getObjectByName('Torso'),head:root.getObjectByName('Head'),limbs,x,z});
  }
  addDancer(leader,'Brother Sum',0,0,1.04);
  for(let row=0;row<3;row++) for(const s of [-1,1]) {
    addDancer(row===0&&s===-1?member:member.clone(true),'Axe Gang Member '+(dancers.length),s*1.16,-1.65*(row+1),.96+(row%2)*.035);
  }
  const down=new THREE.Vector3(0,-1,0), a=new THREE.Vector3(), b=new THREE.Vector3(), delta=new THREE.Vector3();
  function aim(g,ax,ay,az,bx,by,bz,length) {
    a.set(ax,ay,az); b.set(bx,by,bz); delta.subVectors(b,a);
    const len=delta.length(); g.position.copy(a); g.quaternion.setFromUnitVectors(down,delta.normalize()); g.scale.y=len/length;
  }
  let elapsed=0, dancing=false;
  const trigger={x:brotherSumPosition.x,z:brotherSumPosition.z,anchorY:1.5,radius:2.2,label:'Lets Dancing',
    get active(){return !dancing;},reachable(p){return Math.abs(p.y-EYE_HEIGHT)<.85;},
    act(){if(dancing)return;dancing=true;elapsed=0;pose();}};
  function pose() {
    const count=elapsed/beat, angle=count*Math.PI, section=Math.min(3,Math.floor(count/4));
    const blend=dancing?smooth(count/.65)*(1-smooth((count-15.2)/.8)):0;
    const step=Math.sin(angle/2)*blend, bounce=(.5-.5*Math.cos(angle*2))*blend;
    const arms=Math.sin(angle)*blend, cross=Math.cos(angle)*blend;
    for(const d of dancers) {
      d.root.position.set(d.x+.20*step,0,d.z);
      const hip=.93-.065*bounce;
      d.torso.position.set(0,hip,0);
      d.torso.rotation.set(.04*bounce,.10*arms,-.09*step);
      d.head.rotation.y=.12*arms;
      for(const l of d.limbs) {
        const s=l.s, lift=Math.max(0,s*Math.sin(angle))*blend*.085;
        const fx=s*(.116+.13*Math.abs(step)), fz=.09*s*arms;
        l.shoe.position.set(fx,lift,fz); l.shoe.rotation.y=s*.12*blend;
        const kx=(s*.12+fx)/2, ky=(hip+lift+.10)/2, kz=fz*.5+.10*bounce;
        aim(l.thigh,s*.12,hip,0,kx,ky,kz,.41);
        aim(l.shin,kx,ky,kz,fx,lift+.10,fz,.40);
        const raise=section===0?.30+.18*s*arms:section===1?.24+.20*s*cross:section===2?.46+.12*arms:.28+.20*s*arms;
        const hx=s*(.26+blend*(section===1?.26:.15)),hy=hip-.10+blend*(.34+raise),hz=.04+blend*(.13+.09*s*arms);
        const ex=s*(.25+.13*blend),ey=hip+.19+.16*blend,ez=.02+.12*blend;
        aim(l.upper,s*.21,hip+.43,0,ex,ey,ez,.29);
        aim(l.fore,ex,ey,ez,hx,hy,hz,.30);
        l.hand.position.set(hx,hy,hz); l.hand.rotation.set(-.15-.35*blend,0,-s*(.12+.65*blend)+.20*arms);
      }
    }
  }
  function reset(){dancing=false;elapsed=0;pose();}
  function update(dt){if(!dancing||!Number.isFinite(dt)||dt<=0)return;elapsed+=dt;if(elapsed>=danceDuration){reset();return;}pose();}
  reset();
  return {group,trigger,update,reset,get dancing(){return dancing;}};
}
