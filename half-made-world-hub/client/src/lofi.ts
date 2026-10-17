/*
 * Ambient lofi beat generator — a tiny Web Audio synth, no audio assets and no
 * dependencies. It plays a slow four-bar jazzy loop (Am7 – Dm7 – G7 – Cmaj7)
 * with a bass line, a Rhodes-ish keys comp, a boom-bap kit, and a sparse vinyl
 * crackle bed, all run through a warm lowpass + a little convolution reverb.
 *
 * The crackle trick is borrowed from the classic vanilla-JS lofi generators:
 * a buffer that is almost all near-silence with rare loud pops — not a steady
 * hiss (which just sounds like a fan). Browsers block audio until a user
 * gesture, so `start()` creates a suspended AudioContext and arms one-shot
 * pointer/key listeners that resume it on the first interaction. Where Web
 * Audio is unavailable (e.g. jsdom in tests) everything is a silent no-op.
 */

export type LofiHandle = {
  start: () => void;
  stop: () => void;
  dispose: () => void;
  /** Notifies when actual playback begins/stops (may lag `start()` behind a gesture). */
  setListener: (cb: (playing: boolean) => void) => void;
};

const BPM = 74;
const BEAT = 60 / BPM;
const STEP = BEAT / 4;
const MASTER = 0.34;

// Am7, Dm7, G7, Cmaj7 — root (bass) plus the voicing (midi note numbers).
const CHORDS: { root: number; notes: number[] }[] = [
  { root: 45, notes: [57, 60, 64, 67] },
  { root: 50, notes: [62, 65, 69, 72] },
  { root: 43, notes: [55, 59, 62, 65] },
  { root: 48, notes: [60, 64, 67, 71] },
];

// A gentle top line, one bar at a time.
const MELODY: number[][] = [
  [69, 72, 76],
  [74, 72, 69],
  [71, 74, 71],
  [72, 76, 74],
];

const KICK = new Set([0, 8, 11]);
const SNARE = new Set([4, 12]);
const HAT = new Set([0, 2, 4, 6, 8, 10, 12, 14]);

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function createLofi(): LofiHandle {
  const AudioCtor =
    typeof window !== 'undefined'
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  let ctx: AudioContext | null = null;
  let tone: BiquadFilterNode | null = null; // master warmth (lowpass)
  let bus: GainNode | null = null; // master gain
  let rev: GainNode | null = null; // reverb send
  let noise: AudioBuffer | null = null;
  let bed: AudioBufferSourceNode | null = null; // vinyl crackle loop
  let timer: number | null = null;
  let nextTime = 0;
  let stepIndex = 0;
  let want = false;
  let playing = false;
  let gesturesArmed = false;
  let listener: ((playing: boolean) => void) | null = null;

  const emit = (p: boolean) => listener?.(p);
  const mtof2 = mtof;

  function build() {
    if (ctx || !AudioCtor) return;
    ctx = new AudioCtor();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.value = 2400;
    warmFilter.Q.value = 0.6;

    warmFilter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Space: a dark, filtered feedback delay. (A convolver with a noise-based
    // impulse sustains broadband hiss under the pads — that reads as a fan.)
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.32;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 1400;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.26;
    const revSendGain = ctx.createGain();
    revSendGain.gain.value = 1;
    const revLevel = ctx.createGain();
    revLevel.gain.value = 0.3;
    revSendGain.connect(delayTone);
    delayTone.connect(delay);
    delay.connect(feedback);
    feedback.connect(delayTone);
    delay.connect(revLevel);
    revLevel.connect(masterGain);

    // Noise buffer shared by the kit + the crackle bed.
    const nLen = Math.floor(ctx.sampleRate * 2);
    const noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nLen; i += 1) nd[i] = Math.random() * 2 - 1;

    // Sparse vinyl crackle: near-silent floor with occasional loud pops.
    const cLen = Math.floor(ctx.sampleRate * 3);
    const crackleBuf = ctx.createBuffer(1, cLen, ctx.sampleRate);
    const cd = crackleBuf.getChannelData(0);
    for (let i = 0; i < cLen; i += 1) {
      const white = Math.random() * 2 - 1;
      cd[i] = Math.random() < 0.00035 ? white * 2.2 : white * 0.004;
    }
    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = crackleBuf;
    crackleSrc.loop = true;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.12;
    crackleSrc.connect(crackleGain);
    crackleGain.connect(warmFilter);
    crackleSrc.start();

    tone = warmFilter;
    bus = masterGain;
    rev = revSendGain;
    noise = noiseBuf;
    bed = crackleSrc;
  }

  function route(node: AudioNode) {
    if (tone) node.connect(tone);
    if (rev) node.connect(rev);
  }

  function playChord(notes: number[], time: number, dur: number) {
    if (!ctx) return;
    for (const m of notes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = mtof2(m);
      osc.detune.setValueAtTime(3, time);
      osc.detune.linearRampToValueAtTime(-3, time + dur);
      const g = ctx.createGain();
      const peak = 0.03;
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(peak, time + 0.5);
      g.gain.setValueAtTime(peak, time + Math.max(0.5, dur - 0.9));
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      route(g);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    }
  }

  function playBass(root: number, time: number, dur: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = mtof2(root);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.14, time + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    route(g);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  function playKeys(m: number, time: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = mtof2(m);
    osc.detune.value = (Math.random() - 0.5) * 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.032, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
    osc.connect(g);
    route(g);
    osc.start(time);
    osc.stop(time + 1.2);
  }

  function playKick(time: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    osc.connect(g);
    if (tone) g.connect(tone); // dry only — keep the kit out of the delay
    osc.start(time);
    osc.stop(time + 0.26);
  }

  function playNoise(time: number, hpf: number, peak: number, dur: number) {
    if (!ctx || !noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(hp);
    hp.connect(g);
    if (tone) g.connect(tone); // dry only — hats/snare stay crisp and clean
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  function schedule(step: number, time: number) {
    const bar = Math.floor(step / 16) % CHORDS.length;
    const s = step % 16;
    const chord = CHORDS[bar];

    if (s === 0) {
      playChord(chord.notes, time, BEAT * 4 * 0.98);
      playBass(chord.root, time, 1.3);
    }
    if (s === 8) playBass(chord.root + 7, time, 1.0);

    const melodyStep = [0, 6, 12].indexOf(s);
    if (melodyStep >= 0) playKeys(MELODY[bar][melodyStep], time);
    if (s === 3 || s === 10) playKeys(chord.notes[1] + 12, time + 0.02);

    if (KICK.has(s)) playKick(time);
    if (SNARE.has(s)) playNoise(time, 900, 0.075, 0.16);
    if (HAT.has(s)) playNoise(time + (s % 4 === 2 ? 0.012 : 0), 6500, 0.018, 0.05);
  }

  function tick() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.12) {
      schedule(stepIndex, nextTime);
      nextTime += STEP;
      stepIndex += 1;
    }
  }

  function begin() {
    if (playing || !ctx || !bus) return;
    playing = true;
    stepIndex = 0;
    nextTime = ctx.currentTime + 0.1;
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(MASTER, now + 1.4);
    tick();
    timer = window.setInterval(tick, 25);
    emit(true);
  }

  function tryResume() {
    if (!ctx) return;
    if (ctx.state === 'running') {
      if (want) begin();
      return;
    }
    ctx.resume().then(() => {
      if (ctx && ctx.state === 'running' && want) begin();
    }).catch(() => {});
  }

  function armGestures() {
    if (gesturesArmed) return;
    gesturesArmed = true;
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    const handler = () => {
      gesturesArmed = false;
      for (const e of events) window.removeEventListener(e, handler);
      tryResume();
    };
    for (const e of events) window.addEventListener(e, handler);
  }

  return {
    start() {
      want = true;
      build();
      if (!ctx) return;
      if (ctx.state === 'running') begin();
      else {
        tryResume();
        armGestures();
      }
    },
    stop() {
      want = false;
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      if (playing && ctx && bus) {
        const now = ctx.currentTime;
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(0, now + 0.6);
      }
      if (playing) emit(false);
      playing = false;
    },
    dispose() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      want = false;
      playing = false;
      if (bed) {
        try {
          bed.stop();
        } catch {
          /* already stopped */
        }
        bed = null;
      }
      if (ctx) {
        ctx.close().catch(() => {});
        ctx = null;
      }
      tone = null;
      bus = null;
      rev = null;
      noise = null;
    },
    setListener(cb) {
      listener = cb;
      cb(playing);
    },
  };
}
