export const PLAYER_RADIUS = 0.34;
const STEP_HEIGHT = 0.225;
const MAX_GRADE = 0.76;
const GRAVITY = 15;
export const FLAT_GROUND = () => 0;

export function overlaps(obstacle, x, z) {
  if (obstacle.touches) return obstacle.touches(x, z);
  const dx = Math.max(0, obstacle.left - x, x - obstacle.right);
  const dz = Math.max(0, obstacle.front - z, z - obstacle.back);
  return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
}

// A null result leaves both horizontal position and elevation unchanged.
export function walkElevation(world, from, x, z, feet, grounded) {
  if (world.blocksGround?.(x, z, PLAYER_RADIUS, feet, from)) return null;
  const sample = world.getGroundHeight ?? FLAT_GROUND;
  // Foot height distinguishes an elevated walkway from the floor underneath.
  const currentGround = sample(from.x, from.z, feet);
  const nextGround = sample(x, z, feet);
  const followsGround = grounded && feet <= currentGround + 1e-5;
  if (!Number.isFinite(nextGround)) return null;
  if (followsGround && Math.abs(nextGround - currentGround) > MAX_GRADE * Math.hypot(x - from.x, z - from.z) + 1e-5) {
    return null;
  }
  if (!followsGround && nextGround > feet + 1e-5) return null;

  const base = followsGround ? nextGround : feet;
  if (world.animals?.blocks(x, z, base)) return null;
  let next = base;
  for (const obstacle of world.obstacles) {
    if (obstacle.height > next && overlaps(obstacle, x, z)) next = obstacle.height;
  }
  if (next > base && (!grounded || next - base > STEP_HEIGHT)) return null;
  return next;
}

export function floorHeight(world, x, z, feet) {
  let floor = (world.getGroundHeight ?? FLAT_GROUND)(x, z, feet);
  floor = Math.max(floor, world.animals?.surface(x, z, feet) ?? -Infinity);
  for (const obstacle of world.obstacles) {
    if (obstacle.height <= feet && obstacle.height > floor && overlaps(obstacle, x, z)) floor = obstacle.height;
  }
  return floor;
}

export function advanceFall(feet, speed, floor, dt, result) {
  const velocity = speed - GRAVITY * dt;
  result.feet = Math.max(floor, feet + velocity * dt);
  result.grounded = result.feet === floor && velocity <= 0;
  result.speed = result.grounded ? 0 : velocity;
}
