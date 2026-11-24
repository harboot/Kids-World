import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFile, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createReleaseCache } from '../pwa/cache.js';
import { assetBase, sha256, validateManifest, versionFor } from '../pwa/release.js';

const manifest = JSON.parse(await readFile(new URL('../version.json', import.meta.url), 'utf8'));
const scope = new URL('https://example.test/Kids-World/');
const root = new URL('../', import.meta.url);
const snowEntry = './areas/snow-basin/index.js';
const previousSnowEntry = './areas/snow-basin.js';
const hiddenEntry = './areas/secret-apartment/index.js';
const hiddenThumbnail = './areas/secret-apartment/secret-apartment.jpg';

class MemoryStorage {
  caches = new Map();

  async keys() { return [...this.caches.keys()]; }

  async match(url, { cacheName }) {
    return this.caches.get(cacheName)?.get(String(url))?.clone();
  }

  async delete(name) { return this.caches.delete(name); }

  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new Map());
    const entries = this.caches.get(name);
    return { async put(url, response) { entries.set(String(url), response.clone()); } };
  }
}

async function fixture(changes = {}, entries = manifest.files, optionalEntries = manifest.onDemandFiles) {
  const payloads = new Map();
  const hash = async ({ path }) => {
    const body = changes[path] ?? path;
    payloads.set(new URL(path, scope).href, body);
    return { path, revision: await sha256(new TextEncoder().encode(body)) };
  };
  const files = await Promise.all(entries.map(hash));
  const onDemandFiles = optionalEntries === null ? undefined : await Promise.all(optionalEntries.map(hash));
  return { manifest: { version: await versionFor(files, onDemandFiles), files, onDemandFiles }, payloads };
}

test('checked-in release matches every runtime file and the worker version changes with releases', () => {
  execFileSync(process.execPath, ['scripts/generate-pwa-manifest.mjs', '--check'], {
    cwd: root,
  });
  const paths = manifest.files.map(file => file.path);
  for (const path of ['./vendor/three.core.min.js', snowEntry, './stats.html', './area-stats.json', './area-catalog.js']) {
    assert.ok(paths.includes(path), path);
  }
  for (const area of ['arendelle-village', 'flower-garden', 'frozen-castle', 'military-base',
    'princess-gallery', 'snow-basin', 'wooden-house']) {
    for (const file of ['metadata.js', 'index.js', 'music.js', area + '.jpg']) {
      const path = `./areas/${area}/${file}`;
      assert.ok(paths.includes(path), path);
    }
  }
  assert.ok(!paths.includes(previousSnowEntry));
  assert.ok(paths.every(path => !path.startsWith('./tests/')));
  assert.deepEqual(paths.filter(path => path.startsWith('./areas/secret-apartment/')),
    [hiddenThumbnail]);
  for (const file of ['metadata.js', 'index.js', 'music.js']) {
    assert.ok(manifest.onDemandFiles.some(({ path }) => path === './areas/secret-apartment/' + file));
  }
});

test('the game entry and pinned Three.js resolve from local modules', async () => {
  const { startGame } = await import('../game.js');
  const { REVISION } = await import('../vendor/three.module.min.js');
  assert.equal(typeof startGame, 'function');
  assert.equal(REVISION, '179');
});

async function releaseWorkspace(t) {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'kids-world-release-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const files = ['version.json', 'sw.js', 'package.json', 'scripts',
    ...[...manifest.files, ...manifest.onDemandFiles].map(file => file.path)];
  await Promise.all(files.map(file => cp(new URL(file, root), join(fixtureRoot, file), { recursive: true })));
  await symlink(fileURLToPath(new URL('node_modules', root)), join(fixtureRoot, 'node_modules'), 'junction');
  function generate(...args) {
    return execFileSync(process.execPath, ['scripts/generate-pwa-manifest.mjs', ...args], {
      cwd: fixtureRoot, stdio: 'pipe',
    });
  }
  return { fixtureRoot, generate };
}

test('new hidden files change the release identity without altering mandatory files', async t => {
  const { fixtureRoot, generate } = await releaseWorkspace(t);
  const area = join(fixtureRoot, 'areas', 'secret-apartment');
  await mkdir(join(area, 'tests'), { recursive: true });
  await writeFile(join(area, 'README.md'), '# Area development notes');
  await writeFile(join(area, 'tests', 'fixture.json'), '{}');
  await writeFile(join(area, 'area.test.mjs'), '// Test');
  assert.doesNotThrow(() => generate('--check'));
  await writeFile(join(area, 'extra.png'), 'example image bytes');
  assert.throws(() => generate('--check'), /version\.json is out of date/);
  assert.equal(await readFile(join(fixtureRoot, 'version.json'), 'utf8'), await readFile(new URL('version.json', root), 'utf8'));
  generate();
  assert.doesNotThrow(() => generate('--check'));
  const generated = JSON.parse(await readFile(join(fixtureRoot, 'version.json'), 'utf8'));
  assert.deepEqual(generated.files, manifest.files);
  assert.ok(generated.onDemandFiles.some(file => file.path === './areas/secret-apartment/extra.png'));
  assert.notEqual(generated.version, manifest.version);
  assert.ok((await readFile(join(fixtureRoot, 'sw.js'), 'utf8')).includes(generated.version));
});

test('classifies new public areas and verifies transitive module and asset dependencies', async t => {
  const { fixtureRoot, generate } = await releaseWorkspace(t);
  const write = (path, contents) => writeFile(join(fixtureRoot, path), contents);
  const append = (path, contents) => appendFile(join(fixtureRoot, path), contents);
  const game = await readFile(join(fixtureRoot, 'game.js'), 'utf8');
  await write('game.js', game.replace('export const areas = {', `export const areas = {
  'test-yard': publicArea(areaMetadata['test-yard'], 'test-yard', () => import('./areas/test-yard/index.js')),`));
  await mkdir(join(fixtureRoot, 'areas/test-yard'));
  const metadata = (await readFile(join(fixtureRoot, 'areas/snow-basin/metadata.js'), 'utf8')).replace("'snow'", "'test-yard'");
  await write('areas/test-yard/metadata.js', metadata);
  await write('areas/test-yard/test-yard.jpg', 'example thumbnail bytes');
  await write('areas/test-yard/index.js', "export { value } from '../secret-apartment/shared.js';");
  await write('areas/secret-apartment/shared.js', "export { value } from './transitive.js';");
  await write('areas/secret-apartment/transitive.js', "export const value = new URL('./shared.png', import.meta.url);");
  await write('areas/secret-apartment/shared.png', 'example image bytes');
  await append('areas/secret-apartment/index.js', "\nimport './shared.js';\n");
  generate();
  assert.doesNotThrow(() => generate('--check'));
  const result = JSON.parse(await readFile(join(fixtureRoot, 'version.json'), 'utf8'));
  const required = new Set(result.files.map(file => file.path));
  const optional = new Set(result.onDemandFiles.map(file => file.path));
  for (const path of ['./areas/test-yard/index.js', './areas/test-yard/test-yard.jpg', './areas/test-yard/metadata.js',
    './areas/secret-apartment/shared.js', './areas/secret-apartment/transitive.js', './areas/secret-apartment/shared.png']) {
    assert.ok(required.has(path), path);
    assert.ok(!optional.has(path), path);
  }
  assert.ok(optional.has(hiddenEntry));

  await append('areas/test-yard/index.js', "\nimport './missing.js';\n");
  assert.throws(() => generate(), /Missing release dependency areas\/test-yard\/missing\.js/);
  await write('areas/test-yard/index.js', "const path = './missing.js'; import(path);");
  assert.throws(() => generate(), /Cannot verify release dependency in areas\/test-yard\/index\.js/);
});

test('rejects invalid, duplicate, missing and out-of-scope manifest entries', async () => {
  await validateManifest(manifest);
  await assert.rejects(validateManifest({ version: '1.0.0', files: [] }));
  for (const files of [
    manifest.files.filter(file => file.path !== snowEntry),
    manifest.files.filter(file => file.path !== './area-stats.json'),
    manifest.files.filter(file => file.path !== './stats.html'),
    [...manifest.files, manifest.files.at(-1)],
    [{ path: './pwa/../version.json', revision: manifest.files[0].revision }, ...manifest.files],
  ]) {
    await assert.rejects(validateManifest({ version: await versionFor(files), files }));
  }
  const previousFiles = manifest.files.filter(file => !['./stats.html', './area-stats.json'].includes(file.path));
  await validateManifest({ version: await versionFor(previousFiles), files: previousFiles });
  for (const onDemandFiles of [
    [manifest.files[0], ...manifest.onDemandFiles],
    [...manifest.onDemandFiles, manifest.onDemandFiles.at(-1)],
    [{ ...manifest.onDemandFiles[0], path: './areas/../core/game.js' }],
  ]) {
    const version = await versionFor(manifest.files, onDemandFiles);
    await assert.rejects(validateManifest({ version, files: manifest.files, onDemandFiles }), /Invalid release file entry/);
  }
  await assert.rejects(validateManifest({ ...manifest, onDemandFiles: [] }), /fingerprint/);
});

test('keeps releases with the previous Snow Basin layout available as cached fallbacks', async () => {
  const previousEntries = manifest.files.map(({ path }) => ({ path: path === snowEntry ? previousSnowEntry : path }))
    .sort((a, b) => a.path < b.path ? -1 : Number(a.path > b.path));
  const previous = await fixture({}, previousEntries, null);
  await assert.rejects(validateManifest(previous.manifest), /manifest is incomplete/);

  const cache = createReleaseCache({
    scope, storage: new MemoryStorage(),
    async fetchAsset(url) { return new Response(previous.payloads.get(url)); },
  });
  const saved = await cache.install(previous.manifest, null, () => {});
  assert.equal((await cache.ready())[0].tag, saved.tag);
  assert.equal(await (await cache.read(saved.tag, new URL(previousSnowEntry, scope))).text(), previousSnowEntry);
});

test('stages a verified release, reports only stored files, and reuses matching revisions', async () => {
  const storage = new MemoryStorage();
  let current = await fixture();
  const requests = [];
  const progress = [];
  const cache = createReleaseCache({
    scope, storage,
    fetchAsset(url, options) {
      assert.equal(options.cache, 'no-store');
      requests.push(url);
      return Promise.resolve(new Response(current.payloads.get(url)));
    },
  });

  const original = await cache.install(current.manifest, null, status => progress.push(status));
  assert.equal(progress[0].completed, 0);
  assert.equal(progress.at(-1).stage, 'verifying');
  assert.equal(progress.at(-1).completed, manifest.files.length);
  assert.equal(progress.at(-1).downloaded, requests.length);
  assert.equal((await cache.ready()).length, 1);

  current = await fixture({ './game.js': 'new game release' });
  requests.length = 0;
  progress.length = 0;
  const newer = await cache.install(current.manifest, original, status => progress.push(status));
  assert.deepEqual(requests, [new URL('game.js', scope).href]);
  assert.equal(progress.at(-1).downloaded, 1);
  assert.equal(progress.at(-1).completed, manifest.files.length);
  assert.notEqual(original.tag, newer.tag);
  assert.equal(await (await cache.read(original.tag, new URL('game.js', scope))).text(), './game.js');
  assert.equal(await (await cache.read(newer.tag, new URL('game.js', scope))).text(), 'new game release');
  assert.ok(assetBase(scope, newer.tag).pathname.startsWith('/Kids-World/__kids-world__/'));
});

test('interrupted, missing, opaque or mismatched files leave the previous ready release intact', async () => {
  const storage = new MemoryStorage();
  let current = await fixture();
  let failure;
  const cache = createReleaseCache({
    scope, storage,
    async fetchAsset(url) {
      if (failure && url.endsWith('/game.js')) {
        if (failure === 'interrupted') throw new DOMException('Connection lost', 'AbortError');
        if (failure === 'missing') return new Response(null, { status: 404 });
        if (failure === 'server') return new Response(null, { status: 500 });
        if (failure === 'opaque') return { status: 200, type: 'opaque' };
        return new Response('different content');
      }
      return new Response(current.payloads.get(url));
    },
  });
  const original = await cache.install(current.manifest, null, () => {});
  current = await fixture({ './game.js': 'new release' });
  for (failure of ['interrupted', 'missing', 'server', 'opaque', 'mismatch']) {
    await assert.rejects(cache.install(current.manifest, original, () => {}));
    assert.deepEqual(await storage.keys(), [original.cacheName]);
    assert.deepEqual((await cache.ready()).map(release => release.tag), [original.tag]);
  }
});

test('a stalled download can time out and retry without publishing a partial release', async () => {
  const storage = new MemoryStorage();
  const release = await fixture();
  let stall = true;
  const cache = createReleaseCache({
    scope, storage, downloadTimeout: 300,
    async fetchAsset(url, { signal }) {
      if (stall && url.endsWith('/game.js')) {
        return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
      }
      return new Response(release.payloads.get(url));
    },
  });
  await assert.rejects(cache.install(release.manifest, null, () => {}), /timed out/);
  assert.deepEqual(await storage.keys(), []);
  stall = false;
  const ready = await cache.install(release.manifest, null, () => {});
  assert.equal((await cache.ready())[0].tag, ready.tag);
});

test('optional files are allowlisted, verified again on reuse, and isolated by release', async () => {
  const storage = new MemoryStorage();
  const entry = new URL(hiddenEntry, scope).href;
  const assetPath = './areas/secret-apartment/poster.png';
  const entries = [...manifest.onDemandFiles, { path: assetPath }].sort((a, b) => a.path < b.path ? -1 : 1);
  const original = await fixture({}, manifest.files, entries);
  let network = original;
  let unavailable = false;
  let redirect = false;
  const requests = [];
  const cache = createReleaseCache({
    scope, storage,
    async fetchAsset(url, options) {
      requests.push(url);
      assert.equal(options.redirect, 'error');
      if (unavailable) throw new TypeError('Offline');
      const response = new Response(network.payloads.get(url));
      if (redirect) Object.defineProperty(response, 'redirected', { value: true });
      return response;
    },
  });
  const progress = [];
  const installed = await cache.install(original.manifest, null, status => progress.push(status));
  assert.equal(requests.length, manifest.files.length);
  assert.deepEqual(requests.filter(url => url.includes('/secret-apartment/')), [new URL(hiddenThumbnail, scope).href]);
  assert.equal(progress.at(-1).total, manifest.files.length);
  assert.equal(progress.at(-1).downloaded, manifest.files.length);

  assert.equal((await cache.readAsset(installed.tag, './unlisted.js')).status, 404);
  assert.equal(requests.length, manifest.files.length);
  unavailable = true;
  assert.equal((await cache.readAsset(installed.tag, hiddenEntry)).status, 503);
  unavailable = false;
  redirect = true;
  assert.equal((await cache.readAsset(installed.tag, hiddenEntry)).status, 503);
  redirect = false;

  requests.length = 0;
  const results = await Promise.all([cache.readAsset(installed.tag, hiddenEntry), cache.readAsset(installed.tag, hiddenEntry)]);
  assert.deepEqual(requests, [entry]);
  for (const { response } of results) assert.equal(await response.text(), hiddenEntry);
  unavailable = true;
  assert.equal(await (await cache.readAsset(installed.tag, hiddenEntry)).response.text(), hiddenEntry);
  assert.deepEqual(requests, [entry]);
  const asset = await cache.readAsset(installed.tag, assetPath);
  assert.equal(asset.status, 503, 'only requested files were cached');
  storage.caches.get(installed.cacheName).set(entry, new Response('tampered cached bytes'));
  assert.equal((await cache.readAsset(installed.tag, hiddenEntry)).status, 503);
  assert.equal((await cache.ready())[0].tag, installed.tag);

  unavailable = false;
  network = await fixture({ [hiddenEntry]: '// Different version' }, manifest.files, entries);
  assert.equal((await cache.readAsset(installed.tag, hiddenEntry)).status, 409);
  assert.equal((await cache.ready())[0].tag, installed.tag);
  const latest = await cache.install(network.manifest, installed, () => {});
  const matched = await cache.readAsset(latest.tag, hiddenEntry);
  assert.equal(await matched.response.text(), '// Different version');
  await cache.prune([installed.tag, latest.tag]);
  assert.ok(await cache.read(installed.tag, new URL('game.js', scope)));
  assert.ok(await cache.read(latest.tag, new URL('game.js', scope)));
});

test('the worker shares a download and serves lazy area modules and versioned statistics offline', async t => {
  const shell = '<script type="module" src="./pwa/bootstrap.js"></script>';
  const stats = '<html data-stats-url="./area-stats.json">';
  const source = await readFile(new URL('game.js', root), 'utf8');
  const files = { './index.html': shell, './stats.html': stats, './game.js': source };
  const firstStats = { revision: 1, updatedAt: '2026-11-23T18:10:00.000Z' };
  let release = await fixture({ ...files, './area-stats.json': JSON.stringify(firstStats) });
  const storage = new MemoryStorage();
  const events = new Map();
  const client = { id: 'test-client', url: scope.href };
  let offline = false;
  const simulatedWorker = {
    registration: { scope: scope.href },
    navigator: { get onLine() { return !offline; } },
    addEventListener(name, listener) { events.set(name, listener); },
  };
  const requests = [];
  const network = async resource => {
    const url = String(resource);
    requests.push(url);
    if (offline) throw new TypeError('Offline');
    if (url === new URL('version.json', scope).href) return Response.json(release.manifest);
    return new Response(release.payloads.get(url));
  };
  for (const [name, value] of Object.entries({ self: simulatedWorker, caches: storage, fetch: network })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }
  await import('../pwa/worker.js');

  function prepare(isOffline = false, report = () => {}) {
    return new Promise((resolve, reject) => {
      events.get('message')({
        data: { type: 'prepare', offline: isOffline }, source: client,
        ports: [{ postMessage(message) {
          if (message.stage === 'complete') resolve(message.result);
          else report(message);
        } }],
        waitUntil: task => task.catch(reject),
      });
    });
  }

  function request(path, mode = 'navigate') {
    return new Promise(resolve => events.get('fetch')({
      request: { method: 'GET', mode, url: new URL(path, scope).href },
      respondWith: resolve,
      waitUntil() {},
    }));
  }

  const progress = [];
  const [first, second] = await Promise.all([prepare(false, status => progress.push(status)), prepare()]);
  assert.equal(progress[0].stage, 'checking');
  assert.equal(progress[1].completed, 0);
  assert.equal(progress.at(-1).completed, progress.at(-1).total);
  assert.ok(progress.slice(1).every(status => status.version === release.manifest.version));
  assert.equal(first.version, release.manifest.version);
  assert.equal(first.tag, second.tag);
  assert.equal(requests.length, release.manifest.files.length + 1);
  assert.equal((await storage.keys()).length, 1);
  offline = true;
  const cached = await prepare(true);
  assert.equal(cached.tag, first.tag);
  assert.equal(cached.version, first.version);
  const response = await request('index.html?area=snow');
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes(assetBase(scope, first.tag).pathname + 'pwa/bootstrap.js'));
  const gameURL = new URL('game.js', assetBase(scope, first.tag));
  const game = await (await request(gameURL, 'cors')).text();
  const loaders = [...game.matchAll(/import\('([^']+\/index\.js)'\)/g)].map(match => match[1]);
  assert.ok(loaders.includes(snowEntry));
  assert.ok(loaders.includes(hiddenEntry));
  assert.ok(loaders.includes('./areas/kung-fu-hustle/index.js'));
  assert.equal(loaders.length, 9);
  for (const path of loaders.filter(path => path !== hiddenEntry)) {
    const module = await request(new URL(path, gameURL), 'cors');
    assert.equal(module.status, 200, path);
    assert.match(module.headers.get('Content-Type'), /javascript/);
    assert.equal(await module.text(), path);
  }
  const firstData = new URL('area-stats.json', assetBase(scope, first.tag));
  assert.equal(await (await request('stats.html')).text(), `<html data-stats-url="${firstData.pathname}">`);
  assert.deepEqual(await (await request(firstData, 'cors')).json(), firstStats);
  const [, exporterPath] = game.match(/import\('(\.\/core\/scene-exporter\.js)'\)/) ?? [];
  assert.ok(exporterPath);
  const exporter = await request(new URL(exporterPath, gameURL), 'cors');
  assert.equal(exporter.status, 200);
  assert.match(exporter.headers.get('Content-Type'), /javascript/);
  const thumbnail = await request(new URL(hiddenThumbnail, firstData), 'cors');
  assert.equal(thumbnail.status, 200);
  assert.equal(requests.length, release.manifest.files.length + 1);
  assert.equal((await storage.keys()).length, 1);

  const hiddenURL = new URL(hiddenEntry, gameURL);
  assert.equal((await request(hiddenURL, 'cors')).status, 503);
  offline = false;
  const fetched = await request(hiddenURL, 'cors');
  assert.equal(fetched.status, 200);
  assert.match(fetched.headers.get('Content-Type'), /javascript/);
  assert.equal(await fetched.text(), hiddenEntry);
  assert.equal(requests.at(-1), new URL(hiddenEntry, scope).href);
  offline = true;
  const downloaded = requests.length;
  assert.equal(await (await request(hiddenURL, 'cors')).text(), hiddenEntry);
  assert.equal((await request(new URL('./unlisted.js', gameURL), 'cors')).status, 404);
  assert.equal(requests.length, downloaded);
  offline = false;
  release = await fixture({ ...files, './area-stats.json': '{"revision":2}' });
  const updateURL = new URL('area-stats.json', scope).href;
  const validUpdate = release.payloads.get(updateURL);
  release.payloads.set(updateURL, 'corrupt update');
  const attempted = [];
  const fallback = await prepare(false, status => attempted.push(status));
  assert.ok(attempted.some(status => status.version === release.manifest.version));
  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.tag, first.tag);
  assert.equal(fallback.version, first.version);
  release.payloads.set(updateURL, validUpdate);
  const newPage = await (await request('stats.html')).text();
  const newData = newPage.match(/data-stats-url="([^"]+)"/)[1];
  assert.notEqual(newData, firstData.pathname);
  assert.deepEqual(await (await request(newData, 'cors')).json(), { revision: 2 });
  assert.deepEqual(await (await request(firstData, 'cors')).json(), firstStats);
  assert.deepEqual(requests.slice(-2), [new URL('version.json', scope).href, new URL('area-stats.json', scope).href]);
});

test('ignores incomplete caches and prunes scoped caches while preserving the selected release', async () => {
  const storage = new MemoryStorage();
  let current = await fixture();
  const cache = createReleaseCache({
    scope, storage,
    fetchAsset: async url => new Response(current.payloads.get(url)),
  });
  const active = await cache.install(current.manifest, null, () => {});
  for (let i = 1; i <= 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 2));
    current = await fixture({ './game.js': `release ${i}` });
    await cache.install(current.manifest, active, () => {});
  }
  const abandoned = `kids-world:%2FKids-World%2F:${current.manifest.version}-${crypto.randomUUID()}`;
  await storage.open(abandoned);
  await storage.open('unrelated');
  await storage.open('kids-world:%2FOtherGame%2F:test');
  await storage.open('kids-world:%2FKids-World%2F:other-storage');
  assert.equal(await cache.read(abandoned.split(':').at(-1), new URL('index.html', scope)), undefined);
  assert.equal((await cache.ready()).length, 4);

  await cache.prune([active.tag], () => false);
  assert.ok((await storage.keys()).includes(abandoned));
  assert.equal((await cache.ready()).length, 4);
  await cache.prune([active.tag]);
  assert.ok(await cache.read(active.tag, new URL('game.js', scope)));
  assert.equal((await cache.ready()).length, 3);
  assert.ok((await storage.keys()).includes('unrelated'));
  assert.ok((await storage.keys()).includes('kids-world:%2FOtherGame%2F:test'));
  assert.ok((await storage.keys()).includes('kids-world:%2FKids-World%2F:other-storage'));
  assert.ok(!(await storage.keys()).includes(abandoned));

  storage.caches.get(active.cacheName).delete(new URL('index.html', scope).href);
  assert.ok(!(await cache.ready()).some(release => release.tag === active.tag));
});
