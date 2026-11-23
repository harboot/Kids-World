const STEP_HINTS = [
  'Find the car with the cabin light on.',
  'Take the access card from the car.',
  'Use the access card to reach Floor 8.',
  'Search the poolside gazebo.',
  'Return to the elevator and go to Floor 17.',
  'Find Unit 17E.',
  'Explore the kitchen.',
  'Place the lighter in the prop oven.',
  'The countdown has started.',
  'Wait for the scene to settle, then head back to the elevator.',
];

export const STEP = Object.freeze({
  CAR: 0, CARD: 1, FLOOR_8: 2, GAZEBO: 3, FLOOR_17: 4, UNIT: 5, CONTROL: 6, OVEN: 7,
  COUNTDOWN: 8, BURST: 9, COMPLETE: 10,
});

const pickupCue = [
  [76, { duration: 0.14, level: 0.14, wave: 'triangle' }],
  [83, { duration: 0.23, level: 0.11 }, 0.075],
];
export const travelCue = [[50, { endPitch: 60, duration: 0.42, level: 0.13, wave: 'triangle' }]];
const controlCue = [[69, { endPitch: 81, duration: 0.24, level: 0.15, wave: 'triangle' }]];
const boomCue = [
  [43, { endPitch: 24, duration: 0.51, level: 0.28, attack: 0.024, wave: 'triangle' }],
  [67, { endPitch: 36, duration: 0.23, level: 0.13, wave: 'square' }],
  [51, { endPitch: 43, duration: 0.33, level: 0.12 }, 0.1],
];

function note(pitch, endPitch, duration, level, offset = 0) {
  return [pitch, { endPitch, duration, level, wave: 'triangle' }, offset];
}

const activities = [
  ['rescue', 'Return to Floor 8 after the blast', 'Take the elevator back to Floor 8. A rescue helicopter is waiting on the far side of the pool.', [note(57, 72, .38, .15), note(75, 83, .42, .12, .22)]],
  ['lift', 'Call the resident elevator', 'Press the call button beside the resident elevator.', [note(71, 78, .22, .13), note(82, 86, .16, .08, .14)]],
  ['directory', 'Check the parking directory', 'In the basement, look at the directory kiosk behind your starting point.', [note(68, 77, .22, .14), note(76, 81, .18, .11, .17)]],
  ['recycle', 'Recycle a bottle', 'In the basement, look at the green recycling bin by the back wall.', [note(63, 79, .12, .09), note(78, 48, .20, .16, .26)]],
  ['basement-return', 'Ride the elevator back to the basement', 'Use Go to Basement on the elevator panel.', []],
  ['terrace', 'Walk through the pool terrace doors', 'On Floor 8, approach the glass doors and walk through once they slide open.', []],
  ['fountain', 'Turn on the garden fountain', 'Look at the round fountain near the terrace entrance on Floor 8.', [note(70, 84, .19, .13), note(83, 92, .24, .11, .14)]],
  ['gym', 'Enter the resident gym', 'Turn left after leaving the glass doors and walk into the resident gym.', []],
  ['treadmill', 'Start a gym treadmill', 'Inside the gym, look at the leftmost treadmill and start it.', [note(71, 78, .15, .13), note(54, 60, .29, .13, .18)]],
  ['lounger', 'Jump onto a pool lounger', 'Jump over or onto one of the low pool loungers along the deck.', [note(76, 83, .16, .11), note(67, 56, .12, .12, .14)]],
];
const doorOpenCue = [note(55, 70, .25, .078), note(79, 86, .16, .09, .16)];
const doorCloseCue = [note(67, 47, .22, .082), note(53, 48, .10, .13, .20)];
const deniedCue = [note(53, 45, .14, .11)];

const COUNTDOWN_TIME = 5;
export const BURST_TIME = 2.65;

const apartmentMissions = [
  ['basement', 'Basement: Find the access card', [STEP.CARD, STEP.FLOOR_8]],
  ['floor8', 'Floor 8: Collect the lighter', [STEP.GAZEBO, STEP.FLOOR_17]],
  ['floor17', 'Floor 17: Complete the Unit 17E sequence',
    [STEP.UNIT, STEP.CONTROL, STEP.OVEN, STEP.COUNTDOWN, STEP.COMPLETE]],
];
const noItems = Object.freeze([]);
const accessCard = Object.freeze(['Access card']);
const cardAndLighter = Object.freeze(['Access card', 'Lighter']);

export function createApartmentMission(playCue, signal, showNotification = () => {}) {
  let step = STEP.CAR;
  let elapsed = 0;
  const done = new Set();

  function ready(expected) {
    return !signal?.aborted && step === expected;
  }

  function advance(expected) {
    if (!ready(expected)) return false;
    step++;
    elapsed = 0;
    return true;
  }

  function notify(message) {
    if (!signal?.aborted) showNotification(message);
  }

  function pickUp(expected, message) {
    if (!advance(expected)) return;
    notify(message);
    playCue(pickupCue);
  }

  function activity(id) {
    if (signal?.aborted || done.has(id)) return false;
    const task = activities.find(item => item[0] === id);
    if (!task) return false;
    done.add(id);
    if (task[3].length) playCue(task[3]);
    if (step === STEP.COMPLETE && done.size === activities.length) notify('Secret Apartment — Mission Complete');
    return true;
  }

  return {
    ready,
    activity,
    hasActivity: id => done.has(id),
    doorCue: opening => playCue(opening ? doorOpenCue : doorCloseCue),
    denyCue: () => playCue(deniedCue),
    get step() { return step; },
    get cinematic() { return step === STEP.COUNTDOWN || step === STEP.BURST; },
    get damaged() { return step >= STEP.BURST; },
    get burstElapsed() { return elapsed; },
    get announcement() {
      if (step === STEP.COUNTDOWN) return String(Math.max(1, Math.ceil(COUNTDOWN_TIME - elapsed - 1e-8)));
      return step === STEP.BURST && elapsed < 1.15 ? 'BOOM!' : '';
    },
    missionStatus: {
      missions: [...apartmentMissions.map(([id, title, milestones]) => ({
        id, title, total: milestones.length,
        get current() { return milestones.reduce((count, target) => count + Number(step >= target), 0); },
        get complete() { return step >= milestones.at(-1); },
      })), ...activities.map(([id, title]) => ({
        id, title, total: 1,
        get current() { return Number(done.has(id)); },
        get complete() { return done.has(id); },
      }))],
      get hint() {
        if (step === STEP.GAZEBO && !done.has('terrace')) return activities.find(([id]) => id === 'terrace')[2];
        if (step < STEP.COMPLETE) return STEP_HINTS[step];
        return activities.find(([id]) => !done.has(id))?.[2] ?? '';
      },
      get inventory() {
        if (step >= STEP.FLOOR_17 && step < STEP.COUNTDOWN) return cardAndLighter;
        return step >= STEP.FLOOR_8 ? accessCard : noItems;
      },
    },
    accessMessage(destination) {
      if (destination === 'basement') return '';
      if (step < STEP.FLOOR_8) return 'Access Card Required';
      if (destination === 'floor17' && step < STEP.FLOOR_17) return 'Floor 17 Locked';
      return '';
    },
    notify,
    openCar() {
      if (!advance(STEP.CAR)) return false;
      playCue([note(48, 34, .18, .15), note(61, 50, .13, .10, .3)]);
      return true;
    },
    takeCard() { pickUp(STEP.CARD, 'Access card acquired'); },
    visit(destination) {
      if (destination === 'floor8') {
        advance(STEP.FLOOR_8);
        if (step === STEP.COMPLETE && activity('rescue') && done.size < activities.length) {
          notify('The rescue helicopter is waiting on the terrace.');
        }
      }
      if (destination === 'basement') activity('basement-return');
      if (destination === 'floor17') advance(STEP.FLOOR_17);
    },
    takeLighter() { pickUp(STEP.GAZEBO, 'Lighter acquired'); },
    openUnit() {
      if (!advance(STEP.UNIT)) return false;
      playCue([note(45, 66, .19, .14), note(68, 82, .19, .12, .21)]);
      return true;
    },
    activateControl() {
      if (advance(STEP.CONTROL)) playCue(controlCue);
    },
    startCountdown() {
      if (advance(STEP.OVEN)) playCue([note(66, 73, .13, .13), note(76, 68, .19, .13, .23)]);
    },
    update(dt) {
      if (signal?.aborted) return;
      if (step === STEP.COUNTDOWN) {
        elapsed += dt;
        if (elapsed >= COUNTDOWN_TIME - 1e-8) {
          const remainder = Math.max(0, elapsed - COUNTDOWN_TIME);
          advance(STEP.COUNTDOWN);
          elapsed = remainder;
          playCue(boomCue);
        }
      } else if (step === STEP.BURST) {
        elapsed += dt;
        if (elapsed >= BURST_TIME - 1e-8 && advance(STEP.BURST)) {
          notify('Unit 17E sequence complete. Return to Floor 8.');
        }
      }
    },
    reset() {
      step = STEP.CAR;
      elapsed = 0;
      done.clear();
    },
  };
}
