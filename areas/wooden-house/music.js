export const music = {
  beat: .46,
  bars: [
    { chord: [45, 52, 57, 61], melody: [[0, 69], [.75, 73], [1.5, 76], [2.25, 73], [3.25, 69]] },
    { chord: [42, 49, 57, 61], melody: [[0, 78], [.5, 76], [1.25, 73], [2, 69], [3, 73], [3.5, 76]] },
    { chord: [38, 45, 54, 57], melody: [[0, 74], [.75, 78], [1.5, 81], [2.25, 78], [3.25, 74]] },
    { chord: [40, 47, 56, 59], melody: [[0, 76], [.75, 74], [1.5, 71], [2, 68], [3, 71]] },
    { chord: [45, 52, 57, 61], melody: [[0, 81], [.5, 80], [1, 76], [1.75, 73], [2.5, 76], [3.25, 69]] },
    { chord: [37, 49, 56, 64], melody: [[0, 73], [.75, 76], [1.5, 80], [2.25, 76], [3, 73]] },
    { chord: [38, 45, 54, 57], melody: [[0, 74], [.5, 76], [1, 78], [1.75, 81], [2.5, 78], [3.25, 74]] },
    { chord: [40, 47, 56, 62], melody: [[0, 71], [.75, 76], [1.5, 74], [2.25, 71], [3, 68], [3.5, 71]] },
  ],
  accompaniment: [
    { voices: [0], duration: 1.65, attack: .035, level: .12, wave: 'triangle' },
    { voices: [1], offset: 2, duration: 1.05, attack: .027, level: .09, wave: 'triangle' },
    { voices: [2, 3, 1], offset: .53, spread: .42, duration: .78, level: .075 },
    { voices: [2, 3], offset: 2.46, spread: .47, duration: .77, level: .061, wave: 'triangle' },
  ],
  melody: [
    { duration: .56, attack: .016, level: .13, wave: 'triangle' },
    { transpose: 12, duration: .21, attack: .012, level: .038 },
  ],
  rhythm: [
    { notes: [[0, 43], [2, 45]], duration: .21, level: .039, wave: 'triangle' },
    { notes: [[1.03, 91], [2.54, 94], [3.53, 91]], duration: .12, attack: .006, level: .024 },
  ],
};
