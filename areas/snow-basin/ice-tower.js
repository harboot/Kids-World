import { EYE_HEIGHT } from '../../core/player.js';

const turn = Math.PI * 2;
const startAngle = -Math.PI / 2;
const inner = 2.02;
const outer = 4.62;
const treadAngle = turn / 36;
const risingTreads = 78;
const treadCount = 85;
const treadHeight = 0.16;
const footingTolerance = 0.23;

export const ICE_TOWER = Object.freeze({
  x: 20, z: 4, deckHeight: risingTreads * treadHeight, stairEnd: treadCount,
});

export function towerStairPoint(tread, radius = (inner + outer) / 2, y = Math.min(tread, risingTreads) * treadHeight) {
  const angle = startAngle + tread * treadAngle;
  return { x: ICE_TOWER.x + Math.sin(angle) * radius, y, z: ICE_TOWER.z + Math.cos(angle) * radius };
}

export function addIceTower(THREE, scene, { mesh, material, cone }, { camera, ground, signal, isPlayerGrounded = () => true, reducedMotion = () => false, playCue } = {}) {
  const { x, z, deckHeight } = ICE_TOWER;
  const group = new THREE.Group();
  group.name = 'Ice Tower';
  scene.add(group);

  const column = new THREE.CylinderGeometry(2.13, 2.24, 1, 12);
  const columnHeight = deckHeight + 0.67;
  mesh(column, material(0x5aa6c8), x, columnHeight / 2 - 0.035, z, 1, columnHeight, 1, false, group);
  const collar = new THREE.CylinderGeometry(2.32, 2.15, 1, 12);
  mesh(collar, material(0xaee5f2), x, deckHeight + 0.28, z, 1, 0.54, 1, false, group);
  mesh(cone, material(0xe3f6fc), x, deckHeight + 1.25, z, 1.28, 1.5, 1.28, false, group);

  const positions = [];
  const colors = [];
  const frost = new THREE.Color(0xc5ebf6);
  const ice = new THREE.Color(0x9cd4ea);
  const shade = new THREE.Color(0x5c99b8);
  const trim = new THREE.Color(0xdff6fa);

  function quad(a, b, c, d, color) {
    for (const { x, y, z } of [a, b, c, a, c, d]) {
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let i = 0; i < treadCount; i++) {
    const top = Math.min(i + 0.5, risingTreads) * treadHeight;
    const previous = Math.max(0, Math.min(i - 0.5, risingTreads) * treadHeight);
    const p = (tread, radius, height) => towerStairPoint(tread, radius, height);
    quad(p(i, inner, top), p(i, outer, top), p(i + 1, outer, top), p(i + 1, inner, top), i >= risingTreads ? frost : ice);
    if (top > previous) {
      quad(p(i, outer, previous), p(i, outer, top), p(i, inner, top), p(i, inner, previous), frost);
    }
    quad(p(i, outer, top - 0.23), p(i + 1, outer, top - 0.23), p(i + 1, outer, top), p(i, outer, top), shade);
    quad(p(i, inner, top - 0.23), p(i + 1, inner, top - 0.23),
      p(i + 1, outer, top - 0.23), p(i, outer, top - 0.23), shade);

    if (i < 2) continue;
    const start = Math.min(i, risingTreads) * treadHeight;
    const end = Math.min(i + 1, risingTreads) * treadHeight;
    const railInner = outer - 0.19;
    const railHeight = 0.58;
    quad(p(i, outer, top), p(i + 1, outer, top),
      p(i + 1, outer, end + railHeight), p(i, outer, start + railHeight), shade);
    quad(p(i, railInner, start + 0.09), p(i, railInner, start + railHeight),
      p(i + 1, railInner, end + railHeight), p(i + 1, railInner, end + 0.09), ice);
    quad(p(i, railInner, start + railHeight), p(i, outer, start + railHeight),
      p(i + 1, outer, end + railHeight), p(i + 1, railInner, end + railHeight), trim);
  }

  // Close the lookout with a rail across the upper end of the spiral.
  const end = (radius, dy) => towerStairPoint(treadCount, radius, deckHeight + dy);
  quad(end(outer, -0.23), end(inner, -0.23), end(inner, 0.58), end(outer, 0.58), shade);
  const inside = (radius, dy) => towerStairPoint(treadCount - 0.35, radius, deckHeight + dy);
  quad(inside(inner, 0), inside(outer, 0), inside(outer, 0.58), inside(inner, 0.58), ice);
  quad(inside(inner, 0.58), inside(outer, 0.58), end(outer, 0.58), end(inner, 0.58), trim);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const stairs = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  stairs.name = 'Ice Tower spiral stairs';
  stairs.receiveShadow = true;
  group.add(stairs);

  // Complete closed cross-section: deck, underside, thick rails with top caps,
  // and a solid terminal lookout wall. The downhill entrance stays open.
  const chutePositions=[],chuteColors=[];
  function chuteQuad(a,b,c,d,color) {
    for (const p of [a,b,c,a,c,d]) {
      chutePositions.push(p.x,p.y,p.z);
      chuteColors.push(color.r,color.g,color.b);
    }
  }
  const deckInk=new THREE.Color(0xa4e1f4);
  const railInk=new THREE.Color(0x80bdd9);
  const capInk=new THREE.Color(0xe0f7ff);
  const undersideInk=new THREE.Color(0x629bb8);
  const railThickness=.19,railHeight=.58,slab=.23;
  const p=(t,r,h)=>towerStairPoint(t,r,h);
  function railSegment(i,a,b,r0,r1){
    chuteQuad(p(i,r0,a),p(i+1,r0,b),p(i+1,r0,b+railHeight),p(i,r0,a+railHeight),railInk);
    chuteQuad(p(i,r1,a),p(i,r1,a+railHeight),p(i+1,r1,b+railHeight),p(i+1,r1,b),railInk);
    chuteQuad(p(i,r0,a+railHeight),p(i+1,r0,b+railHeight),p(i+1,r1,b+railHeight),p(i,r1,a+railHeight),capInk);
  }
  for(let i=0;i<treadCount;i++){
    const a=Math.min(i,risingTreads)*treadHeight;
    const b=Math.min(i+1,risingTreads)*treadHeight;
    chuteQuad(p(i,inner,a),p(i,outer,a),p(i+1,outer,b),p(i+1,inner,b),deckInk);
    chuteQuad(p(i,outer,a-slab),p(i,inner,a-slab),p(i+1,inner,b-slab),p(i+1,outer,b-slab),undersideInk);
    chuteQuad(p(i,outer,a-slab),p(i+1,outer,b-slab),p(i+1,outer,b),p(i,outer,a),undersideInk);
    chuteQuad(p(i,inner,a-slab),p(i,inner,a),p(i+1,inner,b),p(i+1,inner,b-slab),undersideInk);
    if(i>=2){
      railSegment(i,a,b,inner,inner+railThickness);
      railSegment(i,a,b,outer-railThickness,outer);
    }
  }
  // Close exposed rail starts and the upper terminal wall on all visible sides.
  const first=2, firstY=first*treadHeight;
  for(const [r0,r1] of [[inner,inner+railThickness],[outer-railThickness,outer]]){
    chuteQuad(p(first,r0,firstY),p(first,r1,firstY),p(first,r1,firstY+railHeight),p(first,r0,firstY+railHeight),railInk);
  }
  const endT=treadCount, beforeEnd=endT-.35;
  chuteQuad(p(endT,inner,deckHeight),p(endT,outer,deckHeight),p(endT,outer,deckHeight+railHeight),p(endT,inner,deckHeight+railHeight),railInk);
  chuteQuad(p(beforeEnd,outer-railThickness,deckHeight),p(beforeEnd,inner+railThickness,deckHeight),
    p(beforeEnd,inner+railThickness,deckHeight+railHeight),p(beforeEnd,outer-railThickness,deckHeight+railHeight),railInk);
  chuteQuad(p(beforeEnd,inner+railThickness,deckHeight+railHeight),p(endT,inner+railThickness,deckHeight+railHeight),
    p(endT,outer-railThickness,deckHeight+railHeight),p(beforeEnd,outer-railThickness,deckHeight+railHeight),capInk);
  chuteQuad(p(endT,inner,deckHeight-slab),p(endT,outer,deckHeight-slab),p(endT,outer,deckHeight),p(endT,inner,deckHeight),undersideInk);
  chuteQuad(p(0,outer,-slab),p(0,inner,-slab),p(0,inner,0),p(0,outer,0),undersideInk);
  const chuteGeometry=new THREE.BufferGeometry();
  chuteGeometry.setAttribute('position',new THREE.Float32BufferAttribute(chutePositions,3));
  chuteGeometry.setAttribute('color',new THREE.Float32BufferAttribute(chuteColors,3));
  chuteGeometry.computeVertexNormals();
  const chute=new THREE.Mesh(chuteGeometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  chute.name='Ice Tower spiral slide';
  chute.visible=false;
  chute.receiveShadow=true;
  group.add(chute);
  let slideMode=false, release=null, elapsed=0, entry=null, entryTread=0, duration=6;
  const centerRadius=(inner+outer)/2;
  function setSlideMode(value){
    slideMode=value;
    stairs.visible=!value;
    chute.visible=value;
  }
  function treadAt(px,pz,feet=0){
    const angle=Math.atan2(px-x,pz-z)-startAngle;
    const t=((angle%turn+turn)%turn)/treadAngle;
    let selected=null;
    // A short zero-height entry apron lets the player cross the angular seam from the floor.
    if(t>34.8 && feet<=footingTolerance)selected=t-36;
    for(let n=t;n<=treadCount+.001;n+=36){
      if(Math.min(n,risingTreads)*treadHeight>feet+footingTolerance)break;
      selected=n;
    }
    return selected;
  }
  function surface(px, pz, feet = 0) {
    const dx = px - x;
    const dz = pz - z;
    const radiusSquared = dx * dx + dz * dz;
    if (radiusSquared < inner * inner || radiusSquared > outer * outer) return null;
    const tread=treadAt(px,pz,feet);
    return tread===null?null:Math.max(0,Math.min(tread,risingTreads)*treadHeight);
  }

  function blocksGround(px,pz,radius,feet,from){
    const distance=Math.hypot(px-x,pz-z);
    const oldDistance=from?Math.hypot(from.x-x,from.z-z):distance;
    // Permit a player already overlapping a rail to move out of it, never trap them.
    if(distance<inner+radius && (feet??0)<columnHeight && (!from||distance<=oldDistance))return true;
    if(!from)return false;
    const previous=surface(from.x,from.z,feet);
    if(previous===null||previous<=.34||feet-previous>1.8)return false;
    if(distance>outer-.19-radius && distance>=oldDistance-1e-6)return true;
    const next=surface(px,pz,feet);
    return next===null||previous-next>footingTolerance;
  }
  function atTop(eye){
    if(!eye||!isPlayerGrounded())return false;
    const feet=eye.y-EYE_HEIGHT;
    return Math.abs(feet-deckHeight)<.15&&surface(eye.x,eye.z,feet)===deckHeight;
  }
  const summit=towerStairPoint(treadCount-2);
  const interaction={
    x:summit.x,z:summit.z,anchorY:deckHeight+1,label:'Slide down Ice Tower',radius:4,silent:true,
    get active(){return slideMode&&!release&&!signal?.aborted;},
    reachable:atTop,
    act({guideCamera}={}){
      if(!interaction.active||!atTop(camera?.position)||typeof guideCamera!=='function')return false;
      const eye=camera.position, feet=eye.y-EYE_HEIGHT;
      entryTread=treadAt(eye.x,eye.z,feet)??treadCount-2;
      entry={x:eye.x,z:eye.z,elevation:feet,yaw:camera.rotation.y,pitch:camera.rotation.x};
      const restore=guideCamera(()=>{});
      if(typeof restore!=='function')return false;
      release=restore;elapsed=0;
      duration=reducedMotion()?8:6;
      playCue?.([[72,{endPitch:43,duration:.75,level:.1,wave:'triangle'}]]);
      return true;
    },
  };
  function stop(spawn){
    const restore=release;
    release=null;
    setSlideMode(false);
    restore?.(spawn);
  }
  function update(dt,eye){
    if(!release){
      if(atTop(eye))setSlideMode(true);
      else if(slideMode&&eye&&eye.y-EYE_HEIGHT<.25)setSlideMode(false);
      return;
    }
    if(signal?.aborted){stop(entry);return;}
    elapsed=Math.min(duration,elapsed+dt);
    const p=elapsed/duration;
    // Accelerate gently then keep the descent fast; a short ground-level exit clears the rail.
    const t=entryTread*(1-p*p*(3-2*p));
    const point=towerStairPoint(t,centerRadius);
    const before=towerStairPoint(Math.max(0,t-.2),centerRadius);
    const after=towerStairPoint(t+.2,centerRadius);
    const yaw=Math.atan2(after.x-before.x,after.z-before.z);
    const blend=Math.min(1,elapsed/.35);
    camera.position.set(entry.x+(point.x-entry.x)*blend,entry.elevation+EYE_HEIGHT+(point.y+.96-entry.elevation-EYE_HEIGHT)*blend,entry.z+(point.z-entry.z)*blend);
    camera.rotation.set(-.12,yaw,0,'YXZ');
    camera.updateMatrixWorld();
    if(elapsed>=duration){
      const exit={x:x-centerRadius,z:z-1.15,yaw,pitch:0};
      stop(exit);
    }
  }
  return { surface, blocksGround, interaction, atTop, update, get riding(){return release!==null;},
    reset(){stop(entry);}, cancel(){stop(entry);} };
}
