import { addGroup } from '../../core/geometry.js';
import { addRoundSolid, spaceTransform } from './parts.js';
import { buildPrincessFace } from './princess-face.js';

export function buildCinderellaCharacter(THREE, ballroom, parts, exhibit, obstacles, landingHeight) {
  const { part, matte, batch } = parts;
  // The open floor inside the left stair curve keeps the gown visible from the entrance.
  const x = -1.84;
  const z = -1.65;
  const restYaw = .27;
  const restPitch = .055;
  const restHeadTurn = -.12;
  const figure = addGroup(THREE, ballroom, 'Cinderella character', x, 0, z, restYaw);
  const details = new THREE.Group();
  const skin = matte(0xf2bf9d);
  const hair = matte(0xc08a36);
  const gold = matte(0xe5b15a);
  const highlight = matte(0xf0cd7d);
  const satin = matte(0x76b7e6);
  const silk = matte(0xaeddfa);
  const trim = matte(0xdaf0fa);
  const underskirt = matte(0x5993ca);
  const pearl = matte(0xfff1e5);
  const velvet = matte(0x344b77);
  const glint = matte(0xe7f7ff, { emissive: 0x9bd6ff, emissiveIntensity: .26 });

  // The changing radii and pleats make a bell-shaped skirt with a scalloped overlayer.
  function skirt(profile, material) {
    const radial = 48;
    const vertices = [];
    const faces = [];
    for (const [y, radius, fold, scallop] of profile) {
      for (let i = 0; i < radial; i++) {
        const angle = i * Math.PI * 2 / radial;
        const pleat = Math.cos(angle * 12);
        const r = radius + fold * pleat;
        vertices.push(r * Math.cos(angle), y + scallop * pleat, .78 * r * Math.sin(angle));
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let i = 0; i < radial; i++) {
        const a = ring * radial + i;
        const b = ring * radial + (i + 1) % radial;
        faces.push(a, a + radial, b, b, a + radial, b + radial);
      }
    }
    const cloth = new THREE.BufferGeometry();
    cloth.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    cloth.setIndex(faces);
    cloth.computeVertexNormals();
    part(details, cloth, material, 0, 0, 0, 1, 1, 1);
  }
  skirt([[0, .73, .023, 0], [.055, .86, .028, .012], [.23, .85, .035, 0], [.54, .74, .037, 0],
    [.84, .56, .025, 0], [1.16, .27, .012, 0]], underskirt);
  skirt([[.13, .88, .033, .045], [.24, .89, .036, .021], [.46, .82, .04, 0], [.73, .68, .028, 0],
    [.98, .48, .02, 0], [1.19, .245, .004, 0]], satin);
  skirt([[.15, .900, .033, .042], [.18, .904, .034, .037]], trim);
  part(details, 'sphere', satin, 0, 1.20, 0, .251, .15, .199);
  part(details, 'sphere', silk, 0, 1.44, 0, .30, .35, .21);
  part(details, 'drum', trim, 0, 1.17, 0, .258, .069, .204);
  part(details, 'sphere', skin, 0, 1.728, .015, .243, .097, .164);
  part(details, 'drum', skin, 0, 1.81, 0, .108, .20, .105);
  part(details, 'drum', velvet, 0, 1.774, 0, .115, .036, .112);
  part(details, 'gem', glint, 0, 1.774, .115, .029, .036, .021);
  for (const [y, z] of [[1.22, .173], [1.30, .196], [1.38, .213]]) {
    part(details, 'sphere', pearl, 0, y, z, .024, .029, .023);
  }
  for (const side of [-1, 1]) {
    part(details, 'sphere', silk, side * .299, 1.058, .026, .296, .16, .352).rotation.z = side * -.48;
    part(details, 'sphere', trim, side * .158, 1.66, .149, .150, .059, .079).rotation.z = side * .26;
    part(details, 'sphere', silk, side * .284, 1.615, 0, .151, .137, .145).rotation.z = side * .2;
    const shoulder = addGroup(THREE, details, '', side * .304, 1.61, 0);
    const raised = side > 0;
    shoulder.rotation.set(raised ? -.45 : -.06, 0, side * (raised ? .63 : .38));
    part(shoulder, 'sphere', skin, 0, -.17, 0, .085, .188, .082);
    part(shoulder, 'sphere', pearl, 0, -.255, 0, .078, .111, .078);
    const elbow = addGroup(THREE, shoulder, '', 0, -.305, 0);
    elbow.rotation.set(raised ? -.78 : -.31, 0, -side * (raised ? 1.10 : .24));
    part(elbow, 'sphere', pearl, 0, -.028, 0, .078, .085, .076);
    part(elbow, 'sphere', pearl, 0, -.132, 0, .070, .172, .068);
    part(elbow, 'sphere', pearl, 0, -.276, .018, .062, .095, .050);
    part(elbow, 'sphere', pearl, -side * .05, -.239, .023, .026, .050, .023).rotation.z = side * .31;
  }
  batch(details, figure);

  const head = addGroup(THREE, figure, 'Cinderella head', 0, 2.035, .022);
  head.rotation.set(restPitch, restHeadTurn, -.065);
  buildPrincessFace(THREE, parts, head, {
    skin, blush: matte(0xe8a18b), brow: matte(0x795231), lip: matte(0xb34e65), iris: matte(0x437fbc), pearl,
  }, false, { jaw: .22, eyeWidth: 1.02 });
  const coiffure = new THREE.Group();
  part(coiffure, 'sphere', hair, 0, .075, -.105, .321, .322, .269);
  part(coiffure, 'sphere', gold, 0, .346, -.107, .234, .220, .211);
  part(coiffure, 'sphere', highlight, .046, .423, -.079, .174, .138, .180).rotation.z = .39;
  for (const side of [-1, 1]) {
    part(coiffure, 'sphere', gold, side * .169, .218, .126, .154, .134, .133).rotation.z = side * -.55;
    part(coiffure, 'sphere', highlight, side * .067, .265, .166, .181, .084, .105).rotation.z = side * -.36;
    part(coiffure, 'gem', glint, side * .308, -.117, .018, .040, .063, .036);
  }
  const headband = new THREE.TorusGeometry(1, .10, 8, 32, Math.PI);
  part(coiffure, headband, satin, 0, .056, .047, .308, .355, .29).rotation.x = -.44;
  batch(coiffure, head);

  addRoundSolid(obstacles, ...spaceTransform(exhibit).toWorld(x, z), .88, 2.64);
  const { clamp, damp } = THREE.MathUtils;
  const attentionRadius = 14.1;
  const releaseRadius = 14.8;
  const { width, depth } = exhibit.bounds;
  let watching = false;

  return {
    reset() {
      watching = false;
      figure.rotation.y = restYaw;
      head.rotation.x = restPitch;
      head.rotation.y = restHeadTurn;
    },
    update(dt, playerX, playerZ, eyeY, floorY, still) {
      const dx = playerX - x;
      const dz = playerZ - z;
      const radius = watching ? releaseRadius : attentionRadius;
      const inBallroom = Math.abs(playerX) <= width / 2 - .26 && Math.abs(playerZ) < depth / 2;
      const distance = Math.hypot(dx, dz);
      watching = inBallroom && floorY >= -.2 && floorY < landingHeight + 1.45 && distance <= radius;
      const yaw = watching ? Math.atan2(dx, dz) : restYaw;
      // Turn the full figure by the shortest arc, including when the player walks behind her.
      const delta = yaw - figure.rotation.y;
      const turn = Math.atan2(Math.sin(delta), Math.cos(delta));
      figure.rotation.y = still || Math.abs(turn) < .001 ? yaw : figure.rotation.y + damp(0, turn, 5.6, dt);
      const pitch = watching ? clamp(Math.atan2(head.position.y - eyeY, distance), -.79, .31) : restPitch;
      const headTurn = watching ? 0 : restHeadTurn;
      head.rotation.x = still ? pitch : damp(head.rotation.x, pitch, 7, dt);
      head.rotation.y = still ? headTurn : damp(head.rotation.y, headTurn, 7, dt);
    },
  };
}
