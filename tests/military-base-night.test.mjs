import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { militaryBase } from '../areas/military-base/index.js';
import { maxLocalLights, starCount, scoutHeadlights, localActivationDistance } from '../areas/military-base/lighting.js';

test('night area retains one cached moon shadow and a fixed shadow-free local light pool', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const area = militaryBase.load({ THREE, scene, camera, touch: true });
  area.reset();
  assert.equal(scene.background.getHex(), 0x142840);
  const lights = []; scene.traverse(node => { if (node.isLight) lights.push(node); });
  const local = lights.filter(node => node.isPointLight);
  assert.equal(local.length, maxLocalLights);
  assert.ok(local.every(light => !light.castShadow));
  assert.equal(lights.filter(light => light.castShadow).length, 1);
  assert.equal(lights.find(light => light.isDirectionalLight).shadow.mapSize.x, 512);
  const glow = scene.getObjectByName('Batched night ground illumination');
  assert.ok(glow.isInstancedMesh && glow.count > 20);
  const pickup = area.interactions.find(item => item.label === 'Pick Up Component');
  camera.position.set(pickup.x, 1.68, pickup.z);
  area.update(0, camera.position);
  assert.ok(local.some(light => light.intensity > 0 && Math.hypot(light.position.x-pickup.x, light.position.z-pickup.z) < .1));
  const before = new THREE.Matrix4();
  const after = new THREE.Matrix4();
  const matching = [];
  for (let i=0;i<glow.count;i++) {
    glow.getMatrixAt(i,before);
    const p = new THREE.Vector3().setFromMatrixPosition(before);
    if (Math.hypot(p.x-pickup.x,p.z-pickup.z)<.01 && before.elements[0] !== 0) matching.push(i);
  }
  assert.ok(matching.length);
  pickup.act();
  area.update(0, camera.position);
  assert.ok(matching.some(i => { glow.getMatrixAt(i,after); return after.elements[0] === 0; }));
  area.reset();
  assert.ok(matching.some(i => { glow.getMatrixAt(i,after); return after.elements[0] !== 0; }));
  assert.equal(area.missionStatus.missions.length, 6);
  area.unload();
});

test('desert sky remains visible within the gameplay camera clip range and includes a full moon', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(62, 1, .07, 115);
  const area = militaryBase.load({ THREE, scene, camera });
  const terrain = scene.getObjectByName('Moonlit desert dunes and sandstone hills');
  assert.ok(terrain?.geometry.attributes.color);
  assert.ok(scene.getObjectByName('Desert rocks and dry scrub'));
  assert.equal(scene.getObjectByName('Frosted perimeter spruce'), undefined);
  const stars = scene.getObjectByName('Night stars'), moon = scene.getObjectByName('Full moon');
  assert.equal(stars.geometry.attributes.position.count, starCount);
  assert.ok(starCount >= 800 && moon.geometry.parameters.thetaLength === Math.PI * 2);
  camera.position.set(60, 12, -30); camera.updateMatrixWorld();
  for (const object of [stars, moon]) {
    object.onBeforeRender(null, scene, camera);
    const p = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
    assert.ok(p.distanceTo(camera.position) < camera.far);
    assert.equal(object.material.depthWrite, false);
    assert.equal(object.material.depthTest, false);
  }
  area.unload();
});

test('scout headlamp reaches farther forward and follows the heading without extra lights', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const area = militaryBase.load({ THREE, scene, camera, reducedMotion: () => true });
  area.reset();
  const board = area.interactions.find(i => i.label === 'Drive Tank');
  const tank = scene.getObjectByName('Tank 01');
  const lights = scene.children.filter(o => o.isPointLight);
  const glow = scene.getObjectByName('Batched night ground illumination');
  camera.position.set(board.x, 1.68, board.z);
  let exit;
  board.act({ guideCamera(_look, options) { exit = options.prompt; return () => {}; } });
  for (const heading of [0, Math.PI / 4, Math.PI / 2]) {
    tank.rotation.y = heading;
    area.update(0, camera.position);
    const p = new THREE.Vector3(tank.position.x + Math.sin(heading) * scoutHeadlights.offset, 2,
      tank.position.z + Math.cos(heading) * scoutHeadlights.offset);
    assert.ok(lights[0].position.distanceTo(p) < 1e-6);
    assert.equal(lights[0].distance, 20);
    assert.equal(lights.length, maxLocalLights);
    const mat = new THREE.Matrix4(); glow.getMatrixAt(glow.count - 1, mat);
    const longAxis = new THREE.Vector3().setFromMatrixColumn(mat, 1).normalize();
    assert.ok(Math.abs(longAxis.dot(new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)))) > .999);
  }
  area.reset();
  area.update(0, camera.position);
  const hidden = new THREE.Matrix4(); glow.getMatrixAt(glow.count - 1, hidden);
  assert.equal(hidden.elements[0], 0);
  area.unload();
});

test('automatic local lights activate at half their former distance; scout headlights remain independent', () => {
  assert.equal(localActivationDistance(12),11);
  assert.equal(localActivationDistance(14),12);
  assert.equal(localActivationDistance(7),8.5);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const area = militaryBase.load({ THREE, scene, camera });
  const lights = scene.children.filter(o=>o.isPointLight);
  const pickup = area.interactions.find(item=>item.label==='Pick Up Component');
  const matching = () => lights.some(light=>light.intensity>0 && Math.hypot(light.position.x-pickup.x,light.position.z-pickup.z)<.01);
  area.update(0,{x:pickup.x,y:2,z:pickup.z+10});
  assert.equal(matching(),false);
  area.update(0,{x:pickup.x,y:2,z:pickup.z+5});
  assert.equal(matching(),true);
  assert.equal(lights.length,maxLocalLights);
  area.unload();
});
