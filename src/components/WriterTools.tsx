import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
} from "lucide-react";
import type { Book, Chapter } from "../types";
import { bookWords, fmt, plain, uid } from "../model";
import { Field, Modal } from "./UI";
import SelectMenu from "./SelectMenu";
export type WriterTool = "scenes" | "revisions" | "analysis" | "timer";
export const writerToolNames: Record<WriterTool, string> = {
  scenes: "Sahne planı",
  revisions: "Revizyon listesi",
  analysis: "Yazı analizi",
  timer: "Odak sayacı",
};
const stops = new Set(
  "bir ve bu da de ile için gibi ama fakat olan olarak çok daha her şu o ki ne en mı mi mu mü ben sen biz siz onlar onu onun bana sana benim senin".split(
    " ",
  ),
);
export default function WriterTools({
  tool,
  onClose,
  book,
  chapter,
  onUpdate,
  notify,
}: {
  tool: WriterTool | null;
  onClose: () => void;
  book: Book;
  chapter: Chapter;
  onUpdate: (fn: (book: Book) => Book) => void;
  notify: (message: string) => void;
}) {
  const [newScene, setNewScene] = useState("");
  const [newRevision, setNewRevision] = useState("");
  const [scope, setScope] = useState("chapter");
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [startedWords, setStartedWords] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (!left) {
        setDeadline(null);
        notify("Odak oturumunuz tamamlandı. Kısa bir mola iyi gelebilir.");
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, notify]);
  const tools = book.writerTools || { scenes: [], revisions: [] };
  const change = (
    fn: (
      data: NonNullable<Book["writerTools"]>,
    ) => NonNullable<Book["writerTools"]>,
  ) =>
    onUpdate((b) => ({
      ...b,
      writerTools: fn(b.writerTools || { scenes: [], revisions: [] }),
    }));
  const text =
    scope === "book"
      ? book.chapters.map((c) => plain(c.html)).join("\n")
      : plain(chapter.html);
  const analysis = useMemo(() => {
    const tokens =
      text
        .toLocaleLowerCase("tr")
        .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
    const sentences = text
      .split(/[.!?…]+/u)
      .map((s) => s.trim())
      .filter(Boolean);
    const counts = new Map<string, number>();
    tokens
      .filter((word) => word.length > 2 && !stops.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    return {
      count: tokens.length,
      sentences: sentences.length,
      unique: new Set(tokens).size,
      frequent: [...counts]
        .filter(([, n]) => n > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      long: sentences
        .filter((s) => (s.match(/\S+/g)?.length || 0) > 30)
        .slice(0, 6),
    };
  }, [text]);
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const startPause = () => {
    if (deadline) {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      setDeadline(null);
    } else {
      if (startedWords === null || !remaining) setStartedWords(bookWords(book));
      setDeadline(Date.now() + (remaining || minutes * 60) * 1000);
    }
  };
  return (
    <>
      {deadline && tool !== "timer" && (
        <div className="focus-session">
          <Timer size={15} />
          <span>Odak oturumu · {clock}</span>
          <button title="Sayacı duraklat" onClick={startPause}>
            <Pause size={14} />
          </button>
        </div>
      )}
      {tool && (
        <Modal
          title={writerToolNames[tool]}
          eyebrow={book.title}
          onClose={onClose}
        >
          <div className="dialog-body writer-tool-body">
            {tool === "scenes" && (
              <>
                <p className="muted">
                  Sahnelerin amacını, çatışmasını ve sonucunu yazın. Oklarla
                  sıralayın, yazdıklarınızı işaretleyin.
                </p>
                <form
                  className="writer-add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newScene.trim()) return;
                    change((t) => ({
                      ...t,
                      scenes: [
                        ...t.scenes,
                        {
                          id: uid(),
                          title: newScene.trim(),
                          summary: "",
                          done: false,
                        },
                      ],
                    }));
                    setNewScene("");
                  }}
                >
                  <input
                    aria-label="Yeni sahne adı"
                    placeholder="Bir sonraki sahne…"
                    value={newScene}
                    maxLength={300}
                    onChange={(e) => setNewScene(e.target.value)}
                  />
                  <button
                    className="button primary"
                    disabled={!newScene.trim() || tools.scenes.length >= 2000}
                  >
                    <Plus size={16} /> Ekle
                  </button>
                </form>
                {!tools.scenes.length && (
                  <p className="writer-empty">
                    İlk sahnenizle hikâyenin iskeletini kurun.
                  </p>
                )}
                {tools.scenes.map((scene, index) => (
                  <div
                    className={`scene-plan-card ${scene.done ? "done" : ""}`}
                    key={scene.id}
                  >
                    <div className="scene-plan-heading">
                      <input
                        type="checkbox"
                        aria-label={`${scene.title} yazıldı`}
                        checked={scene.done}
                        onChange={(e) =>
                          change((t) => ({
                            ...t,
                            scenes: t.scenes.map((s) =>
                              s.id === scene.id
                                ? { ...s, done: e.target.checked }
                                : s,
                            ),
                          }))
                        }
                      />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <input
                        aria-label={`Sahne ${index + 1} adı`}
                        value={scene.title}
                        maxLength={300}
                        onChange={(e) =>
                          change((t) => ({
                            ...t,
                            scenes: t.scenes.map((s) =>
                              s.id === scene.id
                                ? { ...s, title: e.target.value }
                                : s,
                            ),
                          }))
                        }
                      />
                      {[-1, 1].map((step) => (
                        <button
                          key={step}
                          className="icon-button"
                          title={
                            step < 0
                              ? "Sahneyi yukarı taşı"
                              : "Sahneyi aşağı taşı"
                          }
                          disabled={
                            index + step < 0 ||
                            index + step >= tools.scenes.length
                          }
                          onClick={() =>
                            change((t) => {
                              const scenes = [...t.scenes];
                              [scenes[index], scenes[index + step]] = [
                                scenes[index + step],
                                scenes[index],
                              ];
                              return { ...t, scenes };
                            })
                          }
                        >
                          {step < 0 ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                        </button>
                      ))}
                      <button
                        className="icon-button"
                        title="Sahneyi sil"
                        onClick={() =>
                          change((t) => ({
                            ...t,
                            scenes: t.scenes.filter((s) => s.id !== scene.id),
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <textarea
                      aria-label={`${scene.title} sahne özeti`}
                      placeholder="Amaç · Çatışma · Sonuç"
                      maxLength={10000}
                      value={scene.summary}
                      rows={3}
                      onChange={(e) =>
                        change((t) => ({
                          ...t,
                          scenes: t.scenes.map((s) =>
                            s.id === scene.id
                              ? { ...s, summary: e.target.value }
                              : s,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </>
            )}
            {tool === "revisions" && (
              <>
                <p className="muted">
                  Yazarken akışı kesmeyin. Dönüp bakacağınız ayrıntıları burada
                  biriktirin.
                </p>
                <form
                  className="writer-add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newRevision.trim()) return;
                    change((t) => ({
                      ...t,
                      revisions: [
                        ...t.revisions,
                        { id: uid(), text: newRevision.trim(), done: false },
                      ],
                    }));
                    setNewRevision("");
                  }}
                >
                  <input
                    aria-label="Yeni revizyon"
                    placeholder="Kontrol etmek istediğiniz bir ayrıntı…"
                    maxLength={3000}
                    value={newRevision}
                    onChange={(e) => setNewRevision(e.target.value)}
                  />
                  <button
                    className="button primary"
                    disabled={
                      !newRevision.trim() || tools.revisions.length >= 2000
                    }
                  >
                    <Plus size={16} /> Ekle
                  </button>
                </form>
                <div className="revision-progress">
                  <Check size={15} />{" "}
                  {tools.revisions.filter((r) => r.done).length} /{" "}
                  {tools.revisions.length} tamamlandı
                </div>
                {!tools.revisions.length && (
                  <p className="writer-empty">
                    Diyaloglar, tutarlılık, eksik araştırmalar… İlk notunuzu
                    ekleyin.
                  </p>
                )}
                {tools.revisions.map((item) => (
                  <div
                    className={`revision-item ${item.done ? "done" : ""}`}
                    key={item.id}
                  >
                    <input
                      type="checkbox"
                      aria-label={`${item.text} tamamlandı`}
                      checked={item.done}
                      onChange={(e) =>
                        change((t) => ({
                          ...t,
                          revisions: t.revisions.map((r) =>
                            r.id === item.id
                              ? { ...r, done: e.target.checked }
                              : r,
                          ),
                        }))
                      }
                    />
                    <textarea
                      aria-label="Revizyon metni"
                      rows={2}
                      value={item.text}
                      maxLength={3000}
                      onChange={(e) =>
                        change((t) => ({
                          ...t,
                          revisions: t.revisions.map((r) =>
                            r.id === item.id
                              ? { ...r, text: e.target.value }
                              : r,
                          ),
                        }))
                      }
                    />
                    <button
                      className="icon-button"
                      title="Revizyonu sil"
                      onClick={() =>
                        change((t) => ({
                          ...t,
                          revisions: t.revisions.filter(
                            (r) => r.id !== item.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </>
            )}
            {tool === "analysis" && (
              <>
                <SelectMenu
                  label="Analiz kapsamı"
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: "chapter", label: "Açık bölüm" },
                    { value: "book", label: "Kitabın tamamı" },
                  ]}
                />
                <div className="analysis-grid">
                  {[
                    ["Kelime", fmt(analysis.count)],
                    ["Benzersiz kelime", fmt(analysis.unique)],
                    ["Karakter", fmt(text.length)],
                    ["Cümle", fmt(analysis.sentences)],
                    [
                      "Cümle başına kelime",
                      analysis.sentences
                        ? (analysis.count / analysis.sentences).toFixed(1)
                        : "0",
                    ],
                    ["Okuma süresi", `${Math.ceil(analysis.count / 200)} dk`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <h3>Sık kullanılan kelimeler</h3>
                <div className="word-frequency">
                  {analysis.frequent.length ? (
                    analysis.frequent.map(([word, n]) => (
                      <span key={word}>
                        {word}
                        <b>{n}</b>
                      </span>
                    ))
                  ) : (
                    <p className="muted">Tekrarlanan kelime bulunmadı.</p>
                  )}
                </div>
                <h3>Uzun cümleler</h3>
                <p className="muted">
                  30 kelimeyi aşan cümlelere ikinci bir göz atın. Bunlar hata
                  olarak işaretlenmez.
                </p>
                {analysis.long.map((sentence, i) => (
                  <blockquote className="analysis-sentence" key={i}>
                    {sentence}
                  </blockquote>
                ))}
                {!analysis.long.length && (
                  <p className="muted">Bu aralıkta uzun cümle bulunmadı.</p>
                )}
                <small className="muted">
                  Cümleler noktalama işaretlerine göre yaklaşık sayılır; yaygın
                  bağlaçlar sıklık listesine alınmaz.
                </small>
              </>
            )}
            {tool === "timer" && (
              <div className="focus-timer">
                <Timer size={28} />
                <p>Bir süre yalnızca hikâyenize ayırın.</p>
                <div
                  className="timer-clock"
                  role="timer"
                  aria-label="Kalan süre"
                >
                  {clock}
                </div>
                <Field label="Oturum süresi (dakika)">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    disabled={!!deadline}
                    value={minutes}
                    onChange={(e) => {
                      const n = Math.min(
                        120,
                        Math.max(1, Number(e.target.value) || 1),
                      );
                      setMinutes(n);
                      setRemaining(n * 60);
                      setStartedWords(null);
                    }}
                  />
                </Field>
                <div className="button-row">
                  <button className="button primary" onClick={startPause}>
                    {deadline ? <Pause size={16} /> : <Play size={16} />}
                    {deadline ? "Duraklat" : "Başlat / devam et"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setDeadline(null);
                      setRemaining(minutes * 60);
                      setStartedWords(null);
                    }}
                  >
                    <RotateCcw size={16} /> Sıfırla
                  </button>
                </div>
                {startedWords !== null && (
                  <p className="session-result">
                    Bu oturumda net {fmt(bookWords(book) - startedWords)}{" "}
                    kelime.
                  </p>
                )}
                <small className="muted">
                  Pencereyi kapatıp yazmaya devam edebilirsiniz. Sayaç bu kitap
                  açık kaldığı sürece çalışır.
                </small>
              </div>
            )}
          </div>
          <footer className="modal-footer">
            <small className="muted">
              {tool === "scenes" || tool === "revisions"
                ? "Değişiklikler otomatik kaydedilir."
                : "Kendi ritminizde yazın."}
            </small>
            <button className="button secondary" onClick={onClose}>
              Yazıya dön
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
