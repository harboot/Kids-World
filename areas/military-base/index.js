import { buildBuildings } from './buildings.js';
import { buildDecorations } from './decorations.js';
import { buildHelicopter } from './helicopter.js';
import { buildMissionProps } from './mission-props.js';
import { createMissions } from './missions.js';
import { buildPerimeter } from './perimeter.js';
import { buildRoads } from './roads.js';
import { createScenery } from './scenery.js';
import { buildSoldiers } from './soldiers.js';
import { buildTerrain } from './terrain.js';
import { buildVehicles } from './vehicles.js';
import { createTankDriving } from './tank-driving.js';
import { metadata } from './metadata.js';
import { music } from './music.js';

export const militaryBase = {
  ...metadata,
  music,
  load({ THREE, scene, camera, hud, playerRadius, touch, reducedMotion = () => false,
    playCue = () => {}, notify = () => {}, completeLevel = () => {}, isLevelComplete = () => false }) {
    scene.background = new THREE.Color(0xd4e2ee);
    scene.fog = new THREE.Fog(0xd4e2ee, 51, 113);
    scene.add(new THREE.HemisphereLight(0xf0f7ff, 0xaebccd, 1.35));
    const sun = new THREE.DirectionalLight(0xfff1d7, 2.35);
    sun.position.set(-40, 92, 46);
    sun.castShadow = true;
    sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -122, right: 122, top: 108, bottom: -108, near: 22, far: 209 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = .07;
    sun.shadow.bias = -.00015;
    scene.add(sun);

    const document = hud?.ownerDocument;
    const kit = createScenery(THREE, scene, document, playerRadius);
    const moving = kit.movingParts();
    buildTerrain(kit);
    buildRoads(kit);
    buildBuildings(kit);
    const traversal = buildPerimeter(kit);
    const { repair: tank, drivable } = buildVehicles(kit, moving);
    const driving = createTankDriving({ THREE, camera, model: drivable, obstacles: kit.obstacles, traversal,
      width: metadata.width, depth: metadata.depth, reducedMotion, playCue, notify });
    const helicopter = buildHelicopter(kit, moving, document);
    const { radarHeads, poseFlag } = buildDecorations(kit, moving, document);
    const soldiers = buildSoldiers(kit, moving);
    const props = buildMissionProps(kit, moving);
    const missions = createMissions({
      THREE, camera, props, radarHeads, tank, helicopter, soldiers, reducedMotion, playCue, notify,
      completeLevel, isLevelComplete,
    });
    kit.finish();
    moving.build();

    let time = 0;
    return {
      ...traversal,
      obstacles: kit.obstacles,
      droneView: { center: { x: 0, z: 2 }, width: 163, depth: 155 },
      interactions: [...missions.interactions, ...driving.interactions],
      missionStatus: missions.missionStatus,
      unload() { driving.cancel(); missions.unload(); },
      reset() {
        time = 0;
        driving.reset();
        missions.reset();
        soldiers.reset();
        poseFlag(0);
        soldiers.update(0, 0);
        moving.update();
      },
      update(dt, position) {
        if (!reducedMotion()) {
          time += dt;
          poseFlag(time);
        }
        missions.update(dt, position);
        soldiers.update(time, dt);
        moving.update();
      },
    };
  },
};

export default militaryBase;
