const centerZ = 1.4;
const switchSite = { x: 0, z: centerZ + 3.03 };
const blues = [0xc9f1ed, 0x81d0d8, 0xf0faf6];

export function buildFountain(THREE, kit, mark, isActive) {
  const { group, part, box, solid, beam } = kit;
  const fountain = group('Village fountain', 0, 0, centerZ);
  part(fountain, 'drum', 0x8a7d70, 0, 0.19, 0, 2.83, 0.38, 2.83, { shadow: true });
  part(fountain, 'drum', 0xbba98e, 0, 0.48, 0, 2.69, 0.35, 2.69, { shadow: true });
  part(fountain, 'ring', 0xddc99d, 0, 0.72, 0, 2.56, 2.56, 1.66, { rotation: [-Math.PI / 2, 0, 0] });
  part(fountain, 'drum', 0x539a9c, 0, 0.669, 0, 2.40, 0.043, 2.40);
  part(fountain, 'drum', 0xa59580, 0, 1.25, 0, 0.42, 1.35, 0.42);
  part(fountain, 'bowl', 0xe3ca98, 0, 1.96, 0, 1.29, 0.36, 1.29);
  part(fountain, 'drum', 0x6aa9ad, 0, 2.16, 0, 1.22, 0.052, 1.22);
  part(fountain, 'drum', 0xb9a68b, 0, 2.45, 0, 0.24, 0.63, 0.24);
  part(fountain, 'bowl', 0xe2c99b, 0, 2.83, 0, 0.77, 0.25, 0.77);
  part(fountain, 'drum', 0x71b2b4, 0, 2.97, 0, 0.71, 0.04, 0.71);
  part(fountain, 'gem', 0xe0c17e, 0, 3.13, 0, 0.22, 0.25, 0.22);

  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    part(fountain, 'gem', 0xd5b883, 2.73 * x, 0.46, 2.73 * z, 0.12, 0.145, 0.12);
  }
  for (const [width, depth] of [[5.60, 2.2], [4.99, 3.45], [4.15, 4.3], [3.45, 4.99], [2.2, 5.60]]) {
    solid(fountain, width, depth, 1.54);
  }

  const control = group('Fountain control', 0, 0, centerZ + 2.69);
  box(control, 0x72543e, 0, 0.63, 0, 0.35, 0.36, 0.24);
  box(control, 0x678b77, 0, 0.65, 0.13, 0.27, 0.25, 0.053);
  const handle = group('Fountain valve', 0, 0.65, 0.17, 0, control);
  beam(handle, 0xdabc81, [-0.085, 0, 0], [0.085, 0, 0], 0.049, 0.058, { batch: handle });
  part(handle, 'gem', 0xdabc81, 0, 0, 0.035, 0.064, 0.063, 0.049, { batch: handle });
  mark('Fountain valve', { ...switchSite, z: switchSite.z + 0.36, width: 1.4, depth: 0.76 });

  const paths = [];
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI * 2 / 12;
    paths.push([angle, 1.19, 2.16, 2.31, 0.73, 0.39, 1.34]);
    if (i % 2 === 0) paths.push([angle + 0.24, 0.67, 2.98, 1.14, 2.19, 0.26, 1.03]);
  }
  for (let i = 0; i < 4; i++) paths.push([i * Math.PI / 2, 0.11, 3.14, 0.63, 3.00, 0.58, 1.05]);

  const perPath = 5;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5),
    new THREE.MeshBasicMaterial({ toneMapped: false }), paths.length * perPath);
  drops.name = 'Fountain droplets';
  drops.frustumCulled = false;
  fountain.add(drops);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < drops.count; i++) drops.setColorAt(i, color.setHex(blues[i % blues.length]));
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  let flowing = true;
  let lastPose;

  function pose(elapsed, still) {
    drops.visible = flowing;
    handle.rotation.z = flowing ? 0 : Math.PI / 2;
    const time = still ? 0 : elapsed;
    if (!flowing || time === lastPose) return;
    lastPose = time;
    paths.forEach(([angle, near, start, far, end, arc, duration], i) => {
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      for (let drop = 0; drop < perPath; drop++) {
        const t = (time / duration + drop / perPath + i * 0.13) % 1;
        const radius = near + (far - near) * t;
        const size = 0.041 + (1 - t) * 0.02;
        transform.position.set(x * radius, start + (end - start) * t + Math.sin(Math.PI * t) * arc, z * radius);
        transform.scale.set(size, size * 1.53, size);
        transform.updateMatrix();
        drops.setMatrixAt(i * perPath + drop, transform.matrix);
      }
    });
    drops.instanceMatrix.needsUpdate = true;
  }

  return {
    interaction: {
      ...switchSite, anchorY: 0.84, radius: 1.86,
      reachable: player => player.y < 3.2 && player.z > centerZ + 2.3,
      get label() { return flowing ? 'Turn Fountain Off' : 'Turn Fountain On'; },
      get active() { return isActive(); },
      act() {
        if (!this.active) return;
        flowing = !flowing;
        drops.visible = flowing;
        handle.rotation.z = flowing ? 0 : Math.PI / 2;
      },
    },
    reset() {
      flowing = true;
      pose(0, true);
    },
    update(elapsed, still) { pose(elapsed, still); },
  };
}
