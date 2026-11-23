/**
 * Kung Fu Hustle — theme transcribed from the user-provided sheet.
 * 4/4, quarter note = 72 BPM, 15 bars (~50 seconds).
 *
 * A melody event is [beat offset, MIDI pitch, duration in beats].
 * Sustained notes that tie across a bar are represented as one event;
 * the following bar intentionally stays silent for that voice.
 */
const opening = [
  [0, 69, 0.5],
  [0.5, 70, 0.5],
  [1, 68, 0.5],
  [1.5, 66, 0.75],
  [2.25, 65, 0.75],
  [3, 63, 0.25],
  [3.25, 61, 0.25],
  [3.5, 62, 3.5],
];

export const music = {
  beat: 60 / 72,
  beatsPerBar: 4,
  bars: [
    { melody: opening },
    { melody: [] }, // Long D4 continues from bar 1.
    { melody: [[0, 66, 0.5], [0.5, 65, 0.5], [1, 63, 1], [2, 61, 1], [3, 58, 4]] },
    { melody: [] }, // Long Bb3 continues from bar 3.
    { melody: opening.map(note => [...note]) },
    { melody: [] },
    { melody: [[0, 63, 0.5], [0.5, 66, 0.5], [1, 68, 1.5], [2.5, 73, 0.5], [3, 70, 4]] },
    { melody: [] },
    { melody: [[0, 70, 0.5], [0.5, 73, 0.5], [1, 75, 2.5], [3.5, 73, 0.5]] },
    { melody: [[0, 70, 0.5], [0.5, 68, 0.5], [1, 70, 3]] },
    { melody: [[0, 70, 0.5], [0.5, 68, 0.5], [1, 66, 2.5], [3.5, 66, 0.5]] },
    { melody: [[0, 68, 0.5], [0.5, 73, 0.5], [1, 70, 3]] },
    { melody: [[0, 77, 0.5], [0.5, 80, 0.5], [1, 78, 2.5], [3.5, 78, 0.5]] },
    { melody: [[0, 78, 0.5], [0.5, 80, 0.5], [1, 77, 2.5], [3.5, 73, 0.5]] },
    { melody: [[0, 77, 0.5], [0.5, 73, 0.5], [1, 75, 3]] },
  ],
  accompaniment: [],
  melody: [
    { duration: 0.5, level: 0.115, attack: 0.035, wave: 'sine' },
    { duration: 0.5, level: 0.035, attack: 0.016, wave: 'triangle' },
  ],
  rhythm: [],
};
