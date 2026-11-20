import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';

function extrude(THREE, shape, thickness) {
  return new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: thickness });
}

function starShape(THREE) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? .46 : 1;
    const angle = Math.PI / 2 + i * Math.PI / 5;
    points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return extrude(THREE, new THREE.Shape(points), .13);
}

function crescentShape(THREE) {
  const moon = new THREE.Shape();
  moon.moveTo(.55, 1.09);
  moon.bezierCurveTo(-.60, 1.42, -1.34, .42, -1.05, -.50);
  moon.bezierCurveTo(-.73, -1.50, .57, -1.66, 1.12, -.56);
  moon.bezierCurveTo(.32, -.81, -.24, -.27, -.17, .30);
  moon.bezierCurveTo(-.13, .70, .19, .95, .55, 1.09);
  return extrude(THREE, moon, .20);
}

function featherGeometry(THREE) {
  const rows = [
    [0, .22, 0], [.35, .50, .12], [.70, .40, .10], [.94, .16, .052], [1, 0, 0],
  ];
  const positions = [];
  const point = ([z, width, height], side) => [side * width, side ? 0 : height, z];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    for (const side of [-1, 1]) {
      const corners = [point(a, 0), point(a, side), point(b, side), point(b, 0)];
      for (const index of [0, 1, 2, 0, 2, 3]) positions.push(...corners[index]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildHangingDecor({ THREE, parent, parts, colors, ceiling }) {
  const { part, beam, batch, matte } = parts;
  const { ivory, cream, gold, plum } = colors;
  const cable = matte(0x93809b);
  const ink = matte(0x3f354d);
  const pearl = matte(0xffecd5, { side: THREE.DoubleSide });
  const apricot = matte(0xe7ab7b, { side: THREE.DoubleSide });
  const coral = matte(0xcf7d84, { side: THREE.DoubleSide });
  const sky = matte(0xc9dcf4);
  const mist = matte(0xe5d9ee);
  const lunar = matte(0xffdd9f, { emissive: 0xc98b58, emissiveIntensity: .20 });
  const lantern = matte(0xf5a36d, { emissive: 0xc76047, emissiveIntensity: .23 });
  const blueLantern = matte(0x90b5cf, { emissive: 0x5588b3, emissiveIntensity: .22 });
  const star = starShape(THREE);
  const moon = crescentShape(THREE);
  const feather = featherGeometry(THREE);
  const root = addGroup(THREE, parent, 'Princess Gallery hanging decorations');

  function display(name, x, y, z, yaw, build, scale = 1) {
    const target = addGroup(THREE, root, name, x, y, z, yaw);
    target.scale.setScalar(scale);
    const model = new THREE.Group();
    const roof = (ceiling - y - .07) / scale;
    function suspend(x, start, z) {
      beam(model, cable, [x, start, z], [x, roof, z], .035);
      part(model, 'drum', plum, x, roof, z, .105, .13, .105);
    }
    build(model, suspend);
    model.traverse(object => { if (object.isMesh) object.layers.set(PLAYER_ONLY_LAYER); });
    batch(model, target);
  }

  function plume(group, material, a, b, width) {
    const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const vane = part(group, feather, material, ...a, width, width * .68, direction.length());
    vane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  }

  function bird(group, suspend) {
    part(group, 'sphere', cream, 0, .012, -.25, .63, .46, 1.44);
    part(group, 'sphere', ivory, 0, -.19, .10, .44, .31, .92);
    part(group, 'sphere', ivory, 0, .43, .73, .34, .53, .47).rotation.x = -.48;
    part(group, 'sphere', cream, 0, .75, 1.13, .31, .32, .39);
    part(group, 'cone', gold, 0, .64, 1.60, .136, .49, .14).rotation.x = Math.PI / 2;

    for (const side of [-1, 1]) {
      part(group, 'sphere', ink, side * .255, .775, 1.275, .059, .074, .055);
      part(group, 'sphere', pearl, side * .276, .805, 1.304, .027, .029, .024);
      const flight = addGroup(THREE, group, 'Bird wing', side * .31, .286, .012);
      part(flight, 'sphere', ivory, side * 1.10, .27, .044, 1.34, .24, .47).rotation.z = side * .11;
      plume(flight, pearl, [0, .09, .26], [side * 4.76, .26, -.93], 1.22);
      plume(flight, apricot, [side * 1.36, .17, .14], [side * 4.05, .23, -.24], .93);
      for (let i = 0; i < 7; i++) {
        const x = .57 + i * .35;
        const length = 1.81 + i * .22;
        const material = [pearl, apricot, pearl, apricot, pearl, coral, apricot][i];
        plume(flight, material, [side * x, .13, .01 - i * .022],
          [side * (x + length), .045 + i * .016, -.89 - (6 - i) * .17], .37 + i * .045);
      }
      for (let i = 0; i < 5; i++) {
        const x = .40 + i * .351;
        plume(flight, pearl, [side * x, .24, .08],
          [side * (x + .83), .19, -.68], .34);
      }
      plume(group, apricot, [side * .13, -.02, -.95], [side * .74, -.14, -2.33], .51);
      suspend(side * 1.29, .67, .02);
    }
    plume(group, coral, [0, .022, -1.07], [0, -.09, -2.49], .58);
  }

  display('Grand hanging crane', 5.15, 11.4, 21.1, -.20, bird);
  display('Adventure hanging bird', 22.5, 12.7, -10.6, -1.21, bird, .58);

  display('Festival hot-air balloon', 14.05, 13.42, 24.5, .31, (group, suspend) => {
    const cloth = [matte(0xb9727f), matte(0xe7bd81), matte(0x8facb4), matte(0xb3a0c3)];
    const basket = matte(0xa57857);
    for (let i = 0; i < 12; i++) {
      const gore = new THREE.SphereGeometry(1, 6, 14, i * Math.PI / 6, Math.PI / 6, 0, Math.PI * .87);
      part(group, gore, cloth[i % cloth.length], 0, .75, 0, 2.28, 2.57, 2.28);
    }
    part(group, 'drum', plum, 0, -1.61, 0, .95, .24, .95);
    part(group, 'drum', gold, 0, -1.765, 0, .82, .092, .82);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      beam(group, cable, [x * .66, -1.61, z * .66], [x * .59, -3.03, z * .40], .040);
      beam(group, gold, [x * .57, -3.11, z * .38], [x * .62, -3.66, z * .42], .082);
    }
    part(group, 'box', basket, 0, -3.398, 0, 1.18, .56, .82);
    part(group, 'box', cream, 0, -3.103, 0, 1.28, .095, .92);
    part(group, 'box', plum, 0, -3.585, 0, 1.233, .129, .857);
    for (const x of [-.41, -.198, .015, .228, .44]) {
      part(group, 'box', gold, x, -3.32, .42, .049, .403, .036);
    }
    part(group, star, lunar, 0, -3.28, .477, .129, .14, .48);
    for (const x of [-.66, .66]) suspend(x, 3.16, 0);
  });

  function cloud(group, suspend) {
    const puffs = [
      [-2.00, -.09, -.04, 1.02, .62, .74], [-.91, .22, -.10, 1.23, .85, 1.03],
      [.35, .42, -.04, 1.40, 1.00, .98], [1.59, .17, -.10, 1.14, .75, .85],
      [2.30, -.09, .19, .81, .56, .65], [-.70, -.18, .52, 1.27, .54, .74],
      [.79, -.23, .50, 1.39, .51, .70],
    ];
    for (const [i, [x, y, z, sx, sy, sz]] of puffs.entries()) {
      part(group, 'sphere', i % 3 ? sky : mist, x, y, z, sx, sy, sz);
    }
    for (const x of [-.92, 1.19]) suspend(x, .76, -.01);
    for (const [i, x, y, z] of [[0, -1.46, -1.33, .20], [1, .09, -1.78, .48], [2, 1.54, -1.22, .20]]) {
      beam(group, cable, [x, -.43, z], [x, y, z], .025);
      part(group, star, i % 2 ? lunar : gold, x, y, z, .25, .25, .59).rotation.y = i * .64;
    }
  }

  display('Woodland hanging cloud', -24.3, 12.93, -4.8, -.13, cloud);
  display('Adventure hanging cloud', 22.9, 12.8, 17.75, .31, cloud, .88);
  display('Lobby hanging cloud', -8.8, 14.15, 46.2, -.23, cloud, .77);
  display('Royal crescent and star mobile', -13.4, 12.76, -21.4, -.12, (group, suspend) => {
    part(group, moon, lunar, 0, 0, 0, 1.34, 1.34, 1.43).rotation.z = -.14;
    suspend(-.88, 1.16, .09);
    for (const [i, x, y, z, size] of [
      [0, -3.18, -.62, -.18, .53], [1, -2.03, .91, .22, .40], [2, 1.68, .38, .08, .48],
      [3, 2.92, -.34, .12, .46], [4, .63, -2.12, .10, .29],
    ]) {
      part(group, star, i % 2 ? lunar : gold, x, y, z, size, size, .87).rotation.z = i * .29;
      if (i === 4) beam(group, cable, [x, -.95, z], [x, y + size * .68, z], .032);
      else suspend(x, y + size * .70, z);
    }
  });
  display('Woodland hanging lanterns', -21.2, 11.9, 17.8, .28, (group, suspend) => {
    for (const [i, x, y, z, radius] of [
      [0, -2.16, .32, -.02, .57], [1, -.23, 1.32, -.38, .65], [2, 1.58, -.32, .16, .50],
    ]) {
      part(group, 'sphere', i % 2 ? blueLantern : lantern, x, y, z, radius, radius * 1.12, radius);
      for (const off of [-1, 1]) {
        part(group, 'drum', gold, x, y + off * radius, z, radius * .43, .13, radius * .43);
      }
      suspend(x, y + radius * 1.10, z);
      beam(group, gold, [x, y - radius, z], [x, y - radius - .43, z], .034);
      part(group, 'gem', plum, x, y - radius - .40, z, .099, .141, .099);
    }
  });
}
