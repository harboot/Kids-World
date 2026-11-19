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
  const missions = [createFishing(services), createReindeer(services), clock];

  function onComplete() {
    if (finished || !missions.every(mission => mission.complete)) return;
    finished = true;
    if (!recorded && !isLevelComplete(id)) completeLevel(id);
    recorded = true;
    context.playCue(completionCue);
  }

  return {
    interactions: missions.flatMap(mission => mission.interactions),
    blocksGround: clock.blocksGround,
    get progress() {
      const lines = missions.map(mission => mission.progress);
      for (const mission of missions) {
        if (mission.hint) lines.push(mission.hint);
      }
      if (finished) lines.push('Arendelle Village Complete!');
      return lines;
    },
    reset() {
      finished = false;
      for (const mission of missions) mission.reset();
    },
    update(dt, player, elapsed, still) {
      for (const mission of missions) mission.update(dt, player, elapsed, still);
    },
  };
}
