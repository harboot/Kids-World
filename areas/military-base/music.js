// A measured exploration theme with soft, pitch-bent percussion.
export const music = {
  beat: 0.51,
  bars: [
    { chord: [48, 55, 60, 63], melody: [[0.5, 67], [2, 63], [3, 65]] },
    { chord: [46, 53, 58, 62], melody: [[0, 62], [1.5, 65], [2.75, 69]] },
    { chord: [41, 48, 57, 60], melody: [[0.5, 72], [1.75, 69], [3, 67]] },
    { chord: [43, 50, 58, 62], melody: [[0.25, 65], [1.75, 62], [3.05, 67]] },
    { chord: [48, 55, 60, 63], melody: [[0.25, 72], [1.5, 75], [2.7, 70]] },
    { chord: [46, 53, 58, 62], melody: [[0.5, 69], [2, 65], [3, 62]] },
    { chord: [41, 48, 57, 60], melody: [[0.25, 60], [1.35, 65], [2.65, 69]] },
    { chord: [48, 55, 60, 67], melody: [[0.25, 67], [1.75, 72], [2.85, 60]] },
  ],
  accompaniment: [
    { voices: [0], duration: 1.6, attack: 0.07, level: 0.115, wave: 'triangle' },
    { voices: [0], offset: 2, duration: 1.4, attack: 0.056, level: 0.089 },
    { voices: [1, 2, 3], offset: 0.25, spread: 0.24, duration: 3, attack: 0.23, level: 0.033 },
  ],
  melody: [
    { duration: 0.88, attack: 0.083, level: 0.092, wave: 'triangle' },
    { transpose: -12, duration: 0.69, attack: 0.095, level: 0.037 },
  ],
  rhythm: [
    { notes: [[0, 36], [2.5, 36]], endPitch: 27, duration: 0.24, attack: 0.008, level: 0.15 },
    { notes: [[1.5, 53], [3.5, 53]], endPitch: 40, duration: 0.13, attack: 0.004, level: 0.045, wave: 'triangle' },
  ],
};
