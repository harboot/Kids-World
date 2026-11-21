import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';

const patch = { x: 11.6, z: 3.5 };
const tray = { x: 15.24, z: 4.04 };
const homes = [
  [14.24, 10.3, 0xe6daca, -.6], [15.2, 12.9, 0xa38472, .8], [16.8, 14.18, 0xd1baa5, -.95],
  [18.73, 13.93, 0xeae0d2, 2.05], [18.28, 10.9, 0x9a9392, 2.8],
];
const smooth = t => t * t * (3 - 2 * t);

export function addRabbits(THREE, { scene, mesh, box, facet, matte, obstacles, collision, getTerrainHeight,
  playerRadius, signal, reducedMotion, feedRabbits, batchParts }) {
  const soil = matte(0x8f6847);
  const furWhite = matte(0xf5e8d6);
  const stalk = matte(0x619b42);
  const jade = matte(0x507839);
  const carrotOrange = matte(0xe78331);
  const pink = matte(0xdba8a5);
  const eyes = matte(0x302727);
  const rootShape = new THREE.ConeGeometry(1, 1, 7);
  const rounded = new THREE.SphereGeometry(1, 9, 7);
  const rim = matte(0xb08558);
  const grove = addGroup(THREE, scene, 'Carrot patch', patch.x, getTerrainHeight(patch.x, patch.z), patch.z);
  const feeder = addGroup(THREE, scene, 'Rabbit feeding tray', tray.x, getTerrainHeight(tray.x, tray.z), tray.z);
  const part = (parent, shape, color, x, y, z, w, h, d) => mesh(shape, color, x, y, z, w, h, d, parent);

  function carrot(parent, x, y, z, lying = false) {
    const bunch = addGroup(THREE, parent, 'Carrot', x, y, z);
    part(bunch, rootShape, carrotOrange, 0, 0, 0, .092, .34, .092).rotation.z = Math.PI;
    for (const side of [-1, 0, 1]) {
      const leaf = part(bunch, facet, side === 0 ? jade : stalk, side * .067, .232, 0, .045, .15, .044);
      leaf.rotation.z = -side * .49;
    }
    if (lying) bunch.rotation.set(Math.PI / 2, 0, x * 1.3);
    batchParts(bunch);
    return bunch;
  }

  const crops = [];
  for (const row of [-1, 0, 1]) {
    const z = row * .46;
    part(grove, box, soil, 0, .043 + SURFACE_GAP.detail, z, 2.22, .1, .32);
    for (let col = -2; col <= 2; col++) crops.push(carrot(grove, col * .418, .101, z));
  }
  const sign = addGroup(THREE, grove, 'Carrot patch marker', -1.23, 0, -.5);
  part(sign, box, rim, 0, .48, 0, .1, .96, .105);
  part(sign, box, soil, 0, .865, 0, .6, .37, .115);
  carrot(sign, 0, .842, .088).scale.setScalar(.65);

  part(feeder, box, rim, 0, .127, 0, 1.32, .13, .72);
  part(feeder, box, soil, 0, .199, 0, 1.22, .022, .63);
  for (const side of [-1, 1]) {
    part(feeder, box, rim, side * .627, .227, 0, .067, .119, .72);
    part(feeder, box, rim, 0, .227, side * .329, 1.187, .119, .061);
  }
  obstacles.push(collision(tray.x, tray.z, 1.32, .72, feeder.position.y + .29));
  const food = homes.map((_, i) => carrot(feeder, (i - 2) * .219, .281, 0, true));

  batchParts(grove);
  batchParts(sign);
  batchParts(feeder);

  const rabbits = homes.map(([x, z, color, yaw], index) => {
    const fur = matte(color);
    const root = addGroup(THREE, scene, `Hill rabbit ${index + 1}`, x, 0, z);
    const body = addGroup(THREE, root, 'Rabbit body');
    part(body, rounded, fur, 0, .3, -.115, .288, .292, .394);
    part(body, facet, furWhite, 0, .43, -.492, .121, .128, .13);
    const head = addGroup(THREE, body, 'Rabbit head', 0, .472, .194);
    part(head, rounded, fur, 0, .105, .02, .216, .229, .206);
    part(head, rounded, furWhite, 0, .035, .17, .148, .108, .098);
    part(head, facet, pink, 0, .09, .249, .057, .043, .039);
    const ears = [];
    for (const side of [-1, 1]) {
      part(body, rounded, fur, side * .224, .133, -.14, .132, .127, .226);
      part(body, rounded, furWhite, side * .109, .08, .221, .086, .073, .137);
      part(head, rounded, eyes, side * .162, .16, .151, .05, .052, .038);
      part(head, rounded, furWhite, side * .163, .178, .181, .016, .015, .011);
      const ear = addGroup(THREE, head, 'Rabbit ear', side * .12, .246, -.004);
      part(ear, rounded, fur, 0, .18, 0, .082, .247, .074);
      part(ear, rounded, pink, 0, .2, .053, .051, .181, .027);
      batchParts(ear);
      ears.push(ear);
    }
    batchParts(head);
    batchParts(body);
    const tx = tray.x + (index - 2) * .67;
    const tz = tray.z + .92 - Math.abs(index - 2) * .075;
    return { x, z, yaw, tx, tz, root, head, ears, progress: 0 };
  });

  const available = () => !signal?.aborted;
  let phase = 'idle';
  let held = false;
  let elapsed = 0;
  let feedingTime = 0;

  function pose(rabbit, i, still) {
    const { progress, x, z, tx, tz, yaw, root, head, ears } = rabbit;
    const t = smooth(progress);
    const hopping = progress > 0 && progress < 1;
    const px = x + (tx - x) * t;
    const pz = z + (tz - z) * t;
    const hop = hopping && !still ? Math.abs(Math.sin(progress * Math.PI * 8)) * .2 : 0;
    root.position.set(px, getTerrainHeight(px, pz) + hop, pz);
    const goingHome = phase === 'return';
    root.rotation.y = progress === 0 ? yaw : Math.atan2(tx - x, tz - z) + (goingHome ? Math.PI : 0);
    head.rotation.x = phase === 'eat' ? .33 + (still ? 0 : Math.sin(elapsed * 14 + i) * .11) : 0;
    ears.forEach((ear, e) => {
      const side = 2 * e - 1;
      ear.rotation.z = -side * .16 + (still ? 0 : Math.sin(elapsed * 2.6 + i + side) * .055);
    });
  }

  function pickCarrots() {
    if (!available() || held || phase !== 'idle') return;
    held = true;
    crops[2].visible = false;
    crops[7].visible = false;
    crops[12].visible = false;
  }

  function beginFeeding() {
    if (!available() || !held || phase !== 'idle') return;
    held = false;
    phase = 'approach';
    food.forEach(item => { item.visible = true; });
  }

  const nearGround = position => Math.abs(position.y - getTerrainHeight(position.x, position.z) - EYE_HEIGHT) < .65;
  return {
    interactions: [
      { ...patch, label: 'Pick carrots', anchorY: .61, radius: 1.9, reachable: nearGround,
        get active() { return available() && !held && phase === 'idle'; }, act: pickCarrots },
      { ...tray, label: 'Feed the rabbits', anchorY: .48, radius: 2.1,
        reachable: position => position.z < tray.z + .22 && nearGround(position),
        get active() { return available() && held && phase === 'idle'; }, act: beginFeeding },
    ],
    get hasCarrots() { return held; },
    get feeding() { return phase === 'approach' || phase === 'eat'; },
    blocks(x, z, feet) {
      return rabbits.some(({ root }) => feet < root.position.y + .85 &&
        Math.hypot(x - root.position.x, z - root.position.z) < playerRadius + .31);
    },
    update(dt, player) {
      if (!available()) return;
      elapsed += dt;
      const still = reducedMotion?.();
      if (phase === 'approach' || phase === 'return') {
        const toward = phase === 'approach';
        let arrived = true;
        rabbits.forEach((rabbit, i) => {
          const { x, z, tx, tz, progress } = rabbit;
          const next = still ? Number(toward) : THREE.MathUtils.clamp(progress + (toward ? 1 : -1) * dt / (2.28 + i * .24), 0, 1);
          const t = smooth(next);
          const px = x + (tx - x) * t;
          const pz = z + (tz - z) * t;
          if (still || !player || Math.hypot(player.x - px, player.z - pz) > playerRadius + .42 ||
              player.y > getTerrainHeight(px, pz) + EYE_HEIGHT + .9) rabbit.progress = next;
          if (rabbit.progress !== Number(toward)) arrived = false;
        });
        if (arrived) {
          phase = toward ? 'eat' : 'idle';
          if (toward) {
            feedingTime = 0;
            feedRabbits();
          } else crops.forEach(item => { item.visible = true; });
        }
      } else if (phase === 'eat') {
        feedingTime += dt;
        food.forEach((item, i) => { item.visible = feedingTime < .68 + i * .29; });
        if (feedingTime >= 2.55) phase = 'return';
      }
      rabbits.forEach((rabbit, index) => pose(rabbit, index, still));
    },
    reset() {
      phase = 'idle';
      held = false;
      elapsed = 0;
      feedingTime = 0;
      food.forEach(item => { item.visible = false; });
      crops.forEach(item => { item.visible = true; });
      rabbits.forEach((rabbit, index) => {
        rabbit.progress = 0;
        pose(rabbit, index, true);
      });
    },
  };
}
