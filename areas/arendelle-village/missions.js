import { createClockMission } from './clock-mission.js';
import { createFishing } from './fishing.js';
import { createReindeer } from './reindeer.js';

const completionCue = [[67, { duration: 0.25, level: 0.13 }, 0.36],
  [72, { duration: 0.25, level: 0.12 }, 0.49], [76, { duration: 0.37, level: 0.12 }, 0.62],
  [84, { duration: 0.62, level: 0.13 }, 0.78]];

export function createVillageMissions(context, { id, isLevelComplete, completeLevel }) {
  let finished = false;
  let recorded = isLevelComplete(id);
  const services = { ...context, onComplete };
  const clock = createClockMission(services);
  const fishing = createFishing(services);
  const reindeer = createReindeer(services);
  const activities = [fishing, reindeer, clock];
  const missions = activities.map(activity => activity.mission);

  function onComplete(message) {
    if (finished || !missions.every(mission => mission.complete)) {
      context.notify(message);
      return;
    }
    finished = true;
    if (!recorded && !isLevelComplete(id)) completeLevel(id);
    recorded = true;
    context.playCue(completionCue);
    context.notify(`${message} Arendelle Village complete!`);
  }

  return {
    interactions: activities.flatMap(activity => activity.interactions),
    blocksGround: clock.blocksGround,
    missionStatus: {
      missions,
      get hint() { return fishing.hint || clock.hint || reindeer.hint; },
    },
    reset() {
      finished = false;
      for (const activity of activities) activity.reset();
    },
    update(dt, player, elapsed, still) {
      for (const activity of activities) activity.update(dt, player, elapsed, still);
    },
  };
}
