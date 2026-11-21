export const music = {
  beat: 0.47,
  bars: [
    { chord: [55, 59, 62], melody: [[0, 67], [0.75, 71], [1.5, 74], [2.5, 71], [3.25, 69]] },
    { chord: [48, 55, 60], melody: [[0, 67], [0.75, 64], [1.5, 67], [2.25, 72], [3.25, 71]] },
    { chord: [52, 55, 59], melody: [[0, 71], [0.75, 67], [1.5, 64], [2.5, 67], [3.25, 69]] },
    { chord: [50, 57, 62], melody: [[0, 66], [0.75, 69], [1.5, 74], [2.5, 69], [3.25, 66]] },
  ],
  accompaniment: [
    { voices: [0], duration: 0.74, level: 0.15, wave: 'triangle' },
    { voices: [0], offset: 2, transpose: -12, duration: 0.83, level: 0.13, wave: 'triangle' },
    { voices: [1, 2], offset: 1.25, spread: 1.65, duration: 0.68, level: 0.085 },
  ],
  melody: [
    { duration: 0.67, level: 0.125, wave: 'triangle' },
    { transpose: 12, duration: 0.24, level: 0.045 },
  ],
};
