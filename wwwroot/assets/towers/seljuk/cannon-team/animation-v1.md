# Topçu Burcu animasyonu v1

- Araç: yerleşik Imagegen.
- Dosya: `animation-v1.png`; şeffaf 4×4 sprite sayfası.
- Sütunlar: ön sağ, ön sol, arka sol, arka sağ.
- Satırlar: hazır, doldurma, nişan, ateş.
- Referanslar: mevcut `idle.png` ve okçunun `animation.png` görselleri.
- Mevcut bekleme/kart görseli korunur; yeni animasyon tahtada kullanılır.

## Kullanılan üretim promptu

Use case: stylized-concept. Create a production game sprite sheet for the Seljuk cannon-team tower matching the attached references. Image 1 is the identity reference: three Seljuk artillery crew in RED, BLUE and GREEN scarves, ivory robes, pointed metal helmets, brass and dark iron cannon on wooden wheeled carriage. Image 2 is the style and grid reference. Output ONE square transparent PNG sprite sheet with exactly 4 columns by 4 rows, sixteen equal square cells. NO background, NO platform, NO stone walls, NO text, NO grid lines. Every cell contains the same complete cannon and all three crew, consistently scaled and centered, feet and wheels fixed at the same baseline with 12% padding inside cell. Columns are facing directions: column 1 front-right (muzzle points down-right), column 2 front-left (muzzle down-left), column 3 back-left (muzzle up-left), column 4 back-right (muzzle up-right). Maintain actual distinct 3/4 facing views, no rotation of a flat image. Rows animation: row 1 idle ready crew; row 2 loading cannonball and ramrod preparing; row 3 aiming primed artillery crew braced to fire; row 4 firing with small bright muzzle flame, cannon barrel recoils slightly and crew brace. Keep cannon chassis and crew foot positions anchored across rows, subtle poses only. Preserve three crew colors and exact shared identity in EVERY cell. Crisp hand-painted fantasy strategy game art, dark fine outlines, warm brass, ivory cloth, detailed but legible at small size, matching archer illustration. Each subject fully contained within its own cell, generous transparent gutters, no overlap. Genuine alpha transparency.
