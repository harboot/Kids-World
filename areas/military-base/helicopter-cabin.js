import { paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { ink } from './scenery.js';

const frame = 0x354943;
const lining = 0x536b63;
const trim = 0x9aaa8f;
const rubber = 0x303b39;
const cushion = 0x374e50;
const fabric = 0x547072;
const harness = 0xc18d53;

function windowPane(THREE, moving, parent, material, corners) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  parent.add(new THREE.Mesh(geometry, material));

  for (const [index, a] of corners.entries()) {
    const b = corners[(index + 1) % corners.length];
    moving.beam(parent, frame, a, b, .046);
  }
}

function instrumentTexture(THREE, document) {
  return paintCanvasTexture(THREE, document, 512, 112, ctx => {
    ctx.fillStyle = '#242f31';
    ctx.fillRect(0, 0, 512, 112);

    for (const [i, label] of ['AIR', 'ATT', 'ALT', 'HDG'].entries()) {
      const x = 38 + i * 76;
      ctx.fillStyle = '#101c20';
      ctx.strokeStyle = '#637871';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, 48, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(x, 48);
      if (label === 'ATT') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.clip();
        ctx.rotate(-.13);
        ctx.fillStyle = '#427887';
        ctx.fillRect(-31, -31, 62, 33);
        ctx.fillStyle = '#956a49';
        ctx.fillRect(-31, 2, 62, 30);
        ctx.fillStyle = '#f4d6a6';
        ctx.fillRect(-20, 1, 40, 2);
        ctx.restore();
      }
      ctx.strokeStyle = '#cbddcd';
      for (let tick = 0; tick < 12; tick++) {
        const angle = tick * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 23, Math.sin(angle) * 23);
        ctx.lineTo(Math.cos(angle) * 19, Math.sin(angle) * 19);
        ctx.stroke();
      }
      ctx.strokeStyle = label === 'ATT' ? '#ffcf72' : '#e5b971';
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(label === 'ATT' ? 8 : 3 + i * 2, label === 'ATT' ? 0 : -17);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#dce9dc';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, 93);
    }

    ctx.fillStyle = '#526865';
    ctx.fillRect(317, 17, 166, 73);
    ctx.fillStyle = '#142c2f';
    ctx.fillRect(321, 21, 158, 65);
    ctx.strokeStyle = '#446863';
    ctx.lineWidth = 1;
    for (let x = 335; x < 478; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 28);
      ctx.lineTo(x, 80);
      ctx.stroke();
    }
    ctx.strokeStyle = '#8ed4ad';
    ctx.beginPath();
    ctx.moveTo(326, 68);
    ctx.lineTo(355, 68);
    ctx.lineTo(385, 48);
    ctx.lineTo(413, 52);
    ctx.lineTo(439, 36);
    ctx.lineTo(467, 36);
    ctx.stroke();
    ctx.fillStyle = '#dfc17b';
    ctx.fillRect(411, 47, 5, 8);
    ctx.fillStyle = '#92c7b3';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PATROL', 329, 35);

    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 2 ? '#e7b76c' : '#8eb59f';
      ctx.fillRect(323 + i * 22, 97, 12, 3);
    }
  });
}

function dashboard(kit, moving, aircraft, document) {
  const { THREE, group } = kit;
  const { box, beam, part } = moving;
  const console = group('Flight instrument console', 0, 1.97, 2.035, Math.PI, aircraft);
  console.rotation.x = .28;
  box(console, 0x314340, 0, 0, 0, 1.91, .40, .16);
  box(console, 0x647772, 0, .057, .094, 1.80, .24, .035);
  const texture = instrumentTexture(THREE, document);
  if (texture) {
    const display = new THREE.Mesh(new THREE.PlaneGeometry(1.72, .32),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    display.name = 'Flight gauges and route display';
    display.position.set(0, .007, .1115 + SURFACE_GAP.detail);
    console.add(display);
  } else {
    for (const x of [-.68, -.40, -.11, .18]) {
      part(console, 'drum', ink.dark, x, .022, .128, .093, .04, .093, [Math.PI / 2, 0, 0]);
    }
    box(console, ink.glass, .55, .02, .134, .48, .21, .045);
  }
  box(console, rubber, 0, .211, .005, 1.96, .068, .35);
  box(console, 0x64746a, 0, .191, .185, 1.88, .025, .041);
  box(console, rubber, 0, -.182, .09, 1.82, .063, .122);

  box(aircraft, 0x4b645e, 0, 1.38, 1.86, .28, .47, .69);
  box(aircraft, 0x313f40, 0, 1.64, 1.84, .31, .062, .66);
  for (const z of [1.63, 1.83, 2.02]) {
    part(aircraft, 'drum', z === 1.83 ? ink.yellow : 0xaebfb0, 0, 1.693, z, .042, .047, .042);
  }
  beam(aircraft, rubber, [.16, 1.58, 1.77], [.24, 1.82, 1.66], .045);
  part(aircraft, 'cap', 0xb0bdb2, .24, 1.82, 1.66, .055, .038, .055);
}

function seat(kit, moving, aircraft, side) {
  const { group } = kit;
  const { box, beam } = moving;
  const chair = group(side < 0 ? 'Right passenger seat' : 'Left pilot seat', side * .55, 0, 0, 0, aircraft);
  box(chair, rubber, 0, 1.22, .94, .35, .15, .43);
  box(chair, frame, 0, 1.30, .96, .56, .11, .67);
  box(chair, fabric, 0, 1.415, .97, .51, .125, .58);
  box(chair, cushion, 0, 1.74, .64, .53, .64, .14, [-.14, 0, 0]);
  box(chair, fabric, 0, 1.73, .719, .39, .52, .046, [-.14, 0, 0]);
  box(chair, frame, 0, 2.109, .587, .35, .187, .126, [-.14, 0, 0]);
  box(chair, fabric, 0, 2.12, .658, .28, .124, .037, [-.14, 0, 0]);
  for (const edge of [-1, 1]) {
    box(chair, cushion, edge * .247, 1.44, .97, .079, .124, .51);
    beam(chair, trim, [edge * .205, 1.486, .72], [edge * .205, 1.486, 1.21], .017);
    box(chair, lining, edge * .204, 1.204, .97, .065, .039, .63);
  }
  for (const z of [.84, 1.00, 1.16]) box(chair, cushion, 0, 1.483, z, .31, .014, .017);
  if (side < 0) {
    beam(chair, harness, [-.22, 1.47, 1.06], [.19, 1.47, .89], .035);
    box(chair, trim, -.006, 1.494, .973, .088, .029, .053);
  }
}

function buildPilot(kit, moving, aircraft) {
  const { group } = kit;
  const { part, box, beam } = moving;
  const pilot = group('Seated helicopter pilot', .55, .17, 1.06, 0, aircraft);
  box(pilot, 0x536f61, 0, 1.68, -.05, .38, .54, .27, [.13, 0, 0]);
  box(pilot, 0x69877a, 0, 1.74, .093, .30, .28, .072);
  box(pilot, harness, 0, 1.60, .138, .35, .054, .043);
  box(pilot, trim, 0, 1.602, .169, .076, .064, .024);
  part(pilot, 'drum', 0xc8926d, 0, 1.955, .066, .081, .109, .08);
  part(pilot, 'cap', 0xd0a074, 0, 2.16, .11, .167, .197, .155);
  part(pilot, 'cap', 0x9cad8d, 0, 2.268, .085, .205, .142, .189);
  box(pilot, 0x465956, 0, 2.217, .202, .32, .105, .125);
  box(pilot, 0x65959c, 0, 2.209, .269, .265, .073, .019);
  box(pilot, 0xabc9c2, 0, 2.23, .284, .245, .016, .016);
  box(pilot, 0xd5a57c, 0, 2.137, .266, .054, .048, .052);
  for (const side of [-1, 1]) {
    const ear = side * .159;
    part(pilot, 'drum', rubber, ear, 2.152, .101, .078, .055, .073, [0, 0, Math.PI / 2]);
    part(pilot, 'drum', 0x717f77, ear + side * .031, 2.152, .101, .049, .026, .048, [0, 0, Math.PI / 2]);
    beam(pilot, harness, [side * .134, 1.93, .081], [side * .079, 1.58, .157], .030);
    beam(pilot, 0x54765f, [side * .155, 1.82, -.015], [side * .18, 1.59, .251], .114);
    const palm = [side * .072, 1.73, .435];
    beam(pilot, 0x6f916e, [side * .18, 1.59, .251], palm, .104);
    part(pilot, 'cap', 0xc6956b, ...palm, .062, .06, .07);
    box(pilot, 0x536e59, side * .107, 1.40, .274, .153, .18, .45);
    box(pilot, rubber, side * .107, 1.15, .47, .139, .474, .15);
    box(pilot, rubber, side * .107, .958, .56, .146, .093, .28);
  }
  beam(pilot, rubber, [-.192, 2.144, .131], [-.163, 2.112, .235], .017);
  beam(pilot, rubber, [-.163, 2.112, .235], [-.065, 2.092, .276], .016);
  part(pilot, 'cap', rubber, -.065, 2.092, .276, .033, .019, .022);
}

export function buildCabin(kit, moving, aircraft, document) {
  const { THREE, group } = kit;
  const { part, box, beam } = moving;
  const glass = new THREE.MeshBasicMaterial({
    color: 0xc6e3ed, side: THREE.DoubleSide, transparent: true, opacity: .07, depthWrite: false,
  });
  const windshield = [[-1.05, 2.01, 2.49], [1.05, 2.01, 2.49], [1.04, 3.04, 2.05], [-1.04, 3.04, 2.05]];
  windowPane(THREE, moving, aircraft, glass, windshield);
  beam(aircraft, frame, [0, 2.01, 2.49], [0, 3.04, 2.05], .048);
  part(aircraft, 'cap', 0x658b50, 0, 3.08, 1.08, 1.23, .15, 1.16);
  box(aircraft, lining, 0, 3.008, .93, 1.74, .077, 1.76);
  box(aircraft, frame, 0, 2.982, .79, .52, .095, .64);
  box(aircraft, 0xe4c790, 0, 2.931, .78, .23, .023, .27);
  for (const x of [-.67, .67]) beam(aircraft, trim, [x, 2.963, .28], [x, 2.963, 1.81], .019);
  box(aircraft, 0x4b6057, 0, 1.157, .98, 2.15, .083, 2.26);
  box(aircraft, lining, 0, 1.207, .20, 2.10, .04, .35);
  for (const x of [-.56, .56]) {
    box(aircraft, rubber, x, 1.207, 1.55, .47, .022, .54);
    for (const z of [1.39, 1.51, 1.63, 1.75]) box(aircraft, lining, x, 1.222, z, .37, .011, .022);
  }
  dashboard(kit, moving, aircraft, document);
  buildPilot(kit, moving, aircraft);

  let door;
  for (const side of [-1, 1]) {
    const x = side * .55;
    seat(kit, moving, aircraft, side);
    beam(aircraft, rubber, [x, 1.226, 1.58], [x, 1.88, 1.49], .057, .057, 'drum');
    part(aircraft, 'cap', rubber, x, 1.90, 1.49, .08, .062, .075);
    box(aircraft, ink.yellow, x, 1.932, 1.535, .041, .031, .029);

    const panel = group(side < 0 ? 'Right passenger door' : 'Left cockpit window', side * 1.075, 0, 2.04, 0, aircraft);
    windowPane(THREE, moving, panel, glass, [
      [0, 1.99, .01], [side * .099, 1.99, -1.71], [side * .094, 3.04, -1.71], [0, 3.04, .01],
    ]);
    if (side < 0) door = panel;

    // The lower door lining, pull handle and outer skin move with the window.
    box(panel, 0x73965f, side * .043, 1.584, -.847, .168, .755, 1.716);
    box(panel, lining, -side * .056, 1.596, -.847, .054, .607, 1.59);
    box(panel, trim, -side * .073, 1.939, -.842, .135, .078, 1.697);
    box(panel, frame, -side * .099, 1.561, -.935, .051, .33, .89);
    box(panel, 0x5e786d, -side * .135, 1.581, -.935, .037, .251, .79);
    beam(panel, frame, [-side * .132, 1.842, -1.28], [-side * .132, 1.842, -.94], .054);
    box(panel, trim, -side * .160, 1.84, -.97, .037, .046, .068);
    box(panel, 0xbdc49d, side * .134, 1.836, -1.39, .032, .054, .22);
    box(aircraft, frame, side * 1.08, 1.215, 1.17, .20, .12, 1.77);
  }
  return door;
}
