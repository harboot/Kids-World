export const releaseRoute = '__kids-world__/';
export const releaseTag = /^[a-f0-9]{64}-[a-f0-9-]{36}$/;
const digest = /^[a-f0-9]{64}$/;
const safePath = /^\.\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/;
const statsPaths = ['./stats.html', './area-stats.json'];
const snowEntry = './areas/snow-basin/index.js';
const previousSnowEntry = './areas/snow-basin.js';
const requiredPaths = [
  './index.html', './style.css', './game.js', './snow.html',
  './core/game.js',
  './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './pwa/bootstrap.js', './pwa/loading.css', './pwa/release.js', './pwa/cache.js', './pwa/worker.js',
  './vendor/three.module.min.js', './vendor/three.core.min.js', './vendor/three.LICENSE',
];

export async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function versionFor(files, onDemandFiles) {
  const contents = onDemandFiles === undefined ? files : { files, onDemandFiles };
  return sha256(new TextEncoder().encode(JSON.stringify(contents)));
}

export async function validateManifest(manifest, { allowPreviousSnowEntry = false } = {}) {
  if (!manifest || typeof manifest.version !== 'string' || !digest.test(manifest.version) || !Array.isArray(manifest.files) ||
      (manifest.onDemandFiles !== undefined && !Array.isArray(manifest.onDemandFiles))) {
    throw new Error('Invalid release manifest');
  }

  const seen = new Set();
  for (const files of [manifest.files, manifest.onDemandFiles ?? []]) {
    let previous = '';
    for (const file of files) {
      if (!file || typeof file.path !== 'string' || !safePath.test(file.path) || seen.has(file.path) ||
          file.path <= previous || typeof file.revision !== 'string' || !digest.test(file.revision) ||
          Object.keys(file).length !== 2) {
        throw new Error('Invalid release file entry');
      }
      seen.add(file.path);
      previous = file.path;
    }
  }

  const paths = new Set(manifest.files.map(file => file.path));
  // Older complete releases use their original area entry and fingerprint rules.
  const legacy = manifest.onDemandFiles === undefined;
  const validLegacyAreas = paths.has('./areas/flower-garden/index.js') &&
    (paths.has(snowEntry) ? !paths.has(previousSnowEntry) : allowPreviousSnowEntry && paths.has(previousSnowEntry));
  const missingStatsFile = statsPaths.some(path => paths.has(path)) && statsPaths.some(path => !paths.has(path));
  if (requiredPaths.some(path => !paths.has(path)) || missingStatsFile ||
      (legacy ? !validLegacyAreas : !paths.has('./area-catalog.js') || !statsPaths.every(path => paths.has(path))) ||
      await versionFor(manifest.files, manifest.onDemandFiles) !== manifest.version) {
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
