import { EYE_HEIGHT } from '../../core/player.js';
import { createHelicopterFlight } from './helicopter-flight.js';
import { repairTank } from './layout.js';
import { createObservation } from './observation.js';

const areaId = 'military-base';
const confirmation = [[69, { duration: .19, level: .12 }], [76, { duration: .29, level: .11 }, .13]];
const engineCue = [[34, { endPitch: 43, duration: 1.3, level: .16, attack: .36, wave: 'triangle' }]];
const parkTime = 4.65;
const easing = t => t * t * (3 - 2 * t);
const ownHeight = (point, player) => Math.abs(player.y - (point.y ?? 0) - EYE_HEIGHT) < 1.12;

function objective(id, title, total) {
  return { id, title, total, current: 0, complete: false };
}

export function createMissions({
  THREE, camera, props, radarHeads, tank, helicopter, soldiers, reducedMotion, playCue, notify,
  completeLevel, isLevelComplete, course, driving, jeepDriving, observation, generator,
}) {
  const { security, parts, supplies, delivered, hospitalDrop, station, screen, scan } = props;
  const patrol = objective('security-patrol', 'Security Patrol', 3);
  const repair = objective('repair-tank', 'Repair the Tank', parts.length);
  const supply = objective('supply-delivery', 'Supply Delivery', supplies.length);
  const radar = objective('radar-activation', 'Radar Activation', 1);
  const ride = objective('helicopter-patrol', 'Helicopter Patrol', 1);
  const drivingTest = objective('tank-driving-test', 'Vehicle Driving Test', course.points.length);
  const night = objective('night-observation', 'Night Observation', 1);
  const cctv = objective('cctv-monitoring', 'CCTV Monitoring', observation.cameras.length);
  const power = objective('restore-power', 'Restore Power', 1);
  const missions = [patrol, repair, supply, radar, ride, drivingTest, night, cctv, power];
  const inventory = [];
  const collected = new Set();
  const activated = new Set();
  const removedSupplies = new Set();
  const radarStart = radarHeads.dish.rotation.y;
  let carriedSupply = false;
  let scanTime = 0;
  let arraySpin = 0;
  let engineTime = 0;
  let driveTime = 0;
  let parkingStarted = false;
  let tankBlocked = false;
  let context;

  function finish(mission, message) {
    if (mission.complete) return;
    mission.complete = true;
    if (missions.every(row => row.complete) && !isLevelComplete(areaId)) {
      completeLevel(areaId);
      notify(message + ' Military Base complete!');
    } else notify(message);
  }

  const flight = createHelicopterFlight({
    THREE, camera, model: helicopter, reducedMotion, playCue,
    onLanding() {
      if (ride.complete) {
        notify('Back at the helipad.');
        return;
      }
      ride.current = 1;
      finish(ride, 'Helicopter Patrol Complete!');
    },
  });

  const surveillance = createObservation({ THREE, camera, observation,
    onNight() { context = night; night.current = 1; finish(night, 'Night Observation Complete!'); },
    onCamera(index) { context = cctv; if (!cctv.complete) cctv.current = Math.max(cctv.current, index + 1); },
    onCctvExit() { if (cctv.current === cctv.total) finish(cctv, 'CCTV Monitoring Complete!'); },
  });
  const interactions = [...surveillance.interactions];
  function add(point, mission, label, canAct, act, radius = 1.90, anchorY = (point.y ?? 0) + 1.32) {
    interactions.push({
      x: point.x, z: point.z, radius, anchorY, label,
      reachable: player => ownHeight(point, player),
      get active() { return canAct(); },
      act() {
        if (!canAct()) return;
        context = mission;
        act();
      },
    });
  }

  for (const [i, panel] of security.entries()) {
    add(panel, patrol, 'Activate Security', () => !activated.has(i), () => {
      activated.add(i);
      panel.light(true);
      soldiers.cue(panel.guard, 'salute');
      patrol.current++;
      if (patrol.current === patrol.total) finish(patrol, 'Security Patrol Complete!');
      else notify(panel.name + ' security online.');
    });
  }

  for (const [i, item] of parts.entries()) {
    add(item, repair, 'Pick Up Component', () => !collected.has(i), () => {
      collected.add(i);
      item.prop.scale.setScalar(0);
      inventory.push(item.name);
      notify(item.name + ' collected.');
    }, 1.63, .88);
  }
  const install = { x: repairTank.x - 2.66, z: repairTank.z - .54 };
  add(install, repair, 'Install Component', () => repair.current < repair.total && inventory.some(name => name !== 'Medical Supplies'), () => {
    const index = inventory.findIndex(name => name !== 'Medical Supplies');
    const [name] = inventory.splice(index, 1);
    repair.current++;
    if (repair.current === repair.total) {
      parkingStarted = true;
      playCue(engineCue);
      notify('Tank started. Keep the parking lane clear.');
    } else notify(name + ' installed.');
  }, 1.20);

  for (const [i, item] of supplies.entries()) {
    add(item, supply, 'Pick Up Supplies', () => !carriedSupply && !removedSupplies.has(i), () => {
      removedSupplies.add(i);
      carriedSupply = true;
      item.prop.scale.setScalar(0);
      inventory.push('Medical Supplies');
      notify('Take the medical supplies to the hospital.');
    }, 1.84, .78);
  }
  add(hospitalDrop, supply, 'Deliver Supplies', () => carriedSupply, () => {
    carriedSupply = false;
    inventory.splice(inventory.indexOf('Medical Supplies'), 1);
    delivered[supply.current].scale.setScalar(1);
    supply.current++;
    soldiers.cue('Field medic', 'receive');
    if (supply.current === supply.total) finish(supply, 'Supply Delivery Complete!');
    else notify('Medical supplies received.');
  }, 2.2, .73);

  add(station, radar, 'Activate Radar', () => !radar.complete, () => {
    radar.current = 1;
    station.light(true);
    screen.scale.setScalar(1);
    playCue(confirmation);
    finish(radar, 'Radar Activation Complete!');
  });
  add(generator.panel, power, 'Start Generator', () => !power.complete, () => {
    generator.setPowered(true);
    power.current = 1;
    playCue(engineCue);
    finish(power, 'Restore Power Complete!');
  }, 1.35);
  interactions.push(flight.board);

  function updateRadar(dt) {
    if (!radar.complete) return;
    scanTime += dt;
    arraySpin = (arraySpin + dt * (reducedMotion() ? .19 : .53)) % (Math.PI * 2);
    radarHeads.dish.rotation.y = radarStart + arraySpin;
    scan.position.y = 1.57 + Math.sin(scanTime * 2.15) * .24;
  }

  function updateDrivingTest() {
    const vehicle = driving.active ? driving : jeepDriving.active ? jeepDriving : null;
    course.show(drivingTest.current, Boolean(vehicle) && !drivingTest.complete);
    if (!vehicle || drivingTest.complete) return;
    const point = course.points[drivingTest.current];
    const pos = vehicle.position;
    if (Math.hypot(pos.x - point.x, pos.z - point.z) > course.radius) return;
    context = drivingTest;
    drivingTest.current++;
    course.show(drivingTest.current, true);
    playCue(confirmation);
    if (drivingTest.current === drivingTest.total) finish(drivingTest, 'Vehicle Driving Test Complete!');
    else notify('Checkpoint ' + drivingTest.current + '/' + drivingTest.total + '. Follow the next light beam.');
  }

  function playerInTankLane(player, from, next) {
    if (!player || player.y > 6.4) return false;
    const dx = player.x - repairTank.x;
    const dz = player.z - repairTank.z;
    const cosine = Math.cos(repairTank.yaw);
    const sine = Math.sin(repairTank.yaw);
    const cross = dx * cosine - dz * sine;
    const along = dx * sine + dz * cosine;
    return Math.abs(cross) < 2.18 && along > from - 3.08 && along < next + 4.05;
  }

  function updateTank(dt, position) {
    if (!parkingStarted || repair.complete) return;
    engineTime += dt;
    let distance = tank.parkingDistance * easing(driveTime / parkTime);
    if (engineTime >= .80) {
      const next = Math.min(parkTime, driveTime + dt);
      const requested = tank.parkingDistance * easing(next / parkTime);
      const blocked = playerInTankLane(position, distance, requested);
      if (blocked && !tankBlocked) notify('Step clear of the tank’s parking lane.');
      tankBlocked = blocked;
      if (!blocked) {
        driveTime = next;
        distance = requested;
      }
    }
    tank.pose(distance, engineTime, !reducedMotion());
    if (driveTime === parkTime) finish(repair, 'Repair the Tank Complete!');
  }

  function currentHint() {
    if (surveillance.mode === 'night-vision') return 'Look around through the night vision binoculars. Interact again to exit.';
    if (surveillance.mode === 'cctv') return 'Review all five CCTV views. Interact to switch cameras or exit.';
    if (!flight.board.active) return 'Enjoy the helicopter patrol.';
    if ((driving.active || jeepDriving.active) && !drivingTest.complete) return 'Drive through checkpoint ' + (drivingTest.current + 1) + ' of ' + drivingTest.total + '. Follow the light beam.';
    if (tankBlocked) return 'Move clear of the tank’s marked parking lane.';
    if (carriedSupply) return 'Deliver the medical supplies at the Field Hospital receiving platform.';
    if (missions.every(row => row.complete)) return 'All missions complete. Board the helicopter again for another tour.';
    if (context === repair && !repair.complete) {
      if (inventory.length) return 'Install the carried component on the left of the repair bay tank.';
      if (repair.current === repair.total) return 'Keep the parking lane clear while the tank parks.';
      return 'Find components by the workshop, service sheds, and tank garage.';
    }
    if (!patrol.complete) return 'Activate the panels at South Gate, Motor Pool, and South Lookout.';
    const next = missions.find(row => !row.complete);
    if (next === repair) return 'Find the tank components around the workshop and vehicle yard.';
    if (next === supply) return 'Pick up medical supplies at the Supply Depot loading dock.';
    if (next === radar) return 'Activate the console beside the Radar Control Station.';
    if (next === drivingTest) return 'Board the Scout Tank or Jeep and follow the three checkpoint light beams.';
    if (next === night) return 'Use the night vision binoculars at South Lookout.';
    if (next === cctv) return 'Enter North Post and review the five CCTV views.';
    if (next === power) return 'Enter the dark Generator building and start the generator at the control panel.';
    return 'Board at the helicopter’s right passenger door for a sightseeing flight.';
  }

  return {
    interactions,
    unload() { surveillance.cancel(); flight.cancel(); },
    get viewPosition() { return surveillance.viewPosition; },
    missionStatus: { missions, inventory, get hint() { return currentHint(); } },
    reset() {
      surveillance.cancel();
      flight.reset();
      inventory.length = 0;
      collected.clear();
      activated.clear();
      removedSupplies.clear();
      for (const row of missions) { row.current = 0; row.complete = false; }
      for (const panel of [...security, station]) panel.light(false);
      for (const object of [...parts, ...supplies]) object.prop.scale.setScalar(1);
      for (const object of delivered) object.scale.setScalar(0);
      generator.setPowered(false);
      radarHeads.dish.rotation.y = radarStart;
      course.show(0);
      carriedSupply = parkingStarted = tankBlocked = false;
      scanTime = arraySpin = engineTime = driveTime = 0;
      context = undefined;
      screen.scale.setScalar(0);
      updateRadar(0);
      tank.pose(0);
    },
    update(dt, position) {
      updateTank(dt, position);
      updateRadar(dt);
      updateDrivingTest();
      flight.update(dt);
    },
  };
}
