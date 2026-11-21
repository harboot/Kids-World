import { createCastleActivities } from './activities.js';
import { buildDecorations } from './decorations.js';
import { buildPalace, createPalaceBuilder } from './palace.js';
import { blocksSummitEdge, buildSummit } from './summit.js';
import { metadata } from './metadata.js';
import { music } from './music.js';

const ID = metadata.id;
const completionCue = [
  [66, { duration: 0.34, level: 0.13 }, 1.1],
  [73, { duration: 0.33, level: 0.14 }, 1.25],
  [78, { duration: 0.52, level: 0.15 }, 1.42],
  [90, { duration: 0.66, level: 0.085 }, 1.48],
];

export const frozenCastle = {
  ...metadata,
  music,
  load: loadCastle,
};

export default frozenCastle;

function loadCastle({ THREE, scene, hud, signal, playCue = () => {}, reducedMotion = () => false,
  isLevelComplete = () => false, completeLevel = () => {}, notify }) {
  const obstacles = [];
  const builder = createPalaceBuilder(THREE, scene, obstacles);
  buildPalace(THREE, scene, builder, hud?.ownerDocument);
  buildSummit(THREE, scene, builder);
  const { throneInteraction, droplets, chandelierGlow, aurora } = buildDecorations(THREE, builder);

  let released = false;
  let recorded = isLevelComplete(ID);
  let elapsed = 0;
  let celebration = 0;
  let chandelier = 0;

  const isActive = () => !released && !signal?.aborted;
  const activity = createCastleActivities(THREE, builder, hud?.ownerDocument, {
    playCue, reducedMotion, isActive,
    onMissionComplete() {
      if (!isComplete()) return;
      if (!recorded && !isLevelComplete(ID)) completeLevel(ID);
      recorded = true;
      celebration = 2.4;
      playCue(completionCue);
      pose(0);
      notify?.('Castle Magic Restored! Frozen Castle complete!');
    },
  });
  builder.batchArchitecture();

  const { missions } = activity;
  const isComplete = () => missions.crystals && missions.stairs && missions.melody;
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
    droplets.children.forEach((droplet, i) => {
      droplet.position.y = 1.12 + (still ? 0 : Math.sin(elapsed * 1.8 + i * 0.68) * 0.18);
    });
  }

  function reset() {
    elapsed = 0;
    celebration = 0;
    chandelier = 0;
    activity.reset();
    pose(0);
  }

  return {
    obstacles,
    interactions: [...activity.interactions, throne],
    blocksGround(x, z, radius, feet, from) {
      return blocksSummitEdge(x, z, radius) || activity.staircase.blocksGround(x, z, radius, feet, from);
    },
    getGroundHeight: activity.staircase.getGroundHeight,
    get missionStatus() { return activity.missionStatus; },
    reset,
    update(dt) {
      if (!isActive()) return;
      celebration = Math.max(0, celebration - dt);
      activity.update(dt);
      pose(dt);
    },
    unload() {
      released = true;
      reset();
    },
  };
}
