import { SURFACE_GAP } from '../../core/geometry.js';
import { BALL_RADIUS, BREAK_DURATION, CHOPS, SNOWMAN_COUNT, SNOWMAN_SPHERES } from './activity.js';

export function addAxe(THREE, scene, viewmodel, kit, site) {
  const { box, mesh, material } = kit;
  const axe = new THREE.Group();
  axe.name = 'Snow Basin axe';
  const ash = material(0xb47b46);
  const grip = material(0x80573f);
  const iron = material(0x828c9c);
  const blade = material(0xcbdbe2);
  const part = (shape, color, x, y, z, sx, sy, sz) => mesh(shape, color, x, y, z, sx, sy, sz, false, axe);
  part(box, ash, 0, -0.07, 0, 0.105, 0.96, 0.105);
  part(box, grip, 0, -0.41, 0, 0.125, 0.24, 0.12);
  part(box, iron, 0, 0.33, 0, 0.18, 0.22, 0.15);

  const edge = new THREE.Shape().moveTo(0.03, 0.24).lineTo(0.41, 0.134)
    .lineTo(0.48, 0.48).lineTo(0.15, 0.43).lineTo(0.03, 0.38).closePath();
  const head = new THREE.ExtrudeGeometry(edge, { depth: 0.11, bevelEnabled: false });
  part(head, iron, 0, 0, -0.055, 1, 1, 1);
  part(box, blade, 0.45, 0.308, 0, 0.045, 0.33, 0.11 + 2 * SURFACE_GAP.detail).rotation.z = -0.20;

  const holder = new THREE.Group();
  holder.name = 'Held axe';
  holder.position.set(0.28, -0.37, -0.88);
  const carried = axe.clone(true);
  carried.rotation.set(0, Math.PI, 0.25);
  carried.scale.setScalar(0.54);
  holder.add(carried);
  viewmodel.add(holder);
  axe.position.set(site.x, 0.17, site.z);
  axe.rotation.set(-Math.PI / 2, 0, -0.62);
  scene.add(axe);

  const ringGeometry = new THREE.RingGeometry(0.48, 0.56, 24).rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xf4c979 }));
  ring.position.set(site.x, 0.018, site.z);
  scene.add(ring);
  return { axe, ring, holder };
}

export function addChopTree(THREE, scene, kit, site) {
  const { cone, mesh, material } = kit;
  const tree = new THREE.Group();
  tree.name = 'Marked pine';
  tree.position.set(site.x, 0, site.z);
  scene.add(tree);

  const needles = material(0x366568);
  const frost = material(0xdff3fb);
  const trunk = makeCuttableTrunk(THREE);
  const part = (shape, color, x, y, z, sx, sy, sz) => mesh(shape, color, x, y, z, sx, sy, sz, false, tree);
  const trunkMesh = part(trunk.geometry, new THREE.MeshLambertMaterial({ vertexColors: true }), 0, 2.67, 0, 1, 1, 1);
  trunkMesh.name = 'Marked trunk';
  for (const [height, radius, center] of [[2.65, 2.05, 3.57], [2.53, 1.69, 5.00], [2.27, 1.29, 6.60]]) {
    part(cone, needles, 0, center, 0, radius, height, radius).rotation.y = 0.29;
    part(cone, frost, 0, center + 0.35, 0, radius * 0.83, height * 0.87, radius * 0.83).rotation.y = 0.29;
  }

  // A ground shadow shares the tree's animation without invalidating the static shadow map.
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x799eac, transparent: true, opacity: 0.38, depthWrite: false }));
  shadow.position.set(site.x, 0.02, site.z);
  scene.add(shadow);
  return { tree, setChops: trunk.setChops, shadow };
}

function makeCuttableTrunk(THREE) {
  const height = 5.34;
  const bottomRadius = 0.61;
  const topRadius = 0.29;
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 12, 44);
  const positions = geometry.getAttribute('position');
  const original = positions.array.slice();
  const colors = new THREE.Float32BufferAttribute(new Float32Array(original.length), 3);
  const bark = new THREE.Color(0x84614e);
  const wood = new THREE.Color(0xdab17c);
  positions.setUsage(THREE.DynamicDrawUsage);
  colors.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('color', colors);
  let previousChops;

  function setChops(chops) {
    if (chops === previousChops) return;
    previousChops = chops;
    // Move the marked face inwards into a wedge, keeping the same closed trunk mesh.
    const depth = 0.055 + 0.49 * (chops / CHOPS);
    for (let i = 0; i < positions.count; i++) {
      const x = original[i * 3];
      const y = original[i * 3 + 1] + height / 2;
      const radius = bottomRadius + (topRadius - bottomRadius) * (y / height);
      const wedge = Math.max(0, 1 - Math.abs(y - 0.85) / 0.29);
      const face = Math.max(x, -radius + depth * wedge);
      positions.setX(i, wedge > 0 ? face : x);
      const color = wedge > 0 && face > x + 0.002 ? wood : bark;
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  setChops(0);
  return { geometry, setChops };
}

export function addSnowPlay(THREE, scene, viewmodel, kit, piles) {
  const { box, cone, mesh, material, block } = kit;
  const snow = material(0xeaf8ff);
  const powder = material(0xd9effa);
  const twigs = material(0x85634e);
  const eyes = material(0x293e52);
  const carrot = material(0xf59446);
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const colors = [0xd67876, 0x369d98, 0xb885ce];
  for (const { x, z } of piles) {
    mesh(sphere, powder, x, 0.14, z, 0.98, 0.34, 0.73);
    mesh(sphere, snow, x + 0.48, 0.20, z - 0.11, 0.49, 0.31, 0.50);
    mesh(sphere, snow, x - 0.32, 0.32, z + 0.15, 0.62, 0.38, 0.52);
    block(x, z, 1.35, 0.93, 0.41);
  }

  const scarfRing = new THREE.CylinderGeometry(1, 1, 1, 10);
  const models = Array.from({ length: SNOWMAN_COUNT }, (_, i) => {
    const group = new THREE.Group();
    group.name = `Snowman ${i + 1}`;
    const body = new THREE.Group();
    group.add(body);
    scene.add(group);
    const scarf = material(colors[i]);
    const part = (geometry, paint, x, y, z, sx, sy, sz) =>
      mesh(geometry, paint, x, y, z, sx, sy, sz, false, body);
    const fragments = SNOWMAN_SPHERES.map(({ y, radius }) => {
      part(sphere, snow, 0, y, 0, radius, radius, radius);
      return mesh(sphere, powder, 0, y, 0, radius, radius, radius, false, group);
    });

    part(scarfRing, scarf, 0, 1.43, 0, 0.31, 0.12, 0.31);
    part(box, scarf, 0.19, 1.23, 0.29, 0.115, 0.36, 0.05).rotation.z = 0.15;
    for (const side of [-1, 1]) {
      part(sphere, eyes, 0.104 * side, 1.755, 0.252, 0.042, 0.04, 0.04);
      part(box, twigs, 0.50 * side, 1.2, 0, 0.055, 0.47, 0.055).rotation.z = -side * 1.05;
      part(box, twigs, 0.66 * side, 1.35, 0, 0.044, 0.18, 0.048).rotation.z = -side * 0.4;
    }
    part(cone, carrot, 0, 1.659, 0.346, 0.075, 0.25, 0.075).rotation.x = Math.PI / 2;
    for (const y of [0.98, 1.15, 1.30]) part(sphere, eyes, 0, y, 0.347, 0.04, 0.04, 0.045);
    return { group, body, fragments };
  });

  const held = mesh(sphere, snow, 0.32, -0.33, -0.74, 0.137, 0.137, 0.137, false, viewmodel);
  held.name = 'Held snowball';
  const balls = Array.from({ length: 3 }, (_, i) => {
    const ball = mesh(sphere, snow, 0, 0, 0, BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    ball.name = `Snowball in flight ${i + 1}`;
    return ball;
  });
  const puff = Array.from({ length: 8 }, () => mesh(sphere, powder, 0, 0, 0, 0.23, 0.23, 0.23));
  return { models, held, balls, puff };
}

export function showSnowmen(models, targets) {
  for (let i = 0; i < models.length; i++) {
    const { group, body, fragments } = models[i];
    const target = targets[i];
    group.visible = Boolean(target && (target.intact || target.breakTime < BREAK_DURATION));
    if (!group.visible) continue;
    body.visible = target.intact;
    for (let part = 0; part < fragments.length; part++) {
      const mesh = fragments[part];
      mesh.visible = !target.intact;
      if (!mesh.visible) continue;
      const elapsed = target.breakTime;
      const { y, radius } = SNOWMAN_SPHERES[part];
      mesh.position.set((part - 1) * elapsed * 1.8, Math.max(0.13, y + elapsed * (part + 0.3) - 5.9 * elapsed ** 2),
        Math.sin(i + part * 1.6) * elapsed * 1.6);
      mesh.rotation.set(elapsed * (part + 1), elapsed * (i + 1), elapsed * (part - 1) * 3);
      mesh.scale.setScalar(radius * (1 - elapsed / BREAK_DURATION * 0.88));
    }
  }
}

export function addFrozenKey(THREE, scene, kit, site) {
  const { box, mesh } = kit;
  const model = new THREE.Group();
  model.name = 'Frozen Key';
  model.position.set(site.x, 0, site.z);
  scene.add(model);

  const gold = new THREE.MeshLambertMaterial({ color: 0xf8c673, emissive: 0x4c3111 });
  const ice = new THREE.MeshLambertMaterial({ color: 0x9fe9f9, emissive: 0x296075 });
  const key = new THREE.Group();
  model.add(key);
  const bow = new THREE.TorusGeometry(0.225, 0.069, 6, 14);
  mesh(bow, ice, -0.32, 0.055, 0, 1, 1, 1, false, key);
  const shaftDepth = 0.124;
  const toothDepth = shaftDepth + 2 * SURFACE_GAP.detail;
  mesh(box, gold, 0.219, 0.039, 0, 0.64, 0.126, shaftDepth, false, key);
  mesh(box, ice, -0.038, 0.038, 0, 0.14, 0.179, 0.147, false, key);
  mesh(box, gold, 0.295, -0.083, 0, 0.122, 0.173, toothDepth, false, key);
  mesh(box, gold, 0.49, -0.116, 0, 0.123, 0.238, toothDepth, false, key);

  const light = new THREE.MeshBasicMaterial({ color: 0xc2f5ff, toneMapped: false });
  const ring = new THREE.RingGeometry(0.48, 0.54, 20).rotateX(-Math.PI / 2);
  mesh(ring, light, 0, 0.022, 0, 1, 1, 1, false, model);
  const shard = new THREE.OctahedronGeometry(1);
  const glints = [-1, 0, 1].map(() => mesh(shard, light, 0, 0, 0, 1, 1, 1, false, key));

  return {
    model,
    pose(time) {
      key.position.y = 0.59 + 0.07 * Math.sin(time * 2.5);
      key.rotation.y = -0.94 + 0.32 * Math.sin(time * 1.5);
      glints.forEach((star, i) => {
        const phase = time * 3.4 + i * 2.1;
        star.position.set(-0.47 + i * 0.46, 0.31 + 0.11 * Math.sin(phase), 0.08 + i * 0.045);
        const size = 0.055 + 0.023 * Math.cos(phase);
        star.scale.set(size * 0.56, size, size * 0.56);
      });
    },
  };
}

export function addIceSculpture(THREE, scene, kit, { x, z }) {
  const { mesh, material, obstacles } = kit;
  const sculpture = new THREE.Group();
  sculpture.name = 'Glacial crystal sculpture';
  sculpture.position.set(x, 0, z);
  scene.add(sculpture);

  const base = new THREE.CylinderGeometry(1, 1.08, 1, 10);
  const shard = new THREE.OctahedronGeometry(1);
  const ice = material(0x679fbd);
  const frost = material(0xc7ebf4);
  const pale = new THREE.MeshLambertMaterial({ color: 0xa4dbf0, emissive: 0x285064, emissiveIntensity: .33 });
  mesh(base, ice, 0, .22, 0, 1.34, .44, .94, true, sculpture);
  mesh(base, frost, 0, .49, 0, 1.17, .15, .81, true, sculpture);
  for (const [px, py, pz, width, height, lean] of [
    [0, 1.67, 0, .48, 1.20, .10], [-.64, 1.17, -.14, .29, .67, -.32],
    [.61, 1.25, -.19, .31, .74, .30], [.35, .87, -.53, .20, .43, .46],
  ]) {
    const crystal = mesh(shard, pale, px, py, pz, width, height, width * .85, true, sculpture);
    crystal.rotation.z = lean;
    crystal.rotation.y = px * 1.3;
  }
  obstacles.push({ left: x - 1.40, right: x + 1.40, front: z - .97, back: z + .97, height: 2.83 });
}
