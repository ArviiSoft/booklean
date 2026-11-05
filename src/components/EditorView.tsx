import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  Check,
  CloudOff,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  ImagePlus,
  GripVertical,
  Pencil,
  StickyNote,
  Users,
  X,
  BookOpen,
  CheckCheck,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Globe2,
  CalendarDays,
  LibraryBig,
  ListTodo,
  Clapperboard,
  ChartNoAxesColumn,
  Timer,
} from "lucide-react";
import type { Book, Chapter, Character, Library } from "../types";
import { chapterWords, fmt, newChapter, now, uid } from "../model";
import WritingCanvas from "./WritingCanvas";
import { Modal, Field } from "./UI";
import Popover from "./Popover";
import FontPicker from "./FontPicker";
import ThemePicker from "./ThemePicker";
import WriterTools, { type WriterTool, writerToolNames } from "./WriterTools";
import Dock from "./Dock";
import useSortableList, { reorderItems } from "./useSortableList";
import WikiView from "./WikiView";
import CalendarView from "./CalendarView";
import { defaultCalendar, periodLabel } from "../calendar";
import {
  CharacterAttributeFields,
  CharacterProfile,
} from "./CharacterAttributes";
export default function EditorView({
  book,
  preferences,
  saveState,
  onBack,
  onUpdate,
  onPreferences,
  onSave,
  onExport,
  onHelp,
  notify,
}: {
  book: Book;
  preferences: Library["preferences"];
  saveState: string;
  onBack: () => void;
  onUpdate: (fn: (book: Book) => Book) => void;
  onPreferences: (patch: Partial<Library["preferences"]>) => void;
  onSave: () => void;
  onExport: (chapterId?: string) => void;
  onHelp: () => void;
  notify: (s: string) => void;
}) {
  const [chapterId, setChapterId] = useState(
    book.lastChapterId || book.chapters[0].id,
  );
  const [focus, setFocus] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [chapterMenu, setChapterMenu] = useState<{
    id: string;
    anchor: HTMLElement;
  } | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [panel, setPanel] = useState<"notes" | "characters" | null>(null);
  const [preview, setPreview] = useState(false);
  const [character, setCharacter] = useState<Character | null>(null);
  const characterFormRef = useRef<HTMLFormElement>(null);
  const [profileCharacterId, setProfileCharacterId] = useState<string | null>(
    null,
  );
  const profileCharacter =
    book.characters.find((c) => c.id === profileCharacterId) ||
    book.characters[0];
  const [characterMenu, setCharacterMenu] = useState<{
    id: string;
    anchor: HTMLElement;
  } | null>(null);
  const [deleteCharacter, setDeleteCharacter] = useState<Character | null>(
    null,
  );
  const [deleteChapter, setDeleteChapter] = useState<string | null>(null);
  const [returnToCharacter, setReturnToCharacter] = useState(false);
  const [writerTool, setWriterTool] = useState<WriterTool | null>(null);
  const [workspace, setWorkspace] = useState<"write" | "wiki" | "calendar">(
    "write",
  );
  const chapter =
    book.chapters.find((c) => c.id === chapterId) || book.chapters[0];
  const index = book.chapters.findIndex((c) => c.id === chapter.id);
  const sortableChapter = useSortableList(
    "chapter",
    (sourceId, targetId, placement) => {
      onUpdate((b) => ({
        ...b,
        chapters: reorderItems(b.chapters, sourceId, targetId, placement),
      }));
    },
    () => setChapterMenu(null),
  );
  const sortableCharacter = useSortableList(
    "character",
    (sourceId, targetId, placement) => {
      onUpdate((b) => ({
        ...b,
        characters: reorderItems(b.characters, sourceId, targetId, placement),
      }));
    },
    () => setCharacterMenu(null),
  );
  useEffect(() => {
    window.booklean
      .setPresence({
        bookTitle: book.title,
        chapterTitle: chapter.title || "Adsız bölüm",
        chapterNumber: index + 1,
      })
      .catch(() => {});
  }, [book.title, chapter.id, chapter.title, index]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocus(false);
        setChapterMenu(null);
        setCharacterMenu(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function selectChapter(id: string) {
    setChapterId(id);
    onUpdate((b) => ({ ...b, lastChapterId: id }));
  }
  function updateChapter(patch: Partial<Chapter>) {
    onUpdate((b) => ({
      ...b,
      chapters: b.chapters.map((c) =>
        c.id === chapter.id ? { ...c, ...patch, updatedAt: now() } : c,
      ),
    }));
  }
  function addChapter() {
    const c = newChapter();
    onUpdate((b) => ({
      ...b,
      chapters: [...b.chapters, c],
      lastChapterId: c.id,
    }));
    setChapterId(c.id);
  }
  function moveChapter(id: string, step: number) {
    onUpdate((b) => {
      const items = [...b.chapters];
      const from = items.findIndex((c) => c.id === id);
      const to = from + step;
      if (to < 0 || to >= items.length) return b;
      [items[from], items[to]] = [items[to], items[from]];
      return { ...b, chapters: items };
    });
    setChapterMenu(null);
  }
  function moveCharacter(id: string, step: number) {
    onUpdate((b) => {
      const from = b.characters.findIndex((c) => c.id === id);
      const target = b.characters[from + step];
      return target
        ? {
            ...b,
            characters: reorderItems(
              b.characters,
              id,
              target.id,
              step < 0 ? "before" : "after",
            ),
          }
        : b;
    });
    setCharacterMenu(null);
  }
  function cancelCharacterDeletion() {
    if (returnToCharacter) setCharacter(deleteCharacter);
    setDeleteCharacter(null);
    setReturnToCharacter(false);
  }
  function duplicate(id: string) {
    const original = book.chapters.find((c) => c.id === id)!;
    const copy = {
      ...original,
      id: uid(),
      title: original.title + " — kopya",
      updatedAt: now(),
    };
    onUpdate((b) => ({
      ...b,
      lastChapterId: copy.id,
      chapters: [
        ...b.chapters.slice(0, b.chapters.findIndex((c) => c.id === id) + 1),
        copy,
        ...b.chapters.slice(b.chapters.findIndex((c) => c.id === id) + 1),
      ],
    }));
    setChapterId(copy.id);
    setChapterMenu(null);
  }
  return (
    <div
      className={`editor-layout ${focus ? "focus-mode" : ""}`}
      onKeyDownCapture={(event) => {
        if (
          character &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          event.stopPropagation();
          characterFormRef.current?.requestSubmit();
        }
      }}
    >
      <header className="editor-topbar">
        <div className="editor-location">
          <button
            className="icon-button back-to-library"
            title="Kitaplığa dön"
            onClick={onBack}
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <span className="editor-book-title">{book.title}</span>
            <span className="location-slash">/</span>
            <strong>
              {workspace === "wiki"
                ? "Wiki"
                : workspace === "calendar"
                  ? "Kurgu takvimi"
                  : chapter.title || "Adsız bölüm"}
            </strong>
          </div>
          <span
            hidden={workspace !== "write"}
            className={`status-badge ${chapter.status}`}
          >
            {chapter.status === "done" ? "Tamamlandı" : "Taslak"}
          </span>
        </div>
        <div className="editor-actions" hidden={workspace !== "write"}>
          <span className="header-word-count">
            {fmt(chapterWords(chapter))} kelime
          </span>
          <span
            className={`save-state ${saveState === "error" ? "error" : ""}`}
          >
            {saveState === "saved" ? (
              <Check size={13} />
            ) : (
              <CloudOff size={13} />
            )}{" "}
            {saveState === "saved"
              ? "Kaydedildi"
              : saveState === "error"
                ? "Kayıt hatası"
                : "Kaydediliyor…"}
          </span>
          <FontPicker preferences={preferences} onChange={onPreferences} />
          <ThemePicker
            value={preferences.theme}
            onChange={(theme) => onPreferences({ theme })}
          />
          {!preview && (
            <button
              className="icon-button focus-button"
              title={focus ? "Odak modundan çık" : "Odak modu"}
              onClick={() => setFocus(!focus)}
            >
              {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <button
            className="button secondary preview-button"
            aria-label={preview ? "Editöre dön" : "Önizle"}
            onClick={() => {
              setPreview(!preview);
              setFocus(false);
              setChapterMenu(null);
            }}
          >
            <Eye size={15} /> {preview ? "Düzenle" : "Önizle"}
          </button>
          <button className="button secondary save-button" onClick={onSave}>
            Kaydet
          </button>
          <button
            className="button primary export-button"
            aria-label="Dışa aktar"
            onClick={() => onExport(chapter.id)}
          >
            <Download size={15} />
            <span>Dışa aktar</span>
          </button>
        </div>
      </header>
      {workspace === "wiki" && (
        <WikiView book={book} onUpdate={onUpdate} notify={notify} />
      )}
      {workspace === "calendar" && (
        <CalendarView
          book={book}
          chapterId={chapter.id}
          onUpdate={onUpdate}
          notify={notify}
        />
      )}
      <div className="editor-body" hidden={preview || workspace !== "write"}>
        {sidebar && !focus && (
          <aside className="chapter-sidebar">
            <div className="chapter-sidebar-header">
              <span>
                BÖLÜMLER <small>{book.chapters.length}</small>
              </span>
              <button
                className="icon-button"
                title="Yeni bölüm ekle"
                onClick={addChapter}
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="chapter-list">
              {book.chapters.map((c, i) => (
                <div
                  className={`chapter-item-wrap ${c.id === chapter.id ? "selected" : ""}`}
                  key={c.id}
                  {...sortableChapter(c.id)}
                >
                  <span
                    className="sort-handle chapter-sort-handle"
                    title="Bölümü sürükleyerek sırala"
                    aria-hidden="true"
                  >
                    <GripVertical size={13} />
                  </span>
                  <button
                    className="chapter-item"
                    onClick={() => {
                      selectChapter(c.id);
                      setChapterMenu(null);
                    }}
                  >
                    <span className="chapter-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{c.title || "Adsız bölüm"}</strong>
                      <span>
                        {fmt(chapterWords(c))} kelime{" "}
                        {c.status === "done" && <CheckCheck size={12} />}
                      </span>
                    </div>
                  </button>
                  <button
                    className="chapter-more"
                    data-no-drag
                    title={`${c.title} bölüm seçenekleri`}
                    aria-haspopup="menu"
                    aria-expanded={chapterMenu?.id === c.id}
                    onClick={(e) =>
                      setChapterMenu(
                        chapterMenu?.id === c.id
                          ? null
                          : { id: c.id, anchor: e.currentTarget },
                      )
                    }
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {chapterMenu?.id === c.id && (
                    <Popover
                      anchor={chapterMenu.anchor}
                      onClose={() => setChapterMenu(null)}
                      label="Bölüm seçenekleri"
                      className="dropdown-menu chapter-menu"
                      placement="right-start"
                      width={292}
                    >
                      <button
                        onClick={() => {
                          onUpdate((b) => ({
                            ...b,
                            chapters: b.chapters.map((item) =>
                              item.id === c.id
                                ? {
                                    ...item,
                                    status:
                                      item.status === "done" ? "draft" : "done",
                                  }
                                : item,
                            ),
                          }));
                          setChapterMenu(null);
                        }}
                      >
                        <Check size={14} />
                        {c.status === "done"
                          ? "Taslağa döndür"
                          : "Tamamlandı olarak işaretle"}
                      </button>
                      <button
                        disabled={i === 0}
                        onClick={() => moveChapter(c.id, -1)}
                      >
                        <ArrowUp size={14} />
                        Yukarı taşı
                      </button>
                      <button
                        disabled={i === book.chapters.length - 1}
                        onClick={() => moveChapter(c.id, 1)}
                      >
                        <ArrowDown size={14} />
                        Aşağı taşı
                      </button>
                      <button onClick={() => duplicate(c.id)}>
                        <Copy size={14} />
                        Bölümü çoğalt
                      </button>
                      <button
                        onClick={() => {
                          onExport(c.id);
                          setChapterMenu(null);
                        }}
                      >
                        <Download size={14} />
                        Bölümü dışa aktar
                      </button>
                      <button
                        className="danger"
                        disabled={book.chapters.length === 1}
                        onClick={() => {
                          setDeleteChapter(c.id);
                          setChapterMenu(null);
                        }}
                      >
                        <Trash2 size={14} />
                        Bölümü sil
                      </button>
                    </Popover>
                  )}
                </div>
              ))}
            </div>
            <div className="chapter-sidebar-bottom">
              <button
                className="sidebar-action tools-toggle"
                aria-expanded={toolsOpen}
                aria-controls="book-tools"
                onClick={() => setToolsOpen(!toolsOpen)}
              >
                <BookOpen size={17} />
                <span>Hikâye araçları</span>
                <ChevronDown size={16} className={toolsOpen ? "rotated" : ""} />
              </button>
              {toolsOpen && (
                <div id="book-tools" className="book-tools">
                  <button
                    className={
                      panel === "notes"
                        ? "sidebar-action active"
                        : "sidebar-action"
                    }
                    onClick={() => setPanel(panel === "notes" ? null : "notes")}
                  >
                    <StickyNote size={16} />
                    Hikâye notları
                  </button>
                  <div className="sidebar-divider" />
                  {(
                    [
                      ["scenes", Clapperboard],
                      ["revisions", ListTodo],
                      ["analysis", ChartNoAxesColumn],
                      ["timer", Timer],
                    ] as const
                  ).map(([id, Icon]) => (
                    <button
                      key={id}
                      className="sidebar-action"
                      onClick={() => setWriterTool(id)}
                    >
                      <Icon size={16} />
                      {writerToolNames[id]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
        <main className="writing-area">
          {chapter.storyPeriod && (
            <button
              className="chapter-story-date"
              onClick={() => setWorkspace("calendar")}
            >
              <CalendarDays size={14} />
              {periodLabel(
                book.calendar || defaultCalendar(),
                chapter.storyPeriod,
              )}
            </button>
          )}
          <button
            className="sidebar-toggle icon-button"
            title={sidebar ? "Bölümleri gizle" : "Bölümleri göster"}
            onClick={() => {
              setSidebar(!sidebar);
              if (focus) setFocus(false);
            }}
          >
            {sidebar ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
          {focus && (
            <button className="focus-exit" onClick={() => setFocus(false)}>
              <Minimize2 size={14} /> Odaktan çık <kbd>Esc</kbd>
            </button>
          )}
          <WritingCanvas
            key={chapter.id}
            chapter={chapter}
            index={index}
            preferences={preferences}
            onUpdate={updateChapter}
            onHelp={onHelp}
            notify={notify}
          />
        </main>
        {panel && !focus && (
          <aside
            className={
              "notes-panel" +
              (panel === "characters" ? " characters-panel" : "")
            }
          >
            <header>
              <h3>{panel === "notes" ? "Hikâye notları" : "Karakterler"}</h3>
              <button
                className="icon-button"
                title="Paneli kapat"
                onClick={() => setPanel(null)}
              >
                <X size={17} />
              </button>
            </header>
            {panel === "notes" ? (
              <>
                <p className="panel-description">
                  Aklınızdan geçenler, kaybolmasın.
                </p>
                <Field label="Kitabın notları">
                  <textarea
                    className="book-notes"
                    placeholder="Olay örgüsü, araştırmalar, bir sonraki sahne…"
                    value={book.notes}
                    onChange={(e) =>
                      onUpdate((b) => ({ ...b, notes: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Bu bölüme özel">
                  <textarea
                    className="chapter-notes"
                    placeholder="Bu bölümde neler olmalı?"
                    value={chapter.notes}
                    onChange={(e) => updateChapter({ notes: e.target.value })}
                  />
                </Field>
                <small className="notes-hint">
                  <Check size={12} /> Notlarınız da otomatik kaydedilir.
                </small>
              </>
            ) : (
              <>
                <p className="panel-description">
                  Hikâyenizi oluşturan insanları yaratın.
                </p>
                <button
                  className="button secondary"
                  onClick={() =>
                    setCharacter({
                      id: uid(),
                      name: "",
                      role: "",
                      description: "",
                    })
                  }
                >
                  <Plus size={15} /> Karakter ekle
                </button>
                <div className="character-list">
                  {book.characters.map((c, i) => (
                    <div
                      className="character-card"
                      key={c.id}
                      {...sortableCharacter(c.id)}
                    >
                      <span
                        className="sort-handle character-sort-handle"
                        title="Karakteri sürükleyerek sırala"
                        aria-hidden="true"
                      >
                        <GripVertical size={13} />
                      </span>
                      <button
                        className="character-open"
                        aria-label={`${c.name} karakterini düzenle`}
                        onClick={() => {
                          setProfileCharacterId(c.id);
                          setCharacter({ ...c });
                        }}
                      >
                        <span className={`character-avatar avatar-${i % 4}`}>
                          {c.image ? (
                            <img src={c.image} alt={c.name} draggable={false} />
                          ) : (
                            c.name[0]?.toLocaleUpperCase("tr") || "?"
                          )}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.role || "Rol belirtilmedi"}</small>
                          <p>{c.description || "Henüz tanışmadınız…"}</p>
                        </div>
                      </button>
                      <button
                        className="character-more icon-button"
                        aria-label={`${c.name} karakter seçenekleri`}
                        title={`${c.name} karakter seçenekleri`}
                        aria-haspopup="menu"
                        aria-expanded={characterMenu?.id === c.id}
                        data-no-drag
                        onClick={(e) =>
                          setCharacterMenu(
                            characterMenu?.id === c.id
                              ? null
                              : { id: c.id, anchor: e.currentTarget },
                          )
                        }
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {characterMenu?.id === c.id && (
                        <Popover
                          anchor={characterMenu.anchor}
                          onClose={() => setCharacterMenu(null)}
                          label="Karakter seçenekleri"
                          className="dropdown-menu character-menu"
                          placement="bottom-end"
                          width={220}
                        >
                          <button
                            onClick={() => {
                              setProfileCharacterId(c.id);
                              setCharacter({ ...c });
                              setCharacterMenu(null);
                            }}
                          >
                            <Pencil size={14} /> Karakteri düzenle
                          </button>
                          <button
                            disabled={i === 0}
                            onClick={() => moveCharacter(c.id, -1)}
                          >
                            <ArrowUp size={14} /> Yukarı taşı
                          </button>
                          <button
                            disabled={i === book.characters.length - 1}
                            onClick={() => moveCharacter(c.id, 1)}
                          >
                            <ArrowDown size={14} /> Aşağı taşı
                          </button>
                          <button
                            className="danger"
                            onClick={() => {
                              setDeleteCharacter(c);
                              setReturnToCharacter(false);
                              setCharacterMenu(null);
                            }}
                          >
                            <Trash2 size={14} /> Karakteri sil
                          </button>
                        </Popover>
                      )}
                    </div>
                  ))}
                </div>
                {!book.characters.length && (
                  <div className="characters-empty">
                    <Users size={30} />
                    <p>
                      Her karakterin
                      <br />
                      anlatacak bir hikâyesi var.
                    </p>
                  </div>
                )}
                {profileCharacter && (
                  <div className="character-panel-profile">
                    <Field label="Cetvelde gösterilen karakter">
                      <select
                        value={profileCharacter.id}
                        onChange={(e) => setProfileCharacterId(e.target.value)}
                      >
                        {book.characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <CharacterProfile
                      attributes={profileCharacter.attributes}
                      compact
                    />
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>
      {preview && workspace === "write" && (
        <main className="preview-scroll" key={chapter.id}>
          <article
            style={{
              fontFamily: preferences.font,
              fontSize: preferences.fontSize,
              lineHeight: preferences.lineHeight,
            }}
          >
            <section>
              <div className="preview-chapter-label">BÖLÜM {index + 1}</div>
              <h1>{chapter.title}</h1>
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(chapter.html, {
                    ADD_ATTR: ["data-note"],
                  }),
                }}
              />
            </section>
            <nav className="preview-navigation" aria-label="Önizleme bölümleri">
              <button
                className="button secondary"
                disabled={index === 0}
                onClick={() => selectChapter(book.chapters[index - 1].id)}
              >
                <ArrowLeft size={16} /> Önceki
              </button>
              <select
                aria-label="Önizlenecek bölüm"
                value={chapter.id}
                onChange={(e) => selectChapter(e.target.value)}
              >
                {book.chapters.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {i + 1}. {c.title}
                  </option>
                ))}
              </select>
              <button
                className="button secondary"
                disabled={index === book.chapters.length - 1}
                onClick={() => selectChapter(book.chapters[index + 1].id)}
              >
                Sonraki <ArrowDown size={16} />
              </button>
            </nav>
          </article>
        </main>
      )}
      {!focus && (
        <Dock
          label="Kitap çalışma alanı"
          items={[
            {
              id: "library",
              label: "Kitaplığa dön",
              icon: LibraryBig,
              onClick: onBack,
            },
            {
              id: "write",
              label: "Yazı odası",
              icon: BookOpen,
              active:
                workspace === "write" && (panel !== "characters" || preview),
              onClick: () => {
                setWorkspace("write");
                setPanel(null);
                setCharacterMenu(null);
              },
            },
            {
              id: "characters",
              label: "Karakterler",
              icon: Users,
              active:
                workspace === "write" && panel === "characters" && !preview,
              count: book.characters.length,
              onClick: () => {
                setWorkspace("write");
                setPreview(false);
                setPanel(
                  workspace === "write" && panel === "characters" && !preview
                    ? null
                    : "characters",
                );
                setCharacterMenu(null);
              },
            },
            {
              id: "wiki",
              label: "Wiki",
              icon: Globe2,
              active: workspace === "wiki",
              count: book.wiki?.length || 0,
              onClick: () => {
                setWorkspace("wiki");
                setPanel(null);
                setCharacterMenu(null);
              },
            },
            {
              id: "calendar",
              label: "Kurgu takvimi",
              icon: CalendarDays,
              active: workspace === "calendar",
              count: book.events?.length || 0,
              onClick: () => {
                setWorkspace("calendar");
                setPanel(null);
                setCharacterMenu(null);
              },
            },
          ]}
        />
      )}
      {character && (
        <Modal
          title={character.name || "Yeni bir karakter oluştur."}
          eyebrow="KARAKTER KARTI"
          wide
          onClose={() => setCharacter(null)}
        >
          <form
            ref={characterFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              if (!character.name.trim() || imageBusy) return;
              onUpdate((b) => ({
                ...b,
                characters: b.characters.some((c) => c.id === character.id)
                  ? b.characters.map((c) =>
                      c.id === character.id ? character : c,
                    )
                  : [...b.characters, character],
              }));
              onSave();
              setProfileCharacterId(character.id);
              setCharacter(null);
            }}
          >
            <div className="dialog-body character-form">
              <div className="character-image-upload">
                <div className="character-portrait">
                  {character.image ? (
                    <img
                      src={character.image}
                      alt={character.name || "Karakter görseli"}
                    />
                  ) : (
                    <Users size={40} />
                  )}
                </div>
                <div>
                  <strong>Karakterin görseli</strong>
                  <p>JPG, PNG veya WebP · En fazla 20 MB</p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button secondary"
                      disabled={imageBusy}
                      onClick={async () => {
                        setImageBusy(true);
                        try {
                          const image = await window.booklean.pickImage();
                          if (image)
                            setCharacter((current) =>
                              current ? { ...current, image } : null,
                            );
                        } catch (error) {
                          notify(String(error));
                        } finally {
                          setImageBusy(false);
                        }
                      }}
                    >
                      <ImagePlus size={17} />
                      {imageBusy
                        ? "Yükleniyor…"
                        : character.image
                          ? "Görseli değiştir"
                          : "Görsel yükle"}
                    </button>
                    {character.image && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          setCharacter({ ...character, image: "" })
                        }
                      >
                        Görseli kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="two-fields">
                <Field label="Karakterin adı">
                  <input
                    required
                    autoFocus
                    maxLength={150}
                    value={character.name}
                    onChange={(e) =>
                      setCharacter({ ...character, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Hikâyedeki rolü">
                  <input
                    placeholder="Ana karakter, yol arkadaşı, karşı güç…"
                    maxLength={150}
                    value={character.role}
                    onChange={(e) =>
                      setCharacter({ ...character, role: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="two-fields">
                <Field label="Özellikler">
                  <textarea
                    rows={3}
                    maxLength={10000}
                    placeholder="Güçlü yanları, alışkanlıkları, zaafları…"
                    value={character.traits || ""}
                    onChange={(e) =>
                      setCharacter({ ...character, traits: e.target.value })
                    }
                  />
                </Field>
                <Field label="Motivasyon">
                  <textarea
                    rows={3}
                    maxLength={10000}
                    placeholder="Ne istiyor? Onu harekete geçiren ne?"
                    value={character.motivation || ""}
                    onChange={(e) =>
                      setCharacter({ ...character, motivation: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="İç çatışma">
                <textarea
                  rows={3}
                  maxLength={10000}
                  placeholder="İstekleriyle korkuları nerede çatışıyor?"
                  value={character.innerConflict || ""}
                  onChange={(e) =>
                    setCharacter({
                      ...character,
                      innerConflict: e.target.value,
                    })
                  }
                />
              </Field>
              <h3 className="character-section-title">Fiziksel özellikler</h3>
              <div className="physical-fields">
                {(
                  [
                    ["height", "Boy", "Örn. 175 cm"],
                    ["weight", "Kilo", "Örn. 68 kg"],
                    ["hairColor", "Saç rengi", "Örn. Kestane"],
                    ["eyeColor", "Göz rengi", "Örn. Ela"],
                    ["skinColor", "Ten rengi", "Örn. Buğday"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <Field key={key} label={label}>
                    <input
                      maxLength={100}
                      placeholder={placeholder}
                      value={character[key] || ""}
                      onChange={(e) =>
                        setCharacter({ ...character, [key]: e.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Field label="Onu tanıyalım">
                <textarea
                  rows={4}
                  maxLength={30000}
                  placeholder="İstekleri, korkuları, geçmişi, sırları…"
                  value={character.description}
                  onChange={(e) =>
                    setCharacter({ ...character, description: e.target.value })
                  }
                />
              </Field>
              <CharacterAttributeFields
                value={character.attributes}
                onChange={(attributes) =>
                  setCharacter({ ...character, attributes })
                }
              />
              <CharacterProfile attributes={character.attributes} />
            </div>
            <footer className="modal-footer">
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setCharacter(null)}
                >
                  Vazgeç
                </button>
                {book.characters.some((c) => c.id === character.id) && (
                  <button
                    type="button"
                    className="button danger-quiet"
                    onClick={() => {
                      setDeleteCharacter(character);
                      setReturnToCharacter(true);
                      setCharacter(null);
                    }}
                  >
                    <Trash2 size={15} /> Karakteri sil
                  </button>
                )}
              </div>
              <button
                className="button primary"
                disabled={!character.name.trim() || imageBusy}
              >
                Karakteri kaydet
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {deleteCharacter && (
        <Modal title="Karakter silinsin mi?" onClose={cancelCharacterDeletion}>
          <div className="dialog-body">
            <p>
              “{deleteCharacter.name}” karakteri ve bu karaktere verilen Wiki ve
              olay bağlantıları kaldırılacak.
            </p>
          </div>
          <footer className="modal-footer">
            <button
              className="button secondary"
              onClick={cancelCharacterDeletion}
            >
              Vazgeç
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                const withoutCharacter = (ids: string[]) =>
                  ids.filter((id) => id !== deleteCharacter.id);
                onUpdate((b) => ({
                  ...b,
                  characters: b.characters.filter(
                    (c) => c.id !== deleteCharacter.id,
                  ),
                  wiki: b.wiki?.map((entry) => ({
                    ...entry,
                    characterIds: withoutCharacter(entry.characterIds),
                    history: entry.history.map((version) => ({
                      ...version,
                      content: {
                        ...version.content,
                        characterIds: withoutCharacter(
                          version.content.characterIds,
                        ),
                      },
                    })),
                  })),
                  events: b.events?.map((event) => ({
                    ...event,
                    characterIds: withoutCharacter(event.characterIds),
                  })),
                }));
                setDeleteCharacter(null);
                setReturnToCharacter(false);
                notify("Karakter silindi.");
              }}
            >
              <Trash2 size={15} /> Karakteri sil
            </button>
          </footer>
        </Modal>
      )}
      {deleteChapter && (
        <Modal
          title="Bu bölüm silinsin mi?"
          onClose={() => setDeleteChapter(null)}
        >
          <div className="dialog-body">
            <p>
              “{book.chapters.find((c) => c.id === deleteChapter)?.title}” ve
              içindeki metin kitaptan kaldırılacak. Önce dışa aktararak bir
              kopyasını saklayabilirsiniz.
            </p>
          </div>
          <footer className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setDeleteChapter(null)}
            >
              Vazgeç
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                onUpdate((b) => ({
                  ...b,
                  chapters: b.chapters.filter((c) => c.id !== deleteChapter),
                  wiki: b.wiki?.map((e) => ({
                    ...e,
                    chapterIds: e.chapterIds.filter(
                      (id) => id !== deleteChapter,
                    ),
                    history: e.history.map((h) => ({
                      ...h,
                      content: {
                        ...h.content,
                        chapterIds: h.content.chapterIds.filter(
                          (id) => id !== deleteChapter,
                        ),
                      },
                    })),
                  })),
                  events: b.events?.map((e) => ({
                    ...e,
                    chapterIds: e.chapterIds.filter(
                      (id) => id !== deleteChapter,
                    ),
                  })),
                }));
                setDeleteChapter(null);
              }}
            >
              Bölümü sil
            </button>
          </footer>
        </Modal>
      )}
      <WriterTools
        tool={writerTool}
        onClose={() => setWriterTool(null)}
        book={book}
        chapter={chapter}
        onUpdate={onUpdate}
        notify={notify}
      />
    </div>
  );
}
