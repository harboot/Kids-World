import { advanceFall, floorHeight, PLAYER_RADIUS, walkElevation } from './movement.js';

const EYE_HEIGHT = 1.68;
const JUMP_SPEED = 6.3;
const WALK_SPEED = 4.6;

export function createPlayer(THREE, camera) {
  const { clamp } = THREE.MathUtils;
  const motion = new THREE.Vector2();
  const speed = new THREE.Vector2();
  const falling = { feet: 0, speed: 0, grounded: true };
  let seated = null;
  let yaw = 0;
  let pitch = 0;
  let elevation = 0;
  let verticalSpeed = 0;
  let grounded = true;

  function updateCamera() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
  }

  function reset(spawn, world) {
    seated = null;
    yaw = 0;
    pitch = 0;
    elevation = world.getGroundHeight?.(spawn.x, spawn.z) ?? 0;
    verticalSpeed = 0;
    grounded = true;
    speed.set(0, 0);
    camera.position.set(spawn.x, EYE_HEIGHT + elevation, spawn.z);
    updateCamera();
  }

  function sit(pose) {
    seated = { standing: camera.position.clone(), elevation };
    speed.set(0, 0);
    verticalSpeed = 0;
    camera.position.set(pose.x, pose.y, pose.z);
    yaw = pose.yaw;
    pitch = 0;
    updateCamera();
  }

  function stand() {
    camera.position.copy(seated.standing);
    elevation = seated.elevation;
    verticalSpeed = 0;
    grounded = true;
    seated = null;
    updateCamera();
  }

  function jump() {
    if (seated || !grounded) return false;
    verticalSpeed = JUMP_SPEED;
    grounded = false;
    return true;
  }

  function look(dx, dy) {
    yaw -= dx;
    pitch = clamp(pitch - dy, -1.43, 1.43);
    updateCamera();
  }

  function walkTo(world, position, x, z) {
    const next = walkElevation(world, position, x, z, elevation, grounded);
    if (next === null) return;
    elevation = next;
    position.x = x;
    position.z = z;
  }

  function move(dt, movement, { area, definition }) {
    if (seated) return;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const xMotion = cos * movement.x + sin * movement.y;
    const zMotion = -sin * movement.x + cos * movement.y;
    motion.set(WALK_SPEED * xMotion, WALK_SPEED * zMotion);
    speed.lerp(motion, 1 - Math.exp(-15 * dt));
    const { position } = camera;
    const xLimit = definition.width / 2 - PLAYER_RADIUS;
    const zLimit = definition.depth / 2 - PLAYER_RADIUS;
    const x = clamp(position.x + speed.x * dt, -xLimit, xLimit);
    const z = clamp(position.z + speed.y * dt, -zLimit, zLimit);
    walkTo(area, position, x, position.z);
    walkTo(area, position, position.x, z);

    const floor = floorHeight(area, position.x, position.z, elevation);
    advanceFall(elevation, verticalSpeed, floor, dt, falling);
    elevation = falling.feet;
    grounded = falling.grounded;
    verticalSpeed = falling.speed;
    position.y = EYE_HEIGHT + elevation;
    camera.updateMatrixWorld();
  }

  return {
    get seated() { return seated !== null; },
    reset, sit, stand, jump, look, move,
    stop() { speed.set(0, 0); },
  };
}
