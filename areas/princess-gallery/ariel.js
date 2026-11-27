import { cueSource, entryCue, galleryCues } from './interaction-audio.js';
import { addGroup } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { buildArielCharacter } from './ariel-character.js';
import { buildCoralReef, buildReefFish, buildSeascape, buildUnderseaKingdom } from './ariel-reef.js';
import { buildArielTreasure } from './ariel-treasure.js';
import { buildShipwreck, wreckDeck } from './ariel-wreck.js';
import { spaceTransform } from './parts.js';

const initialPhase = -Math.PI * .32;
const orbit = { centerZ: -.70, radiusX: 4.55, radiusZ: 5.33, speed: .37 };

export function buildAriel(context) {
  const { THREE, bay, exhibit, parts, reducedMotion, camera, isActive, playCue = () => {} } = context;
  const { matte } = parts;
  const { clamp, smoothstep } = THREE.MathUtils;
  const room = addGroup(THREE, bay, 'Ariel undersea kingdom');
  const palette = {
    ivory: matte(0xc7e6d6),
    gold: matte(0xc49759),
    rock: matte(0x526e82),
    teal: matte(0x2c8293),
    aqua: matte(0x49b6ad, { emissive: 0x267a84, emissiveIntensity: .20 }),
    deep: matte(0x12435c),
  };
  const roomContext = { ...context, room, palette };
  buildSeascape(roomContext);
  buildUnderseaKingdom(roomContext);
  buildCoralReef(roomContext);
  const treasure = buildArielTreasure({ ...roomContext, camera, isActive, reducedMotion });
  const wreck = buildShipwreck(roomContext);
  const fish = buildReefFish(roomContext);
  const { actor, pose } = buildArielCharacter(THREE, wreck.ship, parts);
  const { toLocal } = spaceTransform(exhibit);
  const roomPoint = [0, 0];
  const shipPoint = [0, 0];
  const audio = entryCue(playCue,galleryCues.ariel,cueSource(exhibit.position.x,exhibit.position.z,EYE_HEIGHT+wreckDeck.height,14));
  let blend = 0;
  let phase = initialPhase;
  let elapsed = 0;

  function reset() {
    audio.reset();
    blend = elapsed = 0;
    phase = initialPhase;
    actor.position.set(0, 0, 0);
    actor.rotation.set(0, 0, 0);
    actor.visible = false;
    pose(0, reducedMotion());
    fish.reset();
    treasure.reset();
  }
  reset();
  return {
    reset,
    interactions: [treasure.interaction],
    getGroundHeight(x, z) {
      toLocal(x, z, roomPoint);
      wreck.toLocal(roomPoint[0], roomPoint[1], shipPoint);
      return wreck.surface(shipPoint[0], shipPoint[1]);
    },
    update(dt, player, grounded, still) {
      treasure.update(dt, still);
      toLocal(player.x, player.z, roomPoint);
      const [x, z] = roomPoint;
      // Pause the schools out of view. The nearby walkway still has a view into the kingdom.
      if (Math.abs(x) < 24 && Math.abs(z) < 25) fish.update(dt, still);
      wreck.toLocal(x, z, shipPoint);
      const onDeck = grounded && wreck.onDeck(shipPoint[0], shipPoint[1]) &&
        Math.abs(player.y - EYE_HEIGHT - wreckDeck.height) < .12;
      audio.update(onDeck,dt);
      if (!onDeck && blend === 0) return false;
      blend = still ? Number(onDeck) : clamp(blend + dt * (onDeck ? 1.37 : -1.80), 0, 1);
      actor.visible = blend > 0;
      if (!actor.visible) {
        phase = initialPhase;
        elapsed = 0;
        return false;
      }

      if (still) phase = initialPhase;
      else {
        elapsed += dt;
        phase = (phase + dt * orbit.speed) % (Math.PI * 2);
      }
      const sin = Math.sin(phase), cos = Math.cos(phase);
      const dx = orbit.radiusX * cos, dz = orbit.radiusZ * sin;
      const rise = smoothstep(blend, 0, 1);
      const bob = still ? 0 : Math.sin(elapsed * 2.57) * .14;
      actor.position.set(dx, wreckDeck.height - 1.03 + rise * 2.02 + bob, orbit.centerZ + dz);
      actor.rotation.y = still ? Math.atan2(-dx, -dz) : Math.atan2(-orbit.radiusX * sin, orbit.radiusZ * cos) - .66;
      pose(elapsed * .85, still);
      return onDeck && blend >= .7;
    },
  };
}
