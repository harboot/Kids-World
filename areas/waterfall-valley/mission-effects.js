import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';

export function createBursts(THREE, scene, touch) {
  const random = seededRandom(3515);
  const count = touch ? 22 : 34;
  const geometry = new THREE.OctahedronGeometry(1, 0);
  const material = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'Valley mission sparkles and fragments';
  mesh.layers.set(PLAYER_ONLY_LAYER);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const dummy = new THREE.Object3D();
  const particles = Array.from({ length: count }, () => ({ age: 1, life: 0 }));
  const tint = new THREE.Color();
  let head = 0, live = false;
  mesh.visible = false;
  return {
    emit(point, color, amount = 7) {
      live = true;
      tint.setHex(color);
      for (let i = 0; i < amount; i++) {
        const index = head++ % count;
        const p = particles[index];
        p.x = point.x; p.y = point.y; p.z = point.z;
        p.vx = (random() - 0.5) * 2.15;
        p.vy = 0.75 + random() * 1.55;
        p.vz = (random() - 0.5) * 2.15;
        p.age = 0; p.life = 0.34 + random() * 0.25;
        p.size = 0.027 + random() * 0.047;
        mesh.setColorAt(index, tint);
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt) {
      if(!live)return;
      let any = false;
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.age += dt;
        const { age } = p;
        if (age < p.life) {
          any = true;
          dummy.position.set(p.x+p.vx*age,p.y+p.vy*age-2.6*age*age,p.z+p.vz*age);
          dummy.rotation.set(age*9,age*15+i,age*7);
          dummy.scale.setScalar(p.size*(1-age/p.life));
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i,dummy.matrix);
      }
      live = mesh.visible = any;
      mesh.instanceMatrix.needsUpdate = any;
    },
    reset() {
      for (const p of particles) p.age = p.life;
      live = mesh.visible = false;
      head = 0;
    },
  };
}

export function checkpointBeam(THREE, scene, name, point, base, top, color, width) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(point.x,point.y,point.z);
  const height = Math.max(0.4,top-base);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(width*0.85,width,height,16,1,true),
    new THREE.MeshBasicMaterial({
      color, transparent:true, opacity:0.225, depthWrite:false, side:THREE.DoubleSide, toneMapped:false,
    }));
  outer.position.y=(base+top)/2-point.y;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(width*0.21,width*0.32,height,8,1,true),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.56,depthWrite:false,toneMapped:false}));
  core.position.y=outer.position.y;
  const ring = new THREE.Mesh(new THREE.RingGeometry(width*1.03,width*1.16,28).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.62,depthWrite:false,toneMapped:false}));
  ring.position.y=base-point.y;
  group.add(outer,core,ring);
  group.traverse(node=>node.layers.set(PLAYER_ONLY_LAYER));
  group.visible=false;
  scene.add(group);
  return group;
}
