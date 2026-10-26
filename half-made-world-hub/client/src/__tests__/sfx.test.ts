import { afterEach, describe, expect, it } from 'vitest';
import { installSfx, setSfxEnabled, sfxEnabled } from '../sfx';

describe('UI sound effects', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    setSfxEnabled(true);
  });

  it('installs without Web Audio and survives hover/click events', () => {
    cleanup = installSfx();
    const btn = document.createElement('button');
    document.body.appendChild(btn);

    expect(() => btn.dispatchEvent(new Event('pointerover', { bubbles: true }))).not.toThrow();
    expect(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();

    btn.remove();
  });

  it('ignores clicks on disabled controls', () => {
    cleanup = installSfx();
    const btn = document.createElement('button');
    btn.disabled = true;
    document.body.appendChild(btn);

    expect(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();

    btn.remove();
  });

  it('persists the mute preference', () => {
    expect(sfxEnabled()).toBe(true);
    setSfxEnabled(false);
    expect(sfxEnabled()).toBe(false);
    expect(localStorage.getItem('hmw-sfx')).toBe('off');
    setSfxEnabled(true);
    expect(localStorage.getItem('hmw-sfx')).toBe('on');
  });
});
