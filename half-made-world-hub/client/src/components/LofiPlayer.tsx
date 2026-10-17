import { useEffect, useRef, useState } from 'react';
import { createLofi, type LofiHandle } from '../lofi';

const STORAGE_KEY = 'hmw-lofi';

export function LofiPlayer() {
  const [on, setOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const engineRef = useRef<LofiHandle | null>(null);

  useEffect(() => {
    const engine = createLofi();
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    if (on) engineRef.current?.start();
    else engineRef.current?.stop();
  }, [on]);

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm lofi-toggle${on ? ' on' : ''}`}
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      title={on ? 'Pause the lofi beat' : 'Play a lofi beat'}
    >
      <span className="lofi-eq" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {on ? 'Lofi on' : 'Lofi off'}
    </button>
  );
}
