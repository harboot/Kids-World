import { COLORS } from './geometry.js';

export function addAdultCouple(architecture, body) {
  const couple = architecture.group(body, 'Adult couple sharing a kiss');
  const figures = [
    { side: -1, skin: 0xdca47b, hair: 0x533328, shirt: 0xb26d68, neck: .13 },
    { side: 1, skin: 0xb67b57, hair: 0x3e3230, shirt: 0x567d87, neck: -.13 },
  ];
  for (const { side, skin, hair, shirt, neck } of figures) {
    const adult = architecture.group(couple, side < 0 ? 'Adult passenger' : 'Adult driver',
      side * .25, .89, -.49);
    const p = architecture.builder(adult);
    p.part(shirt, -side * .043, .126, .076, .347, .372, .23, { shape: 'oval', roll: side * .34 });
    p.part(skin, -side * .13, .268, .04, .135, .165, .13, { shape: 'oval' });
    const faceX = -side * .139;
    const head = architecture.group(adult, 'Inclined face', faceX, .363, .044, -side * Math.PI / 2);
    const h = architecture.builder(head);
    h.part(skin, 0, 0, 0, .215, .244, .205, { shape: 'oval', roll: neck });
    h.part(hair, 0, .07, -.045, .236, .159, .23, { shape: 'oval' });
    h.part(skin, 0, -.018, .104, .062, .046, .046, { shape: 'oval' });
    h.part(0x975753, 0, -.051, .113, .065, .024, .021, { shape: 'oval' });
    for (const edge of [-1, 1]) h.part(hair, edge * .051, .028, .09, .055, .012, .010);
    h.finish();
    p.finish();
  }
}

export function buildGarageProps(architecture, { b, x: offset }, mission) {
  const x = -2.55;
  const z = 11.65;
  const station = architecture.group(b.root, 'Basement waste and recycling station', x, 0, z);
  const p = architecture.builder(station);
  const lids = [];
  for (const [dx, name, color] of [[0, 'Recycling', 0x4d786b], [1.06, 'Trash', 0x505966], [2.12, 'Paper', 0x987b48]]) {
    p.part(color, dx, .43, 0, .83, .85, .75, { shape: 'tapered' });
    p.part(COLORS.ink, dx, .095, 0, .68, .15, .60);
    b.solid(x + dx, z, .84, .77);
    const lid = architecture.group(station, name + ' bin lid', dx, .865, .35);
    const cap = architecture.builder(lid);
    cap.part(color, 0, .03, -.34, .88, .11, .77);
    cap.part(COLORS.ink, 0, .11, -.60, .25, .063, .087);
    cap.finish();
    lids.push(lid);
    architecture.sign(station, [name.toUpperCase()], dx, .52, -.33, .63, .17, { yaw: Math.PI });
  }
  p.finish();
  const bottle = architecture.group(station, 'Recycled bottle', 0, 1.36, -.55);
  const plastic = architecture.builder(bottle);
  plastic.part(0x91b3ab, 0, 0, 0, .14, .28, .14, { shape: 'tapered' });
  plastic.part(0xdfbd7a, 0, .16, 0, .079, .05, .079, { shape: 'cylinder' });
  plastic.finish();

  const panelX = 3.95;
  const panelZ = 11.58;
  const directory = architecture.group(b.root, 'Parking directory kiosk', panelX, 0, panelZ, Math.PI);
  const kiosk = architecture.builder(directory);
  kiosk.part(0x566066, 0, .75, 0, .73, 1.48, .47);
  kiosk.part(0x252d35, 0, 1.14, .245, .64, .47, .093);
  kiosk.part(0x94a8a1, 0, 1.16, .30, .54, .35, .048, { glow: true });
  kiosk.part(0xd1a757, .164, .84, .30, .112, .094, .032);
  kiosk.finish();
  const map = architecture.sign(directory, ['PARKING', 'B  ·  LIFT  ·  POOL'], 0, 1.17, .33, .52, .31, { background: '#416568' });
  b.solid(panelX, panelZ, .77, .52);

  // Static service carts and stored maintenance crates set back from the driving lanes.
  for (const [px, pz, yaw] of [[-13.60, 10.36, .18], [13.25, -8.68, -.33]]) {
    const cart = architecture.group(b.root, 'Service trolley with supplies', px, 0, pz, yaw);
    const c = architecture.builder(cart);
    c.part(0x576269, 0, .22, 0, 1.12, .12, .79);
    c.part(0xb38d61, -.17, .49, -.03, .66, .48, .61);
    c.part(0x9b7a54, -.18, .825, -.04, .52, .19, .49);
    c.part(0x887e72, .35, .48, .22, .32, .39, .38);
    for (const side of [-1, 1]) {
      c.part(COLORS.steel, side * .46, .66, .36, .056, .82, .06);
      for (const end of [-1, 1]) c.part(COLORS.ink, side * .42, .115, end * .266, .129, .18, .18, { shape: 'oval' });
    }
    c.part(COLORS.steel, 0, 1.07, .36, 1.0, .061, .071);
    c.finish();
    b.solid(px, pz, 1.2, 1.0);
  }
  let age;
  return {
    interactions: [{
      x: x + offset, z: z - .32, label: 'Recycle bottle', anchorY: .90, radius: 1.95, requiresView: true, silent: true,
      get active() { return !mission.hasActivity('recycle'); },
      act() { if (mission.activity('recycle')) age = 0; },
    }, {
      x: panelX + offset, z: panelZ - .20, anchorY: 1.16, radius: 1.85, label: 'Check parking directory',
      requiresView: true, silent: true,
      get active() { return !mission.hasActivity('directory'); },
      act() {
        if (mission.activity('directory')) mission.notify('The resident elevator is at the far end of the parking aisle.');
      },
    }],
    reset() {
      age = 0;
      bottle.visible = false;
      map.visible = false;
      for (const lid of lids) lid.rotation.x = 0;
    },
    update(dt, still) {
      map.visible = mission.hasActivity('directory');
      if (!mission.hasActivity('recycle')) return;
      age = still ? 1 : Math.min(1, age + dt);
      bottle.visible = age < 1;
      bottle.position.y = 1.5 - Math.max(0, age - .45) * 2.55;
      bottle.position.z = -.62 + Math.min(.62, age * 1.30);
      lids[0].rotation.x = Math.sin(Math.PI * age) * .96;
    },
  };
}
