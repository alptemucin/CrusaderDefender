# Board asset düzeni

Çizim kodları ve görseller üç bağımsız grupta tutulur:

| Grup | Çizim kodu | Görseller ve üretim listesi |
| --- | --- | --- |
| Terrain | `terrain/renderer.js` | `../assets/terrain/<tema>/` |
| Kule / ruh | `towers/renderer.js` | `../assets/towers/<tema>/<birlik>/` |
| Düşman | `enemies/renderer.js` | `../assets/enemies/<tema>/<birlik>/` |

Her gruptaki `catalog.json` mevcut görselleri, Canvas yedeklerini ve gelecekte üretilecek dosyaları listeler. `futureFile` ve `futureDirectory` henüz hazır görsel olduğunu ifade etmez. Çalışan oyunun tema tanımları `themes/` altında bulunur; kataloglar sanat üretimi envanteridir.

## Tema ve giydirme

`themes/seljuk.js` varsayılan tema; `themes/winter.js` farklı zemin, taş, kask ve kıyafet renkleri kullanan örnektir. Kış teması mevcut okçu ve topçu PNG'lerini paylaşır; PNG'lerin kıyafetleri paletle değişmez. Farklı giydirmeler için tema tanımındaki `towers.images` görsellerini değiştirmek gerekir.

Tarayıcı konsolunda `CrusaderAssets.setTheme('winter')` veya `CrusaderAssets.setTheme('seljuk')` temayı oyun durumunu değiştirmeden günceller. `CrusaderAssets.listThemes()` kayıtlı temaları verir. Canvas çizimleri `theme.terrain`, `theme.towers.appearance`, `theme.enemies.appearance` değerlerini okur. Ruhun işlev rengi sunucudan gelir ve temalar arasında korunur.

Yeni tema için kategori ayarlarını, görsel eşlemelerini ve birlik kimliklerini içeren bir dosya oluşturup `CrusaderAssets.registerTheme(...)` ile kaydedin. Dosyayı `Build-BoardAssets.ps1` kaynak listesine ekleyin. Sprite çerçeveleri şu an okçunun mevcut 4×4 düzenini kullanır; başka animasyon düzenleri için kule çizim modülünde yeni çerçeve seçici eklenmelidir. Düşman ve terrain PNG çizimleri için ilgili kategori renderer'ını genişletin.

## Görsel standardı

- Terrain: izometrik karo ölçüsüne uygun zemin, duvar, yükseltilmiş duvar, kapı ve platform.
- Kuleler: `idle.png`, varsa `animation.png`; ayak/platform hizası sabit, şeffaf arka plan. Tekli birlikler ve ekipler ayrı kimliklerdir.
- Düşmanlar: tür başına klasör, sabit ayak hizası, şeffaf arka plan; hareket ve hasar sunucuda kalır.
- Tema değişiklikleri siluet, malzeme, kıyafet ve görsel seçimini etkiler; hasar, menzil, yol bulma ve ruh renk kodlarını değiştirmez.

## Debug paketini güncelleme

Bu klasörde kaynak `.csproj` bulunmuyor. Yayımlanmış sunucunun mevcut görsel URL'leri korunur; kategori klasörlerindeki PNG'ler hazırlama sırasında bu adreslerin dosyalarına kopyalanır. Okçu için eski URL'ler uyumluluk kopyalarıdır; düzenlenecek asıl dosyalar `assets/towers/seljuk/archer/` altındadır.

Kök klasörde çalıştırın:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-BoardAssets.ps1
```

Komut kategori dosyalarını ve `game.js` dosyasını HTML içindeki oyun scriptine birleştirir. HTML'deki üretilmiş scripti elle değiştirmeyin. Sayfayı yenilemek kod değişikliklerini yükler. Görsel dosyaları değişirse yayımlanmış statik dosya önbelleği için sunucuyu yeniden başlatıp tarayıcı önbelleğini yenileyin.

Topçu Burcu `cannon-team/animation-v1.png` dosyasındaki 4×4 animasyonu kullanır. Yön ve hazır/doldurma/nişan/ateş seçimi `towers/animation.js` içindedir. Ateş animasyonu sunucunun saldırı olayından tetiklenir. `embedded:true` tanımlı yeni görseller, mevcut Debug sunucusunda yeni statik rota gerektirmemek için HTML paketine gömülür.

Sekiz birlik türünün tamamında animasyon asseti vardır. Yeni altı sayfa dört yön ve dört hareket aşaması içerir; mehterci destek verdiği sürece davul çalar. Kule kartları sayfanın ilk hazır karesini gösterir. Dosya listesi ve üretim promptları: [ANIMATION-ASSETS.md](../assets/towers/seljuk/ANIMATION-ASSETS.md). Yeni giydirmelerde tema içindeki `animation` eşlemesini ve `columns`, `rows`, `height`, `mode` ayarlarını kullanın.

Kule tabanları oyun karolarıyla aynı izometrik dönüşümde çizilir ve hücre alanının tamamını kaplar. `towers.placement` taban ölçüsünü, kenar boşluğunu ve görünür sprite genişliği/yüksekliğini yönetir. Sprite atlaslarının şeffaf boşlukları ölçülür; karakter gövdesi karo üzerinde yükselir ve görünür genişlik/yüksekliğe göre ölçeklenir. Hareket kareleri ayak hizasını korur; ayaklar tabanın ön tarafına yerleşir. Tarayıcı kontrolü sekiz birlik türündeki 128 yön/hareket kombinasyonunun okunabilir boyutta olduğunu ve ayak merkezinin karo içinde kaldığını doğrular.

`terrain/geometry.js` sekizgen zemin çizimini ve çevre yerleşimini yönetir. Sekizgen görünüm mevcut hücre merkezlerini kullanır; sunucunun yol bulma ve komşuluk kuralları korunur. Ağaçlar harita sınırından 2–5, dağlar 7–10 karo uzaklığa sık yerleştirilir. Her çevre görseli bir karo boyutundadır; aday yoğunluğu ağaçlarda %78, dağlarda %88 olur. Dağ kuşağının dışındaki alan koyu renkle kaplanır. Atlaslar `assets/terrain/seljuk/trees-atlas-v1.png` ve `mountains-atlas-v1.png` dosyalarındadır. Sprite'ın şeffaf kenarları dışındaki görünür sınırları ölçülür. Haritaya değen sprite tamamen kaldırılır; ağaç veya başka dağla çakışan dağ da kaldırılır. Kırpılmış görseller kullanılmaz. Harita sınırı sarı çizgiyle gösterilir; tema tanımındaki `terrain.boundary` ile rengi değiştirilebilir. Çevre görselleri `terrain.environment` ile değiştirilebilir.

Kale kapısı: assets/terrain/seljuk/castle-gate-v2.png, şeffaf imagegen asseti. Üretim promptu aynı klasörde CASTLE-GATE-2D-PROMPT.md dosyasındadır. Giriş, çıkış ve ara kapılar bu asseti kullanır; renkli eşik ve numara korunur. İzometrik duvarlarda şaşırtmalı taş sıraları, açık kenarlar, harç aralıkları ve üst yüzey çatlakları çizilir.

Duvarlar karo genişliğinin %62 oranında çizilir; oyuncu duvarlarının yüksekliği 1, çatılı varsayılan duvarların yüksekliği 2 olur. Kale kapısına uyumlu sıcak kireçtaşı paleti, iri yüzey lekeleri ve açık taş kenarları kullanılır.

Düşmanlar: piyade, ağır şövalye, sancaktar, keşifçi ve kuşatma arabası için assets/enemies/seljuk altında şeffaf 4x4 walk-v1.png atlasları bulunur. Dört yön ve dört yürüyüş/tekerlek karesi hareket mesafesine bağlıdır; duran düşmanın animasyonu da durur. Ayak hizası alfa sınırlarından hesaplanır; can çubuğu ve durum halkaları korunur. Üretim promptları assets/enemies/seljuk/ANIMATION-ASSETS.md dosyasındadır.

63x63 harita içindeki arazi ve atış kuralları Source/README.md dosyasında açıklanır. Su ve köprü promptları assets/terrain/seljuk/WATER-BRIDGE-PROMPTS.md dosyasındadır.
