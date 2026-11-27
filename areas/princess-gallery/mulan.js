import { cueSource } from './interaction-audio.js';
import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { buildMulanCharacter, MULAN_DEMONSTRATION_TIME } from './mulan-character.js';
import { buildMulanGarden } from './mulan-garden.js';
import { addGallerySign, addSolid, spaceTransform } from './parts.js';

export const GONG_SITE = Object.freeze({ x: -2.92, z: 3.01 });
const strikeTime = .19;
const gongCue = [
  [37, { endPitch: 35, duration: 1.9, level: .23, attack: .018, wave: 'triangle' }, strikeTime],
  [49, { duration: 1.6, level: .097, attack: .025 }, strikeTime],
  [63, { endPitch: 62, duration: 1.1, level: .056, attack: .010 }, strikeTime + .01],
  [70, { duration: .52, level: .049, attack: .008 }, strikeTime],
];

export function buildMulan(context) {
  const { THREE, document, bay, parts, exhibit, obstacles, camera, reducedMotion, isActive, playCue } = context;
  const { part, batch, matte } = parts;
  const { toWorld, toLocal } = spaceTransform(exhibit);
  const room = addGroup(THREE, bay, 'Mulan cherry blossom garden');
  const colors = {
    red: matte(0xa4444b),
    shade: matte(0x684353),
    cream: matte(0xffe2b3),
    stone: matte(0x8f9494),
    gold: matte(0xe4b167),
    roof: matte(0xffffff, { vertexColors: true, flatShading: true }),
  };
  const { red, shade, cream, stone, gold } = colors;
  const garden = { ...context, room, colors, toWorld };
  buildMulanGarden(garden);
  const mulan = buildMulanCharacter(garden);

  const { x, z } = GONG_SITE;
  const yaw = .32;
  const [wx, wz] = toWorld(x, z);
  const frame = addGroup(THREE, room, 'Great gong', x, 0, z, yaw);
  const details = new THREE.Group();
  const darkBrass = matte(0xb07c4a);
  const bronze = matte(0xd49e52);
  const glow = matte(0xf9c46c, { emissive: 0xe6994b, emissiveIntensity: .12 });
  const disk = new THREE.CylinderGeometry(1, 1, 1, 24);
  for (const side of [-1, 1]) {
    part(details, 'box', stone, side * 1.43, .15, 0, .58, .30, .99);
    part(details, 'box', red, side * 1.43, 1.63, 0, .25, 2.89, .28);
    part(details, 'box', gold, side * 1.43, 2.90, 0, .33, .10, .34);
    part(details, 'gem', gold, side * 1.43, 3.36, 0, .24, .24, .24);
  }
  part(details, 'box', shade, 0, 3.09, 0, 3.42, .20, .35);
  part(details, 'box', red, 0, 3.23, 0, 3.23, .13, .43);
  part(details, 'box', shade, 0, .177, .20, 2.18, .31, .16);
  batch(details, frame);
  addGallerySign(THREE, document, frame, ['Strike the Great Gong'], 0, .177,
    .28 + SURFACE_GAP.detail, 2.04, .26);
  addSolid(obstacles, wx, wz, 3.48, .99, 3.36, exhibit.rotation + yaw);

  const gong = addGroup(THREE, frame, 'Suspended bronze disk', 0, 3.015, .026);
  const bronzeParts = new THREE.Group();
  for (const side of [-1, 1]) {
    parts.beam(bronzeParts, shade, [side * .71, 0, 0], [side * .54, -.45, 0], .042);
  }
  part(bronzeParts, disk, darkBrass, 0, -1.338, 0, 1.05, .14, 1.05).rotation.x = Math.PI / 2;
  part(bronzeParts, new THREE.TorusGeometry(.936, .035, 5, 24), gold, 0, -1.338, .085, 1, 1, 1);
  part(bronzeParts, disk, bronze, 0, -1.338, .051, .901, .076, .901).rotation.x = Math.PI / 2;
  part(bronzeParts, disk, gold, 0, -1.338, .097, .36, .080, .36).rotation.x = Math.PI / 2;
  part(bronzeParts, 'ball', glow, 0, -1.338, .132, .268, .267, .111);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    part(bronzeParts, 'gem', gold, Math.cos(angle) * .73, -1.338 + Math.sin(angle) * .73,
      .092, .041, .041, .021);
  }
  batch(bronzeParts, gong);

  const mallet = addGroup(THREE, frame, 'Gong mallet', .43, 3.045, .71);
  part(mallet, 'box', shade, 0, -.59, 0, .076, 1.19, .076);
  part(mallet, 'ball', red, 0, -1.23, 0, .139, .15, .148);
  part(mallet, 'gem', cream, 0, -.053, 0, .061, .065, .061);

  const local = [];
  function near(position) {
    return position && Math.abs(position.y - EYE_HEIGHT) <= .28 &&
      Math.hypot(position.x - wx, position.z - wz) <= 2.65 &&
      toLocal(position.x, position.z, local)[1] > z + .47;
  }

  let time = null;
  function reset() {
    time = null;
    gong.rotation.x = 0;
    mallet.rotation.x = -.18;
    glow.emissiveIntensity = .12;
    mulan.reset();
  }
  reset();
  function pose(still) {
    if (still) {
      gong.rotation.x = 0;
      mallet.rotation.x = -.18;
      glow.emissiveIntensity = .41;
      mulan.perform(time, true);
      return;
    }
    const swing = time < strikeTime ? THREE.MathUtils.smoothstep(time, 0, strikeTime)
      : 1 - THREE.MathUtils.smoothstep(time, strikeTime, .72);
    mallet.rotation.x = -.18 + .56 * swing;
    const ring = Math.max(0, time - strikeTime);
    gong.rotation.x = .12 * Math.sin(ring * 14.5) * Math.exp(-ring * 1.72);
    glow.emissiveIntensity = .12 + (time < strikeTime ? 0 : .74 * Math.exp(-ring * 1.65));
    mulan.perform(ring, false);
  }
  const interaction = {
    x: wx, z: wz, anchorY: 1.70, radius: 2.65, label: 'Strike the great gong',
    requiresView: true, silent: true, reachable: near,
    get active() { return isActive() && time === null; },
    act() {
      if (!this.active || !near(camera?.position)) return;
      time = 0;
      playCue(gongCue,cueSource(wx,wz,EYE_HEIGHT,9));
      pose(reducedMotion());
    },
  };
  return {
    interactions: [interaction],
    update(_dt, _player, _grounded, still, elapsed = _dt) {
      if (time === null) return false;
      time += elapsed;
      if (time >= MULAN_DEMONSTRATION_TIME + strikeTime) {
        reset();
        return true;
      }
      pose(still);
      return false;
    },
    reset,
  };
}
