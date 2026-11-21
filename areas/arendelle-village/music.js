// A lilting six-beat folk tune with picked accompaniment.
export const music = {
  beat: 0.29,
  beatsPerBar: 6,
  bars: [
    { chord: [43, 55, 59, 62], melody: [[0.5, 69], [1.5, 74], [3, 71], [4, 67], [5, 69]] },
    { chord: [40, 52, 59, 64], melody: [[0, 76], [1.5, 74], [2.5, 71], [4, 67]] },
    { chord: [45, 57, 60, 64], melody: [[0.5, 72], [2, 76], [3.5, 74], [4.5, 72], [5.25, 69]] },
    { chord: [50, 57, 62, 66], melody: [[0, 66], [2, 69], [3, 74], [4.5, 69]] },
    { chord: [43, 55, 59, 62], melody: [[0, 71], [1, 74], [2, 79], [4, 76], [5, 74]] },
    { chord: [48, 55, 60, 64], melody: [[0.5, 72], [1.75, 67], [3, 76], [4.5, 72]] },
    { chord: [50, 57, 62, 66], melody: [[0.5, 69], [1.75, 74], [3.25, 78], [4.5, 76], [5.25, 74]] },
    { chord: [43, 55, 59, 62], melody: [[0, 71], [1.5, 69], [3.5, 67]] },
  ],
  accompaniment: [
    { voices: [0], duration: 1.7, level: 0.115, wave: 'triangle' },
    { voices: [1, 2, 3], offset: 1, spread: 1.4, duration: 0.95, level: 0.06, wave: 'triangle' },
    { voices: [0], offset: 3, transpose: 12, duration: 1.45, level: 0.075 },
  ],
  melody: [
    { duration: 0.74, attack: 0.019, level: 0.13, wave: 'triangle' },
    { duration: 0.51, attack: 0.029, level: 0.05 },
  ],
};
