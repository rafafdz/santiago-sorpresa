import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  kicker?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Accessible dialog: labelled, Esc to close, focus kept inside, focus restored on close. */
export function Modal({ title, kicker, onClose, children, className = '', wide }: Props) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === 'Tab' && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent);
        if (!items.length) return;
        const a = items[0];
        const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className="backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={ref}
        className={`sheet ${wide ? 'sheet-wide' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header className="sheet-head">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            <h2 id={id}>{title}</h2>
          </div>
          {onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
