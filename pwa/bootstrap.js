import { assetBase, releaseRoute, releaseTag } from './release.js';

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
const count = document.querySelector('#pwa-count');
const play = document.querySelector('#pwa-play');
const retry = document.querySelector('#pwa-retry');
const update = document.querySelector('#pwa-update');
const reload = document.querySelector('#pwa-reload');
let registration;
let game;
let gameVersion;
let lastCheck = 0;
let checking = false;

function showProgress({ stage, completed, total, downloaded }) {
  progressPanel.hidden = false;
  if (stage === 'checking') {
    status.textContent = 'Checking for updates…';
    meter.removeAttribute('value');
    percent.textContent = '';
    count.textContent = '';
    return;
  }

  status.textContent = stage === 'verifying' ? 'Verifying downloaded files…' : 'Preparing your adventure…';
  meter.max = total;
  meter.value = completed;
  percent.textContent = `${Math.floor(completed / total * 100)}%`;
  count.textContent = `${completed} / ${total} files ready · ${downloaded} downloaded`;
}

function withTimeout(task, ms, message) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([task, deadline]).finally(() => clearTimeout(timer));
}

async function register() {
  const existing = await navigator.serviceWorker.getRegistration(scope.href);
  const local = existing?.scope === scope.href && existing.active?.scriptURL === scriptURL.href;
  return local ? existing : navigator.serviceWorker.register(scriptURL, {
    scope: scope.href, type: 'module', updateViaCache: 'none',
  }).then(next => next.active ? next : navigator.serviceWorker.ready);
}

function command(data, report = () => {}) {
  const controller = navigator.serviceWorker.controller;
  const worker = controller?.scriptURL === scriptURL.href ? controller : registration.active;
  const channel = new MessageChannel();
  const reply = new Promise((resolve, reject) => {
    channel.port1.onmessage = ({ data: message }) => {
      if (message.stage === 'complete') resolve(message.result);
      else if (message.stage === 'error') reject(new Error('The release worker could not access its storage'));
      else report(message);
    };
    worker.postMessage(data, [channel.port2]);
  });
  return withTimeout(reply, 55000, 'No response from the release worker').finally(() => channel.port1.close());
}

async function checkRelease(preferred, cachedOnly, report) {
  lastCheck = Date.now();
  if (!cachedOnly && navigator.onLine) {
    registration.update().catch(error => console.info('Kids World worker update check deferred.', error));
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
  const { startGame } = await import(new URL('game.js', base));
  await startGame(game);
  if (game.dataset.state !== 'menu') {
    throw new Error(game.querySelector('#menu-message').textContent);
  }
  status.textContent = message;
  play.hidden = false;
}

async function boot() {
  const supported = isSecureContext && navigator.serviceWorker?.register && 'caches' in window && crypto.subtle;
  if (!supported) {
    if (!navigator.onLine) throw new Error('Network needed in online-only mode');
    await prepareGame(scope, 'Ready to explore online!');
    return;
  }

  registration = await withTimeout(register(), 10000, 'Service Worker registration timed out');
  const requested = new URL(location.href).searchParams.get(selectionParam);
  const result = await checkRelease(shellTag, Boolean(requested && requested === shellTag), showProgress);
  if (!releaseTag.test(result?.tag)) throw new Error('No complete game release is available');
  if (result.tag !== shellTag || navigator.serviceWorker.controller?.scriptURL !== scriptURL.href) {
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
  retry.hidden = true;
  showProgress({ stage: 'checking' });
  try {
    await boot();
  } catch (error) {
    console.warn('Kids World could not start.', error);
    status.textContent = navigator.onLine ? 'Your adventure could not open. Try again!' :
      'Connect to the internet to download your adventure.';
    progressPanel.hidden = true;
    retry.hidden = false;
  }
}

retry.addEventListener('click', () => {
  if (game) location.reload();
  else start();
});

play.addEventListener('click', event => {
  if (splash.hidden || !game) return;
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
