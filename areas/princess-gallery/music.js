// A soft waltz with bell overtones and a sustained accompaniment.
export const music = {
  beat: 0.59,
  beatsPerBar: 3,
  bars: [
    { chord: [49, 56, 60, 65], melody: [[0.25, 77], [1.2, 84], [2.05, 80]] },
    { chord: [41, 53, 60, 68], melody: [[0, 75], [1.05, 80], [2.1, 77]] },
    { chord: [42, 54, 61, 65], melody: [[0.4, 85], [1.45, 87], [2.2, 84]] },
    { chord: [51, 58, 61, 66], melody: [[0.2, 82], [1.65, 78]] },
    { chord: [46, 58, 61, 65], melody: [[0, 77], [0.95, 82], [2.05, 85]] },
    { chord: [42, 54, 61, 70], melody: [[0.3, 89], [1.4, 85], [2.2, 82]] },
    { chord: [44, 56, 63, 70], melody: [[0.15, 80], [1.15, 75], [2.1, 72]] },
    { chord: [49, 56, 60, 65], melody: [[0.4, 73], [1.55, 77]] },
  ],
  accompaniment: [
    { voices: [0, 1], spread: 0.1, duration: 2.78, attack: 0.22, level: 0.058 },
    { voices: [1, 2, 3], offset: 0.7, spread: 0.49, duration: 0.92, attack: 0.065, level: 0.045, wave: 'triangle' },
  ],
  melody: [
    { duration: 0.78, attack: 0.021, level: 0.105 },
    { transpose: 12, duration: 0.48, attack: 0.01, level: 0.026 },
    { transpose: 19, duration: 0.28, attack: 0.007, level: 0.013 },
  ],
};
