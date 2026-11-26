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
import { createJeepDriving } from './jeep.js';
import { buildTankCourse } from './tank-course.js';
import { buildObservationProps } from './observation-props.js';
import { buildGenerator } from './generator.js';
import { buildRobotHangar } from './robot-hangar.js';
import { metadata } from './metadata.js';
import { music } from './music.js';
import { createNightLighting, setNightEnvironment } from './lighting.js';

export const militaryBase = {
  ...metadata,
  music,
  load({ THREE, scene, camera, hud, playerRadius, touch, reducedMotion = () => false,
    carryPlayer = () => {}, playCue = () => {}, notify = () => {}, completeLevel = () => {}, isLevelComplete = () => false }) {
    setNightEnvironment(THREE, scene, touch);

    const document = hud?.ownerDocument;
    const kit = createScenery(THREE, scene, document, playerRadius);
    const moving = kit.movingParts();
    buildTerrain(kit);
    buildRoads(kit);
    buildBuildings(kit);
    const hangar = buildRobotHangar(kit, moving, { camera, reducedMotion, carryPlayer, notify });
    const generator = buildGenerator(kit, moving);
    const traversal = buildPerimeter(kit);
    const { repair: tank, drivable, drivableJeep } = buildVehicles(kit, moving);
    const vehicleOptions = { THREE, camera, obstacles: kit.obstacles, traversal,
      width: metadata.width, depth: metadata.depth, reducedMotion, playCue, notify };
    const driving = createTankDriving({ ...vehicleOptions, model: drivable, canBoard: () => !jeepDriving.active });
    const jeepDriving = createJeepDriving({ ...vehicleOptions, model: drivableJeep, canBoard: () => !driving.active });
    const course = buildTankCourse(kit);
    const observation = buildObservationProps(kit);
    const helicopter = buildHelicopter(kit, moving, document);
    const { radarHeads, poseFlag } = buildDecorations(kit, moving, document);
    const soldiers = buildSoldiers(kit, moving);
    const props = buildMissionProps(kit, moving);
    const missions = createMissions({
      THREE, camera, props, radarHeads, tank, helicopter, soldiers, reducedMotion, playCue, notify,
      completeLevel, isLevelComplete, course, driving, jeepDriving, observation, generator,
    });
    const lighting = createNightLighting({ kit, moving, props, missions, generator, tank: drivable, driving, jeep: drivableJeep, jeepDriving });
    kit.finish();
    moving.build();
    lighting.update(metadata.spawn);

    let time = 0;
    return {
      ...traversal,
      getGroundHeight(x,z,feet) { return hangar.getGroundHeight(x,z,feet) ?? traversal.getGroundHeight(x,z,feet); },
      blocksGround(x,z,radius,feet,from) { return hangar.blocksGround(x,z,radius,feet,from) || traversal.blocksGround(x,z,radius,feet,from); },
      obstacles: kit.obstacles,
      droneView: { center: { x: 0, z: 2 }, width: 163, depth: 155 },
      interactions: [...missions.interactions, ...driving.interactions, ...jeepDriving.interactions, ...hangar.interactions],
      missionStatus: missions.missionStatus,
      unload() { driving.cancel(); jeepDriving.cancel(); missions.unload(); },
      reset() {
        time = 0;
        hangar.reset();
        driving.reset();
        jeepDriving.reset();
        missions.reset();
        soldiers.reset();
        poseFlag(0);
        soldiers.update(0, 0);
        lighting.update(metadata.spawn);
        moving.update();
      },
      update(dt, position) {
        if (!reducedMotion()) {
          time += dt;
          poseFlag(time);
        }
        hangar.update(dt, position);
        missions.update(dt, position);
        soldiers.update(time, dt);
        lighting.update(missions.viewPosition ?? position ?? camera?.position ?? metadata.spawn);
        moving.update();
      },
    };
  },
};

export default militaryBase;
