import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import fonts from "../../electron/fonts.json";
import type { Library } from "../types";
import { Field } from "./UI";
import Popover from "./Popover";

export default function FontPicker({
  preferences,
  onChange,
}: {
  preferences: Library["preferences"];
  onChange: (patch: Partial<Library["preferences"]>) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <div className="font-picker-wrap">
      <button
        className={`font-picker ${anchor ? "active" : ""}`}
        aria-label="Yazı görünümü"
        aria-expanded={!!anchor}
        aria-haspopup="dialog"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        <b>Aa</b>
        <span>
          {fonts.find((f) => f.id === preferences.font)?.name ||
            preferences.font}
        </span>
        <ChevronDown size={14} />
      </button>
      {anchor && (
        <Popover
          anchor={anchor}
          onClose={() => setAnchor(null)}
          role="dialog"
          label="Yazı görünümü ayarları"
          className="font-popover"
          width={330}
        >
          <div className="font-options" role="group" aria-label="Yazı tipi">
            {fonts.map((font) => (
              <button
                key={font.id}
                className={`font-option ${preferences.font === font.id ? "selected" : ""}`}
                aria-pressed={preferences.font === font.id}
                onClick={() => onChange({ font: font.id })}
              >
                <span>
                  <strong style={{ fontFamily: font.id }}>{font.name}</strong>
                  <small>{font.description}</small>
                </span>
                {preferences.font === font.id && <Check size={17} />}
              </button>
            ))}
          </div>
          <div className="font-sliders">
            <Field label={`Yazı boyutu · ${preferences.fontSize} px`}>
              <input
                aria-label="Yazı boyutu"
                type="range"
                min={14}
                max={30}
                value={preferences.fontSize}
                onChange={(e) => onChange({ fontSize: +e.target.value })}
              />
            </Field>
            <Field label={`Satır aralığı · ${preferences.lineHeight}`}>
              <input
                aria-label="Satır aralığı"
                type="range"
                min={1.3}
                max={2.5}
                step={0.1}
                value={preferences.lineHeight}
                onChange={(e) => onChange({ lineHeight: +e.target.value })}
              />
            </Field>
          </div>
        </Popover>
      )}
    </div>
  );
}
