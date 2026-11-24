const skin = 0xd99876;
const skinShadow = 0xb87963;
const hair = 0x303943;
const hairLight = 0x3b4754;
const cuff = 0xe4c6c4;

function facets(THREE) {
  const positions = [];
  const colors = [];
  const color = new THREE.Color();

  function polygon(points, paint) {
    color.setHex(paint);
    for (let i = 1; i < points.length - 1; i++) {
      positions.push(...points[0], ...points[i], ...points[i + 1]);
      for (let vertex = 0; vertex < 3; vertex++) colors.push(color.r, color.g, color.b);
    }
  }

  function loft(rings, paint, capped = true) {
    const colorAt = typeof paint === 'function' ? paint : () => paint;
    const width = rings[0].length;
    for (let row = 1; row < rings.length; row++) {
      for (let i = 0; i < width; i++) {
        const next = (i + 1) % width;
        const a = rings[row - 1][i];
        const b = rings[row - 1][next];
        const c = rings[row][next];
        const d = rings[row][i];
        polygon([a, d, c], colorAt(row, i));
        polygon([a, c, b], colorAt(row, i));
      }
    }
    if (capped) {
      polygon([...rings[0]].reverse(), colorAt(0, 0));
      polygon(rings.at(-1), colorAt(rings.length - 1, 0));
    }
  }

  return {
    polygon, loft,
    finish() {
      const mesh = new THREE.BufferGeometry();
      mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      mesh.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      mesh.computeVertexNormals();
      return mesh;
    },
  };
}

function sweep(THREE, mesh, sections, paint, segments = 6) {
  const from = new THREE.Vector3(...sections[0][0]);
  const to = new THREE.Vector3(...sections.at(-1)[0]);
  const axis = to.sub(from).normalize();
  const reference = Math.abs(axis.y) > .95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const across = new THREE.Vector3().crossVectors(reference, axis).normalize();
  const up = new THREE.Vector3().crossVectors(axis, across);

  const rings = sections.map(([center, width, depth]) => Array.from({ length: segments }, (_, i) => {
    const angle = (i + .5) * 2 * Math.PI / segments;
    return new THREE.Vector3(...center)
      .addScaledVector(across, Math.cos(angle) * width)
      .addScaledVector(up, Math.sin(angle) * depth).toArray();
  }));
  mesh.loft(rings, paint);
}

function buildFace(mesh) {
  const outline = [-1, -.79, -.52, -.22, 0, .22, .52, .79, 1];
  const front = [0, .60, .87, .96, 1, .96, .87, .60, 0];
  const sections = [
    [.856, .084, .334, .088, .087, 0],
    [.921, .149, .320, .138, .127, 0],
    [1.014, .190, .307, .170, .162, 0],
    [1.083, .204, .301, .172, .172, .099],
    [1.127, .216, .299, .176, .179, .064],
    [1.202, .215, .291, .181, .183, .018],
    [1.287, .211, .277, .177, .173, 0],
    [1.359, .167, .264, .145, .134, 0],
  ];
  const rings = sections.map(([y, width, center, bulge, back, nose]) => [
    ...outline.map((x, i) => [x * width + .016, y, center + front[i] * bulge + (i === 4 ? nose : 0)]),
    [width * .68 + .016, y, center - back * .82], [.016, y, center - back],
    [-width * .68 + .016, y, center - back * .82],
  ]);
  mesh.loft(rings, (row, segment) => segment > 1 && segment < 7 && row > 2 ? skin : 0xce8d70);

  for (const side of [-1, 1]) {
    const x = .016 + side * .100;
    const eye = [[x - .031, 1.173, .461], [x - .017, 1.148, .472], [x + .010, 1.143, .476],
      [x + .032, 1.160, .472], [x + .026, 1.183, .467], [x - .004, 1.191, .463]];
    const center = [x, 1.166, .484];
    for (let i = 0; i < eye.length; i++) mesh.polygon([center, eye[i], eye[(i + 1) % eye.length]], 0x303039);
    mesh.polygon([
      [x - side * .050, 1.235, .481], [x - side * .035, 1.254, .477],
      [x + side * .050, 1.241, .443], [x + side * .049, 1.220, .445],
    ], hair);
    mesh.polygon([[side * .200, 1.163, .302], [side * .269, 1.159, .308],
      [side * .265, 1.080, .345], [side * .222, 1.064, .358], [side * .205, 1.098, .371]], skin);
    mesh.polygon([[side * .222, 1.119, .373], [side * .252, 1.129, .349],
      [side * .239, 1.092, .360]], skinShadow);
  }

  mesh.polygon([[-.039, 1.024, .478], [-.008, 1.039, .492], [.024, 1.031, .492],
    [.062, 1.034, .483], [.081, 1.009, .472], [.028, .997, .489], [-.016, 1.003, .489]], 0xba736e);
  mesh.polygon([[-.033, 1.021, .487], [.015, 1.015, .500], [.071, 1.016, .484],
    [.016, 1.006, .499]], 0x774440);
}

function buildHair(THREE, mesh) {
  const rim = [
    [.248, 1.047, .319], [.238, 1.178, .408], [.183, 1.282, .483],
    [.081, 1.328, .492], [-.045, 1.289, .494], [-.150, 1.255, .472],
    [-.230, 1.194, .416], [-.264, 1.041, .350], [-.252, .961, .184],
    [-.164, .940, .047], [.004, .907, .010], [.174, .946, .054], [.270, .987, .183],
  ];
  const rings = [
    rim,
    rim.map(([x, y, z]) => [x * 1.12 - .022, 1.355 + (y - 1.16) * .29, .251 + (z - .251) * 1.05]),
    rim.map(([x, y, z]) => [x * .68 - .034, 1.479 + (y - 1.16) * .15, .238 + (z - .251) * .67]),
    rim.map(([x, , z]) => [x * .31 - .037, 1.525, .227 + (z - .251) * .30]),
  ];
  mesh.loft(rings, (row, i) => (i === 2 || i === 5) && row > 0 ? hairLight : hair, false);
  mesh.polygon(rings.at(-1), hair);

  const rollers = [
    [-.255, 1.124, .366, 0x9b435a],
    [-.279, 1.274, .376, 0xb6954d],
    [-.235, 1.421, .367, 0x995f7e],
    [-.102, 1.515, .354, 0x994654],
    [.055, 1.540, .355, 0xb49049],
    [.203, 1.473, .357, 0x995f7e],
    [.276, 1.338, .355, 0x9a4257],
    [.273, 1.182, .350, 0xb19454],
  ];
  for (const [x, y, z, paint] of rollers) {
    const tip = [x * 1.13, y + .016, z + .109];
    sweep(THREE, mesh, [[[x, y, z], .063, .063], [tip, .070, .070]], paint, 9);
    const inset = [tip[0] + x * .005, tip[1] + .001, tip[2] + .006];
    sweep(THREE, mesh, [[tip, .032, .032], [inset, .033, .033]], 0x3c2a32, 9);
  }
}

export function facetedResidentGeometry(THREE, robe, hands) {
  const mesh = facets(THREE);
  buildFace(mesh);
  buildHair(THREE, mesh);

  sweep(THREE, mesh, [[[.002, .616, .111], .104, .096],
    [[.021, .793, .208], .082, .083], [[.015, .892, .273], .088, .080]], skin);
  for (const [side, hand] of hands) {
    const shoulder = [side * .212, .613, .137];
    const elbow = [side * .587, hand[1] + .054, .418];
    const wrist = [hand[0] - side * .061, hand[1] + .009, hand[2] - .048];
    sweep(THREE, mesh, [[shoulder, .127, .133], [[side * .383, (elbow[1] + .63) / 2, .244], .139, .141],
      [[elbow[0] - side * .038, elbow[1] + .013, elbow[2] - .036], .094, .098]], robe, 7);
    sweep(THREE, mesh, [[[elbow[0] - side * .057, elbow[1] + .014, elbow[2] - .043], .097, .101],
      [elbow, .092, .093]], cuff);
    sweep(THREE, mesh, [[elbow, .078, .075],
      [[(elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2, (elbow[2] + wrist[2]) / 2], .066, .062],
      [wrist, .041, .049]], skin);
    sweep(THREE, mesh, [[wrist, .044, .048], [hand, .056, .060],
      [[hand[0] + side * .052, hand[1] - .014, hand[2] + .029], .040, .047]], skin);

    for (let finger = 0; finger < 4; finger++) {
      const lateral = side * (finger - 1.5) * .026;
      const x = hand[0] + lateral;
      const y = hand[1] - Math.abs(finger - 1.3) * .006;
      sweep(THREE, mesh, [[[x, y + .011, hand[2] + .041], .011, .015],
        [[x + side * .009, y - .023, hand[2] + .071], .013, .012],
        [[x + side * .003, y - .046, hand[2] + .054], .009, .009]], skin, 5);
    }
    sweep(THREE, mesh, [[[hand[0] - side * .055, hand[1] + .017, hand[2] + .029], .016, .017],
      [[hand[0] - side * .027, hand[1] + .003, hand[2] + .074], .015, .014]], 0xd39271, 5);

    sweep(THREE, mesh, [[[side * .16, -.711, -.51], .055, .055],
      [[side * .16, -.575, -.52], .067, .070]], skin);
    sweep(THREE, mesh, [[[side * .16, -.750, -.60], .070, .042],
      [[side * .16, -.754, -.343], .077, .036]], 0x745150);
  }

  const mouth = [-.018, 1.018, .499];
  const tip = [-.204, .971, .569];
  sweep(THREE, mesh, [[mouth, .012, .012], [tip, .013, .013]], 0xeadfca, 6);
  sweep(THREE, mesh, [[tip, .012, .012], [[-.232, .964, .578], .011, .011]], 0x756a65, 6);
  return mesh.finish();
}
