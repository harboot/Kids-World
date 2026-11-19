import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildBuildings, gabledRoof } from '../areas/arendelle-village/buildings.js';
import { createScenery } from '../areas/arendelle-village/scenery.js';
import { addHillPath, createTerrain } from '../areas/flower-garden/garden-terrain.js';
import { SURFACE_GAP } from '../core/geometry.js';
import { areas } from '../game.js';

const tolerance = 1e-5;

function instanceMatrix(mesh, index) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix.premultiply(mesh.matrixWorld);
}

test('the Clock Tower lookout presents one walkable face across its inset and rim', () => {
  const scene = new THREE.Scene();
  const kit = createScenery(THREE, scene, null, []);
  const { lookout } = buildBuildings(kit, () => 0);
  kit.finish();
  scene.updateMatrixWorld(true);

  const batches = scene.children.filter(node => node.isInstancedMesh);
  const down = new THREE.Vector3(0, -1, 0);
  const { elevation } = lookout;
  for (const [x, z] of [[0.2, -9.3], [2.5, -10.65], [4.19, -9.37], [-4.19, -9.37], [0.43, -7.81], [-3.2, -11.55]]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, elevation + 0.04, z), down, 0, 0.08);
    const hits = ray.intersectObjects(batches, false);
    assert.equal(hits.length, 1, `one visible floor face at ${x}, ${z}`);
    assert.ok(Math.abs(hits[0].point.y - lookout.surface(x, z, elevation)) < tolerance);
    assert.equal(hits[0].object.castShadow, true);
  }

  // A ray between the two horizontal rails should hit one corner post.
  const east = new THREE.Vector3(1, 0, 0);
  for (const [x, y, z] of [[-4.2, elevation + 0.55, -7.8], [-26, 2.95, -11.54]]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x - 0.2, y, z + 0.01), east, 0, 0.4);
    assert.equal(ray.intersectObjects(batches, false).length, 1, `one post at ${x}, ${z}`);
  }
});

test('village roof strips follow both slopes and seat on the roof after batching', () => {
  for (const [width, depth, height, rise] of [[5.8, 6.6, 3.35, 2.9], [6.2, 4.7, 2.59, 2.08]]) {
    const scene = new THREE.Scene();
    const kit = createScenery(THREE, scene, null, []);
    const house = kit.group('Roof fixture', 4.2, 0.31, -3.7, Math.PI / 2);
    gabledRoof(kit, house, width, depth, height, rise, 0x9a4c44);
    kit.finish();
    scene.updateMatrixWorld(true);

    const batches = scene.children.filter(node => node.isInstancedMesh);
    const panels = batches.find(mesh => mesh.castShadow);
    const details = batches.find(mesh => mesh.geometry.type === 'ExtrudeGeometry');
    const toHouse = house.matrixWorld.clone().invert();
    const panelFaces = Array.from({ length: panels.count }, (_, index) => {
      const matrix = instanceMatrix(panels, index).premultiply(toHouse);
      const normal = new THREE.Vector3(1, 0, 0).transformDirection(matrix);
      if (normal.y < 0) normal.negate();
      const center = new THREE.Vector3().setFromMatrixPosition(matrix);
      return { normal, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center.addScaledVector(normal, 0.11)) };
    });

    let strips = 0;
    for (let index = 0; index < details.count; index++) {
      const matrix = instanceMatrix(details, index).premultiply(toHouse);
      strips++;
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
      const panel = panelFaces.find(face => face.normal.x * normal.x > 0);
      assert.ok(panel.normal.dot(normal) > 1 - tolerance);
      for (const x of [-0.5, 0.5]) {
        const underside = new THREE.Vector3(x, 0, 0).applyMatrix4(matrix);
        assert.ok(Math.abs(panel.plane.distanceToPoint(underside)) < tolerance);
      }
      const top = new THREE.Vector3(0, 1, 0).applyMatrix4(matrix);
      assert.ok(panel.plane.distanceToPoint(top) >= SURFACE_GAP.roof - tolerance);
    }
    assert.equal(strips, 16);
  }
});

test('double-sided village sign labels face outward and clear the rotated board', () => {
  const scene = new THREE.Scene();
  const ink = { fillRect() {}, strokeRect() {}, fillText() {} };
  const document = { createElement: () => ({ getContext: () => ink }) };
  const kit = createScenery(THREE, scene, document, []);
  const parent = kit.group('Post', 2.6, 0.2, -4.1, Math.PI / 3);
  kit.sign(parent, 'Wayfinding', 0.15, 1.6, 0.3, 1.8, 0.4, { yaw: -Math.PI / 2, bothSides: true });
  kit.finish();
  scene.updateMatrixWorld(true);

  const board = instanceMatrix(scene.children.find(node => node.isInstancedMesh), 0);
  const boardFront = new THREE.Vector3(0, 0, 1).transformDirection(board);
  const label = parent.children[0].children[0];
  for (const side of [1, -1]) {
    const face = new THREE.Vector3(0, 0, side * 0.5).applyMatrix4(board);
    const normal = boardFront.clone().multiplyScalar(side);
    const right = new THREE.Vector3(side, 0, 0).transformDirection(board);
    const origin = face.clone().addScaledVector(right, 0.45).addScaledVector(normal, 0.4);
    const [hit] = new THREE.Raycaster(origin, normal.clone().negate()).intersectObject(label);
    assert.ok(hit, 'a reader sees the outward-facing quad');
    const gap = hit.point.sub(face).dot(normal);
    assert.ok(gap >= SURFACE_GAP.detail - tolerance);
    assert.ok(Math.abs(hit.uv.x - 0.75) < tolerance, 'the back label reads left to right');
    assert.equal(label.material.depthTest, true);
  }
});

test('the garden hill path clears the terrain between its sampled edges', () => {
  const { width, depth } = areas.garden;
  const { getTerrainHeight } = createTerrain(width, depth);
  const scene = new THREE.Scene();
  addHillPath(THREE, { scene, getTerrainHeight, instances() {}, matte: () => new THREE.MeshLambertMaterial() });
  const { index, attributes: { position } } = scene.children[0].geometry;
  const point = new THREE.Vector3();
  const corners = Array.from({ length: 3 }, () => new THREE.Vector3());
  const samples = 10;
  for (let i = 0; i < index.count; i += 3) {
    const [a, b, c] = corners.map((corner, j) => corner.fromBufferAttribute(position, index.getX(i + j)));
    for (let u = 0; u <= samples; u++) {
      for (let v = 0; v <= samples - u; v++) {
        point.copy(a).multiplyScalar(1 - (u + v) / samples).addScaledVector(b, u / samples).addScaledVector(c, v / samples);
        assert.ok(point.y - getTerrainHeight(point.x, point.z) >= SURFACE_GAP.detail,
          `path clearance at ${point.x}, ${point.z}`);
      }
    }
  }
});
