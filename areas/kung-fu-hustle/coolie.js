// Area-local faceted porter and reusable burlap sack geometry.
export const cooliePosition = { x: 13.11, y: -.04, z: 14.27 };
const skin = 0xc28b65, shade = 0xa96f4e, hair = 0x29282a;
const vest = 0x687044, shorts = 0xae9048, shoes = 0x303132;

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
        const local = [...rings[r - 1], ...rings[r]].reduce((sum, p) => sum.map((v, k) => v + p[k]), [0, 0, 0]).map(v => v / (2 * n));
        polygon([rings[r - 1][i], rings[r - 1][j], rings[r][j], rings[r][i]], tint, local);
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

// Model-space +Z faces the courtyard. Form is sculpted from anatomical
// landmarks, with large intentional facets rather than regular horizontal bands.
function ring(y,z,w,d,x=0) {
  return [[0,y,z+d],[w*.54,y,z+d*.93],[w*.88,y,z+d*.59],[w,y,z],
    [w*.72,y,z-d*.78],[0,y,z-d],[-w*.72,y,z-d*.78],[-w,y,z],
    [-w*.88,y,z+d*.59],[-w*.54,y,z+d*.93]].map(p=>[p[0]+x,p[1],p[2]]);
}
function mapped(m,transform) {
  return {
    polygon:(p,c,i)=>m.polygon(p.map(transform),c,i&&transform(i)),
    loft:(rings,c)=>m.loft(rings.map(row=>row.map(transform)),c),
  };
}
// A continuous, stable frame around a curved limb. Offset and rotate individual
// anatomical landmarks to place the muscle mass on the correct side of the bone.
function limb(THREE,m,sections,paint,n=10) {
  const centers=sections.map(([p])=>new THREE.Vector3(...p));
  const ref=new THREE.Vector3(0,0,1);
  let previous;
  const rings=sections.map(([p,w,d],i)=>{
    const tangent=centers[Math.min(i+1,centers.length-1)].clone()
      .sub(centers[Math.max(i-1,0)]).normalize();
    const front=ref.clone().addScaledVector(tangent,-ref.dot(tangent));
    if(front.lengthSq()<.04) front.set(0,1,0).addScaledVector(tangent,-tangent.y);
    front.normalize();
    const across=new THREE.Vector3().crossVectors(front,tangent).normalize();
    if(previous&&across.dot(previous)<0){across.negate();front.negate();}
    previous=across.clone();
    return Array.from({length:n},(_,j)=>{
      const a=(j+.5)*Math.PI*2/n;
      const shape=1+.035*Math.cos(3*a+i*.7);
      return new THREE.Vector3(...p).addScaledVector(across,Math.cos(a)*w*shape)
        .addScaledVector(front,Math.sin(a)*d*shape).toArray();
    });
  });
  m.loft(rings,paint);
}
function shoe(m,x,y,z,tilt=0,yaw=0) {
  const local=mapped(m,([u,v,w])=>{
    const py=v*Math.cos(tilt)-w*Math.sin(tilt),pz=v*Math.sin(tilt)+w*Math.cos(tilt);
    return [x+u*Math.cos(yaw)+pz*Math.sin(yaw),y+py,z-u*Math.sin(yaw)+pz*Math.cos(yaw)];
  });
  local.loft([ring(0,.067,.092,.164),ring(.024,.067,.098,.167)],0xa89776);
  local.loft([ring(.024,.067,.098,.165),ring(.070,.06,.098,.156),
    ring(.105,.03,.091,.126),ring(.149,-.023,.064,.070)],
    (r,i)=>i===0||i===9?0x41403e:shoes);
}
function legs(THREE,m) {
  // The support foot lies below the displaced pelvis and shoulders; the lifted
  // knee travels outward and forward, with a relaxed foot following the shin.
  const data=[
    {hip:[.19,.91,-.04],thigh:[.22,.78,-.015],hem:[.23,.66,.017],
      knee:[.245,.53,.046],upperCalf:[.25,.42,.006],calf:[.24,.31,-.045],
      ankle:[.225,.16,-.053],foot:[.225,.045,-.053,0,.10]},
    {hip:[-.055,.91,-.035],thigh:[-.205,.985,.14],hem:[-.315,1.005,.27],
      knee:[-.425,.995,.385],upperCalf:[-.475,.88,.435],calf:[-.51,.735,.46],
      ankle:[-.575,.545,.51],foot:[-.575,.42,.51,-.49,-.28]},
  ];
  m.loft([ring(.80,-.045,.215,.132,.07),ring(.91,-.03,.235,.155,.075),
    ring(.98,-.01,.20,.145,.08)],shorts);
  for(const {hip,thigh,hem,knee,upperCalf,calf,ankle,foot} of data){
    const nearHem=hem.map((v,i)=>v+(thigh[i]-v)*.20);
    const innerHem=hem.map((v,i)=>v+(knee[i]-v)*.055);
    limb(THREE,m,[[hip,.146,.152],[thigh,.166,.164],[nearHem,.159,.147],
      [hem,.151,.146],[innerHem,.125,.119]],(r,i)=>{
      if(r>=4)return 0x9a783c;
      return (i+r)%5===0?0xc3a35b:i===4||i===5?0x9b7c3c:shorts;
    });
    limb(THREE,m,[[innerHem,.116,.115],[knee,.100,.096],[upperCalf,.112,.106],
      [calf,.086,.090],[ankle,.056,.059]],(r,i)=>i===4||i===5?shade:skin);
    shoe(m,...foot);
  }
}
function torso(THREE,m) {
  // Displaced pelvis, narrower waist and ribcage leaning toward the load.
  // Chest is its own sculpted surface inside the V-neck; vest is a thicker shell.
  const rows=[
    [.88,.05,-.035,.208,.135,.012],[.99,.065,.015,.185,.127,.020],
    [1.10,.075,.081,.200,.142,.045],[1.22,.08,.146,.249,.152,.090],
    [1.34,.08,.197,.288,.155,.132],[1.43,.075,.234,.259,.137,.137],
    [1.48,.07,.260,.113,.092,.072],
  ].map(([y,x,z,w,d,v])=>[
    [x,y,z+d+.012],[x+v*.56,y,z+d+.018],[x+v,y,z+d*.88],
    [x+w*.76,y,z+d*.70],[x+w,y,z+d*.09],[x+w*.77,y,z-d*.76],
    [x,y,z-d],[x-w*.77,y,z-d*.76],[x-w,y,z+d*.09],
    [x-w*.76,y,z+d*.70],[x-v,y,z+d*.88],[x-v*.56,y,z+d+.018],
  ]);
  m.loft(rows,(r,i)=>{
    if(r>=3&&[0,1,10,11].includes(i))return (i===0||i===11)?0xd09a73:skin;
    return [4,5,6,7].includes(i)?0x505a35:[2,9].includes(i)?0x77834c:vest;
  });
  // Sculpted clavicles and pectoral planes, integrated as small relief surfaces.
  for(const s of [-1,1]){
    const x=.08;
    m.polygon([[x,1.405,.369],[x+s*.112,1.42,.365],[x+s*.076,1.351,.373],
      [x+s*.025,1.337,.375]],0xc89169,[x,1.35,.21]);
    m.polygon([[x+s*.022,1.333,.376],[x+s*.075,1.347,.375],
      [x+s*.048,1.285,.332],[x,1.277,.333]],0xb77f59,[x,1.32,.20]);
    const ids=s===1?[2,3]:[10,9];
    for(let i=3;i<rows.length;i++){
      const a=rows[i-1][ids[0]],b=rows[i][ids[0]];
      const inA=[a[0],a[1],a[2]+.014],inB=[b[0],b[1],b[2]+.014];
      const outA=[a[0]+s*.041,a[1],a[2]+.008],outB=[b[0]+s*.041,b[1],b[2]+.008];
      m.polygon([inA,outA,outB,inB],0x90965c,[.07,1.2,.04]);
    }
    // Separate folded flaps: thickness, ridges, split hem and irregular silhouette.
    const x0=.055;
    const top=[x0+s*.019,1.015,.166],side=[x0+s*.188,1.007,.122],
      ridge=[x0+s*.105,.895,.208],edge=[x0+s*.218,.83,.122],
      tip=[x0+s*.083,s===1?.765:.855,.196],inner=[x0+s*.020,.895,.175];
    const shell=[top,side,edge,tip,inner],back=shell.map(([x,y,z])=>[x,y,z-.027]);
    const c=[x0+s*.09,.94,.11];
    for(let i=0;i<shell.length;i++){
      const j=(i+1)%shell.length;
      m.polygon([shell[i],shell[j],ridge],i===1?0x525b34:i===3?0x889255:vest,c);
      m.polygon([shell[i],back[i],back[j],shell[j]],0x535a38,c);
    }
    m.polygon(back,0x505735,c);
  }
  // Knotted frog closures on the two front panels.
  for(const [y,z,x] of [[1.10,.245,.073],[1.00,.178,.065]]){
    sweep(THREE,m,[[[x-.054,y+.007,z],.012,.012],[[x,y,z+.007],.013,.013],
      [[x+.056,y+.006,z],.012,.012]],0xbfa577,6);
    for(const s of [-1,1]) sweep(THREE,m,[[[x+s*.06,y-.012,z],.017,.018],
      [[x+s*.06,y+.013,z],.018,.019]],0xd3bb8d,6);
  }
  const p=[[.229,1.329,.327],[.297,1.308,.308],[.291,1.234,.267],[.225,1.253,.288]];
  m.polygon(p,0x536039,[.08,1.25,.18]);
  m.polygon([p[0].map((v,i)=>v+(i===2?.014:0)),p[1].map((v,i)=>v+(i===2?.014:0)),
    [.296,1.291,.312],[.229,1.312,.333]],0x91955b,[.08,1.25,.18]);
}
function arms(THREE,m) {
  // Left and right shoulders/forearms use independently sculpted poses.
  const arms=[
    {s:-1,shoulder:[-.158,1.405,.227],deltoid:[-.245,1.375,.24],bicep:[-.352,1.329,.251],
      elbow:[-.475,1.245,.275],forearm:[-.532,1.377,.282],wrist:[-.565,1.550,.302]},
    {s:1,shoulder:[.322,1.405,.239],deltoid:[.395,1.374,.247],bicep:[.477,1.305,.254],
      elbow:[.574,1.233,.269],forearm:[.611,1.398,.290],wrist:[.594,1.573,.308]},
  ];
  for(const {s,shoulder,deltoid,bicep,elbow,forearm,wrist} of arms){
    // More sections at the shoulder and elbow, fewer through long muscle planes.
    const before=elbow.map((v,i)=>v+(bicep[i]-v)*.20);
    const after=elbow.map((v,i)=>v+(forearm[i]-v)*.22);
    limb(THREE,m,[[shoulder,.100,.112],[deltoid,.132,.133],[bicep,.120,.114],
      [before,.089,.092],[elbow,.077,.077],[after,.089,.087],
      [forearm,.103,.086],[wrist,.052,.056]],(r,i)=>i===4||i===5?shade:skin,12);
    const [x,y,z]=wrist;
    const palm=[x-s*.008,y+.061,z+.018];
    limb(THREE,m,[[wrist,.054,.049],[palm,.063,.052],
      [[x-s*.026,y+.100,z+.008],.056,.042]],skin,8);
    // Four fingers are shaped as a curled fist around the actual raised sack end.
    for(let i=0;i<4;i++){
      const fy=y+.025+i*.023,fx=x+s*(.021-i*.004);
      sweep(THREE,m,[[[fx,fy,z+.034],.014,.017],
        [[fx-s*.042,fy+.010,z+.059],.017,.017],
        [[fx-s*.073,fy+.010,z+.025],.012,.013]],skin,6);
    }
    sweep(THREE,m,[[[x+s*.049,y+.030,z+.007],.021,.022],
      [[x+s*.027,y+.075,z+.052],.024,.021],
      [[x-s*.018,y+.079,z+.061],.017,.018]],0xd19a72,7);
  }
}
function head(THREE,m) {
  // Sculpt face in head-local space. All facial landmarks are tilted together
  // about the neck, so the gaze points down and the neck is not straight up.
  const pitch=.24,yaw=-.10;
  const h=mapped(m,([x,y,z])=>{
    const v=y*Math.cos(pitch)-z*Math.sin(pitch),w=y*Math.sin(pitch)+z*Math.cos(pitch);
    return [.065+x*Math.cos(yaw)+w*Math.sin(yaw),1.485+v,.329-x*Math.sin(yaw)+w*Math.cos(yaw)];
  });
  limb(THREE,m,[[[.075,1.407,.232],.088,.092],[[.065,1.48,.318],.081,.081]],skin,9);
  // Explicit front-face landmarks. Every feature is part of the surface:
  // chin, lower lip, mouth, upper lip, cheek, orbit, brow and forehead.
  // Five columns across each half; the eye opening spans columns 1–3.
  const rows=[
    [[0,.013,.086],[.040,.014,.078],[.073,.028,.060],[.096,.052,.032],[.102,.078,-.014]],
    [[0,.057,.120],[.040,.059,.116],[.080,.068,.090],[.112,.084,.051],[.126,.102,-.010]],
    [[0,.090,.125],[.045,.090,.119],[.083,.102,.109],[.120,.112,.063],[.141,.126,.002]],
    [[0,.116,.132],[.045,.115,.124],[.081,.126,.122],[.126,.137,.074],[.146,.147,.010]],
    [[0,.151,.129],[.041,.151,.124],[.083,.156,.125],[.123,.167,.084],[.148,.171,.016]],
    [[0,.188,.140],[.041,.185,.137],[.083,.193,.132],[.121,.205,.090],[.146,.204,.025]],
    [[0,.225,.133],[.045,.230,.133],[.087,.234,.120],[.121,.241,.087],[.139,.241,.019]],
    [[0,.270,.113],[.047,.270,.110],[.090,.272,.094],[.119,.270,.063],[.126,.261,.006]],
  ];
  const front=(pts,c)=>h.polygon(pts,c,[0,.15,-.03]);
  for(const s of [-1,1]){
    const p=(r,i)=>[s*rows[r][i][0],rows[r][i][1],rows[r][i][2]];
    for(let r=0;r<rows.length-1;r++){
      for(let i=0;i<4;i++){
        if(r===4&&i===1)continue; // actual opening for recessed eyes
        const a=p(r,i),b=p(r,i+1),c=p(r+1,i+1),d=p(r+1,i);
        const paint=i===3?0xb57b56:r===2&&i===2?0xd09a70:skin;
        front([a,b,c],paint);
        front([a,c,d],r===1&&i===2?0xb9825b:paint);
      }
    }
    // Temple, rear skull, jaw-side planes and ears.
    for(let r=0;r<rows.length-1;r++){
      const a=p(r,4),b=p(r+1,4);
      const rear=q=>[s*q[0]*.68,q[1],-.103-(q[1]>.17?.019:0)];
      front([a,rear(a),rear(b),b],shade);
      h.polygon([rear(a),[0,a[1],rear(a)[2]-.024],[0,b[1],rear(b)[2]-.024],rear(b)],skin,[0,.15,-.01]);
    }
    const eye=[p(4,1),p(4,2),p(5,2),p(5,1)];
    const inset=eye.map(([x,y,z])=>[x,y,z-.019]);
    for(let i=0;i<4;i++)front([eye[i],eye[(i+1)%4],inset[(i+1)%4],inset[i]],0xa87152);
    front(inset,0xddd0b5);
    front([[s*.054,.156,.115],[s*.072,.159,.116],[s*.074,.183,.121],[s*.054,.181,.122]],0x302a26);
    front([[s*.037,.183,.145],[s*.093,.202,.142],[s*.107,.190,.136],[s*.045,.171,.139]],hair);
    // Outer ear has a folded rim and inset bowl.
    const a=[s*.142,.119,.020],b=[s*.173,.135,.014],c=[s*.174,.189,.010],d=[s*.145,.213,.006],e=[s*.147,.163,.044];
    front([a,b,e],skin);front([b,c,e],0xc08a61);front([c,d,e],0xd29a72);
    front([e,[s*.157,.147,.034],[s*.162,.182,.031]],shade);
  }
  // Nose: continuous projecting bridge, tip, alae and underside.
  const bridge=[0,.198,.143],mid=[0,.148,.163],tip=[0,.113,.187],
    left=[-.028,.105,.146],right=[.028,.105,.146],base=[0,.098,.154];
  front([bridge,[-.033,.158,.128],mid],skin);front([bridge,mid,[.033,.158,.128]],0xc78b60);
  front([mid,left,tip],0xd19a73);front([mid,tip,right],skin);
  front([left,base,tip],shade);front([tip,base,right],shade);
  front([[-.035,.076,.124],[0,.079,.139],[.035,.076,.124],[0,.069,.137]],0x704836);
  front([[-.025,.067,.126],[0,.061,.135],[.027,.067,.126],[0,.069,.137]],0xc58c67);
  // Skull caps and a cloth band with an irregular edge.
  h.loft([ring(.247,-.006,.147,.133),ring(.280,-.007,.149,.135)],0xd7c8a7);
  h.loft([ring(.279,-.015,.145,.136),ring(.331,-.021,.151,.126),
    ring(.368,-.033,.111,.097),ring(.384,-.036,.042,.052)],hair);
  // Solid angular locks (closed ridged wedges), varied lengths and directions.
  for(const [x,y,z,w,len,dx] of [
    [-.112,.324,.080,.045,.083,-.034],[-.062,.357,.100,.053,.102,-.060],
    [.003,.370,.099,.056,.113,-.065],[.068,.349,.085,.052,.090,-.035],
    [.118,.317,.061,.041,.071,-.017],[-.080,.365,.025,.056,.095,-.040],
    [.035,.383,.011,.055,.084,-.019],[.105,.344,-.028,.049,.076,.018],
  ]){
    const a=[x-w,y,z-.025],b=[x+w,y-.012,z-.033],c=[x+.011,y+.032,z-.060],
      ridge=[x-.006,y+.008,z+.050],tip=[x+dx,y-len*.72,z+.074];
    const center=[x,y-.015,z];
    h.polygon([a,ridge,tip],0x393739,center);h.polygon([ridge,b,tip],hair,center);
    h.polygon([a,c,ridge],0x474347,center);h.polygon([ridge,c,b],hair,center);
    h.polygon([a,tip,b,c],hair,center);
  }
  sweep(THREE,h,[[[-.12,.263,-.087],.025,.023],[[-.16,.248,-.104],.030,.024]],0xc5b694,6);
  h.polygon([[-.145,.251,-.10],[-.195,.184,-.123],[-.169,.192,-.09]],0xd7c8a7,[-.10,.22,-.08]);
}

export function coolieGeometry(THREE) {
  const m=facets(THREE);
  legs(THREE,m);torso(THREE,m);arms(THREE,m);head(THREE,m);
  return m.finish();
}

export function sackGeometry(THREE) {
  const m=facets(THREE);
  // Puffy, compressed burlap with broad shoulders and slightly uneven ends.
  const outline=[[0,-1],[.60,-.84],[.93,-.42],[1,.16],[.74,.77],[.06,1],
    [-.68,.78],[-1,.18],[-.89,-.46],[-.51,-.84]];
  const profiles=[[-.70,.22,.23],[-.57,.76,.77],[-.34,1,1],[.28,.98,.96],[.54,.80,.77],[.67,.24,.25]];
  const rings=profiles.map(([x,w,h],i)=>outline.map(([z,y])=>
    [x,y*.173*h+(i%2)*.009,z*.405*w]));
  m.loft(rings,(r,i)=>i===0||i===9?0xc8b69b:i===4||i===5?0xf0e0c0:0xe5d2ae);
  // A stitched seam follows the actual sack faces; tiny raised strips, not
  // coplanar decals. Seven dashes remain readable at normal camera distance.
  for(let i=0;i<rings.length-1;i++){
    const a=rings[i][3],b=rings[i+1][3];
    for(let j=0;j<(i===2?3:1);j++){
      const n=i===2?3:1,t0=(j+.12)/n,t1=(j+.78)/n;
      const at=t=>a.map((v,k)=>v+(b[k]-v)*t);
      const p=at(t0),q=at(t1);
      m.polygon([[p[0],p[1]-.007,p[2]+.012],[q[0],q[1]-.007,q[2]+.012],
        [q[0],q[1]+.007,q[2]+.012],[p[0],p[1]+.007,p[2]+.012]],0xa99472,[0,0,0]);
    }
  }
  // Gathered fabric, rope wrap and flared end; all in the same reusable buffer.
  sweep(THREE,m,[[[.64,0,0],.047,.043],[[.715,.008,.006],.034,.033],
    [[.80,.025,.013],.069,.051]],0xd3bc94,5);
  sweep(THREE,m,[[[.698,.006,.004],.047,.045],[[.733,.013,.008],.046,.043]],0x97805d,5);
  return m.finish();
}

// Carried sacks have a curved centerline: the middle rises over the neck,
// the ends droop toward the gripping hands. The ground stock stays unchanged.
export function carriedSackGeometry(THREE) {
  const m=facets(THREE);
  const profiles=[
    [-.76,.20,.20,-.12,.13],[-.64,.62,.73,-.085,.08],[-.47,.90,1,-.02,.015],
    [-.22,1,1.04,.042,-.025],[.08,1,.99,.055,-.04],[.36,.93,.95,.025,-.015],
    [.58,.73,.78,-.055,.065],[.72,.23,.26,-.12,.13],
  ];
  const outline=[[0,-1],[.62,-.78],[.95,-.35],[1,.15],[.73,.76],[.04,1],
    [-.65,.77],[-1,.18],[-.88,-.43],[-.50,-.82]];
  const rings=profiles.map(([x,w,h,y,z],r)=>outline.map(([u,v],i)=>
    [x,y+v*.195*h+.007*Math.sin(r*1.7+i*2),z+u*.405*w]));
  m.loft(rings,(r,i)=>i===0||i===9?0xc7b293:i===4||i===5?0xead9b6:0xdfc9a2);
  for(let i=0;i<rings.length-1;i++){
    const a=rings[i][3],b=rings[i+1][3];
    const n=i===0||i===6?2:4;
    for(let j=0;j<n;j++){
      const at=t=>a.map((v,k)=>v+(b[k]-v)*t);
      const p=at((j+.12)/n),q=at((j+.79)/n);
      m.polygon([[p[0],p[1]-.0035,p[2]+.009],[q[0],q[1]-.0035,q[2]+.009],
        [q[0],q[1]+.0035,q[2]+.009],[p[0],p[1]+.0035,p[2]+.009]],0x9d8561,[0,0,0]);
    }
  }
  for(const s of [-1,1]){
    const x=s*.72;
    sweep(THREE,m,[[[x,-.12,.13],.044,.047],[[x+s*.048,-.15,.15],.029,.032],
      [[x+s*.105,-.205,.19],.064,.048]],0xd2ba91,6);
    sweep(THREE,m,[[[x+s*.036,-.14,.146],.041,.041],
      [[x+s*.055,-.154,.158],.040,.041]],0x9f825a,6);
  }
  return m.finish();
}
export function buildCoolie(THREE, scene, layout) {
  const root = new THREE.Group();
  root.name = 'Coolie — porter';
  root.position.set(cooliePosition.x,cooliePosition.y,cooliePosition.z);
  root.rotation.y = -.65;
  scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1, flatShading:true });
  const body = new THREE.Mesh(coolieGeometry(THREE),material);
  body.name = 'Coolie faceted body';
  body.castShadow = true;
  root.add(body);
  const geometry = sackGeometry(THREE);
  const carried = [
    [.02,1.67,-.105,.03,.98,1.13,1.12],
    [-.055,2.00,-.20,-.09,1.01,1.02,1.14],
    [.06,2.29,-.26,.12,.97,.88,1.06],
    [-.06,2.52,-.25,-.13,.92,.80,1.00],
    [.01,2.72,-.26,.08,.82,.68,.92],
  ];
  const pile = [];
  // Three compact stacks off the central path; leave the shop and fence routes clear.
  const stacks = [[15.65,13.85,5],[17.0,15.75,7],[10.65,14.65,5]];
  for (const [x,z,count] of stacks) {
    for (let i=0;i<count;i++) {
      const row = Math.floor(i/2);
      pile.push([x+(i%2? .39:-.39),.18+row*.30,z+(i%2?.36:-.36),
        i%2?.19:-.14,.87+(i%3)*.045,.93,1]);
    }
    layout.solid(x,z,2.25,1.65,.35+Math.floor((count-1)/2)*.30);
  }
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  function sacks(name, entries, parent, meshGeometry=geometry) {
    const mesh = new THREE.InstancedMesh(meshGeometry,material,entries.length);
    mesh.name=name;
    entries.forEach(([x,y,z,yaw,sx,sy,sz],i)=>{
      dummy.position.set(x,y,z);
      dummy.rotation.set(parent===root?-.09:0,yaw,(i%3-1)*.035);
      dummy.scale.set(sx,sy,sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,tint.setHex([0xcab99d,0xe4d4b9,0xbfa888,0xdac8a7][i%4]));
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    parent.add(mesh);
  }
  sacks('Coolie carried sacks',carried,root,carriedSackGeometry(THREE));
  sacks('Coolie ground sacks',pile,scene);
  layout.solid(cooliePosition.x,cooliePosition.z,1.55,1.18,1.8);
}
