import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { X, BookOpen, Minus, Square } from "lucide-react";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-icon">
        <BookOpen size={small ? 17 : 21} strokeWidth={1.6} />
      </span>
      <span>
        booklean<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
export function Titlebar() {
  return (
    <div className="titlebar">
      <div className="titlebar-name">
        <BookOpen size={13} /> BOOKLEAN
      </div>
      <div className="window-buttons">
        <button
          aria-label="Simge durumuna küçült"
          onClick={() => window.booklean.minimize()}
        >
          <Minus size={14} />
        </button>
        <button
          aria-label="Pencere boyutunu değiştir"
          onClick={() => window.booklean.maximize()}
        >
          <Square size={11} />
        </button>
        <button
          className="close-window"
          aria-label="Uygulamayı kapat"
          onClick={() => window.booklean.close()}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const last = document.activeElement as HTMLElement;
    const element = ref.current;
    const focus = element?.querySelector<HTMLElement>(
      "input,select,textarea,button",
    );
    focus?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector(".anchored-popover")) return;
        e.stopPropagation();
        callback.current();
      }
      if (e.key === "Tab" && element) {
        const focusable = [
          ...element.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,textarea,select,[tabindex="0"]',
          ),
        ].filter((el) => el.offsetParent !== null);
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => {
      document.removeEventListener("keydown", handler, true);
      last?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <header className="modal-header">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" title="Kapat" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <label className="field">
      <span id={id}>{label}</span>
      {Children.map(children, (child) =>
        isValidElement<{
          "aria-label"?: string;
          "aria-labelledby"?: string;
          "aria-describedby"?: string;
        }>(child) &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
          ? cloneElement(child, {
              ...(!child.props["aria-label"] && !child.props["aria-labelledby"]
                ? { "aria-labelledby": id }
                : {}),
              ...(hint ? { "aria-describedby": id + "-hint" } : {}),
            })
          : child,
      )}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </label>
  );
}
export function Empty({
  icon,
  heading,
  children,
}: {
  icon: ReactNode;
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{heading}</h3>
      <p>{children}</p>
    </div>
  );
}
