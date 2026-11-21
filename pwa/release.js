export const releaseRoute = '__kids-world__/';
export const releaseTag = /^[a-f0-9]{64}-[a-f0-9-]{36}$/;
const digest = /^[a-f0-9]{64}$/;
const safePath = /^\.\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/;
const statsPaths = ['./stats.html', './area-stats.json'];
const requiredPaths = [
  './index.html', './style.css', './game.js', './snow.html',
  './core/game.js', './areas/flower-garden/index.js', './areas/snow-basin.js',
  './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './pwa/bootstrap.js', './pwa/loading.css', './pwa/release.js', './pwa/cache.js', './pwa/worker.js',
  './vendor/three.module.min.js', './vendor/three.core.min.js', './vendor/three.LICENSE',
];

export async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function versionFor(files) {
  return sha256(new TextEncoder().encode(JSON.stringify(files)));
}

export async function validateManifest(manifest) {
  if (!manifest || !digest.test(manifest.version) || !Array.isArray(manifest.files)) {
    throw new Error('Invalid release manifest');
  }

  let previous = '';
  const paths = new Set();
  for (const file of manifest.files) {
    if (!file || typeof file.path !== 'string' || !safePath.test(file.path) ||
        file.path <= previous || typeof file.revision !== 'string' || !digest.test(file.revision) ||
        Object.keys(file).length !== 2) {
      throw new Error('Invalid release file entry');
    }
    paths.add(file.path);
    previous = file.path;
  }

  // Keep releases that predate the dashboard usable as an offline fallback.
  const missingStatsFile = statsPaths.some(path => paths.has(path)) && statsPaths.some(path => !paths.has(path));
  if (requiredPaths.some(path => !paths.has(path)) || missingStatsFile ||
      await versionFor(manifest.files) !== manifest.version) {
    throw new Error('Release manifest is incomplete or its fingerprint does not match');
  }
  return manifest;
}

export function assetBase(scope, tag) {
  return new URL(`${releaseRoute}${tag}/`, scope);
}

export function withTimeout(task, ms, message) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([task, deadline]).finally(() => clearTimeout(timer));
}
