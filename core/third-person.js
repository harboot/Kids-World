import { addMesh } from './geometry.js';
import { overlaps } from './movement.js';
import { EYE_HEIGHT } from './player.js';

const cameraDistance = 3.35;
const cameraClearance = 0.18;
const cameraSteps = 16;

function createAvatar(THREE) {
  const body = new THREE.Group();
  body.name = 'Player character';
  const box = new THREE.BoxGeometry(1, 1, 1);
  const round = new THREE.SphereGeometry(1, 10, 8);
  const colors = [0x309b85, 0xe9ad76, 0x303e58, 0xf39c42, 0x694538, 0xffdc70];
  const [jacket, skin, trousers, backpack, hair, straps] = colors.map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.86, flatShading: true }));
  const cube = (parent, material, x, y, z, w, h, d) =>
    addMesh(THREE, parent, box, material, x, y, z, w, h, d);

  cube(body, jacket, 0, 0.87, 0, 0.45, 0.57, 0.31);
  addMesh(THREE, body, round, skin, 0, 1.36, -0.02, 0.235, 0.26, 0.23);
  addMesh(THREE, body, round, hair, 0, 1.47, 0.045, 0.242, 0.175, 0.217);
  cube(body, backpack, 0, 0.89, 0.21, 0.34, 0.37, 0.19);
  cube(body, straps, 0, 0.84, 0.313, 0.24, 0.05, 0.02);
  for (const x of [-0.083, 0.083]) cube(body, hair, x, 1.37, -0.232, 0.03, 0.034, 0.02);

  function limb(x, y) {
    const joint = new THREE.Group();
    joint.position.set(x, y, 0);
    body.add(joint);
    return joint;
  }
  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = limb(side * 0.28, 1.095);
    cube(arm, jacket, 0, -0.18, 0, 0.125, 0.37, 0.14);
    addMesh(THREE, arm, round, skin, 0, -0.36, 0, 0.067, 0.08, 0.07);
    arms.push(arm);
    const leg = limb(side * 0.12, 0.6);
    cube(leg, trousers, 0, -0.247, 0.01, 0.176, 0.51, 0.19);
    cube(leg, hair, 0, -0.545, -0.04, 0.185, 0.11, 0.27);
    legs.push(leg);
  }

  return {
    body,
    stride(angle) {
      for (let index = 0; index < 2; index++) {
        legs[index].rotation.x = index ? angle : -angle;
        arms[index].rotation.x = -0.72 * legs[index].rotation.x;
      }
    },
    dispose() {
      body.removeFromParent();
      box.dispose();
      round.dispose();
      for (const material of [jacket, skin, trousers, backpack, hair, straps]) material.dispose();
    },
  };
}

export function createThirdPerson(THREE, eye) {
  const camera = new THREE.PerspectiveCamera(eye.fov, eye.aspect, eye.near, eye.far);
  camera.layers.mask = eye.layers.mask;
  const avatar = createAvatar(THREE);
  const offset = new THREE.Vector3();
  const target = new THREE.Vector3();
  const candidate = new THREE.Vector3();
  const inverseEye = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let phase = 0;
  eye.add(avatar.body);

  function update({ area, definition }, dt, distanceWalked) {
    const origin = eye.position;
    const yaw = eye.rotation.y;
    // Limit the follow camera tilt so looking up still keeps the character in view.
    const pitch = THREE.MathUtils.clamp(eye.rotation.x, -0.76, 0.4);
    const feet = origin.y - EYE_HEIGHT;
    const roomHeight = area.getCeilingHeight?.(origin.x, origin.z) ?? Infinity;
    const desiredRise = 1.12 - 2.7 * Math.sin(pitch);
    const rise = Math.min(desiredRise, Math.max(0, roomHeight - origin.y - cameraClearance));
    offset.set(Math.sin(yaw) * cameraDistance, rise, Math.cos(yaw) * cameraDistance);
    camera.position.copy(origin);
    for (let step = 1; step <= cameraSteps; step++) {
      candidate.copy(origin).addScaledVector(offset, step / cameraSteps);
      const { x, y, z } = candidate;
      if (Math.abs(x) > definition.width / 2 || Math.abs(z) > definition.depth / 2 ||
          y - cameraClearance < (area.getGroundHeight?.(x, z, feet) ?? 0) ||
          y + cameraClearance > (area.getCeilingHeight?.(x, z) ?? Infinity) ||
          area.blocksGround?.(x, z, cameraClearance, feet, camera.position) ||
          area.obstacles?.some(obstacle => obstacle.height > y - cameraClearance && overlaps(obstacle, x, z))) break;
      camera.position.copy(candidate);
    }

    // In a tight space, use the eye view until the camera can frame the character.
    avatar.body.visible = camera.position.distanceToSquared(origin) >= 1;
    if (!avatar.body.visible) return null;

    if (camera.aspect !== eye.aspect || camera.fov !== eye.fov) {
      camera.aspect = eye.aspect;
      camera.fov = eye.fov;
      camera.updateProjectionMatrix();
    }
    const lookAhead = Math.cos(pitch) * 3;
    target.set(-Math.sin(yaw) * lookAhead, Math.sin(pitch) * 3, -Math.cos(yaw) * lookAhead).add(origin);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    // The eye camera remains the player and area reference point.
    inverseEye.copy(eye.quaternion).invert();
    avatar.body.position.set(0, -EYE_HEIGHT, 0).applyQuaternion(inverseEye);
    avatar.body.quaternion.setFromAxisAngle(up, yaw).premultiply(inverseEye);
    const pace = dt > 0 && distanceWalked < 0.5 ? Math.min(1, distanceWalked / (dt * 4.6)) : 0;
    phase += pace * dt * 12;
    avatar.stride(Math.sin(phase) * pace * 0.65);
    return camera;
  }

  return {
    update,
    hide() { avatar.body.visible = false; },
    dispose: avatar.dispose,
  };
}
