import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadAreaScene } from '../core/scene-exporter.js';
import { PLAYER_ONLY_LAYER } from '../core/render-layers.js';
import { areas } from '../game.js';
import * as THREE from '../vendor/three.module.min.js';

function browser(t) {
  const downloads = [];
  const urls = new Map();
  let sequence = 0;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(URL, 'createObjectURL', blob => {
    const url = `blob:test/${++sequence}`;
    urls.set(url, blob);
    return url;
  });
  t.mock.method(URL, 'revokeObjectURL', url => { assert.ok(urls.delete(url)); });

  const document = {
    defaultView: new EventTarget(),
    createElement(tag) {
      return Object.assign(new EventTarget(), {
        ownerDocument: document, style: {}, append() {}, remove() {}, setAttribute() {},
        click() { downloads.push({ filename: this.download, blob: urls.get(this.href) }); },
      });
    },
  };
  return { document, downloads, urls };
}

test('public and hidden exports use the registered lazy loaders and round-trip through ObjectLoader', async t => {
  const { document, downloads, urls } = browser(t);
  const loaded = [];
  const registry = Object.fromEntries(Object.entries(areas).map(([id, area]) => [id, {
    ...area,
    loadModule() { loaded.push(id); return area.loadModule(); },
  }]));
  let threeLoads = 0;
  const options = { document, areas: registry, async loadThree() { threeLoads++; return THREE; } };
  const loader = new THREE.ObjectLoader();
  assert.deepEqual(loaded, []);
  assert.equal(threeLoads, 0);

  for (const [id, filename, names] of [
    ['snow', 'snow-basin.json', ['Snow Basin terrain', 'Olaf', 'Kristoff', 'Sven']],
    ['secret-apartment', 'secret-apartment.json', ['basement', 'floor8', 'floor17']],
  ]) {
    await downloadAreaScene(id, options);
    const download = downloads.at(-1);
    assert.equal(download.filename, filename);
    assert.equal(download.blob.type, 'application/json');
    const scene = await loader.parseAsync(JSON.parse(await download.blob.text()));
    assert.equal(scene.isScene, true);
    assert.equal(scene.name, registry[id].title);
    assert.ok(scene.background.isColor);
    assert.ok(scene.children.some(child => child.isLight));
    if (id === 'snow') assert.ok(scene.fog?.isFog);
    for (const name of names) assert.ok(scene.getObjectByName(name), name);
    scene.traverse(object => {
      assert.ok(!object.isCamera);
      assert.doesNotMatch(object.name, / clearance$/);
    });
  }
  assert.deepEqual(loaded, ['snow', 'secret-apartment']);
  assert.equal(threeLoads, 2);
  assert.equal(urls.size, 2);
  t.mock.timers.tick(1000);
  assert.equal(urls.size, 0);
});

test('exports preserve baked geometry, transforms, layers and textures and dispose repeated and failed visits', async t => {
  const { document, downloads, urls } = browser(t);
  const metadata = areas.garden;
  let failure;
  let disposed = [];
  let expectedVertices;
  let signal;
  const entry = {
    ...metadata,
    async loadModule() {
      return { default: {
        ...metadata,
        load(context) {
          signal = context.signal;
          assert.equal(context.isPlaying(), false);
          assert.equal(context.isLevelComplete(), false);
          const geometry = new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(0, 0).lineTo(1, 0).lineTo(0, 1));
          geometry.rotateX(Math.PI / 2);
          expectedVertices = geometry.attributes.position.array.slice();
          const texture = new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1);
          const material = new THREE.MeshStandardMaterial({ map: texture });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = 'Baked visual';
          mesh.layers.set(PLAYER_ONLY_LAYER);
          mesh.position.set(1, 2, 3);
          mesh.scale.set(2, 3, 4);
          mesh.rotation.y = 0.7;
          const helper = new THREE.AxesHelper();
          const marker = new THREE.Mesh(new THREE.BoxGeometry(), material);
          marker.name = 'Test clearance';
          const viewmodel = new THREE.Mesh(new THREE.BoxGeometry(), material);
          context.viewmodel.add(viewmodel);
          const group = new THREE.Group();
          group.name = 'Parent';
          group.add(mesh, helper, marker, new THREE.Mesh(geometry, material));
          context.scene.add(group);
          for (const [name, resource] of Object.entries({
            geometry, texture, material, helper: helper.geometry, marker: marker.geometry, viewmodel: viewmodel.geometry,
          })) resource.addEventListener('dispose', () => disposed.push(name));
          context.onCleanup(() => disposed.push('cleanup'));
          if (failure === 'initialize') throw new Error('fixture load failed');
          if (failure === 'serialize') mesh.userData = { mesh };
          return { unload() { disposed.push('unload'); } };
        },
      } };
    },
  };
  const ready = Promise.withResolvers();
  const options = { areas: { garden: entry }, loadThree: () => ready.promise, document };
  const first = downloadAreaScene('garden', options);
  await assert.rejects(downloadAreaScene('garden', options), /already running/);
  ready.resolve(THREE);
  await first;
  const expectedDisposals = ['cleanup', 'geometry', 'helper', 'marker', 'material', 'texture', 'unload', 'viewmodel'];
  assert.deepEqual(disposed.sort(), expectedDisposals);
  assert.equal(signal.aborted, true);
  assert.equal(downloads[0].filename, 'flower-garden.json');
  const scene = await new THREE.ObjectLoader().parseAsync(JSON.parse(await downloads[0].blob.text()));
  const mesh = scene.getObjectByName('Baked visual');
  assert.equal(mesh.parent.name, 'Parent');
  assert.equal(mesh.parent.children.length, 2);
  assert.equal(mesh.geometry, mesh.parent.children[1].geometry);
  assert.deepEqual(mesh.position.toArray(), [1, 2, 3]);
  assert.ok(mesh.scale.distanceTo(new THREE.Vector3(2, 3, 4)) < 1e-8);
  assert.ok(Math.abs(mesh.rotation.y - 0.7) < 1e-8);
  assert.deepEqual(mesh.geometry.attributes.position.array, expectedVertices);
  assert.ok(mesh.layers.isEnabled(0));
  assert.deepEqual(mesh.material.map.image.data, new Uint8Array([255, 0, 0, 255]));
  assert.equal(scene.getObjectByProperty('type', 'PerspectiveCamera'), undefined);

  for (const stage of ['initialize', 'serialize']) {
    disposed = [];
    failure = stage;
    await assert.rejects(downloadAreaScene('garden', options), new RegExp(`Could not ${stage} the scene`));
    assert.deepEqual(disposed.sort(), expectedDisposals.filter(name => name !== 'unload' || stage === 'serialize'));
    assert.equal(signal.aborted, true);
    assert.equal(downloads.length, 1);
  }
  disposed = [];
  failure = undefined;
  await downloadAreaScene('garden', options);
  assert.deepEqual(disposed.sort(), expectedDisposals);
  assert.equal(downloads.length, 2);
  t.mock.timers.tick(1000);
  assert.equal(urls.size, 0);
});
