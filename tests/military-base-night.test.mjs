import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { militaryBase } from '../areas/military-base/index.js';
import { maxLocalLights } from '../areas/military-base/lighting.js';

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
  assert.equal(area.missionStatus.missions.length, 5);
  area.unload();
});
