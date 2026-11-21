import { antennas, radarControl, securityPanels, supplyDepot } from './layout.js';
import { ink } from './scenery.js';

const componentSites = [
  { name: 'Engine Component', x: -45.8, z: 33.9 },
  { name: 'Track Component', x: 41.48, z: 39.84 },
  { name: 'Battery', x: -25.3, z: -27.4 },
];
const antennaPanels = [
  { x: -8.25, z: -41.65, name: 'Radar Dish' },
  { x: 59.9, z: -42.35, name: 'Rotating Array' },
  { x: -58.2, z: -46.65, name: 'West Relay' },
];

function controlPanel(kit, moving, point, security = false) {
  const { x, z, y = 0, name } = point;
  const console = kit.group(name + ' control panel', x, y, z);
  kit.box(console, ink.footing, 0, .09, 0, .60, .18, .52);
  kit.box(console, ink.steel, 0, .58, 0, .19, 1.16, .22);
  kit.box(console, ink.dark, 0, 1.19, .03, .65, .48, .24);
  kit.box(console, 0x58737a, 0, 1.19, .157, .55, .38, .033);
  kit.sign(console, name.toUpperCase(), 0, 1.6, .124, 1.03, .29);
  kit.solid(console, 0, 0, .60, .52, 1.45);
  const off = kit.group('Red indicator', 0, 0, 0, 0, console);
  const on = kit.group('Green indicator', 0, 0, 0, 0, console);
  moving.box(off, 0xd65143, -.16, 1.24, .19, .126, .105, .041);
  moving.box(on, 0x71eaa3, -.16, 1.24, .19, .126, .105, .041);
  for (const cx of [.031, .157]) kit.box(console, ink.paleTeal, cx, 1.20, .196, .061, .10, .038);
  if (security) {
    for (const side of [-1, 1]) {
      kit.beam(console, ink.steel, [0, 1.87, .02], [side * .41, 1.87, .02], .12);
      kit.box(console, ink.dark, side * .39, 1.86, .05, .22, .19, .19);
      moving.box(on, 0xffdf81, side * .39, 1.872, .155, .161, .083, .034);
    }
  }
  return {
    ...point, y,
    light(active) {
      off.scale.setScalar(active ? 0 : 1);
      on.scale.setScalar(active ? 1 : 0);
    },
  };
}

function components(kit, moving) {
  const { box, part } = moving;
  return componentSites.map((site, i) => {
    const platform = kit.group(site.name + ' tray', site.x, 0, site.z);
    kit.box(platform, ink.steel, 0, .20, 0, 1.12, .40, .79);
    kit.box(platform, ink.dark, 0, .41, 0, 1.26, .08, .91);
    kit.solid(platform, 0, 0, 1.2, .9, .45);
    const prop = kit.group(site.name, 0, .45, 0, 0, platform);
    if (i === 0) {
      box(prop, 0x739393, 0, .23, 0, .68, .44, .55);
      for (const x of [-.25, 0, .25]) box(prop, ink.dark, x, .47, -.07, .14, .13, .45);
      part(prop, 'drum', ink.yellow, .37, .28, .08, .14, .13, .14, [0, 0, Math.PI / 2]);
    } else if (i === 1) {
      part(prop, 'track', ink.rubber, 0, .18, 0, .97, .35, .47);
      for (const x of [-.3, -.10, .10, .3]) box(prop, 0x769594, x, .356, 0, .09, .045, .46);
    } else {
      box(prop, 0xd3a54f, 0, .22, .02, .64, .42, .56);
      for (const x of [-.20, .20]) part(prop, 'drum', ink.red, x, .46, .05, .081, .074, .081);
      box(prop, ink.dark, 0, .22, .316, .27, .13, .044);
      box(prop, ink.white, 0, .22, .342, .13, .065, .028);
    }
    return { ...site, prop };
  });
}

function supplyCrate(kit, moving, name, x, y, z) {
  const crate = kit.group(name, x, y, z);
  moving.box(crate, 0xd0a471, 0, .28, 0, .80, .55, .70);
  for (const cx of [-.29, .29]) moving.box(crate, 0x8b9272, cx, .29, 0, .09, .58, .741);
  moving.box(crate, 0xeee9d8, 0, .29, .366, .31, .26, .034);
  moving.box(crate, 0x5c9c73, 0, .29, .39, .065, .17, .026);
  for (const side of [-1, 1]) moving.box(crate, 0x5c9c73, side * .058, .29, .39, .051, .059, .026);
  return crate;
}

export function buildMissionProps(kit, moving) {
  const security = securityPanels.map(site => controlPanel(kit, moving, site, true));
  const antennasControls = antennas.map(({ kind }, i) => ({ kind, ...controlPanel(kit, moving, antennaPanels[i]) }));
  const station = controlPanel(kit, moving, { x: radarControl.x + 1.42, z: radarControl.z + 3.02, name: 'Radar Console' });
  const display = kit.group('Radar station display', radarControl.x - .79, 0, radarControl.z + 2.49);
  kit.box(display, ink.dark, 0, 1.58, 0, 1.57, .87, .13);
  kit.box(display, 0x29494f, 0, 1.58, .08, 1.37, .68, .065);
  const screen = kit.group('Online radar display', 0, 0, 0, 0, display);
  moving.box(screen, 0x236b5d, 0, 1.58, .124, 1.34, .65, .023);
  for (const x of [-.45, -.20, .05, .30, .54]) moving.box(screen, 0x68ae82, x, 1.58, .149, .012, .59, .022);
  for (const y of [1.39, 1.60, 1.79]) moving.box(screen, 0x68ae82, 0, y, .149, 1.25, .013, .022);
  const scan = kit.group('Radar scan line', 0, 0, 0, 0, screen);
  moving.box(scan, 0xb5ffc4, 0, 0, .18, 1.23, .039, .018);

  const parts = components(kit, moving);
  const tankBoard = kit.group('Tank service marker', 49.38, 0, 43.17);
  kit.box(tankBoard, ink.steel, 0, .57, 0, .09, 1.15, .09);
  kit.sign(tankBoard, 'TANK SERVICE', 0, 1.02, .035, 1.55, .36, { style: 'gold' });
  kit.solid(tankBoard, 0, 0, .17, .17, 1.22);
  const supplies = [43.17, 45.05, 46.94].map((x, i) => {
    const z = supplyDepot.z + 8.72;
    return { x, z, prop: supplyCrate(kit, moving, 'Medical pickup ' + (i + 1), x, .475, z) };
  });
  const hospitalDrop = { x: 20.65, z: 5.75 };
  const receiver = kit.group('Hospital receiving platform', hospitalDrop.x, 0, hospitalDrop.z);
  kit.box(receiver, ink.steel, 0, .19, 0, 3.79, .38, 1.00);
  kit.box(receiver, ink.pale, 0, .403, 0, 3.90, .074, 1.14);
  kit.sign(receiver, 'MEDICAL RECEIVING', 0, .25, .58, 2.0, .24, { style: 'medical' });
  kit.solid(receiver, 0, 0, 3.90, 1.14, .44);
  const delivered = [-1.22, 0, 1.22].map((dx, i) =>
    supplyCrate(kit, moving, 'Delivered medical crate ' + (i + 1), hospitalDrop.x + dx, .44, hospitalDrop.z));
  return { security, antennasControls, station, screen, scan, parts, supplies, hospitalDrop, delivered };
}
