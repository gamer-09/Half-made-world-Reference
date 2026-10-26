import { useEffect, useState } from 'react';
import { installSfx, setSfxEnabled, sfxEnabled } from '../sfx';

export function SoundToggle() {
  const [on, setOn] = useState<boolean>(() => sfxEnabled());

  useEffect(() => installSfx(), []);

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm sfx-toggle${on ? ' on' : ''}`}
      aria-pressed={on}
      title={on ? 'Mute interface sounds' : 'Unmute interface sounds'}
      onClick={() => {
        const next = !on;
        setOn(next);
        setSfxEnabled(next);
      }}
    >
      <i className={on ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'} aria-hidden="true" />
      {on ? 'Sound on' : 'Sound off'}
    </button>
  );
}
