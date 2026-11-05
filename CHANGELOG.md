# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenecektir.

Format [Keep a Changelog](https://keepachangelog.com/tr-TR/1.0.0/) standardına dayanır ve proje [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) kurallarını takip eder.


---

## [v1.3.0] - 01.10.2026

- Kitaplıktaki sol kontrol paneli kaldırıldı. Kitaplık, son açılanlar, favoriler, taslaklar, tamamlananlar, hedefler, arşiv, çöp kutusu, içe aktarma ve ayarlar alt ortadaki **dinamik ada**ya taşındı . 

- Artık **Dışa aktar** önce **Kitabın tamamı** veya **Yalnızca bir bölüm** seçimini soruyor. Tek bölüm seçildiğinde açık bölüm öneriliyor, başka bir bölüm de seçilebilir. Sonraki adımda dosya biçimini, ardından kayıt konumu seçilebiliyor. `.booklean` uzantı biçiminde tek bölümün yanında ortak Wiki, karakterler ve takvim verileri de ekleniyor. 

- **Wiki** ayarı eklendi. Her kitaba özeldir. Medeniyetler, örgütler, tarih, kültür, nesneler, doğa, mekânlar ve evren bilgisi kategorilerinde kayıt oluşturabilirsiniz. Kategoriye uygun nitelik şablonlarını ekleyip, kendi niteliklerinizi oluşturabilirsiniz. İçeriği biçimlendirilebilir metin, alıntı, yerel görsel ve düzenlenebilir tablo bloklarıyla oluşturabilirsiniz. 

- **Kurgu takvimi** sistemi eklendi. Yazım hedeflerinden bağımsız olarak hikâyenin geçtiği zamanı tutar. Kitaba ve her bölüme ayrı başlangıç/bitiş tarihi, saat ve tarih notu atayabilirsiniz. Sahneler, tarihi olaylar, kutlamalar, yolculuklar ve daha fazlası! Açıklama, durum, renk, olay örgüsü, mekan, hava durumu, etiket ve Wiki/karakter/bölüm bağlantılarıyla kaydedilir. Aylık takvimde çok günlük olaylar ve kitap/bölüm tarihleri birlikte görünür. Kronoloji bütün olayları tarihe göre sıralar, pano planlandı/yazıldı/tamamlandı durumlarını gösterir. Olaylar aylık veya yıllık tekrarlanabilir. Geçersiz günler atlanır.

- Takvim ayarlarında ad, çağ eki, başlangıç yılı, ilk haftanın günü (1-14 günlük hafta), en fazla 24 ay, ay başına 1-100 gün ve mevsim adları tanımlanabilir. Miladi artık yıl kuralı isteğe bağlıdır. Negatif yıllar ve 0 yılı desteklenir. Ay evresi göstergesi ayarlanabilir bir **kurgu döngüsüdür**, astronomik tahmin değildir. Takvim değişince tarihler aynı yıl/ay/gün olarak kalır, otomatik tarih dönüşümü yapılmaz.

---

## [v1.4.0] - 03.10.2026

- Kapak görünümü menüsünde 15 ek desen eklendi.
- 11 tane yeni tema: Gece, Kağıt, Gündüz, Gece mavisi, Orman, Okyanus, Mürdüm, Grafit, Gül kurusu, Kum ve Sis. 
- Kitapları raflar arasında tutup sürükleyerek sıralama sistemi eklendi.
- Gruplandırılmış biçim araçları yenilendi: H1-H6, 12 yazı tipi, 10 metin boyutu, üst/alt simge, Türkçe harf dönüşümleri, 8 metin ve 6 vurgu rengi, hizalama, girinti, paragraf satır aralığı, iç içe listeler, alıntı, kod, dipnot, bağlantı, görsel, sahne ayırıcı ve özel karakterler **eklendi**.
- Hikaye araçlarına **Sahne planı**, **Revizyon listesi**, **Yazı analizi** ve **Odak sayacı** eklendi.
- Uygulama açılışında kısa animasyon, kitap açılırken iki yana açılan sayfalar ve yaklaşma animasyonu eklendi. Bu animasyon ayarlarını **Ayarlar > Animasyonlar** altında ayrı ayrı kapatabilirsiniz.
- Bölüm listesinin altındaki **Yeni bölüm** ve hikaye araçlarındaki **Kitap hedefi** kaldırıldı.

---

## [v1.4.1] - 04.11.2026

- Uygulama genelinde performans iyileştirmeleri yapıldı. Yazarken, kitaplıkta gezinirken ve ayarları değiştirirken değişmeyen bölümlerin kelimelerinin tekrar sayılması önlendi, özellikle uzun kitaplarda yavaşlama ve takılmalar azaltıldı.
- **Yazı analizi** yalnızca panel açıkken çalışacak şekilde düzenlendi. Panel kapalıyken kitabın tamamının gereksiz yere analiz edilmesi önlendi.
- Bölümde **Bul ve değiştir** ile **Wiki** aramaları hızlandırıldı. Değişmeyen metinlerin ve arama sonuçlarının tekrar işlenmesi azaltıldı.
- **Otomatik kayıt**, **Ctrl+S** ve uygulama kapanışındaki kayıt istekleri iyileştirildi. Aynı verinin tekrar tekrar kaydedilmesi önlendi, kayıt sırasında yapılan son değişiklikler de diske yazılmadan uygulamanın kapanmaması sağlandı.
- **Ayarlar > Son yedekler** bölümünde **Geri yükle** butonunun yanına **Yedeği Sil** eklendi. Seçilen yedek tek tıkla kalıcı olarak silinebilir.

---

## [v1.4.2] - 06.11.2026

- **Karakterler**, Hikâye araçları menüsünden kaldırılarak **dinamik ada**ya taşındı.
- Karakter oluşturma ve düzenleme formuna zihinsel, duygusal, fiziksel, sosyal ve iradeyle ilgili **42 isteğe bağlı sayısal özellik** eklendi. Zekâ, duygusallık, güç, hırs, empati, cesaret ve diğer özellikler **0-100 arasında tam sayı** girilerek belirlenebilir. Boş bırakılan özellikler değerlendirilmez, toplamın 100 olması gerekmez.
- Karakter formunun ve karakter panelinin altına **Özellik cetveli** eklendi. Girilen değerlere göre baskın özellikler anlık olarak gösterilir, eşit en yüksek değerler birlikte belirtilir. Paneldeki karakter seçimiyle farklı karakterlerin cetvelleri incelenebilir.
- Cetvele **eğilim çubukları** eklendi. Mantık-duygusallık, cesaret-temkin, empati-bencillik, sabır-dürtüsellik, dürüstlük-manipülasyon ve sosyallik-bağımsızlık çiftlerinde girilen iki değerin oranına göre hangi tarafın ağır bastığı gösterilir.
- Sayısal özelliklerin kayıt, yeniden açılış, yedekleme ve **Booklean içe/dışa aktarımı** sırasında korunması sağlandı. Boş bırakılan alanlarla sıfır değeri ayrı tutulur, mevcut karakterler sayısal özellik eklenmeden de kullanılabilir.
- Karakter formu açıkken **Ctrl+S** kısayolunun formdaki değişiklikleri kaydetmeden başarı bildirimi vermesi düzeltildi. Kısayol artık karakter formunu doğrulayıp kaydeder.
- Geçersiz veya tamamlanmamış sayı girişlerine alan üzerinde hata işareti ve açıklama eklendi. Aralık dışındaki ve ondalıklı değerlerin kaydedilmesi engellenir.

---

[v1.3.0]: https://github.com/ArviiSoft/booklean/releases/tag/v1.3.0
[v1.4.0]: https://github.com/ArviiSoft/booklean/releases/tag/v1.4.0
[v1.4.1]: https://github.com/ArviiSoft/booklean/releases/tag/v1.4.1
[v1.4.2]: https://github.com/ArviiSoft/booklean/releases/tag/v1.4.2