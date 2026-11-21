import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createReleaseCache } from '../pwa/cache.js';
import { assetBase, sha256, validateManifest, versionFor } from '../pwa/release.js';

const manifest = JSON.parse(await readFile(new URL('../version.json', import.meta.url), 'utf8'));
const scope = new URL('https://example.test/Kids-World/');
const root = new URL('../', import.meta.url);
const snowEntry = './areas/snow-basin/index.js';
const previousSnowEntry = './areas/snow-basin.js';

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

async function fixture(changes = {}, entries = manifest.files) {
  const payloads = new Map();
  const files = await Promise.all(entries.map(async ({ path }) => {
    const body = changes[path] ?? path;
    payloads.set(new URL(path, scope).href, body);
    return { path, revision: await sha256(new TextEncoder().encode(body)) };
  }));
  return { manifest: { version: await versionFor(files), files }, payloads };
}

test('checked-in release matches every runtime file and the worker version changes with releases', () => {
  execFileSync(process.execPath, ['scripts/generate-pwa-manifest.mjs', '--check'], {
    cwd: root,
  });
  const paths = manifest.files.map(file => file.path);
  for (const path of ['./vendor/three.core.min.js', snowEntry, './stats.html', './area-stats.json']) {
    assert.ok(paths.includes(path), path);
  }
  for (const area of ['arendelle-village', 'flower-garden', 'frozen-castle', 'military-base',
    'princess-gallery', 'secret-apartment', 'snow-basin', 'wooden-house']) {
    assert.ok(paths.includes(`./areas/${area}/music.js`), area);
  }
  assert.ok(!paths.includes(previousSnowEntry));
  assert.ok(paths.every(path => !path.startsWith('./tests/')));
});

test('the game entry and pinned Three.js resolve from local modules', async () => {
  const { startGame } = await import('../game.js');
  const { REVISION } = await import('../vendor/three.module.min.js');
  assert.equal(typeof startGame, 'function');
  assert.equal(REVISION, '179');
});

test('new area files invalidate release metadata; colocated development files do not', async t => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'kids-world-release-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const files = ['version.json', 'sw.js', 'scripts/generate-pwa-manifest.mjs', ...manifest.files.map(file => file.path)];
  await Promise.all(files.map(file => cp(new URL(file, root), join(fixtureRoot, file))));
  const area = join(fixtureRoot, 'areas', 'new-area');
  await mkdir(join(area, 'tests'), { recursive: true });
  await writeFile(join(area, 'README.md'), '# Area development notes');
  await writeFile(join(area, 'tests', 'fixture.json'), '{}');
  await writeFile(join(area, 'area.test.mjs'), '// Test');
  function generate(...args) {
    return execFileSync(process.execPath, ['scripts/generate-pwa-manifest.mjs', ...args], {
      cwd: fixtureRoot, stdio: 'pipe',
    });
  }
  assert.doesNotThrow(() => generate('--check'));
  await writeFile(join(area, 'index.js'), 'export const area = {};');
  assert.throws(() => generate('--check'), /version\.json is out of date/);
  assert.equal(await readFile(join(fixtureRoot, 'version.json'), 'utf8'), await readFile(new URL('version.json', root), 'utf8'));
  generate();
  assert.doesNotThrow(() => generate('--check'));
  const generated = JSON.parse(await readFile(join(fixtureRoot, 'version.json'), 'utf8'));
  assert.deepEqual(generated.files.filter(file => file.path.includes('/new-area/')).map(file => file.path), [
    './areas/new-area/index.js',
  ]);
  assert.notEqual(generated.version, manifest.version);
  assert.ok((await readFile(join(fixtureRoot, 'sw.js'), 'utf8')).includes(generated.version));
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
});

test('keeps releases with the previous Snow Basin layout available as cached fallbacks', async () => {
  const previousEntries = manifest.files.map(({ path }) => ({ path: path === snowEntry ? previousSnowEntry : path }))
    .sort((a, b) => a.path < b.path ? -1 : Number(a.path > b.path));
  const previous = await fixture({}, previousEntries);
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

test('the worker shares a concurrent download and serves the game and versioned statistics offline', async t => {
  const shell = '<script type="module" src="./pwa/bootstrap.js"></script>';
  const stats = '<html data-stats-url="./area-stats.json">';
  let release = await fixture({ './index.html': shell, './stats.html': stats, './area-stats.json': '{"revision":1}' });
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

  function prepare(isOffline = false) {
    return new Promise((resolve, reject) => {
      events.get('message')({
        data: { type: 'prepare', offline: isOffline }, source: client,
        ports: [{ postMessage(message) { if (message.stage === 'complete') resolve(message.result); } }],
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

  const [first, second] = await Promise.all([prepare(), prepare()]);
  assert.equal(first.tag, second.tag);
  assert.equal(requests.length, release.manifest.files.length + 1);
  assert.equal((await storage.keys()).length, 1);
  offline = true;
  assert.equal((await prepare(true)).tag, first.tag);
  const response = await request('index.html?area=snow');
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes(assetBase(scope, first.tag).pathname + 'pwa/bootstrap.js'));
  const firstData = new URL('area-stats.json', assetBase(scope, first.tag));
  assert.equal(await (await request('stats.html')).text(), `<html data-stats-url="${firstData.pathname}">`);
  assert.deepEqual(await (await request(firstData, 'cors')).json(), { revision: 1 });
  assert.equal(requests.length, release.manifest.files.length + 1);
  assert.equal((await storage.keys()).length, 1);

  offline = false;
  release = await fixture({ './index.html': shell, './stats.html': stats, './area-stats.json': '{"revision":2}' });
  const newPage = await (await request('stats.html')).text();
  const newData = newPage.match(/data-stats-url="([^"]+)"/)[1];
  assert.notEqual(newData, firstData.pathname);
  assert.deepEqual(await (await request(newData, 'cors')).json(), { revision: 2 });
  assert.deepEqual(await (await request(firstData, 'cors')).json(), { revision: 1 });
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
