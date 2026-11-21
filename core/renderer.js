import { PLAYER_ONLY_LAYER } from './render-layers.js';

export function createView(THREE, { game, canvas, fullscreen, touchDevice, contextLost, onInvalidate = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchDevice, powerPreference: 'high-performance' });
  const camera = new THREE.PerspectiveCamera(62, 1, 0.07, 115);
  camera.layers.enable(PLAYER_ONLY_LAYER);
  let renderPending = true;
  let lost = false;
  let disposed = false;
  const listeners = new AbortController();
  const { signal } = listeners;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  function invalidate() {
    if (lost || disposed) return;
    renderPending = true;
    onInvalidate();
  }

  function resize() {
    if (lost || disposed) return;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 68 : 62;
    camera.updateProjectionMatrix();
    invalidate();
  }

  const enterFullscreen = game.requestFullscreen || game.webkitRequestFullscreen;
  if (enterFullscreen && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
    fullscreen.hidden = false;
    const full = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    fullscreen.addEventListener('click', async () => {
      try {
        if (full()) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          await exit.call(document);
        } else {
          await enterFullscreen.call(game);
        }
      } catch (error) {
        console.warn('Fullscreen is unavailable.', error);
      }
    }, { signal });
    function syncFullscreen() {
      const label = full() ? 'Exit fullscreen' : 'Fullscreen';
      fullscreen.setAttribute('aria-label', label);
      fullscreen.setAttribute('aria-pressed', String(full()));
      fullscreen.title = label;
      resize();
    }
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen, { signal });
    document.addEventListener('webkitfullscreenchange', syncFullscreen, { signal });
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (lost || disposed) return;
    lost = true;
    contextLost?.();
  }, { signal });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize, { signal });
  resize();

  return {
    camera,
    invalidate,
    sceneChanged() {
      if (lost || disposed) return;
      renderer.renderLists.dispose();
      renderer.shadowMap.needsUpdate = true;
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.abort();
      observer.disconnect?.();
      renderer.dispose?.();
    },
    render(scene, playing, activeCamera = camera) {
      if (lost || disposed || !scene || !(playing || renderPending)) return false;
      renderPending = false;
      if (activeCamera === camera) renderer.render(scene, camera);
      else {
        const fog = scene.fog;
        // Distance fog is tuned for the player at ground level.
        scene.fog = null;
        try {
          renderer.render(scene, activeCamera);
        } finally {
          scene.fog = fog;
        }
      }
      return true;
    },
  };
}
