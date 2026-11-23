import { createReleaseCache } from './cache.js';
import { assetBase, releaseRoute, releaseTag, validateManifest, withTimeout } from './release.js';

const scope = new URL(self.registration.scope);
const releases = createReleaseCache({ scope });
const publicAssets = new Set([
  'manifest.webmanifest', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
]);
const shellAssets = ['./pwa/loading.css', './pwa/bootstrap.js', './style.css'];
const documents = new Set(['', 'index.html', 'snow.html', 'stats.html']);
const storageErrors = new Set(['QuotaExceededError', 'SecurityError', 'NotAllowedError']);
let checking;
let pruning;
let progress;
const subscribers = new Set();
const readyReleases = () => withTimeout(releases.ready(), 5000, 'Kids World cache access timed out');

function prepareResult(release, status) {
  return { tag: release?.tag, version: release?.version, status };
}

async function prepare({ offline, preferred, cachedOnly }, report) {
  const available = await readyReleases();
  const previous = available.find(release => release.tag === preferred) ?? available[0];
  if (offline || cachedOnly) return prepareResult(previous, offline ? 'offline' : 'ready');

  report({ stage: 'checking' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  let manifest;
  try {
    const response = await fetch(new URL('version.json', scope), {
      cache: 'no-store', redirect: 'error', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Release check returned HTTP ${response.status}`);
    manifest = await validateManifest(await response.json());
  } catch (error) {
    console.warn('Kids World release check failed.', error);
    const offline = controller.signal.aborted || error instanceof TypeError;
    return prepareResult(previous, offline ? 'offline' : 'fallback');
  } finally {
    clearTimeout(timer);
  }

  const existing = available.find(release => release.version === manifest.version);
  if (existing) return prepareResult(existing, 'ready');

  try {
    const release = await releases.install(manifest, previous, report);
    return prepareResult(release, 'ready');
  } catch (error) {
    console.warn('Kids World release download failed.', error);
    return prepareResult(previous, !previous && storageErrors.has(error?.name) ? 'storage' : 'fallback');
  }
}

function sharePreparation(options, port) {
  if (options.cachedOnly || options.offline) return prepare(options, () => {});
  if (port) {
    subscribers.add(port);
    if (progress) port.postMessage(progress);
  }
  checking ??= Promise.resolve(pruning).catch(() => {}).then(() => prepare(options, status => {
    progress = status;
    for (const subscriber of subscribers) subscriber.postMessage(status);
  })).finally(() => {
    checking = null;
    progress = null;
    subscribers.clear();
  });
  return checking;
}

async function prune(source, tag) {
  async function soleWindow() {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const local = windows.filter(client => client.url.startsWith(scope.href));
    return local.length === 1 && local[0].id === source?.id;
  }
  if (await soleWindow()) await releases.prune([tag], soleWindow);
}

self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port || !event.source?.url.startsWith(scope.href)) return;
  let task;
  if (event.data?.type === 'prepare') {
    task = sharePreparation(event.data, port);
  } else if (event.data?.type === 'prune' && releaseTag.test(event.data.tag)) {
    if (!checking && !pruning) {
      pruning = prune(event.source, event.data.tag).finally(() => { pruning = null; });
    }
    task = pruning ?? Promise.resolve();
  } else {
    return;
  }
  event.waitUntil(task.then(result => {
    port.postMessage({ stage: 'complete', result });
  }).catch(error => {
    console.warn('Kids World storage request failed.', error);
    port.postMessage({ stage: 'error' });
  }));
});

async function releasedAsset(relative, search) {
  const path = relative.slice(releaseRoute.length);
  const separator = path.indexOf('/');
  const tag = path.slice(0, separator);
  const file = path.slice(separator + 1);
  if (separator < 0 || !releaseTag.test(tag) || !file || file === 'sw.js' || search) {
    return new Response('Game file not found', { status: 404 });
  }
  const url = new URL(file, scope);
  if (!url.href.startsWith(scope.href) || url.pathname !== scope.pathname + file) {
    return new Response('Game file not found', { status: 404 });
  }
  const { response, status } = await releases.readAsset(tag, './' + file).catch(error => {
    console.warn('Kids World could not read a release file.', error);
    return { status: 503 };
  });
  if (!response) {
    const message = status === 409 ? 'Game file changed. Reload to check for updates.' : 'Game file unavailable';
    return new Response(message, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  // Use the versioned request URL as the base for relative module imports.
  const contentType = /\.[cm]?js$/i.test(file) ? 'text/javascript; charset=utf-8'
    : response.headers.get('Content-Type') ?? 'application/octet-stream';
  return new Response(response.body, {
    headers: { 'Content-Type': contentType },
  });
}

function retryPage(message) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>Kids World</title><body style="font:1.1rem system-ui;background:#e9eedc;color:#253e29;padding:2rem">
    <h1>Kids World</h1><p>${message}</p>
    <button style="padding:.7em 1em;font:inherit" onclick="location.reload()">Try again</button></body>`,
  { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function cachedDocument(url, relative) {
  await pruning?.catch(() => {});
  const available = await readyReleases();
  const requested = url.searchParams.get('__kw_release');
  const selected = available.findIndex(release => release.tag === requested);
  if (selected > 0) available.unshift(...available.splice(selected, 1));
  const document = relative || 'index.html';
  for (const release of available) {
    try {
      const cached = await releases.read(release.tag, new URL(document, scope));
      if (!cached) continue;
      if (document === 'snow.html') return cached;
      let html = await cached.text();
      const base = assetBase(scope, release.tag);
      if (document === 'stats.html') {
        const data = new URL('area-stats.json', base).pathname;
        html = html.replace('data-stats-url="./area-stats.json"', `data-stats-url="${data}"`);
      } else {
        for (const file of shellAssets) {
          html = html.replace(`="${file}"`, `="${new URL(file, base).pathname}"`);
        }
      }
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } catch (error) {
      console.warn('Kids World cached page could not be opened.', error);
    }
  }
}

function fetchFromNetwork(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function navigate(request, url, relative) {
  try {
    const cached = await withTimeout(cachedDocument(url, relative), 6000, 'Kids World cached page timed out');
    if (cached) return cached;
  } catch (error) {
    console.warn('Kids World cache could not be opened.', error);
  }
  try {
    const response = await fetchFromNetwork(request);
    if (response.ok) return response;
    console.warn(`Kids World page returned HTTP ${response.status}.`);
    return retryPage(relative === 'stats.html' ? 'Area statistics could not open.' : 'Your adventure could not open. Try again!');
  } catch {
    return retryPage(relative === 'stats.html' ? 'Connect to the internet to open area statistics.' :
      'Connect to the internet to download your adventure.');
  }
}

async function navigateStats(event, url, relative) {
  if (self.navigator?.onLine !== false) {
    const update = sharePreparation({}).catch(error => console.info('Kids World release check deferred.', error));
    event.waitUntil(update);
    await withTimeout(update, 2500, 'Kids World release check still running').catch(() => {});
  }
  return navigate(event.request, url, relative);
}

async function publicAsset(request, url) {
  try {
    const [release] = await readyReleases();
    if (release) {
      const cached = await withTimeout(releases.read(release.tag, url), 5000, 'Kids World icon cache timed out');
      if (cached) return cached;
    }
  } catch (error) {
    console.info('Kids World cached install asset unavailable.', error);
  }
  return fetchFromNetwork(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (relative.startsWith(releaseRoute)) event.respondWith(releasedAsset(relative, url.search));
  else if (request.mode === 'navigate' && documents.has(relative)) {
    event.respondWith(relative === 'stats.html' ? navigateStats(event, url, relative) : navigate(request, url, relative));
  } else if (publicAssets.has(relative)) {
    event.respondWith(publicAsset(request, new URL(relative, scope)));
  }
});
