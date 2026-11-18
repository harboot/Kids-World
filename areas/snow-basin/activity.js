export const CHOPS = 5;
export const CHOP_COOLDOWN = 0.32;
export const FALL_DURATION = 1.45;
export const BREAK_DURATION = 0.62;
export const BALL_RADIUS = 0.15;
export const SNOWMAN_COUNT = 3;
export const SNOWMAN_SPHERES = [
  { y: 0.48, radius: 0.48 },
  { y: 1.15, radius: 0.37 },
  { y: 1.68, radius: 0.29 },
];

const MIN_PLAYER_DISTANCE = 3.2;
const MIN_TARGET_SPACING = 2.8;
const BALL_SPEED = 18;
const BALL_GRAVITY = 8;
const BALL_LIFETIME = 1.9;

// Clear, open pockets of snow. Each slot can fall back to its surveyed center.
const slots = [
  [-12.3, -11.4], [-5.8, -12.5], [5.7, -12.3], [11.4, -11.4],
  [-11.1, -5.3], [-12.2, 0.1], [-11.4, 5.9], [-10.9, 11.8],
  [-4.7, 10.7], [5.4, 10.8], [11.8, 11.5], [10.3, 5.4],
];

function chooseTargets(player, clearSpot, random) {
  const shuffled = slots.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const swap = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[swap]] = [shuffled[swap], shuffled[i]];
  }
  const targets = [];
  for (const [x, z] of shuffled) {
    for (let attempt = 0; attempt <= 3; attempt++) {
      const tx = attempt === 3 ? x : x + (random() - 0.5) * 1.1;
      const tz = attempt === 3 ? z : z + (random() - 0.5) * 1.1;
      if (Math.hypot(player.x - tx, player.z - tz) < MIN_PLAYER_DISTANCE || !clearSpot(tx, tz)) continue;
      if (targets.some(target => Math.hypot(target.x - tx, target.z - tz) < MIN_TARGET_SPACING)) continue;
      targets.push({ x: tx, z: tz, intact: true, breakTime: 0 });
      if (targets.length === SNOWMAN_COUNT) return targets;
      break;
    }
  }
  throw new Error(`Snow Basin requires ${SNOWMAN_COUNT} clear snowman spawn slots.`);
}

// Returns the first intersection along a normalized segment, or Infinity on a miss.
export function sweepSphere(start, end, x, y, z, radius) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const ox = start.x - x;
  const oy = start.y - y;
  const oz = start.z - z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy + dz * dz;
  const b = ox * dx + oy * dy + oz * dz;
  const discriminant = b * b - a * c;
  if (a === 0 || b >= 0 || discriminant < 0) return Infinity;
  const entry = (-b - Math.sqrt(discriminant)) / a;
  return entry <= 1 ? entry : Infinity;
}

const boxAxes = [['x', 'left', 'right'], ['z', 'front', 'back'], ['y', null, 'height']];

function sweepBox(start, end, obstacle) {
  let first = 0;
  let last = 1;
  for (const [axis, lower, upper] of boxAxes) {
    const min = (lower ? obstacle[lower] : 0) - BALL_RADIUS;
    const max = obstacle[upper] + BALL_RADIUS;
    const origin = start[axis];
    const delta = end[axis] - origin;
    if (Math.abs(delta) < 1e-8) {
      if (origin < min || origin > max) return Infinity;
      continue;
    }
    const enter = (min - origin) / delta;
    const exit = (max - origin) / delta;
    first = Math.max(first, Math.min(enter, exit));
    last = Math.min(last, Math.max(enter, exit));
    if (first > last) return Infinity;
  }
  return first;
}

export function createSnowActivity({ width, depth, spawn, obstacles, clearSpot, random = Math.random, cue = () => {} }) {
  const projectiles = Array.from({ length: 3 }, () => ({ active: false }));
  const state = {
    projectiles,
    get destroyed() { return this.targets.reduce((total, target) => total + Number(!target.intact), 0); },
  };
  const missions = {
    get snowmen() { return state.destroyed === SNOWMAN_COUNT; },
    get tree() { return state.tree === 'fallen'; },
    get key() { return state.hasFrozenKey; },
  };
  const next = { x: 0, y: 0, z: 0 };

  function reset() {
    Object.assign(state, {
      axe: false, held: false, chops: 0, cooldown: 0,
      tree: 'upright', fallTime: 0, hasFrozenKey: false,
    });
    state.targets = chooseTargets(spawn, clearSpot, random);
    for (const ball of projectiles) ball.active = false;
  }

  function pickUpAxe() {
    if (state.axe) return false;
    state.axe = true;
    cue('pickup');
    return true;
  }

  function canChop() {
    return state.axe && state.tree === 'upright' && state.cooldown === 0;
  }

  function chop() {
    if (!canChop()) return false;
    state.chops++;
    state.cooldown = CHOP_COOLDOWN;
    cue('chop');
    if (state.chops === CHOPS) {
      state.tree = 'falling';
      cue('fall');
    }
    return true;
  }

  function canMakeBall() {
    return !state.held;
  }

  function canPickUpKey() {
    return missions.tree && !missions.key;
  }

  function pickUpKey() {
    if (!canPickUpKey()) return false;
    state.hasFrozenKey = true;
    cue('key');
    return true;
  }

  function makeBall() {
    if (!canMakeBall()) return false;
    state.held = true;
    cue('pack');
    return true;
  }

  function throwBall(origin, direction) {
    if (!state.held) return false;
    const ball = projectiles.find(item => !item.active);
    if (!ball) return false;
    state.held = false;
    Object.assign(ball, {
      active: true, age: 0,
      x: origin.x + direction.x * 0.52,
      y: origin.y + direction.y * 0.52,
      z: origin.z + direction.z * 0.52,
      vx: direction.x * BALL_SPEED,
      vy: direction.y * BALL_SPEED + 0.9,
      vz: direction.z * BALL_SPEED,
    });
    cue('throw');
    return true;
  }

  function moveBall(ball, dt) {
    next.x = ball.x + ball.vx * dt;
    next.y = ball.y + ball.vy * dt - BALL_GRAVITY * dt * dt / 2;
    next.z = ball.z + ball.vz * dt;
    let first = next.y <= BALL_RADIUS ? Math.max(0, (ball.y - BALL_RADIUS) / (ball.y - next.y || 1)) : Infinity;
    for (const obstacle of obstacles) {
      if (obstacle.height > 0 && Number.isFinite(obstacle.left)) {
        first = Math.min(first, sweepBox(ball, next, obstacle));
      }
    }

    let hit = null;
    for (const target of state.targets) {
      if (!target.intact) continue;
      for (const { y, radius } of SNOWMAN_SPHERES) {
        const time = sweepSphere(ball, next, target.x, y, target.z, radius + BALL_RADIUS);
        if (time < first) {
          first = time;
          hit = target;
        }
      }
    }
    if (hit) {
      hit.intact = false;
      hit.breakTime = 0;
      cue('hit');
    }
    ball.age += dt;
    if (first <= 1 || ball.age >= BALL_LIFETIME || Math.abs(next.x) > width / 2 || Math.abs(next.z) > depth / 2) {
      ball.active = false;
      return;
    }
    ball.x = next.x;
    ball.y = next.y;
    ball.z = next.z;
    ball.vy -= BALL_GRAVITY * dt;
  }

  function update(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (state.tree === 'falling') {
      state.fallTime = Math.min(FALL_DURATION, state.fallTime + dt);
      if (state.fallTime === FALL_DURATION) {
        state.tree = 'fallen';
        cue('land');
      }
    }
    for (const target of state.targets) {
      if (!target.intact) target.breakTime = Math.min(BREAK_DURATION, target.breakTime + dt);
    }
    for (const ball of projectiles) if (ball.active) moveBall(ball, dt);
  }

  reset();
  return { state, missions, reset, pickUpAxe, canChop, chop, canPickUpKey, pickUpKey, canMakeBall, makeBall, throwBall, update };
}

export function snowMissionsComplete(missions) {
  return missions.snowmen && missions.tree && missions.key;
}
