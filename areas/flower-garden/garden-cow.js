const SIDES = [-1, 1];
const TURN = 2 * Math.PI;
const CREAM = 0xf4e8d2;
const DARK = 0x342924;
const PINK = 0xe99890;

// Each tuple describes an irregular spot on the unit sphere before the torso is stretched.
const COATS = [
  { color: 0x392c26, spots: [
    [-0.91, 0.24, -0.33, 0.39, 0.59, 0.54],
    [0.74, 0.40, -0.54, 0.46, 0.62, 0.45],
    [0.83, -0.26, 0.57, 0.39, 0.32, 0.41],
    [-0.23, 0.94, 0.28, 0.42, 0.31, 0.32],
  ] },
  { color: 0x53392d, spots: [
    [-0.75, 0.31, 0.55, 0.49, 0.49, 0.49],
    [-0.96, -0.22, -0.25, 0.33, 0.34, 0.34],
    [0.86, 0.25, 0.45, 0.43, 0.56, 0.35],
    [0.58, 0.52, -0.63, 0.54, 0.54, 0.51],
  ] },
];

function coatDistance(x, y, z, spots) {
  let distance = Infinity;
  for (const [cx, cy, cz, sx, sy, sz] of spots) {
    const dx = (x - cx) / sx, dy = (y - cy) / sy, dz = (z - cz) / sz;
    const edge = dx * dx + dy * dy + dz * dz + 0.28 * Math.sin(9 * x + 3 * y) * Math.sin(8 * z - y);
    distance = Math.min(distance, edge - 1);
  }
  return distance;
}

function coatGeometry(THREE, coat) {
  const sphere = new THREE.SphereGeometry(1, 24, 12);
  const { position } = sphere.attributes;
  const vertices = Array.from({ length: position.count }, (_, i) => {
    const point = new THREE.Vector3().fromBufferAttribute(position, i);
    return { point, distance: coatDistance(point.x, point.y, point.z, coat.spots) };
  });
  const positions = [], normals = [], colors = [], indices = [];
  const cream = new THREE.Color(CREAM), dark = new THREE.Color(coat.color);
  const emit = (polygon, color) => {
    const start = positions.length / 3;
    for (const { point } of polygon) {
      const { x, y, z } = point;
      positions.push(x, y, z);
      normals.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
    for (let i = 1; i + 1 < polygon.length; i++) indices.push(start, start + i, start + i + 1);
  };

  // Split triangles at the spot boundary so both colors occupy the same continuous surface.
  const source = sphere.index.array;
  for (let i = 0; i < source.length; i += 3) {
    const triangle = [vertices[source[i]], vertices[source[i + 1]], vertices[source[i + 2]]];
    const lightSide = [], darkSide = [];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      const inside = a.distance < 0;
      (inside ? darkSide : lightSide).push(a);
      if (inside !== (b.distance < 0)) {
        const edge = { point: a.point.clone().lerp(b.point, a.distance / (a.distance - b.distance)) };
        lightSide.push(edge);
        darkSide.push(edge);
      }
    }
    emit(lightSide, cream);
    emit(darkSide, dark);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

function curvedTube(THREE, points, segments, sides, startRadius, endRadius) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(path, segments, startRadius, sides);
  const { position } = geometry.attributes;
  const vertex = new THREE.Vector3();
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    const center = path.getPointAt(t);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, t);
    for (let side = 0; side <= sides; side++) {
      const i = ring * (sides + 1) + side;
      vertex.fromBufferAttribute(position, i).lerp(center, 1 - radius / startRadius);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  return geometry;
}

// Bake each rigid set of parts into one indexed, vertex-colored mesh per joint.
function mergeParts(THREE, parts) {
  const positions = [], normals = [], colors = [], indices = [];
  const color = new THREE.Color();
  for (const { geometry, tint } of parts) {
    const { position, normal, color: vertexColor } = geometry.attributes;
    const start = positions.length / 3;
    for (let i = 0; i < position.count; i++) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      if (vertexColor) color.fromBufferAttribute(vertexColor, i);
      else color.setHex(tint);
      colors.push(color.r, color.g, color.b);
    }
    for (const index of geometry.index.array) indices.push(start + index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function createCowFactory(THREE) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const largeBall = new THREE.SphereGeometry(1, 16, 10);
  const mediumBall = new THREE.SphereGeometry(1, 12, 7);
  const smallBall = new THREE.SphereGeometry(1, 8, 4);
  function ellipsoid(shape, tint, x, y, z, sx, sy, sz, pitch = 0, yaw = 0) {
    const geometry = shape.clone().scale(sx, sy, sz).rotateX(pitch).rotateY(yaw).translate(x, y, z);
    return { geometry, tint };
  }

  function legProfile(points, tint, depth, forward = 0) {
    const profile = points.map(([radius, height]) => new THREE.Vector2(radius, height));
    const geometry = new THREE.LatheGeometry(profile, 8).scale(1, 1, depth).translate(0, 0, forward);
    return { geometry, tint };
  }

  const torsos = COATS.map(coat => mergeParts(THREE, [
    { geometry: coatGeometry(THREE, coat).scale(0.45, 0.39, 0.76) },
    ellipsoid(mediumBall, CREAM, 0, 0.13, 0.51, 0.27, 0.30, 0.30, 0.48),
  ]));

  const face = [
    ellipsoid(largeBall, CREAM, 0, 0.08, 0.17, 0.31, 0.30, 0.30, -0.10),
    ellipsoid(mediumBall, PINK, 0, -0.078, 0.425, 0.307, 0.162, 0.206, -0.12),
  ];
  const eyeParts = [];
  for (const side of SIDES) {
    const yaw = side * 0.46;
    const horn = curvedTube(THREE, [
      [side * 0.175, 0.29, 0.116], [side * 0.218, 0.39, 0.112],
      [side * 0.218, 0.46, 0.127], [side * 0.185, 0.52, 0.153],
    ], 6, 6, 0.066, 0);
    face.push(
      { geometry: horn, tint: 0xd7bb8e },
      ellipsoid(smallBall, 0x713d39, side * 0.114, -0.048, 0.609, 0.039, 0.024, 0.010, -0.18, side * 0.26),
    );
    eyeParts.push(
      ellipsoid(smallBall, 0x62423b, side * 0.219, 0, 0.376, 0.094, 0.108, 0.037, 0, yaw),
      ellipsoid(mediumBall, 0xfff8e9, side * 0.228, 0.001, 0.398, 0.076, 0.089, 0.044, 0, yaw),
      ellipsoid(smallBall, 0x271e1b, side * 0.234, -0.002, 0.434, 0.049, 0.063, 0.021, 0, yaw),
      ellipsoid(smallBall, 0xffffff, side * 0.234 - 0.013, 0.021, 0.453, 0.015, 0.018, 0.008, 0, yaw),
    );
  }
  const headGeometry = mergeParts(THREE, face);
  const eyesGeometry = mergeParts(THREE, eyeParts);
  const earGeometry = mergeParts(THREE, [
    ellipsoid(mediumBall, DARK, 0, 0.115, 0, 0.090, 0.175, 0.062),
    ellipsoid(smallBall, PINK, 0, 0.122, 0.044, 0.062, 0.126, 0.023),
  ]);
  const upperLeg = mergeParts(THREE, [
    legProfile([[0, -0.36], [0.064, -0.34], [0.075, -0.27], [0.103, -0.13], [0.10, 0.035], [0, 0.12]],
      CREAM, 1.16),
  ]);
  const lowerLeg = mergeParts(THREE, [
    legProfile([[0, -0.325], [0.059, -0.30], [0.052, -0.19], [0.064, -0.03], [0.061, 0.045], [0, 0.078]],
      CREAM, 1.1),
    legProfile([[0, -0.376], [0.068, -0.376], [0.085, -0.354], [0.081, -0.288], [0.059, -0.254], [0, -0.25]],
      DARK, 1.22, 0.022),
  ]);
  const tailGeometry = mergeParts(THREE, [
    { geometry: curvedTube(THREE, [
      [0, 0, 0], [0.008, -0.11, -0.16], [0.042, -0.28, -0.21], [0.058, -0.48, -0.24],
    ], 8, 5, 0.031, 0.018), tint: 0x9b7150 },
    ellipsoid(smallBall, DARK, 0.058, -0.484, -0.242, 0.068, 0.112, 0.057, 0.19),
  ]);

  return function createCow(variant) {
    const root = new THREE.Group();
    function joint(parent, name, x, y, z, geometry) {
      const group = new THREE.Group();
      group.name = name;
      group.position.set(x, y, z);
      group.add(new THREE.Mesh(geometry, material));
      parent.add(group);
      return group;
    }

    const body = joint(root, 'Cow torso', 0, 0.96, 0, torsos[variant]);
    const head = joint(body, 'Cow head', 0, 0.187, 0.655, headGeometry);
    head.scale.set(1 - variant * 0.045, 1 + variant * 0.035, 1);
    const eyes = joint(head, 'Cow eyes', 0, 0.153, 0, eyesGeometry);
    const ears = SIDES.map(side => ({
      side, pivot: joint(head, 'Cow ear', side * 0.249, 0.245, 0.139, earGeometry),
    }));
    const tail = joint(body, 'Cow tail', 0, 0.07, -0.707, tailGeometry);
    const legs = [];
    for (const side of SIDES) {
      for (const end of SIDES) {
        const hip = joint(root, 'Cow hip', side * 0.264, 0.714, end * 0.475, upperLeg);
        const knee = joint(hip, 'Cow knee', 0, -0.335, 0, lowerLeg);
        legs.push({ hip, knee, phase: side === end ? 0 : Math.PI });
      }
    }

    const offset = variant * 1.3;
    let elapsed = 0, stride = offset, walk = 0;

    function pose(greetingProgress) {
      const idle = elapsed + offset;
      const greeting = Math.sin(Math.PI * greetingProgress);
      const nod = greeting * (1 - Math.cos(greetingProgress * TURN * 2)) * 0.19;
      const breath = Math.sin(idle * 2.2);
      const bob = walk * Math.abs(Math.sin(stride)) * 0.025;
      body.position.y = 0.96 + bob;
      body.scale.set(1 + breath * 0.013, 1 + breath * 0.022, 1);
      head.rotation.x = 0.035 * Math.sin(idle * 1.53) + nod + walk * Math.sin(stride * 2) * 0.025;
      head.rotation.y = 0.12 * Math.sin(idle * 0.84) * Math.sin(idle * 0.43) + greeting * 0.12;

      const blinkTime = (elapsed + variant * 0.9 + 0.7) % 4.6;
      eyes.scale.y = 1 - 0.93 * Math.sin(Math.PI * Math.min(blinkTime / 0.18, 1));
      for (const { side, pivot } of ears) {
        pivot.rotation.z = -side * (1.17 + 0.065 * Math.sin(idle * 2.9 + side)
          + greeting * 0.19 * Math.sin(greetingProgress * TURN * 3 + side));
        pivot.rotation.y = side * (0.13 + greeting * 0.18);
      }
      tail.rotation.x = 0.12 * Math.sin(idle * 1.9);
      tail.rotation.z = 0.30 * Math.sin(idle * 2.5) + greeting * 0.24 * Math.sin(greetingProgress * TURN * 2);

      for (const { hip, knee, phase } of legs) {
        const step = stride + phase;
        const lift = Math.max(0, Math.sin(step)) * walk;
        hip.rotation.x = Math.cos(step) * walk * 0.32;
        hip.position.y = 0.714 + lift * 0.037;
        knee.rotation.x = 0.32 * lift;
      }
    }

    return {
      root,
      update(dt, speed, greetingProgress = 0) {
        elapsed += dt;
        stride = (stride + speed * dt * 11) % TURN;
        walk = THREE.MathUtils.damp(walk, Math.min(speed / 0.46, 1), 10, dt);
        pose(greetingProgress);
      },
      reset() {
        elapsed = 0;
        stride = offset;
        walk = 0;
        pose(0);
      },
    };
  };
}
