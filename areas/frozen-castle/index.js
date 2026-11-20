import { createCastleActivities } from './activities.js';
import { buildDecorations, gatewaySite, returnSite } from './decorations.js';
import { buildPalace, createPalaceBuilder } from './palace.js';
import { BALCONY_HEIGHT } from './staircase.js';
import { blocksSummitEdge, buildSummit, SUMMIT_SIZE } from './summit.js';
import { buildRoyalGateway } from '../shared/royal-gateway.js';

const ID = 'frozen-castle';
const villageName = 'Arendelle Village';
const VILLAGE_ID = 'arendelle-village';
const GALLERY_ID = 'princess-gallery';
const gallerySite = { x: 8.8, z: 12.91 };
const galleryRequirements = 'Complete all three Frozen Castle missions to open Princess Gallery.';

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
  description: 'Explore the palace and its mountain terrace. Activate four corner crystals, build an ice staircase and play a crystal melody.',
  canvasLabel: '3D crystal palace and mountaintop terrace',
  themeColor: '#dce9fb',
  music: ID,
  width: SUMMIT_SIZE,
  depth: SUMMIT_SIZE,
  spawn: { x: 0, z: 11.17 },
  load: loadCastle,
};

function loadCastle({ THREE, scene, hud, signal, playCue = () => {}, reducedMotion = () => false,
  isLevelComplete = () => false, completeLevel = () => {}, notify }) {
  const obstacles = [];
  const builder = createPalaceBuilder(THREE, scene, obstacles);
  buildPalace(THREE, scene, builder, hud?.ownerDocument);
  buildSummit(THREE, scene, builder);
  const { throneInteraction, droplets, chandelierGlow, aurora, gatewayGlow } = buildDecorations(THREE, builder, hud?.ownerDocument, villageName, BALCONY_HEIGHT);
  const setGalleryGlow = buildRoyalGateway(THREE, scene, hud?.ownerDocument, obstacles, {
    ...gallerySite, yaw: Math.PI, title: 'Princess Gallery',
  });

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
      playCue(unlockCue);
      pose(0);
      notify?.(`Castle Magic Restored! ${villageName} and Princess Gallery unlocked!`);
    },
  });
  builder.batchArchitecture();

  const { missions } = activity;
  const isComplete = () => missions.crystals && missions.stairs && missions.melody;
  const gatewaysUnlocked = () => isComplete() || recorded || isLevelComplete(ID);
  const gateway = {
    ...gatewaySite, radius: 2.5, anchorY: BALCONY_HEIGHT + 1.8, label: 'Enter ' + villageName,
    destination: VILLAGE_ID,
    reachable: player => player.y >= BALCONY_HEIGHT + 1.2,
    get active() { return isActive() && gatewaysUnlocked(); },
    act(context) {
      if (this.active) context.travel(VILLAGE_ID, context.heardCue);
    },
  };
  const galleryGateway = {
    ...gallerySite, radius: 2.65, anchorY: 1.85, destination: GALLERY_ID,
    reachable: player => player.y < 3.5 && player.z < gallerySite.z,
    get active() { return isActive(); },
    get unlocked() { return isActive() && gatewaysUnlocked(); },
    get label() { return this.unlocked ? 'Enter Princess Gallery' : 'Princess Gallery · Locked'; },
    get silent() { return !this.unlocked; },
    act({ travel, heardCue }) {
      if (!isActive()) return;
      if (this.unlocked) travel(GALLERY_ID, heardCue, ID);
      else notify?.(galleryRequirements);
    },
  };
  const exit = {
    ...returnSite, radius: 2.05, anchorY: 2.18, label: 'Return to Snow Basin',
    reachable: player => player.y < 3.5 && player.z < returnSite.z,
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
    setGalleryGlow(galleryGateway.unlocked);
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
    arrivals: {
      [VILLAGE_ID]: { x: 0, z: 9.5 },
      [GALLERY_ID]: { x: gallerySite.x, z: 9.45, yaw: Math.PI },
    },
    interactions: [...activity.interactions, throne, gateway, galleryGateway, exit],
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
