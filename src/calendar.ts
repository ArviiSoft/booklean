import type {
  StoryCalendar,
  StoryDate,
  StoryEvent,
  StoryPeriod,
} from "./types";

export const defaultCalendar = (): StoryCalendar => ({
  name: "Hikâye takvimi",
  era: "MS",
  epochYear: 1,
  firstWeekday: 0,
  months: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ].map((name, i) => ({
    name,
    days: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i],
    season: [
      "Kış",
      "Kış",
      "İlkbahar",
      "İlkbahar",
      "İlkbahar",
      "Yaz",
      "Yaz",
      "Yaz",
      "Sonbahar",
      "Sonbahar",
      "Sonbahar",
      "Kış",
    ][i],
  })),
  weekdays: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
  leapYear: true,
  moonCycle: 29,
  moonOffset: 0,
});
export const isLeap = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
export const monthDays = (c: StoryCalendar, year: number, month: number) =>
  (c.months[month - 1]?.days || 0) +
  (c.leapYear && month === 2 && isLeap(year) ? 1 : 0);
export function validDate(
  c: StoryCalendar,
  d: StoryDate | null | undefined,
): d is StoryDate {
  return (
    !!d &&
    Number.isInteger(d.year) &&
    Math.abs(d.year) <= 999999 &&
    Number.isInteger(d.month) &&
    d.month >= 1 &&
    d.month <= c.months.length &&
    Number.isInteger(d.day) &&
    d.day >= 1 &&
    d.day <= monthDays(c, d.year, d.month)
  );
}
const leapsBefore = (year: number) =>
  Math.floor((year - 1) / 4) -
  Math.floor((year - 1) / 100) +
  Math.floor((year - 1) / 400);
export function ordinal(c: StoryCalendar, d: StoryDate) {
  const yearDays = c.months.reduce((sum, m) => sum + m.days, 0);
  return (
    (d.year - c.epochYear) * yearDays +
    (c.leapYear ? leapsBefore(d.year) - leapsBefore(c.epochYear) : 0) +
    c.months.slice(0, d.month - 1).reduce((sum, m) => sum + m.days, 0) +
    (c.leapYear && d.month > 2 && isLeap(d.year) ? 1 : 0) +
    d.day -
    1
  );
}
export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const weekday = (c: StoryCalendar, d: StoryDate) =>
  mod(ordinal(c, d) + c.firstWeekday, c.weekdays.length);
export const dateLabel = (c: StoryCalendar, d?: StoryDate | null) =>
  d
    ? `${d.day} ${c.months[d.month - 1]?.name || "?"} ${d.year} ${c.era}`.trim()
    : "Tarihsiz";
export const periodLabel = (c: StoryCalendar, p?: StoryPeriod | null) =>
  p
    ? `${dateLabel(c, p.start)}${p.startTime ? " · " + p.startTime : ""}${p.end ? " — " + dateLabel(c, p.end) + (p.endTime ? " · " + p.endTime : "") : ""}`
    : "Tarih atanmadı";
export const emptyPeriod = (d: StoryDate): StoryPeriod => ({
  start: d,
  end: null,
  startTime: "",
  endTime: "",
  note: "",
});
export function periodError(c: StoryCalendar, p: StoryPeriod | null) {
  if (!p) return "";
  if (!validDate(c, p.start) || (p.end && !validDate(c, p.end)))
    return "Seçilen gün bu takvimde geçerli değil.";
  if (p.end && ordinal(c, p.end) < ordinal(c, p.start))
    return "Bitiş tarihi başlangıçtan önce olamaz.";
  if (
    (!p.end || ordinal(c, p.end) === ordinal(c, p.start)) &&
    p.startTime &&
    p.endTime &&
    p.endTime < p.startTime
  )
    return "Bitiş saati başlangıçtan önce olamaz.";
  return "";
}
export function eventOnDate(c: StoryCalendar, event: StoryEvent, d: StoryDate) {
  if (!event.period) return false;
  let start = event.period.start;
  const duration = event.period.end
    ? ordinal(c, event.period.end) - ordinal(c, start)
    : 0;
  const target = ordinal(c, d);
  if (target < ordinal(c, start)) return false;
  const candidates =
    event.recurrence === "yearly"
      ? [
          { ...start, year: d.year },
          { ...start, year: d.year - 1 },
        ]
      : event.recurrence === "monthly"
        ? [
            { ...start, year: d.year, month: d.month },
            {
              ...start,
              year: d.month === 1 ? d.year - 1 : d.year,
              month: d.month === 1 ? c.months.length : d.month - 1,
            },
          ]
        : [start];
  return candidates.some(
    (s) =>
      validDate(c, s) &&
      target >= ordinal(c, s) &&
      target <= ordinal(c, s) + duration,
  );
}
