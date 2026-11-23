import { paintCanvasTexture } from '../../core/geometry.js';
import { colors, rug } from './interior.js';
import { FRONT, SIDE, UPSTAIRS } from './layout.js';

export function decorativeDoor(builder, name, x, floor, tint, parent, width = 1.38) {
  const { group, part } = builder;
  const door = group(name, x, floor, FRONT - .173, parent);
  part(door, colors.walnut, 0, 1.25, 0, width + .21, 2.50, .12);
  part(door, tint, 0, 1.18, -.065, width, 2.33, .085);
  for (const y of [.61, 1.62]) {
    part(door, colors.oak, 0, y, -.114, width - .24, .67, .026);
    part(door, tint, 0, y, -.133, width - .35, .55, .019);
  }
  part(door, colors.gold, width * .365, 1.04, -.143, .13, .12, .10, 'ball');
  return door;
}

export function furnishUpperHall(THREE, scene, builder) {
  const { group, part, solid } = builder;
  for (const [name, x, tint] of [
    ['Parents’ room', -7.05, 0x93664d],
    ['Study', -4.47, 0x72877d],
    ['Toilet', -1.85, 0x768ba0],
  ]) {
    const door = decorativeDoor(builder, name + ' decorative door', x, UPSTAIRS, tint, scene);
    const map = paintCanvasTexture(THREE, globalThis.document, 256, 64, (ctx, width, height) => {
      ctx.fillStyle = '#754e38';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff0cf';
      ctx.font = '700 28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, width / 2, height / 2, width - 20);
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.98, .245),
      new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : 0x754e38 }));
    plaque.name = name + ' plaque';
    plaque.rotation.y = Math.PI;
    plaque.position.set(0, 2.10, -.116);
    door.add(plaque);
  }

  rug(builder, -4.47, 3.59, 5.85, 1.75, colors.teal, 0xaec4b7, UPSTAIRS);
  rug(builder, 5.6, 1.19, 2.7, 1.84, colors.plum, 0xd8becb, UPSTAIRS);
  const console = group('Upstairs linen console', -2.25, UPSTAIRS, -.19, scene);
  part(console, colors.walnut, 0, .44, 0, 1.50, .82, .53);
  part(console, colors.oak, 0, .87, 0, 1.59, .11, .59);
  for (const x of [-.37, .37]) {
    part(console, colors.oak, x, .54, .276, .69, .44, .045);
    part(console, colors.gold, x, .60, .307, .17, .048, .037);
  }
  part(console, colors.teal, -.42, 1.051, .045, .31, .26, .31, 'taper');
  for (const [x, z, roll] of [[-.56, -.017, -.36], [-.38, .072, .26], [-.3, -.016, .41]]) {
    part(console, colors.leaf, x, 1.29, z, .18, .33, .16, 'facet').rotation.z = roll;
  }
  for (const [i, tint] of [colors.cream, colors.rose, colors.mint].entries()) {
    part(console, tint, .37, .95 + i * .063, -.04, .47, .063, .32).rotation.y = (i - 1) * .15;
  }
  solid(-2.25, -.19, 1.59, .59, UPSTAIRS + 1.50, UPSTAIRS);

  const bench = group('Upstairs reading bench', SIDE - .65, UPSTAIRS, 1.03, scene);
  part(bench, colors.oak, 0, .405, 0, .63, .13, 1.85);
  part(bench, colors.plum, 0, .52, 0, .60, .14, 1.76, 'ball');
  part(bench, colors.walnut, .265, .75, 0, .11, .72, 1.87);
  for (const x of [-.22, .22]) {
    for (const z of [-.78, .78]) part(bench, colors.walnut, x, .193, z, .095, .39, .095);
  }
  part(bench, colors.rose, .135, .658, -.55, .34, .32, .34, 'ball');
  solid(SIDE - .65, 1.03, .69, 1.87, UPSTAIRS + 1.12, UPSTAIRS);

  const basket = group('Upstairs wicker basket', -8.0, UPSTAIRS, 2.53);
  part(basket, 0xa88059, 0, .229, 0, .52, .46, .52, 'taper');
  for (const y of [.15, .25, .36]) {
    part(basket, 0xc39b70, 0, y, 0, .49 + y * .17, .028, .49 + y * .17, 'round');
  }
  part(basket, colors.cream, .08, .446, -.03, .32, .13, .31, 'ball');
  solid(-8.0, 2.53, .58, .56, UPSTAIRS + .65, UPSTAIRS);
}
