import { clamp, mix, route } from './landform.js';

export const CAR_SPACING = 2.57;
export const WHEELBASE = 1.34;
const buffer = 1.36;
const turnoutClearance = 2.45;

function sample(path, distance, result) {
  let low = 0, high = path.segments.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (path.segments[middle].distance <= distance) low = middle;
    else high = middle - 1;
  }
  const { x, z, y, endY, dx, dz, length, distance: start } = path.segments[low];
  const t = clamp((distance - start) / length);
  result.x = x + dx * t;
  result.y = mix(y, endY, t);
  result.z = z + dz * t;
  return result;
}

export function createRailRoute(layout) {
  const { main, branches } = layout;
  const junctionIndices = branches.map(branch => main.points.findIndex(point =>
    point[0] === branch.points[0][0] && point[1] === branch.points[0][1]));
  const first = main.points.findIndex(([, z]) => z < -23);
  const last = main.points.findLastIndex(([, z]) => z < -23);
  const cuts = [first, ...junctionIndices, last];
  const through = cuts.slice(1).map((end, i) => route(main.points.slice(cuts[i], end + 1)));
  const switches = branches.map((spur, i) => ({ index: i, spur, point: spur.points[0], selected: false }));
  const start = 2 * CAR_SPACING + buffer;
  const initial = start + 1.25;
  let tape, head;

  function reset() {
    tape = [{ path: through[0], start: 0, index: 0, spur: false }];
    head = initial;
    for (const lever of switches) lever.selected = false;
  }
  reset();

  function positionAt(distance, result = {}) {
    const leg = tape.findLast(entry => distance >= entry.start) ?? tape[0];
    const local = distance - leg.start;
    const lever = leg.spur ? undefined : switches[leg.index];
    if (local > leg.path.length && lever) {
      return sample(lever.selected ? lever.spur : through[leg.index + 1], local - leg.path.length, result);
    }
    return sample(leg.path, local, result);
  }

  function junctionDistance(index) {
    let result = 0;
    for (let i = 0; i <= index; i++) result += through[i].length;
    return result;
  }

  function occupied(index) {
    const point = junctionDistance(index);
    // A switch beyond a selected spur cannot be occupied by that consist.
    if (tape.at(-1).spur && tape.at(-1).index < index) return false;
    return head + turnoutClearance >= point && head - 2 * CAR_SPACING - turnoutClearance <= point;
  }

  function toggle(index) {
    const lever = switches[index];
    if (occupied(index)) return false;
    lever.selected = !lever.selected;
    return true;
  }

  function move(delta) {
    const previous = head;
    if (delta > 0) {
      const target = head + delta;
      while (true) {
        const leg = tape.at(-1);
        const end = leg.start + leg.path.length;
        const lever = leg.spur ? undefined : switches[leg.index];
        if (!lever) {
          head = Math.min(target, end - buffer);
          break;
        }
        if (target < end) {
          head = target;
          break;
        }
        tape.push(lever.selected
          ? { path: lever.spur, start: end, index: leg.index, spur: true }
          : { path: through[leg.index + 1], start: end, index: leg.index + 1, spur: false });
      }
    } else {
      head = Math.max(start, head + delta);
      // Keep the actual approach under the wagons until the front axle has cleared the points.
      while (tape.length > 1 && head + WHEELBASE / 2 < tape.at(-1).start) tape.pop();
    }
    return head - previous;
  }

  return { switches, positionAt, junctionDistance, toggle, occupied, move, reset, get head() { return head; } };
}
