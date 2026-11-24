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

export function coolieGeometry(THREE) {
  const m = facets(THREE);
  const tube = (parts, paint, n) => sweep(THREE, m, parts, paint, n);
  // Bent knees and staggered feet support the load, with loose ochre shorts.
  for (const s of [-1, 1]) {
    const knee = [s*.24, .48, s === 1 ? .12 : .27];
    const ankle = [s*.29, .13, s === 1 ? -.16 : .33];
    tube([[[s*.115,.85,-.04],.15,.15],[[s*.19,.66,knee[2]*.6],.145,.13]], shorts, 8);
    tube([[[s*.19,.67,knee[2]*.6],.105,.10],[knee,.095,.10],
      [[s*.27,.33,(knee[2]+ankle[2])*.5],.095,.085],[ankle,.055,.06]], skin, 7);
    m.loft([ring(.045,ankle[2]+.07,.092,.16).map(p=>[p[0]+ankle[0],p[1],p[2]]),
      ring(.14,ankle[2]+.045,.084,.125).map(p=>[p[0]+ankle[0],p[1],p[2]])],shoes);
  }
  m.loft([ring(.76,-.04,.23,.14),ring(.95,.015,.225,.15),ring(1.19,.09,.285,.15),
    ring(1.39,.14,.30,.145),ring(1.46,.17,.17,.11)],
    (r,i)=>r>=3&&(i===0||i===7)?skin: i===3||i===4?0x4e533b:vest);
  // V opening and folded vest edges sit on the front plane, not coplanar with it.
  const face = (p,c) => m.polygon(p,c,[0,1.1,.06]);
  face([[-.105,1.43,.29],[0,1.13,.263],[.105,1.43,.29]],skin);
  for (const s of [-1,1]) {
    face([[s*.115,1.43,.301],[s*.14,1.4,.301],[s*.026,1.12,.276],[s*.005,1.12,.276]],0x858366);
    face([[s*.10,.93,.176],[s*.20,.87,.144],[s*.15,1.06,.213]],0x50563e);
    // Both elbows bend upward and hands grip the lower sack's corners.
    tube([[[s*.26,1.37,.15],.105,.108],[[s*.42,1.29,.19],.10,.095],
      [[s*.51,1.25,.26],.08,.08]],skin,7);
    tube([[[s*.51,1.25,.26],.08,.08],[[s*.57,1.43,.20],.085,.075],
      [[s*.57,1.56,.15],.052,.052]],skin,7);
    tube([[[s*.57,1.54,.15],.059,.052],[[s*.58,1.62,.12],.069,.062],
      [[s*.54,1.67,.08],.048,.044]],skin,6);
  }
  tube([[[0,1.40,.17],.082,.083],[[0,1.51,.23],.073,.075]],skin,7);
  m.loft([ring(1.47,.265,.085,.078),ring(1.53,.28,.12,.105),
    ring(1.61,.278,.137,.112,.038),ring(1.69,.26,.14,.12),ring(1.77,.235,.12,.11)],
    (r,i)=>i===2||i===5?shade:skin);
  // Angular nose, narrow eyes and brows: silhouette first, a few readable planes.
  m.polygon([[-.034,1.65,.391],[.034,1.65,.391],[0,1.594,.433]],skin,[0,1.62,.28]);
  m.polygon([[-.034,1.65,.391],[0,1.594,.433],[-.025,1.585,.392]],shade,[0,1.62,.28]);
  for (const s of [-1,1]) {
    m.polygon([[s*.027,1.655,.393],[s*.092,1.667,.378],[s*.086,1.647,.381],[s*.036,1.643,.398]],hair,[0,1.6,.25]);
    m.polygon([[s*.025,1.685,.391],[s*.095,1.700,.367],[s*.092,1.685,.381],[s*.03,1.671,.397]],hair,[0,1.6,.25]);
    tube([[[s*.134,1.62,.25],.032,.036],[[s*.151,1.66,.24],.032,.032]],skin,5);
  }
  m.polygon([[-.042,1.548,.376],[.043,1.548,.376],[.023,1.537,.379],[-.022,1.537,.379]],0x693d30,[0,1.55,.25]);
  m.loft([ring(1.706,.24,.145,.125),ring(1.74,.235,.149,.129)],0xd2c4a2);
  m.loft([ring(1.742,.235,.15,.13),ring(1.81,.215,.145,.125),ring(1.855,.205,.08,.087)],hair);
  // A few irregular dark hair planes avoid a smooth helmet silhouette.
  m.polygon([[-.105,1.79,.309],[-.065,1.848,.28],[.015,1.83,.328],[-.055,1.755,.367]],0x353938,[0,1.8,.2]);
  return m.finish();
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
    [0,1.56,-.105, .03,1.07,1.08,1.15],
    [-.03,1.89,-.22,-.05,1.12,1.05,1.20],
    [.06,2.21,-.25,.10,1.04,.96,1.18],
    [-.04,2.51,-.20,-.12,.99,.95,1.05],
    [.02,2.78,-.22,.07,.86,.83,.94],
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
      mesh.setColorAt(i,tint.setHex([0xc9b38e,0xe1cda8,0xbba17b,0xd7bf98][i%4]));
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
