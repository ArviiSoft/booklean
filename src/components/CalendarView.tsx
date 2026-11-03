import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  List,
  Columns3,
  Search,
  MapPin,
  Moon,
  CloudSun,
  Clock3,
  BookOpen,
  FileText,
  Inbox,
  Check,
  Trash2,
  X,
  Copy,
} from "lucide-react";
import type {
  Book,
  StoryCalendar,
  StoryDate,
  StoryEvent,
  StoryPeriod,
} from "../types";
import { uid } from "../model";
import {
  dateLabel,
  defaultCalendar,
  emptyPeriod,
  eventOnDate,
  mod,
  monthDays,
  ordinal,
  periodError,
  periodLabel,
  weekday,
} from "../calendar";
import { Field, Modal } from "./UI";
import {
  cleanTags,
  LinkPicker,
  PeriodFields,
  TagsInput,
  saveShortcut,
} from "./WorldFields";
const kinds = {
  scene: "Sahne",
  history: "Tarihî olay",
  festival: "Kutlama",
  journey: "Yolculuk",
  other: "Diğer",
};
const statuses = {
  planned: "Planlandı",
  written: "Yazıldı",
  complete: "Tamamlandı",
};
const newEvent = (date: StoryDate | null): StoryEvent => ({
  id: uid(),
  title: "",
  description: "",
  period: date ? emptyPeriod(date) : null,
  kind: "scene",
  status: "planned",
  color: "#b7a0dc",
  thread: "",
  location: "",
  weather: "",
  tags: [],
  recurrence: "none",
  chapterIds: [],
  characterIds: [],
  wikiIds: [],
});
type Props = {
  book: Book;
  chapterId: string;
  onUpdate: (fn: (b: Book) => Book) => void;
  notify: (s: string) => void;
};
export default function CalendarView({
  book,
  chapterId,
  onUpdate,
  notify,
}: Props) {
  const calendar = book.calendar || defaultCalendar();
  const initial = book.chapters.find((c) => c.id === chapterId)?.storyPeriod
    ?.start ||
    book.storyPeriod?.start ||
    book.events?.find((e) => e.period)?.period?.start || {
      year: 1000,
      month: 1,
      day: 1,
    };
  const [cursor, setCursor] = useState({
    year: initial.year,
    month: initial.month,
  });
  const [selected, setSelected] = useState<StoryDate>(initial);
  const [view, setView] = useState<"calendar" | "timeline" | "board">(
    "calendar",
  );
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [thread, setThread] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [editing, setEditing] = useState<StoryEvent | null>(null);
  const [deleting, setDeleting] = useState<StoryEvent | null>(null);
  const [settings, setSettings] = useState(false);
  const [periodTarget, setPeriodTarget] = useState<string | null>(null);
  const events = book.events || [];
  const visible = events.filter(
    (e) =>
      (!kind || e.kind === kind) &&
      (!thread || e.thread === thread) &&
      (!chapterFilter || e.chapterIds.includes(chapterFilter)) &&
      [e.title, e.description, e.location, ...e.tags]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const undated = visible.filter((e) => !e.period);
  const dayEvents = visible.filter((e) => eventOnDate(calendar, e, selected));
  const dayCount = monthDays(calendar, cursor.year, cursor.month);
  const offset = weekday(calendar, { ...cursor, day: 1 });
  const cells =
    Math.ceil((dayCount + offset) / calendar.weekdays.length) *
    calendar.weekdays.length;
  const assignments = [
    { id: "book", title: book.title, period: book.storyPeriod, book: true },
    ...book.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      period: c.storyPeriod,
      book: false,
    })),
  ];
  const onDay = (p: StoryPeriod | null | undefined, d: StoryDate) =>
    !!p &&
    ordinal(calendar, d) >= ordinal(calendar, p.start) &&
    ordinal(calendar, d) <= ordinal(calendar, p.end || p.start);
  function navigate(step: number) {
    const m = cursor.month - 1 + step;
    const next = {
      year: cursor.year + Math.floor(m / calendar.months.length),
      month: mod(m, calendar.months.length) + 1,
    };
    if (Math.abs(next.year) > 999999) return;
    setCursor(next);
    setSelected({ ...next, day: 1 });
  }
  function saveEvent(event: StoryEvent) {
    onUpdate((b) => ({
      ...b,
      events: b.events?.some((e) => e.id === event.id)
        ? b.events.map((e) =>
            e.id === event.id
              ? {
                  ...event,
                  title: event.title.trim(),
                  tags: cleanTags(event.tags),
                }
              : e,
          )
        : [
            ...(b.events || []),
            {
              ...event,
              title: event.title.trim(),
              tags: cleanTags(event.tags),
            },
          ],
    }));
    if (event.period) {
      setSelected(event.period.start);
      setCursor({
        year: event.period.start.year,
        month: event.period.start.month,
      });
    }
    setEditing(null);
    notify("Kurgu olayı kaydedildi.");
  }
  const eventCard = (e: StoryEvent) => (
    <article
      className="story-event-card"
      key={e.id}
      style={{ "--event-color": e.color } as React.CSSProperties}
    >
      <button
        className="story-event-open"
        onClick={() => setEditing(structuredClone(e))}
      >
        <span className="event-kicker">
          {kinds[e.kind]}
          {e.recurrence !== "none" && " · Tekrarlanan"}
        </span>
        <strong>{e.title}</strong>
        <small>
          <Clock3 size={13} />
          {periodLabel(calendar, e.period)}
        </small>
        {e.location && (
          <small>
            <MapPin size={13} />
            {e.location}
          </small>
        )}
        {e.description && <p>{e.description}</p>}
        <span className="event-links">
          {e.chapterIds.length} bölüm · {e.characterIds.length} karakter ·{" "}
          {e.wikiIds.length} Wiki
        </span>
      </button>
      <div className="event-card-actions">
        <select
          aria-label={`${e.title} durumu`}
          value={e.status}
          onChange={(ev) =>
            onUpdate((b) => ({
              ...b,
              events: (b.events || []).map((x) =>
                x.id === e.id
                  ? { ...x, status: ev.target.value as StoryEvent["status"] }
                  : x,
              ),
            }))
          }
        >
          {Object.entries(statuses).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          aria-label={`${e.title} olayını çoğalt`}
          onClick={() =>
            setEditing({
              ...structuredClone(e),
              id: uid(),
              title: e.title + " — kopya",
            })
          }
        >
          <Copy size={14} />
        </button>
        <button
          aria-label={`${e.title} olayını sil`}
          onClick={() => setDeleting(e)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
  return (
    <main className="world-view calendar-view">
      <header className="world-heading">
        <div>
          <div className="eyebrow">{book.title} · ZAMAN & OLAY ÖRGÜSÜ</div>
          <h1>
            Her hikâyenin bir zamanı var<span>.</span>
          </h1>
          <p>
            Sahneleri sıraya koyun. Dünyanızın geçmişini ve bölümlerinizin
            zamanını bir arada görün.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => setEditing(newEvent(selected))}
        >
          <Plus size={18} />
          Olay ekle
        </button>
      </header>
      <section className="story-period-summary">
        <div>
          <CalendarDays size={22} />
          <span>
            <small>KİTABIN GEÇTİĞİ TARİH</small>
            <strong>{periodLabel(calendar, book.storyPeriod)}</strong>
          </span>
        </div>
        <button
          className="button secondary"
          onClick={() => setPeriodTarget("book")}
        >
          Kitap tarihini ayarla
        </button>
        <button
          className="button secondary"
          onClick={() => setPeriodTarget(chapterId)}
        >
          Açık bölümün tarihi
        </button>
      </section>
      <div className="world-toolbar">
        <label className="world-search">
          <Search size={18} />
          <input
            aria-label="Olaylarda ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Olay, yer veya etiket ara…"
          />
        </label>
        <select
          aria-label="Olay türü filtresi"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Tüm olay türleri</option>
          {Object.entries(kinds).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Olay örgüsü filtresi"
          value={thread}
          onChange={(e) => setThread(e.target.value)}
        >
          <option value="">Tüm olay örgüleri</option>
          {[...new Set(events.map((e) => e.thread).filter(Boolean))].map(
            (t) => (
              <option key={t}>{t}</option>
            ),
          )}
        </select>
        <select
          aria-label="Bölüm filtresi"
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
        >
          <option value="">Tüm bölümler</option>
          {book.chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button className="button secondary" onClick={() => setSettings(true)}>
          <Settings2 size={17} />
          Takvim ayarları
        </button>
      </div>
      <div className="calendar-toolbar">
        <div className="calendar-month-controls">
          <button
            className="world-tool"
            aria-label="Önceki ay"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <select
            aria-label="Görüntülenen ay"
            value={cursor.month}
            onChange={(e) => {
              const next = { ...cursor, month: Number(e.target.value) };
              setCursor(next);
              setSelected({ ...next, day: 1 });
            }}
          >
            {calendar.months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Görüntülenen yıl"
            type="number"
            min={-999999}
            max={999999}
            value={cursor.year}
            onChange={(e) => {
              const year = Math.max(
                -999999,
                Math.min(999999, Number(e.target.value)),
              );
              setCursor({ ...cursor, year });
              setSelected({ ...cursor, year, day: 1 });
            }}
          />
          <span>{calendar.era}</span>
          <button
            className="world-tool"
            aria-label="Sonraki ay"
            onClick={() => navigate(1)}
          >
            <ChevronRight size={20} />
          </button>
          <span className="calendar-season">
            <CloudSun size={16} />
            {calendar.months[cursor.month - 1]?.season || calendar.name}
          </span>
        </div>
        <div className="segmented">
          {(
            [
              { id: "board", label: "Pano", icon: Columns3 },
              { id: "timeline", label: "Kronoloji", icon: List },
              { id: "calendar", label: "Takvim", icon: CalendarDays },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              className={view === v.id ? "active" : ""}
              onClick={() => setView(v.id)}
            >
              <v.icon size={17} />
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="calendar-layout">
        <aside className="calendar-sidebar">
          <section>
            <h3>
              <Inbox size={17} />
              Tarihsiz <small>{undated.length}</small>
            </h3>
            <p className="quiet">Henüz zamanı belli olmayan fikirler.</p>
            {undated.map((e) => (
              <button
                className="undated-event"
                key={e.id}
                draggable
                onDragStart={(ev) =>
                  ev.dataTransfer.setData("text/booklean-event", e.id)
                }
                onClick={() => setEditing(structuredClone(e))}
              >
                <span style={{ background: e.color }} />
                {e.title}
              </button>
            ))}
            <button
              className="text-button"
              onClick={() => setEditing(newEvent(null))}
            >
              <Plus size={15} />
              Tarihsiz olay ekle
            </button>
          </section>
          <section className="chapter-date-list">
            <h3>
              <BookOpen size={17} />
              Bölüm tarihleri
            </h3>
            {book.chapters.map((c, i) => (
              <button
                key={c.id}
                className={c.id === chapterId ? "current" : ""}
                onClick={() => setPeriodTarget(c.id)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{c.title}</strong>
                  <small>{periodLabel(calendar, c.storyPeriod)}</small>
                </div>
              </button>
            ))}
          </section>
          <section>
            <h3>{dateLabel(calendar, selected)}</h3>
            <div className="button-row">
              <button
                className="text-button"
                onClick={() => setEditing(newEvent(selected))}
              >
                <Plus size={15} />
                Bu güne olay ekle
              </button>
            </div>
            {!dayEvents.length && (
              <p className="quiet">Bu gün için olay yok.</p>
            )}
            {dayEvents.map((e) => (
              <button
                className="selected-day-event"
                key={e.id}
                onClick={() => setEditing(structuredClone(e))}
              >
                <span style={{ background: e.color }} />
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {e.period?.startTime || "Tüm gün"}
                    {e.weather ? " · " + e.weather : ""}
                  </small>
                </div>
              </button>
            ))}
          </section>
        </aside>
        <div className="calendar-main">
          {view === "calendar" && (
            <>
              <div
                className="calendar-grid"
                style={{
                  gridTemplateColumns: `repeat(${calendar.weekdays.length}, minmax(0,1fr))`,
                }}
              >
                <div className="calendar-weekdays">
                  {calendar.weekdays.map((day, i) => (
                    <div key={i}>{day}</div>
                  ))}
                </div>
                {Array.from({ length: cells }, (_, i) => {
                  const day = i - offset + 1;
                  if (day < 1 || day > dayCount)
                    return <div key={i} className="calendar-blank" />;
                  const d = { ...cursor, day };
                  const daily = visible.filter((e) =>
                    eventOnDate(calendar, e, d),
                  );
                  const dateAssignments = assignments.filter((a) =>
                    onDay(a.period, d),
                  );
                  const phase = calendar.moonCycle
                    ? mod(
                        ordinal(calendar, d) + calendar.moonOffset,
                        calendar.moonCycle,
                      ) / calendar.moonCycle
                    : 0;
                  return (
                    <div
                      className={`calendar-day ${selected.year === d.year && selected.month === d.month && selected.day === day ? "selected" : ""}`}
                      key={i}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData(
                          "text/booklean-event",
                        );
                        const event = events.find((x) => x.id === id);
                        if (event && !event.period)
                          saveEvent({ ...event, period: emptyPeriod(d) });
                      }}
                    >
                      <button
                        className="calendar-day-heading"
                        aria-label={dateLabel(calendar, d)}
                        onClick={() => setSelected(d)}
                        onDoubleClick={() => setEditing(newEvent(d))}
                      >
                        <strong>{day}</strong>
                        {calendar.moonCycle > 0 && (
                          <span
                            className="moon-phase"
                            title={`Kurgu ay döngüsü: ${Math.floor(phase * calendar.moonCycle) + 1}/${calendar.moonCycle}`}
                          >
                            <Moon size={12} />
                            {
                              ["●", "◔", "◑", "◕", "○", "◕", "◑", "◔"][
                                Math.floor(phase * 8)
                              ]
                            }
                          </span>
                        )}
                      </button>
                      {dateAssignments.map((a) => (
                        <button
                          key={a.id}
                          className={`calendar-assignment ${a.book ? "is-book" : ""}`}
                          title={a.title}
                          onClick={() => setPeriodTarget(a.id)}
                        >
                          {a.book ? (
                            <BookOpen size={11} />
                          ) : (
                            <FileText size={11} />
                          )}
                          <span>{a.title}</span>
                        </button>
                      ))}
                      {daily.map((e) => (
                        <button
                          className="calendar-event"
                          style={
                            { "--event-color": e.color } as React.CSSProperties
                          }
                          key={e.id}
                          onClick={() => setEditing(structuredClone(e))}
                        >
                          <span>{e.period?.startTime}</span>
                          {e.title}
                          {e.weather && <CloudSun size={11} />}
                        </button>
                      ))}
                      <button
                        className="calendar-add"
                        aria-label={`${dateLabel(calendar, d)} olay ekle`}
                        onClick={() => setEditing(newEvent(d))}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="calendar-legend">
                <span className="legend-book" />
                Kitap / bölüm tarihleri <span className="legend-event" />
                Kurgu olayları · Gün başlığına çift tıklayarak olay ekleyin.
                Tarihsiz olayları günlere sürükleyebilirsiniz.
              </p>
            </>
          )}
          {view === "timeline" && (
            <div className="story-timeline">
              <div className="world-result-count">
                {visible.length} olay · Tüm tarihler
              </div>
              {[...visible]
                .sort((a, b) =>
                  a.period && b.period
                    ? ordinal(calendar, a.period.start) -
                        ordinal(calendar, b.period.start) ||
                      a.period.startTime.localeCompare(b.period.startTime)
                    : a.period
                      ? -1
                      : b.period
                        ? 1
                        : a.title.localeCompare(b.title, "tr"),
                )
                .map(eventCard)}
              {!visible.length && (
                <div className="world-empty">
                  <Clock3 size={35} />
                  <h3>Kronolojinin ilk anını yazın.</h3>
                  <p>Eklenen olaylar kurgu tarihlerine göre sıralanır.</p>
                </div>
              )}
            </div>
          )}
          {view === "board" && (
            <div className="story-board">
              {Object.entries(statuses).map(([status, label]) => (
                <section key={status}>
                  <h3>
                    {label}
                    <small>
                      {visible.filter((e) => e.status === status).length}
                    </small>
                  </h3>
                  {visible.filter((e) => e.status === status).map(eventCard)}
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditing({
                        ...newEvent(null),
                        status: status as StoryEvent["status"],
                      })
                    }
                  >
                    <Plus size={15} />
                    Olay ekle
                  </button>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
      {editing && (
        <EventEditor
          key={editing.id}
          event={editing}
          book={book}
          calendar={calendar}
          baseDate={selected}
          onClose={() => setEditing(null)}
          onSave={saveEvent}
          onDelete={
            events.some((e) => e.id === editing.id)
              ? () => {
                  onUpdate((b) => ({
                    ...b,
                    events: (b.events || []).filter((e) => e.id !== editing.id),
                  }));
                  setEditing(null);
                  notify("Olay silindi.");
                }
              : undefined
          }
        />
      )}
      {settings && (
        <CalendarSettings
          book={book}
          calendar={calendar}
          onClose={() => setSettings(false)}
          onSave={(next) => {
            onUpdate((b) => ({ ...b, calendar: next }));
            const month = Math.min(cursor.month, next.months.length);
            setCursor({ ...cursor, month });
            setSelected({ ...cursor, month, day: 1 });
            setSettings(false);
            notify("Takvim ayarları kaydedildi.");
          }}
        />
      )}
      {periodTarget && (
        <PeriodDialog
          key={periodTarget}
          title={
            periodTarget === "book"
              ? "Kitabın geçtiği tarih"
              : book.chapters.find((c) => c.id === periodTarget)?.title ||
                "Bölüm tarihi"
          }
          value={
            periodTarget === "book"
              ? book.storyPeriod || null
              : book.chapters.find((c) => c.id === periodTarget)?.storyPeriod ||
                null
          }
          calendar={calendar}
          baseDate={selected}
          onClose={() => setPeriodTarget(null)}
          onSave={(period) => {
            onUpdate((b) =>
              periodTarget === "book"
                ? { ...b, storyPeriod: period }
                : {
                    ...b,
                    chapters: b.chapters.map((c) =>
                      c.id === periodTarget ? { ...c, storyPeriod: period } : c,
                    ),
                  },
            );
            if (period) {
              setSelected(period.start);
              setCursor({ year: period.start.year, month: period.start.month });
            }
            setPeriodTarget(null);
            notify(
              period ? "Kurgu tarihi kaydedildi." : "Kurgu tarihi silindi.",
            );
          }}
        />
      )}
      {deleting && (
        <Modal title="Olay silinsin mi?" onClose={() => setDeleting(null)}>
          <div className="dialog-body">
            <p>“{deleting.title}” takvimden ve kronolojiden kaldırılacak.</p>
          </div>
          <footer className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Vazgeç
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                onUpdate((b) => ({
                  ...b,
                  events: (b.events || []).filter((e) => e.id !== deleting.id),
                }));
                setDeleting(null);
                notify("Olay silindi.");
              }}
            >
              Olayı sil
            </button>
          </footer>
        </Modal>
      )}
    </main>
  );
}

function EventEditor({
  event,
  book,
  calendar,
  baseDate,
  onClose,
  onSave,
  onDelete,
}: {
  event: StoryEvent;
  book: Book;
  calendar: StoryCalendar;
  baseDate: StoryDate;
  onClose: () => void;
  onSave: (e: StoryEvent) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState(event),
    [discard, setDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (p: Partial<StoryEvent>) => setDraft((d) => ({ ...d, ...p }));
  const close = () =>
    JSON.stringify(draft) !== JSON.stringify(event)
      ? setDiscard(true)
      : onClose();
  const error = periodError(calendar, draft.period);
  return (
    <Modal
      title={event.title || "Yeni kurgu olayı"}
      eyebrow="ZAMAN ÇİZELGESİ"
      wide
      onClose={close}
    >
      <form
        onKeyDown={saveShortcut}
        onSubmit={(e) => {
          e.preventDefault();
          if (!confirmDelete && !error && draft.title.trim()) onSave(draft);
        }}
      >
        <div className="dialog-body event-editor">
          <div>
            <Field label="Olay başlığı">
              <input
                autoFocus
                required
                maxLength={300}
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="O gün ne oldu?"
              />
            </Field>
            <div className="three-fields">
              <Field label="Olay türü">
                <select
                  value={draft.kind}
                  onChange={(e) =>
                    patch({ kind: e.target.value as StoryEvent["kind"] })
                  }
                >
                  {Object.entries(kinds).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Olay durumu">
                <select
                  value={draft.status}
                  onChange={(e) =>
                    patch({ status: e.target.value as StoryEvent["status"] })
                  }
                >
                  {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Olay rengi">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Olayın ayrıntıları">
              <textarea
                rows={5}
                maxLength={50000}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Nedenleri, yaşananlar, sonuçları ve hikâyeye etkisi…"
              />
            </Field>
            <div className="two-fields">
              <Field label="Olay örgüsü">
                <input
                  maxLength={150}
                  list="event-threads"
                  value={draft.thread}
                  onChange={(e) => patch({ thread: e.target.value })}
                  placeholder="Örn. Ana hikâye, kuzey seferi"
                />
                <datalist id="event-threads">
                  {[
                    ...new Set(
                      (book.events || []).map((e) => e.thread).filter(Boolean),
                    ),
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </datalist>
              </Field>
              <Field label="Mekân">
                <input
                  maxLength={300}
                  value={draft.location}
                  onChange={(e) => patch({ location: e.target.value })}
                />
              </Field>
            </div>
            <TagsInput
              value={draft.tags}
              onChange={(tags) => patch({ tags })}
            />
            <div className="two-fields">
              <Field label="Hava durumu">
                <input
                  list="weather-options"
                  maxLength={100}
                  value={draft.weather}
                  onChange={(e) => patch({ weather: e.target.value })}
                  placeholder="Örn. Yağmurlu, sisli, kızıl fırtına"
                />
                <datalist id="weather-options">
                  {[
                    "Açık",
                    "Bulutlu",
                    "Yağmurlu",
                    "Karlı",
                    "Sisli",
                    "Fırtınalı",
                  ].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </datalist>
              </Field>
              <Field label="Tekrarlama">
                <select
                  disabled={!draft.period}
                  value={draft.recurrence}
                  onChange={(e) =>
                    patch({
                      recurrence: e.target.value as StoryEvent["recurrence"],
                    })
                  }
                >
                  <option value="none">Tek seferlik</option>
                  <option value="yearly">Her yıl aynı tarihte</option>
                  <option value="monthly">Her ay aynı günde</option>
                </select>
              </Field>
            </div>
            {draft.recurrence !== "none" && (
              <p className="quiet">
                Tekrarlar başlangıç tarihinden itibaren takvimde görünür;
                geçersiz günler atlanır. Kronoloji ilk olayı gösterir.
              </p>
            )}
            <LinkPicker
              label="Bağlı bölümler"
              options={book.chapters.map((c) => ({ id: c.id, name: c.title }))}
              value={draft.chapterIds}
              onChange={(chapterIds) => patch({ chapterIds })}
            />
            <LinkPicker
              label="Olaydaki karakterler"
              options={book.characters.map((c) => ({ id: c.id, name: c.name }))}
              value={draft.characterIds}
              onChange={(characterIds) => patch({ characterIds })}
            />
            <LinkPicker
              label="İlgili Wiki kayıtları"
              options={(book.wiki || []).map((e) => ({
                id: e.id,
                name: e.title,
              }))}
              value={draft.wikiIds}
              onChange={(wikiIds) => patch({ wikiIds })}
            />
          </div>
          <aside>
            <h3>
              <CalendarDays size={18} /> Kurgu tarihi
            </h3>
            <p className="quiet">
              {calendar.name} · {calendar.era}
              <br />
              Hikâyenin geçtiği zaman, yazım takviminizden bağımsızdır.
            </p>
            <PeriodFields
              value={draft.period}
              calendar={calendar}
              baseDate={baseDate}
              onChange={(period) =>
                patch({
                  period,
                  ...(!period ? { recurrence: "none" as const } : {}),
                })
              }
            />
            {event.period && !draft.period && (
              <p className="quiet" role="status">
                Tarih kaldırıldı. Değişikliği kaydettiğinizde olay tarihsiz
                olarak saklanacak.
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </aside>
        </div>
        <footer className="modal-footer event-editor-footer">
          {confirmDelete ? (
            <>
              <span className="quiet">“{event.title}” olayı silinsin mi?</span>
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="button danger-button"
                  onClick={onDelete}
                >
                  <Trash2 size={15} /> Olayı sil
                </button>
              </div>
            </>
          ) : (
            <>
              {discard ? (
                <>
                  <span>Kaydedilmemiş değişiklikler var.</span>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setDiscard(false)}
                  >
                    Düzenlemeye devam
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={onClose}
                  >
                    Değişiklikleri bırak
                  </button>
                </>
              ) : (
                <div className="button-row">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={close}
                  >
                    Vazgeç
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      className="button danger-quiet"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={15} /> Olayı sil
                    </button>
                  )}
                  {draft.period && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        patch({ period: null, recurrence: "none" })
                      }
                    >
                      <X size={15} /> Tarihi sil
                    </button>
                  )}
                </div>
              )}
              <button
                className="button primary"
                disabled={!draft.title.trim() || !!error}
              >
                <Check size={16} />
                Olayı kaydet
              </button>
            </>
          )}
        </footer>
      </form>
    </Modal>
  );
}

function PeriodDialog({
  title,
  value,
  calendar,
  baseDate,
  onClose,
  onSave,
}: {
  title: string;
  value: StoryPeriod | null;
  calendar: StoryCalendar;
  baseDate: StoryDate;
  onClose: () => void;
  onSave: (p: StoryPeriod | null) => void;
}) {
  const [period, setPeriod] = useState(value),
    [discard, setDiscard] = useState(false);
  const error = periodError(calendar, period);
  const close = () =>
    JSON.stringify(value) !== JSON.stringify(period)
      ? setDiscard(true)
      : onClose();
  return (
    <Modal title={title} eyebrow="HİKÂYENİN GEÇTİĞİ ZAMAN" onClose={close}>
      <form
        onKeyDown={saveShortcut}
        onSubmit={(e) => {
          e.preventDefault();
          if (!error) onSave(period);
        }}
      >
        <div className="dialog-body">
          <p className="quiet">
            {calendar.name} · {calendar.era}. Başlangıç, bitiş ve saat bilgileri
            takvimde kitabınızla birlikte saklanır.
          </p>
          <PeriodFields
            value={period}
            calendar={calendar}
            baseDate={baseDate}
            onChange={setPeriod}
          />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-footer">
          {discard ? (
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDiscard(false)}
              >
                Düzenlemeye devam
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={onClose}
              >
                Değişiklikleri bırak
              </button>
            </>
          ) : (
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={close}
              >
                Vazgeç
              </button>
              {value && (
                <button
                  type="button"
                  className="button danger-quiet"
                  onClick={() => onSave(null)}
                >
                  <Trash2 size={15} /> Tarihi sil
                </button>
              )}
            </div>
          )}
          <button className="button primary" disabled={!!error}>
            Tarihi kaydet
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function CalendarSettings({
  book,
  calendar,
  onClose,
  onSave,
}: {
  book: Book;
  calendar: StoryCalendar;
  onClose: () => void;
  onSave: (c: StoryCalendar) => void;
}) {
  const [draft, setDraft] = useState(structuredClone(calendar)),
    [days, setDays] = useState(calendar.weekdays.join(", ")),
    [discard, setDiscard] = useState(false);
  const patch = (p: Partial<StoryCalendar>) =>
    setDraft((d) => ({ ...d, ...p }));
  const weekdays = days
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidate = {
    ...draft,
    weekdays,
    firstWeekday: Math.min(draft.firstWeekday, weekdays.length - 1),
  };
  const invalid = [
    { name: "Kitap", period: book.storyPeriod },
    ...book.chapters.map((c) => ({ name: c.title, period: c.storyPeriod })),
    ...(book.events || []).map((e) => ({ name: e.title, period: e.period })),
  ].filter((x) => x.period && periodError(candidate, x.period));
  const error =
    !weekdays.length ||
    weekdays.length > 14 ||
    new Set(weekdays).size !== weekdays.length
      ? "Haftada 1–14 farklı gün adı olmalı."
      : !draft.months.length ||
          draft.months.some(
            (m) =>
              !m.name.trim() ||
              !Number.isInteger(m.days) ||
              m.days < 1 ||
              m.days > 100,
          )
        ? "Her aya bir ad ve 1–100 arasında gün sayısı verin."
        : draft.leapYear && draft.months.length < 2
          ? "Artık yıl kuralı için en az iki ay gerekir."
          : invalid.length
            ? `Bu değişiklik ${invalid.length} kayıt tarihini geçersiz kılıyor: ${invalid
                .slice(0, 3)
                .map((x) => x.name)
                .join(", ")}. Önce bu kayıtların tarihlerini güncelleyin.`
            : "";
  const close = () =>
    JSON.stringify(candidate) !== JSON.stringify(calendar)
      ? setDiscard(true)
      : onClose();
  return (
    <Modal
      title="Dünyanızın takvimi"
      eyebrow="TAKVİM AYARLARI"
      wide
      onClose={close}
    >
      <form
        onKeyDown={saveShortcut}
        onSubmit={(e) => {
          e.preventDefault();
          if (!error) onSave(candidate);
        }}
      >
        <div className="dialog-body calendar-settings">
          <p className="quiet">
            Gerçek dünya takvimini kullanın veya kendi aylarınızı, haftanızı ve
            çağınızı tanımlayın. Tarihler yeni takvimde aynı yıl/ay/gün olarak
            korunur.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const c = defaultCalendar();
                setDraft(c);
                setDays(c.weekdays.join(", "));
              }}
            >
              Miladi şablonu kullan
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                patch({
                  leapYear: false,
                  era: "Yeni Çağ",
                  name: "Dünyamın takvimi",
                })
              }
            >
              Özel kurgu takvimi
            </button>
          </div>
          <div className="three-fields">
            <Field label="Takvim adı">
              <input
                required
                maxLength={150}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="Çağ / dönem eki">
              <input
                maxLength={40}
                value={draft.era}
                onChange={(e) => patch({ era: e.target.value })}
                placeholder="MS, Yeni Çağ, İmparatorluk…"
              />
            </Field>
            <Field label="Başlangıç yılı">
              <input
                type="number"
                required
                min={-999999}
                max={999999}
                value={draft.epochYear}
                onChange={(e) => patch({ epochYear: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="two-fields">
            <Field
              label="Haftanın günleri"
              hint="Virgülle ayırın. 1–14 gün tanımlayabilirsiniz."
            >
              <input
                required
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </Field>
            <Field label="İlk yılın ilk günü">
              <select
                value={candidate.firstWeekday}
                onChange={(e) =>
                  patch({ firstWeekday: Number(e.target.value) })
                }
              >
                {weekdays.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <h3>Aylar ve mevsimler</h3>
          <div className="calendar-months-editor">
            {draft.months.map((m, i) => (
              <div key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Field label={`Ay ${i + 1} adı`}>
                  <input
                    required
                    maxLength={60}
                    value={m.name}
                    onChange={(e) =>
                      patch({
                        months: draft.months.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label={`Ay ${i + 1} gün sayısı`}>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={m.days}
                    onChange={(e) =>
                      patch({
                        months: draft.months.map((x, j) =>
                          j === i ? { ...x, days: Number(e.target.value) } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label={`Ay ${i + 1} mevsimi`}>
                  <input
                    maxLength={60}
                    value={m.season}
                    onChange={(e) =>
                      patch({
                        months: draft.months.map((x, j) =>
                          j === i ? { ...x, season: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <button
                  type="button"
                  aria-label={`Ay ${i + 1} kaldır`}
                  disabled={draft.months.length <= 1}
                  onClick={() =>
                    patch({ months: draft.months.filter((_, j) => j !== i) })
                  }
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-button"
            disabled={draft.months.length >= 24}
            onClick={() =>
              patch({
                months: [
                  ...draft.months,
                  { name: "Yeni ay", days: 30, season: "" },
                ],
              })
            }
          >
            <Plus size={16} />
            Ay ekle
          </button>
          <label className="check-line">
            <input
              type="checkbox"
              checked={draft.leapYear}
              onChange={(e) => patch({ leapYear: e.target.checked })}
            />
            Miladi artık yıl kuralı: 4'e bölünen yıllarda ikinci aya +1 gün
            (100/400 istisnasıyla)
          </label>
          <div className="two-fields">
            <Field
              label="Ay döngüsü (gün)"
              hint="0: ay evrelerini gizle. Kurgu içindir; astronomik tahmin değildir."
            >
              <input
                type="number"
                required
                min={0}
                max={1000}
                value={draft.moonCycle}
                onChange={(e) => patch({ moonCycle: Number(e.target.value) })}
              />
            </Field>
            <Field label="Ay döngüsü başlangıç kayması">
              <input
                type="number"
                required
                min={0}
                max={999}
                value={draft.moonOffset}
                onChange={(e) => patch({ moonOffset: Number(e.target.value) })}
              />
            </Field>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-footer">
          {discard ? (
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDiscard(false)}
              >
                Düzenlemeye devam
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={onClose}
              >
                Değişiklikleri bırak
              </button>
            </>
          ) : (
            <button type="button" className="button secondary" onClick={close}>
              Vazgeç
            </button>
          )}
          <button className="button primary" disabled={!!error}>
            Takvimi kaydet
          </button>
        </footer>
      </form>
    </Modal>
  );
}
