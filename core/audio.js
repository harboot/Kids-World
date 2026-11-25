const muteKey = 'kids-world-muted';
const minVolume = 0.0001;
const masterVolume = 0.64;
const musicVolume = 0.55;
const sampleRate = 24000;
const frequency = pitch => 440 * 2 ** ((pitch - 69) / 12);

// Cache one second of deterministic noise per context; short cues reuse it.
const noiseBuffers = new WeakMap();
function noiseSource(context) {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    const rate = context.sampleRate || sampleRate;
    buffer = context.createBuffer(1, rate, rate);
    const data = buffer.getChannelData(0);
    let seed = 0x6d2b79f5;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function tone(context, destination, at, pitch, { endPitch = pitch, duration, level, attack = 0.012, wave = 'sine', filter = 'bandpass', q = .8 }) {
  const noisy = wave === 'noise';
  // Graceful fallback for limited Web Audio implementations.
  if (noisy && (!context.createBuffer || !context.createBiquadFilter)) return null;
  const oscillator = noisy ? noiseSource(context) : context.createOscillator();
  const envelope = context.createGain();
  let shaping;
  if (noisy) {
    shaping = context.createBiquadFilter();
    shaping.type = filter;
    shaping.Q.value = q;
    shaping.frequency.setValueAtTime(frequency(pitch), at);
    if (endPitch !== pitch) shaping.frequency.exponentialRampToValueAtTime(frequency(endPitch), at + duration * .8);
  } else {
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency(pitch), at);
    if (endPitch !== pitch) oscillator.frequency.exponentialRampToValueAtTime(frequency(endPitch), at + duration * .8);
  }
  envelope.gain.setValueAtTime(minVolume, at);
  envelope.gain.linearRampToValueAtTime(level, at + attack);
  envelope.gain.exponentialRampToValueAtTime(minVolume, at + duration);
  if (shaping) oscillator.connect(shaping).connect(envelope);
  else oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
  return { oscillator, envelope, shaping };
}

const jumpCue = [[60, { endPitch: 77, duration: 0.17, level: 0.22, wave: 'triangle' }]];
const interactCue = [
  [53, { endPitch: 46, duration: 0.065, level: 0.24, attack: 0.004, wave: 'triangle' }],
  [79, { duration: 0.135, level: 0.15 }, 0.035],
];

const stepCue = [
  [46, { endPitch: 29, duration: 0.065, level: 0.042, attack: 0.006, wave: 'triangle' }],
  [66, { endPitch: 41, duration: 0.035, level: 0.012, attack: 0.005, wave: 'triangle' }],
];
const effects = { jump: jumpCue, interact: interactCue, step: stepCue };

function renderLoop(OfflineContext, { beat, beatsPerBar = 4, bars, accompaniment = [], melody = [], rhythm = [] }) {
  const barDuration = beatsPerBar * beat;
  const context = new OfflineContext(1, Math.round(barDuration * bars.length * sampleRate), sampleRate);
  const output = context.destination;
  bars.forEach((bar, index) => {
    const start = index * barDuration;
    function play(offset, pitch, part) {
      const at = start + (offset + (part.offset ?? 0)) * beat + (part.delay ?? 0);
      tone(context, output, at, pitch + (part.transpose ?? 0), { ...part, duration: part.duration * beat });
    }

    for (const part of accompaniment) {
      part.voices.forEach((voice, index) => play(index * (part.spread ?? 0), bar.chord[voice], part));
    }
    for (const [offset, pitch, noteDuration] of bar.melody ?? []) {
      // Older scores use [offset, pitch]; new scores may also provide duration.
      for (const part of melody) {
        play(offset, pitch, { ...part, duration: noteDuration ?? part.duration });
      }
    }
    for (const part of rhythm) {
      for (const [offset, pitch] of part.notes) play(offset, pitch, part);
    }
  });
  return context.startRendering();
}

export function createAudio(button) {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  let muted = false;
  try {
    muted = localStorage.getItem(muteKey) === '1';
  } catch {
    // The sound control still works when storage is unavailable.
  }

  let context;
  let master;
  const buffers = new WeakMap();
  const cues = new Set();
  let score;
  let track;
  let playing = false;
  let rendering = false;

  function syncButton() {
    button.setAttribute('aria-pressed', String(muted));
    button.textContent = muted ? 'Sound: Off' : 'Sound: On';
    button.title = muted ? 'Unmute sound' : 'Mute sound';
  }

  function unlock() {
    if (!AudioContext || muted) return;
    let opening;
    try {
      if (!context) {
        opening = new AudioContext();
        const gain = opening.createGain();
        gain.gain.value = masterVolume;
        gain.connect(opening.destination);
        opening.addEventListener('statechange', syncMusic);
        context = opening;
        master = gain;
      }
      if (context.state === 'running') syncMusic();
      else context.resume().then(syncMusic, () => {});
    } catch {
      if (!context) opening?.close?.().catch(() => {});
      button.hidden = true;
    }
  }

  function stopMusic() {
    if (!track || track.stopping) return;
    // Hold the slot through the fade so a replacement starts after this track ends.
    track.stopping = true;
    const now = context.currentTime;
    if (context.state === 'running') {
      track.gain.gain.setTargetAtTime(minVolume, now, 0.01);
      track.source.stop(now + 0.06);
    } else {
      track.source.stop(now);
    }
  }

  function startMusic(buffer) {
    const gain = context.createGain();
    const source = context.createBufferSource();
    gain.gain.value = musicVolume;
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain).connect(master);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      track = null;
      syncMusic();
    };
    source.start();
    track = { source, gain, stopping: false };
  }

  function canPlayMusic() {
    return playing && !muted && score && context?.state === 'running';
  }

  function syncMusic() {
    if (!playing || muted || !score) {
      stopMusic();
      return;
    }
    if (!canPlayMusic() || !OfflineContext || track) return;

    const buffer = buffers.get(score);
    if (buffer) {
      startMusic(buffer);
      return;
    }
    if (rendering) return;

    // Defer node setup and render one loop at a time when switching areas.
    const requested = score;
    rendering = true;
    setTimeout(async () => {
      try {
        if (canPlayMusic() && score === requested) {
          buffers.set(requested, await renderLoop(OfflineContext, requested));
        }
      } catch {
        // Background music is optional when offline audio rendering fails.
      } finally {
        rendering = false;
        if (score !== requested || buffers.has(requested)) syncMusic();
      }
    }, 0);
  }

  function setPlaying(active) {
    playing = active;
    if (!active) stopCues();
    syncMusic();
  }

  function setScore(next) {
    if (score === next) return;
    stopMusic();
    stopCues();
    score = next;
    syncMusic();
  }

  function playCue(notes) {
    if (muted || !master || context.state !== 'running') return false;
    const now = context.currentTime + 0.004;
    let played = false;
    for (const [pitch, note, offset = 0] of notes) {
      const cue = tone(context, master, now + offset, pitch, note);
      if (!cue) continue;
      played = true;
      cues.add(cue);
      cue.oscillator.onended = () => releaseCue(cue);
    }
    return played;
  }

  function releaseCue(cue) {
    cues.delete(cue);
    cue.oscillator.onended = null;
    cue.oscillator.disconnect();
    cue.envelope.disconnect();
    cue.shaping?.disconnect();
  }

  function stopCues() {
    for (const cue of cues) {
      try {
        cue.oscillator.stop(context.currentTime);
      } catch {
        // A cue may have ended while entering the menu.
      }
      releaseCue(cue);
    }
  }

  function effect(name) {
    return playCue(effects[name] ?? interactCue);
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
      if (muted) stopCues();
      if (master) master.gain.setTargetAtTime(muted ? minVolume : masterVolume, context.currentTime, 0.01);
      unlock();
      syncMusic();
    });
  }

  return { unlock, setScore, setPlaying, effect, playCue };
}
