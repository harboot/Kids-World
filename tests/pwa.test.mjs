import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createReleaseCache } from '../pwa/cache.js';
import { assetBase, sha256, validateManifest, versionFor } from '../pwa/release.js';

const manifest = JSON.parse(await readFile(new URL('../version.json', import.meta.url), 'utf8'));
const scope = new URL('https://example.test/Kids-World/');

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

async function fixture(changes = {}) {
  const payloads = new Map();
  const files = await Promise.all(manifest.files.map(async ({ path }) => {
    const body = changes[path] ?? path;
    payloads.set(new URL(path, scope).href, body);
    return { path, revision: await sha256(new TextEncoder().encode(body)) };
  }));
  return { manifest: { version: await versionFor(files), files }, payloads };
}

test('checked-in release matches every runtime file and the worker version changes with releases', () => {
  execFileSync(process.execPath, ['scripts/generate-pwa-manifest.mjs', '--check'], {
    cwd: new URL('../', import.meta.url),
  });
  assert.ok(manifest.files.some(file => file.path === './vendor/three.core.min.js'));
  assert.ok(manifest.files.some(file => file.path === './areas/snow-basin.js'));
  assert.ok(manifest.files.every(file => !file.path.startsWith('./tests/')));
});

test('rejects invalid, duplicate, missing and out-of-scope manifest entries', async () => {
  await validateManifest(manifest);
  await assert.rejects(validateManifest({ version: '1.0.0', files: [] }));
  for (const files of [
    manifest.files.filter(file => file.path !== './areas/snow-basin.js'),
    [...manifest.files, manifest.files.at(-1)],
    [{ path: './pwa/../version.json', revision: manifest.files[0].revision }, ...manifest.files],
  ]) {
    await assert.rejects(validateManifest({ version: await versionFor(files), files }));
  }
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
        if (failure === 'opaque') return { status: 200, type: 'opaque' };
        return new Response('different content');
      }
      return new Response(current.payloads.get(url));
    },
  });
  const original = await cache.install(current.manifest, null, () => {});
  current = await fixture({ './game.js': 'new release' });
  for (failure of ['interrupted', 'missing', 'opaque', 'mismatch']) {
    await assert.rejects(cache.install(current.manifest, original, () => {}));
    assert.deepEqual(await storage.keys(), [original.cacheName]);
    assert.deepEqual((await cache.ready()).map(release => release.tag), [original.tag]);
  }
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
  assert.equal(await cache.read(abandoned.split(':').at(-1), new URL('index.html', scope)), undefined);
  assert.equal((await cache.ready()).length, 4);

  await cache.prune([active.tag]);
  assert.ok(await cache.read(active.tag, new URL('game.js', scope)));
  assert.equal((await cache.ready()).length, 3);
  assert.ok((await storage.keys()).includes('unrelated'));
  assert.ok((await storage.keys()).includes('kids-world:%2FOtherGame%2F:test'));
  assert.ok(!(await storage.keys()).includes(abandoned));

  storage.caches.get(active.cacheName).delete(new URL('index.html', scope).href);
  assert.ok(!(await cache.ready()).some(release => release.tag === active.tag));
});
