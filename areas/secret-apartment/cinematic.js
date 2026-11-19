import { BURST_TIME, STEP } from './missions.js';

function sootTexture(architecture) {
  return architecture.canvasTexture(192, 192, (ctx, w, h) => {
    for (let i = 0; i < 48; i++) {
      const angle = i * 2.39996;
      const fromCenter = (i % 11) * 5.9;
      const x = w / 2 + Math.cos(angle) * fromCenter;
      const y = h / 2 + Math.sin(angle) * fromCenter * 0.91;
      const radius = 7 + (i * 13 % 26);
      const ink = ctx.createRadialGradient(x, y, radius * 0.14, x, y, radius);
      ink.addColorStop(0, i % 3 ? '#251c19bf' : '#100f0ee8');
      ink.addColorStop(0.65, '#241c1854');
      ink.addColorStop(1, '#100d0900');
      ctx.fillStyle = ink;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  });
}

export function createApartmentDamage(THREE, architecture, root, lights, surfaces) {
  // The unit has its own materials. Its tint must never darken the corridor or elevator.
  const colors = new Map();
  const glow = new THREE.Color().setRGB(0.095, 0.072, 0.068);
  const char = new THREE.Color().setRGB(0.25, 0.205, 0.177);
  root.traverse(({ material }) => {
    if (material?.color && !colors.has(material)) {
      colors.set(material, { original: material.color.clone(), tint: material.isMeshBasicMaterial ? glow : char });
    }
  });
  const originalIntensity = lights.map(light => light.intensity);
  const marks = architecture.group(root, 'Scorch marks');
  const map = sootTexture(architecture);
  const material = new THREE.MeshBasicMaterial({
    color: map ? 0xffffff : 0x181513, map, transparent: true, opacity: map ? 0.87 : 0.39,
    depthWrite: false,
  });
  for (const [x, y, z, w, h, yaw, pitch = 0, roll = 0] of surfaces) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mark.position.set(x, y, z);
    mark.rotation.set(pitch, yaw, roll, 'YXZ');
    marks.add(mark);
  }

  let damaged;
  return {
    setDamaged(next) {
      if (damaged === next) return;
      damaged = next;
      marks.visible = next;
      for (const [material, { original, tint }] of colors) {
        material.color.copy(original);
        if (next) material.color.multiply(tint);
      }
      lights.forEach((light, i) => { light.intensity = originalIntensity[i] * (next ? 0.19 : 1); });
    },
  };
}

function createSmoke(THREE, architecture, oven) {
  const root = architecture.group(oven, 'Cinematic smoke', -0.29, 0.21, 0);
  const map = architecture.canvasTexture(96, 96, (ctx, w, h) => {
    for (const [x, y, r] of [[41, 43, 33], [58, 48, 27], [39, 60, 27], [54, 35, 28]]) {
      const cloud = ctx.createRadialGradient(x, y, 3, x, y, r);
      cloud.addColorStop(0, '#d1c3bacf');
      cloud.addColorStop(0.63, '#b1a29c5c');
      cloud.addColorStop(1, '#91868300');
      ctx.fillStyle = cloud;
      ctx.fillRect(0, 0, w, h);
    }
  });
  const puffs = Array.from({ length: 10 }, (_, i) => {
    const material = new THREE.SpriteMaterial({ map, color: i % 2 ? 0x75686b : 0x9a8b85,
      transparent: true, depthWrite: false, rotation: i * 0.43 });
    const sprite = new THREE.Sprite(material);
    root.add(sprite);
    return sprite;
  });
  return {
    render(active, elapsed) {
      root.visible = active;
      if (!active) return;
      puffs.forEach((puff, i) => {
        const age = Math.max(0, elapsed - i * 0.066);
        const size = 0.40 + age * (0.4 + i * 0.025);
        const rise = Math.min(1.75, age * (0.73 + i * 0.037));
        puff.position.set(-0.08 - age * 0.41 - i * 0.058, rise, Math.sin(i * 2.4) * (0.13 + age * 0.25));
        puff.scale.set(size, size * (0.87 + i % 3 * 0.13), 1);
        puff.material.opacity = Math.min(age * 2.1, 0.53) * Math.max(0, 1 - elapsed / BURST_TIME);
      });
    },
  };
}

function cinematicHUD(hud) {
  if (!hud?.ownerDocument) return { show() {}, remove() {} };
  const overlay = hud.ownerDocument.createElement('div');
  overlay.className = 'apartment-cinematic';
  const flash = hud.ownerDocument.createElement('div');
  flash.className = 'apartment-cinematic-flash';
  flash.setAttribute('aria-hidden', 'true');
  const title = hud.ownerDocument.createElement('div');
  title.className = 'apartment-cinematic-title';
  title.setAttribute('role', 'status');
  title.setAttribute('aria-live', 'assertive');
  title.setAttribute('aria-atomic', 'true');
  overlay.append(flash, title);
  hud.append(overlay);
  return {
    show(text, opacity) {
      if (title.textContent !== text) title.textContent = text;
      const value = String(Number(opacity.toFixed(3)));
      if (flash.style.opacity !== value) flash.style.opacity = value;
    },
    remove() { overlay.remove(); },
  };
}

export function createApartmentCinematic(THREE, architecture, hud, unit, mission, reducedMotion) {
  const smoke = createSmoke(THREE, architecture, unit.oven);
  const overlay = cinematicHUD(hud);
  return {
    render(inside) {
      const burst = mission.step === STEP.BURST;
      const still = reducedMotion();
      const elapsed = mission.burstElapsed;
      const flash = burst && inside && !still ? Math.max(0, 0.44 * (1 - elapsed / 0.43)) : 0;
      unit.setDamaged(mission.damaged);
      smoke.render(burst && !still, elapsed);
      overlay.show(mission.announcement, flash);
    },
    unload() { overlay.remove(); },
  };
}
