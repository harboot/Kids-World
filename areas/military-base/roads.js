import { SURFACE_GAP } from '../../core/geometry.js';
import { fence, headquarters, helipad, lookout, motorPool } from './layout.js';
import { ink } from './scenery.js';

const apronY = SURFACE_GAP.detail;
const roadY = apronY + SURFACE_GAP.trim;
const paintY = roadY + SURFACE_GAP.detail;

const roadEdge = [
  [-64, -54], [59, -54], [65, -46], [65, 39], [56, 50],
  [13, 52], [5, 56], [5, fence.approach], [-5, fence.approach], [-5, 56],
  [-13, 52], [-59, 52], [-65, 45],
];

// The aprons form a single paved compound, with the dark road weaving around them.
const islands = [
  [[-56, -47], [-25, -48], [-14, -41], [-15, -29], [-26, -25], [-55, -26], [-58, -32]],
  [[-8, -47], [17, -49], [55.5, -49], [58, -45], [57, -24], [47, -17], [16, -17], [-1, -22], [-9, -33]],
  [[-57, -15], [-36, -17], [-31, -3], [-32, 15], [-30, 29], [-34, 44], [-54, 45], [-58, 40]],
  [[-27, -13.5], [-5.9, -16.4], [2.75, -7.3], [4.45, 10.6], [-1.9, 18.15], [-22.7, 17.5], [-28.1, 11.3]],
  [[13, -12], [43, -13], [55, -16], [58, -8], [57, 14], [49, 18], [16, 16], [11, 10]],
  [[-23, 26], [-12, 24], [2, 29], [2, 44], [-3, 47], [-24, 45], [-27, 39]],
  [[15, 25], [30, 24], [53, 23], [56, 28], [53, 46], [15, 46], [11, 41]],
];

export function stripe(kit, node, x, z, w, d, tint = ink.white, yaw = 0, y = paintY) {
  kit.box(node, tint, x, y - .003, z, w, .006, d, [0, yaw, 0]);
}

export function hazard(kit, node, x, z, width, depth, y = roadY + SURFACE_GAP.trim) {
  stripe(kit, node, x, z, width, depth, ink.dark, 0, y);
  for (let t = -width / 2 + .32; t < width / 2 - .18; t += .47) {
    stripe(kit, node, x + t, z, .20, depth * 1.05, ink.yellow, .52, y + SURFACE_GAP.detail);
  }
}

function outline(path, points, radius) {
  const edge = ([x, z], [ax, az]) => {
    const fraction = Math.min(.43, radius / Math.hypot(ax - x, az - z));
    return [x + (ax - x) * fraction, z + (az - z) * fraction];
  };
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    const [ax, az] = edge(points[i], points[(i + points.length - 1) % points.length]);
    const [bx, bz] = edge(points[i], points[(i + 1) % points.length]);
    if (i === 0) path.moveTo(ax, -az);
    else path.lineTo(ax, -az);
    path.quadraticCurveTo(x, -z, bx, -bz);
  }
  path.closePath();
  return path;
}

function plan(THREE, points, holes, radius) {
  const shape = outline(new THREE.Shape(), points, radius);
  for (const hole of holes) shape.holes.push(outline(new THREE.Path(), hole, radius));
  return shape;
}

function paving(kit, name, shapes, tint, y) {
  const { THREE, scene } = kit;
  const geometry = new THREE.ShapeGeometry(shapes, 5);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: tint }));
  mesh.name = name;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function lane(kit, root, points, offset = 1.6) {
  for (let i = 1; i < points.length; i++) {
    const [x, z] = points[i - 1];
    const [endX, endZ] = points[i];
    const length = Math.hypot(endX - x, endZ - z);
    const yaw = Math.atan2(endX - x, endZ - z);
    for (let distance = offset; distance < length - 1.1; distance += 4.8) {
      const t = distance / length;
      stripe(kit, root, x + (endX - x) * t, z + (endZ - z) * t, .145, 2, 0xc0cbcb, yaw);
    }
  }
}

function pad(kit) {
  const { group, part, box } = kit;
  const { x, z, radius } = helipad;
  const landing = group('Helipad H', x, 0, z);
  const flat = [-Math.PI / 2, 0, 0];
  for (const [r, y, tint] of [
    [radius, .039, ink.dark],
    [radius - .30, .052, ink.yellow],
    [radius - .68, .064, 0x417975],
  ]) part(landing, 'disk', tint, 0, y, 0, r, r, 1, flat);
  for (const side of [-1, 1]) {
    stripe(kit, landing, side * 2.05, 0, .76, 6.74, ink.white, 0, .082);
    stripe(kit, landing, 0, side * 7.8, 2.76, .23, ink.yellow, 0, .082);
  }
  stripe(kit, landing, 0, 0, 3.34, .78, ink.white, 0, .082);
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5;
    const cx = Math.cos(angle) * (radius + .61);
    const cz = Math.sin(angle) * (radius + .61);
    box(landing, ink.dark, cx, .11, cz, .33, .22, .33);
    box(landing, 0xffdf78, cx, .245, cz, .17, .075, .17, [], true);
  }
}

export function buildRoads(kit) {
  const { THREE, group, box, groundShadow, solid } = kit;
  const pavement = [[-68.5, -61.5], [68.5, -61.5], [68.5, 59.8], [7, 59.8],
    [7, fence.approach], [-7, fence.approach], [-7, 59.8], [-68.5, 59.8]];
  paving(kit, 'Ivory compound apron', plan(THREE, pavement, [], 1.8), 0xe1d2b3, apronY);
  paving(kit, 'Road network around the district islands', plan(THREE, roadEdge, islands, 3.15), ink.asphalt, roadY);
  const curbs = islands.map(island => {
    const cx = island.reduce((sum, [x]) => sum + x, 0) / island.length;
    const cz = island.reduce((sum, [, z]) => sum + z, 0) / island.length;
    const inset = island.map(([x, z]) => [cx + (x - cx) * .955, cz + (z - cz) * .955]);
    return plan(THREE, island, [inset], 3.15);
  });
  paving(kit, 'District curbs', curbs, 0xf4e8ce, paintY);

  const road = group('Street markings');
  for (const points of [
    [[0, 70], [0, 56], [5, 48], [7, 40], [6, 30], [9, 23], [9, 14], [8, 3], [7, -9], [5, -16]],
    [[-60, -21], [-48, -22], [-35, -21], [-26, -21], [-17, -20], [-6, -17], [7, -17]],
    [[-57, 48], [-32, 48], [-9, 50], [3, 50]],
    [[14, 49], [30, 48], [52, 48], [61, 41], [61, 17], [62, -5], [61, -28], [62, -43]],
    [[-60, 41], [-61, 21], [-61, -6], [-61, -24], [-62, -44]],
    [[-52, -51], [-30, -52], [-11, -52], [12, -52], [34, -52], [52, -52]],
    [[-27, 23], [-11, 21.1], [3, 21.5]], [[14, 21], [37, 20.7], [55, 19.3]],
  ]) lane(kit, road, points);

  const plaza = group('Headquarters courtyard markings', headquarters.x, 0, headquarters.z, headquarters.yaw);
  for (const side of [-1, 1]) {
    hazard(kit, plaza, side * 7.05, 14.2, 5.7, .52);
    const wing = group('Courtyard side marking', side * 11.05, 0, 5.6, Math.PI / 2, plaza);
    hazard(kit, wing, 0, 0, 8.2, .43);
    for (let i = 0; i < 3; i++) {
      const x = side * (5.4 + i * 1.85);
      box(plaza, ink.dark, x, .33, 14.25, .22, .66, .21);
      box(plaza, ink.yellow, x, .54, 14.25, .235, .17, .227);
      solid(plaza, x, 14.25, .24, .24, .66);
      groundShadow(plaza, x + .095, 14.05, .58, .75, .083);
    }
  }
  for (let i = 0; i < 6; i++) {
    stripe(kit, road, 5.45 + i * .91, 17.4, .56, 1.75);
    stripe(kit, road, 5.05 + i * .91, 28.7, .56, 1.75);
  }

  for (const [x, z, w, d, count] of [
    [motorPool.x - 15.15, motorPool.z + 13.1, 7.25, 7.15, 4],
    [25, 9.8, 5.2, 5.7, 3], [-55.7, -27.3, 10.9, 3.5, 3], [-19.8, 39, 4.1, 6.4, 2],
  ]) {
    for (let i = 0; i <= count; i++) stripe(kit, road, x + i * w, z - .04, .15, d - .08);
    stripe(kit, road, x + count * w / 2, z + d / 2, count * w, .16);
  }
  for (const [x, z] of [[-58, -21], [-59, 21], [62, 5], [0, 56], [12, 15.15], [53, 44]]) {
    box(road, ink.dark, x, paintY - .004, z, .64, .008, 1.05);
    for (let i = -2; i <= 2; i++) stripe(kit, road, x, z + i * .145, .54, .05, ink.steel, 0, paintY + SURFACE_GAP.detail);
  }
  stripe(kit, road, 60.3, lookout.rampEnd + .59, 5.7, .9, 0xbdb79f, 0, .026);
  pad(kit);
}


// Use the actual rounded road mesh, not approximate lane coordinates.
// A pole must sit entirely outside the asphalt and remain on the paved apron.
export function createRoadsidePlacement(kit) {
  const { THREE, scene, obstacles } = kit;
  const road = scene.getObjectByName('Road network around the district islands');
  const apron = scene.getObjectByName('Ivory compound apron');
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(0,-1,0), origin = new THREE.Vector3();
  function hits(mesh,x,z) {
    origin.set(x,12,z); ray.set(origin,direction);
    return Boolean(mesh && ray.intersectObject(mesh,false).length);
  }
  function clear(x,z) {
    for (const [u,v] of [[0,0],[.65,0],[-.65,0],[0,.65],[0,-.65],[.46,.46],[.46,-.46],[-.46,.46],[-.46,-.46]]) {
      if (hits(road,x+u,z+v) || !hits(apron,x+u,z+v)) return false;
    }
    return !obstacles.some(o=>{
      if (o.height <= .18) return false;
      const p=o.footprint;
      if (!p) return x>=o.left-.85 && x<=o.right+.85 && z>=o.front-.85 && z<=o.back+.85;
      const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
      return Math.abs(dx*c-dz*s)<p.width/2+.85 && Math.abs(dx*s+dz*c)<p.depth/2+.85;
    });
  }
  return function place(x,z,maxShift=6) {
    if(clear(x,z))return {x,z};
    for(let radius=.5;radius<=maxShift;radius+=.5)for(let i=0;i<24;i++){
      const angle=i*Math.PI/12;
      const px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
      if(clear(px,pz))return {x:px,z:pz};
    }
    return null;
  };
}
