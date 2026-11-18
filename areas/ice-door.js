export function addIceDoor(THREE, scene, obstacles, passage) {
  const door = new THREE.Group();
  door.position.set(passage.x, 0, passage.z);
  const frame = new THREE.MeshLambertMaterial({ color: 0x589dbb });
  const panel = new THREE.MeshLambertMaterial({ color: 0x96d7e8, emissive: 0x17404d });
  const trim = new THREE.MeshBasicMaterial({ color: 0xe2faff });
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  function part(x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.receiveShadow = true;
    door.add(mesh);
  }

  part(0, 1.38, 0, 1.75, 2.76, 0.15, panel);
  part(0, 2.91, 0.01, 2.37, 0.3, 0.34, frame);
  part(0, 2.92, 0.19, 0.98, 0.1, 0.04, trim);
  part(0, 0.06, 0.15, 2.36, 0.12, 0.51, frame);
  for (const side of [-1, 1]) {
    part(side * 0.99, 1.45, 0, 0.26, 2.9, 0.32, frame);
    part(side * 0.39, 1.37, 0.092, 0.035, 1.75, 0.035, trim);
  }
  const shard = new THREE.OctahedronGeometry(1);
  for (const [x, y, sx, sy] of [[-1.16, 2.64, .28, .88], [1.12, 2.49, .24, .72], [0, 1.36, .39, .62]]) {
    const crystal = new THREE.Mesh(shard, x ? frame : trim);
    crystal.position.set(x, y, 0.13);
    crystal.scale.set(sx, sy, 0.2);
    door.add(crystal);
  }
  scene.add(door);
  obstacles.push({
    left: passage.x - 1.19, right: passage.x + 1.19,
    front: passage.z - 0.16, back: passage.z + 0.24, height: 3.06,
  });
  return {
    x: passage.x, z: passage.z, label: passage.label,
    act({ travel, heardCue }) {
      travel(passage.destination, heardCue);
    },
  };
}
