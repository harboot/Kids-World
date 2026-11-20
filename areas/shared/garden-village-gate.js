import { addGroup, addMesh, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';

const villageId = 'arendelle-village';
const sites = {
  garden: { x: 0, z: 22.6, inward: -1, destination: villageId, title: 'Arendelle Village' },
  [villageId]: { x: 4, z: -28.0, inward: 1, destination: 'garden', title: 'Flower Garden' },
};

export function addGardenVillageGate(THREE, scene, obstacles, { area, ground, document, signal, isLevelComplete }) {
  const { x, z, inward, destination, title } = sites[area];
  const y = ground(x, z);
  const yaw = inward > 0 ? 0 : Math.PI;
  const gate = addGroup(THREE, scene, `${title} gate`, x, y, z, yaw);
  const locked = addGroup(THREE, gate, 'Locked gate bar');
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const timber = new THREE.MeshLambertMaterial();
  const frame = [
    [0, 2.78, 0, 3.34, 0.37, 0.38, 0x6f4c38],
    [0, 3.08, 0, 3.75, 0.22, 0.54, 0x487269],
    [0, 2.8, 0.24, 2.69, 0.37, 0.14, 0x654736],
    [0, 0.66, 0.155, 2.34, 0.16, 0.11, 0x684938],
    [0, 2.01, 0.155, 2.34, 0.16, 0.11, 0x684938],
  ];
  for (const side of [-1, 1]) {
    frame.push(
      [side * 1.42, 1.47, 0, 0.32, 2.94, 0.38, 0x78543b],
      [side * 1.42, 0.24, 0, 0.55, 0.48, 0.62, 0xb3a48d],
      [side * 1.42, 2.59, 0.218, 0.17, 0.19, 0.13, 0xe7bb76],
    );
  }
  for (let i = -4; i <= 4; i++) {
    frame.push([i * 0.267, 1.31, 0, 0.251, 2.52, 0.25, i % 2 ? 0x8c694b : 0xa77a52]);
  }
  addWoodwork(gate, frame);
  addWoodwork(locked, [
    [0, 1.32, 0.21, 2.87, 0.22, 0.17, 0x513d35],
    [0, 1.32, 0.32, 0.35, 0.37, 0.14, 0xb58850],
    [0, 0.94, 0.24, 1.81, 0.34, 0.10, 0x624938],
  ]);
  lettering(gate, [title], 2.80, 0.31, 2.57, 0.28, '#365e55', 51);
  lettering(locked, ['Complete all Arendelle', 'Village missions'], 0.94, 0.29, 1.71, 0.28, '#584331', 31);

  // This doorway remains a solid landmark. The interaction handles the crossing.
  obstacles.push({ ...rectangleBounds(x, z, 3.38, 0.62), height: y + 3.19 });
  const active = () => !signal?.aborted && Boolean(isLevelComplete?.(villageId));
  function refresh() { locked.visible = !active(); }
  refresh();

  return {
    arrival: { x, z: z + inward * 3.5, yaw: yaw + Math.PI },
    interaction: {
      x, z, destination, label: `Enter ${title}`, anchorY: y + 1.58, radius: 2.3,
      reachable: player => inward * (player.z - z) > 0 && player.y < y + 3.3,
      get active() { return active(); },
      act({ travel, heardCue }) { if (active()) travel(destination, heardCue, area); },
    },
    refresh,
  };

  function addWoodwork(parent, parts) {
    const batch = new THREE.InstancedMesh(geometry, timber, parts.length);
    const transform = new THREE.Object3D();
    const tint = new THREE.Color();
    parts.forEach(([px, py, pz, width, height, depth, color], i) => {
      transform.position.set(px, py, pz);
      transform.scale.set(width, height, depth);
      transform.updateMatrix();
      batch.setMatrixAt(i, transform.matrix);
      batch.setColorAt(i, tint.setHex(color));
    });
    parent.add(batch);
  }

  function lettering(parent, lines, height, front, width, scaleY, background, size) {
    const map = paintCanvasTexture(THREE, document, 512, 118, ink => {
      ink.fillStyle = background;
      ink.fillRect(0, 0, 512, 118);
      ink.strokeStyle = '#dbbb83';
      ink.lineWidth = 4;
      ink.strokeRect(6, 6, 500, 106);
      ink.fillStyle = '#fff1cd';
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.font = `bold ${size}px Georgia, serif`;
      lines.forEach((line, i) => ink.fillText(line, 256, 59 + (i - (lines.length - 1) / 2) * 39, 477));
    });
    if (map) {
      addMesh(THREE, parent, new THREE.PlaneGeometry(width, scaleY), new THREE.MeshBasicMaterial({ map }),
        0, height, front + SURFACE_GAP.detail, 1, 1, 1);
    }
  }
}
