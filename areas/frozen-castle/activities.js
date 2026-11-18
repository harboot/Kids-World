import { addPalaceSign } from './decorations.js';
import { CHANNEL } from './palace.js';

const activationSites = [{ x: -3.45, z: 8.35 }, { x: 5.7, z: -0.45 }, { x: -3.65, z: -3.25 }];
const musicSites = [
  { x: 8.15, z: 4.55, pitch: 74, color: 0x70d7ff },
  { x: 10.55, z: 3.12, pitch: 81, color: 0xff8dcf },
  { x: 11.35, z: 5.85, pitch: 85, color: 0xb49bff },
];
const bridgeSite = { x: -7.0, z: 1.27 };
const deckHalfDepth = 1.13;
const sectionCount = 3;
const sectionLength = (CHANNEL.east - CHANNEL.west) / sectionCount;

const bell = (duration = 0.38, level = 0.14) => ({ duration, level });
const activateCue = [[77, bell(0.29)], [89, bell(0.41, 0.085), 0.055]];
const buildCue = [[61, { ...bell(0.21, 0.11), endPitch: 68, wave: 'triangle' }], [82, bell(), 0.07]];
const restoreCue = [[73, bell(), 0.32], [78, bell(), 0.44], [83, bell(0.55), 0.57]];
const melodyCue = [[74, bell(), 0.35], [85, bell(), 0.51], [81, bell(), 0.68], [88, bell(0.67, 0.18), 0.84]];

export function createCastleActivities(THREE, builder, document, { playCue, reducedMotion, isActive, onMissionComplete }) {
  const { architecture, group, part, solid, ice, materials: { blue, deep, frost, glass, light, lilac, pearl, silver } } = builder;

  const activation = activationSites.map((site, i) => {
    const pedestal = group('Ice crystal pedestal', site.x, 0, site.z, architecture);
    part(pedestal, 'drum', deep, 0, 0.16, 0, 0.58, 0.32, 0.58);
    part(pedestal, 'drum', pearl, 0, 0.42, 0, 0.45, 0.2, 0.45);
    for (const side of [-1, 1]) {
      part(pedestal, 'gem', glass, side * 0.34, 0.8, 0, 0.18, 0.53, 0.22).rotation.z = -side * 0.28;
    }
    const model = group('Activation crystal ' + (i + 1), site.x, 1.26, site.z);
    const material = ice(0x5c859e, 0x1b5c69);
    part(model, 'gem', material, 0, 0, 0, 0.38, 0.84, 0.38).rotation.y = Math.PI / 4;
    const sparkles = group('Crystal sparkles', 0, 0, 0, model);
    for (let j = 0; j < 6; j++) part(sparkles, 'gem', light, 0, 0, 0, 0.065, 0.115, 0.065);
    solid(site.x, site.z, 1.11, 1.11, 1.9);
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
  part(musicSign, 'box', deep, 0, 1.09, 0, 1.68, 0.31, 0.12);
  addPalaceSign(THREE, document, musicSign, 'Crystal Melody', 0, 1.09, 0.064, 1.62, 0.302);
  solid(9.56, 5.95, 1.68, 0.29, 1.25);

  const bridgeStand = group('Bridge pedestal', bridgeSite.x, 0, bridgeSite.z, architecture);
  part(bridgeStand, 'drum', deep, 0, 0.11, 0, 0.54, 0.22, 0.54);
  part(bridgeStand, 'drum', blue, 0, 0.54, 0, 0.34, 0.65, 0.34);
  part(bridgeStand, 'gem', lilac, 0, 1, 0, 0.34, 0.37, 0.34);
  addPalaceSign(THREE, document, bridgeStand, 'Ice Bridge', 0, 0.63, 0.345, 0.97, 0.22);
  solid(bridgeSite.x, bridgeSite.z, 1.0, 1.0, 1.36);

  const segments = Array.from({ length: sectionCount }, (_, i) => {
    const x = CHANNEL.east - (i + 0.5) * sectionLength;
    part(architecture, 'gem', pearl, x, -0.28, 0, 0.34, 0.12, 0.6);
    const model = group('Ice bridge section ' + (i + 1), x, 0, 0);
    part(model, 'box', glass, 0, -0.09, 0, sectionLength + 0.001, 0.18, 2 * (deckHalfDepth + 0.065));
    part(model, 'box', frost, 0, -0.025, 0, sectionLength - 0.045, 0.05, (deckHalfDepth - 0.06) * 2);
    part(model, 'box', light, 0, -0.012, 0, 0.048, 0.025, 1.56);
    for (const side of [-1, 1]) {
      part(model, 'box', blue, 0, 0.18, side * deckHalfDepth, sectionLength + 0.001, 0.36, 0.14);
      part(model, 'box', pearl, 0, 0.37, side * deckHalfDepth, sectionLength - 0.015, 0.087, 0.16);
      part(model, 'gem', silver, 0, 0.48, side * deckHalfDepth, 0.11, 0.19, 0.1);
    }
    return { model, growth: null };
  });

  const missions = {
    get crystals() { return activation.every(crystal => crystal.active); },
    get bridge() { return segments.every(section => section.growth === 1); },
    get melody() { return music.every(crystal => crystal.played); },
  };

  function blocksGround(x, z, radius) {
    if (Math.abs(z) >= CHANNEL.halfDepth + radius || x - radius >= CHANNEL.east || x + radius <= CHANNEL.west) return false;
    if (Math.abs(z) > deckHalfDepth - 0.08 - radius) return true;
    const firstGap = segments.findIndex(section => section.growth !== 1);
    return firstGap !== -1 && x - radius < CHANNEL.east - firstGap * sectionLength;
  }

  const interactions = [
    ...activation.map(crystal => ({
      ...crystal.site, radius: 2, anchorY: 1.37, label: 'Activate crystal', silent: true,
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
      ...bridgeSite, radius: 2, anchorY: 0.96, label: 'Create ice bridge', silent: true,
      get active() { return isActive() && segments.some(section => section.growth === null); },
      act() {
        if (!this.active) return;
        const section = segments.find(item => item.growth === null);
        section.growth = reducedMotion() ? 1 : 0;
        poseSection(section);
        playCue(buildCue);
        if (missions.bridge) finishBridge();
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

  function finishBridge() {
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
      const radius = 0.43 + phase * 0.37;
      sparkle.position.set(Math.cos(angle) * radius, -0.33 + phase * 0.85 + i % 2 * 0.38, Math.sin(angle) * radius);
    });
  }

  function poseSection(section) {
    section.model.visible = section.growth !== null;
    const eased = 1 - (1 - (section.growth ?? 0)) ** 3;
    section.model.position.y = -0.31 * (1 - eased);
    section.model.scale.y = 0.04 + eased * 0.96;
  }

  function poseMusic(crystal, dt) {
    crystal.pulse = Math.max(0, crystal.pulse - dt);
    const pulse = reducedMotion() ? 0 : crystal.pulse / 0.5;
    crystal.gem.position.y = 1.07 + pulse * 0.11;
    crystal.material.emissiveIntensity = (crystal.played ? 0.64 : 0.18) + pulse * 0.77;
    crystal.marker.visible = crystal.played;
  }

  return {
    missions, interactions, blocksGround,
    get hints() {
      return [
        !missions.crystals && `Awaken ice crystals · ${activation.filter(crystal => crystal.active).length}/3`,
        !missions.bridge && `Build the ice bridge · ${segments.filter(section => section.growth !== null).length}/3`,
        !missions.melody && `Play crystal melody · ${music.filter(crystal => crystal.played).length}/3`,
      ].filter(Boolean);
    },
    reset() {
      for (const crystal of activation) {
        Object.assign(crystal, { active: false, charge: 0, burst: 0 });
        poseCrystal(crystal, 0);
      }
      for (const section of segments) {
        section.growth = null;
        poseSection(section);
      }
      for (const crystal of music) {
        Object.assign(crystal, { played: false, pulse: 0 });
        poseMusic(crystal, 0);
      }
    },
    update(dt) {
      const bridgeWasComplete = missions.bridge;
      for (const section of segments) {
        if (section.growth === null || section.growth === 1) continue;
        section.growth = reducedMotion() ? 1 : Math.min(1, section.growth + dt / 0.48);
        poseSection(section);
      }
      if (!bridgeWasComplete && missions.bridge) finishBridge();
      for (const crystal of activation) poseCrystal(crystal, dt);
      for (const crystal of music) poseMusic(crystal, dt);
    },
  };
}
