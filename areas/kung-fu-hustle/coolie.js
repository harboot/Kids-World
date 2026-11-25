// Area-local faceted porter and reusable burlap sack geometry.
export const cooliePosition = { x: 13.11, y: -.04, z: 14.27 };
const skin = 0xb77c55, shade = 0x946047, hair = 0x252a2b;
const vest = 0x626548, shorts = 0x99824b, shoes = 0x343632;

function facets(THREE) {
  const positions = [], colors = [];
  const color = new THREE.Color();
  function polygon(points, paint, inside) {
    color.setHex(paint);
    for (let i = 1; i < points.length - 1; i++) {
      const a = new THREE.Vector3(...points[0]);
      const b = new THREE.Vector3(...points[i]);
      const c = new THREE.Vector3(...points[i + 1]);
      const normal = b.clone().sub(a).cross(c.clone().sub(a));
      if (normal.lengthSq() < 1e-12) continue;
      const reverse = inside && normal.dot(a.clone().sub(new THREE.Vector3(...inside))) < 0;
      for (const p of reverse ? [a, c, b] : [a, b, c]) {
        positions.push(p.x, p.y, p.z);
        colors.push(color.r, color.g, color.b);
      }
    }
  }
  function loft(rings, paint) {
    const center = rings.flat().reduce((sum, p) => sum.map((v, i) => v + p[i]), [0, 0, 0])
      .map(v => v / (rings.length * rings[0].length));
    const n = rings[0].length;
    for (let r = 1; r < rings.length; r++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const tint = typeof paint === 'function' ? paint(r, i) : paint;
        polygon([rings[r - 1][i], rings[r - 1][j], rings[r][j], rings[r][i]], tint, center);
      }
    }
    polygon(rings[0], typeof paint === 'function' ? paint(0, 0) : paint, center);
    polygon(rings.at(-1), typeof paint === 'function' ? paint(rings.length - 1, 0) : paint, center);
  }
  function finish() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }
  return { polygon, loft, finish };
}

function sweep(THREE, mesh, sections, paint, count = 6) {
  const axis = new THREE.Vector3(...sections.at(-1)[0]).sub(new THREE.Vector3(...sections[0][0])).normalize();
  const ref = Math.abs(axis.y) > .92 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const across = new THREE.Vector3().crossVectors(ref, axis).normalize();
  const up = new THREE.Vector3().crossVectors(axis, across).normalize();
  mesh.loft(sections.map(([p, w, d]) => Array.from({ length: count }, (_, i) => {
    const a = (i + .5) * Math.PI * 2 / count;
    return new THREE.Vector3(...p).addScaledVector(across, Math.cos(a) * w)
      .addScaledVector(up, Math.sin(a) * d).toArray();
  })), paint);
}

// Eight-sided cross sections retain broad planes across the cheeks, jaw and torso.
function ring(y, z, w, d, nose = 0) {
  return [[0,y,z+d+nose],[w*.72,y,z+d*.84],[w,y,z+d*.18],[w*.76,y,z-d*.82],
    [0,y,z-d],[-w*.76,y,z-d*.82],[-w,y,z+d*.18],[-w*.72,y,z+d*.84]];
}

function upperGeometry(THREE) {
  const m = facets(THREE);
  const tube = (parts, paint, n) => sweep(THREE, m, parts, paint, n);
  // A continuous faceted torso with a V-neck boundary and subtle chest relief.
  // The chest and vest share edges; no overlaid triangles can sink into the skin.
  const chest=[
    [.76,-.04,.23,.14,.008,.0],[.95,.015,.225,.15,.012,.0],
    [1.12,.065,.25,.155,.025,.015],[1.25,.105,.285,.17,.071,.036],
    [1.37,.14,.30,.16,.115,.030],[1.46,.17,.17,.11,.095,.006],
  ].map(([y,z,w,d,v,p])=>[
    [0,y,z+d],[v*.55,y,z+d+p],[v,y,z+d*.94],
    [w*.73,y,z+d*.75],[w,y,z+d*.18],[w*.76,y,z-d*.82],
    [0,y,z-d],[-w*.76,y,z-d*.82],[-w,y,z+d*.18],[-w*.73,y,z+d*.75],
    [-v,y,z+d*.94],[-v*.55,y,z+d+p],
  ]);
  m.loft(chest,(r,i)=>{
    if(r>=3&&[0,1,10,11].includes(i))return r===4?0xc18a60:skin;
    if(i===2||i===9)return 0x858366;
    return i===5||i===6?0x4e533b:vest;
  });
  for(const s of [-1,1]) {
    // Both elbows bend upward and hands grip the lower sack's corners.
    tube([[[s*.26,1.37,.15],.105,.108],[[s*.42,1.29,.19],.10,.095],
      [[s*.51,1.25,.26],.08,.08]],skin,7);
    tube([[[s*.51,1.25,.26],.08,.08],[[s*.57,1.43,.20],.085,.075],
      [[s*.57,1.56,.15],.052,.052]],skin,7);
    tube([[[s*.57,1.54,.15],.059,.052],[[s*.58,1.62,.12],.069,.062],
      [[s*.54,1.67,.08],.048,.044]],skin,6);
  }
  tube([[[0,1.40,.17],.082,.083],[[0,1.51,.23],.073,.075]],skin,7);
  // Modest jaw, cheek, and nose landmarks integrated into the closed head shell.
  const faceRows=[
    [1.47,.265,.074,.076,0],[1.515,.278,.108,.098,0],
    [1.55,.28,.125,.110,.004],[1.59,.278,.137,.111,.042],
    [1.63,.272,.139,.114,.021],[1.67,.264,.14,.112,.005],
    [1.705,.251,.134,.119,0],[1.77,.235,.12,.11,0],
  ];
  const faceRings=faceRows.map(([y,z,w,d,n])=>[
    [0,y,z+d+n],[w*.32,y,z+d*.96],[w*.74,y,z+d*.82],
    [w,y,z+d*.18],[w*.76,y,z-d*.82],[0,y,z-d],
    [-w*.76,y,z-d*.82],[-w,y,z+d*.18],[-w*.74,y,z+d*.82],[-w*.32,y,z+d*.96],
  ]);
  m.loft(faceRings,(r,i)=>i===3||i===6?0xa96f50:skin);
  function depth(x,y){
    let i=0;while(i<faceRows.length-2&&y>faceRows[i+1][0])i++;
    const t=Math.max(0,Math.min(1,(y-faceRows[i][0])/(faceRows[i+1][0]-faceRows[i][0])));
    const r=faceRings[i].slice(0,4).map((p,j)=>p.map((v,k)=>v+(faceRings[i+1][j][k]-v)*t));
    x=Math.abs(x);
    for(let j=1;j<r.length;j++)if(x<=r[j][0]){
      const f=(x-r[j-1][0])/(r[j][0]-r[j-1][0]);
      return r[j-1][2]+f*(r[j][2]-r[j-1][2]);
    }
    return r.at(-1)[2];
  }
  function detail(points,paint,gap=.012){
    m.polygon(points.map(([x,y])=>[x,y,depth(x,y)+gap]),paint,[0,1.61,.26]);
  }
  for(const s of [-1,1]){
    const mirror=p=>p.map(([x,y])=>[s*x,y]);
    detail(mirror([[.03,1.651],[.098,1.663],[.087,1.640],[.043,1.638]]),0xe1d4b8);
    detail(mirror([[.049,1.652],[.071,1.655],[.071,1.639],[.049,1.639]]),hair,.020);
    detail(mirror([[.025,1.675],[.104,1.697],[.102,1.682],[.03,1.662]]),hair);
    tube([[[s*.134,1.62,.25],.032,.036],[[s*.151,1.66,.24],.032,.032]],skin,5);
  }
  detail([[-.034,1.535],[0,1.54],[.035,1.535],[0,1.531]],0x693d30);
  m.loft([ring(1.706,.24,.145,.125),ring(1.74,.235,.149,.129)],0xd2c4a2);
  m.loft([ring(1.742,.235,.15,.13),ring(1.81,.215,.145,.125),ring(1.855,.205,.08,.087)],hair);
  // A few irregular dark hair planes avoid a smooth helmet silhouette.
  m.polygon([[-.105,1.79,.309],[-.065,1.848,.28],[.015,1.83,.328],[-.055,1.755,.367]],0x353938,[0,1.8,.2]);
  return m.finish().translate(0,-.91,0);
}

export function sackGeometry(THREE) {
  const m = facets(THREE);
  // Pinched ends and a compressed, irregular eight-sided burlap cross-section.
  const outline = [[0,-.48],[.67,-.43],[1,-.15],[.92,.25],[.40,.49],[-.47,.48],[-1,.15],[-.92,-.28]];
  const rings = [[-.68,.22,.20],[-.54,.77,.83],[-.29,1,1],[.28,.97,.92],[.54,.79,.78],[.66,.21,.21]]
    .map(([x,w,h],i)=>outline.map(([z,y])=>[x,y*.36*h+(i%2)*.012,z*.40*w]));
  m.loft(rings,(r,i)=>i===0||i===7?0xaea08a:i===1||i===2?0xd0c3a8:0xe4d4b5);
  // Gathered fabric knot, merged into the same buffer.
  sweep(THREE,m,[[[.64,0,0],.046,.045],[[.73,.01,0],.035,.035],[[.79,.035,.015],.06,.044]],0xa89a7d,5);
  return m.finish();
}

// Simple rigid articulated low-poly model. The upper body is one batch:
// hands and five carried sacks move together, so the load never floats away.
const HIP = .91, ANKLE = .14, L = .40, FOOT_Z = .04;
const yaw = -.65;
const smooth = t => { t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); };
const mix = (a,b,t)=>a+(b-a)*t;

function legGeometry(THREE, kind) {
  const m=facets(THREE);
  if(kind==='thigh') {
    m.loft([ring(.065,0,.115,.125),ring(-.06,0,.135,.137),
      ring(-.24,0,.125,.124),ring(-.26,0,.121,.121)],shorts);
    m.loft([ring(-.25,0,.091,.095),ring(-.36,.012,.087,.094),
      ring(-.43,.012,.075,.08)],skin);
  } else if(kind==='shin') {
    m.loft([ring(.065,.012,.075,.08),ring(-.065,.005,.09,.09),
      ring(-.16,-.02,.103,.094),ring(-.29,-.008,.07,.068),
      ring(-.415,0,.052,.058)],skin);
  } else {
    m.loft([ring(-.095,.075,.09,.156),ring(-.071,.075,.092,.158)],0x948367);
    m.loft([ring(-.071,.075,.09,.155),ring(-.015,.055,.093,.14),
      ring(.045,-.005,.057,.069)],shoes);
  }
  return m.finish();
}

export function buildCoolie(THREE,scene,layout,onEncounter=()=>{}, sound=()=>{}) {
  const root=new THREE.Group();
  root.name='Coolie — porter';
  root.position.set(cooliePosition.x,cooliePosition.y,cooliePosition.z);
  root.rotation.y=yaw;
  scene.add(root);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  function group(name,parent,x=0,y=0,z=0) {
    const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
  }
  function mesh(name,geometry,parent) {
    const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;parent.add(m);return m;
  }
  const torso=group('Coolie torso pivot',root,0,HIP,-.08);
  mesh('Coolie faceted body',upperGeometry(THREE),torso);
  const thighGeo=legGeometry(THREE,'thigh'),shinGeo=legGeometry(THREE,'shin'),shoeGeo=legGeometry(THREE,'shoe');
  const legs=[-1,1].map(s=>{
    const side=s<0?'left':'right';
    const hip=group('Coolie '+side+' hip',root,s*.17,HIP,-.08);
    mesh('Coolie '+side+' thigh',thighGeo,hip);
    const knee=group('Coolie '+side+' knee',hip,0,-L,0);
    mesh('Coolie '+side+' shin',shinGeo,knee);
    const ankle=group('Coolie '+side+' ankle',knee,0,-L,0);
    mesh('Coolie '+side+' shoe',shoeGeo,ankle);
    return {hip,knee,ankle};
  });
  const geometry=sackGeometry(THREE);
  const carried=[
    [0,1.56-HIP,-.105,.03,1.07,1.08,1.15],
    [-.03,1.89-HIP,-.22,-.05,1.12,1.05,1.20],
    [.06,2.21-HIP,-.25,.10,1.04,.96,1.18],
    [-.04,2.51-HIP,-.20,-.12,.99,.95,1.05],
    [.02,2.78-HIP,-.22,.07,.86,.83,.94],
  ];
  const pile=[];
  for(const [x,z,count] of [[15.65,13.85,5],[17,15.75,7],[10.65,14.65,5]]) {
    for(let i=0;i<count;i++)pile.push([x+(i%2?.39:-.39),.18+Math.floor(i/2)*.30,z+(i%2?.36:-.36),
      i%2?.19:-.14,.87+(i%3)*.045,.93,1]);
    layout.solid(x,z,2.25,1.65,.35+Math.floor((count-1)/2)*.30);
  }
  const dummy=new THREE.Object3D(),tint=new THREE.Color();
  function sacks(name,entries,parent){
    const m=new THREE.InstancedMesh(geometry,material,entries.length);m.name=name;
    entries.forEach(([x,y,z,a,sx,sy,sz],i)=>{
      dummy.position.set(x,y,z);dummy.rotation.set(0,a,(i%3-1)*.035);
      dummy.scale.set(sx,sy,sz);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
      m.setColorAt(i,tint.setHex([0xc9b38e,0xe1cda8,0xbba17b,0xd7bf98][i%4]));
    });
    m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;
    m.computeBoundingSphere();m.castShadow=true;m.receiveShadow=true;parent.add(m);
  }
  sacks('Coolie carried sacks',carried,torso);
  sacks('Coolie ground sacks',pile,scene);
  layout.solid(cooliePosition.x,cooliePosition.z,1.55,1.18,1.8);

  // Two-link sagittal IK keeps each support foot planted throughout the squat.
  function planted(y,z) {
    const dy=y-ANKLE,dz=FOOT_Z-z;
    const bend=Math.acos(Math.min(1,Math.hypot(dy,dz)/(2*L)));
    const a=Math.atan2(-dz,dy)-bend;
    return [a,2*bend];
  }
  function setLeg(leg,y,z,a,b,foot=-(a+b)) {
    leg.hip.position.y=y;leg.hip.position.z=z;
    leg.hip.rotation.x=a;leg.knee.rotation.x=b;leg.ankle.rotation.x=foot;
  }
  function pose(depth,kick=0,extension=0,side=0) {
    const y=HIP-.25*depth,z=-.08-.15*depth;
    torso.position.set(0,y,z);
    torso.rotation.x=.04+.23*depth-.09*kick;
    const [a,b]=planted(y,z);
    for(let i=0;i<legs.length;i++){
      if(i===side&&kick>0){
        // Chamber -> extend -> hold -> retract. The support leg stays planted.
        const hip=mix(a,-1.48,kick),knee=mix(b,mix(1.52,.12,extension),kick);
        setLeg(legs[i],y,z,hip,knee,mix(-(hip+knee),-.12,kick*extension));
      }else setLeg(legs[i],y,z,a,b);
    }
  }
  let squatTime=0,depth=0,mode='squat',phase=0,entryDepth=0,armed=true,side=0;
  pose(0);
  return {
    reset(){squatTime=depth=phase=entryDepth=0;mode='squat';armed=true;side=0;pose(0);},
    update(dt,player) {
      if(!Number.isFinite(dt)||dt<=0)return;
      dt=Math.min(dt,.1);
      const distance=player?Math.hypot(player.x-cooliePosition.x,player.z-cooliePosition.z):Infinity;
      const sameFloor=!!player&&Math.abs(player.y-1.68)<1.05;
      if(distance>4.2||!sameFloor)armed=true;
      if(mode==='squat'&&armed&&sameFloor&&distance<3.2){
        mode='kick';phase=0;entryDepth=depth;armed=false;
        sound('kickReady',cooliePosition,5);
      }
      if(mode==='squat'){
        const before=squatTime;
        squatTime=(squatTime+dt)%3.2;
        if(before<1.6&&squatTime>=1.6)sound('squat',cooliePosition,4.5);
        depth=(1-Math.cos(squatTime/3.2*Math.PI*2))*.5;
        pose(depth);return;
      }
      const before=phase;phase+=dt;
      if(before<.83&&phase>=.83)sound('kick',cooliePosition,6);
      if(before<2.65&&phase>=2.65)sound('kickLand',cooliePosition,5);
      // 0.45s stand, 0.38s chamber, 0.24s extension, 0.85s hold,
      // 0.28s retract, 0.45s return to stance, then resume squats.
      if(phase<.45)pose(mix(entryDepth,0,smooth(phase/.45)));
      else if(phase<.83)pose(0,smooth((phase-.45)/.38),0,side);
      else if(phase<1.07)pose(0,1,smooth((phase-.83)/.24),side);
      else if(phase<1.92)pose(0,1,1,side);
      else if(phase<2.20)pose(0,1,1-smooth((phase-1.92)/.28),side);
      else if(phase<2.65)pose(0,1-smooth((phase-2.20)/.45),0,side);
      else {mode='squat';squatTime=0;depth=0;side=1-side;pose(0);onEncounter('coolie');}
    }
  };
}
