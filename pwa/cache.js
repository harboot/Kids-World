import { releaseTag, sha256, validateManifest } from './release.js';

const usable = response => response?.status === 200 && !['opaque', 'opaqueredirect', 'error'].includes(response.type);

export function createReleaseCache({ scope, storage = caches, fetchAsset = fetch, downloadTimeout = 45000 }) {
  const prefix = `kids-world:${encodeURIComponent(scope.pathname)}:`;
  const marker = new URL('__kids-world__/complete', scope).href;

  async function metadata(cacheName) {
    const response = await storage.match(marker, { cacheName });
    if (!response) return null;
    try {
      const data = await response.json();
      const tag = cacheName.slice(prefix.length);
      await validateManifest(data, { allowPreviousSnowEntry: true });
      if (!tag.startsWith(data.version + '-') || !Number.isFinite(data.completedAt)) return null;
      return { ...data, tag, cacheName };
    } catch {
      return null;
    }
  }

  async function filesPresent(cacheName, files) {
    const present = await Promise.all(files.map(file => storage.match(new URL(file.path, scope), { cacheName })));
    return present.every(usable);
  }

  async function ready() {
    const names = (await storage.keys()).filter(name => name.startsWith(prefix) && releaseTag.test(name.slice(prefix.length)));
    const releases = await Promise.all(names.map(async name => {
      const release = await metadata(name);
      if (release && await filesPresent(name, release.files)) return release;
      return null;
    }));
    return releases.filter(Boolean).sort((a, b) => b.completedAt - a.completedAt);
  }

  async function read(tag, url) {
    if (!releaseTag.test(tag)) return undefined;
    const cacheName = prefix + tag;
    if (!await storage.match(marker, { cacheName })) return undefined;
    return storage.match(url, { cacheName });
  }

  async function install(manifest, previous, report) {
    const tag = `${manifest.version}-${crypto.randomUUID()}`;
    const cacheName = prefix + tag;
    const cache = await storage.open(cacheName);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(new Error('Game download timed out')), downloadTimeout);
    const revisions = new Map(previous?.files.map(file => [file.path, file.revision]));
    let completed = 0;
    let downloaded = 0;
    const total = manifest.files.length;

    function progress(stage) {
      report({ stage, completed, downloaded, total });
    }

    async function save(file) {
      const url = new URL(file.path, scope).href;
      let response;
      let reused = false;
      if (revisions.get(file.path) === file.revision) {
        response = await storage.match(url, { cacheName: previous.cacheName });
        reused = usable(response) && await sha256(await response.clone().arrayBuffer()) === file.revision;
      }
      if (!reused) {
        response = await fetchAsset(url, { cache: 'no-store', redirect: 'error', signal: abort.signal });
        if (!usable(response) || await sha256(await response.clone().arrayBuffer()) !== file.revision) {
          throw new Error(`Download verification failed for ${file.path}`);
        }
      }
      await cache.put(url, response);
      completed++;
      if (!reused) downloaded++;
      progress('downloading');
    }

    try {
      progress('downloading');
      const concurrency = 5;
      let next = 0;
      const jobs = Array.from({ length: Math.min(concurrency, total) }, async () => {
        try {
          while (!abort.signal.aborted && next < total) {
            await save(manifest.files[next++]);
          }
        } catch (error) {
          abort.abort(error);
        }
      });
      await Promise.all(jobs);
      if (abort.signal.aborted) throw abort.signal.reason;
      progress('verifying');
      if (!await filesPresent(cacheName, manifest.files)) throw new Error('Downloaded release is incomplete');
      const release = { ...manifest, completedAt: Date.now() };
      await cache.put(marker, new Response(JSON.stringify(release), { headers: { 'Content-Type': 'application/json' } }));
      return { ...release, tag, cacheName };
    } catch (error) {
      await storage.delete(cacheName);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function prune(keepTags, canPrune = () => true) {
    const keep = new Set(keepTags.map(tag => prefix + tag));
    const releases = await ready();
    for (const release of releases.slice(0, 2)) keep.add(release.cacheName);
    const names = await storage.keys();
    if (!await canPrune()) return;
    await Promise.all(names.filter(name => name.startsWith(prefix) && releaseTag.test(name.slice(prefix.length)) &&
      !keep.has(name)).map(name => storage.delete(name)));
  }

  return { ready, read, install, prune };
}
