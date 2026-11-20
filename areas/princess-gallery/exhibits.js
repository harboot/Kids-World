import { buildRapunzel } from './rapunzel.js';

const roster = [
  ['rapunzel', 'Rapunzel', 0x9669ad, buildRapunzel],
  ['snow-white', 'Snow White and the Seven Dwarfs', 0xbb5c67],
  ['cinderella', 'Cinderella', 0x799fc8],
  ['aurora', 'Aurora — Sleeping Beauty', 0xcb7ca0],
  ['ariel', 'Ariel — The Little Mermaid', 0x6fa3a4],
  ['belle', 'Belle — Beauty and the Beast', 0xc99856],
  ['jasmine', 'Jasmine — Aladdin', 0x5ea99b],
  ['mulan', 'Mulan', 0xb85d75],
  ['tiana', 'Tiana — The Princess and the Frog', 0x85a358],
  ['moana', 'Moana', 0x638eac],
];

export const GALLERY_WIDTH = 58;
export const GALLERY_DEPTH = 120;
export const EXHIBIT_HEIGHT = 21;
export const CORRIDOR_WIDTH = 12;
export const EXHIBIT_WIDTH = 20;
export const EXHIBIT_DEPTH = (GALLERY_WIDTH - CORRIDOR_WIDTH) / 2;
export const LOBBY_START = 49;
export const END_HALL_START = LOBBY_START - 5 * EXHIBIT_WIDTH;

export const exhibits = roster.map(([id, title, accent, build], index) => {
  const side = index % 2 === 0 ? -1 : 1;
  return {
    id, title, accent, build,
    status: build ? 'complete' : 'coming-soon',
    position: {
      x: side * (CORRIDOR_WIDTH + EXHIBIT_DEPTH) / 2,
      z: LOBBY_START - (Math.floor(index / 2) + 0.5) * EXHIBIT_WIDTH,
    },
    rotation: -side * Math.PI / 2,
    bounds: { width: EXHIBIT_WIDTH, depth: EXHIBIT_DEPTH, height: EXHIBIT_HEIGHT },
  };
});
