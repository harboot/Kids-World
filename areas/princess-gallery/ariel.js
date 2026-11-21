import { addGroup } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { buildArielCharacter } from './ariel-character.js';
import { buildCoralReef, buildReefFish, buildSeascape, buildUnderseaKingdom } from './ariel-reef.js';
import { buildShipwreck, wreckDeck } from './ariel-wreck.js';
import { spaceTransform } from './parts.js';

const initialPhase = -Math.PI * .32;
const orbitRadius = 3.65;

export function buildAriel(context) {
  const { THREE, bay, exhibit, parts, reducedMotion = () => false } = context;
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
  const scene = { ...context, room, palette };
  buildSeascape(scene);
  buildUnderseaKingdom(scene);
  buildCoralReef(scene);
  const wreck = buildShipwreck(scene);
  const fish = buildReefFish(scene);
  const { actor, pose } = buildArielCharacter(THREE, room, parts);
  const { toLocal } = spaceTransform(exhibit);
  const roomPoint = [0, 0];
  const shipPoint = [0, 0];
  let blend = 0;
  let phase = initialPhase;
  let elapsed = 0;
  let centerX = 0;
  let centerZ = 0;

  function reset() {
    blend = elapsed = 0;
    phase = initialPhase;
    centerX = wreckDeck.position.x;
    centerZ = wreckDeck.position.z;
    actor.position.set(centerX, 0, centerZ);
    actor.rotation.set(0, 0, 0);
    actor.visible = false;
    pose(0, reducedMotion());
    fish.reset();
  }
  reset();
  return {
    reset,
    getGroundHeight(x, z) {
      toLocal(x, z, roomPoint);
      wreck.toLocal(roomPoint[0], roomPoint[1], shipPoint);
      return wreck.surface(shipPoint[0], shipPoint[1]);
    },
    update(dt, player, grounded, still) {
      toLocal(player.x, player.z, roomPoint);
      const [x, z] = roomPoint;
      // Pause the schools out of view. The nearby walkway still has a view into the kingdom.
      if (Math.abs(x) < 24 && Math.abs(z) < 25) fish.update(dt, still);
      wreck.toLocal(x, z, shipPoint);
      const onDeck = grounded && wreck.onDeck(shipPoint[0], shipPoint[1]) &&
        Math.abs(player.y - EYE_HEIGHT - wreckDeck.height) < .12;
      if (!onDeck && blend === 0) return false;
      if (onDeck) {
        centerX = x;
        centerZ = z;
      }
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
        phase = (phase + dt * .81) % (Math.PI * 2);
      }
      const sin = Math.sin(phase), cos = Math.cos(phase);
      const dx = orbitRadius * cos, dz = orbitRadius * .90 * sin;
      const rise = smoothstep(blend, 0, 1);
      const bob = still ? 0 : Math.sin(elapsed * 2.57) * .14;
      actor.position.set(centerX + dx, wreckDeck.height - 1.03 + rise * 2.02 + bob, centerZ + dz);
      actor.rotation.y = still ? Math.atan2(-dx, -dz) : Math.atan2(-sin, cos * .90) - .66;
      pose(elapsed, still);
      return onDeck && blend >= .7;
    },
  };
}
