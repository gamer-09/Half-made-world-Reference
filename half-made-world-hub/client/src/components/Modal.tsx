import { useEffect, type CSSProperties, type ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  accent?: string;
}

export function Modal({ onClose, children, wide, accent }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal-panel${wide ? ' modal-panel--wide' : ''}${accent ? ' has-accent' : ''}`}
        style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {accent && <span className="modal-accent" aria-hidden="true" />}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark" />
        </button>
        {children}
      </div>
    </div>
  );
}
