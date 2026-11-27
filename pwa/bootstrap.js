import { assetBase, releaseRoute, releaseTag, withTimeout } from './release.js';

const scope = new URL('./', document.baseURI);
const scriptURL = new URL('sw.js', scope);
const shellTag = new URL(import.meta.url).pathname.slice(scope.pathname.length)
  .match(new RegExp(`^${releaseRoute}([^/]+)/`))?.[1];
const selectionParam = '__kw_release';
const checkInterval = 5 * 60 * 1000;
const splash = document.querySelector('#pwa-splash');
const status = document.querySelector('#pwa-status');
const progressPanel = document.querySelector('#pwa-progress-panel');
const meter = document.querySelector('#pwa-progress');
const percent = document.querySelector('#pwa-percent');
const versionLabel = document.querySelector('#pwa-version');
const play = document.querySelector('#pwa-play');
const retry = document.querySelector('#pwa-retry');
const update = document.querySelector('#pwa-update');
const reload = document.querySelector('#pwa-reload');
let registration;
let game;
let gameVersion;
let lastCheck = 0;
let checking = false;
let booting = false;

function showVersion(version) {
  versionLabel.textContent = /^[a-f0-9]{64}$/.test(version)
    ? `Version: ${version.slice(0, 12)}` : 'Version unavailable';
}

function showProgress({ stage, completed, total, version }) {
  if (stage === 'checking') versionLabel.textContent = 'Checking version…';
  else if (version) showVersion(version);
  progressPanel.hidden = false;
  status.textContent = stage === 'checking' ? 'Checking for updates…' :
    stage === 'verifying' ? 'Verifying downloaded files…' : 'Preparing your adventure…';
  if (stage === 'checking' || !Number.isSafeInteger(total) || total <= 0 ||
      !Number.isSafeInteger(completed)) {
    meter.removeAttribute('value');
    percent.textContent = '';
    return;
  }

  completed = Math.min(total, Math.max(0, completed));
  meter.max = total;
  meter.value = completed;
  percent.textContent = `${Math.floor(completed / total * 100)}%`;
}

function localController() {
  const controller = navigator.serviceWorker?.controller;
  return controller?.scriptURL === scriptURL.href ? controller : null;
}

async function register() {
  const existing = await navigator.serviceWorker.getRegistration(scope.href);
  if (existing?.scope === scope.href && existing.active?.scriptURL === scriptURL.href) return existing;
  const next = await navigator.serviceWorker.register(scriptURL, {
    scope: scope.href, type: 'module', updateViaCache: 'none',
  });
  const ready = next.active ? next : await navigator.serviceWorker.ready;
  if (ready.scope !== scope.href || ready.active?.scriptURL !== scriptURL.href) {
    throw new Error('The Kids World worker is not active');
  }
  return ready;
}

function command(data, report = () => {}, timeout = 55000) {
  const worker = localController() ?? registration?.active;
  const channel = new MessageChannel();
  const reply = new Promise((resolve, reject) => {
    channel.port1.onmessage = ({ data: message }) => {
      if (message.stage === 'complete') resolve(message.result);
      else if (message.stage === 'error') reject(new Error('The release worker could not access its storage'));
      else report(message);
    };
    worker.postMessage(data, [channel.port2]);
  });
  return withTimeout(reply, timeout, 'No response from the release worker').finally(() => channel.port1.close());
}

async function checkRelease(preferred, cachedOnly, report) {
  lastCheck = Date.now();
  if (!cachedOnly && navigator.onLine) {
    Promise.resolve().then(() => registration?.update())
      .catch(error => console.info('Kids World worker update check deferred.', error));
  }
  return command({ type: 'prepare', offline: !navigator.onLine, preferred, cachedOnly }, report);
}

function reloadTo(tag) {
  const target = new URL(location.href);
  target.searchParams.set(selectionParam, tag);
  location.replace(target);
}

function clearSelection() {
  const url = new URL(location.href);
  if (!url.searchParams.has(selectionParam)) return;
  url.searchParams.delete(selectionParam);
  history.replaceState(null, '', url);
}

async function prepareGame(base, message) {
  progressPanel.hidden = true;
  status.textContent = 'Getting the game ready…';
  const template = document.querySelector('#game-shell');
  game = document.importNode(template.content.querySelector('#game'), true);
  game.inert = true;
  game.append(update);
  document.body.append(game);
  const { startGame } = await withTimeout(import(new URL('game.js', base)), 15000, 'Game modules timed out');
  await withTimeout(startGame(game), 45000, 'Game initialization timed out');
  if (game.dataset.state !== 'menu') {
    throw new Error(game.querySelector('#menu-message').textContent);
  }
  status.textContent = message;
  if (game.dataset.home === 'true') {
    // The release is ready: show the area selection directly, without loading a scene.
    splash.hidden = true;
    game.inert = false;
    game.querySelector('#choose-level').click();
  } else play.hidden = false;
}

async function selectRelease(requested) {
  try {
    if (!isSecureContext || !navigator.serviceWorker?.register) return null;
    registration = await withTimeout(register(), 10000, 'Service Worker registration timed out');
    return await checkRelease(shellTag, Boolean(requested && requested === shellTag), showProgress);
  } catch (error) {
    console.info('Kids World offline preparation deferred.', error);
    // A network shell may be controlled even when registration access fails.
    try {
      if (!shellTag && localController()) {
        const cached = await command({ type: 'prepare', cachedOnly: true, offline: !navigator.onLine }, undefined, 2500);
        if (releaseTag.test(cached?.tag)) return cached;
      }
    } catch (cacheError) {
      console.info('Kids World cached release check unavailable.', cacheError);
    }
    return null;
  }
}

async function boot() {
  const requested = new URL(location.href).searchParams.get(selectionParam);
  const result = await selectRelease(requested);
  // A cached shell's versioned module URL identifies the release it can load.
  showVersion(result?.version ?? ((!result || result.status === 'storage') && releaseTag.test(shellTag)
    ? shellTag.slice(0, 64) : undefined));
  if (!result || result.status === 'storage') {
    clearSelection();
    if (shellTag) {
      // A cached shell can only load modules from the same release.
      await prepareGame(assetBase(scope, shellTag), 'Ready to explore with your saved game!');
    } else {
      if (!navigator.onLine) throw new Error('Network needed in online-only mode');
      await prepareGame(scope, 'Ready to explore online!');
    }
    return;
  }

  if (!releaseTag.test(result.tag)) throw new Error('No complete game release is available');
  if (result.tag !== shellTag) {
    if (requested === result.tag) throw new Error('The browser did not open the verified release');
    reloadTo(result.tag);
    return;
  }

  clearSelection();
  gameVersion = result.version;
  const messages = {
    offline: "You're offline. Let's explore!",
    fallback: 'Ready to explore with your saved game!',
    ready: 'Ready to explore!',
  };
  await prepareGame(assetBase(scope, shellTag), messages[result.status]);
  command({ type: 'prune', tag: shellTag }).catch(error => console.info('Kids World cache cleanup deferred.', error));
}

async function start() {
  if (booting || game) return;
  booting = true;
  retry.hidden = true;
  showProgress({ stage: 'checking' });
  try {
    await boot();
  } catch (error) {
    console.warn('Kids World could not start.', error);
    status.textContent = game?.dataset.state === 'error' ? game.querySelector('#menu-message').textContent
      : navigator.onLine ? 'Your adventure could not open. Try again!' :
        'Connect to the internet to download your adventure.';
    retry.textContent = game ? 'Reload game' : 'Try again';
    progressPanel.hidden = true;
    retry.hidden = false;
  } finally {
    booting = false;
  }
}

retry.addEventListener('click', () => {
  if (booting) return;
  if (game) location.reload();
  else start();
});

play.addEventListener('click', event => {
  if (splash.hidden || play.hidden || game?.dataset.state !== 'menu') return;
  splash.hidden = true;
  game.inert = false;
  game.querySelector('#start').dispatchEvent(new PointerEvent('click', {
    bubbles: true, pointerType: event.pointerType,
  }));
});

document.addEventListener('visibilitychange', async () => {
  if (document.hidden || checking || !gameVersion || !navigator.onLine || Date.now() - lastCheck < checkInterval) return;
  checking = true;
  try {
    const result = await checkRelease(shellTag, false);
    if (result?.tag && result.version !== gameVersion) {
      update.hidden = false;
      reload.onclick = () => reloadTo(result.tag);
    }
  } catch (error) {
    console.info('Kids World update check deferred.', error);
  } finally {
    checking = false;
  }
});

start();
