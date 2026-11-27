import { EYE_HEIGHT } from '../../core/player.js';

export const MARSHMALLOW_SITE = Object.freeze({ x: 17.2, z: 22.7 });
const wakeRadius = 7;
const hideRadius = 10;
const riseTime = 1.25;
const roarEnd = 2.05;
const waveEnd = 3.5;
const roarCue = [
  [35, { duration: 0.38, endPitch: 27, level: 0.18, wave: 'triangle' }],
  [29, { duration: 0.39, endPitch: 22, level: 0.12, wave: 'sawtooth' }, 0.18],
];

export function createMarshmallow({ THREE, scene, kit, ground, reducedMotion, playCue, notify, onComplete, playerRadius = 0.34 }) {
  const { x, z } = MARSHMALLOW_SITE;
  const y = ground(x, z);
  const { material, cone, box, obstacles } = kit;
  const model = new THREE.Group();
  model.name = 'Marshmallow';
  model.position.set(x, y, z);
  scene.add(model);
  const mound = new THREE.Group();
  mound.name = 'Marshmallow snow mound';
  model.add(mound);
  const giant = new THREE.Group();
  giant.name = 'Marshmallow standing';
  model.add(giant);
  const facet = new THREE.IcosahedronGeometry(1, 1);
  const snow = material(0xe5f1fa), ice = material(0xa8d8ed), dark = material(0x344e65), blue = material(0x69bde9);
  function part(parent, geometry, mat, px, py, pz, sx, sy, sz) {
    const obj = new THREE.Mesh(geometry, mat);
    obj.position.set(px, py, pz);
    obj.scale.set(sx, sy, sz);
    parent.add(obj);
    return obj;
  }
  for (const [px,py,pz,sx,sy,sz] of [[0,.48,0,1.65,.92,1.3],[-1,.3,.25,.8,.58,.85],[1,.35,-.18,.9,.63,.82]]) {
    part(mound, facet, snow, px,py,pz,sx,sy,sz);
  }
  // Broad shoulders, heavy fists, angular ice spikes and a readable expressive face.
  part(giant, facet, snow, 0,2.0,0,1.22,1.26,.87);
  part(giant, facet, snow, 0,2.9,0,1.48,.93,.86);
  for (const side of [-1,1]) {
    part(giant, facet, snow, side*.68,.65,0,.60,.81,.56);
    part(giant, facet, ice, side*.69,.25,.25,.68,.30,.78);
    const spike=part(giant,cone,ice,side*.95,3.48,-.1,.38,.82,.38);
    spike.rotation.z=-side*.28;
  }
  const head = new THREE.Group();
  head.position.set(0,3.72,.23);
  giant.add(head);
  part(head,facet,snow,0,.12,0,.83,.72,.66);
  const jaw = part(head,facet,snow,0,-.36,.17,.71,.30,.53);
  const mouth = part(head,box,dark,0,-.22,.55,.61,.10,.08);
  for (const side of [-1,1]) {
    part(head,facet,blue,side*.29,.18,.56,.19,.13,.10);
    part(head,facet,dark,side*.29,.17,.65,.083,.085,.045);
    const brow=part(head,box,ice,side*.29,.34,.52,.36,.13,.15);
    brow.rotation.z=-side*.29;
    part(head,cone,ice,side*.49,.68,-.06,.22,.5,.22);
  }
  const arms=[-1,1].map(side=>{
    const arm=new THREE.Group();
    arm.position.set(side*1.12,2.95,0);
    giant.add(arm);
    part(arm,facet,snow,side*.36,-.39,0,.52,.74,.49);
    part(arm,facet,snow,side*.56,-1.03,.10,.58,.64,.52);
    part(arm,facet,ice,side*.61,-1.47,.15,.61,.48,.54);
    for(let i=0;i<3;i++)part(arm,cone,ice,side*(.34+i*.23),-1.78,.38,.105,.31,.11).rotation.z=Math.PI;
    return arm;
  });
  let nearby=false, complete=false, phase=0, height=0, roared=false;
  obstacles.push({
    get height(){return y+1.2+height*3.5;},
    touches(px,pz){return Math.hypot(px-x,pz-z)<1.55+playerRadius;}
  });
  function pose() {
    const t = height*height*(3-2*height);
    mound.visible = t < 0.75;
    mound.scale.set(1-t*.2,1-t*.65,1-t*.2);
    giant.visible = t > 0.04;
    giant.scale.set(.86+t*.14,Math.max(.12,t),.86+t*.14);
    const roar = nearby && phase >= riseTime && phase < roarEnd;
    const wave = nearby && phase >= roarEnd;
    jaw.position.y = roar ? -.51 : -.36;
    mouth.scale.y = roar ? .33 : .10;
    arms[0].rotation.z = roar ? -.66 : -.12;
    arms[1].rotation.z = wave ? 2.05 + .28*Math.sin(Math.min(phase,waveEnd)*13) : roar ? .66 : .12;
    head.rotation.x = roar ? -.12 : 0;
  }
  function reset() {
    nearby=complete=roared=false;
    phase=height=0;
    pose();
  }
  function update(dt,eye) {
    if (!eye) return;
    const distance=Math.hypot(eye.x-x,eye.z-z);
    const closeHeight=Math.abs(eye.y-EYE_HEIGHT-ground(eye.x,eye.z))<1.3;
    if (nearby && (distance>hideRadius || !closeHeight)) {nearby=false;phase=0;roared=false;}
    if (!nearby && distance<=wakeRadius && closeHeight) {nearby=true;phase=0;roared=false;}
    const still=reducedMotion?.();
    height=still ? Number(nearby) : Math.max(0,Math.min(1,height+(nearby?1:-1)*dt/riseTime));
    if (nearby) {
      phase=still ? waveEnd : Math.min(waveEnd,phase+dt);
      if (phase>=riseTime && !roared) {roared=true;playCue?.(roarCue);}
      if (phase>=waveEnd && !complete) {
        complete=true;
        notify?.('Meet Marshmallow complete!');
        onComplete?.();
      }
    }
    if (nearby && height>0 && !still) model.rotation.y=Math.atan2(eye.x-x,eye.z-z);
    pose();
  }
  reset();
  return { get complete(){return complete;}, update, reset };
}
