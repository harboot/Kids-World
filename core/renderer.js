export function createView(THREE, { game, canvas, fullscreen, touchDevice, contextLost }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchDevice, powerPreference: 'high-performance' });
  const camera = new THREE.PerspectiveCamera(62, 1, 0.07, 115);
  let renderPending = true;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 68 : 62;
    camera.updateProjectionMatrix();
    renderPending = true;
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
    });
    function syncFullscreen() {
      const label = full() ? 'Exit fullscreen' : 'Fullscreen';
      fullscreen.setAttribute('aria-label', label);
      fullscreen.setAttribute('aria-pressed', String(full()));
      fullscreen.title = label;
      resize();
    }
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost();
  });
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  return {
    camera,
    invalidate() { renderPending = true; },
    sceneChanged() {
      renderer.renderLists.dispose();
      renderer.shadowMap.needsUpdate = true;
      renderPending = true;
    },
    render(scene, playing) {
      if (!scene || !(playing || renderPending)) return;
      renderer.render(scene, camera);
      renderPending = false;
    },
  };
}
