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
    {hip:[.19,.91,-.04],thigh:[.216,.78,-.015],hem:[.22,.655,.017],
      knee:[.245,.53,.046],upperCalf:[.25,.42,.006],calf:[.24,.31,-.045],
      ankle:[.225,.16,-.053],foot:[.225,.045,-.053,0,.10]},
    {hip:[-.055,.91,-.035],thigh:[-.205,.98,.155],hem:[-.315,1.008,.295],
      knee:[-.419,1.01,.405],upperCalf:[-.475,.88,.435],calf:[-.51,.735,.46],
      ankle:[-.575,.545,.51],foot:[-.575,.42,.51,-.49,-.28]},
  ];
  m.loft([ring(.80,-.045,.215,.132,.07),ring(.91,-.03,.235,.155,.075),
    ring(.98,-.01,.20,.145,.08)],shorts);
  for(const {hip,thigh,hem,knee,upperCalf,calf,ankle,foot} of data){
    const nearHem=hem.map((v,i)=>v+(thigh[i]-v)*.20);
    const innerHem=hem.map((v,i)=>v+(knee[i]-v)*.055);
    limb(THREE,m,[[hip,.146,.152],[thigh,.151,.157],[nearHem,.153,.151],
      [hem,.151,.146],[innerHem,.125,.119]],(r,i)=>{
      if(r>=4)return 0x9a783c;
      return (i+r)%5===0?0xc3a35b:i===4||i===5?0x9b7c3c:shorts;
    });
    limb(THREE,m,[[innerHem,.116,.115],[knee,.100,.096],[upperCalf,.098,.096],
      [calf,.086,.090],[ankle,.056,.059]],(r,i)=>i===4||i===5?shade:skin);
    shoe(m,...foot);
  }
}
// V4: adapted from img2threejs v2.0.1 character decomposition and hair
// construction. One continuous organic core, carved orbital cavities and
// volumetric locks. This is a static single-view approximation, not a rig.
const blend=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
function oval(p,c,r){
  const q=p.map((v,i)=>(v-c[i])/r[i]),k0=Math.hypot(...q),k1=Math.hypot(...q.map((v,i)=>v/r[i]));
  return k1>1e-9?k0*(k0-1)/k1:-Math.min(...r);
}
const blob=(c,r)=>p=>oval(p,c,r);
function bone(a,b,r0,r1){
  const d=b.map((v,i)=>v-a[i]),len=d.reduce((n,v)=>n+v*v,0);
  return p=>{
    const q=p.map((v,i)=>v-a[i]),t=Math.max(0,Math.min(1,q.reduce((n,v,i)=>n+v*d[i],0)/len));
    return Math.hypot(...q.map((v,i)=>v-t*d[i]))-r0-(r1-r0)*t;
  };
}
const fieldUnion=(fields,k)=>p=>fields.reduce((v,f)=>blend(v,f(p),k),100);

// Surface nets: average actual zero crossings into one vertex per active cell.
// Build once at area creation. Coarse spacing preserves visible flat facets.
function sculptSurface(field,min,max,step,emit){
  const [nx,ny,nz]=max.map((v,i)=>Math.ceil((v-min[i])/step)+1);
  const key=(x,y,z)=>(z*ny+y)*nx+x;
  const pos=(x,y,z)=>[min[0]+x*step,min[1]+y*step,min[2]+z*step];
  const samples=new Float64Array(nx*ny*nz);
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)samples[key(x,y,z)]=field(pos(x,y,z));
  const offsets=Array.from({length:8},(_,i)=>[i&1,(i>>1)&1,(i>>2)&1]),edges=[];
  for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))edges.push([i,i|bit]);
  const vertices=new Map();
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const values=offsets.map(([u,v,w])=>samples[key(x+u,y+v,z+w)]);
    if(values.every(v=>v>=0)||values.every(v=>v<0))continue;
    const sum=[0,0,0];let count=0;
    for(const [a,b] of edges){
      if((values[a]<0)===(values[b]<0))continue;
      const t=values[a]/(values[a]-values[b]);
      for(let j=0;j<3;j++)sum[j]+=offsets[a][j]+(offsets[b][j]-offsets[a][j])*t;
      count++;
    }
    vertices.set(key(x,y,z),pos(x,y,z).map((v,i)=>v+step*sum[i]/count));
  }
  for(let z=1;z<nz-1;z++)for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){
    const p=[x,y,z],v=samples[key(...p)];
    for(let a=0;a<3;a++){
      const q=p.slice();q[a]++;
      if((v<0)===(samples[key(...q)]<0))continue;
      const b=(a+1)%3,c=(a+2)%3;
      const corners=[[0,0],[-1,0],[-1,-1],[0,-1]].map(([u,w])=>{
        const r=p.slice();r[b]+=u;r[c]+=w;return vertices.get(key(...r));
      });
      if(corners.some(v=>!v))continue;
      const inside=pos(...(v<0?p:q));
      emit([corners[0],corners[1],corners[2]],inside);
      emit([corners[0],corners[2],corners[3]],inside);
    }
  }
}
function clip(poly,mask,threshold,above){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],u=mask(a)-threshold,v=mask(b)-threshold;
    const ai=above?u>=0:u<=0,bi=above?v>=0:v<=0;
    if(ai)out.push(a);
    if(ai!==bi)out.push(a.map((x,k)=>x+(b[k]-x)*u/(u-v)));
  }
  return out;
}
const poseArms=[
  {s:-1,shoulder:[-.164,1.397,.204],elbow:[-.483,1.235,.275],wrist:[-.565,1.550,.302]},
  {s:1,shoulder:[.30,1.405,.215],elbow:[.565,1.23,.259],wrist:[.594,1.573,.308]},
];
function organicCore(m){
  const parts=[
    blob([.068,.955,-.012],[.192,.155,.135]),blob([.07,1.115,.06],[.176,.24,.138]),
    blob([.065,1.285,.15],[.245,.20,.157]),blob([.064,1.39,.205],[.224,.115,.136]),
    blob([.063,1.448,.252],[.085,.12,.081]),
  ];
  for(const s of [-1,1])parts.push(blob([.065+s*.107,1.32,.246],[.118,.091,.073]));
  for(const {shoulder,elbow,wrist} of poseArms){
    const mid=shoulder.map((v,i)=>v+(elbow[i]-v)*.43),fore=elbow.map((v,i)=>v+(wrist[i]-v)*.40);
    parts.push(blob(shoulder,[.111,.12,.106]),bone(shoulder,mid,.09,.104),
      bone(mid,elbow,.104,.067),bone(elbow,fore,.067,.083),bone(fore,wrist,.083,.050));
  }
  const field=fieldUnion(parts,.055);
  // Cut the vest opening and trim across faces instead of overlaying a coplanar
  // mesh. The sculpted chest, shoulder and arm remain one continuous shell.
  const garment=([x,y,z])=>{
    const width=.253-.075*Math.max(0,(y-1.25)/.25);
    const v=.025+Math.max(0,Math.min(.11,(y-1.09)*.35));
    return Math.min(width-Math.abs(x-.064),Math.max(Math.abs(x-.065)-v,.18-z),1.445-y,y-.86);
  };
  sculptSurface(field,[-.77,.76,-.28],[.81,1.72,.48],.063,(tri,inside)=>{
    const bare=clip(tri,garment,0,false),covered=clip(tri,garment,0,true);
    const trim=clip(covered,garment,.023,false),cloth=clip(covered,garment,.023,true);
    if(bare.length>=3)m.polygon(bare,skin,inside);
    if(trim.length>=3)m.polygon(trim,0x89905a,inside);
    if(cloth.length>=3)m.polygon(cloth,vest,inside);
  });
}

function clothing(THREE,m) {
  // Thick split cloth panels follow waist tension.
  for(const s of [-1,1]){
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
  // Fists attach at the wrist anchors of the continuous core.
  for(const {s,wrist} of poseArms){
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
  // Closed sculpted skull, cheeks, jaw and nose; subtract orbital recesses.
  const skull=fieldUnion([
    blob([0,.185,-.021],[.131,.143,.132]),blob([0,.098,.025],[.108,.104,.098]),
    blob([0,.038,.041],[.067,.052,.064]),
    blob([-.078,.121,.052],[.056,.058,.067]),blob([.078,.121,.052],[.056,.058,.067]),
    blob([-.058,.191,.067],[.063,.039,.057]),blob([.058,.191,.067],[.063,.039,.057]),
    blob([0,.143,.110],[.025,.061,.040]),blob([0,.105,.133],[.031,.025,.039]),
    blob([0,.066,.083],[.047,.025,.037])
  ],.026);
  const sockets=[-.059,.059].map(x=>blob([x,.172,.116],[.043,.028,.037]));
  const field=p=>Math.max(skull(p),...sockets.map(f=>-f(p)));
  sculptSurface(field,[-.18,-.045,-.19],[.18,.36,.21],.030,
    (tri,inside)=>h.polygon(tri,skin,inside));
  for(const s of [-1,1]){
    const x=s*.059;
    h.loft([ring(.151,.098,.018,.014,x),ring(.159,.102,.035,.023,x),
      ring(.179,.101,.035,.024,x),ring(.190,.097,.019,.015,x)],0xd9ceb5);
    h.loft([ring(.155,.123,.008,.005,x),ring(.165,.124,.013,.007,x),
      ring(.181,.124,.012,.006,x)],0x372f29);
    sweep(THREE,h,[[[s*.029,.192,.119],.009,.012],[[s*.061,.205,.125],.010,.013],
      [[s*.099,.212,.104],.007,.009]],hair,6);
    limb(THREE,h,[[[s*.121,.11,.001],.024,.022],[[s*.148,.147,.006],.032,.023],
      [[s*.141,.183,.004],.024,.017]],skin,7);
    h.polygon([[s*.141,.129,.024],[s*.157,.149,.027],[s*.145,.17,.023]],shade,[0,.15,-.02]);
  }
  h.polygon([[-.034,.063,.118],[0,.066,.128],[.035,.064,.117],[0,.057,.125]],0x704a38,[0,.08,.03]);
  h.polygon([[-.022,.052,.117],[0,.048,.124],[.025,.052,.116]],0xcb9267,[0,.06,.02]);
  // Skull caps and a cloth band with an irregular edge.
  h.loft([ring(.247,-.006,.147,.133),ring(.280,-.007,.149,.135)],0xd7c8a7);
  h.loft([ring(.279,-.015,.145,.136),ring(.331,-.021,.151,.126),
    ring(.368,-.033,.111,.097),ring(.384,-.036,.042,.052)],hair);
  // Curved volumetric hair ribbons: embedded roots, broad midsections and
  // deliberately unequal tapered tips, instead of V3's straight wedges.
  const locks=[
    [[-.10,.304,-.055],[-.13,.312,.035],[-.143,.281,.081],[-.154,.262,.087],.036],
    [[-.07,.326,-.026],[-.091,.35,.052],[-.116,.302,.119],[-.149,.255,.133],.048],
    [[-.025,.338,-.022],[-.044,.36,.056],[-.073,.306,.128],[-.111,.249,.148],.053],
    [[.035,.339,-.027],[.013,.367,.053],[-.024,.314,.13],[-.063,.251,.152],.050],
    [[.087,.324,-.037],[.069,.354,.034],[.041,.305,.119],[.012,.263,.144],.047],
    [[.125,.303,-.042],[.121,.328,.019],[.099,.291,.081],[.070,.266,.117],.035],
    [[-.055,.319,-.090],[-.072,.343,-.046],[-.110,.317,-.067],[-.132,.281,-.098],.043],
    [[.042,.322,-.092],[.062,.35,-.049],[.101,.318,-.074],[.126,.284,-.094],.040],
  ];
  for(const [a,b,c,d,w] of locks)limb(THREE,h,[[a,w*.82,w*.45],[b,w,w*.64],
    [c,w*.67,w*.46],[d,w*.08,w*.06]],(r,i)=>i===1||i===2?0x393638:hair,6);
  sweep(THREE,h,[[[-.12,.263,-.087],.025,.023],[[-.16,.248,-.104],.030,.024]],0xc5b694,6);
  h.polygon([[-.145,.251,-.10],[-.195,.184,-.123],[-.169,.192,-.09]],0xd7c8a7,[-.10,.22,-.08]);
}

export function coolieGeometry(THREE) {
  const m=facets(THREE);
  legs(THREE,m);organicCore(m);clothing(THREE,m);arms(THREE,m);head(THREE,m);
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
    [.02,1.61,-.025,.03,.98,1.16,1.12],
    [-.055,1.95,-.13,-.09,1.01,1.05,1.14],
    [.06,2.26,-.18,.12,.97,.90,1.06],
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
