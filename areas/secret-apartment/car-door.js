import { overlaps, PLAYER_RADIUS } from '../../core/movement.js';
import { STEP } from './missions.js';

const EDGE = -0.94;
const HINGE = -1.13;
const WIDTH = 1.12;
const FINAL_ANGLE = -1.31;

function sideGlass(THREE, parent, material, x, points) {
  const outline = new THREE.Shape();
  points.forEach(([z, y], i) => i ? outline.lineTo(z, y) : outline.moveTo(z, y));
  outline.closePath();
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(outline), material);
  pane.position.x = x;
  pane.rotation.y = -Math.PI / 2;
  parent.add(pane);
}

function windshield(THREE, parent, material, bottom, top) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.793, 0.871, bottom, 0.793, 0.871, bottom, 0.793, 1.376, top, -0.793, 1.376, top,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  parent.add(new THREE.Mesh(geometry, material));
}

export function buildCarDoor(THREE, architecture, body, paint, glass, offset, mission, playerPosition) {
  sideGlass(THREE, body, glass, 0.795, [[-1.43, 0.871], [1.12, 0.871], [0.74, 1.376], [-0.86, 1.376]]);
  sideGlass(THREE, body, glass, -0.795, [[0.015, 0.871], [1.12, 0.871], [0.74, 1.376], [0.015, 1.376]]);
  sideGlass(THREE, body, glass, -0.795, [[-1.43, 0.871], [-1.135, 0.871], [-1.135, 1.127]]);
  windshield(THREE, body, glass, -1.43, -0.86);
  windshield(THREE, body, glass, 1.12, 0.74);

  const hinge = architecture.group(body, 'Driver door', EDGE, 0, HINGE);
  const door = architecture.builder(hinge);
  door.part(paint, 0.023, 0.638, WIDTH / 2, 0.10, 0.442, WIDTH);
  door.part(0x6f5036, 0.081, 0.678, WIDTH / 2, 0.034, 0.33, WIDTH - 0.04);
  door.part(0xb8babe, -0.042, 0.762, 0.88, 0.042, 0.042, 0.19);
  door.part(0x554637, 0.135, 0.879, WIDTH / 2, 0.049, 0.038, WIDTH - 0.015);
  door.part(0x554637, 0.144, 1.112, WIDTH - 0.016, 0.041, 0.49, 0.036);
  sideGlass(THREE, hinge, glass, 0.145, [[0.006, 0.896], [1.100, 0.896], [1.100, 1.374],
    [0.276, 1.374], [0.006, 1.128]]);
  door.finish();

  const card = architecture.group(body, 'Access card', -0.50, 0.971, -0.42, 0.28);
  const cover = architecture.builder(card);
  cover.part(0x2baea5, 0, 0, 0, 0.16, 0.026, 0.104);
  cover.part(0xf1ffe9, 0.037, 0.015, 0, 0.045, 0.008, 0.068, { glow: true });
  cover.part(0x176760, -0.027, 0.017, 0, 0.044, 0.006, 0.02);
  cover.finish();

  // This sedan faces the driving aisle with its driver's side toward the next bay.
  const carX = body.position.x;
  const carZ = body.position.z;
  let openness;
  const sweep = (x, z) => x > carX + HINGE - PLAYER_RADIUS - 0.08 &&
    Math.hypot(x - carX - HINGE, z - carZ + EDGE) < WIDTH + PLAYER_RADIUS + 0.10;

  return {
    interactions: [{
      x: offset + carX + HINGE, z: carZ + 1.02, anchorY: 0.87, radius: 2.1,
      label: 'Open Car Door', silent: true,
      reachable: ({ z }) => z > carZ + 1.2,
      get active() { return mission.ready(STEP.CAR); },
      act() {
        if (!this.active) return;
        if (sweep(playerPosition.x - offset, playerPosition.z)) {
          mission.denyCue();
          mission.notify('Step back to give the door room.');
          return;
        }
        mission.openCar();
      },
    }, {
      x: offset + carX + card.position.z, z: carZ - card.position.x, anchorY: card.position.y,
      label: 'Take Access Card', radius: 1.96, requiresView: true, silent: true,
      reachable: position => position.z > carZ + 1.22,
      get active() { return mission.ready(STEP.CARD) && openness === 1; },
      act() {
        if (!this.active) return;
        mission.takeCard();
        card.visible = false;
      },
    }],
    blocks(x, z) {
      if (mission.ready(STEP.CARD) && openness < 1 && sweep(x, z)) return true;
      // Convert from garage axes to the sedan's axes, then into the door hinge.
      const dx = carZ - z - EDGE;
      const dz = x - carX - HINGE;
      const sin = Math.sin(hinge.rotation.y);
      const cos = Math.cos(hinge.rotation.y);
      return overlaps({ left: -0.065, right: 0.18, front: 0, back: WIDTH + 0.01 },
        cos * dx - sin * dz, sin * dx + cos * dz);
    },
    update(dt, still) {
      if (mission.step !== STEP.CAR && openness < 1) {
        openness = still ? 1 : Math.min(1, openness + dt / 0.58);
        hinge.rotation.y = FINAL_ANGLE * openness * openness * (3 - 2 * openness);
      }
      card.visible = mission.ready(STEP.CARD) && openness === 1;
    },
    reset() {
      openness = 0;
      hinge.rotation.y = 0;
      card.visible = false;
    },
  };
}
