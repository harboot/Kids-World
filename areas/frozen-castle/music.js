const beat = 0.73;

export const music = {
  beat,
  bars: [
    { chord: [47, 54, 58, 61], melody: [[0.25, 78], [1.4, 85], [2.65, 82]] },
    { chord: [44, 51, 59, 66], melody: [[0.5, 80], [2, 83], [2.8, 90]] },
    { chord: [42, 49, 58, 63], melody: [[0.2, 87], [1.75, 82], [2.72, 85]] },
    { chord: [49, 56, 61, 68], melody: [[0.65, 80], [1.8, 76], [2.7, 78]] },
  ],
  accompaniment: [
    { voices: [0, 1, 2, 3], spread: 0.055 / beat, duration: 3.8, attack: 0.28, level: 0.046 },
  ],
  melody: [
    { duration: 1.12, level: 0.12 },
    { delay: 0.12, transpose: 12, duration: 0.57, level: 0.035 },
  ],
};
