import { tankTestCheckpoints } from './layout.js';

// Only one checkpoint is visible at a time. A decorative translucent beam and
// ground ring do not cast shadows, contribute real lights or block vehicles.
export function buildTankCourse(kit) {
  const { THREE, scene } = kit;
  const radius = 2.7;
  const marker = new THREE.Group();
  marker.name = 'Tank driving checkpoint';
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.48,.74,28,12,1,true),
    new THREE.MeshBasicMaterial({ color:0x8ceaff, transparent:true, opacity:.24, side:THREE.DoubleSide,
      depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false }));
  beam.name='Tank checkpoint sky beam'; beam.position.y=14.05;
  beam.raycast=()=>{};
  marker.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.075,.10,28,8,1,true),
    new THREE.MeshBasicMaterial({color:0xccfaff,transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));
  core.position.y=14.05;core.raycast=()=>{};marker.add(core);
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius-.17,radius,32),
    new THREE.MeshBasicMaterial({color:0x83f0ff,side:THREE.DoubleSide,toneMapped:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.105;ring.raycast=()=>{};marker.add(ring);
  scene.add(marker);
  function show(i) {
    const point=tankTestCheckpoints[i];marker.visible=Boolean(point);
    if(point)marker.position.set(point.x,0,point.z);
  }
  show(0);
  return {points:tankTestCheckpoints,radius,show};
}
