import { useEffect, useState } from "react";
import {
  Download,
  FileText,
  FolderOpen,
  ShieldCheck,
  RotateCcw,
  ChevronRight,
  Keyboard,
  HardDrive,
  Check,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import type { Book, ExportFormat, Library, DiscordStatus } from "../types";
import { version } from "../../package.json";
import { Modal, Field } from "./UI";
import FontPicker from "./FontPicker";
import ThemePicker from "./ThemePicker";
import { themes } from "../appearance";
export const exportFormats: {
  id: ExportFormat;
  name: string;
  description: string;
}[] = [
  {
    id: "booklean",
    name: "Booklean projesi",
    description: "Kapak, bölümler, karakterler, notlar ve tüm biçimler.",
  },
  {
    id: "docx",
    name: "Word belgesi",
    description:
      "Başlıklar, temel biçimler ve görseller. Sayfa düzeni yeniden kurulur.",
  },
  {
    id: "pdf",
    name: "PDF belgesi",
    description: "Okumaya ve yazdırmaya hazır, sabit sayfa düzeni.",
  },
  {
    id: "epub",
    name: "EPUB e-kitap",
    description:
      "E-okuyucular için metin, biçimler ve içindekiler. Görseller dahil değil.",
  },
  {
    id: "txt",
    name: "Düz metin",
    description: "Başlıklar ve metin. Biçimlendirme içermez.",
  },
  {
    id: "md",
    name: "Markdown",
    description: "Başlıklar ve temel biçimlendirme işaretleri.",
  },
  {
    id: "html",
    name: "HTML belgesi",
    description: "Tarayıcıda açılabilen, görselleri içinde taşınan belge.",
  },
  {
    id: "csv",
    name: "CSV tablosu",
    description: "Her satır bir bölüm: başlık, metin, HTML, durum ve notlar.",
  },
  {
    id: "odt",
    name: "OpenDocument",
    description: "LibreOffice için metin ve bölüm başlıkları.",
  },
  {
    id: "rtf",
    name: "Zengin metin dosyası",
    description:
      "Geniş uyumluluk için metin ve başlıklar; biçimler sadeleştirilir.",
  },
];
export function ExportDialog({
  book,
  chapterId,
  onClose,
  notify,
}: {
  book: Book;
  chapterId?: string;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("booklean");
  const [scope, setScope] = useState<"chapter" | "book" | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(
    chapterId || book.lastChapterId || book.chapters[0].id,
  );
  const [step, setStep] = useState<"scope" | "format">("scope");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (
      !scope ||
      (scope === "chapter" &&
        !book.chapters.some((c) => c.id === selectedChapter))
    )
      return;
    setBusy(true);
    try {
      const file = await window.booklean.exportBook(
        book,
        format,
        scope === "chapter" ? selectedChapter : undefined,
      );
      if (file) {
        notify("Dosyanız dışa aktarıldı: " + file);
        onClose();
      }
    } catch (e) {
      notify("Dışa aktarma başarısız: " + String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        step === "scope"
          ? "Neyi dışa aktarmak istersiniz?"
          : "Dosya biçimini seçin."
      }
      eyebrow="DIŞA AKTAR"
      onClose={() => !busy && onClose()}
    >
      <div className="dialog-body">
        <div className="export-book-summary">
          <FileText size={22} />
          <div>
            <strong>{book.title}</strong>
            <small>
              {book.chapters.length} bölüm ·{" "}
              {book.author || "Yazar belirtilmedi"}
            </small>
          </div>
        </div>
        {step === "scope" ? (
          <>
            <div className="export-scope-cards">
              <button
                className={scope === "book" ? "active" : ""}
                aria-pressed={scope === "book"}
                onClick={() => setScope("book")}
              >
                <FileText size={26} />
                <strong>Kitabın tamamı</strong>
                <small>{book.chapters.length} bölümün tümünü dışa aktar.</small>
              </button>
              <button
                className={scope === "chapter" ? "active" : ""}
                aria-pressed={scope === "chapter"}
                onClick={() => setScope("chapter")}
              >
                <FileText size={26} />
                <strong>Yalnızca bir bölüm</strong>
                <small>Seçtiğin bölümün içeriğini dışa aktar.</small>
              </button>
            </div>
            {scope === "chapter" && (
              <Field label="Dışa aktarılacak bölüm">
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                >
                  {book.chapters.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      {i + 1}. {c.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        ) : (
          <>
            <p className="export-scope-summary">
              {scope === "book"
                ? `Kitabın tamamı · ${book.chapters.length} bölüm`
                : `Tek bölüm · ${book.chapters.find((c) => c.id === selectedChapter)?.title}`}
            </p>
            <div className="format-grid">
              {exportFormats.map((f) => (
                <button
                  className={
                    format === f.id ? "format-option selected" : "format-option"
                  }
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                >
                  <span className="format-extension">.{f.id}</span>
                  <strong>{f.name}</strong>
                  {format === f.id && <Check size={14} />}
                </button>
              ))}
            </div>
            <p className="format-info">
              <ShieldCheck size={16} />
              {exportFormats.find((f) => f.id === format)?.description}
            </p>
            <p className="dialog-hint">
              Wiki, takvim, karakter kartları ve çalışma notları yalnızca
              Booklean projesinde korunur. Asıl projenizi saklamak için bu
              biçimi kullanın.
              {scope === "chapter" &&
                format === "booklean" &&
                " Tek bölüm projesi, kitabın ortak Wiki ve takvim bilgilerini de içerir."}
            </p>
          </>
        )}
      </div>
      <footer className="modal-footer">
        {step === "format" ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setStep("scope")}
          >
            Kapsamı değiştir
          </button>
        ) : (
          <span className="quiet">
            Önce kapsamı, ardından dosya biçimini seçin.
          </span>
        )}
        {step === "scope" ? (
          <button
            className="button primary"
            disabled={!scope}
            onClick={() => setStep("format")}
          >
            Devam et <ChevronRight size={16} />
          </button>
        ) : (
          <button className="button primary" disabled={busy} onClick={save}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Download size={16} />
            )}{" "}
            {busy ? "Hazırlanıyor…" : "Dışa aktar"}
          </button>
        )}
      </footer>
    </Modal>
  );
}
export function SettingsDialog({
  library,
  onUpdate,
  onRestore,
  dataPath,
  onDataPathChange,
  onClose,
  notify,
}: {
  library: Library;
  onUpdate: (p: Partial<Library["preferences"]>) => void;
  onRestore: (library: Library) => void;
  dataPath: string;
  onDataPathChange: (path: string) => void;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [backups, setBackups] = useState<{ name: string; date: string }[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const storageBusy = moving || busy || backingUp || deletingBackup !== null;
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus>("waiting");
  useEffect(() => {
    window.booklean
      .listBackups()
      .then(setBackups)
      .catch((e) => notify(String(e)));
  }, []);
  useEffect(() => {
    window.booklean
      .getDiscordStatus()
      .then(setDiscordStatus)
      .catch(() => {});
    return window.booklean.onDiscordStatus(setDiscordStatus);
  }, []);
  async function changeFolder() {
    setMoving(true);
    try {
      await window.booklean.save(library);
      const result = await window.booklean.chooseDataFolder();
      if (result?.changed) {
        onDataPathChange(result.dataPath);
        setBackups(await window.booklean.listBackups());
        setConfirm(null);
        notify(
          "Kitaplık ve yedekler yeni klasöre kopyalandı. Kayıtlar artık bu konuma yapılacak.",
        );
      }
    } catch (error) {
      notify("Kayıt klasörü değiştirilemedi: " + String(error));
    } finally {
      setMoving(false);
    }
  }
  async function restore() {
    if (!confirm) return;
    setBusy(true);
    try {
      await window.booklean.save(library);
      const restored = await window.booklean.readBackup(confirm);
      await window.booklean.save(restored);
      onRestore(restored);
      setConfirm(null);
      notify("Seçtiğiniz yedek geri yüklendi.");
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function createBackup() {
    setBackingUp(true);
    try {
      await window.booklean.createBackup(library);
      setBackups(await window.booklean.listBackups());
      notify("Kitaplığınızın yedeği alındı.");
    } catch (error) {
      notify("Yedek alınamadı: " + String(error));
    } finally {
      setBackingUp(false);
    }
  }
  async function deleteBackup(name: string) {
    if (storageBusy) return;
    setDeletingBackup(name);
    try {
      await window.booklean.deleteBackup(name);
      setBackups((items) => items.filter((item) => item.name !== name));
      setConfirm((selected) => (selected === name ? null : selected));
      notify("Yedek silindi.");
    } catch (error) {
      notify("Yedek silinemedi: " + String(error));
    } finally {
      setDeletingBackup(null);
    }
  }
  return (
    <Modal
      title="Tercihler ve Yedekler"
      onClose={() => {
        if (!storageBusy) onClose();
      }}
    >
      <div className="dialog-body settings-body">
        <h3>Görünüm</h3>
        <div className="theme-options">
          {themes.slice(0, 3).map((t) => (
            <button
              className={`theme-option ${t.id} ${library.preferences.theme === t.id ? "selected" : ""}`}
              style={{
                background: t.paper,
                color: t.text,
                borderColor: t.border,
              }}
              aria-pressed={library.preferences.theme === t.id}
              onClick={() => onUpdate({ theme: t.id })}
              key={t.id}
            >
              <span
                className="theme-card-letter"
                aria-hidden="true"
                style={{ color: t.accent }}
              >
                Aa
              </span>
              <span>{t.name}</span>
              {library.preferences.theme === t.id && <Check size={14} />}
            </button>
          ))}
        </div>
        <div className="settings-extra-themes">
          <span>Yazı odanıza başka bir renk katın.</span>
          <ThemePicker
            value={library.preferences.theme}
            onChange={(theme) => onUpdate({ theme })}
            additionalOnly
          />
        </div>
        <div className="settings-divider" />
        <h3>Animasyonlar</h3>
        <div className="animation-settings">
          {(
            [
              [
                "startupAnimation",
                "Açılış animasyonu",
                "Uygulama açılırken kısa bir karşılama.",
              ],
              [
                "bookAnimation",
                "Kitap açılma animasyonu",
                "Sayfalar açılır, hikâyenin içine yaklaşırsınız.",
              ],
            ] as const
          ).map(([key, title, description]) => (
            <button
              key={key}
              className="setting-toggle"
              role="switch"
              aria-label={title}
              aria-checked={library.preferences[key] !== false}
              onClick={() =>
                onUpdate({ [key]: library.preferences[key] === false })
              }
            >
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <i className={library.preferences[key] !== false ? "on" : ""} />
            </button>
          ))}
        </div>
        <p className="settings-motion-hint">
          Sistemin hareketi azalt tercihi açıksa bu animasyonlar atlanır.
        </p>
        <div className="two-fields">
          <Field label="Günlük kelime hedefi">
            <input
              aria-label="Günlük kelime hedefi"
              type="number"
              min={50}
              max={100000}
              step={50}
              value={library.preferences.dailyGoal}
              onChange={(e) => {
                if (+e.target.value >= 50)
                  onUpdate({ dailyGoal: Math.min(100000, +e.target.value) });
              }}
            />
          </Field>
          <div className="field">
            <span>Varsayılan yazı görünümü</span>
            <FontPicker preferences={library.preferences} onChange={onUpdate} />
          </div>
        </div>
        <div className="settings-divider" />
        <h3>
          <HardDrive size={17} /> Yerel kayıt
        </h3>
        <p className="muted">
          Yazılarınız çalışma dosyasına kaydedilir. Ayrı bir yedek yalnızca
          “Yedek Al” düğmesine bastığınızda oluşturulur.
        </p>
        <button
          className="data-path"
          title={dataPath}
          onClick={() =>
            window.booklean.openDataFolder().catch((e) => notify(String(e)))
          }
        >
          <FolderOpen size={18} />
          <span>{dataPath}</span>
          <ChevronRight size={17} />
        </button>
        <div className="storage-location-actions">
          <span>Kitaplık ve yedekler seçtiğiniz klasörde saklanır.</span>
          <button
            className="button secondary"
            disabled={storageBusy}
            onClick={changeFolder}
          >
            {moving ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <FolderOpen size={15} />
            )}{" "}
            {moving ? "Kopyalanıyor…" : "Klasörü değiştir"}
          </button>
        </div>
        <div className="backup-heading">
          <h3>
            Son yedekler <span className="count-badge">{backups.length}</span>
          </h3>
          <button
            className="button primary"
            disabled={storageBusy}
            onClick={createBackup}
          >
            {backingUp ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            {backingUp ? "Yedek alınıyor…" : "Yedek Al"}
          </button>
        </div>
        <div className="backup-list">
          {backups.length ? (
            backups.map((b) => (
              <div key={b.name}>
                <span>{new Date(b.date).toLocaleString("tr-TR")}</span>
                <div className="backup-actions">
                  <button
                    disabled={storageBusy}
                    onClick={() => setConfirm(b.name)}
                  >
                    <RotateCcw size={13} /> Geri yükle
                  </button>
                  <button
                    className="backup-delete"
                    disabled={storageBusy}
                    title="Bu yedeği kalıcı olarak sil"
                    onClick={() => deleteBackup(b.name)}
                  >
                    {deletingBackup === b.name ? (
                      <LoaderCircle size={13} className="spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {deletingBackup === b.name ? "Siliniyor…" : "Yedeği Sil"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>Henüz yedek yok. İlk yedeğinizi “Yedek Al” ile oluşturun.</p>
          )}
        </div>
        {confirm && (
          <div className="restore-confirm">
            <p>
              Bu yedek tüm kitaplığı seçilen tarihe döndürür. Güncel hâlini de
              saklamak isterseniz önce “Yedek Al” düğmesini kullanın.
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => setConfirm(null)}
              >
                Vazgeç
              </button>
              <button
                className="button primary"
                disabled={storageBusy}
                onClick={restore}
              >
                Yedeği geri yükle
              </button>
            </div>
          </div>
        )}
        <div className="settings-divider" />
        <div className="discord-setting">
          <div>
            <h3>Discord Rich Presence</h3>
            <p>Kitap ve bölüm adını Discord profilinde göster.</p>
          </div>
          <button
            className={`toggle-switch ${library.preferences.discordPresence !== false ? "on" : ""}`}
            role="switch"
            aria-label="Discord'da göster"
            aria-checked={library.preferences.discordPresence !== false}
            onClick={() =>
              onUpdate({
                discordPresence: library.preferences.discordPresence === false,
              })
            }
          >
            <span />
          </button>
        </div>
        <div className={`discord-status ${discordStatus}`} role="status">
          <span />
          {
            {
              disabled: "Kapalı",
              connecting: "Discord’a bağlanılıyor…",
              waiting: "Discord masaüstü uygulaması bekleniyor.",
              connected: "Discord’a bağlı",
              error: "Discord bağlantısı kurulamadı. Yeniden denenecek.",
            }[discordStatus]
          }
        </div>
        <p className="settings-version">Booklean {version}</p>
      </div>
    </Modal>
  );
}
export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Yazarken elinizin altında."
      eyebrow="KÜÇÜK BİR REHBER"
      onClose={onClose}
    >
      <div className="dialog-body">
        <h3>
          <Keyboard size={18} /> Klavye kısayolları
        </h3>
        <div className="shortcut-list">
          {[
            ["Kaydet", "Ctrl + S"],
            ["Kalın / İtalik / Altı çizili", "Ctrl + B / I / U"],
            ["Geri al", "Ctrl + Z"],
            ["Yinele", "Ctrl + Shift + Z"],
            ["Bölümde bul ve değiştir", "Ctrl + F"],
            ["Odak modundan çık / Pencereyi kapat", "Esc"],
          ].map(([name, key]) => (
            <div key={name}>
              <span>{name}</span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </div>
        <h3>Küçük ayrıntılar, rahat bir akış.</h3>
        <p className="muted">
          Bir metin seçtiğinizde hızlı biçimlendirme menüsü açılır. Dipnot
          eklediğiniz metnin üzerine gelerek notu okuyabilirsiniz. Bölümlerin
          sırasını sürükleyerek veya yanlarındaki menüden değiştirebilir, biten
          bölümleri tamamlandı olarak işaretleyebilirsiniz.
        </p>
        <p className="muted">
          Odak modu kenar panellerini gizler. Önizleme açık bölümden başlar;
          alttaki bölüm seçimiyle kitabınızda gezinebilirsiniz. Hedef, notlar ve
          karakter kartları Hikâye araçları menüsünde, kitap ayarları
          kitaplıktaki kitabın üç nokta menüsünde.
        </p>
        <h3>Dosyalarınızı getirin.</h3>
        <p className="muted">
          TXT, Markdown, CSV, HTML, DOCX, PDF, RTF, EPUB, ODT ve Booklean/JSON
          içe aktarılabilir. Taranmış PDF için OCR gerekir; eski .doc ve şifreli
          belgeler desteklenmez.
        </p>
      </div>
    </Modal>
  );
}
