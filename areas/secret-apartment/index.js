import { overlaps } from '../../core/movement.js';
import { buildBasement } from './basement.js';
import { createApartmentCinematic } from './cinematic.js';
import { HALL } from './corridor.js';
import { createElevator } from './elevator.js';
import { buildFloor8 } from './floor8.js';
import { buildFloor17 } from './floor17.js';
import { createArchitecture } from './geometry.js';
import { createApartmentMission, travelCue } from './missions.js';
import { TERRACE } from './pool.js';

const PLACEMENT = {
  basement: { x: -88, doorZ: -9.75 },
  floor8: { x: 0, doorZ: -10.65 },
  floor17: { x: 88, doorZ: -10.65 },
};

export const secretApartment = {
  title: 'Secret Apartment — 17E',
  heading: ['Secret Apartment', '17E'],
  description: 'Explore the underground parking, the pool terrace on Floor 8, and Unit 17E.',
  canvasLabel: '3D apartment building with underground parking, pool terrace and Unit 17E',
  themeColor: '#e5dac6',
  width: 220,
  depth: 84,
  spawn: { x: PLACEMENT.basement.x + 0.24, z: 9.5, yaw: -0.12 },
  load: loadApartment,
};

function inZone(id, x, z, doorZ) {
  if (id === 'basement') return Math.abs(x) <= 16 && z >= -13.5 && z <= 13;
  if (z <= doorZ) return Math.abs(x) < 1.79 && z >= doorZ - 3.25;
  if (z <= HALL.south) return Math.abs(x) <= HALL.halfWidth;
  if (id === 'floor8') return x >= TERRACE.left && x <= TERRACE.right && z <= TERRACE.back;
  return x >= 0.8 && x <= 10.68 && z <= 3.33;
}

function loadApartment({ THREE, scene, camera, hud, signal, playCue = () => {}, reducedMotion = () => false }) {
  const architecture = createArchitecture(THREE);
  const zones = Object.fromEntries(Object.entries(PLACEMENT).map(([id, placement]) => {
    const root = architecture.group(scene, id, placement.x);
    const solids = [];
    const b = architecture.builder(root, solids);
    return [id, { ...placement, root, b, solids }];
  }));
  const mission = createApartmentMission(playCue, signal);
  const basement = buildBasement(THREE, architecture, zones.basement, mission, reducedMotion, camera.position);
  const floor8 = buildFloor8(THREE, architecture, zones.floor8, reducedMotion, mission);
  const floor17 = buildFloor17(THREE, architecture, zones.floor17, reducedMotion, mission);
  const features = { basement, floor8, floor17 };
  const cinematic = createApartmentCinematic(THREE, architecture, hud, floor17.unit, mission, reducedMotion);
  let active;
  const sky = new THREE.Color(0xafd0df);
  const garageBackground = new THREE.Color(0x555e61);
  const interiorBackground = new THREE.Color(0xcfbfa8);
  const fog = new THREE.Fog(0xafd0df, 40, 110);
  const ambient = new THREE.HemisphereLight(0xfff4e1, 0x978c7c, 1.57);
  const sun = new THREE.DirectionalLight(0xfff2d5, 1.0);
  sun.position.set(-23, 36, -10);
  scene.add(ambient, sun);

  function showZone(id) {
    active = id;
    for (const [name, { root }] of Object.entries(zones)) root.visible = id === name;
    scene.fog = id === 'floor8' ? fog : null;
    scene.background = id === 'floor8' ? sky : id === 'basement' ? garageBackground : interiorBackground;
    ambient.intensity = id === 'basement' ? 0.91 : 1.57;
    sun.intensity = id === 'floor8' ? 2.0 : id === 'floor17' ? 0.83 : 0.49;
  }

  const elevator = createElevator(THREE, architecture, zones, {
    onArrival(id) {
      mission.visit(id);
      showZone(id);
    },
    reducedMotion,
    accessMessage: mission.accessMessage,
    notify: mission.notify,
    onDepart() { playCue(travelCue); },
    enabled: () => !signal?.aborted && !mission.cinematic,
  });
  for (const { b } of Object.values(zones)) b.finish();

  return {
    obstacles: [],
    interactions: [...elevator.interactions, ...basement.interactions, ...floor8.interactions, ...floor17.interactions],
    get objective() {
      const destination = elevator.destination;
      return mission.objective(destination && ('Elevator in transit · ' + destination));
    },
    blocksGround(x, z) {
      const zone = zones[active];
      const localX = x - zone.x;
      return !inZone(active, localX, z, zone.doorZ) ||
        zone.solids.some(solid => overlaps(solid, localX, z)) ||
        elevator.blocks(active, localX, z) || features[active].blocks(localX, z);
    },
    getCeilingHeight(x, z) {
      const localX = x - zones[active].x;
      return Math.min(elevator.ceiling(active, localX, z), features[active].ceiling?.(localX, z) ?? Infinity);
    },
    reset() {
      mission.reset();
      showZone('basement');
      elevator.reset();
      for (const feature of Object.values(features)) feature.reset();
      cinematic.render(false);
    },
    update(dt, position, elapsed) {
      // These animations do not drive player physics. Bound long stalls so each count is visible.
      const animationDt = Math.min(elapsed ?? dt, 0.25);
      mission.update(animationDt);
      elevator.update(animationDt);
      features[active].update(animationDt);
      cinematic.render(active === 'floor17' && floor17.unit.contains(position.x - zones.floor17.x, position.z));
    },
    unload() {
      cinematic.unload();
    },
  };
}
