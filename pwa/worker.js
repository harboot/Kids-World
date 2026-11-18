import { createReleaseCache } from './cache.js';
import { assetBase, releaseRoute, releaseTag, validateManifest } from './release.js';

const scope = new URL(self.registration.scope);
const releases = createReleaseCache({ scope });
const publicAssets = new Set([
  'manifest.webmanifest', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
]);
const shellAssets = ['./pwa/loading.css', './pwa/bootstrap.js', './style.css'];
let checking;
let pruning;
let progress;
const subscribers = new Set();

function prepareResult(release, status) {
  return { tag: release?.tag, version: release?.version, status };
}

async function prepare({ offline, preferred, cachedOnly }, report) {
  const available = await releases.ready();
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
    return prepareResult(previous, 'fallback');
  }
}

function sharePreparation(options, port) {
  if (options.cachedOnly || options.offline) return prepare(options, () => {});
  subscribers.add(port);
  if (progress) port.postMessage(progress);
  checking ??= Promise.resolve(pruning).then(() => prepare(options, status => {
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
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const local = windows.filter(client => client.url.startsWith(scope.href));
  if (local.length === 1 && local[0].id === source?.id) await releases.prune([tag]);
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

async function releasedAsset(relative) {
  const path = relative.slice(releaseRoute.length);
  const separator = path.indexOf('/');
  const tag = path.slice(0, separator);
  const file = path.slice(separator + 1);
  if (separator < 0 || !releaseTag.test(tag) || !file || file === 'sw.js') {
    return new Response('Game file not found', { status: 404 });
  }
  const url = new URL(file, scope);
  if (!url.href.startsWith(scope.href) || url.pathname !== scope.pathname + file) {
    return new Response('Game file not found', { status: 404 });
  }
  const cached = await releases.read(tag, url);
  if (!cached) return new Response('Game file unavailable', { status: 503 });
  // Use the versioned request URL as the base for relative module imports.
  return new Response(cached.body, {
    headers: { 'Content-Type': cached.headers.get('Content-Type') ?? 'application/octet-stream' },
  });
}

function offlinePage() {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>Kids World</title><body style="font:1.1rem system-ui;background:#e9eedc;color:#253e29;padding:2rem">
    <h1>Kids World</h1><p>Connect to the internet to download your adventure.</p>
    <button style="padding:.7em 1em;font:inherit" onclick="location.reload()">Try again</button></body>`,
  { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function navigate(request, url, relative) {
  const available = await releases.ready().catch(error => {
    console.warn('Kids World cache could not be opened.', error);
    return [];
  });
  const requested = url.searchParams.get('__kw_release');
  const release = available.find(item => item.tag === requested) ?? available[0];
  if (release) {
    const document = relative === 'snow.html' ? 'snow.html' : 'index.html';
    const cached = await releases.read(release.tag, new URL(document, scope));
    if (cached && document === 'snow.html') return cached;
    if (cached) {
      let html = await cached.text();
      const base = assetBase(scope, release.tag);
      for (const file of shellAssets) {
        html = html.replace(`="${file}"`, `="${new URL(file, base).pathname}"`);
      }
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }

  try {
    return await fetch(request);
  } catch {
    return offlinePage();
  }
}

async function publicAsset(request, url) {
  const [release] = await releases.ready().catch(() => []);
  return (release && await releases.read(release.tag, url)) ?? fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (relative.startsWith(releaseRoute)) event.respondWith(releasedAsset(relative));
  else if (request.mode === 'navigate' && ['', 'index.html', 'snow.html'].includes(relative)) {
    event.respondWith(navigate(request, url, relative));
  } else if (publicAssets.has(relative)) {
    event.respondWith(publicAsset(request, new URL(relative, scope)));
  }
});
