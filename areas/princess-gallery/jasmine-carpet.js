import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';

export const CARPET_DOCK = Object.freeze({ x: 0, z: 6.95, height: .24, landingZ: 8.65 });
const courtCue = [[72, { duration: .29, level: .10 }], [77, { duration: .37, level: .11 }, .13],
  [81, { duration: .56, level: .09 }, .26]];
const arrivalCue = [[81, { duration: .26, level: .075 }], [77, { duration: .32, level: .08 }, .15],
  [72, { duration: .46, level: .085 }, .27]];
const radiusX = 7.54;
const radiusZ = 7.30;
const orbitZ = CARPET_DOCK.z - radiusZ;
const cruiseHeight = 4.46;
const riderHeight = 1.20;
const normal = { board: .65, rise: 2.15, circle: 12.5, settle: .72 };
const gentle = { board: .65, rise: 2.70, circle: 14.0, settle: .76 };
const ease = t => t * t * (3 - 2 * t);

export function buildMagicCarpet({ THREE, document, room, parts, colors, exhibit, camera, toWorld, toLocal,
  isActive, isPlayerGrounded, reducedMotion, playCue }) {
  const { part, batch } = parts;
  const { x, z, height, landingZ } = CARPET_DOCK;
  const [wx, wz] = toWorld(x, z);
  const [lx, lz] = toWorld(x, landingZ);
  const carpet = addGroup(THREE, room, 'Agrabah magic carpet', x, height, z);
  const landing = { x: lx, z: lz, yaw: exhibit.rotation };
  const stopEye = new THREE.Vector3(lx, EYE_HEIGHT, lz);
  const eye = new THREE.Vector3();
  const startEye = new THREE.Vector3();
  const boardRotation = new THREE.Quaternion();
  const facing = new THREE.Quaternion();
  const angles = new THREE.Euler(0, 0, 0, 'YXZ');
  const local = [0, 0];
  const cos = Math.cos(exhibit.rotation), sin = Math.sin(exhibit.rotation);
  const { clamp, lerp } = THREE.MathUtils;

  const pad = new THREE.Group();
  part(pad, 'drum', colors.shade, x, .020, z, 1.67, .04, 1.67);
  part(pad, 'drum', colors.gold, x, .053, z, 1.62, .028, 1.62);
  part(pad, 'drum', colors.teal, x, .071, z, 1.54, .025, 1.54);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    part(pad, 'gem', colors.cream, x + Math.sin(a) * 1.36, .089, z + Math.cos(a) * 1.36,
      .10, .018, .15).rotation.y = a;
  }
  batch(pad, room);

  const weave = paintCanvasTexture(THREE, document, 448, 640, (ink, w, h) => {
    ink.fillStyle = '#78334f';
    ink.fillRect(0, 0, w, h);
    for (const [margin, color, size] of [[7, '#dfae67', 8], [18, '#df7691', 4],
      [27, '#381f52', 13], [41, '#ead299', 3], [47, '#d07a72', 2]]) {
      ink.strokeStyle = color;
      ink.lineWidth = size;
      ink.strokeRect(margin, margin, w - 2 * margin, h - 2 * margin);
    }
    function rosette(x, z, size, fill) {
      ink.fillStyle = fill;
      ink.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        const r = i % 2 ? size * .51 : size;
        ink.lineTo(x + Math.sin(a) * r, z + Math.cos(a) * r);
      }
      ink.closePath();
      ink.fill();
    }
    for (const x of [83, w - 83]) {
      for (let z = 88; z < h - 58; z += 58) rosette(x, z, 11, '#e89e89');
    }
    for (const [z, size] of [[141, 39], [h / 2, 108], [h - 141, 39]]) {
      rosette(w / 2, z, size + 6, '#4e2748');
      rosette(w / 2, z, size, '#dfad66');
      rosette(w / 2, z, size * .79, '#467e83');
      rosette(w / 2, z, size * .54, '#efd292');
      rosette(w / 2, z, size * .32, '#a64166');
    }
  });
  const cloth = new THREE.PlaneGeometry(2.22, 3.10, 1, 12);
  cloth.rotateX(-Math.PI / 2);
  const surface = cloth.getAttribute('position');
  for (let i = 0; i < surface.count; i++) {
    surface.setY(i, .17 * (Math.abs(surface.getZ(i)) / 1.55) ** 4);
  }
  cloth.computeVertexNormals();
  const woven = part(carpet, cloth, parts.matte(weave ? 0xffffff : 0x78334f, { map: weave, side: THREE.DoubleSide }),
    0, 0, 0, 1, 1, 1);
  woven.name = 'Embroidered magic carpet';
  const fringe = new THREE.Group();
  for (const end of [-1, 1]) {
    part(fringe, 'box', colors.shade, 0, .154, end * 1.544, 2.22, .044, .047);
    for (let i = -5; i <= 5; i++) {
      part(fringe, 'gem', i % 2 ? colors.brass : colors.gold, .19 * i, .122, end * 1.63, .062, .031, .118);
    }
    for (const side of [-1, 1]) {
      part(fringe, 'gem', colors.gold, side * 1.12, .09, end * 1.67, .087, .078, .17);
    }
  }
  batch(fringe, carpet);

  let release = null;
  let timing = normal;
  let time = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let completed = false;

  function look(dx, dy) {
    lookYaw = clamp(lookYaw - dx, -1.92, 1.92);
    lookPitch = clamp(lookPitch - dy, -.85, 1.12);
  }

  function reachable(position) {
    if (!position || !isPlayerGrounded() || Math.abs(position.y - EYE_HEIGHT) > .12) return false;
    toLocal(position.x, position.z, local);
    return Math.abs(local[0]) < 1.9 && local[1] >= z - .24 && local[1] < 9.55;
  }

  const interaction = {
    x: wx, z: wz, anchorY: .85, radius: 2.65, label: 'Ride the magic carpet', silent: true,
    get active() { return isActive() && !release; },
    reachable,
    act({ guideCamera }) {
      if (!this.active || !reachable(camera?.position) || typeof guideCamera !== 'function') return;
      const restore = guideCamera(look);
      if (typeof restore !== 'function') return;
      release = restore;
      startEye.copy(camera.position);
      boardRotation.copy(camera.quaternion);
      time = lookYaw = lookPitch = 0;
      timing = reducedMotion() ? gentle : normal;
      playCue(courtCue);
    },
  };

  function pose(angle, altitude, still) {
    const px = radiusX * Math.sin(angle);
    const pz = orbitZ + radiusZ * Math.cos(angle);
    const tilt = still ? 0 : .050 * Math.sin(angle / 2) ** 2;
    carpet.position.set(px, altitude, pz);
    carpet.rotation.set(0, Math.atan2(radiusX * Math.cos(angle), -radiusZ * Math.sin(angle)), -tilt, 'YXZ');
    eye.set(exhibit.position.x + cos * px + sin * pz, altitude + riderHeight,
      exhibit.position.z - sin * px + cos * pz);
    const yaw = Math.atan2(px, pz + 1.88) + exhibit.rotation + lookYaw;
    angles.set(lookPitch - (still ? .09 : .11), yaw, -tilt * .34, 'YXZ');
    facing.setFromEuler(angles);
  }

  function dock() {
    carpet.position.set(x, height, z);
    carpet.rotation.set(0, Math.PI / 2, 0);
  }

  function stop(spawn) {
    const restore = release;
    release = null;
    dock();
    restore?.(spawn);
  }
  dock();

  return {
    interaction,
    update(dt, still) {
      if (!release) return false;
      const { board, rise, circle, settle } = timing;
      const orbitStart = board + rise;
      const descendStart = orbitStart + circle;
      const exitStart = descendStart + rise;
      const end = exitStart + settle;
      time = Math.min(end, time + dt);
      const steady = still || timing === gentle;
      if (time < board) {
        const t = ease(time / board);
        pose(0, height, steady);
        camera.position.lerpVectors(startEye, eye, t);
        camera.quaternion.slerpQuaternions(boardRotation, facing, t);
        if (steady) camera.rotation.z = 0;
      } else if (time < orbitStart) {
        const t = ease((time - board) / rise);
        pose(0, lerp(height, cruiseHeight, t), steady);
        camera.position.copy(eye);
        camera.quaternion.copy(facing);
      } else if (time < descendStart) {
        const phase = ease((time - orbitStart) / circle) * Math.PI * 2;
        const arc = Math.sin(phase / 2) ** 2;
        pose(phase, cruiseHeight + (timing === gentle ? 0 : arc * 1.40), steady);
        camera.position.copy(eye);
        camera.quaternion.copy(facing);
      } else if (time < exitStart) {
        const t = ease((time - descendStart) / rise);
        pose(0, lerp(cruiseHeight, height, t), steady);
        camera.position.copy(eye);
        camera.quaternion.copy(facing);
      } else {
        const t = ease((time - exitStart) / settle);
        pose(0, height, steady);
        camera.position.lerpVectors(eye, stopEye, t);
        camera.rotation.set(angles.x * (1 - t), angles.y, 0, 'YXZ');
      }
      camera.updateMatrixWorld();
      if (time < end) return false;
      stop({ ...landing, yaw: landing.yaw + lookYaw });
      playCue(arrivalCue);
      if (completed) return false;
      completed = true;
      return true;
    },
    reset() {
      stop(landing);
      completed = false;
    },
  };
}
