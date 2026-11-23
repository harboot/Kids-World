import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';

export const CAVE_MOUTHS = [
  { x: .44, z: -23.05, direction: -1 },
  { x: 17.7, z: -23.56, direction: 1 },
];
const [west, east] = CAVE_MOUTHS;
const tunnelHalfWidth = 1.56;
const segmentCount = 24;
const insideProfile = [[-1, -.09], [-1, 1.74], [-.82, 2.28], [-.48, 2.68], [0, 2.79],
  [.48, 2.62], [.82, 2.24], [1, 1.74], [1, -.09]];
const outsideProfile = [[-1, -.12], [-.81, .22], [-.53, .59], [-.23, .86], [.03, 1],
  [.32, .82], [.54, .53], [.79, .20], [1, -.12]];
const sections = Array.from({ length: segmentCount + 1 }, (_, index) => {
  const t = index / segmentCount;
  const spread = Math.sin(t * Math.PI);
  return {
    x: west.x + t * (east.x - west.x),
    z: west.z + t * (east.z - west.z) + Math.pow(spread, 1.35) * 3.63,
    width: 3.14 + spread * 4.58 + Math.sin(t * Math.PI * 5) * spread * .41,
    height: 4.15 + spread * 6.98 + Math.sin(t * Math.PI * 7) * spread * .84,
  };
});

export function caveCenterline(x) {
  const at = Math.max(0, Math.min(segmentCount, (x - west.x) / (east.x - west.x) * segmentCount));
  const index = Math.min(Math.floor(at), segmentCount - 1);
  const a = sections[index].z;
  return a + (sections[index + 1].z - a) * (at - index);
}

function caveWidth(x) {
  const at = (x - west.x) / (east.x - west.x) * segmentCount;
  const index = Math.min(Math.floor(at), segmentCount - 1);
  const a = sections[index].width;
  return a + (sections[index + 1].width - a) * (at - index);
}

export function addCave(THREE, { scene, mesh, box, facet, matte, instances, batchParts, reducedMotion, signal, playCue, finishMission }) {
  const positions = [];
  const colors = [];
  const random = seededRandom(7041);
  const outerColors = [0x848271, 0x8c8477, 0x9c9381, 0x7c8071, 0x8e907c];
  const innerColors = [0x555344, 0x5d5547, 0x61594a, 0x6d6554];
  const entryColors = [0x898171, 0x928777, 0x7f796a, 0x948c7b];
  const tone = new THREE.Color();

  function sectionPoints(section, inside) {
    const profile = inside ? insideProfile : outsideProfile;
    return profile.map(([distance, height], index) => [
      section.x,
      inside || index === 0 || index === profile.length - 1 ? height : height * section.height,
      section.z + distance * (inside ? tunnelHalfWidth : section.width),
    ]);
  }

  function triangle(a, b, c, palette, shade) {
    positions.push(...a, ...b, ...c);
    tone.setHex(palette[Math.floor(random() * palette.length)]).multiplyScalar(shade);
    for (let i = 0; i < 3; i++) colors.push(tone.r, tone.g, tone.b);
  }

  function strip(a, b, palette, shade = 1) {
    for (let i = 0; i < a.length - 1; i++) {
      triangle(a[i], a[i + 1], b[i], palette, shade);
      triangle(a[i + 1], b[i + 1], b[i], palette, shade);
    }
  }

  const insideRings = sections.map(section => sectionPoints(section, true));
  const outsideRings = sections.map(section => sectionPoints(section, false));
  for (let i = 0; i < segmentCount; i++) {
    strip(outsideRings[i + 1], outsideRings[i], outerColors);
    const centerShade = 1 - .21 * Math.sin((i + .5) * Math.PI / segmentCount);
    strip(insideRings[i], insideRings[i + 1], innerColors, centerShade);
  }
  strip(outsideRings[0], insideRings[0], entryColors);
  strip(insideRings[segmentCount], outsideRings[segmentCount], entryColors);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mountain = mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    0, 0, 0, 1, 1, 1, scene, true);
  mountain.name = 'Rock mountain and walk-through cave';
  mountain.receiveShadow = false;

  function floorStrip(color, height, halfWidth, variation) {
    const positions = [];
    const indices = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const side = halfWidth + Math.sin(i * .99) * variation;
      positions.push(section.x, height, section.z - side, section.x, height, section.z + side);
      if (i < segmentCount) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
    const flat = new THREE.BufferGeometry();
    flat.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    flat.setIndex(indices);
    flat.computeVertexNormals();
    mesh(flat, matte(color), 0, 0, 0, 1, 1, 1);
  }
  floorStrip(0x6e6755, SURFACE_GAP.detail, tunnelHalfWidth + .01, 0);
  floorStrip(0x98856b, SURFACE_GAP.trim, .92, .089);

  const rock = matte(0x867e6d);
  const moss = matte(0x677648);
  const rubble = [];
  const mosses = [];
  for (const { x, z, direction } of CAVE_MOUTHS) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const s = .19 + random() * .45;
        const px = x + direction * (.18 + random() * 1.18);
        const pz = z + side * (1.68 + random() * 1.25);
        rubble.push([px, s * .39, pz, s * 1.2, s, s, random() * Math.PI]);
        mosses.push([px + .18, s * .69, pz, s * .62, s * .32, s * .71]);
      }
    }
    const marker = addGroup(THREE, scene, 'Cave waymarker', x + direction * 1.48, 0, z + 1.7);
    mesh(box, matte(0x6d533c), 0, .54, 0, .10, 1.08, .105, marker);
    mesh(box, matte(0xbe925f), 0, 1.03, 0, .51, .29, .13, marker).rotation.y = -direction * .54;
    batchParts(marker);
  }
  instances(facet, rock, rubble);
  instances(facet, moss, mosses);

  const beam = matte(0x6c5038);
  const lantern = matte(0x6b5846);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffcd79 });
  const ore = matte(0xabb29a);
  const decorations = addGroup(THREE, scene, 'Cave lanterns and mineral deposits');
  for (const [x, side] of [[1.67, -1], [5.3, 1], [9.08, -1], [13.1, 1], [16.6, -1]]) {
    const z = caveCenterline(x) + side * 1.5;
    mesh(box, beam, x, 1.52, z - side * .05, .27, .086, .20, decorations);
    const lightZ = z - side * .17;
    mesh(box, lantern, x, 1.44, lightZ, .205, .10, .19, decorations);
    mesh(box, glow, x, 1.56, lightZ, .148, .154, .145, decorations);
    mesh(facet, lantern, x, 1.69, lightZ, .139, .098, .135, decorations);
    for (let i = 0; i < 6; i++) {
      const px = x + (random() - .5) * 1.5;
      const py = .31 + random() * .61;
      mesh(facet, ore, px, py, caveCenterline(px) + side * 1.538, .14, .09, .082, decorations).rotation.y = px;
    }
  }

  batchParts(decorations);

  const wings = new THREE.BufferGeometry();
  wings.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, .64, -.02, .06, .38, -.058, -.19,
    0, 0, 0, .38, -.058, -.19, .21, .015, -.16,
    0, 0, 0, .21, .015, -.16, .11, -.04, -.29,
  ], 3));
  wings.computeVertexNormals();
  const batFur = matte(0x393037);
  const wingSkin = new THREE.MeshLambertMaterial({ color: 0x524151, side: THREE.DoubleSide });
  const bats = Array.from({ length: 6 }, (_, i) => {
    const root = addGroup(THREE, scene, `Cave bat ${i + 1}`);
    root.visible = false;
    mesh(facet, batFur, 0, 0, 0, .112, .11, .235, root);
    mesh(facet, batFur, 0, .035, .157, .11, .098, .11, root);
    for (const side of [-1, 1]) mesh(facet, batFur, side * .064, .102, .19, .037, .088, .045, root);
    batchParts(root);
    const joints = [-1, 1].map(side => {
      const joint = addGroup(THREE, root, 'Bat wing', side * .052, .028, 0);
      mesh(wings, wingSkin, 0, 0, 0, side, 1, 1, joint);
      return joint;
    });
    return { root, joints, delay: i * .115, spread: (i - 2.5) * .23, speed: 3.75 + i * .22 };
  });

  let launch = null;
  let elapsed = 0;
  let armed = [true, true];
  return {
    blocks(x, z, radius) {
      if (x < west.x || x > east.x) return false;
      const offset = Math.abs(z - caveCenterline(x));
      return offset > tunnelHalfWidth - radius && offset < caveWidth(x) + radius;
    },
    ceiling(x, z) {
      if (x < west.x || x > east.x) return Infinity;
      const offset = (z - caveCenterline(x)) / tunnelHalfWidth;
      if (Math.abs(offset) >= 1) return Infinity;
      const end = insideProfile.findIndex(([side], index) => index > 1 && side >= offset);
      const [a, low] = insideProfile[end - 1];
      const [b, high] = insideProfile[end];
      return low + (high - low) * ((offset - a) / (b - a)) - .035;
    },
    update(dt, player) {
      if (!player || signal?.aborted) return;
      const still = reducedMotion?.();
      CAVE_MOUTHS.forEach((mouth, i) => {
        const distance = Math.hypot(player.x - mouth.x, player.z - mouth.z);
        if (distance > 4.1) armed[i] = true;
        if (!armed[i] || distance > 2.65 || Math.abs(player.y - EYE_HEIGHT) > .88) return;
        armed[i] = false;
        if (launch) return;
        playCue?.([
          [82, { endPitch: 91, duration: .095, level: .12, wave: 'triangle' }],
          [89, { endPitch: 80, duration: .135, level: .12 }, .11],
          [86, { endPitch: 94, duration: .12, level: .08 }, .25],
        ]);
        finishMission('cave');
        if (still) return;
        launch = mouth;
        elapsed = 0;
      });
      if (!launch) return;
      elapsed += dt;
      const { x, z, direction } = launch;
      bats.forEach(({ root, joints, delay, spread, speed }) => {
        const t = elapsed - delay;
        root.visible = !still && t >= 0 && t < 2.6;
        if (!root.visible) return;
        const flight = Math.max(0, t - .24);
        const px = x + direction * (-.64 + speed * t);
        const startZ = px > west.x && px < east.x ? caveCenterline(px) : z;
        root.position.set(px, 1.92 + spread * .35 + flight * (1.16 + Math.abs(spread) * .34),
          startZ + spread + flight * (.68 + spread) + .12 * Math.sin(t * 8 + delay * 6));
        root.rotation.set(-.28, direction * 1.25, Math.sin(t * 10) * .12);
        joints.forEach((wing, i) => { wing.rotation.z = (2 * i - 1) * Math.sin(t * 27) * .74; });
      });
      if (still || elapsed >= 3.18) launch = null;
    },
    reset() {
      launch = null;
      elapsed = 0;
      armed = [true, true];
      bats.forEach(({ root }) => { root.visible = false; });
    },
    unload() {
      launch = null;
      bats.forEach(({ root }) => { root.visible = false; });
    },
  };
}
