import { useState } from "react";
import {
  ArrowRight,
  ImagePlus,
  Check,
  X,
  Sparkles,
  ChevronDown,
  Search,
} from "lucide-react";
import type { Book } from "../types";
import { newBook } from "../model";
import { Modal, Field } from "./UI";
import BookCover from "./BookCover";
import CoverMotif from "./CoverMotif";
import SelectMenu from "./SelectMenu";
import { motifs } from "../appearance";
import { popularGenres, genreGroups, allGenres } from "../genres";
const colors = [
  "#314c48",
  "#493c59",
  "#584332",
  "#30445d",
  "#673d43",
  "#494d35",
];
export default function BookForm({
  book,
  onClose,
  onSubmit,
  notify,
}: {
  book?: Book;
  onClose: () => void;
  onSubmit: (book: Book) => void;
  notify: (s: string) => void;
}) {
  const [draft, setDraft] = useState<Book>(() =>
    book ? structuredClone(book) : newBook(),
  );
  const [custom, setCustom] = useState("");
  const [genresOpen, setGenresOpen] = useState(false);
  const [genreQuery, setGenreQuery] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const update = (patch: Partial<Book>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const genreButton = (genre: string) => (
    <button
      type="button"
      key={genre}
      aria-pressed={draft.genres.includes(genre)}
      className={`tag ${draft.genres.includes(genre) ? "selected" : ""}`}
      onClick={() =>
        update({
          genres: draft.genres.includes(genre)
            ? draft.genres.filter((g) => g !== genre)
            : [...draft.genres, genre],
        })
      }
    >
      {draft.genres.includes(genre) && <Check size={13} />}
      {genre}
    </button>
  );
  const chooseImage = async () => {
    setImageBusy(true);
    try {
      const image = await window.booklean.pickImage();
      if (image) update({ cover: image });
    } catch (e) {
      notify(String(e));
    } finally {
      setImageBusy(false);
    }
  };
  return (
    <Modal
      title={book ? "Kitabınızı düzenleyin." : "Yeni bir hikâye oluştur."}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.title.trim())
            onSubmit({
              ...draft,
              title: draft.title.trim(),
              author: draft.author.trim(),
            });
        }}
      >
        <div className="book-form-grid">
          <div className="cover-studio">
            <div className="preview-label">
              <Sparkles size={13} /> ÖNİZLEME
            </div>
            <BookCover book={draft} large />
            <div className="cover-floor" />
            <div className="cover-palette">
              {colors.map((color) => (
                <button
                  type="button"
                  key={color}
                  title={`Kapak rengi ${color}`}
                  className={draft.color === color ? "selected" : ""}
                  style={{ background: color }}
                  onClick={() => update({ color, cover: "" })}
                >
                  {draft.color === color && <Check size={13} />}
                </button>
              ))}
            </div>
            <SelectMenu
              label="Kapak görünümü"
              value={draft.motif}
              className="motif-picker"
              width={290}
              options={motifs.map((m) => ({
                value: m.id,
                label: m.name,
                description: m.description,
                icon: <CoverMotif motif={m.id} />,
              }))}
              onChange={(motif) => update({ motif, cover: "" })}
            />
            <p>
              <br />
              Kitap ayarlarını dilediğiniz zaman değiştirebilirsiniz.
            </p>
          </div>
          <div className="book-fields">
            <Field label="Kitabın adı">
              <input
                autoFocus
                required
                maxLength={150}
                placeholder="Her hikâye bir isimle başlar…"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </Field>
            <Field label="Yazar adı">
              <input
                maxLength={150}
                placeholder="Adınız veya mahlasınız"
                value={draft.author}
                onChange={(e) => update({ author: e.target.value })}
              />
            </Field>
            <div className="field">
              <span>
                Kitabın türü <small>Birden fazla seçebilirsiniz</small>
              </span>
              <div className="genre-list">{popularGenres.map(genreButton)}</div>
              {draft.genres.some((g) => !popularGenres.includes(g)) && (
                <div className="selected-genres">
                  <small>Diğer seçimleriniz</small>
                  <div className="genre-list">
                    {draft.genres
                      .filter((g) => !popularGenres.includes(g))
                      .map(genreButton)}
                  </div>
                </div>
              )}
              <button
                type="button"
                className="genre-toggle"
                aria-expanded={genresOpen}
                aria-controls="all-genres"
                onClick={() => setGenresOpen(!genresOpen)}
              >
                <span>
                  {genresOpen
                    ? "Daha az tür göster"
                    : `Tüm türleri keşfet (${allGenres.length})`}
                </span>
                <ChevronDown
                  size={17}
                  className={genresOpen ? "rotated" : ""}
                />
              </button>
              {genresOpen && (
                <div className="genre-disclosure" id="all-genres">
                  <div className="genre-search">
                    <Search size={16} />
                    <input
                      aria-label="Kitap türlerinde ara"
                      placeholder="Tür veya alt tür ara…"
                      value={genreQuery}
                      onChange={(e) => setGenreQuery(e.target.value)}
                    />
                  </div>
                  <div className="genre-groups">
                    {genreGroups.map((group) => {
                      const matches = group.genres.filter((g) =>
                        (group.name + " " + g)
                          .toLocaleLowerCase("tr")
                          .includes(genreQuery.trim().toLocaleLowerCase("tr")),
                      );
                      return matches.length ? (
                        <section key={group.name}>
                          <h4>{group.name}</h4>
                          <div className="genre-list">
                            {matches.map(genreButton)}
                          </div>
                        </section>
                      ) : null;
                    })}
                    {genreQuery.trim() &&
                      !genreGroups.some((group) =>
                        group.genres.some((g) =>
                          (group.name + " " + g)
                            .toLocaleLowerCase("tr")
                            .includes(
                              genreQuery.trim().toLocaleLowerCase("tr"),
                            ),
                        ),
                      ) && (
                        <p className="muted">
                          Eşleşen tür yok. Aşağıdan kendi etiketinizi
                          ekleyebilirsiniz.
                        </p>
                      )}
                  </div>
                </div>
              )}
              <div className="custom-genre">
                <input
                  aria-label="Özel tür etiketi"
                  placeholder="Kendi etiketinizi ekleyin"
                  maxLength={35}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!custom.trim()}
                  onClick={() => {
                    update({
                      genres: [...new Set([...draft.genres, custom.trim()])],
                    });
                    setCustom("");
                  }}
                >
                  Ekle
                </button>
              </div>
            </div>
            <Field
              label="Bir cümleyle hikâyeniz"
              hint="Yalnızca sizin için. Sonradan geliştirebilirsiniz."
            >
              <textarea
                rows={3}
                maxLength={3000}
                placeholder="Bu kitap ne anlatıyor?"
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </Field>
            <div className="upload-row">
              <button
                className="upload-button"
                type="button"
                onClick={chooseImage}
                disabled={imageBusy}
              >
                <ImagePlus size={20} />
                <span>
                  {draft.cover ? "Kapağı değiştir" : "Kitap Kapağı Yükle"}
                  <small>JPG, PNG veya WebP · En fazla 20 MB</small>
                </span>
              </button>
              {draft.cover && (
                <button
                  type="button"
                  className="icon-button"
                  title="Yüklenen kapağı kaldır"
                  onClick={() => update({ cover: "" })}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
        <footer className="modal-footer book-form-footer">
          <div className="button-row">
            <button
              className="button secondary"
              type="button"
              onClick={onClose}
            >
              Vazgeç
            </button>
            <button
              className="button primary"
              type="submit"
              disabled={!draft.title.trim()}
            >
              {book ? "Değişiklikleri kaydet" : "İleri, yazmaya başla"}
              <ArrowRight size={16} />
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
