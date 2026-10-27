import { useEffect, useState } from 'react';

const STORAGE_KEY = 'hmw-system-ui';

export function SystemToggle() {
  const [on, setOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (on) {
      root.classList.add('system-ui');
    } else {
      root.classList.remove('system-ui');
    }
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, [on]);

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm system-toggle${on ? ' on' : ''}`}
      aria-pressed={on}
      title={on ? 'Switch to classic UI' : 'Switch to manga/manhwa system UI'}
      onClick={() => setOn((v) => !v)}
    >
      <i className="fa-solid fa-border-all" aria-hidden="true" />
      {on ? 'System UI' : 'System UI'}
    </button>
  );
}
