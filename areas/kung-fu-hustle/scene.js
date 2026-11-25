import { seededRandom } from '../../core/random.js';
import { damagedRearWall } from './damage.js';
import { courtyard } from './courtyard.js';
import { buildCoolie } from './coolie.js';
import { craterPolygon, craterContains } from './hand-of-god.js';
import { buildBeast } from './the-beast.js';
import { marketRow } from './market.js';
import { buildResident, buildResidentWindow, residentWindow } from './resident.js';
import { floorRise, gallery, galleryBreaches, guardCaps, stair, stories, wingX } from './layout.js';
import { crack, exposedBrick, ink, laundry, masonryKit, roof } from './masonry.js';

function doorsAndWindows(face, x, y, hasAwning, hasDoor) {
  if (hasDoor) {
    face(ink.shade, x, y + 1.13, .035, 1.22, 2.26, .10);
    face(ink.wood, x, y + 1.115, .107, 1.09, 2.20, .075);
    for (const side of [-1, 1]) {
      face(ink.door, x + side * .255, y + .97, .154, .45, 1.81, .045);
      face(ink.wood, x + side * .255, y + .61, .183, .30, .53, .026);
      face(ink.dark, x + side * .255, y + 1.53, .183, .31, .44, .026);
      face(ink.brass, x + side * .08, y + 1.04, .208, .052, .12, .04);
    }
    face(ink.band, x, y + 2.31, .065, 1.39, .10, .24);
  }

  const windowX = x + 1.62;
  face(ink.shade, windowX, y + 1.61, .045, 1.16, 1.22, .13);
  face(ink.green, windowX, y + 1.61, .12, 1.02, 1.09, .06);
  for (const dx of [-.30, 0, .30]) {
    for (const dy of [-.25, .23]) face(ink.pane, windowX + dx, y + 1.61 + dy, .155, .245, .415, .025);
  }
  face(ink.band, windowX, y + .985, .13, 1.26, .11, .27);
  if (hasAwning) {
    for (let stripe = -3; stripe <= 3; stripe++) {
      const paint = stripe % 2 === 0 ? ink.linen : ink.oxblood;
      face(paint, windowX + stripe * .20, y + 2.30, .38, .199, .055, .75, .24);
      face(paint, windowX + stripe * .20, y + 2.17, .744, .199, .13, .045);
    }
  }
}

function apartmentFacade(draw, span, bays, random, { damaged = false, occupiedWindow = false } = {}) {
  const spacing = span / bays;
  for (let level = 1; level < stories; level++) {
    const y = level * floorRise;
    const strips = damaged ? [[-span / 2, 5.8], [12.65, span / 2]] : [[-span / 2, span / 2]];
    for (const [left, right] of strips) {
      draw(ink.band, (left + right) / 2, y + .12, .026, right - left, .24, .052);
      draw(ink.shade, (left + right) / 2, y + floorRise - .30, .037, right - left, .29, .09);
    }
    for (let bay = 0; bay < bays; bay++) {
      const center = -span / 2 + (bay + .5) * spacing;
      if (damaged && center > 4.1) continue;
      if (occupiedWindow && level === stories - 1 && bay === 0) continue;
      draw.chip(bay % 2 ? 0x9d826c : 0xab8c72, center + .29, y + 1.03, .012, spacing * .86, 2.08, .11);
      if ((bay + level) % 3 !== 1) {
        exposedBrick(draw, center + (bay % 2 ? 1.55 : -.40), y + .78 + random() * .32,
          1.2 + random() * .75, 1.12 + random() * .48, random);
      }
      if ((bay + level) % 3 === 0) crack(draw, center + 1.59, y + 1.13, 1.64, bay % 2 ? 1 : -1);
      doorsAndWindows(draw, center - .72, y, (bay + level * 2) % 4 === 1, bay > 0 && bay < bays - 1);
      if ((bay + level * 2) % 5 === 2) {
        draw(0x85674f, center + .90, y + 1.50, .178, .99, .19, .058, 0, -.13);
        draw(0x9d7b5c, center + .90, y + 1.79, .189, .98, .16, .051, 0, .10);
      }
    }
    if (level > 0) laundry(draw, spacing * (level % 2 ? -.55 : .66), y + 2.15, 3.13, level + bays);
  }
}

function tenement(kit, layout, random) {
  const { box, wall } = kit;
  const height = stories * floorRise;
  const sideX = 17.05;
  const wingsZ = -1;
  damagedRearWall(kit, layout, height, random);
  marketRow(kit, layout, { x: 0, z: gallery.rear, yaw: 0, span: 37.5, bays: 9, depth: 4.3 }, random);
  apartmentFacade(wall(0, gallery.rear, 0), gallery.outer * 2, 7, random, { damaged: true });
  for (const x of [-11.95, -8, -1.60, 8, 11.95]) {
    const postHeight = x === -1.60 ? height : floorRise * (x === 8 ? 2 : 3) - .09;
    box(ink.band, x, postHeight / 2, -7.59, .28, postHeight, .30);
    layout.solid(x, -7.59, .28, .30, postHeight);
  }
  for (const [x, y, stub] of [[-4, 0, .83], [4, floorRise, .55], [-4, floorRise * 2, .64], [11.92, floorRise * 3, .61]]) {
    box(ink.band, x, y + stub / 2, -7.56, .33, stub, .31, 0, 0, .045);
    box(0x6e6157, x + .014, y + stub + .012, -7.55, .29, .065, .27, 0, 0, -.19);
    if (y === 0) layout.solid(x, -7.56, .33, .31, stub);
  }

  roof(wall(0, -11.65, 0), 38.6, 9.3, height - .04, random);
  const rear = wall(0, -14.80, Math.PI);
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 3.9;
    if (x < -4.6 && x > -13.9) continue;
    exposedBrick(rear, x, 1.4 + random() * 7.7, 2.7, 2.0, random);
    crack(rear, x + .6, 2 + random() * 7.5, 1.8);
  }

  for (const side of [-1, 1]) {
    kit.gable(ink.cream, side * 18.75, height - .04, -11.65, 8.8, 1.33, .13, -side * Math.PI / 2);
    kit.wing(side, () => {
      if (side < 0) {
        kit.extrude('West wing wall', 0xbba189,
          [[-gallery.front, floorRise], [-gallery.rear, floorRise], [-gallery.rear, height], [-gallery.front, height]],
          3.4, -18.75, 0, 0, Math.PI / 2, [residentWindow.aperture]);
        buildResidentWindow(kit, random);
      } else {
        box(0xc3a88b, sideX, (height + floorRise) / 2, wingsZ, 3.4, height - floorRise, 19);
      }
      const yaw = -side * Math.PI / 2;
      marketRow(kit, layout, { x: side * gallery.outer, z: wingsZ, yaw, span: 19, bays: 4, depth: 3.4, side }, random);
      layout.addBarrier((x, z, radius, feet) => {
        const wallX = wingX(-side, x, z) * side;
        return feet >= floorRise && feet < height && z >= gallery.rear - radius && z <= gallery.front + radius &&
          wallX >= gallery.outer - radius && wallX <= 18.75 + radius;
      });
      apartmentFacade(wall(side * gallery.outer, wingsZ, -side * Math.PI / 2), 19, 4, random, { occupiedWindow: side < 0 });
      const outer = wall(side * 18.75, wingsZ, side * Math.PI / 2);
      for (const z of [-6.4, -1.9, 3.1, 6.4]) {
        exposedBrick(outer, z, 1.9 + random() * 7, 2.6, 2.5, random);
        crack(outer, z, .9 + random() * 8, 2.3);
      }

      for (const [z, postHeight] of [[-5.35, height], [.95, floorRise * 2], [7.95, floorRise]]) {
        const x = side * (stair.outer + .12);
        box(ink.band, x, postHeight / 2, z, .26, postHeight, .31);
        layout.solid(x, z, .26, .31, postHeight, side);
      }
      box(ink.band, side * (stair.outer + .12), 7.0, 7.95, .33, .58, .32, 0, 0, side * .08);

      const end = wall(side * sideX, gallery.front, 0);
      end(ink.band, 0, .24, .045, 3.42, .48, .08);
      for (let level = 1; level < stories; level++) {
        const y = level * floorRise;
        end.chip(0xb29173, side * .49, y + 1.61, .013, 2.25, 3.04, .25);
        exposedBrick(end, side * (level % 2 ? -.89 : .94), y + 1.24,
          1.18 + random() * .24, 1.65 + random() * .58, random);
        crack(end, side * .91, y + .92, 1.89, side);
        end(ink.green, 0, y + 1.62, .061, 1.13, 1.22, .13);
        for (const x of [-.34, 0, .34]) end(ink.pane, x, y + 1.62, .14, .24, .98, .039);
        end(ink.band, 0, y + 1, .135, 1.45, .13, .28);
        end(0x957455, 0, y + 2.29, .23, 1.54, .08, .55, .24);
      }

      kit.gable(ink.plaster, side * 15.7, height - .04, gallery.front, 6.8, 1.04, .16);
      roof(wall(side * 15.7, .57, Math.PI / 2), 17.02, 7.07, height - .04, random);
    });
  }

  // Rooftop additions sit on the old tiled block.
  for (const [x, z, width, heightOffset] of [[-5.9, -12.68, 1.75, 1.96], [8.15, -11.86, 2.45, 2.25]]) {
    box(0xa88e74, x, height + heightOffset / 2 + .38, z, width, heightOffset, 1.53);
    const hut = wall(x, z + .77, 0);
    hut(ink.wood, .13, height + heightOffset - .05, .04, .82, .68, .10);
    hut(ink.pane, .13, height + heightOffset - .05, .105, .64, .53, .044);
    exposedBrick(hut, -.46, height + heightOffset - .49, .66, .73, random);
    roof(wall(x, z, 0), width + .28, 1.69, height + heightOffset + .42, random);
  }
  for (const [x, z, base] of [[-15.2, -12.3, 14.05], [14.8, -12.2, 14.02], [25.4, 12.7, 0]]) {
    const top = base + (base === 0 ? 5.7 : 2.55);
    box(0x725644, x, (base + top) / 2, z, .13, top - base, .13, 0, 0, .045);
    for (const y of [top - .25, top - .66]) {
      box(0x725644, x, y, z, 1.04, .093, .11, 0, 0, -.03);
      for (const dx of [-.44, .44]) box(ink.band, x + dx, y + .083, z, .069, .16, .072);
    }
    if (base === 0) layout.solid(x, z, .13, .13, top);
  }

  // Raised center dormer and the roof tank give the compound a recognizable silhouette.
  const dormer = wall(0, -11.36, 0);
  dormer(ink.plaster, 0, height + 1.82, .10, 5.15, 2.15, 2.85);
  dormer(ink.cream, 0, height + 2.96, .10, 3.52, .37, 2.93);
  dormer(ink.band, 0, height + 3.20, .10, 2.15, .17, 2.98);
  dormer(ink.band, 0, height + 2.79, 1.57, 3.10, .11, .19);
  kit.drum(ink.band, 0, height + 2.20, -9.74, 1.21, .11, 1.21, 0, Math.PI / 2);
  kit.drum(ink.cream, 0, height + 2.20, -9.67, 1.04, .09, 1.04, 0, Math.PI / 2);
  const dormerFace = wall(0, -9.83, 0);
  crack(dormerFace, .74, height + 1.35, .94);
  const tankX = -10.6;
  const tankZ = -12.2;
  for (const x of [-.64, .64]) {
    for (const z of [-.55, .55]) box(ink.wood, tankX + x, height + 2.05, tankZ + z, .14, 1.86, .14);
    kit.beam(ink.wood, tankX + x, height + 1.3, tankZ - .55, tankX + x, height + 2.88, tankZ + .55, .11);
  }
  kit.drum(ink.iron, tankX, height + 3.62, tankZ, 1.8, 1.43, 1.8);
  for (const y of [3, 3.57, 4.24]) kit.drum(ink.ridge, tankX, height + y, tankZ, 1.86, .072, 1.86);
  kit.drum(ink.roof, tankX, height + 4.39, tankZ, 1.92, .19, 1.92);
}

function walkways(kit, layout) {
  const { box, beam } = kit;
  const joint = .024;
  for (const patch of layout.surfaces) {
    const { x, z, width, depth, low, high, left, right, back, side, axis } = patch;
    kit.wing(side, () => {
      if (low === high) {
        if (low > 0) box(ink.stone, x, low - gallery.slab / 2, z, width - 2 * joint, gallery.slab, depth - 2 * joint);
        return;
      }

      const alongX = axis === 'x';
      const span = (alongX ? width : depth) - 2 * joint;
      const rise = high - low;
      const steps = Math.ceil(rise / .18);
      const profile = [[0, -gallery.slab]];
      for (let i = 0; i < steps; i++) {
        const y = (i + 1) * rise / steps;
        profile.push([i * span / steps, y], [(i + 1) * span / steps, y]);
      }
      profile.push([span, rise - gallery.slab]);

      // Each flight is one stepped shell. Its underside and treads share edges.
      kit.extrude('Stair flight', ink.stone, profile, (alongX ? depth : width) - 2 * joint,
        alongX ? right - joint : left + joint, low, back - joint, alongX ? Math.PI : Math.PI / 2);
    });
  }

  // Jagged broken slab edges, confined to intact floor so no decorative bridge
  // or collision surface projects into the missing corridor.
  for (const { y, left, right } of galleryBreaches) {
    for (const [edge, direction] of [[left,-1],[right,1]]) {
      for (let i=0;i<7;i++){
        const z=gallery.rear+.20+i*.42;
        const size=.13+(i%3)*.065;
        box(i%3===0?ink.brick:ink.stone,edge+direction*(size*.52+.024),
          y-.11,z,size,.20,.32,0,.09*(i%2),direction*.16);
        if(i%2===0) box(ink.iron,edge+direction*.08,y-.12,z,.15,.035,.045,0,0,direction*.28);
      }
    }
  }
  const posts = new Set();
  for (const { x1, z1, x2, z2, low, high, length, repaired } of layout.guards) {
    const count = Math.ceil(length / (repaired ? 1.36 : .47));
    const inset = .10 / length;
    const cap = repaired ? guardCaps.iron : guardCaps.wood;
    const rails = [[repaired ? ink.iron : ink.wood, cap.offset, cap.width],
      repaired ? [ink.wood, .51, .069] : [ink.band, .32, .097]];
    for (const [paint, offset, width] of rails) {
      beam(paint,
        x1 + (x2 - x1) * inset, low + offset + (high - low) * inset, z1 + (z2 - z1) * inset,
        x2 - (x2 - x1) * inset, high + offset - (high - low) * inset, z2 - (z2 - z1) * inset, width);
    }
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const y = low + (high - low) * t;
      const key = [x, y, z].map(value => value.toFixed(3)).join(',');
      if (posts.has(key)) continue;
      posts.add(key);
      const major = i === 0 || i === count;
      if (repaired) {
        box(ink.iron, x, y + .53, z, .092, 1.07, .092);
        continue;
      }
      const width = major ? .24 : .138;
      const broken = !major && (i + Math.round(low / floorRise) * 3) % 11 === 4;
      if (broken) {
        box(ink.band, x, y + .31, z, width, .32, width, 0, 0, .13);
        continue;
      }
      box(major ? ink.band : (i % 3 === 1 ? 0x918676 : ink.stone), x, y + .57, z, width, 1.11, width);
    }
  }
}

export function buildCourtyard(THREE, scene, layout, touch) {
  const random = seededRandom(1748);
  const kit = masonryKit(THREE, scene);
  scene.background = new THREE.Color(0xd4c1ae);
  scene.fog = new THREE.FogExp2(0xd4c1ae, .015);
  scene.add(new THREE.HemisphereLight(0xffeee0, 0xa0988f, 1.65));
  const sun = new THREE.DirectionalLight(0xffe0ba, 1.94);
  sun.position.set(-24, 34, 24);
  sun.castShadow = true;
  const shadow = sun.shadow;
  shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(shadow.camera, { left: -36, right: 36, bottom: -26, top: 26, near: 8, far: 88 });
  shadow.normalBias = touch ? .14 : .06;
  shadow.bias = touch ? -.00065 : -.00038;
  scene.add(sun);

  tenement(kit, layout, random);
  const resident = buildResident(THREE, kit, scene);
  walkways(kit, layout);
  // Keep the removable ground cover and nearby paving separate from static batches.
  const cover = new THREE.Group(); cover.name = 'Handprint removable ground cover'; scene.add(cover);
  const coverKit = masonryKit(THREE, cover);
  courtyard(kit, layout, random, coverKit, craterPolygon);
  coverKit.finish();
  let craterOpen=false;
  layout.addBarrier((x,z,radius,feet)=>craterOpen&&feet<.25&&craterContains(x,z,radius));
  function setCraterOpen(value){craterOpen=value;cover.visible=!value;}
  const coolie = buildCoolie(THREE, scene, layout);
  const beast = buildBeast(THREE, scene, layout);

  // A muted skyline sits outside the playable compound.
  // Leave the underground impact zone clear of the skyline base slab.
  const minX=-6,maxX=6,minZ=2,maxZ=14;
  for(const [a,b,d,e] of [[-80,minX,-80,80],[maxX,80,-80,80],[minX,maxX,-80,minZ],[minX,maxX,maxZ,80]])
    kit.box(0xbfa28f,(a+b)/2,-.42,(d+e)/2,b-a,.42,e-d,0,0,0,false);
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    const distance = 54 + random() * 14;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 3.2 + random() * 5.8;
    const width = 4.4 + random() * 4;
    const paint = i % 3 === 0 ? 0xa58e82 : 0xb39a8a;
    kit.box(paint, x, height / 2, z, width, height, 5, 0, 0, 0, false);
    kit.box(0x8b7c79, x, height, z, width + .34, .26, 5.24, 0, 0, 0, false);
  }
  kit.finish();
  return { beast, setCraterOpen, update(dt, player) { coolie.update(dt, player); resident.update(dt, player); beast.update(dt, player); } };
}
