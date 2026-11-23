export const music = {
  beat: .57,
  bars: [
    { chord: [38, 50, 57, 64], melody: [[.5, 69], [1.5, 72], [2.2, 65], [3.35, 62]] },
    { chord: [41, 53, 60, 65], melody: [[.35, 72], [1.25, 77], [2, 76], [3.20, 69]] },
    { chord: [36, 48, 55, 62], melody: [[.72, 67], [1.67, 71], [2.42, 74], [3.3, 67]] },
    { chord: [40, 52, 59, 65], melody: [[0, 71], [1.10, 76], [2.37, 72], [3.30, 64]] },
    { chord: [43, 50, 58, 65], melody: [[.59, 74], [1.45, 79], [2.43, 77], [3.32, 70]] },
    { chord: [38, 50, 57, 62], melody: [[.44, 69], [1.22, 65], [2.10, 62], [3.23, 65]] },
    { chord: [46, 53, 60, 65], melody: [[0, 77], [.78, 74], [1.92, 72], [3.12, 70]] },
    { chord: [45, 52, 58, 64], melody: [[.57, 76], [1.48, 72], [2.31, 67], [3.29, 64]] },
  ],
  accompaniment: [
    { voices: [0], duration: 1.9, attack: .07, level: .106, wave: 'triangle' },
    { voices: [1], offset: 2.06, duration: 1.31, attack: .075, level: .088, wave: 'triangle' },
    { voices: [1, 2, 3], offset: .35, spread: .39, duration: 1.92, attack: .18, level: .068 },
    { voices: [2, 3], offset: 2.37, spread: .43, duration: 1.07, attack: .049, level: .048, wave: 'triangle' },
  ],
  melody: [
    { duration: .63, attack: .046, level: .106, wave: 'triangle' },
    { offset: .17, transpose: 12, duration: .42, attack: .075, level: .028 },
  ],
  rhythm: [
    { notes: [[0, 38], [2.12, 42]], duration: .20, attack: .008, level: .039, wave: 'triangle' },
    { notes: [[1.04, 95], [2.51, 92], [3.22, 96]], duration: .10, attack: .007, level: .017 },
  ],
};
