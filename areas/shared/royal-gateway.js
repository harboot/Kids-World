import { addGroup, addMesh, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';

// The front of the gateway faces local +Z.
export function buildRoyalGateway(THREE, scene, document, obstacles, { x, z, yaw = 0, title, subtitle }) {
  const root = addGroup(THREE, scene, title + ' gateway', x, 0, z, yaw);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const gem = new THREE.OctahedronGeometry(1);
  const bronze = new THREE.MeshLambertMaterial({ color: 0x6b4290 });
  const gold = new THREE.MeshLambertMaterial({ color: 0xd5a455, emissive: 0x513017, emissiveIntensity: 0.22 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x32203e });
  const glow = new THREE.MeshLambertMaterial({ color: 0xc38bec, emissive: 0xb958ed });
  const inset = new THREE.MeshLambertMaterial({ color: 0x301d46, emissive: 0x6d2f9a });
  const part = (shape, material, ...transform) => addMesh(THREE, root, shape, material, ...transform);

  const archShape = (radius, shoulder) => {
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0);
    shape.lineTo(radius, 0);
    shape.lineTo(radius, shoulder);
    shape.absarc(0, shoulder, radius, 0, Math.PI, false);
    shape.lineTo(-radius, 0);
    return shape;
  };
  function facing(radius, shoulder, zOffset, depth, material) {
    const geometry = new THREE.ExtrudeGeometry(archShape(radius, shoulder),
      { depth, bevelEnabled: false, curveSegments: 18 });
    return part(geometry, material, 0, 0, zOffset, 1, 1, 1);
  }
  facing(1.86, 2.82, -0.52, 0.84, bronze);
  facing(1.61, 2.82, 0.30, 0.13, gold);
  facing(1.49, 2.82, 0.42, SURFACE_GAP.trim, inset);
  part(box, dark, 0, 0.092, 0.02, 4.04, 0.184, 1.21);
  part(box, gold, 0, 0.195, 0.06, 3.92, 0.078, 1.13);
  for (const side of [-1, 1]) {
    part(box, dark, side * 1.84, 0.28, 0.15, 0.59, 0.56, 0.84);
    part(box, gold, side * 1.84, 1.42, 0.38, 0.13, 2.35, 0.21);
    part(box, bronze, side * 1.91, 2.74, 0.19, 0.60, 0.28, 0.78);
    part(gem, glow, side * 1.9, 3.1, 0.27, 0.25, 0.52, 0.25);
  }
  part(gem, gold, 0, 4.73, 0.32, 0.27, 0.52, 0.21);
  part(gem, glow, 0, 2.12, 0.49, 0.35, 0.65, 0.11);

  const lock = addGroup(THREE, root, 'Magic seal');
  addMesh(THREE, lock, box, gold, 0, 1.08, 0.485, 2.77, 0.10, 0.08);
  addMesh(THREE, lock, box, gold, 0, 1.47, 0.485, 2.77, 0.10, 0.08);
  addMesh(THREE, lock, gem, gold, 0, 1.28, 0.52, 0.25, 0.45, 0.12);

  const sparks = addGroup(THREE, root, 'Gateway crystals');
  const motes = new THREE.InstancedMesh(gem, glow, 12);
  const transform = new THREE.Object3D();
  for (let i = 0; i < motes.count; i++) {
    const angle = i * Math.PI * 2 / motes.count;
    transform.position.set(Math.cos(angle) * 1.06, 2.12 + Math.sin(angle) * 1.49, 0.54);
    transform.rotation.z = angle;
    transform.scale.set(0.035, i % 2 ? 0.09 : 0.055, 0.04);
    transform.updateMatrix();
    motes.setMatrixAt(i, transform.matrix);
  }
  sparks.add(motes);

  const texture = paintCanvasTexture(THREE, document, 768, 188, (ink, w, h) => {
    ink.fillStyle = '#40264e';
    ink.fillRect(0, 0, w, h);
    ink.strokeStyle = '#d7a855';
    ink.lineWidth = 5;
    ink.strokeRect(8, 8, w - 16, h - 16);
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.fillStyle = '#fff2ce';
    ink.font = 'bold 61px Georgia, serif';
    ink.fillText(title, w / 2, subtitle ? 68 : h / 2, w - 54);
    if (subtitle) {
      ink.fillStyle = '#edd1f8';
      ink.font = '36px Georgia, serif';
      ink.fillText(subtitle, w / 2, 128, w - 54);
    }
  });
  part(box, gold, 0, 3.65, 0.49, 3.84, 0.91, 0.19);
  if (texture) {
    part(new THREE.PlaneGeometry(3.71, 0.78), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      0, 3.65, 0.585 + SURFACE_GAP.detail, 1, 1, 1);
  }

  obstacles.push({ ...rectangleBounds(x, z, 4.41, 1.24), height: 4.92 });

  let previous;
  function setUnlocked(unlocked) {
    if (unlocked === previous) return;
    previous = unlocked;
    lock.visible = !unlocked;
    sparks.visible = unlocked;
    glow.color.setHex(unlocked ? 0xe8aeff : 0x81618e);
    glow.emissiveIntensity = unlocked ? 0.8 : 0.12;
    inset.emissiveIntensity = unlocked ? 0.42 : 0.04;
  }
  return setUnlocked;
}
