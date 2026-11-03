# Booklean'e katkıda bulunmak

Booklean, Türkçe arayüzlü ve yerel kayıt kullanan bir Windows yazı uygulamasıdır. Hata düzeltmeleri, yazma akışlarını iyileştiren fikirler, erişilebilirlik ve dokümantasyon katkıları burada yer bulur.

## Geliştirme ortamı

Windows x64, Git ve Node.js 22.12 veya üzeri bir 22.x sürümü kullanın. Depoyu fork edip kendi kopyanızı klonlayın; proje klasöründe:

```powershell
npm ci
npm run dev
```

React arayüzü Vite üzerinden güncellenir. `electron/` veya preload değişikliklerinden sonra geliştirme uygulamasını yeniden başlatın. Geliştirme kitaplığı `%APPDATA%/Booklean-dev` altında, normal uygulamadan ayrı tutulur.

## Kodun yerini bulmak

| Dizin | Sorumluluk |
| :--- | :--- |
| `src/` | React/TypeScript arayüzü, Tiptap editörü, tema ve kapak seçenekleri |
| `electron/` | Pencere, IPC, kayıt, yedek, dosya dönüştürme ve Discord bağlantısı |
| `scripts/` | Geliştirme başlatıcısı ve Windows paketleme yardımcısı |
| `build/` | Uygulama ve Windows paketi için gerekli simge dosyaları |
| `.github/` | GitHub iş akışları, bildirim şablonları ve topluluk belgeleri |

## Derleme ve paketleme

TypeScript kontrolü ve üretim arayüzü derlemesi için:

```powershell
npm run build
```

Arayüz dosyaları `dist/` klasörüne yazılır. Windows x64 portable EXE üretmek için:

```powershell
npm run dist
```

Bu komut arayüzü derleyip `release/` altında portable EXE üretir. Aynı işlem `EXE-OLUSTUR.cmd` ile de başlatılabilir. `build/` içindeki simgeler derleme çıktısı değildir; uygulama ve paketleme için kaynak depoda tutulur.

## Pull request hazırlarken

- Tek bir problemi veya bağlantılı bir kullanıcı akışını ele alın; önce/sonra davranışını açıklayın.
- Arayüz metinlerini Türkçe ve anlaşılır tutun; klavye kullanımı, küçük pencereler ve açık/koyu temalarla uyumu gözetin.
- Veri şeması değişiyorsa eski kitaplar, kayıt, yedek ve `.booklean` aktarımı üzerindeki etkisini açıklayın. Yeni alanları yalnızca arayüze eklemek yeterli değildir.
- `node_modules/`, `dist/`, `release/`, `artifacts/`, `library.json`, `library-location.json`, `backups/` ve kişisel dosyaları commit etmeyin. Kilit dosyası bağımlılık değişiklikleriyle birlikte güncellenmelidir.
- README ürünün kullanımını anlatır; sürüm bazlı değişiklik listesini PR açıklamasına veya yayımlanacak sürüm notlarına yazın.

## GitHub otomasyonları

**Booklean CI**, `main`/`master` push'larında, pull request'lerde veya elle çalışır. Windows üzerinde bağımlılıkları kurar, TypeScript kontrolünü ve üretim derlemesini yürütür.

**Windows Portable**, Actions ekranından elle başlatılır. Seçilen dal için Windows x64 EXE üretir ve SHA-256 özetiyle birlikte 14 günlük artifact olarak sunar. Otomatik commit, push veya GitHub Release yayını yapmaz. İmza sertifikası yapılandırılmamıştır.

**Dependabot**, npm ve GitHub Actions güncellemelerini pazartesi 09.00'da (Europe/Istanbul) kontrol eder. Tiptap paketleri, React ailesi ve uyumlu geliştirme güncellemeleri gruplandırılır. Güncellemeler PR olarak incelenir; otomatik birleştirme yoktur. Issue/PR'lar hareketsizlik nedeniyle otomatik kapatılmaz.

İş akışlarının GitHub'da kullanılabilmesi için dosyalar repoya gönderilmiş ve Actions açık olmalıdır. Zamanlanmış Dependabot ayarları varsayılan dalda bulunmalıdır.

Başvuru: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [upload-artifact](https://github.com/actions/upload-artifact), [Dependabot seçenekleri](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
