import { addClearanceOutline, clearanceMaterial } from '../../core/interaction-clearance.js';
import { buildBuildings } from './buildings.js';
import { decorateVillage } from './decorations.js';
import { buildFountain } from './fountain.js';
import { buildHarbor } from './harbor.js';
import { clockDoors, villageInteractions } from './interactions.js';
import { createVillageMissions } from './missions.js';
import { createScenery } from './scenery.js';
import { buildTerrain } from './terrain.js';
import { buildBystanders } from './villager.js';

export const arendelleVillage = {
  id: 'arendelle-village',
  title: 'Arendelle Village',
  heading: ['Arendelle', 'Village'],
  description: 'Catch fish for the Fish Shop, bring the lost reindeer home, and find three gears to fix the Clock Tower.',
  canvasLabel: '3D medieval harbor village with timber houses, a clock tower, and wooden piers',
  themeColor: '#e9dabf',
  music: 'garden',
  width: 84,
  depth: 72,
  spawn: { x: 0, z: 33.0 },
  load: loadVillage,
};

function loadVillage({ THREE, scene, viewmodel, hud, signal, touch, reducedMotion = () => false,
  playCue = () => {}, isLevelComplete = () => false, completeLevel = () => {} }) {
  const sky = 0xc4dedc;
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, 28, 105);
  scene.add(new THREE.HemisphereLight(0xffebd2, 0x8d9474, 1.55));
  const sun = new THREE.DirectionalLight(0xffe5b3, 2.05);
  sun.position.set(-43, 34, 25);
  sun.target.position.set(-5, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 43, bottom: -43, near: 1, far: 117 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.055;
  scene.add(sun, sun.target);

  const obstacles = [];
  const kit = createScenery(THREE, scene, hud?.ownerDocument, obstacles);
  const terrain = buildTerrain(THREE, scene, kit);
  const { clock, lookout, balcony } = buildBuildings(kit, terrain.getGroundHeight);
  decorateVillage(kit, terrain.getGroundHeight);
  const poseHarbor = buildHarbor(THREE, scene, kit);

  let elapsed = 0;
  let message = '';
  let timeLeft = 0;
  const isActive = () => !signal?.aborted;
  const outlineMaterial = clearanceMaterial(THREE);
  function mark(label, footprint, elevation = terrain.getGroundHeight(footprint.x, footprint.z)) {
    return addClearanceOutline(THREE, scene, label, footprint, outlineMaterial, elevation);
  }
  const fountain = buildFountain(THREE, kit, mark, isActive);
  const poseBystanders = buildBystanders(kit, terrain.getGroundHeight);
  function notify(text) {
    message = text;
    timeLeft = 3.2;
  }
  const missions = createVillageMissions({
    THREE, scene, viewmodel, kit, terrain: { ...terrain, obstacles }, clock, mark, isActive, notify, playCue,
  }, { id: arendelleVillage.id, isLevelComplete, completeLevel });
  const interactions = [
    ...villageInteractions(isActive, notify), ...clockDoors(clock, lookout, isActive, mark),
    fountain.interaction, ...missions.interactions,
  ];
  kit.finish();

  return {
    getGroundHeight(x, z, feet) {
      return lookout.surface(x, z, feet) ?? balcony.surface(x, z, feet) ?? terrain.getGroundHeight(x, z);
    },
    blocksGround(x, z, radius, feet = 0, from) {
      if (terrain.blocksGround(x, z, radius) || missions.blocksGround(x, z, feet)) return true;
      return Boolean(from && (lookout.blocks(x, z, radius, feet, from) || balcony.blocks(x, z, radius, feet, from)));
    },
    obstacles,
    interactions,
    get objective() {
      const lines = missions.progress;
      if (message) lines.push(message);
      return lines.join('\n');
    },
    reset() {
      elapsed = 0;
      message = '';
      timeLeft = 0;
      poseHarbor(0);
      poseBystanders(0, true);
      fountain.reset();
      missions.reset();
    },
    update(dt, player) {
      if (!isActive()) return;
      const still = reducedMotion();
      if (!still) elapsed += dt;
      poseHarbor(still ? 0 : elapsed);
      poseBystanders(elapsed, still);
      fountain.update(elapsed, still);
      if (timeLeft > 0) {
        timeLeft = Math.max(0, timeLeft - dt);
        if (!timeLeft) message = '';
      }
      missions.update(dt, player, elapsed, still);
    },
  };
}
