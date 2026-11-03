import type { StoryCalendar, StoryDate, StoryPeriod } from "../types";
import { monthDays, emptyPeriod } from "../calendar";
import { Field } from "./UI";
import type { KeyboardEvent } from "react";
export function saveShortcut(event: KeyboardEvent<HTMLFormElement>) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.requestSubmit();
  }
}

export function TagsInput({
  label = "Etiketler",
  value,
  onChange,
}: {
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <Field label={label} hint="Etiketleri virgülle ayırın.">
      <input
        value={value.join(",")}
        maxLength={3000}
        onChange={(e) => onChange(e.target.value.split(","))}
        placeholder="Örn. kuzey, mitoloji, gizem"
      />
    </Field>
  );
}
export const cleanTags = (tags: string[]) => [
  ...new Set(tags.map((t) => t.trim()).filter(Boolean)),
];
export function LinkPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="link-picker">
      <legend>{label}</legend>
      {options.length ? (
        <div>
          {options.map((o) => (
            <label key={o.id}>
              <input
                type="checkbox"
                checked={value.includes(o.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, o.id]
                      : value.filter((id) => id !== o.id),
                  )
                }
              />
              <span>{o.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="quiet">Henüz kayıt yok.</p>
      )}
    </fieldset>
  );
}
export function DateFields({
  label,
  value,
  calendar,
  onChange,
}: {
  label: string;
  value: StoryDate;
  calendar: StoryCalendar;
  onChange: (d: StoryDate) => void;
}) {
  const change = (patch: Partial<StoryDate>) => {
    const next = { ...value, ...patch };
    next.day = Math.min(next.day, monthDays(calendar, next.year, next.month));
    onChange(next);
  };
  return (
    <fieldset className="date-fields">
      <legend>{label}</legend>
      <div>
        <Field label={`${label} günü`}>
          <input
            type="number"
            min={1}
            max={monthDays(calendar, value.year, value.month)}
            required
            value={value.day}
            onChange={(e) => change({ day: Number(e.target.value) })}
          />
        </Field>
        <Field label={`${label} ayı`}>
          <select
            value={value.month}
            onChange={(e) => change({ month: Number(e.target.value) })}
          >
            {calendar.months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${label} yılı`}>
          <input
            type="number"
            required
            min={-999999}
            max={999999}
            value={value.year}
            onChange={(e) => change({ year: Number(e.target.value) })}
          />
        </Field>
      </div>
    </fieldset>
  );
}
export function PeriodFields({
  value,
  calendar,
  onChange,
  baseDate,
}: {
  value: StoryPeriod | null;
  calendar: StoryCalendar;
  onChange: (p: StoryPeriod | null) => void;
  baseDate: StoryDate;
}) {
  return (
    <div className="period-fields">
      <label className="check-line">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) =>
            onChange(e.target.checked ? emptyPeriod(baseDate) : null)
          }
        />
        Bir kurgu tarihi ata
      </label>
      {value && (
        <>
          <DateFields
            label="Başlangıç"
            value={value.start}
            calendar={calendar}
            onChange={(d) => onChange({ ...value, start: d })}
          />
          <label className="check-line">
            <input
              type="checkbox"
              checked={!!value.end}
              onChange={(e) =>
                onChange({
                  ...value,
                  end: e.target.checked ? { ...value.start } : null,
                })
              }
            />
            Bitiş tarihi / tarih aralığı
          </label>
          {value.end && (
            <DateFields
              label="Bitiş"
              value={value.end}
              calendar={calendar}
              onChange={(d) => onChange({ ...value, end: d })}
            />
          )}
          <div className="two-fields">
            <Field label="Başlangıç saati">
              <input
                type="time"
                value={value.startTime}
                onChange={(e) =>
                  onChange({ ...value, startTime: e.target.value })
                }
              />
            </Field>
            <Field label="Bitiş saati">
              <input
                type="time"
                value={value.endTime}
                onChange={(e) =>
                  onChange({ ...value, endTime: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Tarih notu">
            <textarea
              rows={2}
              value={value.note}
              maxLength={10000}
              onChange={(e) => onChange({ ...value, note: e.target.value })}
              placeholder="Örn. Fırtınadan üç gün sonra; yaklaşık tarih…"
            />
          </Field>
        </>
      )}
    </div>
  );
}
