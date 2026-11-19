import { walkElevation } from '../../core/movement.js';
import { buildVillager } from './villager.js';

const lostSite = { x: -11.9, z: -6.0 };
const keeperSite = { x: -29.25, z: 26.02 };
const stableSite = { x: -28.25, z: 23.3 };
const gap = 2.65;
const personalSpace = 2.10;
const stride = 0.32;
const speed = 4.35;
const happyCue = [[69, { duration: 0.25, level: 0.13 }], [76, { duration: 0.3, level: 0.10 }, 0.12],
  [81, { duration: 0.38, level: 0.12 }, 0.22]];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createReindeer({ kit, terrain, isActive, notify, playCue, onComplete }) {
  const ground = terrain.getGroundHeight;
  const poseKeeper = buildVillager(kit, keeperSite, ground,
    { name: 'Stable keeper', yaw: Math.PI, coat: 0xa55d44, apron: 0x748458, hair: 0xa8814d });
  const { deer, body, head, tail, legs } = buildReindeer(kit);
  const trail = [];
  let lastMark;
  let state;
  let walked;
  let happiness;
  let blockedFor;
  let retryIn;

  function stepIsClear(from, x, z) {
    const elevation = walkElevation(terrain, from, x, z, ground(from.x, from.z), true);
    return elevation !== null && elevation <= ground(x, z) + 1e-5;
  }

  function clearSegment(from, to) {
    const steps = Math.ceil(distance(from, to) / 0.18);
    let previous = from;
    for (let i = 1; i <= steps; i++) {
      const x = from.x + (to.x - from.x) * i / steps;
      const z = from.z + (to.z - from.z) * i / steps;
      if (!stepIsClear(previous, x, z)) return false;
      previous = { x, z };
    }
    return true;
  }

  function repairTrail() {
    const from = deer.position;
    // First reconnect to the player's next clear footprint. This also smooths turns near corners.
    for (let i = 1; i < Math.min(trail.length, 9); i++) {
      if (!clearSegment(from, trail[i])) continue;
      trail.splice(0, i);
      return;
    }

    // A player can jump over short props. Try a short detour on either side of that segment.
    const target = trail[Math.min(trail.length - 1, 4)];
    if (!target) return;
    const dx = target.x - from.x;
    const dz = target.z - from.z;
    const span = Math.hypot(dx, dz);
    if (span < 0.01) return;
    for (const nudge of [0.7, -0.7, 1.35, -1.35, 2.1, -2.1]) {
      const x = dz / span * nudge;
      const z = -dx / span * nudge;
      const around = { x: from.x + x, z: from.z + z };
      const back = { x: target.x + x, z: target.z + z };
      if (clearSegment(from, around) && clearSegment(around, back) && clearSegment(back, target)) {
        trail.splice(0, trail.indexOf(target), around, back);
        return;
      }
    }
  }

  function walkDirection(angle, length, dt) {
    const from = deer.position;
    const x = from.x + Math.sin(angle) * length;
    const z = from.z + Math.cos(angle) * length;
    if (!stepIsClear(from, x, z)) return false;
    deer.rotation.y += Math.atan2(Math.sin(angle - deer.rotation.y), Math.cos(angle - deer.rotation.y)) * Math.min(1, dt * 13);
    from.set(x, ground(x, z), z);
    walked += length;
    return true;
  }

  function leaveSpace(dt, player, distanceToPlayer) {
    const from = deer.position;
    const away = distanceToPlayer > 0.001
      ? Math.atan2(from.x - player.x, from.z - player.z)
      : deer.rotation.y + Math.PI;
    const length = Math.min(2.6 * dt, personalSpace - distanceToPlayer);
    for (const turn of [0, 0.65, -0.65, 1.15, -1.15]) {
      if (!walkDirection(away + turn, length, dt)) continue;
      trail.length = 0;
      lastMark = null;
      return true;
    }
    return false;
  }

  function follow(dt, player) {
    if (player.y > ground(player.x, player.z) + 3.15) return false;
    const from = deer.position;
    const distanceToPlayer = distance(from, player);
    if (distanceToPlayer < personalSpace) return leaveSpace(dt, player, distanceToPlayer);

    const nearPlayer = distanceToPlayer < gap;
    if ((!lastMark || distance(player, lastMark) >= stride) && stepIsClear(player, player.x, player.z)) {
      lastMark = { x: player.x, z: player.z };
      if (nearPlayer && clearSegment(from, lastMark)) trail.length = 0;
      trail.push(lastMark);
    }
    if (nearPlayer) return false;

    while (trail.length && distance(from, trail[0]) < 0.09) trail.shift();
    const target = trail[0];
    if (!target) return false;
    const length = Math.min(speed * dt, distance(from, target), distanceToPlayer - gap);
    if (length < 1e-6) return false;
    const angle = Math.atan2(target.x - from.x, target.z - from.z);
    if (walkDirection(angle, length, dt)) {
      blockedFor = retryIn = 0;
      return true;
    }

    blockedFor += dt;
    retryIn -= dt;
    if (retryIn <= 0) {
      repairTrail();
      retryIn = 0.45;
    }
    if (blockedFor >= 3.2) {
      state = 'waiting';
      trail.length = 0;
      notify('Your reindeer is waiting. Return to it and choose a clear path together.');
    }
    return false;
  }

  function canHandOver() {
    const from = deer.position;
    return (state === 'following' || state === 'waiting') &&
      distance(from, stableSite) <= 4.65 && clearSegment(from, stableSite);
  }

  function returnToTrough(dt) {
    const from = deer.position;
    const remaining = distance(from, stableSite);
    if (remaining > 0.12) {
      const angle = Math.atan2(stableSite.x - from.x, stableSite.z - from.z);
      return walkDirection(angle, Math.min(2.5 * dt, remaining), dt);
    }
    state = 'returned';
    happiness = 1.35;
    notify('Stable keeper: Thank you for bringing our reindeer home!');
    playCue(happyCue);
    onComplete();
    return false;
  }

  function pose(elapsed, still, moving) {
    const time = still ? 0 : elapsed;
    const hop = !still && happiness > 0 ? Math.abs(Math.sin((1.35 - happiness) * 11)) * happiness * 0.19 : 0;
    body.position.y = hop;
    body.scale.y = 1 + Math.sin(time * 2.1) * 0.025;
    head.rotation.x = still ? 0 : Math.sin(time * 1.7) * (moving ? 0.039 : 0.095);
    head.rotation.y = still || moving ? 0 : Math.sin(time * 0.83) * 0.18;
    tail.rotation.x = still ? 0 : Math.sin(time * (happiness > 0 ? 11 : 2.6)) * (happiness > 0 ? 0.43 : 0.12);
    legs.forEach(({ node, phase }) => {
      node.position.y = 0.57 + hop;
      node.rotation.x = still || !moving ? 0 : Math.sin(walked * 10.5) * 0.46 * phase;
    });
    poseKeeper(time, still);
  }

  return {
    interactions: [{
      ...keeperSite, radius: 1.85, anchorY: 1.35,
      get label() { return canHandOver() ? 'Return Reindeer' : 'Talk to Stable Keeper'; },
      get active() { return isActive() && state !== 'returning' && state !== 'returned'; },
      act() {
        if (!this.active) return;
        if (canHandOver()) {
          state = 'returning';
          trail.length = 0;
          notify('Stable keeper: I’ll take the reindeer to its feeding spot.');
        } else {
          notify(state === 'following' || state === 'waiting'
            ? 'Stable keeper: Bring the reindeer through the gate, then come talk to me.'
            : 'Stable keeper: Our reindeer wandered into the west lanes. Can you bring it home?');
        }
      },
    }, {
      get x() { return deer.position.x; },
      get z() { return deer.position.z; },
      get anchorY() { return deer.position.y + 1.08; },
      label: 'Follow Me', radius: 1.95,
      get active() { return isActive() && (state === 'lost' || state === 'waiting'); },
      act() {
        if (!this.active) return;
        state = 'following';
        trail.length = 0;
        lastMark = null;
        blockedFor = retryIn = 0;
        notify('The reindeer is following you. Lead it over the bridge and talk to the stable keeper.');
      },
    }],
    get complete() { return state === 'returned'; },
    get progress() { return `Return the lost reindeer · ${state === 'returned' ? 1 : 0}/1`; },
    reset() {
      state = 'lost';
      lastMark = null;
      trail.length = 0;
      walked = happiness = blockedFor = retryIn = 0;
      deer.position.set(lostSite.x, ground(lostSite.x, lostSite.z), lostSite.z);
      deer.rotation.y = 0.68;
      pose(0, true, false);
    },
    update(dt, player, elapsed, still) {
      const moving = state === 'returning' ? returnToTrough(dt) : state === 'following' && player && follow(dt, player);
      happiness = Math.max(0, happiness - dt);
      pose(elapsed, still, moving);
    },
  };
}

function buildReindeer({ group, part, box, beam }) {
  const deer = group('Lost reindeer', 0, 0, 0);
  const body = group('Reindeer body', 0, 0, 0, 0, deer);
  const coat = 0xab7352;
  const dark = 0x6b4839;
  const cream = 0xe7c995;
  part(body, 'rock', coat, 0, 0.67, -0.08, 0.28, 0.29, 0.51, { batch: body });
  part(body, 'rock', cream, 0, 0.72, 0.22, 0.207, 0.24, 0.25, { batch: body });
  part(body, 'rock', coat, 0, 0.91, 0.23, 0.20, 0.35, 0.23, { batch: body });

  const head = group('Reindeer head', 0, 1.10, 0.31, 0, body);
  const headBatch = { batch: head };
  part(head, 'rock', coat, 0, 0.13, 0.10, 0.235, 0.24, 0.285, headBatch);
  part(head, 'rock', cream, 0, 0.038, 0.283, 0.176, 0.122, 0.17, headBatch);
  part(head, 'rock', 0x483532, 0, 0.081, 0.389, 0.093, 0.068, 0.061, headBatch);
  for (const side of [-1, 1]) {
    part(head, 'gem', 0x332b2a, side * 0.16, 0.168, 0.256, 0.035, 0.048, 0.031, headBatch);
    part(head, 'rock', coat, side * 0.25, 0.26, 0.03, 0.12, 0.105, 0.072, headBatch);
    part(head, 'rock', 0xd09381, side * 0.27, 0.27, 0.072, 0.087, 0.068, 0.035, headBatch);
    const stalk = [side * 0.17, 0.41, 0.04];
    beam(head, dark, [side * 0.102, 0.29, 0.09], stalk, 0.047, 0.043, headBatch);
    beam(head, dark, stalk, [side * 0.21, 0.63, -0.02], 0.041, 0.041, headBatch);
    beam(head, dark, [side * 0.195, 0.52, 0.012], [side * 0.278, 0.59, 0.065], 0.035, 0.032, headBatch);
  }
  const tail = group('Reindeer tail', 0, 0.76, -0.51, 0, body);
  part(tail, 'rock', cream, 0, 0.031, -0.085, 0.076, 0.082, 0.12, { batch: tail });
  const legs = [];
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const node = group('Reindeer leg', side * 0.15, 0.57, end * 0.235 - 0.05, 0, deer);
      const batch = { batch: node };
      box(node, coat, 0, -0.22, 0, 0.114, 0.47, 0.127, batch);
      box(node, dark, 0, -0.50, 0.027, 0.122, 0.14, 0.163, batch);
      legs.push({ node, phase: side * end });
    }
  }
  return { deer, body, head, tail, legs };
}
