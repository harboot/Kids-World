import { EYE_HEIGHT } from '../../core/player.js';
import { addCaverns } from './caverns.js';
import { CLIFF_Z, LAKE_LEVEL, X_MIN, bedrockHeight, cliffRelief, heightGrid, hikingTrail, lakeDistance, nearest, riverCenter,
  riverLevel, riverWidth, smooth, terrainHeight, valleyWall, westTrail } from './landform.js';
import { metadata } from './metadata.js';
import { createMineLayout, lakeBasin, mineLake, shaft } from './mine-layout.js';
import { addForest, addLandforms } from './outdoors.js';
import { addFootbridge, addRailway, createTimberKit } from './structures.js';
import { addWater } from './water.js';

function collisionIndex(items) {
  const cells = new Map();
  const size = 4;
  const key = (x, z) => x * 1000 + z;
  for (const item of items) {
    const { x, z, radius } = item;
    for (let i = Math.floor((x - radius) / size); i <= Math.floor((x + radius) / size); i++) {
      for (let j = Math.floor((z - radius) / size); j <= Math.floor((z + radius) / size); j++) {
        const cell = key(i, j);
        if (!cells.has(cell)) cells.set(cell, []);
        cells.get(cell).push(item);
      }
    }
  }
  return (x, z, radius) => {
    for (let i = Math.floor((x - radius) / size); i <= Math.floor((x + radius) / size); i++) {
      for (let j = Math.floor((z - radius) / size); j <= Math.floor((z + radius) / size); j++) {
        const items = cells.get(key(i, j));
        if (items?.some(item => (item.x - x) ** 2 + (item.z - z) ** 2 < (item.radius + radius) ** 2)) return true;
      }
    }
    return false;
  };
}

export default {
  ...metadata,
  load({ THREE, scene, touch = false, reducedMotion }) {
    scene.background = new THREE.Color(0x65b7eb);
    scene.fog = new THREE.Fog(0x9fcce1, 57, 147);
    const daylight = new THREE.Color(0x9fcce1);
    const caveFog = new THREE.Color(0x293941);
    const sky = new THREE.HemisphereLight(0xd0ebff, 0x6f7650, 1.46);
    const sun = new THREE.DirectionalLight(0xffe5b7, 2.17);
    sun.position.set(-43, 68, 35);
    scene.add(sky, sun);

    const terrain = heightGrid(X_MIN, 72, CLIFF_Z, 88, terrainHeight);
    const mine = createMineLayout(THREE);
    const bedrock = heightGrid(X_MIN, 72, -88, CLIFF_Z, (x, z) => {
      const cap = bedrockHeight(x, z);
      const cover = (1 - smooth(-2.8, -0.4, -mine.opening.sample(x, z))) * smooth(CLIFF_Z, -27, z);
      return cover > 0 ? Math.max(cap, mine.ceiling.sample(x, z) + 1.65 * cover) : cap;
    });
    const kit = createTimberKit(THREE, scene);
    const bridge = (x, z, xx, zz, width) => addFootbridge(THREE, kit, terrain.sample,
      [x, z, terrain.sample(x, z)], [xx, zz, terrain.sample(xx, zz)], width);
    const bridges = [bridge(-36, -18, -14, -18, 3.25), bridge(-5, 46, 13, 46, 3.55)];
    const railroad = addRailway(THREE, scene, mine, kit);
    const rocks = addCaverns(THREE, scene, mine, railroad.lamps, railroad);
    addLandforms(THREE, scene, terrain, bedrock, mine);
    const trees = addForest(THREE, scene, terrain, bedrock, bridges);
    const animateWater = addWater(THREE, scene, terrain, touch);
    kit.finish();

    const edgeRock = (x, z) => valleyWall(x, z) > 4.8
      && Math.min(nearest(hikingTrail, x, z).offset, nearest(westTrail, x, z).offset) > 4;
    const outsideObstacles = collisionIndex(trees);
    const insideObstacles = collisionIndex([...rocks, ...railroad.posts, shaft]);
    const emptyStatus = { missions: [] };

    function caveBridge(x, z, margin = 0) {
      const span = mine.bridgeSpan(x, z);
      return span && span.offset <= railroad.deckHalfWidth - margin ? railroad.deckHeight(x, z) : undefined;
    }

    function getGroundHeight(x, z) {
      if (z < CLIFF_Z) return Math.max(mine.floor.sample(x, z), caveBridge(x, z) ?? -Infinity);
      let height = terrain.sample(x, z);
      for (const bridge of bridges) height = Math.max(height, bridge.surface(x, z) ?? -Infinity);
      return height;
    }

    function blocksGround(x, z, radius, feet) {
      if (z < CLIFF_Z) {
        // The clipped cave contour shares its rim exactly with the cliff mesh.
        if (mine.opening.sample(x, z) <= radius * 1.08 || insideObstacles(x, z, radius)) return true;
        const deck = caveBridge(x, z, radius);
        if (deck !== undefined && feet >= deck - 0.3) return false;
        return lakeBasin(x, z) < 1.16 && mine.floor.sample(x, z) < mineLake.y - 0.42;
      }
      if (z - CLIFF_Z < radius + cliffRelief(x) * 1.04 && mine.opening.sample(x, CLIFF_Z) <= radius) return true;
      if (edgeRock(x, z) || outsideObstacles(x, z, radius)) return true;
      for (const bridge of bridges) {
        if (bridge.railing(x, z, radius)) return true;
        if (bridge.surface(x, z, radius) !== undefined) return false;
      }
      const y = terrain.sample(x, z);
      if (lakeDistance(x, z) < 1.13 && y < LAKE_LEVEL - 0.39) return true;
      return z > 20 && Math.abs(x - riverCenter(z)) < riverWidth(z) * 1.35 && y < riverLevel(z) - 0.37;
    }

    let time = 0;
    return {
      obstacles: railroad.platforms,
      interactions: [],
      missionStatus: emptyStatus,
      getGroundHeight,
      blocksGround,
      getCeilingHeight(x, z) {
        return z < CLIFF_Z && mine.opening.sample(x, z) >= 0 ? mine.ceiling.sample(x, z) : Infinity;
      },
      droneView: { center: { x: 0, z: -5 }, width: 144, depth: 166 },
      reset() {
        time = 0;
        animateWater(time);
        scene.fog.color.copy(daylight);
        scene.fog.near = 57;
        scene.fog.far = 147;
      },
      update(dt, player, elapsed = dt) {
        if (!reducedMotion?.()) {
          time = (time + elapsed) % 1200;
          animateWater(time);
        }
        if (!player) return;
        const inside = smooth(CLIFF_Z - 2, CLIFF_Z - 15, player.z)
          * (1 - smooth(0, 2.5, player.y - EYE_HEIGHT - mine.ceiling.sample(player.x, player.z)));
        scene.fog.color.copy(daylight).lerp(caveFog, inside);
        scene.fog.near = 57 - inside * 42;
        scene.fog.far = 147 - inside * 97;
      },
    };
  },
};
