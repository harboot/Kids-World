import { SURFACE_GAP } from '../../core/geometry.js';
import { addPalaceSign } from './palace.js';
import { buildStaircase, stairSite } from './staircase.js';
import { SUMMIT_SIZE } from './metadata.js';

const corner = SUMMIT_SIZE / 2 - 2.35;
const activationSites = [
  { x: corner, z: corner }, { x: -corner, z: corner },
  { x: -corner, z: -corner }, { x: corner, z: -corner },
];
const musicSites = [
  { x: 8.15, z: 4.55, pitch: 74, color: 0x70d7ff },
  { x: 10.55, z: 3.12, pitch: 81, color: 0xff8dcf },
  { x: 11.35, z: 5.85, pitch: 85, color: 0xb49bff },
];

const bell = (duration = 0.38, level = 0.14) => ({ duration, level });
const activateCue = [[77, bell(0.29)], [89, bell(0.41, 0.085), 0.055]];
const buildCue = [[61, { ...bell(0.21, 0.11), endPitch: 68, wave: 'triangle' }], [82, bell(), 0.07]];
const restoreCue = [[73, bell(), 0.32], [78, bell(), 0.44], [83, bell(0.55), 0.57]];
const melodyCue = [[74, bell(), 0.35], [85, bell(), 0.51], [81, bell(), 0.68], [88, bell(0.67, 0.18), 0.84]];

export function createCastleActivities(THREE, builder, document, { playCue, reducedMotion, isActive, onMissionComplete }) {
  const { architecture, group, part, solid, ice, materials: { blue, deep, glass, light, pearl, silver } } = builder;
  const staircase = buildStaircase(THREE, builder, document);
  const { segments } = staircase;
  const crystalGeometry = createCrystalGeometry(THREE);

  const activation = activationSites.map((site, i) => {
    const yaw = Math.atan2(-site.x, -site.z);
    const pedestal = group('Ice crystal pedestal', site.x, 0, site.z, architecture);
    pedestal.rotation.y = yaw;
    part(pedestal, 'drum', deep, 0, 0.17, 0, 1.35, 0.34, 1.35);
    part(pedestal, 'drum', glass, 0, 0.37, 0, 1.31, 0.14, 1.31);
    part(pedestal, 'drum', pearl, 0, 0.51, 0, 1.22, 0.17, 1.22);
    part(pedestal, 'gem', silver, 0, 0.35, 1.25, 0.25, 0.19, 0.12);

    const model = group('Activation crystal ' + (i + 1), site.x, 0, site.z);
    model.rotation.y = yaw;
    const material = ice(0x5c859e, 0x1b5c69);
    for (const [x, y, z, width, height, tilt] of [
      [0, 0.59, 0, 1.19, 7.45, 0],
      [0.69, 0.55, 0.11, 0.49, 4.2, -0.18],
      [-0.66, 0.53, 0.16, 0.44, 3.4, 0.19],
    ]) {
      const shard = new THREE.Mesh(crystalGeometry, material);
      shard.position.set(x, y, z);
      shard.scale.set(width, height, width);
      shard.rotation.z = tilt;
      model.add(shard);
    }
    const sparkles = group('Crystal sparkles', 0, 0, 0, model);
    for (let j = 0; j < 6; j++) part(sparkles, 'gem', light, 0, 0, 0, 0.12, 0.22, 0.12);
    solid(site.x, site.z, 2.7, 2.7, 8);
    return { site, material, sparkles, active: false, charge: 0, burst: 0 };
  });

  const music = musicSites.map((site, i) => {
    const pedestal = group('Tuning crystal stand', site.x, 0, site.z, architecture);
    pedestal.rotation.y = -0.65;
    part(pedestal, 'drum', deep, 0, 0.12, 0, 0.72, 0.24, 0.72);
    part(pedestal, 'box', pearl, -0.48, 0.62, 0, 0.16, 0.86, 0.38);
    part(pedestal, 'box', pearl, 0.48, 0.62, 0, 0.16, 0.86, 0.38);
    part(pedestal, 'box', silver, 0, 0.83, 0, 1.2, 0.10, 0.31);
    for (let j = 0; j <= i; j++) part(pedestal, 'gem', light, (j - i / 2) * 0.24, 0.46, 0.35, 0.07, 0.13, 0.06);
    const model = group('Musical crystal ' + (i + 1), site.x, 0, site.z);
    const material = ice(site.color, site.color);
    const gem = part(model, 'gem', material, 0, 1.07, 0, 0.37, 0.48, 0.34);
    const marker = part(model, 'drum', material, 0, 0.255, 0, 0.66, 0.073, 0.66);
    solid(site.x, site.z, 1.22, 1.22, 1.56);
    return { site, material, gem, marker, played: false, pulse: 0 };
  });
  const musicSign = group('Crystal melody sign', 9.56, 0, 5.95, architecture);
  part(musicSign, 'box', blue, 0, 0.54, 0, 0.15, 1.08, 0.14);
  const boardDepth = 0.12;
  part(musicSign, 'box', deep, 0, 1.09, 0, 1.68, 0.31, boardDepth);
  addPalaceSign(THREE, document, musicSign, 'Crystal Melody', 0, 1.09, boardDepth / 2 + SURFACE_GAP.detail, 1.62, 0.302);
  solid(9.56, 5.95, 1.68, 0.29, 1.25);

  const missions = {
    get crystals() { return activation.every(crystal => crystal.active); },
    get stairs() { return segments.every(section => section.growth === 1); },
    get melody() { return music.every(crystal => crystal.played); },
  };

  const interactions = [
    ...activation.map(crystal => ({
      ...crystal.site, radius: 2.85, anchorY: 1.6, label: 'Activate crystal', silent: true,
      get active() { return isActive() && !crystal.active; },
      act() {
        if (!this.active) return;
        crystal.active = true;
        crystal.burst = 0.7;
        playCue(activateCue);
        if (missions.crystals) {
          playCue(restoreCue);
          onMissionComplete();
        }
        poseCrystal(crystal, 0);
      },
    })),
    {
      ...stairSite, radius: 2.15, anchorY: 1.12, label: 'Build ice staircase', silent: true,
      reachable: player => player.x >= stairSite.x - 0.9 && player.y < 3.2,
      get active() { return isActive() && segments.some(section => section.growth === null); },
      act() {
        if (!this.active) return;
        const section = segments.find(item => item.growth === null);
        section.growth = reducedMotion() ? 1 : 0;
        staircase.pose();
        playCue(buildCue);
        if (missions.stairs) finishStairs();
      },
    },
    ...music.map(crystal => ({
      ...crystal.site, radius: 1.95, anchorY: 1.12, label: 'Play crystal', silent: true,
      get active() { return isActive(); },
      act() {
        if (!this.active) return;
        const finished = missions.melody;
        crystal.played = true;
        crystal.pulse = 0.5;
        playCue([[crystal.site.pitch, bell(0.63, 0.18)]]);
        if (!finished && missions.melody) {
          playCue(melodyCue);
          onMissionComplete();
        }
        poseMusic(crystal, 0);
      },
    })),
  ];

  function finishStairs() {
    playCue(restoreCue);
    onMissionComplete();
  }

  function poseCrystal(crystal, dt) {
    const still = reducedMotion();
    crystal.burst = Math.max(0, crystal.burst - dt);
    if (crystal.active) crystal.charge = still ? 1 : Math.min(1, crystal.charge + dt * 2.9);
    crystal.material.color.setRGB(0.12 + crystal.charge * 0.28, 0.23 + crystal.charge * 0.57, 0.34 + crystal.charge * 0.59);
    crystal.material.emissiveIntensity = 0.22 + crystal.charge * 1.45;
    crystal.sparkles.visible = !still && crystal.burst > 0;
    if (!crystal.sparkles.visible) return;
    const phase = 1 - crystal.burst / 0.7;
    crystal.sparkles.children.forEach((sparkle, i) => {
      const angle = i * Math.PI / 3 + phase * 0.55;
      const radius = 1.16 + phase * 0.48;
      sparkle.position.set(Math.cos(angle) * radius, 1.5 + phase * 3.1 + i % 3 * 0.84, Math.sin(angle) * radius);
    });
  }

  function poseMusic(crystal, dt) {
    crystal.pulse = Math.max(0, crystal.pulse - dt);
    const pulse = reducedMotion() ? 0 : crystal.pulse / 0.5;
    crystal.gem.position.y = 1.07 + pulse * 0.11;
    crystal.material.emissiveIntensity = (crystal.played ? 0.64 : 0.18) + pulse * 0.77;
    crystal.marker.visible = crystal.played;
  }

  const missionStatus = {
    missions: [
      {
        id: 'crystals', title: 'Activate ice crystals', total: activation.length,
        get current() { return activation.reduce((count, crystal) => count + Number(crystal.active), 0); },
        get complete() { return missions.crystals; },
      },
      {
        id: 'stairs', title: 'Build the ice staircase', total: segments.length,
        get current() { return segments.reduce((count, section) => count + Number(section.growth !== null), 0); },
        get complete() { return missions.stairs; },
      },
      {
        id: 'melody', title: 'Play the crystal melody', total: music.length,
        get current() { return music.reduce((count, crystal) => count + Number(crystal.played), 0); },
        get complete() { return missions.melody; },
      },
    ],
    get hint() {
      if (!missions.crystals) return 'Find the crystals at the four terrace corners.';
      if (!missions.stairs) return segments.some(section => section.growth === null)
        ? 'Build the staircase from the hall.' : 'Wait for the ice staircase to finish forming.';
      if (!missions.melody) return 'Play the three tuning crystals in the hall.';
      return '';
    },
  };

  return {
    missions, interactions, staircase,
    missionStatus,
    reset() {
      for (const crystal of activation) {
        Object.assign(crystal, { active: false, charge: 0, burst: 0 });
        poseCrystal(crystal, 0);
      }
      for (const section of segments) section.growth = null;
      staircase.pose();
      for (const crystal of music) {
        Object.assign(crystal, { played: false, pulse: 0 });
        poseMusic(crystal, 0);
      }
    },
    update(dt) {
      const stairsWereComplete = missions.stairs;
      for (const section of segments) {
        if (section.growth === null || section.growth === 1) continue;
        section.growth = reducedMotion() ? 1 : Math.min(1, section.growth + dt / 0.56);
      }
      if (!stairsWereComplete) {
        staircase.pose();
        if (missions.stairs) finishStairs();
      }
      for (const crystal of activation) poseCrystal(crystal, dt);
      for (const crystal of music) poseMusic(crystal, dt);
    },
  };
}

function createCrystalGeometry(THREE) {
  const sides = 6;
  const rings = [[0, 0.54], [0.17, 1], [0.69, 0.87]];
  const positions = [];
  const indices = [];
  for (const [y, radius] of rings) {
    for (let i = 0; i < sides; i++) {
      const angle = i * 2 * Math.PI / sides;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  const tip = positions.length / 3;
  const base = tip + 1;
  positions.push(0.07, 1, -0.04, 0, 0, 0);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    indices.push(i, next, base, i + 2 * sides, tip, next + 2 * sides);
    for (let band = 0; band < rings.length - 1; band++) {
      const lower = band * sides;
      const upper = lower + sides;
      indices.push(lower + i, upper + i, lower + next, lower + next, upper + i, upper + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
