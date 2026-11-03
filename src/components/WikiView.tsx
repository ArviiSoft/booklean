import { useState } from "react";
import {
  Globe2,
  Landmark,
  Shield,
  ScrollText,
  Drama,
  Sword,
  Leaf,
  MapPin,
  Sparkles,
  Plus,
  Search,
  LayoutGrid,
  List,
  Folder,
  Star,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Type,
  Quote,
  Table2,
  X,
  History,
  Link2,
  Check,
  BookOpen,
} from "lucide-react";
import type { Book, WikiCategory, WikiEntry, WikiSection } from "../types";
import { now, plain, uid } from "../model";
import { categories, contentOf, newEntry } from "../wiki";
import { Empty, Field, Modal } from "./UI";
import { cleanTags, LinkPicker, TagsInput, saveShortcut } from "./WorldFields";
import WikiRichText from "./WikiRichText";
const icons = [
  Landmark,
  Shield,
  ScrollText,
  Drama,
  Sword,
  Leaf,
  MapPin,
  Sparkles,
];
export default function WikiView({
  book,
  onUpdate,
  notify,
}: {
  book: Book;
  onUpdate: (fn: (b: Book) => Book) => void;
  notify: (s: string) => void;
}) {
  const entries = book.wiki || [];
  const [category, setCategory] = useState<WikiCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState("updated");
  const [view, setView] = useState<"grid" | "list" | "groups">("grid");
  const [editing, setEditing] = useState<WikiEntry | null>(null);
  const [deleting, setDeleting] = useState<WikiEntry | null>(null);
  const groups = [...new Set(entries.map((e) => e.group).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "tr"),
  );
  const visible = entries
    .filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (!group || e.group === group) &&
        (!tag || e.tags.includes(tag)) &&
        (!status || e.status === status) &&
        (!favorites || e.favorite) &&
        [
          e.title,
          e.summary,
          e.subtype,
          e.group,
          ...e.tags,
          ...e.attributes.map((a) => a.value),
          ...e.sections
            .filter((s) => s.kind !== "image")
            .map(
              (s) =>
                s.title +
                " " +
                plain(s.content) +
                " " +
                s.rows.flat().join(" "),
            ),
        ]
          .join(" ")
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title, "tr")
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  const partitions =
    view === "groups"
      ? [...new Set(visible.map((e) => e.group || "Grupsuz"))].map((name) => ({
          name,
          entries: visible.filter((e) => (e.group || "Grupsuz") === name),
        }))
      : [{ name: "", entries: visible }];
  function save(entry: WikiEntry) {
    onUpdate((b) => {
      const old = b.wiki?.find((e) => e.id === entry.id);
      const saved = {
        ...entry,
        title: entry.title.trim(),
        group: entry.group.trim(),
        tags: cleanTags(entry.tags),
        updatedAt: now(),
        history: old
          ? [
              { savedAt: old.updatedAt, content: contentOf(old) },
              ...old.history,
            ].slice(0, 15)
          : [],
      };
      return {
        ...b,
        wiki: old
          ? b.wiki!.map((e) => (e.id === entry.id ? saved : e))
          : [...(b.wiki || []), saved],
      };
    });
    setEditing(null);
    notify("Wiki kaydı kaydedildi.");
  }
  return (
    <main className="world-view wiki-view">
      <header className="world-heading">
        <div>
          <div className="eyebrow">{book.title} · DÜNYA İNŞASI</div>
          <h1>
            Hikâyenin ötesinde bir dünya<span>.</span>
          </h1>
          <p>
            İnsanların inandığı, şehirlerin sakladığı, hikâyenin hatırladığı her
            şey.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setEditing(newEntry(category === "all" ? "lore" : category))
          }
        >
          <Plus size={18} />
          Wiki kaydı ekle
        </button>
      </header>
      <nav className="wiki-categories" aria-label="Wiki kategorileri">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => setCategory("all")}
        >
          <Globe2 size={19} />
          <span>Tümü</span>
          <small>{entries.length}</small>
        </button>
        {categories.map((c, i) => {
          const Icon = icons[i];
          return (
            <button
              key={c.id}
              className={category === c.id ? "active" : ""}
              title={c.description}
              onClick={() => setCategory(c.id)}
            >
              <Icon size={19} />
              <span>{c.name}</span>
              <small>{entries.filter((e) => e.category === c.id).length}</small>
            </button>
          );
        })}
      </nav>
      <div className="world-toolbar">
        <label className="world-search">
          <Search size={18} />
          <input
            aria-label="Wiki içinde ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bir isim, etiket ya da ayrıntı ara…"
          />
        </label>
        <select
          aria-label="Wiki grubu"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="">Tüm gruplar</option>
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          aria-label="Wiki etiketi"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">Tüm etiketler</option>
          {[...new Set(entries.flatMap((e) => e.tags))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Wiki durumu"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tüm durumlar</option>
          <option value="draft">Taslak</option>
          <option value="complete">Tamamlandı</option>
        </select>
        <button
          className={`world-tool ${favorites ? "active" : ""}`}
          aria-label="Yalnızca yıldızlı kayıtlar"
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Star size={18} />
        </button>
        <select
          aria-label="Wiki sıralaması"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Son düzenlenen</option>
          <option value="name">Ada göre</option>
        </select>
        <div className="segmented">
          {(
            [
              { id: "grid", icon: LayoutGrid, label: "Kart görünümü" },
              { id: "list", icon: List, label: "Liste görünümü" },
              { id: "groups", icon: Folder, label: "Grup görünümü" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              aria-label={v.label}
              className={view === v.id ? "active" : ""}
              onClick={() => setView(v.id)}
            >
              <v.icon size={18} />
            </button>
          ))}
        </div>
      </div>
      <div className="world-result-count">
        {visible.length} kayıt <span>· Kitaba özel ansiklopedi</span>
      </div>
      {!visible.length ? (
        <Empty
          icon={<Globe2 size={40} />}
          heading={
            entries.length
              ? "Bu aramada kayıt bulunamadı."
              : "Her dünyanın anlatılacak bir geçmişi var."
          }
        >
          {entries.length
            ? "Arama veya filtreleri değiştirin."
            : "Bir mekân, gelenek veya efsaneyle başlayın. Her kaydı kendi nitelikleriyle ayrıntılandırın."}
        </Empty>
      ) : (
        partitions.map((p) => (
          <section key={p.name}>
            {p.name && (
              <h2 className="wiki-group-title">
                <Folder size={18} />
                {p.name}
                <small>{p.entries.length}</small>
              </h2>
            )}
            <div className={`wiki-cards ${view === "list" ? "as-list" : ""}`}>
              {p.entries.map((entry) => {
                const ci = categories.findIndex((c) => c.id === entry.category),
                  Icon = icons[ci];
                return (
                  <article className="wiki-card" key={entry.id}>
                    <button
                      className="wiki-card-open"
                      onClick={() => setEditing(structuredClone(entry))}
                    >
                      <div
                        className={`wiki-card-cover category-${entry.category}`}
                      >
                        {entry.cover ? (
                          <img src={entry.cover} alt="" />
                        ) : (
                          <Icon size={38} strokeWidth={1} />
                        )}
                        <span>{categories[ci].name}</span>
                      </div>
                      <div className="wiki-card-body">
                        <div className="wiki-card-meta">
                          {entry.subtype || "Genel kayıt"}
                          <span>
                            {entry.status === "complete"
                              ? "Tamamlandı"
                              : "Taslak"}
                          </span>
                        </div>
                        <h2>{entry.title}</h2>
                        <p>
                          {entry.summary ||
                            "Bu kaydın hikâyesini ve ayrıntılarını yazın…"}
                        </p>
                        <div className="wiki-tags">
                          {entry.tags.slice(0, 4).map((t) => (
                            <span key={t}>{t}</span>
                          ))}
                        </div>
                        <small>
                          {entry.group || "Grupsuz"} · {entry.relations.length}{" "}
                          bağlantı
                        </small>
                      </div>
                    </button>
                    <div className="wiki-card-actions">
                      <button
                        aria-label={`${entry.title} yıldızla`}
                        aria-pressed={entry.favorite}
                        onClick={() =>
                          onUpdate((b) => ({
                            ...b,
                            wiki: (b.wiki || []).map((e) =>
                              e.id === entry.id
                                ? { ...e, favorite: !e.favorite }
                                : e,
                            ),
                          }))
                        }
                      >
                        <Star
                          size={16}
                          fill={entry.favorite ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        aria-label={`${entry.title} çoğalt`}
                        onClick={() =>
                          setEditing({
                            ...structuredClone(entry),
                            id: uid(),
                            title: entry.title + " — kopya",
                            createdAt: now(),
                            history: [],
                          })
                        }
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        aria-label={`${entry.title} sil`}
                        onClick={() => setDeleting(entry)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
      {editing && (
        <WikiEditor
          key={editing.id}
          entry={editing}
          book={book}
          groups={groups}
          onSave={save}
          onClose={() => setEditing(null)}
          notify={notify}
        />
      )}
      {deleting && (
        <Modal
          title="Wiki kaydı silinsin mi?"
          onClose={() => setDeleting(null)}
        >
          <div className="dialog-body">
            <p>
              “{deleting.title}” ve bu kayda verilen bağlantılar kaldırılacak.
            </p>
          </div>
          <footer className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Vazgeç
            </button>
            <button
              className="button primary"
              onClick={() => {
                onUpdate((b) => ({
                  ...b,
                  wiki: (b.wiki || [])
                    .filter((e) => e.id !== deleting.id)
                    .map((e) => ({
                      ...e,
                      relations: e.relations.filter(
                        (r) => r.targetId !== deleting.id,
                      ),
                      history: e.history.map((h) => ({
                        ...h,
                        content: {
                          ...h.content,
                          relations: h.content.relations.filter(
                            (r) => r.targetId !== deleting.id,
                          ),
                        },
                      })),
                    })),
                  events: (b.events || []).map((e) => ({
                    ...e,
                    wikiIds: e.wikiIds.filter((id) => id !== deleting.id),
                  })),
                }));
                setDeleting(null);
              }}
            >
              Kaydı sil
            </button>
          </footer>
        </Modal>
      )}
    </main>
  );
}

function WikiEditor({
  entry,
  book,
  groups,
  onSave,
  onClose,
  notify,
}: {
  entry: WikiEntry;
  book: Book;
  groups: string[];
  onSave: (e: WikiEntry) => void;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [discard, setDiscard] = useState(false);
  const [history, setHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const patch = (p: Partial<WikiEntry>) => setDraft((d) => ({ ...d, ...p }));
  const close = () =>
    JSON.stringify(draft) !== JSON.stringify(entry)
      ? setDiscard(true)
      : onClose();
  const changeSection = (id: string, p: Partial<WikiSection>) =>
    patch({
      sections: draft.sections.map((s) => (s.id === id ? { ...s, ...p } : s)),
    });
  const move = <T,>(items: T[], i: number, step: number): T[] => {
    const result = [...items];
    [result[i], result[i + step]] = [result[i + step], result[i]];
    return result;
  };
  async function pickImage(callback: (s: string) => void) {
    setBusy(true);
    try {
      const image = await window.booklean.pickImage();
      if (image) callback(image);
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  const cat = categories.find((c) => c.id === draft.category)!;
  const backlinks = (book.wiki || []).filter(
    (e) =>
      e.id !== draft.id && e.relations.some((r) => r.targetId === draft.id),
  );
  return (
    <Modal
      title={entry.title || "Yeni Wiki kaydı"}
      eyebrow="DÜNYANIZIN ANSİKLOPEDİSİ"
      wide
      onClose={close}
    >
      <form
        className="wiki-editor"
        onKeyDown={saveShortcut}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.title.trim() && !busy) onSave(draft);
        }}
      >
        <div className="wiki-editor-layout">
          <div className="wiki-editor-main">
            <section id="wiki-identity">
              <div className="eyebrow">TANIMLAMA</div>
              <input
                className="wiki-title-input"
                aria-label="Wiki başlığı"
                required
                maxLength={300}
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Bir dünyanın ilk ayrıntısı…"
              />
              <div className="three-fields">
                <Field label="Kategori">
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      patch({
                        category: e.target.value as WikiCategory,
                        subtype: "",
                        ...(draft.attributes.every((a) => !a.value.trim())
                          ? {
                              attributes: categories
                                .find((c) => c.id === e.target.value)!
                                .attributes.map((name) => ({
                                  id: uid(),
                                  name,
                                  value: "",
                                })),
                            }
                          : {}),
                      })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Alt tür">
                  <input
                    list="wiki-subtypes"
                    value={draft.subtype}
                    maxLength={100}
                    onChange={(e) => patch({ subtype: e.target.value })}
                    placeholder="Seçin veya kendiniz yazın"
                  />
                  <datalist id="wiki-subtypes">
                    {cat.subtypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </datalist>
                </Field>
                <Field label="Grup">
                  <input
                    list="wiki-groups"
                    maxLength={100}
                    value={draft.group}
                    onChange={(e) => patch({ group: e.target.value })}
                    placeholder="Örn. Kuzey diyarları"
                  />
                  <datalist id="wiki-groups">
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </datalist>
                </Field>
              </div>
              <TagsInput
                value={draft.tags}
                onChange={(tags) => patch({ tags })}
              />
              <Field label="Özet">
                <textarea
                  rows={3}
                  maxLength={30000}
                  value={draft.summary}
                  onChange={(e) => patch({ summary: e.target.value })}
                  placeholder="Bu kaydı birkaç cümlede tanımlayın."
                />
              </Field>
            </section>
            <section id="wiki-attributes">
              <div className="section-heading">
                <h2>Nitelikler</h2>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    patch({
                      attributes: [
                        ...draft.attributes,
                        ...cat.attributes
                          .filter(
                            (name) =>
                              !draft.attributes.some((a) => a.name === name),
                          )
                          .map((name) => ({ id: uid(), name, value: "" })),
                      ],
                    })
                  }
                >
                  Kategori şablonunu ekle
                </button>
              </div>
              <div className="wiki-attributes">
                {draft.attributes.map((a, i) => (
                  <div className="wiki-attribute" key={a.id}>
                    <div>
                      <input
                        aria-label={`Nitelik ${i + 1} adı`}
                        maxLength={200}
                        placeholder="Nitelik adı"
                        value={a.name}
                        onChange={(e) =>
                          patch({
                            attributes: draft.attributes.map((x) =>
                              x.id === a.id
                                ? { ...x, name: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        title="Niteliği yukarı taşı"
                        disabled={i === 0}
                        onClick={() =>
                          patch({ attributes: move(draft.attributes, i, -1) })
                        }
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        title="Niteliği aşağı taşı"
                        disabled={i === draft.attributes.length - 1}
                        onClick={() =>
                          patch({ attributes: move(draft.attributes, i, 1) })
                        }
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`${a.name} niteliğini kaldır`}
                        onClick={() =>
                          patch({
                            attributes: draft.attributes.filter(
                              (x) => x.id !== a.id,
                            ),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      aria-label={a.name || `Nitelik ${i + 1} değeri`}
                      rows={2}
                      maxLength={10000}
                      value={a.value}
                      onChange={(e) =>
                        patch({
                          attributes: draft.attributes.map((x) =>
                            x.id === a.id ? { ...x, value: e.target.value } : x,
                          ),
                        })
                      }
                      placeholder="Ayrıntıları yazın…"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  patch({
                    attributes: [
                      ...draft.attributes,
                      { id: uid(), name: "", value: "" },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Özel nitelik ekle
              </button>
            </section>
            {draft.sections.map((s, i) => (
              <section
                className="wiki-section"
                id={`wiki-section-${s.id}`}
                key={`${s.id}-${revision}`}
              >
                <div className="wiki-section-heading">
                  <input
                    aria-label={`İçerik bloğu ${i + 1} başlığı`}
                    maxLength={200}
                    value={s.title}
                    onChange={(e) =>
                      changeSection(s.id, { title: e.target.value })
                    }
                    placeholder="Bölüm başlığı"
                  />
                  <button
                    type="button"
                    aria-label={`${s.title} yukarı taşı`}
                    disabled={i === 0}
                    onClick={() =>
                      patch({ sections: move(draft.sections, i, -1) })
                    }
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`${s.title} aşağı taşı`}
                    disabled={i === draft.sections.length - 1}
                    onClick={() =>
                      patch({ sections: move(draft.sections, i, 1) })
                    }
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`${s.title} bloğunu kaldır`}
                    onClick={() =>
                      patch({
                        sections: draft.sections.filter((x) => x.id !== s.id),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {s.kind === "text" && (
                  <WikiRichText
                    label={`${s.title} içeriği`}
                    value={s.content}
                    onChange={(content) => changeSection(s.id, { content })}
                  />
                )}
                {s.kind === "quote" && (
                  <textarea
                    className="wiki-quote"
                    aria-label={`${s.title} alıntısı`}
                    rows={4}
                    value={s.content}
                    onChange={(e) =>
                      changeSection(s.id, { content: e.target.value })
                    }
                    placeholder="Bir efsane, bir söz, hatırlanacak bir ses…"
                  />
                )}
                {s.kind === "image" && (
                  <div className="wiki-image-block">
                    {s.content && <img src={s.content} alt={s.title} />}
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        pickImage((content) => changeSection(s.id, { content }))
                      }
                    >
                      <ImagePlus size={17} />
                      {s.content ? "Görseli değiştir" : "Görsel yükle"}
                    </button>
                    {s.content && (
                      <button
                        type="button"
                        className="button danger-quiet"
                        onClick={() => changeSection(s.id, { content: "" })}
                      >
                        <Trash2 size={15} /> Görseli kaldır
                      </button>
                    )}
                  </div>
                )}
                {s.kind === "table" && (
                  <>
                    <div className="wiki-table-wrap">
                      <table className="wiki-table">
                        <tbody>
                          {s.rows.map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td key={ci}>
                                  <input
                                    aria-label={`Tablo ${i + 1} satır ${ri + 1} sütun ${ci + 1}`}
                                    value={cell}
                                    onChange={(e) =>
                                      changeSection(s.id, {
                                        rows: s.rows.map((r, rj) =>
                                          rj === ri
                                            ? r.map((v, cj) =>
                                                cj === ci ? e.target.value : v,
                                              )
                                            : r,
                                        ),
                                      })
                                    }
                                  />
                                </td>
                              ))}
                              <td>
                                <button
                                  type="button"
                                  title="Satırı kaldır"
                                  disabled={s.rows.length <= 1}
                                  onClick={() =>
                                    changeSection(s.id, {
                                      rows: s.rows.filter((_, j) => j !== ri),
                                    })
                                  }
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="text-button"
                        disabled={s.rows.length >= 100}
                        onClick={() =>
                          changeSection(s.id, {
                            rows: [
                              ...s.rows,
                              Array(s.rows[0]?.length || 2).fill(""),
                            ],
                          })
                        }
                      >
                        + Satır
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={(s.rows[0]?.length || 0) >= 20}
                        onClick={() =>
                          changeSection(s.id, {
                            rows: s.rows.map((r) => [...r, ""]),
                          })
                        }
                      >
                        + Sütun
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={(s.rows[0]?.length || 0) <= 1}
                        onClick={() =>
                          changeSection(s.id, {
                            rows: s.rows.map((r) => r.slice(0, -1)),
                          })
                        }
                      >
                        Son sütunu kaldır
                      </button>
                    </div>
                  </>
                )}
              </section>
            ))}
            <div className="wiki-block-buttons">
              {(
                [
                  { kind: "text", name: "Metin", icon: Type },
                  { kind: "quote", name: "Alıntı", icon: Quote },
                  { kind: "image", name: "Görsel", icon: ImagePlus },
                  { kind: "table", name: "Tablo", icon: Table2 },
                ] as const
              ).map((b) => (
                <button
                  type="button"
                  className="button secondary"
                  key={b.kind}
                  onClick={() =>
                    patch({
                      sections: [
                        ...draft.sections,
                        {
                          id: uid(),
                          title: b.name,
                          kind: b.kind,
                          content: "",
                          rows:
                            b.kind === "table"
                              ? [
                                  ["Başlık", "Değer"],
                                  ["", ""],
                                ]
                              : [],
                        },
                      ],
                    })
                  }
                >
                  <b.icon size={18} />
                  {b.name} ekle
                </button>
              ))}
            </div>
            <section id="wiki-links">
              <h2>
                <Link2 size={20} /> Bağlantılar
              </h2>
              {draft.relations.map((r, i) => (
                <div className="wiki-relation" key={i}>
                  <select
                    aria-label={`Bağlantı ${i + 1} kaydı`}
                    value={r.targetId}
                    onChange={(e) =>
                      patch({
                        relations: draft.relations.map((x, j) =>
                          j === i ? { ...x, targetId: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option value="">Kayıt seçin</option>
                    {(book.wiki || [])
                      .filter((e) => e.id !== draft.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                  </select>
                  <input
                    aria-label={`Bağlantı ${i + 1} ilişkisi`}
                    placeholder="İlişki: başkentidir, düşmanıdır…"
                    maxLength={200}
                    value={r.label}
                    onChange={(e) =>
                      patch({
                        relations: draft.relations.map((x, j) =>
                          j === i ? { ...x, label: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Bağlantı ${i + 1} kaldır`}
                    onClick={() =>
                      patch({
                        relations: draft.relations.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  patch({
                    relations: [
                      ...draft.relations,
                      { targetId: "", label: "" },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Wiki bağlantısı ekle
              </button>
              <div className="two-fields">
                <LinkPicker
                  label="İlgili bölümler"
                  options={book.chapters.map((c) => ({
                    id: c.id,
                    name: c.title,
                  }))}
                  value={draft.chapterIds}
                  onChange={(chapterIds) => patch({ chapterIds })}
                />
                <LinkPicker
                  label="İlgili karakterler"
                  options={book.characters.map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  value={draft.characterIds}
                  onChange={(characterIds) => patch({ characterIds })}
                />
              </div>
              {backlinks.length > 0 && (
                <div className="wiki-backlinks">
                  <strong>Bu kayda bağlananlar</strong>
                  {backlinks.map((e) => (
                    <span key={e.id}>
                      {e.title} ·{" "}
                      {e.relations.find((r) => r.targetId === draft.id)
                        ?.label || "İlgili"}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
          <aside className="wiki-editor-aside">
            <div className="eyebrow">KAPAK RESMİ</div>
            <div className="wiki-editor-cover">
              {draft.cover ? (
                <img src={draft.cover} alt={draft.title || "Wiki kapağı"} />
              ) : (
                <Globe2 size={58} strokeWidth={1} />
              )}
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => pickImage((cover) => patch({ cover }))}
            >
              <ImagePlus size={16} />
              Kapak yükle
            </button>
            {draft.cover && (
              <button
                type="button"
                className="text-button"
                onClick={() => patch({ cover: "" })}
              >
                Kapağı kaldır
              </button>
            )}
            <Field label="Kayıt durumu">
              <select
                value={draft.status}
                onChange={(e) =>
                  patch({ status: e.target.value as WikiEntry["status"] })
                }
              >
                <option value="draft">Taslak</option>
                <option value="complete">Tamamlandı</option>
              </select>
            </Field>
            <label className="check-line">
              <input
                type="checkbox"
                checked={draft.favorite}
                onChange={(e) => patch({ favorite: e.target.checked })}
              />
              Yıldızlı kayıt
            </label>
            <h3>İçindekiler</h3>
            {[
              { id: "wiki-identity", name: "Tanımlama" },
              { id: "wiki-attributes", name: "Nitelikler" },
              ...draft.sections.map((s) => ({
                id: `wiki-section-${s.id}`,
                name: s.title || "Adsız bölüm",
              })),
              { id: "wiki-links", name: "Bağlantılar" },
            ].map((s) => (
              <button
                type="button"
                className="wiki-toc-link"
                key={s.id}
                onClick={() =>
                  document
                    .getElementById(s.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {s.name}
              </button>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() => setHistory(!history)}
            >
              <History size={16} />
              Sürüm geçmişi ({draft.history.length})
            </button>
            {history && (
              <div className="wiki-history">
                <p className="quiet">
                  Son 15 kayıt tutulur. Geri alınan sürüm, kaydettiğinizde
                  uygulanır.
                </p>
                {!draft.history.length && (
                  <p className="quiet">
                    İlk düzenlemeden sonra önceki sürüm burada görünür.
                  </p>
                )}
                {draft.history.map((h, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      patch(h.content);
                      setRevision((v) => v + 1);
                      setHistory(false);
                    }}
                  >
                    <History size={14} />
                    <span>
                      {new Date(h.savedAt).toLocaleString("tr-TR")}
                      <small>{h.content.title}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="quiet">
              {book.title} kitabına aittir. Diğer kitaplardan bağımsız saklanır.
            </p>
          </aside>
        </div>
        <footer className="modal-footer wiki-editor-footer">
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
            <button type="button" className="button secondary" onClick={close}>
              Vazgeç
            </button>
          )}
          <button
            className="button primary"
            disabled={!draft.title.trim() || busy}
          >
            <Check size={17} />
            Wiki kaydını kaydet
          </button>
        </footer>
      </form>
    </Modal>
  );
}
