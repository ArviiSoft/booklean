const { randomUUID } = require("node:crypto");
const str = (v, max = 10000) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v, max = 1000) =>
  Array.isArray(v)
    ? v.slice(0, max).filter((x) => x && typeof x === "object")
    : [];
const strings = (v, max = 100) =>
  Array.isArray(v)
    ? [
        ...new Set(
          v.filter((x) => typeof x === "string").map((x) => x.slice(0, 300)),
        ),
      ].slice(0, max)
    : [];
const number = (v, min, max, fallback) =>
  Number.isFinite(v) ? Math.max(min, Math.min(max, Math.trunc(v))) : fallback;
const image = (v) =>
  /^data:image\/(png|jpeg|webp);base64,/i.test(v || "")
    ? str(v, 12 * 1024 * 1024)
    : "";
function normalizeCalendar(value = {}) {
  const v = value && typeof value === "object" ? value : {};
  const names = [
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
  ];
  const months = list(v.months, 24);
  const weekdays = strings(v.weekdays, 14).filter(Boolean);
  const result = {
    name: str(v.name, 150) || "Hikâye takvimi",
    era: str(v.era, 40),
    epochYear: number(v.epochYear, -999999, 999999, 1),
    firstWeekday: number(v.firstWeekday, 0, (weekdays.length || 7) - 1, 0),
    months: months.length
      ? months.map((m, i) => ({
          name: str(m.name, 60) || `${i + 1}. Ay`,
          days: number(m.days, 1, 100, 30),
          season: str(m.season, 60),
        }))
      : names.map((name, i) => ({
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
    weekdays: weekdays.length
      ? weekdays
      : ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
    leapYear: v.leapYear !== false,
    moonCycle: number(v.moonCycle, 0, 1000, 29),
    moonOffset: number(v.moonOffset, 0, 999, 0),
  };
  if (!value || !Object.keys(value).length) result.era = "MS";
  if (result.months.length < 2) result.leapYear = false;
  return result;
}
function normalizePeriod(v, calendar) {
  if (!v || typeof v !== "object") return null;
  const date = (d) => {
    if (
      !d ||
      !Number.isInteger(d.year) ||
      Math.abs(d.year) > 999999 ||
      !Number.isInteger(d.month) ||
      !calendar.months[d.month - 1]
    )
      return null;
    const leap =
      calendar.leapYear &&
      d.month === 2 &&
      d.year % 4 === 0 &&
      (d.year % 100 !== 0 || d.year % 400 === 0);
    if (
      !Number.isInteger(d.day) ||
      d.day < 1 ||
      d.day > calendar.months[d.month - 1].days + Number(leap)
    )
      return null;
    return { year: d.year, month: d.month, day: d.day };
  };
  const start = date(v.start),
    end = date(v.end);
  if (!start || (v.end && !end))
    throw new Error(
      "Kurgu takviminde geçersiz tarih var. Takvim ayarlarını ve günleri kontrol edin.",
    );
  const compare = (a, b) =>
    a.year - b.year || a.month - b.month || a.day - b.day;
  if (end && compare(end, start) < 0)
    throw new Error("Kurgu bitiş tarihi başlangıçtan önce olamaz.");
  const time = (t) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(t || "") ? t : "");
  const startTime = time(v.startTime),
    endTime = time(v.endTime);
  if (
    (!end || compare(end, start) === 0) &&
    startTime &&
    endTime &&
    endTime < startTime
  )
    throw new Error("Kurgu bitiş saati başlangıçtan önce olamaz.");
  return { start, end, startTime, endTime, note: str(v.note) };
}
function normalizeWorld(book, normalized, cleanHTML, freshIds) {
  const calendar = normalizeCalendar(book.calendar);
  const entryList = list(book.wiki, 5000),
    events = list(book.events, 10000);
  const chapterMap = new Map(
    book.chapters.map((c, i) => [c.id, normalized.chapters[i].id]),
  );
  const characterMap = new Map(
    list(book.characters).map((c, i) => [c.id, normalized.characters[i]?.id]),
  );
  const entryIds = new Set();
  const entryMap = new Map();
  const ids = entryList.map((e) => {
    let id =
      !freshIds &&
      typeof e.id === "string" &&
      e.id.length < 100 &&
      !entryIds.has(e.id)
        ? e.id
        : randomUUID();
    entryIds.add(id);
    if (!entryMap.has(e.id)) entryMap.set(e.id, id);
    return id;
  });
  const refs = (v, map) =>
    strings(v, 2000)
      .map((id) => map.get(id))
      .filter(Boolean);
  const content = (e) => ({
    title: str(e.title, 300) || "Adsız kayıt",
    category: [
      "civilization",
      "organization",
      "history",
      "culture",
      "item",
      "nature",
      "place",
      "lore",
    ].includes(e.category)
      ? e.category
      : "lore",
    subtype: str(e.subtype, 100),
    group: str(e.group, 100),
    tags: strings(e.tags),
    cover: image(e.cover),
    summary: str(e.summary, 30000),
    status: e.status === "complete" ? "complete" : "draft",
    favorite: !!e.favorite,
    attributes: list(e.attributes, 100).map((a) => ({
      id: str(a.id, 100) || randomUUID(),
      name: str(a.name, 200),
      value: str(a.value, 10000),
    })),
    sections: list(e.sections, 100).map((s) => ({
      id: str(s.id, 100) || randomUUID(),
      title: str(s.title, 200),
      kind: ["text", "quote", "image", "table"].includes(s.kind)
        ? s.kind
        : "text",
      content:
        s.kind === "image"
          ? image(s.content)
          : s.kind === "text"
            ? cleanHTML(str(s.content, 200000))
            : str(s.content, 200000),
      rows: Array.isArray(s.rows)
        ? s.rows
            .slice(0, 100)
            .map((r) =>
              Array.isArray(r) ? r.slice(0, 20).map((v) => str(v, 5000)) : [],
            )
        : [],
    })),
    relations: list(e.relations, 200)
      .filter((r) => entryMap.has(r.targetId))
      .map((r) => ({
        targetId: entryMap.get(r.targetId),
        label: str(r.label, 200),
      })),
    chapterIds: refs(e.chapterIds, chapterMap),
    characterIds: refs(e.characterIds, characterMap),
  });
  const stamp = new Date().toISOString();
  const eventIds = new Set();
  return {
    calendar,
    storyPeriod: normalizePeriod(book.storyPeriod, calendar),
    wiki: entryList.map((e, i) => ({
      ...content(e),
      id: ids[i],
      createdAt: str(e.createdAt, 40) || stamp,
      updatedAt: str(e.updatedAt, 40) || stamp,
      history: list(e.history, 15)
        .filter((h) => h.content && typeof h.content === "object")
        .map((h) => ({
          savedAt: str(h.savedAt, 40),
          content: content(h.content),
        })),
    })),
    events: events.map((e) => {
      const id =
        !freshIds &&
        typeof e.id === "string" &&
        e.id.length < 100 &&
        !eventIds.has(e.id)
          ? e.id
          : randomUUID();
      eventIds.add(id);
      return {
        id,
        title: str(e.title, 300) || "Adsız olay",
        description: str(e.description, 50000),
        period: normalizePeriod(e.period, calendar),
        kind: ["scene", "history", "festival", "journey", "other"].includes(
          e.kind,
        )
          ? e.kind
          : "scene",
        status: ["planned", "written", "complete"].includes(e.status)
          ? e.status
          : "planned",
        color: /^#[\da-f]{6}$/i.test(e.color || "") ? e.color : "#b7a0dc",
        thread: str(e.thread, 150),
        location: str(e.location, 300),
        weather: str(e.weather, 100),
        tags: strings(e.tags),
        recurrence: ["yearly", "monthly"].includes(e.recurrence)
          ? e.recurrence
          : "none",
        chapterIds: refs(e.chapterIds, chapterMap),
        characterIds: refs(e.characterIds, characterMap),
        wikiIds: refs(e.wikiIds, entryMap),
      };
    }),
  };
}
module.exports = { normalizeCalendar, normalizePeriod, normalizeWorld };
