# Booklean destek rehberi

Başlangıç için [README](../README.md), kod üzerinde çalışmak için [katkı rehberi](CONTRIBUTING.md) yardımcı olur. Çözülemeyen sorunları [hata bildirimi veya özellik önerisi](https://github.com/ArviiSoft/booklean/issues/new/choose) olarak paylaşabilirsiniz.

## Uygulamayı açmak

Windows x64 üzerinde `Booklean-…-portable.exe` dosyasını çalıştırın. Kaynaktan kullanım için proje klasöründe `npm ci` ve `npm run dev` komutlarını çalıştırın. Arayüzü tek başına tarayıcıdan açmak masaüstü dosya bağlantısını sağlamaz.

Derleme sırasında eski uygulama dosyaları kullanımda hatası alırsanız ilgili Booklean penceresini normal şekilde kapatıp yeniden deneyin.

## Kayıt ve yedek

| İşlem | Nasıl yapılır? |
| :--- | :--- |
| Kayıt konumunu görmek | **Ayarlar → Yerel kayıt** altındaki klasör yoluna tıklayın. |
| Kayıt konumunu değiştirmek | **Klasörü değiştir** ile yeni veya boş bir klasör seçin. Kitaplık ve yedekler kopyalanır; eski dosyalar korunur. |
| Ayrı yedek oluşturmak | **Ayarlar → Yedek Al** o andaki tüm kitaplığın kopyasını oluşturur. |
| Yedeği geri yüklemek | Son yedeklerden birini seçin. Bu işlem tüm kitaplığı o tarihe döndürür. Güncel kopyayı da istiyorsanız önce yedek alın. |
| Başka bilgisayara geçmek | Kitabı `.booklean` olarak dışa/içe aktarın veya uygulama kapalıyken veri klasörünü kopyalayın. |

Varsayılan konum `%APPDATA%/Booklean`, geliştirme konumu `%APPDATA%/Booklean-dev` olur. Bir konum seçtiyseniz kayıtlar oraya gider. EXE'nin bulunduğu klasör, kitaplığın konumu değildir.

Değişiklikler otomatik kaydedilir; ayrı yedek yalnızca **Yedek Al** ile oluşturulur. Kayıt hatası varsa uygulamayı zorla kapatmadan önce hata mesajını, disk erişimini ve boş alanı kontrol edin. Ana kayıt okunamazsa uygulama sağlam bir yedeği açmayı dener. `library.json` veya `backups/` içeriğini silerek sorun çözmeye çalışmayın.

## Dosya aktarımı

| Biçim | İçe aktarma | Dışa aktarma |
| :--- | :--- | :--- |
| `.booklean`, Booklean yapısındaki `.json` | Tam proje | `.booklean` ile tam proje |
| `.txt` | UTF-8, UTF-16, Windows Türkçe metin | Düz metin |
| `.md`, `.markdown` | Başlıklar ve temel biçimler | Markdown |
| `.html`, `.htm` | Temizlenmiş HTML ve gömülü veri görselleri | Bağımsız HTML |
| `.csv` | Her satır bir bölüm | Bölüm adı, metin, HTML, durum ve not |
| `.docx` | Word metni, temel biçimler ve gömülü görseller | Başlıklar, biçimler, listeler ve görseller |
| `.pdf` | Metin katmanı | Kapaklı A4 belge |
| `.epub` | Sıralı bölümler ve temel metin biçimleri | EPUB 3; görseller dahil değil |
| `.odt` | Metin ve başlıklar | Metin ve başlıklar |
| `.rtf` | Metin | Metin ve başlıklar |

İç çalışma verilerini korumak için `.booklean` kullanın. Diğer biçimler esas olarak bölüm metnini taşır. HTML/PDF/DOCX çıktılarında dipnotlar sonnot listesi olarak yer alır. Editörün görünüm tercihi ile seçili metnin biçimi farklıdır; bazı çıktı biçimleri kendi belge düzenini kullanır.

Eski `.doc`, DRM korumalı/şifreli dosyalar ve taranmış PDF'ler için OCR desteklenmez. Karmaşık Word/PDF/ODT sayfa düzenleri bire bir aktarılmaz. İçe aktarılan belge en fazla 32 MB, seçilen kapak veya görsel en fazla 20 MB olabilir; görseller 1600 piksele küçültülüp JPEG olarak saklanır.

CSV başlık örneği: `title,content,html,status,notes`. Türkçe `başlık`/`içerik` ve `baslik`/`icerik` de okunur. `html` doluysa önceliklidir.

## Temalar, animasyonlar ve Discord

- **Görünüm:** Üç temel tema Ayarlar'da görünür. Kalan sekiz tema **Diğer temalar** menüsündedir. Seçilen tema otomatik kaydedilir.
- **Animasyonlar:** Uygulama açılışı ve kitap açılma animasyonu ayrı ayrı kapatılabilir. Sistemde hareketi azalt açıksa bu animasyonlar atlanır.
- **Discord:** Masaüstü istemcisinin ve etkinlik paylaşımının açık olması gerekir. Tarayıcıdaki Discord yeterli değildir. Bağlantı durumu Ayarlar'da görünür; istemci sonradan açılırsa bağlantı yeniden denenir. Kitap ve bölüm adı paylaşılabilir; metnin içeriği gönderilmez. Özellik Ayarlar'dan kapatılabilir.

## Bildirim hazırlamak

Sürümü, Windows sürümünü, portable/geliştirme kullanımını, tekrarlama adımlarını ve hata mesajını ekleyin. Arayüz sorunlarında pencere boyutu ve Windows ekran ölçeği yararlıdır. Dosya aktarımı için biçimi ve yaklaşık boyutu belirtin.

Gerçek kitaplarınızı, yedeklerinizi veya özel bilgilerinizi paylaşmayın; küçük bir örnek kitapla sorunu gösterin. Güvenlik açıkları için [güvenlik bildirim yolunu](SECURITY.md) izleyin.
