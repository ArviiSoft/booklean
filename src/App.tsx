import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  Upload,
  X,
  FolderOpen,
  RotateCcw,
} from "lucide-react";
import type { Book, Library } from "./types";
import { bookWords, initialLibrary, now, today } from "./model";
import { Brand, Titlebar, Modal } from "./components/UI";
import LibraryView from "./components/LibraryView";
import BookForm from "./components/BookForm";
import EditorView from "./components/EditorView";
import { ExportDialog, SettingsDialog, HelpDialog } from "./components/Dialogs";
import { themeStyle } from "./appearance";
import { StartupAnimation, BookOpening } from "./components/Transitions";
export default function App() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [opening, setOpening] = useState<Book | null>(null);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const finishOpening = useCallback(() => setOpening(null), []);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReducedMotion(query.matches);
      if (query.matches) setOpening(null);
    };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const libraryRef = useRef<Library | null>(null);
  const savedLibrary = useRef<Library | null>(null);
  const saving = useRef<Promise<void> | null>(null);
  const [dataPath, setDataPath] = useState("");
  useEffect(() => {
    if (
      library &&
      (library.preferences.startupAnimation === false || reducedMotion)
    )
      setIntroDone(true);
  }, [!!library, reducedMotion]);
  const [fatal, setFatal] = useState("");
  const [bookId, setBookId] = useState<string | null>(null);
  const [form, setForm] = useState<Book | "new" | null>(null);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [exporting, setExporting] = useState<{
    bookId: string;
    chapterId?: string;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [busy, setBusy] = useState(false);
  const [importInfo, setImportInfo] = useState<string[] | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message.replace(/^Error: /, ""));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  }, []);
  const update = useCallback((fn: (prev: Library) => Library) => {
    const prev = libraryRef.current;
    if (!prev) return;
    const next = fn(prev);
    if (next === prev) return;
    libraryRef.current = next;
    setLibrary(next);
    setSaveState("pending");
  }, []);
  const save = useCallback(() => {
    if (saving.current) return saving.current;
    saving.current = (async () => {
      try {
        while (
          libraryRef.current &&
          libraryRef.current !== savedLibrary.current
        ) {
          const data = libraryRef.current;
          setSaveState("saving");
          await window.booklean.save(data);
          savedLibrary.current = data;
        }
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
        throw e;
      }
    })().finally(() => {
      saving.current = null;
    });
    return saving.current;
  }, []);
  const load = useCallback(async () => {
    try {
      setFatal("");
      if (!window.booklean)
        throw new Error(
          "Booklean masaüstü bağlantısı bulunamadı. Uygulamayı npm run dev veya Booklean.exe ile açın.",
        );
      const result = await window.booklean.load();
      const data = result.library || initialLibrary();
      libraryRef.current = data;
      setLibrary(data);
      setDataPath(result.dataPath);
      if (result.recovery) notify(result.recovery);
    } catch (e) {
      setFatal(String(e));
    }
  }, [notify]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!library) return;
    const timer = setTimeout(
      () => save().catch((e) => notify("Kaydedilemedi: " + String(e))),
      650,
    );
    return () => clearTimeout(timer);
  }, [library, save, notify]);
  useEffect(() => {
    if (!window.booklean) return;
    const cleanup = window.booklean.onClosing(() => {
      save()
        .then(() => window.booklean.confirmClose())
        .catch((e) =>
          notify("Uygulama kapatılmadı. Kaydetme hatası: " + String(e)),
        );
    });
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save()
          .then(() => notify("Tüm değişiklikler kaydedildi."))
          .catch((e) => notify(String(e)));
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      cleanup();
      window.removeEventListener("keydown", key);
    };
  }, [save, notify]);
  const preferences = (patch: Partial<Library["preferences"]>) =>
    update((l) => ({ ...l, preferences: { ...l.preferences, ...patch } }));
  const open = (id: string) => {
    const target = libraryRef.current?.books.find((b) => b.id === id);
    if (
      target &&
      libraryRef.current?.preferences.bookAnimation !== false &&
      !reducedMotion
    )
      setOpening(target);
    update((l) => ({
      ...l,
      preferences: { ...l.preferences, lastBookId: id },
      books: l.books.map((b) =>
        b.id === id ? { ...b, lastOpenedAt: now() } : b,
      ),
    }));
    setBookId(id);
  };
  const patchBook = (id: string, patch: Partial<Book>) =>
    update((l) => ({
      ...l,
      books: l.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  const editBook = (fn: (book: Book) => Book) =>
    update((l) => {
      const current = l.books.find((b) => b.id === bookId);
      if (!current) return l;
      const next = fn(current);
      if (next === current) return l;
      const changed = { ...next, updatedAt: now() };
      const added =
        changed.chapters === current.chapters
          ? 0
          : Math.max(0, bookWords(changed) - bookWords(current));
      return {
        ...l,
        books: l.books.map((b) => (b.id === bookId ? changed : b)),
        activity: added
          ? { ...l.activity, [today()]: (l.activity[today()] || 0) + added }
          : l.activity,
      };
    });
  async function importFiles() {
    setBusy(true);
    try {
      const results = await window.booklean.importFile();
      if (results?.length) {
        update((l) => ({
          ...l,
          books: [...l.books, ...results.map((r) => r.book)],
        }));
        const warnings = [...new Set(results.flatMap((r) => r.warnings))];
        if (warnings.length) setImportInfo(warnings);
        notify(`${results.length} kitap kitaplığınıza eklendi.`);
      }
    } catch (e) {
      notify("İçe aktarma başarısız: " + String(e));
    } finally {
      setBusy(false);
    }
  }
  const currentBook = library?.books.find((b) => b.id === bookId);
  useEffect(() => {
    if (library && !currentBook)
      window.booklean.setPresence(null).catch(() => {});
  }, [!!library, currentBook?.id]);
  const exportBook = library?.books.find((b) => b.id === exporting?.bookId);
  return (
    <div
      className={`app theme-${library?.preferences.theme || "dark"}`}
      style={themeStyle(library?.preferences.theme || "dark")}
    >
      <Titlebar />
      {fatal ? (
        <div className="startup-screen">
          <AlertCircle size={34} />
          <h1>Yazı odası açılamadı.</h1>
          <p>{fatal}</p>
          <div className="button-row">
            <button className="button primary" onClick={load}>
              <RotateCcw size={16} /> Yeniden dene
            </button>
            <button
              className="button secondary"
              onClick={() => window.booklean?.openDataFolder()}
            >
              <FolderOpen size={16} /> Veri klasörünü aç
            </button>
          </div>
        </div>
      ) : !library ? (
        <div className="startup-screen">
          <Brand />
          <LoaderCircle className="spin" size={26} />
          <p>Yazı odanız hazırlanıyor…</p>
        </div>
      ) : !introDone &&
        library.preferences.startupAnimation !== false &&
        !reducedMotion ? (
        <StartupAnimation onDone={finishIntro} />
      ) : currentBook && opening ? (
        <div className="opening-backdrop" />
      ) : currentBook ? (
        <EditorView
          key={currentBook.id}
          book={currentBook}
          preferences={library.preferences}
          saveState={saveState}
          onBack={() => setBookId(null)}
          onUpdate={editBook}
          onPreferences={preferences}
          onSave={() =>
            save()
              .then(() => notify("Tüm değişiklikler kaydedildi."))
              .catch((e) => notify(String(e)))
          }
          onExport={(chapterId) =>
            setExporting({ bookId: currentBook.id, chapterId })
          }
          onHelp={() => setHelp(true)}
          notify={notify}
        />
      ) : (
        <LibraryView
          library={library}
          onOpen={open}
          onSort={(librarySort) => preferences({ librarySort })}
          onReorder={(ids) =>
            update((l) => {
              const byId = new Map(l.books.map((b) => [b.id, b]));
              const visible = new Set(ids);
              const ordered = ids
                .map((id) => byId.get(id))
                .filter((b): b is Book => !!b);
              let position = 0;
              return {
                ...l,
                preferences: { ...l.preferences, librarySort: "manual" },
                books: l.books.map((b) =>
                  visible.has(b.id) ? ordered[position++] : b,
                ),
              };
            })
          }
          onCreate={() => setForm("new")}
          onImport={importFiles}
          onSettings={() => setSettings(true)}
          onEdit={(book) => setForm(book)}
          onArchive={(book) => {
            update((l) => ({
              ...l,
              books: l.books.map((b) =>
                b.id === book.id ? { ...b, archived: !b.archived } : b,
              ),
            }));
            notify(
              book.archived
                ? "Kitap kitaplığınıza geri alındı."
                : "Kitap arşive taşındı.",
            );
          }}
          onExport={(book) => setExporting({ bookId: book.id })}
          onFavorite={(book) =>
            patchBook(book.id, { favorite: !book.favorite })
          }
          onTrash={(book) => {
            patchBook(book.id, { deletedAt: now() });
            notify(
              "Kitap çöp kutusuna taşındı. Çöp Kutusu’ndan geri yükleyebilirsiniz.",
            );
          }}
          onRestore={(book) => {
            patchBook(book.id, { deletedAt: null, archived: false });
            notify("Kitap kitaplığınıza geri yüklendi.");
          }}
          onDelete={(book) => {
            update((l) => ({
              ...l,
              books: l.books.filter((b) => b.id !== book.id),
              preferences: {
                ...l.preferences,
                lastBookId:
                  l.preferences.lastBookId === book.id
                    ? undefined
                    : l.preferences.lastBookId,
              },
            }));
            notify("Kitap kalıcı olarak silindi.");
          }}
          busy={busy}
        />
      )}
      <div className="global-overlay-area">
        {opening && <BookOpening book={opening} onDone={finishOpening} />}
        {form && (
          <BookForm
            book={form === "new" ? undefined : form}
            onClose={() => setForm(null)}
            notify={notify}
            onSubmit={(book) => {
              const isNew = form === "new";
              update((l) => ({
                ...l,
                books: isNew
                  ? [...l.books, book]
                  : l.books.map((b) =>
                      b.id === book.id ? { ...book, updatedAt: now() } : b,
                    ),
                preferences: { ...l.preferences, lastBookId: book.id },
              }));
              setForm(null);
              if (isNew) open(book.id);
              notify(
                isNew
                  ? "Kitabınız hazır. İlk cümle sizin."
                  : "Kitap bilgileri kaydedildi.",
              );
            }}
          />
        )}
        {library && settings && (
          <SettingsDialog
            library={library}
            onUpdate={preferences}
            dataPath={dataPath}
            onDataPathChange={setDataPath}
            onClose={() => setSettings(false)}
            notify={notify}
            onRestore={(restored) => {
              update(() => restored);
              setBookId(null);
            }}
          />
        )}
        {exportBook && (
          <ExportDialog
            book={exportBook}
            chapterId={exporting?.chapterId}
            onClose={() => setExporting(null)}
            notify={notify}
          />
        )}{" "}
        {help && <HelpDialog onClose={() => setHelp(false)} />}{" "}
        {importInfo && (
          <Modal
            title="Yazılarınız yeni yerinde."
            eyebrow="İÇE AKTARIM TAMAMLANDI"
            onClose={() => setImportInfo(null)}
          >
            <div className="dialog-body">
              {importInfo.map((info) => (
                <p className="muted" key={info}>
                  {info}
                </p>
              ))}
            </div>
            <footer className="modal-footer">
              <span className="quiet">Orijinal dosyalarınız korunur.</span>
              <button
                className="button primary"
                onClick={() => setImportInfo(null)}
              >
                Anladım
              </button>
            </footer>
          </Modal>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={16} />
          </span>
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Bildirimi kapat"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-pill">
          <LoaderCircle size={15} className="spin" /> Dosyalarınız hazırlanıyor…
        </div>
      )}
    </div>
  );
}
