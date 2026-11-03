import { themes } from "../appearance";
import SelectMenu from "./SelectMenu";
export default function ThemePicker({
  value,
  onChange,
  additionalOnly = false,
}: {
  value: string;
  onChange: (theme: string) => void;
  additionalOnly?: boolean;
}) {
  return (
    <SelectMenu
      label={additionalOnly ? "Diğer temalar" : "Tema seçimi"}
      value={value}
      onChange={onChange}
      className={
        additionalOnly ? "theme-picker additional-themes" : "theme-picker"
      }
      options={(additionalOnly ? themes.slice(3) : themes).map((t) => ({
        value: t.id,
        label: t.name,
        icon: (
          <span
            className="theme-swatch"
            aria-hidden="true"
            style={{
              background: t.paper,
              color: t.text,
              borderColor: t.border,
            }}
          >
            A
          </span>
        ),
      }))}
    />
  );
}
