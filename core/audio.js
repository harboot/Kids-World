// Original melodies. Notes use MIDI pitch numbers and offsets measured in beats.
const garden = {
  beat: 0.47,
  bars: [
    { chord: [55, 59, 62], melody: [[0, 67], [0.75, 71], [1.5, 74], [2.5, 71], [3.25, 69]] },
    { chord: [48, 55, 60], melody: [[0, 67], [0.75, 64], [1.5, 67], [2.25, 72], [3.25, 71]] },
    { chord: [52, 55, 59], melody: [[0, 71], [0.75, 67], [1.5, 64], [2.5, 67], [3.25, 69]] },
    { chord: [50, 57, 62], melody: [[0, 66], [0.75, 69], [1.5, 74], [2.5, 69], [3.25, 66]] },
  ],
};

const snow = {
  beat: 0.66,
  bars: [
    { chord: [50, 57, 65], melody: [[0.5, 81], [2, 77], [3, 76]] },
    { chord: [46, 53, 62], melody: [[0, 74], [1.75, 77], [2.75, 81]] },
    { chord: [53, 60, 69], melody: [[0.5, 84], [2, 81], [3, 79]] },
    { chord: [48, 55, 64], melody: [[0, 76], [1.5, 79], [2.75, 74]] },
  ],
};

const woodenHouse = {
  beat: 0.57,
  bars: [
    { chord: [45, 52, 57, 61], melody: [[0.5, 69], [1.75, 73], [2.75, 76]] },
    { chord: [42, 49, 57, 61], melody: [[0, 78], [1.5, 76], [2.75, 73]] },
    { chord: [38, 45, 54, 57], melody: [[0.5, 74], [1.5, 69], [2.5, 66]] },
    { chord: [40, 47, 56, 59], melody: [[0, 68], [1.75, 71], [2.75, 64]] },
  ],
};

const frozenCastle = {
  beat: 0.73,
  bars: [
    { chord: [47, 54, 58, 61], melody: [[0.25, 78], [1.4, 85], [2.65, 82]] },
    { chord: [44, 51, 59, 66], melody: [[0.5, 80], [2, 83], [2.8, 90]] },
    { chord: [42, 49, 58, 63], melody: [[0.2, 87], [1.75, 82], [2.72, 85]] },
    { chord: [49, 56, 61, 68], melody: [[0.65, 80], [1.8, 76], [2.7, 78]] },
  ],
};

const muteKey = 'kids-world-muted';
const minVolume = 0.0001;
const frequency = pitch => 440 * 2 ** ((pitch - 69) / 12);

function tone(context, destination, at, pitch, { endPitch = pitch, duration, level, attack = 0.012, wave = 'sine' }) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency(pitch), at);
  if (endPitch !== pitch) {
    oscillator.frequency.exponentialRampToValueAtTime(frequency(endPitch), at + duration * 0.8);
  }
  envelope.gain.setValueAtTime(minVolume, at);
  envelope.gain.linearRampToValueAtTime(level, at + attack);
  envelope.gain.exponentialRampToValueAtTime(minVolume, at + duration);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

const scores = { garden, snow, 'wooden-house': woodenHouse, 'frozen-castle': frozenCastle };
const jumpCue = [[60, { endPitch: 77, duration: 0.17, level: 0.22, wave: 'triangle' }]];
const interactCue = [
  [53, { endPitch: 46, duration: 0.065, level: 0.24, attack: 0.004, wave: 'triangle' }],
  [79, { duration: 0.135, level: 0.15 }, 0.035],
];

function renderLoop(OfflineContext, area) {
  const { beat, bars } = scores[area];
  const sampleRate = 24000;
  const context = new OfflineContext(1, Math.round(4 * beat * bars.length * sampleRate), sampleRate);
  const output = context.destination;
  bars.forEach(({ chord, melody }, bar) => {
    const start = bar * 4 * beat;
    if (area === 'snow' || area === 'frozen-castle') {
      const castle = area === 'frozen-castle';
      chord.forEach((pitch, i) => {
        tone(context, output, start + i * 0.055, pitch, { duration: 3.8 * beat, attack: 0.28, level: castle ? 0.046 : 0.055 });
      });
      melody.forEach(([offset, pitch]) => {
        const at = start + offset * beat;
        tone(context, output, at, pitch, { duration: (castle ? 1.12 : 0.82) * beat, level: castle ? 0.12 : 0.15 });
        tone(context, output, at + 0.12, pitch + 12, { duration: 0.57 * beat, level: castle ? 0.035 : 0.025 });
      });
    } else if (area === 'wooden-house') {
      chord.forEach((pitch, i) => {
        tone(context, output, start + i * 0.34 * beat, pitch, {
          duration: 2.8 * beat, attack: 0.04, level: i === 0 ? 0.13 : 0.065, wave: i === 0 ? 'sine' : 'triangle',
        });
      });
      melody.forEach(([offset, pitch]) => {
        tone(context, output, start + offset * beat, pitch, { duration: 0.98 * beat, attack: 0.025, level: 0.13 });
      });
    } else {
      tone(context, output, start, chord[0], { duration: 0.74 * beat, level: 0.15, wave: 'triangle' });
      tone(context, output, start + 2 * beat, chord[0] - 12, { duration: 0.83 * beat, level: 0.13, wave: 'triangle' });
      chord.slice(1).forEach((pitch, i) => {
        tone(context, output, start + (1.25 + i * 1.65) * beat, pitch, { duration: 0.68 * beat, level: 0.085 });
      });
      melody.forEach(([offset, pitch]) => {
        const at = start + offset * beat;
        tone(context, output, at, pitch, { duration: 0.67 * beat, level: 0.125, wave: 'triangle' });
        tone(context, output, at, pitch + 12, { duration: 0.24 * beat, level: 0.045 });
      });
    }
  });
  return context.startRendering();
}

export function createAudio(button) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  let muted = false;
  try {
    muted = localStorage.getItem(muteKey) === '1';
  } catch {
    // The sound control still works when storage is unavailable.
  }

  let context;
  let master;
  const buffers = new Map();
  let area;
  let track;
  let playing = false;

  function syncButton() {
    button.setAttribute('aria-pressed', String(muted));
    button.title = muted ? 'Unmute sound' : 'Mute sound';
  }

  function unlock() {
    if (!AudioContext || muted) return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.64;
        master.connect(context.destination);
      }
      if (context.state !== 'running') context.resume().catch(() => {});
    } catch {
      button.hidden = true;
    }
  }

  function stopMusic() {
    if (!track) return;
    const now = context.currentTime;
    track.gain.gain.setTargetAtTime(minVolume, now, 0.01);
    track.source.stop(now + 0.06);
    track = null;
  }

  function syncMusic() {
    if (!playing || muted || !context || !master || !OfflineContext || !Object.hasOwn(scores, area)) {
      stopMusic();
      return;
    }
    if (track) return;

    const requestedArea = area;
    if (!buffers.has(requestedArea)) {
      buffers.set(requestedArea, Promise.resolve().then(() => renderLoop(OfflineContext, requestedArea)).catch(() => null));
    }
    buffers.get(requestedArea).then(audioBuffer => {
      if (!audioBuffer || !playing || muted || track || area !== requestedArea) return;
      const gain = context.createGain();
      const source = context.createBufferSource();
      gain.gain.value = 0.55;
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(gain).connect(master);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      track = { source, gain };
      source.start();
    });
  }

  function setPlaying(active) {
    playing = active;
    syncMusic();
  }

  function setArea(next) {
    if (area === next) return;
    stopMusic();
    area = next;
    syncMusic();
  }

  function playCue(notes) {
    if (muted || !master || context.state !== 'running') return false;
    const now = context.currentTime + 0.004;
    for (const [pitch, note, offset = 0] of notes) tone(context, master, now + offset, pitch, note);
    return true;
  }

  function effect(name) {
    return playCue(name === 'jump' ? jumpCue : interactCue);
  }

  if (AudioContext) {
    syncButton();
    button.hidden = false;
    button.addEventListener('click', () => {
      muted = !muted;
      try {
        localStorage.setItem(muteKey, muted ? '1' : '0');
      } catch {
        // Keep the in-memory preference for this page.
      }
      syncButton();
      unlock();
      if (master) master.gain.setTargetAtTime(muted ? minVolume : 0.64, context.currentTime, 0.01);
      syncMusic();
    });
  }

  return { unlock, setArea, setPlaying, effect, playCue };
}
