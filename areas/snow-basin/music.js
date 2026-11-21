const beat = 0.66;

export const music = {
  beat,
  bars: [
    { chord: [50, 57, 65], melody: [[0.5, 81], [2, 77], [3, 76]] },
    { chord: [46, 53, 62], melody: [[0, 74], [1.75, 77], [2.75, 81]] },
    { chord: [53, 60, 69], melody: [[0.5, 84], [2, 81], [3, 79]] },
    { chord: [48, 55, 64], melody: [[0, 76], [1.5, 79], [2.75, 74]] },
  ],
  accompaniment: [
    { voices: [0, 1, 2], spread: 0.055 / beat, duration: 3.8, attack: 0.28, level: 0.055 },
  ],
  melody: [
    { duration: 0.82, level: 0.15 },
    { delay: 0.12, transpose: 12, duration: 0.57, level: 0.025 },
  ],
};
