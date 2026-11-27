import { buildPrincessFace } from './princess-face.js';
import { cueSource, entryCue, galleryCues } from './interaction-audio.js';
import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { addGallerySign, addRoundSolid, addSolid, spaceTransform } from './parts.js';

export const FROG_SITE = Object.freeze({ x: 0, z: -2.7 });
export function buildTiana({ THREE, document, bay, parts, exhibit, obstacles, playCue = () => {} }) {
  const { part, beam, batch, matte } = parts;
  const { toWorld, toLocal } = spaceTransform(exhibit);
  const room = addGroup(THREE, bay, 'Tiana Louisiana bayou');
  const ground = new THREE.Group();
  const grass = matte(0x536f45), water = matte(0x357b75), wood = matte(0x805039);
  const bark = matte(0x493a35), leaf = matte(0x527d42), lightLeaf = matte(0x91b65c);
  const gold = matte(0xe7c56d), cream = matte(0xffedb7), pink = matte(0xe9a2bd);
  const dark = matte(0x283e30), skin = matte(0x8b543b), hair = matte(0x29202a);
  const dress = matte(0xa5ce65), silk = matte(0xe4efae);
  const glow = matte(0xffe99c, { emissive: 0xffce59, emissiveIntensity: .65 });
  // A continuous level path leads from the entrance to the pond's front bank.
  const outline = new THREE.Shape();
  const corners = [[-5.5,8],[6,8],[8.4,4],[7.6,-3.5],[5.3,-7.4],[-4.3,-7.1],[-8.2,-3.8],[-7.4,3.1]];
  corners.forEach(([x,z],i)=> i ? outline.lineTo(x,-z) : outline.moveTo(x,-z));
  outline.closePath();
  part(ground, new THREE.ShapeGeometry(outline), grass, 0, -SURFACE_GAP.detail, 0, 1,1,1).rotation.x=-Math.PI/2;
  part(ground,'box',wood,0,.025,4.45,2.65,.05,6.3);
  for(let i=0;i<12;i++) part(ground,'box',i%2?wood:bark,0,.065,1.58+i*.48,2.60,.025,.045);
  // The shallow ornamental pool is bounded by a solid low bank, not a swim zone.
  part(ground,'drum',dark,0,.12,-2.7,4.0,.24,3.25);
  part(ground,'drum',water,0,.25,-2.7,3.88,.04,3.12);
  addRoundSolid(obstacles,...toWorld(0,-2.7),3.9,.85);
  for(let i=0;i<13;i++){
    const a=i*2.39996, r=1.4+(i%4)*.61;
    const x=Math.cos(a)*r, z=-2.7+Math.sin(a)*r*.75;
    part(ground,'sphere',lightLeaf,x,.31,z,.42,.055,.33);
    if(i%3===0){
      for(let j=0;j<6;j++){
        const b=j*Math.PI/3;
        part(ground,'sphere',pink,x+Math.cos(b)*.13,.40,z+Math.sin(b)*.13,.12,.075,.12);
      }
      part(ground,'ball',gold,x,.46,z,.08,.06,.08);
    }
  }
  // Cypress trees, hanging moss, reeds and a stilt cabin frame the water.
  for(const [x,z,h] of [[-6,-4,5.3],[6,-4,5.8],[-6.2,1,4.6],[6.3,1,4.9],[-3,-6,5]]){
    part(ground,'drum',bark,x,h*.42,z,.32,h*.84,.34);
    for(const side of [-1,1]){
      beam(ground,bark,[x,h*.52,z],[x+side*1.2,h*.86,z+.28],.21);
      part(ground,'ball',leaf,x+side*.9,h*.87,z,1.33,.88,1.12);
      for(let k=0;k<4;k++) part(ground,'box',lightLeaf,x+side*.65+k*.17,h*.69-(k%2)*.18,z+.63,.065,.85+(k%2)*.32,.075);
    }
    part(ground,'ball',leaf,x,h,z,1.35,1,1.15);
    addRoundSolid(obstacles,...toWorld(x,z),.40,h);
  }
  const cabin = addGroup(THREE,ground,'Bayou stilt cottage',4.9,0,-3.8);
  for(const x of [-1.35,1.35]) for(const z of [-1,1]) part(cabin,'box',bark,x,.6,z,.22,1.2,.22);
  part(cabin,'box',wood,0,1.14,0,3.05,.23,2.5);
  part(cabin,'box',wood,0,2.35,0,2.8,2.2,2.15);
  part(cabin,'box',dark,0,2.0,1.09,.65,1.45,.045);
  for(const x of [-.87,.87]) part(cabin,'box',glow,x,2.60,1.105,.47,.53,.055);
  for(const side of [-1,1]) part(cabin,'box',bark,side*.78,3.69,0,1.78,.18,2.7).rotation.z=-side*.47;
  addSolid(obstacles,...toWorld(4.9,-3.8),3.15,2.7,4.2,exhibit.rotation);
  for(let i=0;i<22;i++){
    const side=i%2?1:-1, x=side*(4.4+(i%3)*.29), z=-3.6+(i%11)*.55;
    for(let j=0;j<3;j++) part(ground,'cone',leaf,x+(j-1)*.16,.40+j*.07,z,.12,.8+j*.14,.12).rotation.z=(j-1)*.24;
  }
  const fireflies=addGroup(THREE,ground,'Bayou fireflies');
  for(let i=0;i<22;i++){
    const a=i*2.39996, r=4.2+(i%3)*.45;
    part(fireflies,'gem',glow,Math.cos(a)*r,1.1+(i%5)*.37,-1.5+Math.sin(a)*r*.78,.048,.06,.048);
  }
  batch(ground,room);
  addGallerySign(THREE,document,room,['Approach the enchanted frog'],0,1.05,1.30,2.7,.42);
  const stage=addGroup(THREE,room,'Enchanted lily pad',FROG_SITE.x,0,FROG_SITE.z);
  part(stage,'sphere',lightLeaf,0,.42,0,1.18,.15,.92);
  const frog=addGroup(THREE,stage,'Enchanted frog',0,.56,0);
  part(frog,'sphere',leaf,0,.30,0,.40,.32,.38);
  part(frog,'sphere',lightLeaf,0,.51,.18,.39,.27,.31);
  for(const s of [-1,1]){
    part(frog,'sphere',leaf,s*.30,.12,-.06,.30,.16,.27);
    part(frog,'sphere',lightLeaf,s*.24,.15,.32,.18,.085,.23);
    part(frog,'sphere',cream,s*.23,.69,.30,.125,.135,.11);
    part(frog,'sphere',dark,s*.23,.69,.395,.055,.072,.035);
  }
  part(frog,'sphere',dark,0,.43,.46,.19,.035,.027);
  function person(name,x,z,princess){
    const actor=addGroup(THREE,room,name,x,0,z);
    const cloth=princess?dress:matte(0x47765b);
    if(princess){
      const skirt = new THREE.LatheGeometry([[.68,.06],[.75,.13],[.70,.36],[.55,.65],[.36,.96],[.245,1.20]].map(([r,y])=>new THREE.Vector2(r,y)),20);
      part(actor,skirt,cloth,0,0,0,1,1,.79);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const petal=part(actor,'sphere',silk,Math.sin(a)*.48,.55,Math.cos(a)*.37,.18,.46,.095);
        petal.rotation.set(Math.cos(a)*.35,a,-Math.sin(a)*.35,'YXZ');
      }
      part(actor,'sphere',cloth,0,1.19,0,.26,.18,.21);
      part(actor,'drum',gold,0,1.19,0,.255,.065,.20);
      part(actor,'gem',silk,0,1.37,.234,.08,.10,.035);
    }else{
      for(const s of [-1,1]){
        part(actor,'box',cream,s*.15,.44,0,.23,.82,.24);
        part(actor,'box',bark,s*.15,.10,.075,.25,.20,.38);
      }
    }
    part(actor,'sphere',cloth,0,1.35,0,.33,.42,.23);
    part(actor,'drum',skin,0,1.69,0,.12,.20,.12);
    const head=addGroup(THREE,actor,name+' head',0,1.99,0);
    if(princess){
      buildPrincessFace(THREE,parts,head,{skin,blush:matte(0xb86e61),brow:hair,lip:matte(0x8e4148),iris:matte(0x56342a),pearl:cream},false,{jaw:.18,eyeWidth:1.02});
      part(head,'sphere',hair,0,.095,-.11,.316,.32,.25);
      part(head,'sphere',hair,0,.34,-.13,.205,.19,.19);
      for(const side of [-1,1]){
        part(head,'sphere',hair,side*.15,.22,.13,.16,.10,.11).rotation.z=side*-.45;
        part(head,'gem',gold,side*.305,-.12,.02,.034,.062,.03);
      }
      for(let i=-1;i<=1;i++)part(head,'gem',gold,i*.09,.37,.12,.065,.115+(.03*(1-Math.abs(i))),.05);
      part(head,'gem',silk,0,.42,.166,.033,.04,.025);
    }else{
      part(head,'sphere',skin,0,0,0,.25,.31,.23);
      part(head,'sphere',hair,0,.13,-.06,.26,.25,.22);
      for(const side of [-1,1])part(head,'sphere',dark,side*.087,.02,.207,.038,.047,.022);
      part(head,'sphere',skin,0,-.03,.23,.045,.065,.055);
      part(head,'sphere',matte(0x8e4148),0,-.12,.211,.08,.023,.025);
    }
    for(const s of [-1,1]){
      const arm=addGroup(THREE,actor,name+' shoulder',s*.32,1.56,0);
      arm.rotation.z=s*.22;
      part(arm,'sphere',cloth,0,-.08,0,.14,.17,.13);
      part(arm,'sphere',skin,0,-.23,0,.10,.19,.10);
      const elbow=addGroup(THREE,arm,name+' elbow',0,-.35,.01);
      part(elbow,'sphere',skin,0,-.015,0,.10,.10,.10);
      part(elbow,'sphere',skin,0,-.16,.02,.085,.19,.085);
      part(elbow,'sphere',skin,0,-.32,.03,.09,.11,.08);
      if(princess)part(elbow,'drum',gold,0,-.26,.015,.091,.035,.087);
    }
    if(!princess)part(actor,'box',gold,0,1.38,.23,.10,.28,.028);
    return actor;
  }
  const tiana=person('Tiana',-2.8,2.7,true);
  addRoundSolid(obstacles,...toWorld(-2.8,2.7),.68,2.5);
  const prince=person('Prince Naveen',0,-2.7,false);
  prince.position.y=.40;
  const magic=addGroup(THREE,stage,'Transformation sparkles',0,.8,0);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    part(magic,'gem',glow,Math.cos(a)*.85,(i%4)*.40,Math.sin(a)*.85,.085,.13,.085);
  }
  const local=[0,0];
  const audio=entryCue(playCue,galleryCues.tiana,cueSource(...toWorld(0,1.25),EYE_HEIGHT));
  let blend=0;
  function pose(){
    frog.visible=blend<.5;
    prince.visible=blend>=.5;
    prince.scale.setScalar(Math.max(.01,blend));
    magic.visible=blend>.03&&blend<.99;
    magic.rotation.y=blend*Math.PI;
    tiana.rotation.y=-.55*blend;
    const shoulder=tiana.getObjectByName('Tiana shoulder');
    if(shoulder)shoulder.rotation.x=-.42*blend;
  }
  function reset(){audio.reset();blend=0;pose();}
  reset();
  return {
    reset,
    update(dt,player,grounded,still){
      toLocal(player.x,player.z,local);
      const close=grounded && Math.abs(player.y-EYE_HEIGHT)<.35 &&
        Math.abs(local[0])<1.55 && local[1]>=1.25 && local[1]<=3.65;
      audio.update(close,dt);
      const target=Number(close);
      blend=still?target:THREE.MathUtils.damp(blend,target,5,dt);
      if(Math.abs(blend-target)<.005) blend=target;
      pose();
      return close;
    },
  };
}
