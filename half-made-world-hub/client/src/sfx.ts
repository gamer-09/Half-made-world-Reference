/*
 * UI sound effects — a soft tick when the pointer enters something clickable,
 * a short two-layer blip on click. Synthesised with Web Audio, so there are no
 * audio assets and no dependencies.
 *
 * Browsers block audio until a user gesture, so the AudioContext is only built
 * on the first pointerdown/keydown/touchstart. Hover sounds before that first
 * gesture are silently skipped (creating a context early just logs a warning).
 * Where Web Audio is unavailable (e.g. jsdom in tests) everything is a no-op.
 */

const STORAGE_KEY = 'hmw-sfx';
const MASTER = 0.32;
const HOVER_PEAK = 0.05;
const CLICK_PEAK = 0.13;
const HOVER_GAP = 45; // ms between hover ticks, so sweeping a toolbar doesn't machine-gun

const INTERACTIVE = [
  'a[href]',
  'button',
  '[role="button"]',
  'summary',
  'label[for]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '.entry-card',
  '.view-toggle-btn',
  '.filter-chip',
].join(',');

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let enabled = readEnabled();
let lastHover = 0;
let lastHoverEl: Element | null = null;

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function sfxEnabled(): boolean {
  return enabled;
}

export function setSfxEnabled(next: boolean) {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  if (!next) lastHoverEl = null;
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    ctx = new AudioCtor();
  } catch {
    return null;
  }
  bus = ctx.createGain();
  bus.gain.value = MASTER;
  bus.connect(ctx.destination);
  return ctx;
}

/** Build/resume the context. Must be called from inside a user gesture. */
function unlock() {
  if (!enabled) return;
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function blip(
  freq: number,
  endFreq: number,
  dur: number,
  peak: number,
  type: OscillatorType,
) {
  const c = ctx;
  if (!c || !bus) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(peak, now + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(bus);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function playHover() {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  blip(1500, 1320, 0.055, HOVER_PEAK, 'triangle');
}

function playClick() {
  if (!enabled) return;
  unlock();
  if (!ctx || !bus) return;
  // soft body + a thin tick on top
  blip(420, 170, 0.09, CLICK_PEAK, 'sine');
  blip(2200, 1150, 0.035, CLICK_PEAK * 0.4, 'triangle');
}

function target(e: Event): Element | null {
  const node = e.target;
  if (!(node instanceof Element)) return null;
  const el = node.closest(INTERACTIVE);
  if (!el) return null;
  if (el.closest('[aria-disabled="true"], [disabled]')) return null;
  return el;
}

/**
 * Attach the delegated hover/click listeners. Returns a cleanup function.
 * Safe to call once from a mounted component.
 */
export function installSfx(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onGesture = () => unlock();
  const onOver = (e: PointerEvent) => {
    if (!enabled) return;
    const el = target(e);
    if (!el) {
      lastHoverEl = null;
      return;
    }
    // pointerover also fires when moving between children of the same control
    const from = e.relatedTarget;
    if (from instanceof Node && el.contains(from)) return;
    if (el === lastHoverEl) return;
    lastHoverEl = el;
    const now = Date.now();
    if (now - lastHover < HOVER_GAP) return;
    lastHover = now;
    playHover();
  };
  const onClick = (e: MouseEvent) => {
    if (!enabled) return;
    if (!target(e)) return;
    playClick();
  };

  window.addEventListener('pointerdown', onGesture, { passive: true });
  window.addEventListener('keydown', onGesture);
  window.addEventListener('touchstart', onGesture, { passive: true });
  window.addEventListener('pointerover', onOver, { passive: true });
  window.addEventListener('click', onClick, true);

  return () => {
    window.removeEventListener('pointerdown', onGesture);
    window.removeEventListener('keydown', onGesture);
    window.removeEventListener('touchstart', onGesture);
    window.removeEventListener('pointerover', onOver);
    window.removeEventListener('click', onClick, true);
  };
}
