export const music = {
  beat: .385,
  bars: [
    { chord: [55, 59, 62], melody: [[0, 67], [.5, 71], [1, 74], [1.75, 76], [2.5, 74], [3, 71], [3.5, 67]] },
    { chord: [48, 55, 64], melody: [[0, 72], [.75, 76], [1.5, 79], [2, 76], [2.75, 74], [3.5, 72]] },
    { chord: [52, 55, 59], melody: [[0, 71], [.5, 67], [1, 64], [1.75, 67], [2.5, 71], [3.25, 74]] },
    { chord: [50, 57, 66], melody: [[0, 69], [.5, 74], [1.25, 78], [2, 76], [2.5, 74], [3.25, 69]] },
    { chord: [55, 59, 62], melody: [[0, 79], [.5, 78], [1, 74], [1.75, 71], [2.25, 74], [3, 71], [3.5, 67]] },
    { chord: [52, 55, 59], melody: [[0, 76], [.75, 74], [1.5, 71], [2, 67], [2.75, 71], [3.5, 76]] },
    { chord: [48, 55, 64], melody: [[0, 72], [.5, 76], [1.25, 79], [1.75, 81], [2.5, 79], [3, 76], [3.5, 72]] },
    { chord: [50, 57, 66], melody: [[0, 74], [.75, 78], [1.5, 81], [2, 78], [2.5, 74], [3, 69], [3.5, 66]] },
  ],
  accompaniment: [
    { voices: [0], transpose: -12, duration: .8, level: .115, wave: 'triangle' },
    { voices: [1], offset: 2, transpose: -12, duration: .62, level: .099, wave: 'triangle' },
    { voices: [1, 2], offset: .52, spread: .75, duration: .27, level: .062, wave: 'triangle' },
    { voices: [2, 1], offset: 2.48, spread: .77, duration: .25, level: .054 },
  ],
  melody: [
    { duration: .42, level: .103, wave: 'triangle' },
    { transpose: 12, duration: .2, level: .028 },
  ],
  rhythm: [
    { notes: [[0, 41], [2, 44]], duration: .17, level: .062, attack: .004, wave: 'triangle' },
    { notes: [[.5, 96], [1.5, 91], [2.5, 96], [3.5, 91]], duration: .1, level: .025, attack: .003 },
  ],
};
