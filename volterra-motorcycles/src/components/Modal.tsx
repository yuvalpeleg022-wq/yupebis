import { useEffect, useRef, type ReactNode } from 'react';
import { Close } from './Icons';
import './Modal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}

/** Native <dialog> wrapper: focus trapping, Esc to close and backdrop click are handled by the browser. */
export function Modal({ open, onClose, label, className = '', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.body.classList.add('no-scroll');
    } else if (!open && d.open) {
      d.close();
    }
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="modal__inner">
          <button type="button" className="icon-btn modal__close" onClick={onClose} aria-label="Close">
            <Close />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
