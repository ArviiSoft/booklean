import { Ellipsis, X, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
export type DockItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
};
export default function Dock({
  items,
  label,
}: {
  items: DockItem[];
  label: string;
}) {
  const [minimized, setMinimized] = useState(false);
  return (
    <nav
      className={`dynamic-dock ${minimized ? "minimized" : ""}`}
      aria-label={label}
      style={
        { "--dock-rest-width": `${items.length * 50 + 13}px` } as CSSProperties
      }
    >
      {minimized ? (
        <button
          className="dock-restore"
          aria-label="Dinamik adayı aç"
          title="Dinamik adayı aç"
          onClick={() => setMinimized(false)}
        >
          <Ellipsis size={22} />
        </button>
      ) : (
        <>
          <button
            className="dock-minimize"
            aria-label="Dinamik adayı küçült"
            title="Dinamik adayı küçült"
            onClick={() => setMinimized(true)}
          >
            <X size={12} />
          </button>
          {items.map((item) => (
            <div className="dock-slot" key={item.id}>
              <button
                className={`dock-item ${item.active ? "active" : ""}`}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
                disabled={item.disabled}
                onClick={item.onClick}
              >
                <item.icon size={21} strokeWidth={1.7} />
                <span className="dock-label">
                  {item.label}
                  {item.count !== undefined && <small>{item.count}</small>}
                </span>
              </button>
            </div>
          ))}
        </>
      )}
    </nav>
  );
}
