// Area-local frog stance NPC. Forward is local +Z.
export const beastPosition = Object.freeze({ x: .53, y: .01, z: 9.72 });
export const beastYawLimit = Math.PI / 3;
export function beastHeadTarget(x, z, distance, sameFloor) {
  if (!sameFloor || distance >= 4 || z <= 0) return 0;
  return Math.max(-beastYawLimit, Math.min(beastYawLimit, Math.atan2(x, z)));
}
export function buildBeast(THREE, scene, layout) {
  const root = new THREE.Group();
  root.name = 'The Beast — Fire Cloud Evil God';
  root.position.set(beastPosition.x, beastPosition.y, beastPosition.z);
  scene.add(root);
  const cloth = 0x242b2b, fold = 0x394141, skin = 0xb6815c, hair = 0x42403c;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92 });
  function group(name, parent, x=0,y=0,z=0) {
    const g = new THREE.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
  }
  // Bake closed primitives into one vertex-colored mesh per moving part.
  function batch(name, parent, build) {
    const positions=[], colors=[], color=new THREE.Color();
    function shape(g, paint, x,y,z, sx=1,sy=1,sz=1, rotation=null) {
      g.scale(sx,sy,sz);
      if(rotation) g.applyQuaternion(rotation);
      g.translate(x,y,z);
      const p=g.getAttribute('position'), index=g.getIndex();
      color.setHex(paint);
      for(let i=0;i<(index?index.count:p.count);i++){
        const n=index?index.getX(i):i;
        positions.push(p.getX(n),p.getY(n),p.getZ(n)); colors.push(color.r,color.g,color.b);
      }
      g.dispose();
    }
    function oval(p,x,y,z,a,b,c,w=10,h=6) {
      shape(new THREE.SphereGeometry(1,w,h),p,x,y,z,a,b,c);
    }
    function link(p,a,b,r1,r2,n=8) {
      const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b);
      const delta=end.clone().sub(start), mid=start.clone().add(end).multiplyScalar(.5);
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
      shape(new THREE.CylinderGeometry(r2,r1,delta.length(),n),p,mid.x,mid.y,mid.z,1,1,1,q);
    }
    build(oval,link);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    g.computeVertexNormals();
    const m=new THREE.Mesh(g,material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  // Grounded feet and hands remain fixed while the torso breathes.
  batch('Beast planted limbs',root,(o,l)=>{
    for(const s of [-1,1]){
      l(cloth,[s*.22,.45,-.39],[s*.56,.30,-.76],.23,.20);
      o(cloth,s*.56,.28,-.76,.23,.22,.25);
      l(cloth,[s*.56,.29,-.76],[s*.40,.14,-1.08],.18,.12);
      o(0x292929,s*.40,.10,-1.12,.17,.09,.25);
      l(cloth,[s*.66,.29,.19],[s*.79,.12,.57],.16,.11);
      o(skin,s*.80,.085,.64,.15,.075,.19);
      for(let i=0;i<4;i++)o(skin,s*.80+(i-1.5)*.065,.055,.79,.034,.045,.09,6,4);
      o(skin,s*.66,.07,.64,.065,.05,.09,6,4);
    }
  });
  const body=group('Beast breathing body',root);
  batch('Beast dark jacket and upper arms',body,(o,l)=>{
    o(cloth,0,.46,-.27,.45,.30,.70,12,7);
    o(fold,0,.51,.17,.38,.25,.37);
    for(const s of [-1,1]){
      o(cloth,s*.35,.52,.21,.23,.22,.25);
      l(cloth,[s*.35,.51,.20],[s*.66,.29,.19],.21,.16);
      l(fold,[s*.18,.66,.33],[s*.07,.51,.51],.065,.04,5);
    }
    o(skin,0,.63,.46,.22,.20,.22);
  });
  const head=group('Beast head pivot',body,0,.67,.48);
  const tilt=group('Beast raised head',head);tilt.rotation.x=-.16;
  batch('Beast faceted bald face',tilt,(o,l)=>{
    o(skin,0,.27,.06,.245,.30,.235,14,9);
    o(0xc28d66,0,.12,.17,.21,.17,.16,12,6);
    for(const s of [-1,1]){
      o(hair,s*.208,.29,-.025,.065,.20,.19,8,6);
      o(skin,s*.244,.20,.035,.055,.086,.052,8,5);
      o(0x8b5b43,s*.096,.266,.246,.086,.042,.041,8,5);
      o(0xe1d1b8,s*.096,.268,.271,.061,.026,.023,8,5);
      o(0x292421,s*.088,.27,.29,.024,.025,.012,8,5);
      l(hair,[s*.035,.32,.265],[s*.16,.335,.231],.021,.027,6);
      o(0xb17a55,s*.13,.12,.245,.09,.087,.059,8,5);
    }
    o(hair,0,.27,-.139,.20,.17,.087,10,6);
    o(0xc38d67,0,.206,.282,.065,.077,.073,8,5);
    o(0x704737,0,.085,.294,.095,.018,.017,10,4);
    for(let i=0;i<3;i++)l(0xa16d50,[-.10,.39+i*.035,.211-i*.02],[.10,.39+i*.035,.211-i*.02],.007,.007,5);
  });
  const throat=group('Beast inflatable throat',head,0,-.045,.19);
  batch('Beast throat sac',throat,(o)=>{
    o(0xb47b55,0,0,0,.25,.27,.235,14,9);
    o(0xc28b61,0,-.025,.08,.20,.22,.17,12,7);
  });
  layout.solid(beastPosition.x,beastPosition.z-.17,1.9,2.0,.95);
  const target=new THREE.Vector3();
  let time=0, defeated=false;
  const smooth=t=>t*t*(3-2*t);
  return {root, setDefeated(value){
    defeated=Boolean(value);time=0;body.position.y=0;head.rotation.y=0;throat.scale.set(1,1,1);
    root.scale.y=defeated?.36:1;tilt.rotation.x=defeated?.35:-.16;
  }, update(dt,player){
    if(defeated)return;
    if(!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.1);time=(time+dt)%3.2;
    const pulse=time<1.15?smooth(time/1.15):time<1.45?1:time<2.75?1-smooth((time-1.45)/1.3):0;
    throat.scale.set(1+.30*pulse,1+.35*pulse,1+.38*pulse);
    body.position.y=.035*pulse;
    let turn=0;
    if(player){
      target.copy(player);root.worldToLocal(target);
      const sameFloor=Math.abs(target.y-1.68)<1.05;
      const distance=Math.hypot(target.x,target.z);
      turn=beastHeadTarget(target.x,target.z-head.position.z,distance,sameFloor);
    }
    head.rotation.y+=(turn-head.rotation.y)*(1-Math.exp(-6*dt));
  }};
}
