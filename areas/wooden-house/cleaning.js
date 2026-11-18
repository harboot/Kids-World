const cues = {
  bed: [
    [58, { endPitch: 65, duration: 0.16, level: 0.1, wave: 'triangle' }],
    [72, { duration: 0.18, level: 0.12 }, 0.14],
  ],
  dishes: [
    [72, { endPitch: 85, duration: 0.11, level: 0.09 }],
    [77, { endPitch: 89, duration: 0.14, level: 0.11 }, 0.13],
    [74, { endPitch: 83, duration: 0.17, level: 0.09 }, 0.29],
  ],
  painting: [[77, { duration: 0.17, level: 0.12, attack: 0.007 }]],
  tv: [
    [59, { endPitch: 43, duration: 0.052, level: 0.17, attack: 0.003, wave: 'triangle' }],
    [71, { endPitch: 60, duration: 0.105, level: 0.07 }, 0.043],
  ],
  toys: [
    [60, { endPitch: 65, duration: 0.12, level: 0.14, wave: 'triangle' }],
    [65, { endPitch: 69, duration: 0.12, level: 0.11, wave: 'triangle' }, 0.115],
    [55, { endPitch: 48, duration: 0.15, level: 0.15, wave: 'triangle' }, 0.64],
  ],
  success: [
    [69, { duration: 0.29, level: 0.17 }],
    [73, { duration: 0.27, level: 0.15 }, 0.115],
    [76, { duration: 0.29, level: 0.15 }, 0.23],
    [81, { duration: 0.44, level: 0.16 }, 0.35],
  ],
};

export function createCleaningMissions(models, { playCue, reducedMotion, signal, celebrate }) {
  const tasks = models.map(model => ({ model, completed: false, elapsed: null }));
  const cleanedCount = () => tasks.reduce((count, task) => count + Number(task.completed), 0);

  function finish(task) {
    task.model.render(1, false);
    task.elapsed = null;
    task.completed = true;
    if (cleanedCount() === tasks.length) {
      celebrate(task.model);
      playCue(cues.success);
    }
  }

  return {
    get objective() {
      const count = cleanedCount();
      const progress = `Clean up the house · ${count}/${tasks.length}`;
      return count === tasks.length ? `${progress} · Great job! The house is sparkling clean!` : progress;
    },
    interactions: tasks.map(task => {
      const { id, x, z, radius, label, anchorY, reachable } = task.model;
      const available = () => !signal.aborted && !task.completed && task.elapsed === null;
      return {
        id, x, z, radius, label, anchorY, reachable, silent: true,
        get active() { return available(); },
        act() {
          if (!available()) return;
          playCue(cues[id]);
          if (reducedMotion()) finish(task);
          else {
            task.elapsed = 0;
            task.model.render(0, true);
          }
        },
      };
    }),
    update(dt) {
      if (signal.aborted) return;
      const still = reducedMotion();
      for (const task of tasks) {
        if (task.completed) continue;
        const { model } = task;
        if (task.elapsed === null) {
          if (!still) model.idle?.(dt);
          continue;
        }
        task.elapsed += dt;
        if (still || task.elapsed >= model.duration) finish(task);
        else model.render(task.elapsed / model.duration, true);
      }
    },
    reset() {
      for (const task of tasks) {
        task.completed = false;
        task.elapsed = null;
        task.model.render(0, false);
        task.model.idle?.(0);
      }
    },
  };
}

export function addCleaningSparkles(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'Cleaning celebration';
  root.visible = false;
  scene.add(root);
  const shape = new THREE.OctahedronGeometry(1);
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd461, toneMapped: false });
  const cream = new THREE.MeshBasicMaterial({ color: 0xfff6c9, toneMapped: false });
  const stars = Array.from({ length: 9 }, (_, i) => {
    const star = new THREE.Group();
    const material = i % 2 ? cream : gold;
    for (const angle of [0, Math.PI / 2]) {
      const point = new THREE.Mesh(shape, material);
      point.scale.set(0.031, 0.13, 0.031);
      point.rotation.z = angle;
      star.add(point);
    }
    root.add(star);
    return star;
  });
  let elapsed = 0;
  const duration = 1.6;

  function pose(progress) {
    stars.forEach((star, i) => {
      const angle = i * 2.4;
      const reach = 0.24 + progress * (0.26 + i * 0.037);
      star.position.set(Math.cos(angle) * reach, 0.05 + i * 0.064 + progress * 0.38, Math.sin(angle) * reach);
      star.rotation.y = angle + progress * 2;
      star.scale.setScalar((0.64 + i % 3 * 0.22) * Math.min(1, (1 - progress) * 3));
    });
  }

  return {
    show({ x, z, anchorY }, reducedMotion) {
      elapsed = 0;
      root.position.set(x, anchorY + 0.09, z);
      root.visible = true;
      pose(reducedMotion ? 0.6 : 0);
    },
    update(dt, reducedMotion) {
      if (!root.visible) return;
      elapsed += dt;
      root.visible = elapsed < duration;
      if (root.visible) pose(reducedMotion ? 0.6 : elapsed / duration);
    },
    hide() { root.visible = false; },
  };
}
