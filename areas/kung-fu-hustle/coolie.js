// Area-local faceted porter and reusable burlap sack geometry.
export const cooliePosition = { x: 13.11, y: -.04, z: 14.27 };
const skin = 0xc18a61, shade = 0xa16c4c, hair = 0x25282b;
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

// Art-directed, deliberately asymmetric planes rather than rounded high-segment primitives.
function ring(y, z, w, d, x = 0) {
  return [[0,y,z+d],[w*.72,y,z+d*.84],[w,y,z+d*.18],[w*.76,y,z-d*.82],
    [0,y,z-d],[-w*.76,y,z-d*.82],[-w,y,z+d*.18],[-w*.72,y,z+d*.84]]
    .map(p=>[p[0]+x,p[1],p[2]]);
}

function limb(THREE,m,sections,paint,n=8) {
  // Each ring follows the local joint tangent so elbows/knees are a continuous shell.
  const centers=sections.map(([p])=>new THREE.Vector3(...p));
  m.loft(sections.map(([p,w,d],i)=>{
    const axis=centers[Math.min(i+1,centers.length-1)].clone()
      .sub(centers[Math.max(i-1,0)]).normalize();
    const ref=Math.abs(axis.z)>.91?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1);
    const across=new THREE.Vector3().crossVectors(ref,axis).normalize();
    const up=new THREE.Vector3().crossVectors(axis,across).normalize();
    return Array.from({length:n},(_,j)=>{
      const a=(j+.5)*Math.PI*2/n;
      return new THREE.Vector3(...p).addScaledVector(across,Math.cos(a)*w)
        .addScaledVector(up,Math.sin(a)*d).toArray();
    });
  }),paint);
}

function shoe(m,x,y,z,tilt=0) {
  const transform=p=>{
    const dy=p[1], dz=p[2];
    return [x+p[0],y+dy*Math.cos(tilt)-dz*Math.sin(tilt),z+dy*Math.sin(tilt)+dz*Math.cos(tilt)];
  };
  const sole=[ring(0,.06,.104,.17),ring(.025,.06,.107,.17)];
  m.loft(sole.map(row=>row.map(transform)),0x88785d);
  m.loft([ring(.025,.06,.104,.165),ring(.085,.045,.105,.156),ring(.135,-.005,.071,.093)]
    .map(row=>row.map(transform)),(r,i)=>i===0||i===7?0x424345:shoes);
}

function buildLegs(THREE,m) {
  // Right foot carries the weight; left leg is raised mid-stride as in the concept.
  const legs=[
    {s:1,hip:[.13,.86,-.035],thigh:[.19,.69,-.045],hem:[.20,.61,-.035],
      knee:[.21,.49,-.02],calf:[.23,.32,-.09],ankle:[.23,.16,-.105],shoe:[.23,.045,-.105,0]},
    {s:-1,hip:[-.12,.85,-.025],thigh:[-.26,.86,.19],hem:[-.32,.84,.32],
      knee:[-.36,.82,.42],calf:[-.41,.62,.53],ankle:[-.46,.43,.57],shoe:[-.46,.31,.57,-.33]},
  ];
  for (const {hip,thigh,hem,knee,calf,ankle,shoe:foot} of legs) {
    const legStart=hem.map((v,i)=>v+(knee[i]-v)*.12);
    limb(THREE,m,[[hip,.151,.145],[thigh,.165,.155],[hem,.145,.137]],(r,i)=>
      i===1||i===5?0x8e7538:i===3?0xc3a45b:shorts);
    // Rolled cuffs share the same axis, with a slightly larger outside lip.
    const cuffStart=hem.map((v,i)=>v+(thigh[i]-v)*.18);
    limb(THREE,m,[[cuffStart,.151,.141],[hem,.151,.141],[legStart,.133,.123]],0xc3a45b);
    limb(THREE,m,[[hem,.115,.111],[knee,.101,.098],[calf,.105,.088],[ankle,.060,.063]],(r,i)=>
      i===4||i===5?shade:skin);
    shoe(m,...foot);
  }
}

function buildTorso(THREE,m) {
  // Each level carries its own V-neck edge. Skin and vest are neighboring faces,
  // not a triangle painted over a closed torso.
  const levels=[
    [.77,-.045,.228,.135,.012],
    [.90,-.015,.218,.14,.013],
    [1.06,.038,.235,.151,.020],
    [1.18,.077,.267,.164,.083],
    [1.33,.112,.300,.160,.136],
    [1.43,.145,.275,.136,.121],
    [1.48,.17,.120,.096,.072],
  ];
  const rows=levels.map(([y,z,w,d,v])=>[
    [0,y,z+d+.014],[v,y,z+d*.96],[w*.70,y,z+d*.78],[w,y,z+d*.12],
    [w*.74,y,z-d*.82],[0,y,z-d],[-w*.74,y,z-d*.82],
    [-w,y,z+d*.12],[-w*.70,y,z+d*.78],[-v,y,z+d*.96]
  ]);
  m.loft(rows,(r,i)=>{
    if(r>=3&&(i===0||i===9)) return r===4?0xc58c61:skin;
    return i===3||i===5||i===6?0x515b36:i===1||i===8?0x74804b:vest;
  });
  const front=(p,paint)=>m.polygon(p,paint,[0,1.1,-.03]);
  for(const s of [-1,1]) {
    // Narrow lapels hug the changing front contour with real surface separation.
    for(let i=3;i<rows.length;i++){
      const a=rows[i-1][s===1?1:9], b=rows[i][s===1?1:9];
      const edge=p=>[p[0],p[1],p[2]+.013];
      const outer=p=>[p[0]+s*.032,p[1],p[2]+.010];
      front([edge(a),outer(a),outer(b),edge(b)],0x899054);
    }
    // Split front panels and angular folds below the waist.
    const top=[s*.045,.99,.186], outside=[s*.197,.94,.152],
      corner=[s*.247,.745,.125], point=[s*.084,.702,.174];
    front([top,outside,corner,point],vest);
    front([top,point,[s*.125,.79,.191]],0x82854b);
    front([outside,corner,[s*.157,.83,.182]],0x515b36);
    front([point,corner,[s*.243,.77,.141],[s*.092,.731,.184]],0x91905a);
  }
  // Two Chinese-style cloth fastenings, integrated in the body mesh.
  for(const [y,z] of [[1.055,.222],[.955,.185]]){
    sweep(THREE,m,[[[-.058,y,z],.014,.014],[[.058,y,z],.014,.014]],0xbaa06a,5);
    for(const s of [-1,1]) sweep(THREE,m,[[[s*.064,y-.013,z],.018,.017],[[s*.064,y+.014,z],.018,.017]],0xd1b480,5);
  }
  front([[.154,1.289,.261],[.235,1.28,.237],[.226,1.203,.226],[.151,1.213,.244]],0x566239);
  front([[.150,1.289,.274],[.238,1.28,.250],[.237,1.261,.249],[.151,1.27,.270]],0x939159);
}

function buildArms(THREE,m) {
  for(const s of [-1,1]) {
    const shoulder=[s*.255,1.37,.13], bicep=[s*.365,1.31,.17],
      elbow=[s*.48,1.23,.22], forearm=[s*.55,1.39,.245], wrist=[s*.575,1.55,.25];
    limb(THREE,m,[[shoulder,.108,.116],[bicep,.128,.114],[elbow,.077,.084],
      [forearm,.100,.083],[wrist,.053,.057]],(r,i)=>i===4||i===5?shade:skin);
    // Palm and four separate short faceted fingers read as a gripping fist,
    // with a crossing thumb rather than a mitten or polygon paddle.
    limb(THREE,m,[[wrist,.058,.050],[[s*.58,1.618,.245],.073,.058],
      [[s*.56,1.665,.215],.059,.045]],skin,7);
    for(let i=0;i<4;i++){
      const y=1.57+i*.027, x=s*(.595-(i===3?.012:0));
      sweep(THREE,m,[[[x,y,.279],.014,.017],[[s*.548,y+.006,.307],.016,.017],
        [[s*.522,y+.014,.270],.012,.013]],i%2?0xc9946b:skin,5);
    }
    sweep(THREE,m,[[[s*.62,1.58,.255],.022,.024],[[s*.595,1.64,.305],.023,.021],
      [[s*.555,1.65,.313],.017,.017]],0xd09a70,6);
  }
}

function buildHead(THREE,m) {
  sweep(THREE,m,[[[0,1.40,.17],.083,.084],[[0,1.53,.267],.075,.078]],skin,8);
  // The face uses ten front/back planes and a sloped forehead, distinct cheekbones
  // and chin. Details are projected onto its exact front contour.
  const levels=[
    [1.47,.310,.070,.070,.00],[1.51,.325,.104,.088,.008],
    [1.555,.326,.130,.109,.012],[1.61,.320,.145,.118,.012],
    [1.66,.307,.143,.111,-.006],[1.71,.289,.140,.119,.007],
    [1.76,.266,.126,.110,.006],[1.79,.255,.095,.092,0],
  ];
  const rows=levels.map(([y,z,w,d,mid])=>[
    [0,y,z+d+mid],[w*.36,y,z+d*.94],[w*.73,y,z+d*.81],[w,y,z+d*.20],
    [w*.77,y,z-d*.80],[0,y,z-d],[-w*.77,y,z-d*.80],
    [-w,y,z+d*.20],[-w*.73,y,z+d*.81],[-w*.36,y,z+d*.94]
  ]);
  m.loft(rows,(r,i)=>i===3||i===6?shade:i===2||i===7?0xb47c55:skin);
  const surface=(x,y)=>{
    const j=Math.max(0,Math.min(levels.length-2,levels.findIndex((v,i)=>i>0&&y<=v[0])-1));
    const a=rows[j],b=rows[j+1],t=Math.max(0,Math.min(1,(y-a[0][1])/(b[0][1]-a[0][1])));
    const points=a.slice(0,4).map((p,i)=>[p[0]+(b[i][0]-p[0])*t,p[2]+(b[i][2]-p[2])*t]);
    const u=Math.abs(x);
    for(let i=1;i<points.length;i++) if(u<=points[i][0]){
      const [ax,az]=points[i-1],[bx,bz]=points[i];
      return az+(bz-az)*(u-ax)/(bx-ax);
    }
    return points.at(-1)[1];
  };
  const patch=(points,paint,gap=.012)=>m.polygon(points.map(([x,y])=>[x,y,surface(x,y)+gap]),paint,[0,1.62,.30]);
  for(const s of [-1,1]){
    const mirror=points=>points.map(([x,y])=>[s*x,y]);
    // Ivory sclera, pupil and brow follow the cheek planes without sinking into them.
    patch(mirror([[.028,1.645],[.101,1.656],[.092,1.633],[.047,1.631]]),0xe5d6b6);
    patch(mirror([[.052,1.647],[.077,1.650],[.077,1.633],[.053,1.633]]),0x342d28,.020);
    patch(mirror([[.026,1.65],[.102,1.662],[.101,1.653],[.027,1.642]]),hair,.019);
    patch(mirror([[.023,1.672],[.103,1.697],[.112,1.683],[.031,1.660]]),hair,.013);
    limb(THREE,m,[[[s*.133,1.59,.281],.030,.028],[[s*.154,1.641,.277],.037,.032],
      [[s*.145,1.676,.275],.024,.024]],skin,6);
    m.polygon([[s*.152,1.62,.308],[s*.165,1.65,.300],[s*.146,1.659,.305]],shade,[0,1.62,.27]);
  }
  // Nose is a closed wedge sharing the visual bridge, with both side planes.
  const bridge=[0,1.665,surface(0,1.665)+.016],tip=[0,1.590,.487];
  const wings=[[-.035,1.579,.439],[.035,1.579,.439]],base=[0,1.571,.454];
  m.polygon([bridge,wings[0],tip],0xc89164,[0,1.60,.32]);
  m.polygon([bridge,tip,wings[1]],skin,[0,1.60,.32]);
  m.polygon([wings[0],base,tip],shade,[0,1.60,.32]);
  m.polygon([tip,base,wings[1]],0xa97550,[0,1.60,.32]);
  patch([[-.044,1.535],[0,1.544],[.043,1.535],[0,1.531]],0x704637,.014);
  patch([[-.027,1.522],[.029,1.523],[0,1.515]],0xd09870,.013);
  // Headband is a shaped strip wrapping the tilted head; angular hair clumps
  // break the old helmet silhouette while leaving the forehead visible.
  const headband=(y,z,w,d)=>ring(y,z,w,d).map(([x,py,pz])=>[x,py+.020*x/w,pz]);
  m.loft([headband(1.713,.282,.151,.136),headband(1.750,.272,.153,.133)],0xd6c8a7);
  m.loft([ring(1.754,.263,.151,.128),ring(1.807,.246,.157,.139),
    ring(1.858,.216,.110,.105),ring(1.868,.192,.050,.060)],hair);
  for(const [x,y,z,w,h,dx] of [
    [-.116,1.805,.350,.051,.091,-.065],[-.060,1.838,.365,.060,.118,-.058],
    [.003,1.846,.365,.063,.115,-.044],[.060,1.830,.356,.058,.093,-.034],
    [.112,1.803,.335,.044,.076,-.022],
  ]){
    const a=[x-w,y,z-.018], b=[x+w,y+.008,z-.034],c=[x+.012,y+.044,z-.044],
      tip=[x+dx,y-h*.76,z+.039], ridge=[x-.008,y+.008,z+.037];
    m.polygon([a,ridge,tip],0x35383b,[0,1.81,.24]);
    m.polygon([ridge,b,tip],hair,[0,1.81,.24]);
    m.polygon([a,c,ridge],0x3d4042,[0,1.81,.24]);
    m.polygon([ridge,c,b],hair,[0,1.81,.24]);
  }
  // Short cloth knot at the rear of the headband.
  sweep(THREE,m,[[[-.10,1.737,.152],.025,.020],[[-.137,1.725,.133],.032,.024]],0xc6b894,5);
  m.polygon([[-.136,1.727,.134],[-.17,1.677,.126],[-.19,1.701,.135]],0xd6c8a7,[0,1.73,.25]);
}

export function coolieGeometry(THREE) {
  const m=facets(THREE);
  buildLegs(THREE,m);
  buildTorso(THREE,m);
  buildArms(THREE,m);
  buildHead(THREE,m);
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
    [0,1.57,-.14, .03,1.11,1.16,1.13],
    [-.06,1.91,-.22,-.07,1.14,1.08,1.20],
    [.055,2.23,-.28,.10,1.06,1.00,1.15],
    [-.055,2.52,-.24,-.12,1.01,.93,1.05],
    [.025,2.78,-.26,.06,.87,.84,.94],
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
  function sacks(name, entries, parent) {
    const mesh = new THREE.InstancedMesh(geometry,material,entries.length);
    mesh.name=name;
    entries.forEach(([x,y,z,yaw,sx,sy,sz],i)=>{
      dummy.position.set(x,y,z);
      dummy.rotation.set(0,yaw,(i%3-1)*.035);
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
  sacks('Coolie carried sacks',carried,root);
  sacks('Coolie ground sacks',pile,scene);
  layout.solid(cooliePosition.x,cooliePosition.z,1.15,.90,1.8);
}
