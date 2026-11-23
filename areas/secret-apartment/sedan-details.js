import { COLORS } from './geometry.js';

export function addSedanInterior(architecture, body, warm) {
  const root = architecture.group(body, warm ? 'Warm leather cabin and dashboard' : 'Cloth seats and dashboard');
  const p = architecture.builder(root);
  const upholstery = warm ? 0x967051 : 0x617175;
  const piping = warm ? 0xbe9470 : 0x8f9b9a;
  const dash = warm ? 0x514035 : 0x333d43;
  p.part(dash, 0, .964, -1.06, 1.50, .21, .38);
  p.part(piping, 0, .999, -.856, 1.38, .036, .031);
  p.part(0x25292c, 0, .951, -.823, .34, .147, .044);
  p.part(warm ? 0x92a38a : 0x98aeb1, 0, .983, -.799, .24, .050, .024, { glow: true });
  for (const x of [-.091, 0, .091]) p.part(COLORS.steel, x, .917, -.797, .041, .029, .018, { shape: 'oval' });
  p.part(dash, 0, .84, -.33, .27, .19, .67);
  p.part(COLORS.steel, 0, .971, -.42, .044, .166, .045, { pitch: -.19 });
  p.part(0x242a2d, 0, 1.052, -.44, .093, .063, .084, { shape: 'oval' });
  p.part(upholstery, 0, .939, .655, 1.48, .18, .47);
  p.part(upholstery, 0, 1.085, .824, 1.46, .36, .165, { pitch: -.13 });
  for (const side of [-1, 1]) {
    const x = side * .474;
    p.part(upholstery, x, .866, -.375, .485, .17, .59);
    p.part(piping, x, .951, -.506, .371, .023, .28);
    p.part(upholstery, x, 1.03, -.039, .465, .365, .154, { pitch: -.17 });
    p.part(piping, x, 1.073, -.123, .365, .213, .038, { pitch: -.17 });
    for (const dx of [-.079, .079]) p.part(COLORS.steel, x + dx, 1.212, -.007, .028, .114, .032);
    p.part(upholstery, x, 1.265, -.013, .263, .148, .139, { shape: 'oval' });
    p.part(0xa44936, side * .233, .958, -.10, .077, .088, .065);
  }
  const wheelX = warm ? -.468 : .468;
  p.part(dash, wheelX, 1.043, -.890, .082, .086, .255, { pitch: -.38 });
  p.part(dash, wheelX, 1.085, -.747, .14, .10, .085, { shape: 'oval' });
  for (let i = 0; i < 14; i++) {
    const angle = i * Math.PI * 2 / 14;
    p.part(dash, wheelX + Math.sin(angle) * .150, 1.085 + Math.cos(angle) * .144,
      -.72 - Math.cos(angle) * .036, .060, .053, .052, { shape: 'oval' });
  }
  p.part(dash, wheelX, 1.069, -.724, .256, .044, .048);
  p.part(COLORS.steel, 0, 1.31, -.71, .224, .088, .032);
  if (warm) p.part(0xffdfa1, 0, 1.323, .19, .38, .037, .23, { glow: true });
  p.finish();
}

export function addSedanTrim(architecture, body, occupied) {
  const root = architecture.group(body, occupied ? 'Fastback body trim and wheels' : 'Touring sedan body trim and wheels');
  const p = architecture.builder(root);
  const chrome = occupied ? 0xc0c9c9 : 0xd3bfa3;
  for (const side of [-1, 1]) {
    const driverSide = !occupied && side < 0;
    p.part(chrome, side * .938, driverSide ? .364 : .506, .01, .040, .039, 1.64);
    p.part(chrome, side * .899, .815, driverSide ? .59 : .33, .030, .027, driverSide ? .61 : 1.24);
    p.part(0x343b42, side * .872, .829, -1.79, .067, .045, .19);
    p.part(0xb87135, side * .866, .833, -1.79, .019, .031, .153);
    for (const end of [-1, 1]) {
      for (let i = 0; i <= 8; i++) {
        const a = i * Math.PI / 8;
        p.part(chrome, side * .960, .346 + Math.sin(a) * .375,
          end * 1.39 + Math.cos(a) * .387, .035, .055, .124, { pitch: Math.PI / 2 - a });
      }
      for (let i = 0; i < 5; i++) {
        const a = i * 2 * Math.PI / 5;
        p.part(0x6e7678, side * 1.025, .347 + Math.cos(a) * .137,
          end * 1.39 + Math.sin(a) * .137, .025, .125, .036, { pitch: a });
      }
    }
    // Clear lenses, an amber marker, and a separate red lamp accent.
    p.part(0xd9e5e6, side * .665, .754, -2.291, .30, .071, .018);
    p.part(0xb88855, side * .823, .739, -2.290, .078, .082, .019);
    p.part(0xf09c6e, side * .714, .75, 2.287, .233, .047, .023);
  }
  p.part(chrome, 0, .548, -2.299, 1.54, .039, .024);
  p.part(chrome, 0, .547, 2.299, 1.52, .043, .022);
  p.part(0x474e55, -.57, .399, 2.289, .205, .081, .085, { shape: 'oval' });
  p.part(chrome, 0, .820, -2.188, .094, .032, .115, { shape: 'oval' });
  p.finish();
}
