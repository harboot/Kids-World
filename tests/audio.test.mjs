import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createAudio } from '../core/audio.js';
import { areas } from '../game.js';
import { music as gardenMusic } from '../areas/flower-garden/music.js';
import { music as snowMusic } from '../areas/snow-basin/music.js';
import { music as courtyardMusic } from '../areas/kung-fu-hustle/music.js';

class SoundButton extends EventTarget {
  hidden = true;
  attributes = new Map();
  setAttribute(name, value) { this.attributes.set(name, value); }
  click() { this.dispatchEvent(new Event('click')); }
}

class AudioNode {
  disconnected = false;
  connect(node) { return node; }
  disconnect() { this.disconnected = true; }
}

function parameter() {
  const changes = [];
  function record(...values) {
    assert.ok(values.every(Number.isFinite));
    changes.push(values);
  }
  return {
    changes,
    setValueAtTime: record,
    linearRampToValueAtTime: record,
    exponentialRampToValueAtTime: record,
    setTargetAtTime: record,
  };
}

function oscillator() {
  return Object.assign(new AudioNode(), {
    frequency: parameter(),
    start(at) { this.startTime = at; },
    stop(at) { this.stopTime = at; },
  });
}

function setup(t, { muted = false, failResume = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const contexts = [];
  const renders = [];
  const started = [];
  const storage = new Map([['kids-world-muted', muted ? '1' : '0']]);

  class AudioContext extends EventTarget {
    state = 'suspended';
    currentTime = 1;
    destination = new AudioNode();
    gains = [];
    cues = [];
    panners = [];

    constructor() {
      super();
      contexts.push(this);
    }

    async resume() {
      if (failResume) throw new Error('Audio is unavailable');
      this.state = 'running';
      this.dispatchEvent(new Event('statechange'));
    }

    createGain() {
      const node = Object.assign(new AudioNode(), { gain: parameter() });
      this.gains.push(node);
      return node;
    }

    createStereoPanner() {
      const node=Object.assign(new AudioNode(),{pan:parameter()});this.panners.push(node);return node;
    }

    createOscillator() {
      const node = oscillator();
      this.cues.push(node);
      return node;
    }

    createBuffer(channels,length,rate) {
      const data=new Float32Array(length);
      return {channels,length,sampleRate:rate,getChannelData(){return data;}};
    }

    createBiquadFilter(){return Object.assign(new AudioNode(),{frequency:parameter(),Q:parameter()});}

    createBufferSource() {
      return Object.assign(new AudioNode(), {
        start() { started.push(this); },
        stop(at) { this.stopTime = at; },
        end() { this.onended(); },
      });
    }
  }

  class OfflineAudioContext {
    destination = new AudioNode();
    notes = [];
    gainNodes = [];
    done = Promise.withResolvers();

    constructor(channels, length, sampleRate) {
      Object.assign(this, { channels, length, sampleRate });
      renders.push(this);
    }

    createOscillator() {
      const node = oscillator();
      this.notes.push(node);
      return node;
    }

    createGain() {
      const node = Object.assign(new AudioNode(), { gain: parameter() });
      this.gainNodes.push(node);
      return node;
    }

    startRendering() { return this.done.promise; }
    finish() { this.done.resolve({ length: this.length, sampleRate: this.sampleRate }); }
  }

  for (const [name, value] of Object.entries({
    AudioContext, OfflineAudioContext, webkitAudioContext: undefined, webkitOfflineAudioContext: undefined,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  })) {
    const before = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
      if (before) Object.defineProperty(globalThis, name, before);
      else delete globalThis[name];
    });
  }

  return { contexts, renders, started, storage, AudioContext, tick: () => t.mock.timers.tick(0) };
}

test('the nine scored areas export distinct local compositions compatible with the generic audio engine', async t => {
  const folders = { garden: 'flower-garden', snow: 'snow-basin' };
  const scoredAreas = areas;
  assert.equal(Object.keys(scoredAreas).length, 9);
  const { contexts, renders, started, tick } = setup(t);
  const audio = createAudio(new SoundButton());
  const compositions = new Set();
  const audioSequences = new Set();

  audio.unlock();
  audio.setPlaying(true);
  for (const [id, area] of Object.entries(scoredAreas)) {
    const { music } = await import(`../areas/${folders[id] ?? id}/music.js`);
    assert.equal((await area.loadModule()).default.music, music, id);
    assert.ok(music.beat > 0 && music.bars.length > 0);
    compositions.add(JSON.stringify(music.bars));

    audio.setScore(music);
    tick();
    const render = renders.at(-1);
    assert.equal(render.channels, 1);
    assert.equal(render.sampleRate, 24000);
    assert.equal(render.length, Math.round(music.beat * (music.beatsPerBar ?? 4) * music.bars.length * render.sampleRate));
    assert.ok(render.notes.length > 0);
    for (const [i, note] of render.notes.entries()) {
      const [, [attackLevel, attackAt], [, releaseAt]] = render.gainNodes[i].gain.changes;
      assert.ok(['sine', 'triangle', 'sawtooth', 'square'].includes(note.type));
      assert.ok(note.startTime >= 0 && note.startTime < render.length / render.sampleRate);
      assert.ok(note.stopTime > note.startTime && note.stopTime === releaseAt);
      assert.ok(attackLevel > 0 && attackAt > note.startTime && attackAt < releaseAt);
    }
    audioSequences.add(JSON.stringify(render.notes.map(note => [note.type, note.startTime, ...note.frequency.changes])));
    render.finish();
    await render.done.promise;
    assert.equal(started.at(-1).buffer.length, render.length);
    assert.equal(started.at(-1).loop, true);
    audio.setScore(null);
    started.at(-1).end();
  }

  assert.equal(compositions.size, 9);
  assert.equal(audioSequences.size, 9);
  assert.equal(renders.length, 9);
  assert.equal(started.length, 9);
  assert.equal(contexts.length, 1);
  const engine = await readFile(new URL('../core/audio.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /\b(garden|snow|woodenHouse|frozenCastle|arendelle|princessGallery|militaryBase|secretApartment)\b/i);
});

test('Kung Fu Hustle renders notated durations and sustained notes across bar lines', async t => {
  const { renders, started, tick } = setup(t);
  const audio = createAudio(new SoundButton());
  audio.unlock();
  audio.setPlaying(true);
  audio.setScore(courtyardMusic);
  tick();

  const render = renders.at(-1);
  const beat = courtyardMusic.beat;
  const noteEvents = courtyardMusic.bars.reduce((sum, bar) => sum + bar.melody.length, 0);
  assert.equal(render.notes.length, noteEvents * courtyardMusic.melody.length);
  assert.equal(render.length, 50 * 24000); // 15 bars × 4 beats @ 72 BPM.

  const first = render.notes[0];
  assert.ok(Math.abs(first.stopTime - first.startTime - 0.5 * beat) < 1e-9);
  const held = render.notes[14]; // Last note of bar 1, first timbre.
  assert.ok(Math.abs(held.startTime - 3.5 * beat) < 1e-9);
  assert.ok(Math.abs(held.stopTime - held.startTime - 3.5 * beat) < 1e-9);
  assert.ok(held.stopTime > 4 * beat, 'the tied note crosses into bar 2');
  assert.ok(held.stopTime < 8 * beat, 'the tied note ends before bar 3');

  // The original area scores still use two-number note tuples.
  assert.equal(gardenMusic.bars[0].melody[0].length, 2);
  render.finish();
  await render.done.promise;
  assert.equal(started.at(-1).loop, true);
});

test('switches, pauses, and restarts with a single loop, and never plays an obsolete render', async t => {
  const { contexts, renders, started, tick } = setup(t);
  const audio = createAudio(new SoundButton());
  const original = gardenMusic;
  const destination = snowMusic;

  audio.setScore(original);
  audio.setPlaying(true);
  tick();
  assert.equal(contexts.length, 0, 'play state alone does not unlock Web Audio');
  assert.equal(renders.length, 0);

  audio.unlock();
  tick();
  assert.equal(renders.length, 1);
  const firstRender = renders[0];
  audio.setScore(destination);
  tick();
  assert.equal(renders.length, 1, 'render at most one loop in the background');
  firstRender.finish();
  await firstRender.done.promise;
  assert.equal(started.length, 0);

  tick();
  assert.equal(renders.length, 2);
  const secondRender = renders[1];
  secondRender.finish();
  await secondRender.done.promise;
  const active = started[0];
  assert.equal(active.buffer.length, secondRender.length);

  audio.setScore(original);
  assert.equal(active.stopTime, 1.06);
  assert.equal(started.length, 1, 'wait for the old loop to fade out');
  active.end();
  assert.equal(active.disconnected, true);
  assert.equal(contexts[0].gains[1].disconnected, true);
  assert.equal(started.length, 2);
  assert.equal(started[1].buffer.length, firstRender.length);

  audio.setScore(original);
  audio.setPlaying(false);
  audio.setPlaying(true);
  audio.setPlaying(true);
  assert.equal(started.length, 2);
  started[1].end();
  assert.equal(started.length, 3);
  assert.equal(started[2].buffer, started[1].buffer);
  assert.equal(renders.length, 2, 'returning to an area reuses its buffer');
  audio.setPlaying(false);
  started[2].end();
  assert.equal(started.length, 3);
});

test('mute survives audio instances and preserves generic and area cues when sound is enabled', async t => {
  const { contexts, renders, started, storage, tick } = setup(t, { muted: true });
  const button = new SoundButton();
  const audio = createAudio(button);
  const cue = [[54, { duration: 0.2, level: 0.15, endPitch: 59, wave: 'triangle' }, 0.03]];
  assert.equal(button.attributes.get('aria-pressed'), 'true');
  audio.setScore(gardenMusic);
  audio.unlock();
  audio.setPlaying(true);
  assert.equal(contexts.length, 0);
  assert.equal(audio.playCue(cue), false);

  button.click();
  tick();
  assert.equal(button.attributes.get('aria-pressed'), 'false');
  assert.equal(storage.get('kids-world-muted'), '0');
  renders[0].finish();
  await renders[0].done.promise;
  assert.equal(audio.playCue(cue), true);
  assert.equal(audio.effect('jump'), true);
  assert.equal(audio.effect('interact'), true);
  assert.equal(contexts[0].cues.length, 4);
  assert.equal(contexts[0].cues[0].startTime, 1.034);

  button.click();
  assert.equal(audio.playCue(cue), false);
  assert.equal(button.attributes.get('aria-pressed'), 'true');
  assert.equal(storage.get('kids-world-muted'), '1');
  started[0].end();
  assert.equal(started.length, 1);
  const reopened = new SoundButton();
  createAudio(reopened);
  assert.equal(reopened.attributes.get('aria-pressed'), 'true');
});

test('unavailable Web Audio APIs and a rejected audio unlock leave playback controls safe', async t => {
  const { contexts, renders, AudioContext, tick } = setup(t, { failResume: true });
  const score = snowMusic;
  globalThis.AudioContext = undefined;
  const hiddenButton = new SoundButton();
  const silent = createAudio(hiddenButton);
  silent.setScore(score);
  silent.unlock();
  silent.setPlaying(true);
  assert.equal(hiddenButton.hidden, true);
  assert.equal(silent.effect('jump'), false);
  assert.equal(contexts.length, 0);

  globalThis.AudioContext = AudioContext;
  const suspended = createAudio(new SoundButton());
  suspended.setScore(score);
  suspended.unlock();
  suspended.setPlaying(true);
  await Promise.resolve();
  tick();
  assert.equal(renders.length, 0);
  assert.equal(suspended.effect('jump'), false);

  globalThis.OfflineAudioContext = undefined;
  const effectsOnly = createAudio(new SoundButton());
  effectsOnly.setScore(score);
  effectsOnly.unlock();
  effectsOnly.setPlaying(true);
  contexts.at(-1).state = 'running';
  contexts.at(-1).dispatchEvent(new Event('statechange'));
  tick();
  assert.equal(renders.length, 0);
  assert.equal(effectsOnly.effect('jump'), true);
});

test('pending mission sounds stop and disconnect as soon as gameplay stops or the score changes', t => {
  const { contexts } = setup(t);
  const audio = createAudio(new SoundButton());
  audio.unlock();
  audio.setPlaying(true);
  const notes = [[62, { duration: 0.4, level: 0.12 }, 0.5]];
  assert.equal(audio.playCue(notes), true);
  const [pending] = contexts[0].cues;
  audio.setPlaying(false);
  assert.equal(pending.stopTime, 1);
  assert.equal(pending.disconnected, true);
  assert.equal(pending.onended, null);

  assert.equal(audio.playCue(notes), true);
  const [, second] = contexts[0].cues;
  audio.setScore(gardenMusic);
  assert.equal(second.disconnected, true);
});

test('filtered noise cues reuse a buffer and stop with mute or area change',async t=>{
  const {contexts,started}=setup(t);
  const button=new SoundButton(),audio=createAudio(button);
  audio.unlock();audio.setPlaying(true);
  const noise=[[80,{wave:'noise',endPitch:50,duration:.2,level:.1}]];
  assert.equal(audio.playCue(noise),true);
  assert.equal(audio.playCue(noise),true);
  const [a,b]=started;
  assert.equal(a.buffer,b.buffer);assert.ok(a.buffer.getChannelData(0).some(v=>v!==0));
  assert.equal(a.loop,true);
  assert.ok(a.stopTime>contexts[0].currentTime);
  button.click();
  assert.ok(a.disconnected&&b.disconnected);
  assert.equal(audio.playCue(noise),false);
  button.click();assert.equal(audio.playCue(noise),true);
  audio.setScore(gardenMusic);
  assert.ok(started.at(-1).disconnected);
});

test('master volume defaults to 150 percent of old gain, persists and respects mute',t=>{
  const {contexts,storage}=setup(t),button=new SoundButton(),slider=new SoundButton(),display={};
  const audio=createAudio(button,slider,display);
  assert.equal(slider.value,'96');assert.equal(display.textContent,'96%');
  audio.unlock();assert.equal(contexts[0].gains[0].gain.value,.96);
  slider.value='42';slider.dispatchEvent(new Event('input'));
  assert.equal(storage.get('kids-world-volume'),'42');
  assert.equal(contexts[0].gains[0].gain.changes.at(-1)[0],.42);
  button.click();assert.equal(contexts[0].gains[0].gain.changes.at(-1)[0],.0001);
  audio.setVolume(30);assert.equal(contexts[0].gains[0].gain.changes.at(-1)[0],.0001);
  button.click();assert.equal(contexts[0].gains[0].gain.changes.at(-1)[0],.3);
  const next=new SoundButton();createAudio(new SoundButton(),next);assert.equal(next.value,'30');
});
test('ducking lowers only music, is idempotent and restores on pause',async t=>{
  const {contexts,renders,tick}=setup(t),audio=createAudio(new SoundButton());
  audio.unlock();audio.setScore(courtyardMusic);audio.setPlaying(true);audio.setMusicDuck(true);tick();
  renders[0].finish();await renders[0].done.promise;
  const [master,music]=contexts[0].gains;assert.equal(music.gain.value,.55*.22);
  audio.setMusicDuck(false);assert.equal(music.gain.changes.at(-1)[0],.55);
  audio.setMusicDuck(true);assert.equal(music.gain.changes.at(-1)[0],.55*.22);
  const length=music.gain.changes.length;audio.setMusicDuck(true);assert.equal(music.gain.changes.length,length);
  assert.equal(master.gain.value,.96);audio.setPlaying(false);
  audio.setMusicDuck(false);assert.equal(master.gain.value,.96);
});

test('spatial cues share a gain and panner, track movement and release on stop',t=>{
  const {contexts}=setup(t),audio=createAudio(new SoundButton());
  audio.unlock();audio.setPlaying(true);
  const listener={x:0,y:1.68,z:0},source={x:3,z:0,eyeY:1.68,range:10};
  audio.setListener(listener,{x:1,z:0});
  const notes=[[60,{duration:.2,level:.1}],[72,{duration:.3,level:.1},.05]];
  assert.equal(audio.playCue(notes,source),true);
  const ctx=contexts[0],gain=ctx.gains[1],pan=ctx.panners[0];
  assert.ok(gain.gain.value>0&&gain.gain.value<1);
  assert.equal(pan.pan.value,.85);
  audio.setListener({x:2,y:1.68,z:0},{x:-1,z:0});
  assert.equal(gain.gain.changes.at(-1)[0],1);
  assert.equal(pan.pan.changes.at(-1)[0],-.85);
  audio.setListener({x:20,y:1.68,z:0},{x:1,z:0});
  assert.equal(gain.gain.changes.at(-1)[0],0);
  assert.equal(audio.playCue(notes,source),false);
  ctx.cues[0].onended();assert.equal(gain.disconnected,false);
  ctx.cues[1].onended();assert.equal(gain.disconnected,true);assert.equal(pan.disconnected,true);
  audio.setListener(listener,{x:1,z:0});
  assert.ok(audio.playCue(notes,source));const second=ctx.panners[1];
  audio.setPlaying(false);assert.equal(second.disconnected,true);
  assert.ok(ctx.cues.slice(-2).every(n=>n.disconnected));
});
test('positional cues degrade to mono gain if stereo panning is unavailable',t=>{
  const {contexts}=setup(t),audio=createAudio(new SoundButton());
  audio.unlock();audio.setPlaying(true);
  contexts[0].createStereoPanner=undefined;
  audio.setListener({x:0,y:1.68,z:0},{x:1,z:0});
  assert.equal(audio.playCue([[60,{duration:.1,level:.1}]],{x:2,z:0,eyeY:1.68,range:5}),true);
  audio.setScore(courtyardMusic);assert.ok(contexts[0].gains[1].disconnected);
});
