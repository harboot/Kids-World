import { buildAriel } from './ariel.js';
import { buildAurora } from './aurora.js';
import { buildBelle } from './belle.js';
import { buildCinderella } from './cinderella.js';
import { buildRapunzel } from './rapunzel.js';
import { buildSnowWhite } from './snow-white.js';
import { metadata } from './metadata.js';

export const GALLERY_WIDTH = metadata.width;
export const GALLERY_DEPTH = metadata.depth;

// Unit outlines, clockwise when viewed from above. The first edge always faces the visitor.
const outlines = {
  rectangle: [[-1, 1], [1, 1], [1, -1], [-1, -1]],
  chamfered: [[-.75, 1], [.75, 1], [1, .68], [1, -.55], [.70, -1], [-.73, -1], [-1, -.62], [-1, .65]],
  oval: [[-.47, 1], [.47, 1], [.80, .79], [1, .36], [1, -.25], [.78, -.72],
    [.40, -1], [-.40, -1], [-.78, -.72], [-1, -.25], [-1, .36], [-.80, .79]],
  polygon: [[-.68, 1], [.68, 1], [1, .35], [.92, -.65], [.42, -1], [-.73, -.95], [-1, -.25], [-.94, .51]],
  woodland: [[-.67, 1], [.71, 1], [.94, .62], [.86, .12], [1, -.43], [.72, -.91],
    [.13, -1], [-.57, -.94], [-1, -.64], [-.91, -.18], [-1, .27], [-.88, .72]],
  open: [[-.60, 1], [.65, 1], [1, .58], [.89, -.47], [.60, -1], [-.50, -.90], [-1, -.54], [-.88, .45]],
};

export const wings = {
  woodland: { title: 'Woodland Wing', accent: 0x62877a, path: '#7c9b87' },
  royal: { title: 'Royal Wing', accent: 0xa178a7, path: '#ab85ac' },
  adventure: { title: 'Adventure Wing', accent: 0x4a8294, path: '#6e9ea5' },
};

export const exhibits = [
  {
    id: 'rapunzel', title: 'Rapunzel', accent: 0x9669ad, wing: 'woodland',
    mission: 'Wave to Rapunzel from the observation platform',
    position: { x: -38, z: 40 }, rotation: Math.PI / 2,
    bounds: { width: 20, depth: 23, height: 21 }, shape: 'rectangle', entrance: 6.7,
    approach: [-16, 33], status: 'complete', build: buildRapunzel,
  },
  {
    id: 'snow-white', title: 'Snow White and the Seven Dwarfs', accent: 0xbb5c67, wing: 'woodland',
    mission: 'Greet a character in Snow White’s woodland',
    position: { x: -51, z: 6 }, rotation: 1.48,
    bounds: { width: 32, depth: 28, height: 22 }, shape: 'woodland', entrance: 8.2,
    approach: [-30, 7], status: 'complete', build: buildSnowWhite,
  },
  {
    id: 'aurora', title: 'Aurora — Sleeping Beauty', accent: 0xcb7ca0, wing: 'woodland',
    mission: 'Wake Aurora with the enchanted rose',
    position: { x: -49, z: -30 }, rotation: 1.14,
    bounds: { width: 23, depth: 24, height: 19 }, shape: 'oval', entrance: 6.3,
    approach: [-29, -18], status: 'complete', build: buildAurora,
  },
  {
    id: 'belle', title: 'Belle — Beauty and the Beast', accent: 0xc99856, wing: 'royal',
    mission: 'Watch Belle’s enchanted tea set dance',
    position: { x: -23, z: -44 }, rotation: .27,
    bounds: { width: 21, depth: 19, height: 19 }, shape: 'chamfered', entrance: 6.2,
    approach: [-17, -27], status: 'complete', build: buildBelle,
  },
  {
    id: 'cinderella', title: 'Cinderella', accent: 0x799fc8, wing: 'royal',
    mission: 'Make Cinderella’s glass slipper float',
    position: { x: 4, z: -45 }, rotation: -.13,
    bounds: { width: 27, depth: 23, height: 23 }, shape: 'chamfered', entrance: 7.8,
    approach: [3, -29], status: 'complete', build: buildCinderella,
  },
  {
    id: 'jasmine', title: 'Jasmine — Aladdin', accent: 0x5ea99b, wing: 'royal',
    mission: 'Discover Jasmine’s magic lamp', display: 'Magic Lamp',
    position: { x: 35, z: -43 }, rotation: -.60,
    bounds: { width: 23, depth: 21, height: 23 }, shape: 'polygon', entrance: 7.3,
    approach: [25, -24], status: 'coming-soon',
  },
  {
    id: 'mulan', title: 'Mulan', accent: 0xb85d75, wing: 'adventure',
    mission: 'Discover Mulan’s painted fan', display: 'Painted Fan',
    position: { x: 54, z: -17 }, rotation: -1.26,
    bounds: { width: 21, depth: 22, height: 18 }, shape: 'polygon', entrance: 6.3,
    approach: [34, -11], status: 'coming-soon',
  },
  {
    id: 'ariel', title: 'Ariel — The Little Mermaid', accent: 0x6fa3a4, wing: 'adventure',
    mission: 'Board the shipwreck to meet Ariel',
    position: { x: 53, z: 10 }, rotation: -1.49,
    bounds: { width: 24, depth: 22, height: 19 }, shape: 'oval', entrance: 7.4,
    approach: [33, 10], status: 'complete', build: buildAriel,
  },
  {
    id: 'moana', title: 'Moana', accent: 0x638eac, wing: 'adventure',
    mission: 'Discover Moana’s voyaging paddle', display: 'Voyaging Paddle',
    position: { x: 46, z: 40 }, rotation: -2.07,
    bounds: { width: 27, depth: 25, height: 22 }, shape: 'open', entrance: 8.8,
    approach: [26, 25], status: 'coming-soon',
  },
  {
    id: 'tiana', title: 'Tiana — The Princess and the Frog', accent: 0x85a358, wing: 'adventure',
    mission: 'Discover Tiana’s water lily', display: 'Water Lily',
    position: { x: 18, z: 47 }, rotation: -2.91,
    bounds: { width: 19, depth: 17, height: 17 }, shape: 'open', entrance: 6.5,
    approach: [11, 32], status: 'coming-soon',
  },
];

export function exhibitOutline({ bounds, shape }) {
  return outlines[shape].map(([x, z]) => [x * bounds.width / 2, z * bounds.depth / 2]);
}
