import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { addGallerySign, addRoundSolid, spaceTransform } from './parts.js';

const props = {
  belle({ THREE, part, gold, ivory, accent, model }) {
    for (const side of [-1, 1]) {
      const page = addGroup(THREE, model, '', side * .33, .10, 0);
      page.rotation.z = side * .19;
      part(page, 'box', accent, 0, -.038, 0, .72, .10, .87);
      part(page, 'box', ivory, 0, .035, 0, .67, .095, .81);
      for (let i = 0; i < 4; i++) part(page, 'box', gold, 0, .089, -.25 + i * .13, .47, .012, .026);
    }
  },
  jasmine({ THREE, part, beam, gold, ivory, model: lamp }) {
    part(lamp, 'sphere', gold, -.13, .24, 0, .44, .202, .23);
    part(lamp, 'drum', gold, -.13, .055, 0, .22, .10, .16);
    part(lamp, 'sphere', gold, -.15, .405, 0, .27, .086, .164);
    part(lamp, 'gem', ivory, -.14, .535, 0, .075, .103, .074);
    beam(lamp, gold, [.18, .26, 0], [.62, .44, 0], .17);
    part(lamp, 'sphere', gold, .53, .416, 0, .26, .096, .105).rotation.z = .29;
    part(lamp, new THREE.TorusGeometry(.18, .035, 8, 20), gold, -.51, .32, 0, 1, 1, 1);
  },
  mulan({ THREE, part, beam, gold, accent, model: group }) {
    const shape = new THREE.Shape();
    shape.moveTo(0, .07);
    shape.absarc(0, .07, .72, .18, Math.PI - .18, false);
    shape.closePath();
    part(group, new THREE.ShapeGeometry(shape, 18), accent, 0, 0, 0, 1, 1, 1).material.side = THREE.DoubleSide;
    for (let i = 0; i < 9; i++) {
      const a = .22 + i * .338;
      beam(group, gold, [0, .08, .025], [.705 * Math.cos(a), .07 + .705 * Math.sin(a), .025], .026);
    }
    part(group, 'gem', gold, 0, .069, .056, .074, .080, .034);
  },
  moana({ part, beam, gold, ivory, accent, model: paddle }) {
    beam(paddle, gold, [-.46, .08, 0], [.28, .68, 0], .095);
    part(paddle, 'sphere', accent, .36, .73, 0, .158, .303, .055).rotation.z = -.71;
    part(paddle, 'gem', ivory, .36, .73, .053, .074, .143, .018).rotation.z = -.71;
    part(paddle, 'sphere', gold, -.49, .064, 0, .13, .085, .08).rotation.z = -.71;
  },
  tiana({ part, gold, ivory, accent, model: lily }) {
    part(lily, 'sphere', accent, 0, .059, 0, .56, .093, .45);
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      const petal = part(lily, 'sphere', ivory, .20 * Math.sin(a), .20, .20 * Math.cos(a), .093, .068, .20);
      petal.rotation.set(-.41, a, 0, 'YXZ');
    }
    part(lily, 'sphere', gold, 0, .28, 0, .16, .099, .16);
  },
};

export function buildPreviewDisplay({ THREE, document, bay, parts, exhibit, obstacles, palette }) {
  const { part, batch, matte } = parts;
  const { gold, plum, ivory } = palette;
  const z = -exhibit.bounds.depth * .24;
  const display = addGroup(THREE, bay, 'Story display', 0, 0, z);
  const details = new THREE.Group();
  part(details, 'drum', plum, 0, .30, 0, 1.38, .60, 1.38);
  part(details, 'drum', gold, 0, .64, 0, 1.32, .13, 1.32);
  part(details, 'drum', plum, 0, .73, 0, 1.18, .10, 1.18);
  part(details, 'box', gold, 0, .36, 1.32, 2.30, .53, .108);
  addGallerySign(THREE, document, display, ['Approach the ' + exhibit.display], 0, .36,
    1.32 + .054 + SURFACE_GAP.detail, 2.17, .46);
  batch(details, display);

  const artifact = addGroup(THREE, display, exhibit.display, 0, .80, 0);
  const model = new THREE.Group();
  const color = matte(exhibit.accent);
  props[exhibit.id]({ ...parts, THREE, gold, ivory, accent: color, model });
  batch(model, artifact);
  const glow = matte(exhibit.accent, { emissive: exhibit.accent, emissiveIntensity: .16 });
  const seal = part(display, 'drum', glow, 0, .79, 0, .87, .077, .87);
  seal.name = 'Story display glow';

  const [x, worldZ] = spaceTransform(exhibit).toWorld(0, z);
  addRoundSolid(obstacles, x, worldZ, 1.55, 2.30);
  let blend = 0;
  function pose() {
    artifact.position.y = .84 + .26 * blend;
    artifact.rotation.y = blend * .41;
    glow.emissiveIntensity = .16 + .80 * blend;
  }
  function reset() {
    blend = 0;
    pose();
  }
  reset();
  return {
    reset,
    update(dt, player, _grounded, still) {
      const close = (player.x - x) ** 2 + (player.z - worldZ) ** 2 <= 3.4 ** 2 &&
        Math.abs(player.y - EYE_HEIGHT) < 1.35;
      const target = Number(close);
      if (blend === target) return close;
      blend = still ? target : THREE.MathUtils.damp(blend, target, 6, dt);
      if (Math.abs(blend - target) < .001) blend = target;
      pose();
      return close;
    },
  };
}
