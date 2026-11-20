import { addGroup } from '../../core/geometry.js';

const crunch = [[68, { endPitch: 52, duration: .085, level: .12, attack: .004, wave: 'triangle' }],
  [75, { endPitch: 60, duration: .060, level: .075, attack: .004, wave: 'triangle' }, .072]];
const sip = [[60, { endPitch: 75, duration: .17, level: .095, attack: .018, wave: 'sine' }],
  [74, { endPitch: 59, duration: .105, level: .075, wave: 'sine' }, .145]];
const tastes = {
  popcorn: { name: 'Popcorn', at: [.95, 2.02], cue: crunch },
  cotton: { name: 'Cotton candy', at: [.80, 1.93], cue: crunch },
  hotDog: { name: 'Hot dog', at: [.88, 2.02], cue: crunch },
  drink: { name: 'Cold drink', at: [.87, 1.92], cue: sip },
};
const duration = 2.96;

export function createTasting({ THREE, viewmodel, camera, parts, snacks, playCue }) {
  const poses = {};
  let active, elapsed = 0, tasted = 0;

  if (viewmodel) {
    const { part, matte } = parts;
    const skin = matte(0xd99d76);
    const cuff = matte(0xffedd2);
    const sleeve = matte(0x6577a2);
    const root = addGroup(THREE, viewmodel, 'Gallery snack tasting');

    function hand(parent, side, x, y, z) {
      const hand = addGroup(THREE, parent, 'Player hand', x, y, z);
      part(hand, 'sphere', sleeve, side * .16, -.29, .08, .09, .24, .09).rotation.z = side * .43;
      part(hand, 'drum', cuff, side * .07, -.13, .029, .075, .073, .076).rotation.z = side * .42;
      part(hand, 'sphere', skin, side * .039, -.048, .018, .069, .092, .061).rotation.z = side * .36;
      part(hand, 'sphere', skin, -side * .021, -.014, .031, .041, .060, .034).rotation.z = side * .39;
      return hand;
    }

    for (const [kind, { name }] of Object.entries(tastes)) {
      const model = addGroup(THREE, root, 'Tasting ' + name);
      model.visible = false;
      const held = addGroup(THREE, model, 'Held food');
      hand(held, kind === 'popcorn' ? -1 : 1, kind === 'popcorn' ? -.047 : .055, -.087, .017);
      const food = addGroup(THREE, held, name, 0, .016, 0);
      food.scale.setScalar(kind === 'hotDog' ? .56 : .60);
      if (kind === 'hotDog') food.rotation.y = Math.PI / 2.3;
      const contents = snacks[kind](food);
      const picker = kind === 'popcorn' ? hand(model, 1, 0, 0, 0) : null;
      let handful;
      if (picker) {
        handful = addGroup(THREE, picker, 'Popcorn in hand', 0, .025, -.034);
        handful.scale.setScalar(.55);
        snacks.kernels(handful, 0, 0, 0, 3, .045);
      }
      poses[kind] = { model, held, contents, picker, handful };
    }
  }

  function reset() {
    if (active) poses[active].model.visible = false;
    active = undefined;
    elapsed = tasted = 0;
  }

  function pose(still) {
    const { held, contents, picker, handful } = poses[active];
    const { lerp, smoothstep } = THREE.MathUtils;
    const width = Math.min(camera?.aspect ?? 1, 1);
    const { at } = tastes[active];
    const close = still ? 0 : Math.max(...at.map(time => smoothstep(elapsed, time - .41, time - .085) *
      (1 - smoothstep(elapsed, time + .04, time + .37))));
    const show = still ? 1 : smoothstep(elapsed, 0, .28) * (1 - smoothstep(elapsed, duration - .39, duration));

    if (picker) {
      held.position.set(-.19 * width, -.208 - (1 - show) * .17, -.70);
      held.rotation.set(.08, .12, -.14);
      picker.visible = !still;
      picker.position.set(lerp(-.145 * width, .052 * width, close), lerp(-.10, -.078, close) - (1 - show) * .29,
        lerp(-.67, -.35, close));
      picker.rotation.z = lerp(.61, -.27, close);
      handful.visible = close > .16 && at.some(time => elapsed < time && elapsed > time - .41);
    } else {
      const straw = active === 'drink';
      held.position.set(lerp(.20 * width, .015 * width, close),
        lerp(-.218, straw ? -.26 : -.108, close) - (1 - show) * .21, lerp(-.71, straw ? -.46 : -.36, close));
      held.rotation.set(.06 - close * (straw ? .07 : .21), 0, .125 - close * .17);
    }
    if (contents) {
      const amount = still ? 1 : 1 - tasted * (active === 'cotton' ? .28 : .21);
      contents.scale.set(active === 'hotDog' ? 1 : amount, active === 'popcorn' ? .7 + amount * .3 : amount, amount);
      if (active === 'popcorn') contents.position.y = .197 - (1 - amount) * .15;
    }
  }

  return {
    get ready() { return Boolean(viewmodel) && !active; },
    taste(kind, still) {
      if (!this.ready) return;
      active = kind;
      poses[active].model.visible = true;
      pose(still);
      if (still) playCue(tastes[active].cue);
    },
    update(dt, still) {
      if (!active) return;
      elapsed += dt;
      if (elapsed >= (still ? 1.24 : duration)) {
        reset();
        return;
      }
      const { at, cue } = tastes[active];
      while (!still && tasted < at.length && elapsed >= at[tasted]) {
        tasted++;
        playCue(cue);
      }
      pose(still);
    },
    reset,
  };
}
