import { overlaps } from '../../core/movement.js';
import { COLORS } from './geometry.js';

export function automaticGlassDoors(THREE, architecture, root, { name, x, z, width, reducedMotion, onMove, onCross }) {
  const half = width / 2;
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9cc3cb, metalness: .2, roughness: .16, transparent: true, opacity: .31, depthWrite: false,
  });
  const frame = architecture.group(root, name, x, 0, z);
  const b = architecture.builder(frame);
  for (const side of [-1, 1]) b.part(COLORS.ink, side * (half + .035), 1.27, 0, .12, 2.54, .24);
  b.part(COLORS.ink, 0, 2.56, 0, width + .16, .11, .27);
  b.part(COLORS.steel, 0, .012, 0, width, .024, .24);
  b.finish();

  const leaves = [-1, 1].map(side => {
    const panel = architecture.group(frame, name + ' panel', 0, 0, .145);
    architecture.box(panel, glass, 0, 1.29, 0, half - .13, 2.39, .025);
    const p = architecture.builder(panel);
    for (const edge of [-1, 1]) {
      p.part(COLORS.ink, edge * (half / 2 - .043), 1.29, 0, .078, 2.49, .093);
      p.part(COLORS.ink, 0, edge < 0 ? .075 : 2.51, 0, half - .08, .083, .093);
      p.part(COLORS.ivory, 0, 1.47, edge * .017, half - .16, .027, .006);
    }
    p.finish();
    return { side, panel };
  });

  let target = false;
  let opening = 0;
  let lastSide = 0;
  function pose() {
    for (const { side, panel } of leaves) panel.position.x = side * (half / 2 + opening * half);
  }

  return {
    blocks(px, pz) {
      if (Math.abs(px - x) > half + .34) return false;
      return leaves.some(({ panel }) => {
        const center = x + panel.position.x;
        return overlaps({ left: center - half / 2, right: center + half / 2, front: z - .026, back: z + .24 }, px, pz);
      });
    },
    reset() {
      opening = 0;
      lastSide = 0;
      target = false;
      pose();
    },
    update(dt, px, pz) {
      const distance = pz - z;
      const inLane = Math.abs(px - x) < half + .43;
      const next = inLane && Math.abs(distance) < (target ? 3.24 : 2.65);
      if (target !== next) {
        target = next;
        onMove(next);
      }
      const progress = reducedMotion() ? 1 : dt / .61;
      opening = target ? Math.min(1, opening + progress) : Math.max(0, opening - progress);
      pose();
      if (inLane && Math.abs(distance) < 2.55) {
        if (lastSide && distance * lastSide < 0 && opening > .35) onCross();
        if (distance) lastSide = Math.sign(distance);
      } else lastSide = 0;
    },
  };
}
