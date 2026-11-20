import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { createCoordinatePicker, formatCoordinates, pointerToNDC } from '../core/coordinate-picker.js';
import { createDroneCamera } from '../core/drone-view.js';
import { PLAYER_ONLY_LAYER } from '../core/renderer.js';
import { createWorldManager } from '../core/world-manager.js';
import { BRIDGE } from '../areas/flower-garden/garden-pond.js';
import { HILL, POND } from '../areas/flower-garden/garden-terrain.js';
import { stairPoint } from '../areas/frozen-castle/staircase.js';
import { areas } from '../game.js';

const rect = { left: 40, top: 80, width: 400, height: 400 };
const near = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

function pickerAtWorldPosition(drone, scene, excluded) {
  const pick = createCoordinatePicker(THREE);
  return (x, z) => {
    const { camera } = drone;
    const projected = new THREE.Vector3(x, 0, z).project(camera);
    return pick(scene, camera, excluded, rect.left + (projected.x + 1) * rect.width / 2,
      rect.top + (1 - projected.y) * rect.height / 2, rect);
  };
}

test('client coordinates account for the canvas offset and dimensions', () => {
  const pointer = new THREE.Vector2();
  assert.deepEqual(pointerToNDC(240, 280, rect, pointer).toArray(), [0, 0]);
  assert.deepEqual(pointerToNDC(40, 80, rect, pointer).toArray(), [-1, 1]);
  assert.deepEqual(pointerToNDC(340, 380, rect, pointer).toArray(), [0.5, -0.5]);
  assert.equal(pointerToNDC(39, 280, rect, pointer), null);
  assert.equal(pointerToNDC(40, 280, { ...rect, width: 0 }, pointer), null);
});

test('raycasting returns exact world hits and skips hidden groups, effects and viewmodels', () => {
  const scene = new THREE.Scene();
  const drone = createDroneCamera(THREE);
  drone.focus({ width: 14, depth: 14 }, undefined, 1);
  const geometry = new THREE.BoxGeometry(2, 1, 2);
  const material = new THREE.MeshBasicMaterial();
  const transparent = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 });
  const hiddenMaterial = new THREE.MeshBasicMaterial({ visible: false });

  const platform = new THREE.Group();
  platform.position.set(-2, 3, 1);
  scene.add(platform);
  const instanced = new THREE.InstancedMesh(geometry, material, 1);
  instanced.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0.25, 0.5, 0.75));
  platform.add(instanced);

  function meshAt(parent, y, surface = material) {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(-1.75, y, 1.75);
    parent.add(mesh);
    return mesh;
  }
  const viewmodel = new THREE.Group();
  scene.add(viewmodel);
  meshAt(viewmodel, 6);
  const hidden = new THREE.Group();
  hidden.visible = false;
  scene.add(hidden);
  meshAt(hidden, 7);
  meshAt(scene, 8, transparent);
  meshAt(scene, 9, hiddenMaterial);
  meshAt(scene, 10).layers.set(PLAYER_ONLY_LAYER);
  meshAt(scene, 11).visible = false;

  const pick = pickerAtWorldPosition(drone, scene, viewmodel);
  const hit = pick(-1.75, 1.75);
  near(hit.x, -1.75);
  near(hit.y, 4);
  near(hit.z, 1.75);
  assert.equal(pick(5, 5), null);
  instanced.dispose();
  for (const resource of [geometry, material, transparent, hiddenMaterial]) resource.dispose();
});

test('the picker returns elevated terrain, bridges, stairs and the lookout in real areas', t => {
  const worlds = createWorldManager(THREE, {
    areas, camera: new THREE.PerspectiveCamera(), playerRadius: 0.34,
    services: { reducedMotion: () => true },
  });
  t.after(worlds.unload);
  const drone = createDroneCamera(THREE);
  function open(id) {
    const { definition, area, scene, viewmodel } = worlds.load(id);
    drone.focus(definition, area.droneView, 1);
    return pickerAtWorldPosition(drone, scene, viewmodel);
  }
  const garden = open('garden');
  near(garden(HILL.x, HILL.z).y, worlds.active.area.getGroundHeight(HILL.x, HILL.z));
  assert.ok(garden(HILL.x, HILL.z).y > 2);
  near(garden(BRIDGE.x, POND.z).y, BRIDGE.peak, 0.1);
  assert.ok(open('snow')(0, 0));
  const castle = open('frozen-castle');
  const stairs = worlds.active.area.interactions.find(item => item.label === 'Build ice staircase');
  for (let i = 0; i < 3; i++) stairs.act();
  const stair = stairPoint(0.55);
  near(castle(stair.x, stair.z).y, stair.y, 0.2);
  assert.ok(open('arendelle-village')(2.8, -9.15).y > 10);
  near(open('wooden-house')(0, 1.2).y, 0);
  const apartment = open('secret-apartment');
  near(apartment(-88, 5).y, -0.016);
  drone.focus(areas['secret-apartment'], undefined, 1);
  assert.equal(apartment(0, 8), null, 'inactive zones remain excluded even if the camera can see their coordinates');
});

test('copy formatting preserves signs and keeps input precision', () => {
  const point = new THREE.Vector3(12.45382, 2.1001, -8.2048);
  assert.equal(formatCoordinates(point), '{ x: 12.45, y: 2.10, z: -8.20 }');
  assert.equal(formatCoordinates({ x: -0.002, y: -2, z: 0 }), '{ x: 0.00, y: -2.00, z: 0.00 }');
  assert.deepEqual(point.toArray(), [12.45382, 2.1001, -8.2048]);
});
