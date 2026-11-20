import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { addGallerySign, addRoundSolid, spaceTransform } from './parts.js';
import { addThorns, bedSite, buildAuroraFloor, buildAuroraWalls, buildRoyalBed } from './aurora-room.js';
import { buildPrincessArm, buildPrincessFace, gownGeometry } from './princess-model.js';

const roseSite = { x: 3.76, z: -.35, entryRadius: 2.5, exitRadius: 2.85, floorTolerance: .90 };
const transitionSeconds = 1.9;

function buildSleepingBeauty(THREE, parts, room, palette) {
  const { part, beam, batch, matte } = parts;
  const { gold, pale } = palette;
  const skin = matte(0xffd0ad);
  const dress = matte(0xd9679a);
  const ribbon = matte(0xfb9cbe);
  const blond = matte(0xd79a44);
  const highlights = matte(0xf1ba59);
  const princess = addGroup(THREE, room, 'Aurora character', bedSite.x + .53, bedSite.top + .19, bedSite.z - .54);
  const skirt = addGroup(THREE, princess, 'Aurora skirt');
  skirt.rotation.x = -Math.PI / 2;
  const upper = addGroup(THREE, princess, 'Aurora upper body');
  const head = addGroup(THREE, upper, 'Aurora head', 0, 1.034, .123);
  const costume = new THREE.Group();
  const drape = new THREE.Group();
  const profile = [[-1.718, .008, .014], [-1.69, .45, .10, .046], [-1.60, .56, .19, .064], [-1.30, .60, .225, .06],
    [-.87, .48, .23, .06], [-.40, .35, .205, .036], [.048, .227, .156], [.105, .055, .046]];
  part(drape, gownGeometry(THREE, profile), dress, 0, 0, 0, 1, 1, 1);
  part(drape, gownGeometry(THREE, [[-1.68, .48, .12, .052], [-1.64, .549, .171, .062],
    [-1.61, .566, .189, .064], [-1.577, .567, .196, .064]]), ribbon, 0, 0, 0, 1, 1, 1);
  part(drape, 'sphere', dress, 0, -.282, 0, .309, .36, .19);
  for (const side of [-1, 1]) {
    beam(drape, ribbon, [side * .18, -.16, .15], [side * .34, -.87, .176], .025);
    beam(drape, ribbon, [side * .34, -.87, .176], [side * .47, -1.56, .14], .027);
    part(drape, 'gem', gold, side * .313, -.84, .212, .026, .069, .016);
  }
  batch(drape, skirt);

  part(costume, gownGeometry(THREE, [[-.078, .224, .151], [.10, .213, .154],
    [.29, .25, .184], [.48, .299, .194], [.621, .265, .136]]), dress, 0, 0, 0, 1, 1, 1);
  part(costume, 'sphere', skin, 0, .59, 0, .254, .147, .143);
  part(costume, 'drum', skin, 0, .755, .055, .106, .252, .103);
  part(costume, 'gem', gold, 0, .564, .202, .049, .065, .035);
  for (const side of [-1, 1]) {
    part(costume, 'sphere', pale, side * .145, .584, .116, .194, .050, .114).rotation.z = side * .31;
    beam(costume, ribbon, [side * .095, .06, .143], [side * .16, .47, .157], .025);
    beam(costume, gold, [0, .018, .166], [side * .196, .08, .083], .026);
  }
  batch(costume, upper);
  const left = buildPrincessArm(THREE, parts, upper, -1, .553, ribbon, skin);
  const right = buildPrincessArm(THREE, parts, upper, 1, .553, ribbon, skin);
  const hair = new THREE.Group();
  part(hair, 'sphere', blond, 0, .066, -.098, .321, .343, .221);
  for (const side of [-1, 1]) {
    part(hair, 'sphere', highlights, side * .166, .208, .128, .178, .099, .121).rotation.z = side * .55;
    part(hair, 'sphere', blond, side * .218, -.203, -.086, .149, .34, .179).rotation.z = side * .23;
    part(hair, 'sphere', highlights, side * .269, -.392, -.061, .119, .246, .141).rotation.z = side * -.32;
    part(hair, 'sphere', blond, side * .224, -.567, -.073, .132, .227, .140).rotation.z = side * -.29;
    part(hair, 'gem', gold, side * .274, -.10, .073, .030, .046, .031);
    beam(hair, gold, [0, .326, .243], [side * .177, .319, .194], .052);
    beam(hair, gold, [side * .177, .319, .194], [side * .24, .367, .125], .041);
    part(hair, 'gem', gold, side * .136, .362, .211, .046, .095, .035).rotation.z = side * -.27;
  }
  part(hair, 'gem', gold, 0, .405, .225, .071, .122, .041);
  part(hair, 'gem', pale, 0, .392, .255, .036, .057, .023);
  batch(hair, head);
  const { eyes, lids } = buildPrincessFace(THREE, parts, head, skin, 0x6659a8);

  return function pose(amount, time, still) {
    const breath = still ? 0 : Math.sin(time * 2.4) * .014;
    const glance = still ? 0 : Math.sin(time * 1.36) * .052;
    upper.rotation.x = -1.49 + 1.12 * amount + breath;
    head.rotation.set(-.055 - .053 * amount, .10 + (.40 + glance) * amount, .135 - .187 * amount);
    const eyeOpening = THREE.MathUtils.smoothstep(amount, .22, .74);
    eyes.visible = eyeOpening > .08;
    eyes.scale.y = Math.max(.08, eyeOpening);
    lids.visible = !eyes.visible;
    left.upper.rotation.set(.10 + .07 * amount, 0, -.23 - .28 * amount);
    right.upper.rotation.set(.13 + .41 * amount, 0, .43 + .27 * amount);
    left.elbow.rotation.set(-.13 - .81 * amount, 0, .76 - .34 * amount);
    right.elbow.rotation.set(-.08 - .55 * amount, 0, -.65 + (.31 + glance) * amount);
  };
}

function buildEnchantedRose(THREE, document, parts, room, palette) {
  const { part, batch, matte } = parts;
  const { ivory, gold, burgundy, pale } = palette;
  const stand = addGroup(THREE, room, 'Enchanted rose', roseSite.x, 0, roseSite.z);
  const details = new THREE.Group();
  part(details, 'drum', burgundy, 0, .105, 0, .671, .21, .671);
  part(details, 'drum', gold, 0, .225, 0, .61, .082, .61);
  part(details, 'drum', ivory, 0, .74, 0, .436, 1.02, .436);
  part(details, 'drum', burgundy, 0, 1.17, 0, .435, .20, .435);
  part(details, 'drum', gold, 0, 1.29, 0, .59, .13, .59);
  part(details, 'drum', burgundy, 0, 1.41, 0, .607, .15, .607);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = Math.sin(angle), z = Math.cos(angle);
    part(details, 'drum', gold, x * .435, .74, z * .435, .033, .87, .033);
    part(details, 'gem', pale, x * .45, 1.09, z * .45, .053, .102, .053);
  }

  const plaque = addGroup(THREE, stand, 'Enchanted rose plaque', 0, 1.14, .48, -.24);
  part(plaque, 'box', gold, 0, 0, 0, 1.57, .55, .11);
  addGallerySign(THREE, document, plaque, ['Approach the Enchanted Rose'], 0, 0, .055 + SURFACE_GAP.detail, 1.50, .47);

  const stem = [[0, 1.48, 0], [-.09, 1.67, .015], [-.13, 1.89, .03],
    [-.06, 2.11, .043], [.09, 2.29, .055], [.15, 2.47, .079]];
  addThorns(parts, details, stem, palette, .117);
  const petal = matte(0xd2265d, { emissive: 0xea2564, emissiveIntensity: .2 });
  const inner = matte(0xf35c82, { emissive: 0xff4e8b, emissiveIntensity: .28 });
  const bloom = addGroup(THREE, details, 'Layered rose petals', .16, 2.52, .09);
  bloom.rotation.x = .30;
  for (const [count, radius, y, size, tilt, material] of [[7, .225, .035, .209, .87, petal],
    [6, .159, .116, .169, .51, inner], [5, .085, .172, .124, .26, petal]]) {
    for (let i = 0; i < count; i++) {
      const angle = (i + tilt) * 2 * Math.PI / count;
      const panel = addGroup(THREE, bloom, '', radius * Math.sin(angle), y, radius * Math.cos(angle), angle);
      part(panel, 'sphere', material, 0, 0, 0, size, size * 1.24, size * .38).rotation.x = tilt;
    }
  }
  part(bloom, 'sphere', inner, 0, .214, -.009, .097, .123, .106);
  batch(details, stand);

  const texture = paintCanvasTexture(THREE, document, 64, 64, (ink, w, h) => {
    const gradient = ink.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, '#fff9ed');
    gradient.addColorStop(.24, '#ffcfeae6');
    gradient.addColorStop(.57, '#ec80b756');
    gradient.addColorStop(1, '#ec80b700');
    ink.fillStyle = gradient;
    ink.fillRect(0, 0, w, h);
  });
  const halo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const aura = new THREE.Points(halo, new THREE.PointsMaterial({
    color: 0xff83bb, map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  aura.name = 'Aurora rose aura';
  aura.position.set(.16, 2.63, .09);
  aura.visible = Boolean(texture);
  stand.add(aura);

  const glimmer = new THREE.PointLight(0xf381d7, 7, 8.5);
  glimmer.name = 'Aurora magic light';
  glimmer.position.set(2.4, 3.05, -2.45);
  room.add(glimmer);
  const random = seededRandom(297);
  const seeds = Array.from({ length: 28 }, () => [random() * 6.28, random(), random()]);
  const positions = new THREE.BufferAttribute(new Float32Array(seeds.length * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  const flecks = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xffb7e6, map: texture, size: .19, opacity: .79,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  flecks.name = 'Aurora magical particles';
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2.6, -1.2), 5.0);
  stand.add(flecks);

  return function glow(amount, time, still) {
    petal.emissiveIntensity = .20 + .79 * amount;
    inner.emissiveIntensity = .28 + .96 * amount;
    glimmer.intensity = 7 + 24 * amount;
    aura.material.opacity = .23 + .33 * amount;
    aura.material.size = 1.35 + .50 * amount;
    const count = still ? 0 : 10 + Math.round(18 * amount);
    flecks.visible = count > 0;
    geometry.setDrawRange(0, count);
    for (let i = 0; i < count; i++) {
      const [phase, spread, lift] = seeds[i];
      const angle = phase + time * (.35 + .45 * amount);
      const radius = i % 3 ? .35 + spread * (.95 + amount) : 1.20 + spread * (2.1 + amount);
      positions.setXYZ(i, Math.cos(angle) * radius, 1.87 + lift * 1.65 + Math.sin(angle * 1.8) * .36,
        Math.sin(angle) * radius - (i % 3 ? 0 : 2.4));
    }
    positions.needsUpdate = count > 0;
  };
}

export function buildAurora({ THREE, document, bay, exhibit, parts, obstacles, outline, reducedMotion = false }) {
  const { batch, matte } = parts;
  const { toLocal, toWorld } = spaceTransform(exhibit);
  const palette = {
    stone: matte(0xb088ad), ivory: matte(0xf1d4ce), gold: matte(0xc48b48), burgundy: matte(0x68304e),
    velvet: matte(0x9d4777, { side: THREE.DoubleSide }),
    pale: matte(0xf2b6d7), quilt: matte(0xda88b0), lavender: matte(0xa181b8),
    candle: matte(0xffdcad, { emissive: 0xffa46a, emissiveIntensity: .57 }),
    stem: matte(0x4e6846), leaf: matte(0x688c57), darkLeaf: matte(0x344c3a),
  };
  const room = addGroup(THREE, bay, 'Aurora royal sleeping chamber');
  const details = new THREE.Group();
  buildAuroraFloor(THREE, document, parts, room, outline, exhibit.bounds);
  buildAuroraWalls({ THREE, document, parts, room, details, outline, palette, bounds: exhibit.bounds });
  batch(details, room);
  buildRoyalBed({ THREE, parts, room, palette, exhibit, obstacles, toWorld });
  const pose = buildSleepingBeauty(THREE, parts, room, palette);
  const glow = buildEnchantedRose(THREE, document, parts, room, palette);
  addRoundSolid(obstacles, ...toWorld(roseSite.x, roseSite.z), .76, 1.49);

  let nearby = false;
  let blend = 0;
  let time = 0;
  let still = reducedMotion;
  function reset() {
    nearby = false;
    blend = time = 0;
    pose(0, 0, true);
    glow(0, 0, still);
  }
  reset();
  return {
    reset,
    update(dt, player, _grounded, motionReduced) {
      const [x, z] = toLocal(player.x, player.z);
      const radius = nearby ? roseSite.exitRadius : roseSite.entryRadius;
      nearby = (x - roseSite.x) ** 2 + (z - roseSite.z) ** 2 <= radius ** 2 &&
        Math.abs(player.y - EYE_HEIGHT) < roseSite.floorTolerance;
      const target = Number(nearby);
      const step = dt / transitionSeconds;
      if (motionReduced && still && blend === target) return;
      blend = motionReduced ? target : THREE.MathUtils.clamp(blend + (nearby ? step : -step), 0, 1);
      still = motionReduced;
      time = still ? 0 : time + dt;
      const amount = blend * blend * (3 - 2 * blend);
      pose(amount, time, still);
      glow(amount, time, still);
    },
  };
}
