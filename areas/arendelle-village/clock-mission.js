import { insideClearance } from '../../core/interaction-clearance.js';
import { SURFACE_GAP } from '../../core/geometry.js';

const gearSites = [
  { name: 'Market clock gear', x: 11.0, z: 5.08 },
  { name: 'Bridge clock gear', x: -11.55, z: 18.0 },
  { name: 'Harbor clock gear', x: 21.12, z: -10.65 },
];
const gearHeight = 1.19;
const pickup = [[78, { duration: 0.18, level: 0.10 }], [90, { duration: 0.26, level: 0.09 }, 0.08]];
const bell = [[55, { duration: 0.92, level: 0.16, wave: 'triangle' }],
  [74, { duration: 0.54, level: 0.10 }, 0.035],
  [55, { duration: 0.96, level: 0.15, wave: 'triangle' }, 0.68],
  [79, { duration: 0.64, level: 0.09 }, 0.75]];

export function createClockMission({ kit, terrain, clock, mark, isActive, notify, playCue, onComplete }) {
  const { group, part, box, solid } = kit;
  const { hands, repairSite } = clock;
  const gears = gearSites.map(site => {
    const stand = group(site.name + ' stand', site.x, terrain.getGroundHeight(site.x, site.z), site.z);
    box(stand, 0x8c684d, 0, 0.42, 0, 0.51, 0.84, 0.48);
    box(stand, 0xad8260, 0, 0.87, 0, 0.59, 0.07, 0.53);
    solid(stand, 0.59, 0.53, 0.91);
    const model = group(site.name, 0, gearHeight, 0, 0, stand);
    buildGear(kit, model);
    const outline = mark(site.name, { ...site, width: 1.18, depth: 1.12 }, stand.position.y);
    return { site, stand, model, outline, collected: false };
  });

  const clearance = { ...repairSite, z: repairSite.z + 0.34, width: 1.67, depth: 1.62 };
  const repairOutline = mark('Repair Clock Tower', clearance);
  const panel = group('Clock repair mechanism', repairSite.x, 0, clock.facade + 0.09);
  box(panel, 0x694d40, 0, 1.22, 0, 0.64, 0.76, 0.2);
  box(panel, 0x416761, 0, 1.22, 0.11, 0.53, 0.65, 0.065);
  for (const x of [-0.17, 0.17]) {
    for (const y of [0.99, 1.45]) {
      part(panel, 'gem', 0xd8a85f, x, y, 0.155, 0.035, 0.035, 0.035);
    }
  }
  const lever = group('Clock repair lever', 0, 1.11, 0.16, 0, panel);
  box(lever, 0xbd9356, 0, 0.14, 0, 0.075, 0.31, 0.09, { batch: lever });
  part(lever, 'rock', 0x98433e, 0, 0.32, 0.018, 0.09, 0.085, 0.079, { batch: lever });
  const success = group('Clock repair sparks', repairSite.x, 1.7, repairSite.z - 0.16);
  for (const [x, y] of [[-0.34, 0.01], [0.31, 0.1], [0.015, 0.26], [-0.24, 0.31]]) {
    part(success, 'gem', 0xf2c568, x, y, 0, 0.057, 0.11, 0.048, { batch: success });
  }

  let count = 0;
  let repaired = false;
  let runningTime = 0;
  const interactions = gears.map(gear => ({
    ...gear.site, anchorY: gear.stand.position.y + gearHeight + 0.35, radius: 1.55, label: 'Collect Clock Gear', silent: true,
    get active() { return isActive() && !gear.collected; },
    act() {
      if (!this.active) return;
      gear.collected = true;
      gear.model.visible = gear.outline.visible = false;
      count++;
      playCue(pickup);
      notify(count === gears.length ? 'All three gears found!' : `Clock gear found. ${gears.length - count} to go!`);
    },
  }));
  interactions.push({
    ...repairSite, anchorY: 1.35, radius: 2.02, label: 'Repair Clock Tower', requiresView: true, silent: true,
    reachable: player => player.y < 3.3 && player.z > panel.position.z && !insideClearance(clearance, player.x, player.z),
    get active() { return isActive() && !repaired && count === gears.length; },
    act() {
      if (!this.active) return;
      repaired = true;
      repairOutline.visible = false;
      lever.rotation.z = -0.72;
      playCue(bell);
      notify('The clock is running and the village bell is ringing!');
      onComplete();
    },
  });

  function pose(elapsed, still) {
    gears.forEach(({ model }, i) => {
      const sway = still ? 0 : elapsed + i * 1.5;
      model.position.y = gearHeight + (still ? 0 : Math.sin(sway * 2.15) * 0.04);
      model.rotation.y = sway * 0.88;
    });
    const shownTime = still ? Math.floor(runningTime / 2) * 2 : runningTime;
    for (const { hourHand, minuteHand } of hands) {
      minuteHand.rotation.z = -shownTime * 0.25;
      hourHand.rotation.z = minuteHand.rotation.z / 12;
    }
    success.visible = repaired && runningTime < 1.2;
    success.position.y = 1.7 + (still ? 0 : Math.min(runningTime, 1.2) * 0.76);
    success.scale.setScalar(still ? 1 : Math.max(0.05, 1 - runningTime * 0.65));
  }

  return {
    interactions,
    blocksGround(x, z, feet) {
      return !repaired && feet < 3.2 && insideClearance(clearance, x, z);
    },
    get complete() { return repaired; },
    get progress() { return `Repair the clock · ${count}/${gears.length} gears${repaired ? ' ✓' : ''}`; },
    get hint() { return count === gears.length && !repaired ? 'Return to the Clock Tower with the gears.' : ''; },
    reset() {
      count = runningTime = 0;
      repaired = false;
      repairOutline.visible = true;
      for (const gear of gears) {
        gear.collected = false;
        gear.model.visible = gear.outline.visible = true;
      }
      lever.rotation.z = 0.42;
      pose(0, true);
    },
    update(dt, player, elapsed, still) {
      if (repaired) runningTime += dt;
      pose(elapsed, still);
    },
  };
}

function buildGear({ part, box }, model) {
  const batch = { batch: model };
  part(model, 'ring', 0xdba74e, 0, 0, 0, 0.205, 0.205, 0.53, batch);
  part(model, 'ring', 0xf3c46f, 0, 0, SURFACE_GAP.trim, 0.173, 0.173, 0.28, batch);
  for (let tooth = 0; tooth < 9; tooth++) {
    const angle = tooth * Math.PI * 2 / 9;
    const x = Math.sin(angle) * 0.215;
    const y = Math.cos(angle) * 0.215;
    box(model, 0xd59b48, x, y, 0, 0.082, 0.08, 0.078, { batch: model, rotation: [0, 0, -angle] });
  }
}
