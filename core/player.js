import { advanceFall, floorHeight, PLAYER_RADIUS, walkElevation } from './movement.js';

export const EYE_HEIGHT = 1.68;
const HEAD_HEIGHT = EYE_HEIGHT + 0.14;
const JUMP_SPEED = 6.3;
const WALK_SPEED = 4.6;

export function createPlayer(THREE, camera) {
  const { clamp } = THREE.MathUtils;
  const motion = new THREE.Vector2();
  const speed = new THREE.Vector2();
  const falling = { feet: 0, speed: 0, grounded: true };
  let seated = null;
  let guidedView = null;
  let yaw = 0;
  let pitch = 0;
  let elevation = 0;
  let verticalSpeed = 0;
  let grounded = true;

  function updateCamera() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
  }

  function reset(spawn, world, ground = world.getGroundHeight?.(spawn.x, spawn.z, spawn.elevation) ?? 0) {
    seated = null;
    guidedView = null;
    yaw = spawn.yaw ?? 0;
    pitch = spawn.pitch ?? 0;
    elevation = ground;
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

  function guide(look) {
    const view = { look };
    guidedView = view;
    speed.set(0, 0);
    verticalSpeed = 0;
    return () => {
      if (guidedView !== view) return false;
      guidedView = null;
      return true;
    };
  }

  function carryVertically(distance) {
    if (seated || guidedView) return;
    elevation += distance;
    camera.position.y = elevation + EYE_HEIGHT;
    camera.updateMatrixWorld();
  }

  function jump() {
    if (seated || guidedView || !grounded) return false;
    verticalSpeed = JUMP_SPEED;
    grounded = false;
    return true;
  }

  function look(dx, dy) {
    if (guidedView) {
      guidedView.look?.(dx, dy);
      return;
    }
    yaw -= dx;
    pitch = clamp(pitch - dy, -1.43, 1.43);
    updateCamera();
  }

  function walkTo(world, position, x, z) {
    const next = walkElevation(world, position, x, z, elevation, grounded);
    if (next === null || next + HEAD_HEIGHT > (world.getCeilingHeight?.(x, z) ?? Infinity)) return;
    elevation = next;
    position.x = x;
    position.z = z;
  }

  function move(dt, movement, { area, definition }) {
    if (seated || guidedView) return 0;
    const wasGrounded = grounded;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const xMotion = cos * movement.x + sin * movement.y;
    const zMotion = -sin * movement.x + cos * movement.y;
    motion.set(WALK_SPEED * xMotion, WALK_SPEED * zMotion);
    const { position } = camera;
    const startX = position.x;
    const startZ = position.z;
    const traction = grounded ? area.getGroundTraction?.(position.x, position.z) ?? 1 : 1;
    speed.lerp(motion, 1 - Math.exp(-15 * traction * dt));
    const xLimit = definition.width / 2 - PLAYER_RADIUS;
    const zLimit = definition.depth / 2 - PLAYER_RADIUS;
    const x = clamp(position.x + speed.x * dt, -xLimit, xLimit);
    const z = clamp(position.z + speed.y * dt, -zLimit, zLimit);
    walkTo(area, position, x, position.z);
    walkTo(area, position, position.x, z);

    const floor = floorHeight(area, position.x, position.z, elevation);
    advanceFall(elevation, verticalSpeed, floor, dt, falling);
    const ceiling = (area.getCeilingHeight?.(position.x, position.z) ?? Infinity) - HEAD_HEIGHT;
    if (falling.feet > ceiling) {
      falling.feet = ceiling;
      falling.speed = 0;
      falling.grounded = false;
    }
    elevation = falling.feet;
    grounded = falling.grounded;
    verticalSpeed = falling.speed;
    position.y = EYE_HEIGHT + elevation;
    camera.updateMatrixWorld();
    return wasGrounded && grounded ? Math.hypot(position.x - startX, position.z - startZ) : 0;
  }

  return {
    get seated() { return Boolean(seated || guidedView); },
    get guided() { return guidedView !== null; },
    get grounded() { return grounded && !seated && !guidedView; },
    reset, sit, stand, guide, jump, look, move, carryVertically,
    stop() { speed.set(0, 0); },
  };
}
