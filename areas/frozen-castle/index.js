import { createCastleActivities } from './activities.js';
import { buildDecorations, gatewaySite, returnSite } from './decorations.js';
import { buildPalace, createPalaceBuilder, palaceGround, PALACE_DEPTH, PALACE_WIDTH } from './palace.js';

const ID = 'frozen-castle';
const village = {
  id: 'snowglow-village',
  label: 'Enter Snowglow Village',
  arrive(notify) { notify('Snowglow Village — Coming Soon'); },
};

const unlockCue = [
  [66, { duration: 0.34, level: 0.13 }, 1.1],
  [73, { duration: 0.33, level: 0.14 }, 1.25],
  [78, { duration: 0.52, level: 0.15 }, 1.42],
  [90, { duration: 0.66, level: 0.085 }, 1.48],
];

export const frozenCastle = {
  id: ID,
  title: 'Frozen Castle',
  heading: ['Frozen', 'Castle'],
  description: 'Awaken ice crystals, build a bridge and play a crystal melody. Follow the ice mosaic into the palace.',
  canvasLabel: '3D crystal palace',
  themeColor: '#dce9fb',
  music: ID,
  width: PALACE_WIDTH,
  depth: PALACE_DEPTH,
  spawn: { x: 0, z: 11.17 },
  load: loadCastle,
};

function loadCastle({ THREE, scene, hud, signal, playCue = () => {}, reducedMotion = () => false,
  isLevelComplete = () => false, completeLevel = () => {} }) {
  const obstacles = [];
  const builder = createPalaceBuilder(THREE, scene, obstacles);
  buildPalace(THREE, scene, builder);
  const { throneInteraction, droplets, chandelierGlow, aurora, gatewayGlow } = buildDecorations(THREE, builder, hud?.ownerDocument);

  let released = false;
  let recorded = isLevelComplete(ID);
  let elapsed = 0;
  let celebration = 0;
  let chandelier = 0;
  let notice = '';
  let noticeTime = 0;

  const isActive = () => !released && !signal?.aborted;
  const activity = createCastleActivities(THREE, builder, hud?.ownerDocument, {
    playCue, reducedMotion, isActive,
    onMissionComplete() {
      if (!isComplete()) return;
      if (!recorded && !isLevelComplete(ID)) completeLevel(ID);
      recorded = true;
      celebration = 2.4;
      playCue(unlockCue);
      pose(0);
    },
  });
  builder.batchArchitecture();

  const { missions } = activity;
  const isComplete = () => missions.crystals && missions.bridge && missions.melody;
  const gateway = {
    ...gatewaySite, radius: 2.5, anchorY: 2, label: village.label, destination: village.id, silent: true,
    get active() { return isActive() && (isComplete() || recorded || isLevelComplete(ID)); },
    act() {
      if (!this.active) return;
      village.arrive(message => {
        notice = message;
        noticeTime = 3.2;
      });
    },
  };
  const exit = {
    ...returnSite, radius: 2.05, anchorY: 2.18, label: 'Return to Snow Basin',
    act({ travel, heardCue }) { if (isActive()) travel('snow', heardCue, ID); },
  };
  const throne = {
    ...throneInteraction,
    get active() { return isActive(); },
    act(context) { if (isActive()) throneInteraction.act(context); },
  };

  function pose(dt) {
    const still = reducedMotion();
    if (!still) elapsed += dt;
    if (missions.crystals) chandelier = still ? 1 : Math.min(1, chandelier + dt * 1.6);
    const shimmer = celebration > 0 ? (still ? 0.5 : (0.55 + 0.38 * Math.cos(celebration * 9)) * celebration / 2.4) : 0;
    chandelierGlow.color.setRGB(0.18 + chandelier * 0.47, 0.36 + chandelier * 0.48, 0.49 + chandelier * 0.5);
    chandelierGlow.emissiveIntensity = 0.34 + chandelier * 1.95 + shimmer * 1.9;

    aurora.visible = missions.melody;
    aurora.position.y = 7.8 + (still ? 0 : Math.sin(elapsed * 0.68) * 0.23);
    aurora.children[0].material.opacity = 0.32 + shimmer * 0.5 + (still ? 0 : Math.sin(elapsed * 1.4) * 0.075);
    gatewayGlow.color.setHex(gateway.active ? 0xffbf81 : 0x8b666e);
    gatewayGlow.emissiveIntensity = gateway.active ? 1.35 + shimmer * 2.85 : 0.45;
    droplets.children.forEach((droplet, i) => {
      droplet.position.y = 1.12 + (still ? 0 : Math.sin(elapsed * 1.8 + i * 0.68) * 0.18);
    });
  }

  function reset() {
    elapsed = 0;
    celebration = 0;
    chandelier = 0;
    notice = '';
    noticeTime = 0;
    activity.reset();
    pose(0);
  }

  return {
    obstacles,
    interactions: [...activity.interactions, throne, gateway, exit],
    blocksGround: activity.blocksGround,
    getGroundHeight: palaceGround,
    get objective() {
      const count = Object.values(missions).filter(Boolean).length;
      const progress = `Frozen Castle · ${count}/3 missions`;
      if (notice) return `${progress}\n${notice}`;
      if (isComplete()) return `${progress}\nCastle Magic Restored!\nSnowglow Village unlocked!`;
      return [progress, ...activity.hints].join('\n');
    },
    reset,
    update(dt) {
      if (!isActive()) return;
      celebration = Math.max(0, celebration - dt);
      noticeTime = Math.max(0, noticeTime - dt);
      if (!noticeTime) notice = '';
      activity.update(dt);
      pose(dt);
    },
    unload() {
      released = true;
      reset();
    },
  };
}
