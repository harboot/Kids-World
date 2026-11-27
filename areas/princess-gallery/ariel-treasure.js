import { cueSource, galleryCues } from './interaction-audio.js';
import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { addSolid, spaceTransform } from './parts.js';

export function buildArielTreasure({ THREE, room, parts, palette, exhibit, obstacles, camera, isActive, reducedMotion, playCue = () => {} }) {
  const { part, batch, matte } = parts;
  const { gold, teal, ivory, deep } = palette;
  const wood = matte(0x785344);
  const chest = addGroup(THREE, room, 'Ariel treasure chest', 5.29, 0, -2.72, -.38);
  const body = new THREE.Group();
  part(body, 'box', wood, 0, .17, 0, 1.64, .25, 1.02);
  for (const x of [-.751, .751]) part(body, 'box', wood, x, .477, 0, .138, .449, 1.02);
  for (const z of [-.448, .448]) part(body, 'box', wood, 0, .477, z, 1.36, .449, .124);
  part(body, 'box', deep, 0, .53, 0, 1.34, .11, .76);
  for (const x of [-.69, .69]) {
    part(body, 'box', gold, x, .37, .519, .125, .65, .05);
    part(body, 'box', gold, x, .678, 0, .137, .043, 1.065);
  }
  part(body, 'box', gold, 0, .61, .545, .205, .17, .063);
  part(body, 'gem', deep, 0, .595, .577 + SURFACE_GAP.detail, .034, .052, .024);
  batch(body, chest);

  const hinge = addGroup(THREE, chest, 'Ariel treasure chest lid', 0, .703, -.50);
  const lid = new THREE.Group();
  part(lid, 'box', wood, 0, .107, .50, 1.66, .21, 1.04);
  part(lid, 'box', teal, 0, -.018, .51, 1.37, .04, .77);
  for (const x of [-.59, .59]) part(lid, 'box', gold, x, .225, .51, .10, .034, 1.035);
  part(lid, 'box', gold, 0, .114, 1.035, .114, .194, .048);
  batch(lid, hinge);

  const contents = addGroup(THREE, chest, 'Ariel chest treasure');
  const loot = new THREE.Group();
  const random = seededRandom(142);
  for (let i = 0; i < 25; i++) {
    part(loot, 'drum', gold, (random() - .5) * 1.23, .595 + random() * .054, (random() - .5) * .69,
      .086, .019, .086).rotation.z = random() * .56 - .28;
  }
  for (const [x, z, color] of [[-.43, .13, ivory], [.31, .06, teal], [0, -.14, ivory]]) {
    part(loot, 'gem', color, x, .673, z, .132, .158, .122).rotation.z = x;
  }
  batch(loot, contents);

  const { toWorld } = spaceTransform(exhibit);
  const [x, z] = toWorld(chest.position.x, chest.position.z);
  const yaw = exhibit.rotation + chest.rotation.y;
  addSolid(obstacles, x, z, 1.85, 1.28, 1.72, yaw);
  const chestSpace = spaceTransform({ position: { x, z }, rotation: yaw });
  const [anchorX, anchorZ] = chestSpace.toWorld(0, .60);
  const local = [0, 0];
  const radius = 2.46;
  let opened = false;
  let amount = 0;

  function render() {
    hinge.rotation.x = -1.23 * THREE.MathUtils.smoothstep(amount, 0, 1);
    contents.visible = amount > .19;
  }
  function reachable(player) {
    const [px, pz] = chestSpace.toLocal(player.x, player.z, local);
    return pz > .84 && Math.abs(px) < 1.56 && Math.abs(player.y - EYE_HEIGHT) < .68 &&
      px * px + (pz - .60) ** 2 <= radius * radius;
  }
  return {
    interaction: {
      x: anchorX, z: anchorZ, radius, anchorY: .86, requiresView: true, silent: true,
      get active() { return isActive(); },
      get label() { return opened ? 'Close treasure chest' : 'Open treasure chest'; },
      reachable,
      act() {
        if (!isActive() || !camera || !reachable(camera.position)) return;
        opened = !opened;
        playCue(opened ? galleryCues.chestOpen : galleryCues.chestClose,cueSource(x,z,EYE_HEIGHT,6));
        if (reducedMotion()) {
          amount = Number(opened);
          render();
        }
      },
    },
    reset() {
      opened = false;
      amount = 0;
      render();
    },
    update(dt, still) {
      const target = Number(opened);
      if (amount === target) return;
      amount = still ? target : THREE.MathUtils.clamp(amount + (opened ? 1 : -1) * dt * 2.1, 0, 1);
      render();
    },
  };
}
