import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addRoundSolid, addSolid, spaceTransform } from './parts.js';

export function buildSeascape({ THREE, document, room, parts, exhibit, outline, palette }) {
  const { part, matte } = parts;
  const { width, depth, height } = exhibit.bounds;
  const sand = paintCanvasTexture(THREE, document, 768, 768, (ink, w, h) => {
    const seabed = ink.createLinearGradient(0, 0, 0, h);
    seabed.addColorStop(0, '#72a6a2');
    seabed.addColorStop(.52, '#a7c5b3');
    seabed.addColorStop(1, '#c6d2b5');
    ink.fillStyle = seabed;
    ink.fillRect(0, 0, w, h);
    const random = seededRandom(288);
    for (let i = 0; i < 850; i++) {
      ink.fillStyle = i % 4 ? '#457f8825' : '#e9e4c263';
      ink.beginPath();
      ink.ellipse(random() * w, random() * h, 1 + random() * 4, .7 + random() * 2.5, random() * 4, 0, Math.PI * 2);
      ink.fill();
    }
    for (let i = -1; i < 17; i++) {
      ink.strokeStyle = i % 3 ? '#ecf5cf2d' : '#ddffd577';
      ink.lineWidth = i % 3 ? 2.2 : 4.5;
      const y = h * i / 16;
      ink.beginPath();
      ink.moveTo(-8, y);
      for (let x = -8; x < w; x += 44) {
        ink.quadraticCurveTo(x + 21, y + Math.sin(x * .021 + i) * 36, x + 44, y + Math.cos(x * .018 + i) * 11);
      }
      ink.stroke();
    }
  });
  const floorGeo = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))));
  const position = floorGeo.getAttribute('position');
  const uv = floorGeo.getAttribute('uv');
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / width + .5, position.getY(i) / depth + .5);
  const floor = part(room, floorGeo, matte(sand ? 0xffffff : 0x9bbdb3, { map: sand }), 0, 0, 0, 1, 1, 1);
  floor.name = 'Ariel sandy seabed';
  floor.rotation.x = -Math.PI / 2;

  const water = paintCanvasTexture(THREE, document, 384, 768, (ink, w, h) => {
    const gradient = ink.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#329ec3');
    gradient.addColorStop(.25, '#257aa4');
    gradient.addColorStop(.78, '#144b70');
    gradient.addColorStop(1, '#113b54');
    ink.fillStyle = gradient;
    ink.fillRect(0, 0, w, h);
    const rays = ink.createLinearGradient(0, 0, 0, h);
    rays.addColorStop(0, '#a5f9ea58');
    rays.addColorStop(.63, '#8ef5e71d');
    rays.addColorStop(1, '#58ade300');
    ink.fillStyle = rays;
    for (const [x, far, span] of [[25, 154, 31], [121, 187, 17], [193, 271, 26], [313, 391, 37]]) {
      ink.beginPath();
      ink.moveTo(x, 0);
      ink.lineTo(x + span, 0);
      ink.lineTo(far + span * 2, h - 48);
      ink.lineTo(far - span, h - 26);
      ink.closePath();
      ink.fill();
    }
    const random = seededRandom(741);
    for (let i = 0; i < 54; i++) {
      ink.strokeStyle = i % 4 ? '#bcecf34c' : '#bcecf386';
      ink.lineWidth = i % 4 ? 1 : 1.5;
      ink.beginPath();
      ink.arc(random() * w, random() * h, 1 + random() * 5.4, 0, Math.PI * 2);
      ink.stroke();
    }
    for (let i = 0; i < 18; i++) {
      const x = random() * w;
      const top = h * (.59 + random() * .31);
      ink.fillStyle = i % 2 ? '#17677953' : '#4b889740';
      ink.beginPath();
      ink.moveTo(x - 15, h);
      ink.bezierCurveTo(x + 34, h * .85, x - 25, top + 48, x + 23, top);
      ink.bezierCurveTo(x + 8, top + 62, x + 52, h * .90, x + 14, h);
      ink.fill();
    }
  });
  const panelMaterial = new THREE.MeshBasicMaterial({ color: water ? 0xffffff : 0x286b86, map: water });
  // Each plane faces the room and is inset from the structural wall surface.
  for (let i = 1; i < outline.length; i++) {
    const [ax, az] = outline[i];
    const [bx, bz] = outline[(i + 1) % outline.length];
    const yaw = Math.atan2(az - bz, bx - ax) + Math.PI;
    const offset = .275 + SURFACE_GAP.trim;
    const x = (ax + bx) / 2 + Math.sin(yaw) * offset;
    const z = (az + bz) / 2 + Math.cos(yaw) * offset;
    part(room, new THREE.PlaneGeometry(Math.hypot(bx - ax, bz - az) - .37, height - .10), panelMaterial,
      x, height / 2, z, 1, 1, 1).rotation.y = yaw;
  }
  const roof = part(room, new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))),
    palette.teal, 0, height - SURFACE_GAP.roof, 0, 1, 1, 1);
  roof.name = 'Ariel overhead water canopy';
  roof.rotation.x = Math.PI / 2;
  roof.layers.set(PLAYER_ONLY_LAYER);
}

export function buildUnderseaKingdom({ THREE, room, parts, exhibit, obstacles, palette }) {
  const { part, beam, batch, matte } = parts;
  const { gold, teal, ivory, rock, aqua, deep } = palette;
  const { toWorld } = spaceTransform(exhibit);
  const palace = addGroup(THREE, room, 'Ariel underwater palace', 0, 0, -8.32);
  const details = new THREE.Group();
  const pearl = matte(0xffe3bb, { emissive: 0xb8efdf, emissiveIntensity: .40 });
  part(details, 'box', rock, 0, .49, -.28, 11.26, .98, 3.12);
  part(details, 'box', teal, 0, 1.02, -.31, 10.55, .20, 2.92);
  for (const [y, depth, length] of [[.13, 2.02, 4.9], [.38, 1.67, 4.45], [.67, 1.32, 4.01]]) {
    part(details, 'box', ivory, 0, y, 1.35, length, y * 2, depth);
  }
  const arch = new THREE.Shape();
  arch.moveTo(-2.0, 0);
  arch.lineTo(2.0, 0);
  arch.lineTo(2.0, 3.08);
  arch.quadraticCurveTo(2.03, 4.33, 0, 5.57);
  arch.quadraticCurveTo(-2.03, 4.33, -2.0, 3.08);
  arch.closePath();
  const relief = new THREE.ExtrudeGeometry(arch, { depth: .52, bevelEnabled: true, bevelSize: .12, bevelThickness: .09 });
  part(details, relief, teal, 0, 1.02, -.15, 1.23, 1.12, 1);
  part(details, relief, ivory, 0, 1.03, .49, 1, 1.01, .36);
  part(details, relief, deep, 0, 1.15, .73, .75, .88, .15);
  for (let i = -3; i <= 3; i++) {
    const x = i * .354;
    const upper = 5.64 - Math.abs(i) * .48;
    beam(details, gold, [x, 1.18, .86], [x, upper, .86], .055);
    part(details, 'gem', pearl, x, 3.40 + Math.abs(i) * .13, .94, .09, .21, .065);
  }
  const shellDome = new THREE.LatheGeometry([
    [.94, 0], [1.0, .11], [.91, .46], [.74, .78], [.48, 1.09], [.25, 1.31], [.04, 1.48],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 24);
  const littleRing = new THREE.TorusGeometry(1, .048, 6, 24);
  for (const [x, z, height, scale] of [[-3.42, -.03, 7.37, 1.32], [3.42, -.03, 7.37, 1.32],
    [-5.32, .53, 4.64, .98], [5.32, .53, 4.64, .98]]) {
    part(details, 'drum', teal, x, 1.35, z, scale * 1.21, .48, scale * 1.21);
    part(details, 'drum', ivory, x, (height + 1.5) / 2, z, scale * .82, height - 1.5, scale * .82);
    for (const y of [2.08, height - .38, height]) {
      part(details, 'drum', gold, x, y, z, scale * .94, .138, scale * .94);
    }
    part(details, shellDome, aqua, x, height + .03, z, scale, scale * 1.24, scale);
    part(details, 'gem', pearl, x, height + scale * 1.91, z, .20, .39, .20);
    part(details, 'sphere', deep, x, height * .64, z + scale * .71, .32 * scale, .55, .20);
    part(details, littleRing, gold, x, height * .64, z + scale * .88, .25 * scale, .50, .25);
    part(details, 'gem', pearl, x, height * .64, z + scale * .92, .11, .23, .11);
  }
  for (let i = -4; i <= 4; i++) {
    const a = i * .17;
    part(details, 'sphere', i % 2 ? aqua : ivory, Math.sin(a) * .95, 6.97 + Math.cos(a) * .45, .22,
      .207, .65, .30).rotation.z = -a * 1.37;
  }
  part(details, 'gem', pearl, 0, 7.28, .64, .252, .37, .22);
  batch(details, palace);
  addSolid(obstacles, ...toWorld(0, -8.06), 11.80, 3.58, 8.5, exhibit.rotation);
}

export function buildCoralReef({ THREE, room, parts, exhibit, obstacles, palette }) {
  const { part, beam, batch, matte } = parts;
  const { teal, ivory, rock } = palette;
  const { toWorld } = spaceTransform(exhibit);
  const reef = addGroup(THREE, room, 'Ariel coral reef');
  const details = new THREE.Group();
  const coral = [0xdd6d83, 0xc891cf, 0xed9b65, 0x678bb2, 0xa04d7c].map(color => matte(color));
  const kelp = [matte(0x24795d, { side: THREE.DoubleSide }), matte(0x52996a, { side: THREE.DoubleSide })];
  const blade = new THREE.Shape();
  blade.moveTo(0, 0);
  blade.bezierCurveTo(.42, .83, -.54, 1.76, .02, 2.58);
  blade.bezierCurveTo(-.72, 2.06, -.14, .82, 0, 0);
  const leaf = new THREE.ShapeGeometry(blade);
  const random = seededRandom(1057);
  for (const [index, [x, z, scale]] of [[-7.12, 5.29, 1.0], [6.75, 6.72, .95], [-8.15, -.42, 1.22],
    [8.25, 1.35, 1.2], [-7.57, -5.9, 1.13], [7.3, -6.02, 1.19], [9.15, -2.23, 1.0]].entries()) {
    const patch = addGroup(THREE, details, '', x, 0, z, index * .76);
    patch.scale.setScalar(scale);
    part(patch, 'ball', rock, -.36, .36, .31, 1.22, .57, .76);
    part(patch, 'ball', teal, .37, .28, -.29, 1.04, .58, .97);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.26;
      const branchX = Math.cos(angle) * .61;
      const branchZ = Math.sin(angle) * .64;
      const color = coral[(index + i) % coral.length];
      const base = [branchX, .47, branchZ];
      const y = .87 + random() * .69;
      const joint = [branchX + .17, y, branchZ - .12];
      const tip = [joint[0] + .13, y + .49 + random() * .34, joint[2] + .17];
      beam(patch, color, base, joint, .119);
      beam(patch, color, joint, tip, .097);
      for (const side of [-1, 1]) {
        const sprig = [joint[0] + side * .29, joint[1] + .32, joint[2] + side * .16];
        beam(patch, color, joint, sprig, .069);
        part(patch, 'sphere', color, ...sprig, .062, .083, .063);
      }
      part(patch, 'sphere', color, ...tip, .083, .102, .078);
    }
    for (let i = 0; i < 5; i++) {
      part(patch, leaf, kelp[i % 2], -.85 + i * .39, .28, -.58,
        .70 + random() * .66, .88 + random() * .46, 1).rotation.y = i * 1.08;
    }
    for (let i = 0; i < 3; i++) {
      const dx = -.83 + i * .65;
      part(patch, 'sphere', ivory, dx, .15, .71, .142, .08, .197).rotation.y = i * .56;
    }
    addRoundSolid(obstacles, ...toWorld(x, z), 1.49 * scale, 3.46 * scale);
  }
  const starfish = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5;
    const r = i % 2 ? .38 : 1;
    if (i === 0) starfish.moveTo(0, 1);
    else starfish.lineTo(Math.sin(angle) * r, Math.cos(angle) * r);
  }
  starfish.closePath();
  const starShape = new THREE.ShapeGeometry(starfish);
  for (const [x, z, scale, yaw] of [[-3.3, 6.8, .46, .13], [4.23, 5.5, .55, .51], [4.2, -.28, .37, 1.26],
    [-4.61, -2.6, .51, 1.06], [6.47, -4.34, .42, .81]]) {
    const star = part(details, starShape, coral[2], x, SURFACE_GAP.trim, z, scale, scale, scale);
    star.rotation.set(-Math.PI / 2, 0, yaw);
    part(details, 'sphere', coral[0], x, .041, z, scale * .24, .077, scale * .24);
  }
  batch(details, reef);
}

export function buildReefFish({ THREE, room, parts }) {
  const { matte } = parts;
  const school = addGroup(THREE, room, 'Ariel schools of fish');
  const bodyShape = new THREE.SphereGeometry(1, 10, 7);
  const tailShape = new THREE.ConeGeometry(1, 1, 3);
  const finShape = new THREE.OctahedronGeometry(1);
  finShape.rotateY(Math.PI / 4);
  const model = new THREE.Object3D();
  const colors = [0xf2bd59, 0x61c9d6, 0xf287a3];
  const fishPerSchool = 9;
  const sites = [[-4.30, 5.15, -1.65], [4.10, 6.68, -3.0], [1.50, 9.00, 1.24]];
  const shoals = colors.map((color, index) => {
    const material = matte(color);
    const fin = matte([0xe88a51, 0x3a96bb, 0xc95cad][index]);
    const bodies = new THREE.InstancedMesh(bodyShape, material, fishPerSchool);
    const tails = new THREE.InstancedMesh(tailShape, fin, fishPerSchool);
    const fins = new THREE.InstancedMesh(finShape, fin, fishPerSchool);
    for (const mesh of [bodies, tails, fins]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const [x, y, z] = sites[index];
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, y + .73, z), 3.25);
      school.add(mesh);
    }
    return { bodies, tails, fins };
  });
  const random = seededRandom(162);
  const fish = Array.from({ length: fishPerSchool }, () => ({
    phase: random() * 2.9, radius: .65 + random() * 1.60, y: random() * 1.45, scale: .74 + random() * .60,
  }));
  function position(mesh, index, x, y, z, yaw, sx, sy, sz, tailAngle = 0) {
    model.position.set(x, y, z);
    model.rotation.set(tailAngle, yaw, 0, 'YXZ');
    model.scale.set(sx, sy, sz);
    model.updateMatrix();
    mesh.setMatrixAt(index, model.matrix);
  }

  let time = 0;
  let still = false;
  function pose() {
    for (let group = 0; group < shoals.length; group++) {
      const { bodies, tails, fins } = shoals[group];
      const [cx, cy, cz] = sites[group];
      for (let i = 0; i < fish.length; i++) {
        const { phase, radius, y: offset, scale } = fish[i];
        const angle = phase + time * (.43 + group * .055) + group * 1.83;
        const x = cx + radius * Math.cos(angle);
        const z = cz + radius * .76 * Math.sin(angle);
        const y = cy + offset + .19 * Math.sin(angle * 2 + phase);
        const yaw = Math.atan2(-Math.sin(angle), .76 * Math.cos(angle));
        const tailYaw = yaw + (still ? 0 : .33 * Math.sin(time * 8 + phase * 3));
        position(bodies, i, x, y, z, yaw, .124 * scale, .190 * scale, .341 * scale);
        position(fins, i, x, y + .11 * scale, z, yaw, .053 * scale, .142 * scale, .18 * scale);
        position(tails, i, x - .37 * scale * Math.sin(yaw), y, z - .37 * scale * Math.cos(yaw),
          tailYaw, .145 * scale, .261 * scale, .042 * scale, Math.PI / 2);
      }
      bodies.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = fins.instanceMatrix.needsUpdate = true;
    }
  }
  pose();
  return {
    reset() {
      time = 0;
      still = true;
      pose();
    },
    update(dt, reduceMotion) {
      if (reduceMotion && still) return;
      still = reduceMotion;
      time = still ? 0 : time + dt;
      pose();
    },
  };
}
