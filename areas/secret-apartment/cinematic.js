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

function damageDetails(THREE, architecture, root) {
  const props = architecture.group(root, 'Broken furniture and debris');
  const b = architecture.builder(props);
  for (const [x, y, z, w, h, d, angle] of [
    [9.58, .16, -.43, .43, .07, .66, .58], [9.31, .10, .44, .33, .09, .49, -.28],
    [8.94, .07, 1.19, .21, .08, .34, .71], [9.83, .11, 1.54, .46, .13, .36, -.46],
    [5.32, .09, 1.94, .86, .13, .44, -.56], [5.16, .075, 1.62, .23, .11, .43, .67],
    [2.1, .10, 2.10, .67, .15, .35, .24], [2.79, .07, 1.75, .41, .08, .27, -.29],
  ]) b.part(0x302522, x, y, z, w, h, d, { yaw: angle, pitch: angle / 3 });
  for (const [cx, cz] of [[9.28, -.14], [9.26, 1.45], [5.38, 1.83], [2.88, 2.2]]) {
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4;
      const radius = .13 + i * .064;
      b.part(i % 2 ? 0x57504b : 0x776052, cx + Math.sin(angle) * radius, .037 + i * .004, cz + Math.cos(angle) * radius,
        .11 + (i % 4) * .033, .043, .12, { shape: 'leaf', yaw: angle });
    }
  }
  b.part(0x342725, 9.69, 1.23, .82, .065, .62, .44, { pitch: .29, roll: -.42 });
  b.part(0x2b2523, 9.73, .14, 1.67, .095, .24, .55, { pitch: -.32, roll: .43 });
  b.part(0x181f23, 6.238, 1.57, .79, .024, .91, 1.70);
  b.finish();
  const brokenGlass = new THREE.BufferGeometry();
  const path = [
    [1.55, .91], [1.93, .39], [1.55, .91], [1.94, 1.39], [1.55, .91], [1.15, 1.54], [1.55, .91], [1.18, .21],
    [1.55, .91], [1.70, 1.13], [1.70, 1.13], [1.82, 1.10], [1.42, .72], [1.29, .68], [1.29, .68], [1.19, .5],
  ];
  brokenGlass.setAttribute('position', new THREE.Float32BufferAttribute(path.flatMap(([y, z]) => [6.221, y, z]), 3));
  props.add(new THREE.LineSegments(brokenGlass, new THREE.LineBasicMaterial({ color: 0x94918a })));

  const fire = architecture.group(root, 'Persistent stylized fire');
  const flameGeometry = new THREE.LatheGeometry([
    [0, 0], [.22, 0], [.44, .18], [.42, .40], [.27, .64], [.17, .79], [0, 1],
  ].map(([radius, y]) => new THREE.Vector2(radius, y)), 7);
  const vertices = flameGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i);
    vertices.setX(i, vertices.getX(i) + .28 * y * y);
    vertices.setZ(i, vertices.getZ(i) - .13 * y * y);
  }
  flameGeometry.computeVertexNormals();
  const outer = new THREE.MeshBasicMaterial({ color: 0xeb6333 });
  const inner = new THREE.MeshBasicMaterial({ color: 0xffc362 });
  const sparks = new THREE.MeshBasicMaterial({ color: 0xf4af67 });
  const emberGeometry = new THREE.OctahedronGeometry(1);
  const tongues = [];
  for (const [x, y, z, size] of [[9.53, .94, -.71, .92], [9.77, .93, .85, .74], [9.27, .06, 1.38, .65],
    [2.04, .61, 1.25, .59], [5.29, .09, 1.85, .5]]) {
    const cluster = architecture.group(fire, 'Fire cluster', x, y, z);
    for (let i = 0; i < 4; i++) {
      const j = tongues.length;
      const flame = architecture.group(cluster, 'Flame tongue', (i - 1.5) * .105, 0, Math.sin(i * 4) * .11);
      const shell = new THREE.Mesh(flameGeometry, outer);
      shell.scale.set(.33, .61, .33);
      shell.rotation.y = i * 1.95;
      const core = new THREE.Mesh(flameGeometry, inner);
      core.position.set(.085, .02, .075);
      core.scale.set(.18, .37, .18);
      core.rotation.y = shell.rotation.y;
      flame.add(shell, core);
      if (i % 2 === 0) {
        const ember = new THREE.Mesh(emberGeometry, sparks);
        ember.position.set(.125, .53, .03);
        ember.scale.setScalar(.027);
        flame.add(ember);
      }
      tongues.push({ flame, j, size: size * (.74 + i * .12) });
    }
  }
  const emberLight = new THREE.PointLight(0xeb713e, 0, 5.1, 2);
  emberLight.position.set(9.1, 1.49, -.55);
  fire.add(emberLight);
  return {
    show(active) { props.visible = fire.visible = active; },
    update(time, still) {
      if (!fire.visible) return;
      const t = still ? 0 : time;
      emberLight.intensity = still ? 5.7 : 5.7 + 1.45 * Math.sin(7.2 * t);
      for (const { flame, j, size } of tongues) {
        const pulse = 1 + .21 * Math.sin(t * 8.5 + j * 2.13);
        flame.scale.set(size, size * pulse, size);
        flame.rotation.z = .18 * Math.sin(t * 5 + j * 1.68);
      }
    },
  };
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

  const details = damageDetails(THREE, architecture, root);
  let damaged;
  return {
    updateDamage: details.update,
    setDamaged(next) {
      if (damaged === next) return;
      damaged = next;
      marks.visible = next;
      details.show(next);
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
  let fireTime = 0;
  return {
    render(inside, dt = 0) {
      const burst = mission.step === STEP.BURST;
      const still = reducedMotion();
      const elapsed = mission.burstElapsed;
      const flash = burst && inside && !still ? Math.max(0, 0.44 * (1 - elapsed / 0.43)) : 0;
      unit.setDamaged(mission.damaged);
      fireTime = mission.damaged ? (fireTime + dt) % 700 : 0;
      if (inside) unit.updateDamage(fireTime, still);
      smoke.render(burst && !still, elapsed);
      overlay.show(mission.announcement, flash);
    },
    unload() { overlay.remove(); },
  };
}
