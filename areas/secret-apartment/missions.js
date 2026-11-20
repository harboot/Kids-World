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
  '',
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

  return {
    ready,
    get step() { return step; },
    get cinematic() { return step === STEP.COUNTDOWN || step === STEP.BURST; },
    get damaged() { return step >= STEP.BURST; },
    get burstElapsed() { return elapsed; },
    get announcement() {
      if (step === STEP.COUNTDOWN) return String(Math.max(1, Math.ceil(COUNTDOWN_TIME - elapsed - 1e-8)));
      return step === STEP.BURST && elapsed < 1.15 ? 'BOOM!' : '';
    },
    missionStatus: {
      missions: apartmentMissions.map(([id, title, milestones]) => ({
        id, title, total: milestones.length,
        get current() { return milestones.reduce((count, target) => count + Number(step >= target), 0); },
        get complete() { return step >= milestones.at(-1); },
      })),
      get hint() { return STEP_HINTS[step] ?? ''; },
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
    openCar() { return advance(STEP.CAR); },
    takeCard() { pickUp(STEP.CARD, 'Access card acquired'); },
    visit(destination) {
      if (destination === 'floor8') advance(STEP.FLOOR_8);
      if (destination === 'floor17') advance(STEP.FLOOR_17);
    },
    takeLighter() { pickUp(STEP.GAZEBO, 'Lighter acquired'); },
    openUnit() { return advance(STEP.UNIT); },
    activateControl() {
      if (advance(STEP.CONTROL)) playCue(controlCue);
    },
    startCountdown() {
      if (advance(STEP.OVEN)) playCue(controlCue);
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
        if (elapsed >= BURST_TIME - 1e-8 && advance(STEP.BURST)) notify('Secret Apartment — Mission Complete');
      }
    },
    reset() {
      step = STEP.CAR;
      elapsed = 0;
    },
  };
}
