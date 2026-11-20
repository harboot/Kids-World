import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { buildAuroraCharacter } from './aurora-character.js';
import { buildAuroraRoom } from './aurora-room.js';
import { addGallerySign, addRoundSolid, spaceTransform } from './parts.js';

const roseSite = { x: 3.24, z: .65 };
const entryRadius = 2.5;
const exitRadius = 2.92;
const wakeSeconds = 2;
const sleepSeconds = 1.9;

function buildRose(THREE, document, room, parts, exhibit, obstacles, palette, glowMap) {
  const { part, batch, matte } = parts;
  const { ivory, gold, mauve, plum, green, leaf, wine } = palette;
  const rose = addGroup(THREE, room, 'Enchanted rose', roseSite.x, 0, roseSite.z);
  const display = new THREE.Group();
  const stand = new THREE.LatheGeometry([
    [.73, 0], [.76, .10], [.71, .20], [.54, .25], [.49, .36], [.43, .43], [.40, 1.03],
    [.48, 1.15], [.65, 1.23], [.70, 1.33],
  ].map(([radius, y]) => new THREE.Vector2(radius, y)), 24);
  const fillet = new THREE.TorusGeometry(1, .055, 7, 36);
  part(display, stand, mauve, 0, 0, 0, 1, 1, 1);
  part(display, 'drum', plum, 0, 1.39, 0, .765, .19, .765);
  part(display, 'drum', ivory, 0, 1.49, 0, .788, .10, .788);
  for (const [y, r] of [[.14, .741], [.30, .518], [1.23, .65], [1.503, .778]]) {
    part(display, fillet, gold, 0, y, 0, r, r, r).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    part(display, 'gem', gold, Math.cos(a) * .47, .67, Math.sin(a) * .47, .087, .19, .087);
  }
  const plaqueZ = .74;
  for (const x of [-.24, .24]) part(display, 'box', gold, x, 1.03, .48, .09, .12, .39);
  part(display, 'box', gold, 0, 1.03, plaqueZ - .066, 2.18, .71, .12);
  part(display, 'box', plum, 0, 1.03, plaqueZ, 2.08, .64, .048);
  const sign = addGallerySign(THREE, document, rose, ['Approach the', 'Enchanted Rose'],
    0, 1.03, plaqueZ + .024 + SURFACE_GAP.detail, 2.03, .61);
  if (sign) sign.name = 'Approach the Enchanted Rose';

  const stem = new THREE.CatmullRomCurve3([
    [0, 1.52, 0], [-.12, 1.79, .008], [-.06, 2.08, .034], [.16, 2.38, -.014], [.23, 2.57, -.095],
  ].map(point => new THREE.Vector3(...point)));
  part(display, new THREE.TubeGeometry(stem, 20, .044, 7, false), green, 0, 0, 0, 1, 1, 1);
  const thorn = new THREE.ConeGeometry(1, 1, 5);
  for (let i = 0; i < 7; i++) {
    const t = .15 + i * .10;
    const point = stem.getPoint(t);
    const side = i % 2 ? -1 : 1;
    part(display, thorn, green, point.x + side * .048, point.y + .037, point.z + .023,
      .044, .156, .043).rotation.z = -side * .95;
    if (i % 3 !== 0) continue;
    const blade = part(display, 'sphere', leaf, point.x - side * .245, point.y + .137, point.z + .025,
      .112, .293, .040);
    blade.rotation.z = side * 1.01;
    parts.beam(display, green, [point.x, point.y, point.z + .04],
      [point.x - side * .385, point.y + .22, point.z + .056], .013);
  }

  const flower = addGroup(THREE, display, 'Rose petals', .23, 2.57, -.095);
  flower.rotation.x = .51;
  const outer = matte(0xb71f52, { emissive: 0xb51350 });
  const middle = matte(0xe53569, { emissive: 0xe22b69 });
  const heart = matte(0xff7297, { emissive: 0xf9498a });
  part(flower, 'sphere', wine, 0, .069, 0, .31, .145, .31);
  for (const [count, radius, y, width, height, tilt, material] of [
    [8, .279, .15, .157, .227, .75, outer],
    [7, .182, .235, .132, .186, .44, middle],
    [5, .086, .282, .104, .141, .22, outer],
    [3, .043, .322, .076, .086, .12, heart],
  ]) {
    for (let i = 0; i < count; i++) {
      const angle = (i + y * 3) * Math.PI * 2 / count;
      const petal = part(flower, 'sphere', material, Math.sin(angle) * radius, y, Math.cos(angle) * radius,
        width, height, .074);
      petal.rotation.set(tilt, angle, -.23, 'YXZ');
    }
  }
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * .4;
    part(flower, 'gem', leaf, .15 * Math.sin(angle), -.015, .15 * Math.cos(angle), .071, .15, .041)
      .rotation.set(.91, angle, 0, 'YXZ');
  }
  batch(display, rose);
  addRoundSolid(obstacles, ...spaceTransform(exhibit).toWorld(roseSite.x, roseSite.z), .762, 1.57);

  const aura = glowMap && new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowMap, color: 0xff69b2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  if (aura) {
    aura.position.set(.23, 2.78, -.06);
    aura.scale.set(2.9, 2.9, 1);
    rose.add(aura);
  }
  return function glow(blend) {
    outer.emissiveIntensity = .20 + .76 * blend;
    middle.emissiveIntensity = .29 + 1.1 * blend;
    heart.emissiveIntensity = .33 + 1.3 * blend;
    if (aura) aura.material.opacity = .13 + .34 * blend;
  };
}

function buildMagic(THREE, room, glowMap) {
  const random = seededRandom(261);
  const motes = Array.from({ length: 30 }, (_, index) => ({
    rose: index % 3 !== 1,
    angle: random() * Math.PI * 2,
    radius: .46 + random() * .93,
    height: random(),
    pace: .29 + random() * .33,
  }));
  const geometry = new THREE.BufferGeometry();
  const points = new THREE.Float32BufferAttribute(new Float32Array(motes.length * 3), 3);
  points.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', points);
  const material = new THREE.PointsMaterial({ color: 0xffbde8, size: .153, map: glowMap,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const dust = new THREE.Points(geometry, material);
  dust.name = 'Aurora magical particles';
  dust.frustumCulled = false;
  room.add(dust);
  return function pose(blend, time, reducedMotion) {
    const count = reducedMotion ? 0 : 9 + Math.round(blend * (motes.length - 9));
    dust.visible = count > 0;
    geometry.setDrawRange(0, count);
    material.opacity = .38 + .34 * blend;
    for (let i = 0; i < count; i++) {
      const { rose, angle, radius, height, pace } = motes[i];
      const a = angle + time * pace;
      const drift = Math.sin(height * 7 + time * pace * 1.9) * .23;
      points.setXYZ(i, (rose ? roseSite.x + .16 : 0) + Math.cos(a) * radius * (rose ? 1 : 2.6),
        (rose ? 2.05 : 1.50) + height * (rose ? 1.24 : 3.5) + drift,
        (rose ? roseSite.z : -5.10) + Math.sin(a) * radius * (rose ? .82 : 1.94));
    }
    points.needsUpdate = count > 0;
  };
}

export function buildAurora({ THREE, document, bay, exhibit, parts, obstacles, outline, reducedMotion = () => false }) {
  const { matte } = parts;
  const palette = {
    ivory: matte(0xe9d8d9),
    gold: matte(0xbf8b49),
    mauve: matte(0xa777a6),
    plum: matte(0x573557),
    velvet: matte(0x894b8d, { side: THREE.DoubleSide }),
    blush: matte(0xd582a7),
    wine: matte(0x8c365d),
    green: matte(0x355b45),
    leaf: matte(0x5f8653),
    bloom: matte(0xd978a6),
    crystal: matte(0xc5a8e9, { emissive: 0x9673bc, emissiveIntensity: .27 }),
    glow: matte(0xffdfb6, { emissive: 0xffb77e, emissiveIntensity: .49 }),
  };
  const room = addGroup(THREE, bay, 'Aurora royal sleeping chamber');
  const { bed, mattressTop } = buildAuroraRoom({ THREE, document, room, parts, exhibit, outline, obstacles, palette });
  const poseAurora = buildAuroraCharacter(THREE, bed, parts, mattressTop);
  const glowMap = paintCanvasTexture(THREE, document, 64, 64, (ink, w, h) => {
    const halo = ink.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    halo.addColorStop(0, '#ffffffff');
    halo.addColorStop(.25, '#ffffffb0');
    halo.addColorStop(.63, '#ffffff38');
    halo.addColorStop(1, '#ffffff00');
    ink.fillStyle = halo;
    ink.fillRect(0, 0, w, h);
  });
  const glowRose = buildRose(THREE, document, room, parts, exhibit, obstacles, palette, glowMap);
  const poseMagic = buildMagic(THREE, room, glowMap);
  const light = new THREE.PointLight(0xe4a4ff, 6, 9.2);
  light.name = 'Aurora bedlight';
  light.position.set(1.1, 3.95, -4.1);
  room.add(light);
  const sleepingLight = new THREE.Color(0xc28aff);
  const wakingLight = new THREE.Color(0xff9bd2);
  const { toLocal } = spaceTransform(exhibit);
  const local = [0, 0];
  let nearby = false;
  let blend = 0;
  let time = 0;

  function pose(reducedMotion) {
    poseAurora(blend, time, reducedMotion);
    const radiance = THREE.MathUtils.smoothstep(blend, 0, 1);
    glowRose(radiance);
    poseMagic(radiance, time, reducedMotion);
    light.intensity = 6 + radiance * 24;
    light.color.copy(sleepingLight).lerp(wakingLight, radiance);
  }

  function reset() {
    nearby = false;
    blend = time = 0;
    pose(reducedMotion());
  }
  reset();

  return {
    reset,
    update(dt, player, _grounded, still) {
      toLocal(player.x, player.z, local);
      const radius = nearby ? exitRadius : entryRadius;
      nearby = Math.abs(player.y - EYE_HEIGHT) < 1.5 &&
        (local[0] - roseSite.x) ** 2 + (local[1] - roseSite.z) ** 2 <= radius ** 2;
      if (still) {
        blend = Number(nearby);
        time = 0;
      } else {
        blend = THREE.MathUtils.clamp(blend + (nearby ? dt / wakeSeconds : -dt / sleepSeconds), 0, 1);
        time += dt;
      }
      pose(still);
    },
  };
}
