import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export default function Popover({
  anchor,
  onClose,
  children,
  className = "",
  width = 270,
  role = "menu",
  label,
  placement = "bottom-end",
}: {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  width?: number;
  role?: "menu" | "dialog";
  label: string;
  placement?: "bottom-end" | "right-start";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });
  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      const menu = ref.current;
      if (!menu || !anchor.isConnected) return closeRef.current();
      const rect = anchor.getBoundingClientRect();
      const box = menu.getBoundingClientRect();
      const edge = 12;
      const topEdge = 42;
      const below = rect.bottom + 8;
      const top =
        placement === "right-start"
          ? rect.top
          : below + box.height <= window.innerHeight - edge
            ? below
            : rect.top - box.height - 8;
      const left =
        placement === "right-start"
          ? rect.right + 8 + box.width <= window.innerWidth - edge
            ? rect.right + 8
            : rect.left - box.width - 8
          : rect.right - box.width;
      setPosition({
        left: Math.max(
          edge,
          Math.min(left, window.innerWidth - box.width - edge),
        ),
        top: Math.max(
          topEdge,
          Math.min(top, window.innerHeight - box.height - edge),
        ),
        ready: true,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    place();
    const observer = new ResizeObserver(schedule);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [anchor, placement]);
  useEffect(() => {
    if (role === "menu")
      ref.current
        ?.querySelector<HTMLButtonElement>(
          'button[aria-checked="true"], button:not(:disabled)',
        )
        ?.focus();
    const outside = (e: PointerEvent) => {
      if (
        !ref.current?.contains(e.target as Node) &&
        !anchor.contains(e.target as Node)
      )
        closeRef.current();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        anchor.focus();
      }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [anchor, role]);
  return createPortal(
    <div
      ref={ref}
      role={role}
      aria-label={label}
      className={`anchored-popover ${className}`}
      style={{
        width,
        left: position.left,
        top: position.top,
        visibility: position.ready ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (role !== "menu") return;
        const buttons = [
          ...(ref.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) || []),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }
        if (e.key === "Tab") closeRef.current();
      }}
    >
      {children}
    </div>,
    document.querySelector(".app") || document.body,
  );
}
