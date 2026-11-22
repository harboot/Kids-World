import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EYE_HEIGHT } from '../core/player.js';
import { createThirdPerson } from '../core/third-person.js';
import * as THREE from '../vendor/three.module.min.js';

test('third-person camera follows the body behind the player without moving the gameplay eye', () => {
  const eye = new THREE.PerspectiveCamera(62, 1.5, 0.07, 115);
  const scene = new THREE.Scene();
  scene.add(eye);
  eye.position.set(4, EYE_HEIGHT + 0.6, 8);
  eye.rotation.set(-0.2, Math.PI / 2, 0, 'YXZ');
  const eyePosition = eye.position.clone();
  const eyeRotation = eye.quaternion.clone();
  const visit = { area: {}, definition: { width: 40, depth: 40 } };
  const thirdPerson = createThirdPerson(THREE, eye);

  const camera = thirdPerson.update(visit, 0.04, 0.16);
  assert.ok(camera.position.x > eye.position.x + 3);
  assert.ok(camera.position.y > eye.position.y && Math.abs(camera.position.z - eye.position.z) < 1e-6);
  assert.ok(eye.position.equals(eyePosition) && eye.quaternion.equals(eyeRotation));
  const avatar = eye.getObjectByName('Player character');
  assert.ok(avatar.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(4, 0.6, 8)) < 1e-6);
  const avatarPosition = avatar.getWorldPosition(new THREE.Vector3()).project(camera);
  assert.ok(Math.abs(avatarPosition.x) < 1 && Math.abs(avatarPosition.y) < 1);
  assert.equal(avatar.visible, true);

  eye.rotation.x = 1.43;
  thirdPerson.update(visit, 0, 0);
  const head = avatar.localToWorld(new THREE.Vector3(0, 1.36, 0)).project(camera);
  assert.ok(Math.abs(head.y) < 1, 'the head stays in view when the player looks up');

  thirdPerson.hide();
  assert.equal(avatar.visible, false);
  thirdPerson.dispose();
  assert.equal(eye.getObjectByName('Player character'), undefined);
});

test('the follow camera shortens at a wall and uses the eye view when it cannot frame the body', () => {
  const eye = new THREE.PerspectiveCamera();
  eye.position.set(0, EYE_HEIGHT, 0);
  const thirdPerson = createThirdPerson(THREE, eye);
  const visit = { area: { blocksGround: (x, z) => z > 2 }, definition: { width: 40, depth: 40 } };
  const avatar = eye.getObjectByName('Player character');
  const camera = thirdPerson.update(visit, 0, 0);
  assert.ok(camera.position.z > 1 && camera.position.z <= 2);

  visit.area.blocksGround = (x, z) => z > 0.4;
  assert.equal(thirdPerson.update(visit, 0, 0), null);
  assert.equal(avatar.visible, false);
  assert.equal(eye.position.z, 0);
  thirdPerson.dispose();
});
