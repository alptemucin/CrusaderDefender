# CrusaderDefender — ASP.NET Core

## Seviye kuralları

- Aynı renk ve seviyedeki iki ruh, seçilen karoda bir seviye yüksek ruh olur. Diğer birlik duvara dönüşür.
- Aynı tür ve seviyedeki iki RBG veya iki WPD burcu da aynı şekilde birleşir. Ruh ile burç veya RBG ile WPD birleşmez.
- RBG tarifi kırmızı, mavi ve yeşil; WPD tarifi beyaz, mor-pembe ve siyah-mor ruh gerektirir. Kurulan burcun seviyesi üç malzemenin en düşük seviyesidir.
- Birleştirme inşa, birlik seçimi ve duvar seçimi sırasında yapılır; hazır ve savaş aşamalarında yapılamaz. Önceki turlardaki birlikler de kullanılabilir. Yeni tur malzemesi kullanılan birleşmede kalan birlik tutulmuş, tüketilen malzeme duvar sayılır; iki yeni duvar kotası tamamlanınca savunma hazır olur.
- En yüksek seviye 6'dır. Seviye 1–6 vuruş hasarı çarpanları: 1, 2,4, 5, 10, 20, 40. Seviye atış aralığını ve menzili değiştirmez.
- Mavi ruhun yavaşlatması her seviyede 5 yüzde puan artar. Zırh kırma ve yeşil destek seviye ile çarpılır; çoklu hedef sayısı her seviyede bir artar. WPD zırh kırması da seviye ile artar; RBG alan yarıçapı sabittir.

Tekli birlikler renkli giysili insan figürleri, RBG/WPD burçları üç kişilik ekipler olarak çizilir. Listeden veya tahtadan seçim iki yerde de vurgulanır; inceleme bilgileri seçilen kule kartının altında açılır. Seçimi bırak düğmesi veya Escape paneli kapatır.

Tahta izometrik elmas görünümde çizilir. Duvarlar üst ve yan yüzleri olan taş bloklardır; birlikler ve düşmanlar derinlik sırasına göre çizilir. Beyaz okçu ve RBG burcu onaylanan şeffaf PNG görsellerini kullanır; diğer birlikler mevcut çizimleriyle dik görünür. Duvarların taş üst yüzeyleri/yan gölgeleri ile kulelerin kısa platformları yükseklik hissi verir. Selçuklu teması ve Haçlı birlikleri korunur; tabanlar daha açık, yüzeyler sade tutulur. Fare tekerleği imlecin altındaki noktaya sabitlenerek %65–%300 yakınlaştırır/uzaklaştırır. Shift + sürükleme veya orta fare tuşuyla sürükleme haritayı kaydırır; **Görünümü sıfırla** kamerayı başlangıca döndürür. Karo seçimi kamera dönüşümünün tersiyle hesaplanır; zoom ve kaydırma oyunun durumunu değiştirmez.

Aktif tema **Selçuklu Hisarı**: Anadolu Selçuklu döneminden esinlenen surlar ve kemerli geçitler, düşük kontrastlı açık adaçayı tonlarında, çerçevesiz tahta, canlı turkuaz/altın arayüz. Tahtada sekizgen/yıldız süslemeleri yoktur; oyuncunun oluşturduğu duvarların tüm yüzeyi ruh rengine boyanır. Varsayılan duvarlar gri taş bloklardan oluşur. Yükseltilmiş duvarlar daha kalın üst yüzey ve üç sıra taşla ayrılır. Köşeli kapılar sade gri çerçeve, koyu geçit ve ince renkli vurguyla çizilir. Savunma birlikleri sade kare platformlarda, renkli giysiler ve top, yay, mancınık veya davulla çizilmiş insan figürleriyle görünür. RBG ve WPD burçları üç kişilik ekiplerdir. Her birliğin kartında seviyesi ve destek hızını içeren güncel ham hasar/sn değeri bulunur. Kule kartının altında açılan İncele paneli vuruş hasarını, atış aralığını, menzili, desteği, özel etkileri ve dalga hasarını gösterir; birliğe veya kartına tıklayarak seçim sabitlenebilir. Ham hasar/sn, düşman direncini ve çoklu/alan vuruşlarını içermez. Tur ve inşa alanı tahtanın altındadır; dalga bilgisi sağ menüdedir. Can/düşman sayısı tahtanın sol üstünde, hız ve simgeli görünüm sıfırlama kontrolleri sağ üstündedir. Ruh koy alanında beş gizli ruh soru işaretiyle, açılan birlikler yan yana karakter simgeleriyle görünür. Kule listesinde tahtadaki çizimler kullanılır; konum yalnızca parantez içinde gösterilir. Tüm yazılar IBM Plex Sans font ailesini kullanır; genel arayüz koyu antrasittir. Renkler ve küçük ruh şekilleri korunur: kırmızı topçu, mavi buz okçusu, siyah-mor mancınıkçı, beyaz okçu, mor-pembe yaylım okçusu, yeşil mehterci. RBG, Topçu Burcu; WPD, Okçu Burcu olarak görünür. Düşmanlar miğferli, haçlı kalkanlı piyadeler/şövalyeler, sancaktarlar, keşifçiler ve kuşatma arabaları şeklinde çizilir. Tema fantastik bir savunma oyunu için hazırlanmıştır.

Animasyonlar `requestAnimationFrame` ile ekranın yenileme hızında çizilir. `wwwroot/motion.js`, sunucunun saat damgalı durumlarını 120 ms tamponla gerçek yol boyunca birleştirir; köşelerde duvarları kesmez ve bağlantı kesildiğinde son bilinen konumda durur. Yürüyüş adımları gidilen mesafeye bağlanır; yön değişimi, gövde salınımı, dalgalanan sancaklar ve dönen kuşatma tekerlekleri vardır. Silahlar hedefe yumuşak döner; toplar geri teper, yaylar gerilir. Sunucunun kimlikli saldırı olayları ok/top mermisi, mancınık yayı ve vuruş parçacıkları olarak gösterilir. Animasyonlar hasar hesabını değiştirmez.

Çizimler HTML/CSS ve Canvas ile oluşturulur; harici görsel dosyası gerekmez. Arayüz renkleri `Labirent-TD.html` içindeki CSS değişkenlerinde; harita/birlik görselleri `wwwroot/game.js` içindeki `THEME`, `drawFloor`, `drawWall`, `drawGate`, `drawTower`, `drawWeapon`, `drawSoul`, `drawCrusader` ve `drawShots` bölümlerindedir. Dalga adları ve burç adları `GameRules.cs` içindedir. Proje/HTML dosya adları mevcut çalıştırma komutlarını korumak için aynıdır; oyunun ekran ve sekme adı CrusaderDefender'dır.

Sanat referansı: [The Met — Anadolu Selçuklu dönemi sanatı](https://www.metmuseum.org/es/essays/the-art-of-the-seljuq-period-in-anatolia-1081-1307).

.NET 10 SDK ile PowerShell üzerinden çalıştırın:

```powershell
cd LabirentTd.Web
dotnet run --urls http://localhost:5080
```

Tarayıcıda http://localhost:5080 adresini açın. Durdurmak için Ctrl+C.

HTML ve JavaScript dosyaları derlenirken kopyalanır; değişikliklerinden sonra uygulamayı yeniden başlatın. HTML dosyasını doğrudan açmak yerine sunucu adresini kullanın.

Harita üretimi, BFS yol bulma, ruh yerleştirme/açma/tutma, kaya yükseltme/kaldırma, birleştirme, RBG/WPD tarifleri, yeşil destek hedefleri, 15 dalga, düşman hareketi, hasar ve sonuç hesabı C# tarafında çalışır. `GameRules.cs` oyun değerlerini, `MapGenerator.cs` harita/yol kurallarını, `GameEngine.cs` oyun mantığını, `GameSessions.cs` oturumları ve sunucu saatini yönetir.

Tarayıcıdaki `wwwroot/game.js` yalnızca Canvas çizimi, paneller, kullanıcı girdisi ve HTTP iletişimini yönetir. Hasarı veya zamanı hesaplamaz. Sunucu 50 ms aralıkla çalışır; savaş adımları en fazla 20 ms olur. 1×/2×/4× hızı sunucu uygular. Tarayıcı savaşta yaklaşık 75 ms, inşa sırasında 250 ms aralıkla durum alır. Her hamlede aşama, malzeme, koordinat ve durum sürümü doğrulanır.

Oyun oturumu HttpOnly çerezle ayrılır. Aynı tarayıcıdaki sekmeler aynı oyunu paylaşır; farklı tarayıcılar ayrı oyunlar oynar. Sayfa yenileme oyunu korur ve dalga tarayıcı kapalıyken de sunucuda ilerler. 30 dakika istek alınmayan oturum silinir. Sunucu yeniden başlatılırsa devam eden oyunlar sıfırlanır; biten sonuçlar `App_Data/results.json` dosyasında kalır. Son 20 sonuç arayüzde gösterilir, en fazla 1000 kayıt saklanır. Sonuçları yalnızca sunucu yazar; eski `POST /api/results` kaldırıldı.

API:

- `POST /api/game`: oturumu oluşturur veya mevcut oyuna bağlanır.
- `GET /api/game`: harita, durum ve arayüz için kuralları döndürür; oturum yoksa 410.
- `POST /api/game/commands`: `action` ve `revision` içeren hamle. Geçersiz hamle 409 döndürür.
- `GET /api/results`: son 20 tamamlanmış oyun.
- `GET /api/health`: sunucu kontrolü.

Örnek hamle: `{"action":"tile","x":7,"y":7,"revision":0}`. İşlemler: `tile`, `keep`, `rock`, `merge`, `craft`, `pick`, `cancelPick`, `tool`, `speed`, `start`, `again`, `new`.

Bu sürüm tek sunuculu bir uygulamadır; oturumlar bellekte, oyun geçmişi ortak JSON dosyasında tutulur. Kullanıcı hesapları, çok sunuculu dağıtım ve uzun süreli oyun kaydı için kimlik doğrulama ve veritabanı eklenebilir.

Motor testleri (proje kökünden):

```powershell
dotnet run --project LabirentTd.Tests
```

Sunucu açıkken HTTP kontrolleri (ayrı test oturumlarında oynar):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File LabirentTd.Tests/http-smoke.ps1
node LabirentTd.Tests/client-smoke.cjs
node LabirentTd.Tests/motion.test.cjs
```

Testler harita mesafelerini/ateş hatlarını, yolu kapatma reddini, kaya zıplamalarını, aşama geçişlerini, birleştirmeyi, iki tarifi, renklerin hasar/etki hesaplarını, yeşil destekleri, yenilgiyi ve 15 dalgalık zaferi kapsar. HTTP testi oturum ayrımını, eski durum reddini, inşayı, istemcinin sonuç yazamamasını ve sunucu saatiyle ilerlemeyi kontrol eder. Node.js istemci testi DOM/Canvas taklitleri ile gerçek API yanıtlarını kullanır; görsel tarayıcı testi değildir.

Yayın klasörü oluşturma:

```powershell
dotnet publish -c Release -o bin/publish
cd bin/publish
dotnet LabirentTd.Web.dll --urls http://localhost:5080
```

Okçu animasyonu: wwwroot/assets/archer-animation-v1.png imagegen ile oluşturulan 4×4 şeffaf sprite sayfasıdır. Kaide sabittir; gövde hedefin izometrik ekran yönüne göre ön/arka ve sol/sağ duruşa geçer. Hazır, çekme, nişan ve bırakma kareleri gerçek atış olayları ve bekleme süresiyle seçilir. Sürekli resim döndürme kaldırılmıştır. Diğer ruhlar ve WPD burcu yeniden etkinleştirilmiştir; mevcut Canvas çizimleri ve kart simgeleri kullanılır.

## Debug ve Release dışa aktarma

Proje kökünde Export-Game.ps1 çalıştırılır. output/exports altında zaman damgalı Debug ve Release klasörleri ve ayrı ZIP paketleri oluşur. Her pakette Start-Game.cmd bulunur. Hedef makinede ASP.NET Core Runtime 10 gerekir. Kişisel App_Data kayıtları dışa aktarılmaz.

## Güncel arazi kuralları
Harita artık 63x63 karedir. Dağlar 4x2 kare kaplar ve değiştirilemez. Ağaçlar kaldırılamaz ve 3 yüksekliktedir. Su ve köprü üzerine kule konamaz; düşmanlar suyu kalıcı köprülerden geçer. Varsayılan çatılı duvarlar 2, oyuncu duvarları ve kuleler 1 yüksekliktedir. Kule ile altındaki duvarın toplam yüksekliği, atış hattındaki engelin yüksekliğini aşmalıdır. Engellenen menzil karoları kırmızı gösterilir.
Düzenlenebilir C# kaynakları Debug DLL'inden geri çıkarılmıştır ve Source klasöründedir. Derleme: powershell -File .\Build-Game.ps1. Kaynaklar, test komutları ve kurallar için Source/README.md dosyasına bakın. Su ve köprü assetlerinin üretim promptları wwwroot/assets/terrain/seljuk/WATER-BRIDGE-PROMPTS.md dosyasındadır. Eski sunucu ikililerinin yedeği .backup/pre-terrain klasöründedir.
