export const music = {
  beat: 0.57,
  bars: [
    { chord: [45, 52, 57, 61], melody: [[0.5, 69], [1.75, 73], [2.75, 76]] },
    { chord: [42, 49, 57, 61], melody: [[0, 78], [1.5, 76], [2.75, 73]] },
    { chord: [38, 45, 54, 57], melody: [[0.5, 74], [1.5, 69], [2.5, 66]] },
    { chord: [40, 47, 56, 59], melody: [[0, 68], [1.75, 71], [2.75, 64]] },
  ],
  accompaniment: [
    { voices: [0], duration: 2.8, attack: 0.04, level: 0.13 },
    { voices: [1, 2, 3], offset: 0.34, spread: 0.34, duration: 2.8, attack: 0.04, level: 0.065, wave: 'triangle' },
  ],
  melody: [{ duration: 0.98, attack: 0.025, level: 0.13 }],
};
