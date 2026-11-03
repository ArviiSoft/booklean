import { useState } from "react";
import {
  LibraryBig,
  Clock3,
  Archive,
  Settings2,
  Plus,
  ArrowUpRight,
  Search,
  Upload,
  HardDrive,
  Feather,
  ArrowDownWideNarrow,
  BookOpen,
  ChevronRight,
  MoreHorizontal,
  FolderOpen,
  Star,
  FilePenLine,
  CircleCheck,
  Target,
  Trash2,
  RotateCcw,
  BookOpenCheck,
  Download,
  GripVertical,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import type { Book, Library } from "../types";
import { bookWords, fmt, today } from "../model";
import { Brand, Empty, Modal } from "./UI";
import BookCover from "./BookCover";
import Popover from "./Popover";
import Dock from "./Dock";
import SelectMenu from "./SelectMenu";
import useSortableList, { reorderItems } from "./useSortableList";

type Page =
  | "library"
  | "recent"
  | "favorites"
  | "drafts"
  | "completed"
  | "goals"
  | "archive"
  | "trash";
const labels: Record<Page, string> = {
  library: "Kitaplığım",
  recent: "Son açılanlar",
  favorites: "Favoriler",
  drafts: "Taslaklar",
  completed: "Tamamlananlar",
  goals: "Yazım hedefleri",
  archive: "Arşiv",
  trash: "Çöp Kutusu",
};
const hints: Record<Page, string> = {
  library: "Yeni bir kitapla başlayın.",
  recent: "Açtığınız kitaplar burada görünecek.",
  favorites: "Kitabın üç nokta menüsünden favorilerinize ekleyin.",
  drafts: "Yazımı süren kitaplar burada görünür.",
  completed:
    "Tüm bölümleri tamamlandı olarak işaretlenen kitaplar burada görünür.",
  goals: "Kitap hedefleriniz burada görünür.",
  archive: "Arşivlediğiniz kitaplar burada görünecek.",
  trash:
    "Çöp kutusuna taşıdığınız kitaplar siz kalıcı olarak silene kadar burada saklanır.",
};
const completed = (book: Book) =>
  book.chapters.every((c) => c.status === "done");

export default function LibraryView({
  library,
  onOpen,
  onCreate,
  onImport,
  onSettings,
  onEdit,
  onArchive,
  onExport,
  onFavorite,
  onTrash,
  onRestore,
  onDelete,
  onReorder,
  onSort,
  busy,
}: {
  library: Library;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onSettings: () => void;
  onEdit: (book: Book) => void;
  onArchive: (book: Book) => void;
  onExport: (book: Book) => void;
  onFavorite: (book: Book) => void;
  onTrash: (book: Book) => void;
  onRestore: (book: Book) => void;
  onDelete: (book: Book) => void;
  onReorder: (ids: string[]) => void;
  onSort: (sort: NonNullable<Library["preferences"]["librarySort"]>) => void;
  busy: boolean;
}) {
  const [page, setPage] = useState<Page>("library");
  const [query, setQuery] = useState("");
  const sort = library.preferences.librarySort || "recent";
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Book | null>(null);
  const active = library.books.filter((b) => !b.archived && !b.deletedAt);
  const wordCount = active.reduce((n, b) => n + bookWords(b), 0);
  const daily = library.activity[today()] || 0;
  let books = library.books
    .filter((b) =>
      page === "trash"
        ? !!b.deletedAt
        : !b.deletedAt && b.archived === (page === "archive"),
    )
    .filter((b) =>
      page === "favorites"
        ? b.favorite
        : page === "drafts"
          ? !completed(b)
          : page === "completed"
            ? completed(b)
            : true,
    )
    .filter((b) =>
      (b.title + " " + b.author + " " + b.genres.join(" "))
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
    )
    .sort((a, b) =>
      sort === "manual"
        ? 0
        : sort === "author"
          ? a.author.localeCompare(b.author, "tr")
          : sort === "words"
            ? bookWords(b) - bookWords(a)
            : sort === "created"
              ? b.createdAt.localeCompare(a.createdAt)
              : sort === "name"
                ? a.title.localeCompare(b.title, "tr")
                : page === "recent"
                  ? (b.lastOpenedAt || b.updatedAt).localeCompare(
                      a.lastOpenedAt || a.updatedAt,
                    )
                  : b.updatedAt.localeCompare(a.updatedAt),
    );
  if (page === "recent") books = books.slice(0, 10);
  const moveBook = (
    source: string,
    target: string,
    placement: "before" | "after",
  ) => {
    if (source === target) return;
    onReorder(reorderItems(books, source, target, placement).map((b) => b.id));
    setMenu(null);
  };
  const sortableBook = useSortableList(
    "book",
    moveBook,
    () => setMenu(null),
    "horizontal",
  );
  const last =
    active.find((b) => b.id === library.preferences.lastBookId) || active[0];
  const canCreate = page === "library" && !query;
  const shelves = Array.from(
    {
      length: Math.max(1, Math.ceil((books.length + (canCreate ? 1 : 0)) / 5)),
    },
    (_, i) => books.slice(i * 5, i * 5 + 5),
  );
  const navItems = [
    { id: "library", icon: LibraryBig, count: active.length },
    { id: "recent", icon: Clock3 },
    {
      id: "favorites",
      icon: Star,
      count: active.filter((b) => b.favorite).length,
    },
    {
      id: "drafts",
      icon: FilePenLine,
      count: active.filter((b) => !completed(b)).length,
    },
    {
      id: "completed",
      icon: CircleCheck,
      count: active.filter(completed).length,
    },
    { id: "goals", icon: Target },
    {
      id: "archive",
      icon: Archive,
      count: library.books.filter((b) => b.archived && !b.deletedAt).length,
    },
    {
      id: "trash",
      icon: Trash2,
      count: library.books.filter((b) => b.deletedAt).length,
    },
  ] as const;
  return (
    <div className="library-layout">
      <Dock
        label="Çalışma alanı"
        items={[
          ...navItems.map((item) => ({
            id: item.id,
            icon: item.icon,
            label: labels[item.id],
            active: page === item.id,
            count: "count" in item ? item.count : undefined,
            onClick: () => {
              setPage(item.id);
              setMenu(null);
              setQuery("");
            },
          })),
          {
            id: "import",
            icon: Upload,
            label: "Dosyadan içe aktar",
            disabled: busy,
            onClick: onImport,
          },
          {
            id: "settings",
            icon: Settings2,
            label: "Ayarlar",
            onClick: onSettings,
          },
        ]}
      />
      <main className="library-main">
        <header className="library-topbar">
          <div className="breadcrumbs">
            <LibraryBig size={17} />
            <span>Çalışma alanı</span>
            <ChevronRight size={14} />
            <strong>{labels[page]}</strong>
          </div>
        </header>
        <div className="library-content">
          <section className="library-hero">
            <div className="library-brand">
              <Brand />
            </div>
            <button
              className="button primary new-book-button"
              onClick={onCreate}
            >
              <Plus size={18} />
              Yeni kitap oluştur
            </button>
          </section>
          <div className="library-stats">
            <div>
              <BookOpen size={18} />
              <strong>{fmt(active.length)}</strong>
              <span>Kitap</span>
            </div>
            <span className="stat-divider" />
            <div>
              <Feather size={18} />
              <strong>{fmt(wordCount)}</strong>
              <span>Kelime</span>
            </div>
            <div className="daily-inline">
              <span
                className="small-ring"
                style={
                  {
                    "--progress": `${Math.min(100, (daily / library.preferences.dailyGoal) * 100)}%`,
                  } as React.CSSProperties
                }
              />
              <span>Bugünün hedefi</span>
              <strong>
                {fmt(daily)} <em>/ {fmt(library.preferences.dailyGoal)}</em>
              </strong>
            </div>
          </div>
          {page === "goals" ? (
            <section className="goals-dashboard">
              <div className="section-heading">
                <button className="button secondary" onClick={onSettings}>
                  <Settings2 size={16} />
                  Günlük hedefi düzenle
                </button>
              </div>
              <div className="daily-goal-card">
                <Target size={30} />
                <div>
                  <span>Bugün yazılan</span>
                  <h3>
                    {fmt(daily)}{" "}
                    <small>/ {fmt(library.preferences.dailyGoal)} kelime</small>
                  </h3>
                  <div className="progress-track">
                    <span
                      style={{
                        width:
                          Math.min(
                            100,
                            (daily / library.preferences.dailyGoal) * 100,
                          ) + "%",
                      }}
                    />
                  </div>
                </div>
                <strong>
                  %
                  {Math.min(
                    100,
                    Math.round((daily / library.preferences.dailyGoal) * 100),
                  )}
                </strong>
              </div>
              <div className="weekly-activity">
                <h3>Son 7 gün</h3>
                <div className="activity-days">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - 6 + i);
                    const key = [
                      date.getFullYear(),
                      String(date.getMonth() + 1).padStart(2, "0"),
                      String(date.getDate()).padStart(2, "0"),
                    ].join("-");
                    const count = library.activity[key] || 0;
                    return (
                      <div key={key} className={key === today() ? "today" : ""}>
                        <strong>{fmt(count)}</strong>
                        <div className="activity-bar">
                          <span
                            style={{
                              height:
                                Math.min(
                                  100,
                                  (count / library.preferences.dailyGoal) * 100,
                                ) + "%",
                            }}
                          />
                        </div>
                        <span>
                          {date.toLocaleDateString("tr-TR", {
                            weekday: "short",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <h3>Kitap hedefleri</h3>
              <div className="book-goal-list">
                {active.map((book) => (
                  <button key={book.id} onClick={() => onOpen(book.id)}>
                    <BookOpen size={22} />
                    <div>
                      <strong>{book.title}</strong>
                      <span>
                        {fmt(bookWords(book))} / {fmt(book.goal)} kelime
                      </span>
                      <div className="progress-track">
                        <span
                          style={{
                            width:
                              Math.min(
                                100,
                                (bookWords(book) / book.goal) * 100,
                              ) + "%",
                          }}
                        />
                      </div>
                    </div>
                    <strong>
                      %
                      {Math.min(
                        100,
                        Math.round((bookWords(book) / book.goal) * 100),
                      )}
                    </strong>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
              {!active.length && (
                <Empty
                  icon={<Target size={30} />}
                  heading="İlk hedefiniz bir hikâyeyle başlasın."
                >
                  Yeni bir kitap oluşturduğunuzda hedefi burada görünecek.
                </Empty>
              )}
            </section>
          ) : (
            <section className="shelf-section">
              <div className="section-heading">
                <h2>
                  {page === "library" ? "Kitaplarınız" : labels[page]}
                  <span>{books.length}</span>
                </h2>
                <div className="shelf-tools">
                  <div className="search-input">
                    <Search size={16} />
                    <input
                      aria-label="Kitaplıkta ara"
                      placeholder="Kitaplığınızda arayın…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <SelectMenu
                    label="Kitapları sırala"
                    value={sort}
                    icon={<ArrowDownWideNarrow size={17} />}
                    onChange={(v) =>
                      onSort(
                        v as NonNullable<Library["preferences"]["librarySort"]>,
                      )
                    }
                    options={[
                      {
                        value: "manual",
                        label: "Kendi sıralamam",
                        description: "Kitapları tutup istediğiniz yere bırakın",
                        icon: <GripVertical size={16} />,
                      },
                      {
                        value: "recent",
                        label:
                          page === "recent" ? "Son açılan" : "Son düzenlenen",
                        icon: <Clock3 size={16} />,
                      },
                      {
                        value: "name",
                        label: "Kitap adına göre",
                        icon: <BookOpen size={16} />,
                      },
                      {
                        value: "author",
                        label: "Yazar adına göre",
                        icon: <Feather size={16} />,
                      },
                      {
                        value: "words",
                        label: "Kelime sayısına göre",
                        icon: <FilePenLine size={16} />,
                      },
                      {
                        value: "created",
                        label: "En yeni eklenen",
                        icon: <Plus size={16} />,
                      },
                    ]}
                  />
                </div>
              </div>
              {!!books.length && (
                <p className="shelf-reorder-hint">
                  <GripVertical size={14} /> Kitapları sürükleyerek sıralayın.
                  Sıranız otomatik kaydedilir.
                </p>
              )}
              {page === "trash" && (
                <p className="trash-description">
                  Buradaki kitapları geri yükleyebilir veya kalıcı olarak
                  silebilirsiniz.
                </p>
              )}
              {!books.length && (query || page !== "library") ? (
                <Empty
                  icon={<FolderOpen size={32} />}
                  heading={
                    query
                      ? "Bu rafta bulunamadı."
                      : page === "trash"
                        ? "Çöp kutusu boş."
                        : "Burada henüz bir kitap yok."
                  }
                >
                  {query
                    ? "Farklı bir kitap adı, yazar veya tür arayın."
                    : hints[page]}
                </Empty>
              ) : (
                shelves.map((shelf, index) => (
                  <div className="shelf" key={index}>
                    <div className="shelf-books">
                      {Array.from({ length: 5 }, (_, slot) => {
                        const book = shelf[slot];
                        return book ? (
                          <div
                            className={`book-slot ${book.deletedAt ? "trashed-book" : ""}`}
                            key={book.id}
                            {...sortableBook(book.id)}
                          >
                            <span
                              className="book-drag-handle"
                              aria-hidden="true"
                            >
                              <GripVertical size={16} />
                            </span>
                            <button
                              className="book-open"
                              aria-label={`${book.title} kitabını aç`}
                              disabled={!!book.deletedAt}
                              onClick={() => onOpen(book.id)}
                            >
                              <BookCover book={book} />
                            </button>
                            <div className="book-caption">
                              <button
                                disabled={!!book.deletedAt}
                                onClick={() => onOpen(book.id)}
                                title={book.title}
                              >
                                {book.favorite && (
                                  <Star size={12} className="favorite-mark" />
                                )}
                                {book.title}
                              </button>
                              <div>
                                <span>
                                  {book.example
                                    ? "Örnek proje"
                                    : book.author || "İsimsiz yazar"}
                                </span>
                                <button
                                  className="book-more"
                                  data-no-drag
                                  aria-label={`${book.title} seçenekleri`}
                                  aria-haspopup="menu"
                                  aria-expanded={menu?.id === book.id}
                                  onClick={(e) =>
                                    setMenu(
                                      menu?.id === book.id
                                        ? null
                                        : {
                                            id: book.id,
                                            anchor: e.currentTarget,
                                          },
                                    )
                                  }
                                >
                                  <MoreHorizontal size={19} />
                                </button>
                              </div>
                              <small>
                                {book.chapters.length} bölüm <i>·</i>{" "}
                                {fmt(bookWords(book))} kelime
                              </small>
                            </div>
                            {menu?.id === book.id && (
                              <Popover
                                anchor={menu.anchor}
                                onClose={() => setMenu(null)}
                                label="Kitap seçenekleri"
                                className="dropdown-menu book-menu"
                                width={272}
                              >
                                {book.deletedAt ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setMenu(null);
                                        onRestore(book);
                                      }}
                                    >
                                      <RotateCcw size={16} />
                                      Kitaplığa geri yükle
                                    </button>
                                    <button
                                      className="danger"
                                      onClick={() => {
                                        setMenu(null);
                                        setDeleting(book);
                                      }}
                                    >
                                      <Trash2 size={16} />
                                      Kalıcı olarak sil
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setMenu(null);
                                        onEdit(book);
                                      }}
                                    >
                                      <Settings2 size={16} />
                                      Kitap bilgilerini düzenle
                                    </button>
                                    <button
                                      disabled={books[0]?.id === book.id}
                                      onClick={() =>
                                        moveBook(
                                          book.id,
                                          books[
                                            books.findIndex(
                                              (b) => b.id === book.id,
                                            ) - 1
                                          ].id,
                                          "before",
                                        )
                                      }
                                    >
                                      <ArrowLeft size={16} /> Sırada geri taşı
                                    </button>
                                    <button
                                      disabled={books.at(-1)?.id === book.id}
                                      onClick={() =>
                                        moveBook(
                                          book.id,
                                          books[
                                            books.findIndex(
                                              (b) => b.id === book.id,
                                            ) + 1
                                          ].id,
                                          "after",
                                        )
                                      }
                                    >
                                      <ArrowRight size={16} /> Sırada ileri taşı
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMenu(null);
                                        onFavorite(book);
                                      }}
                                    >
                                      <Star size={16} />
                                      {book.favorite
                                        ? "Favorilerden çıkar"
                                        : "Favorilere ekle"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMenu(null);
                                        onExport(book);
                                      }}
                                    >
                                      <Download size={16} />
                                      Dışa aktar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMenu(null);
                                        onArchive(book);
                                      }}
                                    >
                                      <Archive size={16} />
                                      {book.archived
                                        ? "Kitaplığa geri al"
                                        : "Arşive taşı"}
                                    </button>
                                    <button
                                      className="danger"
                                      onClick={() => {
                                        setMenu(null);
                                        onTrash(book);
                                      }}
                                    >
                                      <Trash2 size={16} />
                                      Çöp kutusuna taşı
                                    </button>
                                  </>
                                )}
                              </Popover>
                            )}
                          </div>
                        ) : canCreate ? (
                          <div
                            className="book-slot empty-slot"
                            key={`empty-${slot}`}
                          >
                            <button className="empty-book" onClick={onCreate}>
                              <span className="empty-book-plus">
                                <Plus size={21} strokeWidth={1.4} />
                              </span>
                              <span>Yeni oluştur</span>
                              <small>Bir hikâyeye yer var.</small>
                            </button>
                            <div className="empty-caption">
                              SIRADAKİ HİKÂYENİZ
                            </div>
                          </div>
                        ) : (
                          <div
                            key={`space-${slot}`}
                            className="book-slot"
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>
                    <div className="shelf-plank" />
                    <div className="shelf-shadow" />
                  </div>
                ))
              )}
            </section>
          )}
          {last && page === "library" && !query && (
            <section className="continue-card">
              <div className="continue-icon">
                <BookOpenCheck size={28} strokeWidth={1.7} />
              </div>
              <div>
                <div className="eyebrow">KALDIĞINIZ YERDEN DEVAM EDİN</div>
                <h3>{last.title}</h3>
                <p>
                  {
                    (
                      last.chapters.find((c) => c.id === last.lastChapterId) ||
                      last.chapters[0]
                    )?.title
                  }
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => onOpen(last.id)}
              >
                Yazmaya devam et
                <ArrowUpRight size={17} />
              </button>
            </section>
          )}
          <footer className="library-footer">
            <span>
              <HardDrive size={14} />
              Tüm kitaplarınız bu bilgisayarda saklanır.
            </span>
          </footer>
        </div>
      </main>
      {deleting && (
        <Modal
          title="Kitap kalıcı olarak silinsin mi?"
          onClose={() => setDeleting(null)}
        >
          <div className="dialog-body">
            <p>
              “{deleting.title}” kitabı, tüm bölümleri, notları ve
              karakterleriyle çöp kutusundan silinecek. Bu işlem geri alınamaz.
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
              className="button danger-button"
              onClick={() => {
                onDelete(deleting);
                setDeleting(null);
              }}
            >
              Kalıcı olarak sil
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
