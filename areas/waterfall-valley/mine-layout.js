import {
  CLIFF_Z, LOWER_X, UPPER_X, LOWER_LEVEL, UPPER_LEVEL, X_MIN, clamp, heightGrid,
  mix, nearest, portalHeight, route, smooth,
} from './landform.js';
import { aditCeiling, aditEntryZ, aditHeight, aditOpening, createLowerAdit, shaft } from './lift-layout.js';


export const chambers = [
  { name: 'Lower station', x: -16, z: -32, rx: 10, rz: 10 },
  { name: 'Echo Lake', x: -41, z: -55, rx: 19, rz: 13 },
  { name: 'Crystal hall', x: -16, z: -59, rx: 13, rz: 11 },
  { name: 'Northern galleries', x: -27, z: -76, rx: 17, rz: 10 },
  { name: 'Shaft hall', x: 32, z: -58, rx: 17, rz: 13 },
  { name: 'Upper station', x: 22, z: -34, rx: 12, rz: 10 },
  { name: 'Slate gallery', x: -1, z: -72, rx: 12, rz: 9 },
];

export const mineLake = { x: -42, z: -54, rx: 14, rz: 8.5, y: 3.05 };

function curveRoute(THREE, positions) {
  const curve = new THREE.CatmullRomCurve3(positions.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return route(curve.getSpacedPoints(Math.ceil(curve.getLength() / 1.5)).map(({ x, z }) => [x, z, 0]));
}

function withElevation(path, height) {
  let distance = 0;
  return route(path.points.map(([x, z], i) => {
    if (i) distance += path.segments[i - 1].length;
    return [x, z, height(x, z, distance)];
  }));
}

export function lakeBasin(x, z) {
  return Math.hypot((x - mineLake.x) / mineLake.rx, (z - mineLake.z) / mineLake.rz)
    + 0.045 * Math.sin(x * 0.59 + z * 0.8);
}

export function createMineLayout(THREE) {
  const alignment = curveRoute(THREE, [
    [LOWER_X, -17], [LOWER_X, -27], [-20, -40], [-31, -49], [-44, -52], [-51, -56], [-55, -61], [-55, -67], [-51, -72],
    [-45, -75], [-26, -78], [-2, -76], [23, -73], [41, -63], [44, -48],
    [29, -36], [21, -31], [17.5, -26], [UPPER_X, -17],
  ]);
  const main = withElevation(alignment, (x, z, distance) => {
    // Level throats and eased grades through the station approaches.
    const t = clamp((distance - 14) / (alignment.length - 28));
    const edge = 0.1;
    const linear = fraction => (fraction < edge ? fraction ** 2 / (2 * edge) : fraction - edge / 2) / (1 - edge);
    const eased = t <= 0.5 ? linear(t) : 1 - linear(1 - t);
    return mix(LOWER_LEVEL, UPPER_LEVEL, eased);
  });
  const pointNear = (x, z) => main.points.reduce((a, b) =>
    Math.hypot(x - a[0], z - a[1]) < Math.hypot(x - b[0], z - b[1]) ? a : b);
  const crystalJunction = pointNear(-20, -40);
  const crystalBranch = withElevation(curveRoute(THREE, [
    crystalJunction, [-22.9, -45], [-22, -51], [-15, -59], [-10, -63],
  ]), (x, z, distance) => crystalJunction[2] + distance * 0.079);
  const shaftJunction = pointNear(25, -72);
  const shaftBranch = withElevation(curveRoute(THREE, [
    shaftJunction, [32, -68], [34, -63], [35, -56],
  ]), (x, z, distance) => shaftJunction[2] + distance * 0.066);

  const trailStart = crystalBranch.points.at(-3);
  const trailEnd = pointNear(-17, -77);
  const connector = route([trailStart, [-12, -68, 6.1], [-13, -74, 8.55], trailEnd]);
  function signedOpening(x, z) {
    let opening = 4.25 - nearest(main, x, z).offset;
    for (const branch of [crystalBranch, shaftBranch, connector]) {
      opening = Math.max(opening, 3.65 - nearest(branch, x, z).offset);
    }
    for (const { x: cx, z: cz, rx, rz } of chambers) {
      const distance = Math.hypot((x - cx) / rx, (z - cz) / rz);
      opening = Math.max(opening, (1 - distance) * Math.min(rx, rz));
    }
    const irregular = opening + smooth(CLIFF_Z, -29, z) * (0.43 * Math.sin(x * 0.71 + z * 0.43)
      + 0.36 * Math.sin(x * 0.31 - z * 0.84));
    if (x > 0 || x < -15 || Math.abs(z - aditEntryZ) > 6) return irregular;
    return Math.max(irregular, Math.min(-x, aditOpening(x, z)));
  }

  function bridgeSpan(x, z) {
    const track = nearest(main, x, z);
    return track.distance > 33 && track.distance < 75 ? track : null;
  }

  function floor(x, z) {
    const track = nearest(main, x, z);
    const crystalTrack = nearest(crystalBranch, x, z);
    const shaftTrack = nearest(shaftBranch, x, z);
    const trail = nearest(connector, x, z);
    let base = mix(track.y, trail.y, 1 - smooth(1.5, 6, trail.offset));
    base = mix(base, crystalTrack.y, 1 - smooth(2.15, 10, crystalTrack.offset));
    base = mix(base, shaftTrack.y, 1 - smooth(2.15, 8, shaftTrack.offset));
    base = mix(track.y, base, smooth(1.8, 4.4, track.offset));
    const relief = (Math.sin(x * 0.65 + z * 0.39) * 0.24 + Math.cos(x * 0.33 - z * 0.55) * 0.27)
      * smooth(2, 7, track.offset);
    const basin = 1 - smooth(0.56, 1.12, lakeBasin(x, z));
    const bed = mix(base + relief, mineLake.y - 1.6 + relief, basin);
    let y = mix(portalHeight(x), bed, smooth(CLIFF_Z, -29, z));
    const landing = Math.max(Math.abs(x - shaft.x), Math.abs(z - shaft.z));
    y = mix(shaft.upper, y, smooth(2.6, 6.6, landing));
    if (x <= 0 && x >= -14 && Math.abs(z - aditEntryZ) < 6) {
      const entrance = smooth(-14, -7, x) * (1 - smooth(4.1, 6, Math.abs(z - aditEntryZ)));
      y = mix(y, aditHeight(x, z), entrance);
    }
    // Shape the spur shoulders beneath the railheads through the turnout
    // overlaps, where the surrounding galleries climb at different grades.
    for (const spur of [shaftTrack, crystalTrack]) {
      y = Math.min(y, mix(spur.y - 0.06, y, smooth(1.85, 3.25, spur.offset)));
    }
    return y;
  }

  function ceiling(x, z) {
    const opening = signedOpening(x, z);
    const arch = smooth(0, 4, opening) * (1 - smooth(CLIFF_Z, -27, z));
    const height = 3.15 + arch * 1.63 + smooth(0, 2, opening) * smooth(CLIFF_Z, -27, z) * 1.2
      + smooth(2, 11, opening) * 8.2
      + smooth(CLIFF_Z, -31, z) * (Math.sin(x * 0.57 + z * 0.24) * 0.64 + Math.cos(z * 0.6) * 0.48);
    const rail = nearest(main, x, z);
    const bed = Math.max(floor(x, z), rail.y - 6);
    const raised = Math.max(bed + height, rail.y + 4.5 * (1 - smooth(2, 4, rail.offset)));
    if (x > 0 || x < -14 || Math.abs(z - aditEntryZ) >= 6) return raised;
    const entrance = smooth(-14, -7, x) * (1 - smooth(4.1, 6, Math.abs(z - aditEntryZ)));
    return mix(raised, aditCeiling(x, z), entrance);
  }

  return {
    main,
    adit: createLowerAdit(),
    branches: [crystalBranch, shaftBranch],
    bridgeSpan,
    opening: heightGrid(X_MIN, 72, -88, CLIFF_Z, signedOpening),
    floor: heightGrid(X_MIN, 72, -88, CLIFF_Z, floor),
    ceiling: heightGrid(X_MIN, 72, -88, CLIFF_Z, ceiling),
  };
}
