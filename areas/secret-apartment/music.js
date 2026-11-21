// Sparse, slowly shifting tones for the basement and upper floors.
export const music = {
  beat: 0.81,
  bars: [
    { chord: [38, 50, 57, 64], melody: [[1.05, 69], [2.55, 65]] },
    { chord: [41, 53, 60, 64], melody: [[0.65, 72]] },
    { chord: [36, 48, 55, 62], melody: [[2.05, 62]] },
    { chord: [40, 52, 59, 65], melody: [[0.8, 71], [2.35, 67]] },
    { chord: [43, 50, 58, 65], melody: [] },
    { chord: [38, 50, 57, 62], melody: [[0.45, 66], [2, 62]] },
  ],
  accompaniment: [
    { voices: [0], duration: 3.82, attack: 0.49, level: 0.073 },
    { voices: [1, 2, 3], offset: 0.34, spread: 0.48, duration: 2.65, attack: 0.38, level: 0.039 },
  ],
  melody: [
    { duration: 1.3, attack: 0.17, level: 0.08 },
    { offset: 0.21, transpose: 12, duration: 0.72, attack: 0.11, level: 0.014 },
  ],
};
