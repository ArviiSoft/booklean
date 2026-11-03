import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import Popover from "./Popover";
export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};
export default function SelectMenu({
  label,
  value,
  options,
  onChange,
  icon,
  className = "",
  width = 270,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  className?: string;
  width?: number;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected = options.find((o) => o.value === value);
  return (
    <div className={`select-menu ${className}`}>
      <button
        type="button"
        className="select-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        {icon || selected?.icon}
        <span>{selected?.label || label}</span>
        <ChevronDown size={15} />
      </button>
      {anchor && (
        <Popover
          anchor={anchor}
          onClose={() => setAnchor(null)}
          label={label}
          width={width}
          className="dropdown-menu choice-menu"
        >
          <div className="menu-caption">{label}</div>
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              role="menuitemradio"
              aria-checked={value === option.value}
              className={value === option.value ? "selected" : ""}
              onClick={() => {
                onChange(option.value);
                setAnchor(null);
                anchor.focus();
              }}
            >
              {option.icon}
              <span>
                <strong>{option.label}</strong>
                {option.description && <small>{option.description}</small>}
              </span>
              {value === option.value && <Check size={16} />}
            </button>
          ))}
        </Popover>
      )}
    </div>
  );
}
