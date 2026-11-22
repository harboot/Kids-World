export function bindSnowballControls(hud, signal, throwBall) {
  const document = hud.ownerDocument;
  const fallback = signal ? null : new AbortController();
  const options = { signal: signal ?? fallback.signal };
  const canvas = hud.querySelector?.('#view');
  const root = document.createElement('div');
  root.className = 'snow-activity';
  const key = document.createElement('p');
  key.className = 'snow-throw-key';
  key.textContent = 'F or left click to throw';
  const button = document.createElement('button');
  button.className = 'snow-throw';
  button.textContent = 'Throw';
  button.type = 'button';
  root.append(key);
  root.append(button);
  hud.append(root);

  document.defaultView.addEventListener('keydown', event => {
    if (event.code === 'KeyF' && !event.repeat && throwBall()) event.preventDefault();
  }, options);
  canvas?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button === 0 && document.pointerLockElement === canvas && throwBall()) {
      event.preventDefault();
    }
  }, options);
  // The native click covers both touch and keyboard activation.
  button.addEventListener('click', throwBall, options);

  return {
    show(held) {
      if (button.hidden !== !held) key.hidden = button.hidden = !held;
    },
    dispose() {
      fallback?.abort();
      root.remove();
    },
  };
}
