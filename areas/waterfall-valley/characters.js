import { detailKit } from './detail-kit.js';
import { clamp } from './landform.js';

export function addValleyCharacters({ THREE, scene, ground, deckHeight, reducedMotion }) {
  const characters = [
    { name:'Park ranger', x:-29.2,z:24.7, yaw:0.54, coat:0x658351, pants:0x49594c, skin:0xc58e64, hat:'ranger' },
    { name:'Camper', x:-17.9,z:52.8, yaw:2.1, coat:0xb3684d, pants:0x4b626b, skin:0xe4af82, hat:'beanie' },
    { name:'Fisherman', x:16.75,z:8.47,yaw:-Math.PI/2,coat:0x608587,pants:0x596a51,skin:0xbd865d,hat:'cap', fishing:true },
    { name:'Retired miner', x:-38.65,z:-5.63,yaw:1.12,coat:0x7c8067,pants:0x575950,skin:0xc08d74,hat:'miner' },
  ];
  const models = characters.map(build);
  let age = 0, elapsed = 0;

  function build(spec) {
    const { name,x,z,yaw,coat,pants,skin,hat,fishing }=spec;
    const root=new THREE.Group(), body=new THREE.Group(), head=new THREE.Group();
    const boots=0x534238, hair=hat==='miner'?0xb6aba1:0x53463a, cuff=0x425849;
    root.position.set(x,fishing ? deckHeight(x,z) ?? ground(x,z) : ground(x,z),z);
    root.rotation.y=yaw;
    root.name=name;
    root.add(body,head);
    scene.add(root);
    const lower=detailKit(THREE,root);
    for(const side of [-1,1]){
      lower.beam(pants,[side*.105,.87,0],[side*.119,.15,.021],.186,.215,'taper');
      lower.part('body',boots,side*.117,.098,.078,.205,.189,.332);
      lower.box(0x3e3a32,side*.117,.042,.092,.195,.054,.298);
    }
    lower.finish(true);
    const core=detailKit(THREE,body);
    core.part('body',coat,0,1.111,-.018,.53,.61,.322);
    core.part('body',pants,0,.84,-.012,.384,.255,.276);
    core.part('cylinder',0x514b39,0,.876,.005,.42,.079,.298);
    core.box(0xc5ae65,0,.875,.158,.081,.058,.034);
    core.part('cylinder',skin,0,1.411,0,.138,.164,.14);
    core.box(0xc7b783,.133,1.246,.158,.083,.07,.034);
    if(hat==='ranger'){
      core.part('body',0x877752,0,1.13,-.217,.37,.44,.29);
      core.box(0x9a8660,0,1.13,-.353,.286,.19,.07);
      for(const side of [-1,1])core.box(0x594f37,side*.163,1.24,.129,.047,.252,.036,0,0,side*.13);
    }else if(hat==='miner'){
      core.box(0xbbb297,0,1.22,.164,.21,.217,.061);
      for(const side of [-1,1])core.box(0x645946,side*.112,1.18,.174,.063,.37,.046,0,0,side*.19);
    }
    core.finish(true);

    head.position.y=1.46;
    const face=detailKit(THREE,head);
    face.part('body',skin,0,.177,.012,.306,.352,.309);
    face.part('body',skin,0,.094,.062,.25,.17,.224);
    face.part('stone',skin,0,.161,.17,.08,.105,.079);
    for(const side of [-1,1]){
      face.part('stone',skin,side*.15,.169,-.006,.075,.108,.074);
      face.part('stone',0x302d2c,side*.063,.205,.144,.045,.043,.034);
      face.box(hair,side*.064,.241,.135,.074,.019,.045,0,0,-side*.095);
    }
    face.box(hair,0,.086,.164,.091,.018,.013);
    face.part('body',hair,0,.25,-.068,.313,.219,.212);
    if(hat==='ranger'){
      face.part('cylinder',0x776e45,0,.299,.014,.49,.04,.43);
      face.part('taper',0x827a4d,0,.36,.008,.321,.133,.31);
      face.part('cylinder',0x524a35,0,.322,.008,.328,.029,.32);
    }else if(hat==='miner'){
      face.part('body',0xb8823c,0,.308,.014,.361,.18,.347);
      face.part('cylinder',0xca9652,0,.271,.037,.396,.057,.381);
      face.box(0x595a53,0,.329,.193,.11,.093,.082);
      face.box(0xf4d38e,0,.329,.241,.081,.064,.022);
      face.part('stone',hair,0,.078,.139,.22,.11,.085);
    }else{
      face.part('body',hat==='beanie'?0xc6a14c:0x676c59,0,.286,.012,.331,.201,.322);
      face.part('cylinder',hat==='beanie'?0x9a7537:0x545c50,0,.248,.013,.334,.063,.321);
      if(hat==='cap')face.part('body',0x656d57,0,.249,.157,.303,.043,.255);
    }
    face.finish(true);

    const arms=[-1,1].map(side=>{
      const arm=new THREE.Group();
      arm.position.set(side*.249,1.332,-.01);
      body.add(arm);
      const parts=detailKit(THREE,arm);
      const bend=fishing || hat==='miner' ? .12 : .024;
      parts.beam(coat,[0,0,0],[side*.043,-.27,bend],.164,.185,'taper');
      parts.beam(coat,[side*.043,-.27,bend],[side*.032,-.45,bend*1.95],.135,.137,'taper');
      parts.part('body',skin,side*.03,-.466,bend*2.08,.119,.145,.12);
      parts.box(cuff,side*.03,-.405,bend*1.8,.137,.052,.13);
      if(fishing && side===1){
        parts.beam(0x836445,[.035,-.46,.16],[.047,.23,1.42],.04);
        parts.beam(0x586861,[.047,.23,1.42],[.05,.44,2.12],.023);
        parts.beam(0x9ea99b,[.05,.44,2.12],[.05,-1.1,2.12],.011);
        parts.part('ring',0x4b5955,.074,-.28,.43,.18,.18,.18,Math.PI/2);
      }
      if(hat==='miner' && side===1)parts.box(0x817761,.04,-.43,.291,.22,.055,.17);
      parts.finish(true);
      return arm;
    });
    return { root, head, body, arms, spec };
  }

  function pose(player, still=false) {
    for(const [i,model] of models.entries()){
      const { spec,root,head,body,arms }=model;
      const gap=player?Math.hypot(player.x-spec.x,player.z-spec.z):Infinity;
      root.visible=still || (gap<49 && (player.z>-27 || player.y>root.position.y+11));
      if(!root.visible)continue;
      const t=still?0:age+i*1.72;
      const looks=spec.hat==='ranger' && gap<8 && Math.abs(player.y-root.position.y)<3;
      const delta=looks?Math.atan2(player.x-spec.x,player.z-spec.z)-spec.yaw:Math.sin(t*.41)*.29;
      head.rotation.y=clamp(Math.atan2(Math.sin(delta),Math.cos(delta)),-.95,.95);
      head.rotation.x=spec.hat==='miner'?.19+.18*Math.sin(t*.48):Math.sin(t*.56)*.065;
      body.rotation.z=Math.sin(t*.86)*.018;
      arms[0].rotation.x=spec.fishing?-.43:Math.sin(t*.65)*.12;
      arms[0].rotation.z=spec.hat==='beanie'?-.22-.64*Math.max(0,Math.sin(t*.32))**8:-.08;
      arms[1].rotation.x=spec.fishing?-.72+Math.sin(t*.83)*.115:spec.hat==='miner'?-.57+.14*Math.sin(t*.49):-.12;
      arms[1].rotation.z=.12;
    }
  }
  pose(undefined,true);
  return {
    people: Object.fromEntries(models.map(({root}) => [root.name, root])),
    reset(){ age=elapsed=0;pose(undefined,true); },
    update(dt,player){
      if(reducedMotion())return;
      age+=dt;elapsed+=dt;
      if(elapsed<.048)return;
      elapsed=0;
      pose(player);
    },
  };
}
