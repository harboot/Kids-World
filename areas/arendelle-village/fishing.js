import { SEA_LEVEL } from './harbor.js';
import { buildVillager } from './villager.js';

const rackSite = { x: 28.8, z: -4.94 };
const pierSite = { x: 35.8, z: -5.08 };
const sellerSite = { x: 18.0, z: -3.05 };
const floatX = pierSite.x + 0.55;
const floatZ = -9.15;
const fishNeeded = 3;
const castDuration = 0.55;
const biteDuration = 6;
const biteCue = [[79, { duration: 0.2, level: 0.10 }], [86, { duration: 0.24, level: 0.11 }, 0.07]];
const catchCue = [[74, { duration: 0.2, level: 0.10 }], [83, { duration: 0.32, level: 0.12 }, 0.09]];
const coinsCue = [[84, { duration: 0.17, level: 0.13 }], [91, { duration: 0.23, level: 0.10 }, 0.07],
  [96, { duration: 0.28, level: 0.07 }, 0.14]];

export function createFishing({ THREE, scene, viewmodel, kit, terrain, isActive, notify, playCue, onComplete }) {
  const { group, part, box, beam, sign } = kit;
  const rack = group('Fishing rod rack', rackSite.x, 0, rackSite.z);
  for (const x of [-0.39, 0.39]) {
    box(rack, 0x765139, x, 0.28, 0, 0.12, 0.56, 0.25);
    box(rack, 0xc9a072, x, 0.55, 0, 0.20, 0.07, 0.31);
  }
  box(rack, 0x8b684b, 0, 0.22, 0, 0.82, 0.11, 0.18);
  sign(rack, 'Fishing Rod', 0, 0.39, 0.14, 0.80, 0.20);
  const marker = group('Fishing spot marker', pierSite.x - 0.75, 0, pierSite.z - 0.52);
  box(marker, 0x765139, 0, 0.32, 0, 0.10, 0.64, 0.11);
  sign(marker, 'Fishing Spot', 0, 0.72, 0.09, 0.87, 0.24);

  const rod = group('Fishing rod', 0, 0, 0);
  const rodBatch = { batch: rod };
  const tip = new THREE.Vector3(0, 1.65, 0.16);
  beam(rod, 0x533b2a, [0, 0, 0], [0, 0.36, 0], 0.072, 0.067, rodBatch);
  beam(rod, 0xc79b56, [0, 0.33, 0], [0, 1.10, 0.032], 0.045, 0.045, rodBatch);
  beam(rod, 0xb78343, [0, 1.09, 0.032], tip.toArray(), 0.024, 0.024, rodBatch);
  part(rod, 'drum', 0x5b6a63, 0.061, 0.31, 0, 0.086, 0.066, 0.086,
    { ...rodBatch, rotation: [0, 0, Math.PI / 2] });

  const bobber = group('Fishing bobber', floatX, SEA_LEVEL, floatZ);
  const floatBatch = { batch: bobber };
  part(bobber, 'rock', 0xe1d4b4, 0, 0.01, 0, 0.105, 0.08, 0.105, floatBatch);
  part(bobber, 'rock', 0xdb4742, 0, 0.065, 0, 0.089, 0.063, 0.089, floatBatch);
  box(bobber, 0xe7ab55, 0, 0.135, 0, 0.038, 0.081, 0.038, floatBatch);
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xfff1d2 }));
  const points = new THREE.BufferAttribute(new Float32Array(9), 3).setUsage(THREE.DynamicDrawUsage);
  line.name = 'Fishing line';
  line.geometry.setAttribute('position', points);
  line.frustumCulled = false;
  scene.add(line);
  const worldTip = new THREE.Vector3();

  const schools = Array.from({ length: 5 }, (_, i) => {
    const fish = group('Harbor fish ' + (i + 1), 0, 0, 0);
    const batch = { batch: fish };
    const color = [0x72a89f, 0xa9b89b, 0x559eaa][i % 3];
    part(fish, 'rock', color, 0, 0, 0, 0.125, 0.115, 0.30, batch);
    part(fish, 'gable', color, 0, 0, -0.27, 0.14, 0.25, 0.044,
      { ...batch, rotation: [-Math.PI / 2, 0, 0] });
    return fish;
  });
  const poseSeller = buildVillager(kit, sellerSite, terrain.getGroundHeight,
    { name: 'Fish seller', yaw: Math.PI / 2, coat: 0x38716e, apron: 0xd1b180, hair: 0x743f34 });
  const coins = group('Fish sale coins', sellerSite.x, 1.30, sellerSite.z);
  for (let i = -1; i <= 1; i++) {
    part(coins, 'drum', 0xeeb743, i * 0.19, 0.10 - Math.abs(i) * 0.10, 0, 0.083, 0.028, 0.083,
      { batch: coins, rotation: [Math.PI / 2, 0, 0] });
  }

  let state = 'no rod';
  let count = 0;
  let timer = 0;
  let celebration = 0;
  const isFishing = () => state === 'casting' || state === 'waiting' || state === 'bite';
  function useRod() {
    if (state === 'no rod') {
      scene.add(rod);
      rod.position.set(rackSite.x - 0.68, 0.59, rackSite.z - 0.035);
      rod.rotation.set(0, 0, -1.44);
      rod.scale.setScalar(0.83);
    } else if (isFishing()) {
      scene.add(rod);
      rod.position.set(pierSite.x + 0.43, 0.32, pierSite.z - 0.38);
      rod.rotation.set(-0.73, 0, -0.13);
      rod.scale.setScalar(1);
    } else {
      (viewmodel ?? scene).add(rod);
      rod.position.set(0.29, -0.41, -0.63);
      rod.rotation.set(-1.04, 0, -0.19);
      rod.scale.setScalar(0.59);
    }
    rod.visible = state !== 'sold';
    bobber.visible = line.visible = isFishing();
  }

  function poseLine(still, elapsed) {
    rod.localToWorld(worldTip.copy(tip));
    const cast = state === 'casting' && !still ? 1 - timer / castDuration : 1;
    const nibble = state === 'bite' ? (still ? -0.036 : -0.06 + 0.064 * Math.sin(elapsed * 19)) : 0;
    const water = SEA_LEVEL + 0.024 + nibble + (still ? 0 : Math.sin(elapsed * 3) * 0.022);
    bobber.position.set(THREE.MathUtils.lerp(worldTip.x, floatX, cast),
      THREE.MathUtils.lerp(worldTip.y, water, cast) + Math.sin(cast * Math.PI) * 0.52,
      THREE.MathUtils.lerp(worldTip.z, floatZ, cast));
    points.setXYZ(0, worldTip.x, worldTip.y, worldTip.z);
    points.setXYZ(1, (worldTip.x + bobber.position.x) / 2, (worldTip.y + bobber.position.y) / 2 - 0.20,
      (worldTip.z + bobber.position.z) / 2);
    points.setXYZ(2, bobber.position.x, bobber.position.y + 0.14, bobber.position.z);
    points.needsUpdate = true;
  }

  function pose(elapsed, still) {
    const time = still ? 0 : elapsed;
    schools.forEach((fish, i) => {
      const phase = time * (0.52 + i * 0.03) + i * 1.23;
      fish.position.set(floatX - 0.88 + Math.cos(phase) * (0.77 + i * 0.28),
        SEA_LEVEL - 0.063 + Math.sin(phase * 2) * 0.014, floatZ + Math.sin(phase) * 0.94);
      fish.rotation.y = Math.atan2(-Math.sin(phase) * (0.77 + i * 0.28), Math.cos(phase) * 0.94);
    });
    poseSeller(time, still);
    if (isFishing()) poseLine(still, time);
    coins.visible = celebration > 0;
    coins.rotation.y = still ? 0 : (1.1 - celebration) * 5;
    coins.position.y = 1.30 + (still ? 0 : (1.1 - celebration) * 0.65);
  }

  const interactions = [{
    ...rackSite, radius: 1.55, anchorY: 0.8, label: 'Pick Up Fishing Rod',
    get active() { return isActive() && state === 'no rod'; },
    act() {
      if (!this.active) return;
      state = 'ready';
      useRod();
      notify('Take the rod to the marked fishing spot.');
    },
  }, {
    ...pierSite, radius: 1.85, anchorY: 1.12, silent: true,
    get label() { return state === 'bite' ? 'Reel In!' : 'Cast Fishing Line'; },
    get active() { return isActive() && count < fishNeeded && (state === 'ready' || state === 'bite'); },
    act() {
      if (!this.active) return;
      if (state === 'bite') {
        count++;
        state = 'ready';
        useRod();
        playCue(catchCue);
        notify(count === fishNeeded ? 'Three fish caught!' : 'You caught a fish! Cast again when you’re ready.');
        return;
      }
      state = 'casting';
      timer = castDuration;
      useRod();
      poseLine(false, 0);
      notify('Watch the bobber and reel in when a fish bites.');
    },
  }, {
    ...sellerSite, radius: 1.65, anchorY: 1.35,
    get label() { return count === fishNeeded ? 'Sell 3 Fish' : 'Talk to Fish Seller'; },
    get active() { return isActive() && state !== 'sold'; },
    act() {
      if (!this.active) return;
      if (count < fishNeeded) {
        notify('Fish seller: Bring me three fish. There’s a rod on the fishing pier!');
        return;
      }
      state = 'sold';
      celebration = 1.1;
      coins.visible = true;
      useRod();
      playCue(coinsCue);
      notify('Fish seller: Thank you for the fresh fish!');
      onComplete();
    },
  }];

  return {
    interactions,
    get complete() { return state === 'sold'; },
    get progress() { return `Catch and sell fish · ${count}/${fishNeeded}${state === 'sold' ? ' ✓' : ''}`; },
    get hint() { return count === fishNeeded && state !== 'sold' ? 'Take your fish to the Fish Shop.' : ''; },
    reset() {
      state = 'no rod';
      count = timer = celebration = 0;
      useRod();
      pose(0, true);
    },
    update(dt, player, elapsed, still) {
      if (isFishing() && player && Math.hypot(player.x - pierSite.x, player.z - pierSite.z) > 2.05) {
        state = 'ready';
        useRod();
      }
      if (isFishing()) {
        timer -= dt;
        while (isFishing() && timer <= 0) {
          if (state === 'casting') {
            state = 'waiting';
            timer += 2.0 + count * 0.4;
          } else if (state === 'waiting') {
            state = 'bite';
            timer += biteDuration;
            playCue(biteCue);
            notify('A fish is biting! Reel in.');
          } else {
            state = 'ready';
            useRod();
            notify('The fish slipped away. Cast again to try again!');
          }
        }
      }
      celebration = Math.max(0, celebration - dt);
      pose(elapsed, still);
    },
  };
}
