# Tower animation assets

Generated with the built-in image_gen tool, transparent_background=true, using the existing archer animation as a style reference. No external generation script or image editing was used.

| Unit | Asset | Layout | States |
| --- | --- | --- | --- |
| Archer | [archer/animation.png](archer/animation.png) | Existing 4 × 4 | Existing archer timing |
| Cannon team | [cannon-team/animation-v1.png](cannon-team/animation-v1.png) | 4 × 4 | Idle, loading, aiming, firing |
| cannon | [cannon/animation-v1.png](cannon/animation-v1.png) | 4 × 4 | Idle, preparation, aiming, firing |
| ice-archer | [ice-archer/animation-v1.png](ice-archer/animation-v1.png) | 4 × 4 | Idle, preparation, aiming, firing |
| catapult | [catapult/animation-v1.png](catapult/animation-v1.png) | 4 × 4 | Idle, preparation, aiming, firing |
| volley-archer | [volley-archer/animation-v1.png](volley-archer/animation-v1.png) | 4 × 4 | Idle, preparation, aiming, firing |
| drummer | [drummer/animation-v1.png](drummer/animation-v1.png) | 4 × 4 | Idle, sticks raised, right strike, left strike |
| archer-team | [archer-team/animation-v1.png](archer-team/animation-v1.png) | 4 × 4 | Idle, preparation, aiming, firing |

New sheets use four columns: front-right, front-left, back-left, back-right. Rows are the four states listed above. All assets have transparent backgrounds. Attack animations follow server firing events; drummer strikes loop while supporting a unit. Card icons use the first idle frame.

Placement uses a world-aligned octagonal foundation covering the full logical tile. Visible sprite bounds are measured once per sheet, including sheets with fractional cell dimensions. The entire visible rectangle fits inside the projected octagon with 8% padding, including its sloping edges. Facing anchors and feet stay fixed through animation; the feet sit toward the front of the foundation. Theme settings `towers.placement` control `footprint`, `padding`, `spriteWidth`, `soulHeight`, and `towerHeight`; an individual animation can override its desired `height`, subject to the tile containment limit.

Theme mapping: `wwwroot/board/themes/seljuk.js`. Frame selection: `wwwroot/board/towers/animation.js`. Run `Build-BoardAssets.ps1` after edits. The published server requires new sprite sheets to be embedded into the assembled page.

## cannon

Saved asset: `cannon/animation-v1.png`

Exact image_gen prompt:

```text
Use case: stylized-concept. Asset type: production animated unit sprite sheet for Crusader Defender. Use attached Seljuk archer sheet ONLY as style reference: ivory robes with colored scarf and embroidered panels, pointed steel helmet, warm leather boots, crisp painterly cartoon fantasy strategy game art with fine dark outlines. Create ONE transparent square PNG, exactly FOUR columns by FOUR rows, 16 equal square cells. Columns: front-right, front-left, back-left, back-right. Every frame is a genuine 3/4 view, not a flat rotation. Same unit identity and scale in all 16 frames. Feet and weapon chassis anchored on the identical baseline at 88% cell height. Keep every complete sprite inside its cell with 12% transparent margin; no overlap or clipping. No platform, no walls, no ground, no text, no labels, no grid lines. True alpha transparency. Subject: ONE red-scarfed Seljuk artilleryman standing beside a compact brass-and-dark-iron cannon on a small wooden wheeled carriage. Exactly one human operator per frame, with crimson embroidered robe panels. The cannon and gunner must remain complete, proportionally sized. Rows: 1 idle gunner with cannon ready, 2 loading a cannonball and priming, 3 leaning to aim with braced stance, 4 firing a small muzzle flash with slight barrel recoil and braced hands. Muzzle must face the column direction.
```

## ice-archer

Saved asset: `ice-archer/animation-v1.png`

Exact image_gen prompt:

```text
Use case: stylized-concept. Asset type: production animated unit sprite sheet for Crusader Defender. Use attached Seljuk archer sheet ONLY as style reference: ivory robes with colored scarf and embroidered panels, pointed steel helmet, warm leather boots, crisp painterly cartoon fantasy strategy game art with fine dark outlines. Create ONE transparent square PNG, exactly FOUR columns by FOUR rows, 16 equal square cells. Columns: front-right, front-left, back-left, back-right. Every frame is a genuine 3/4 view, not a flat rotation. Same unit identity and scale in all 16 frames. Feet and weapon chassis anchored on the identical baseline at 88% cell height. Keep every complete sprite inside its cell with 12% transparent margin; no overlap or clipping. No platform, no walls, no ground, no text, no labels, no grid lines. True alpha transparency. Subject: ONE blue-scarfed Seljuk ice archer, royal blue embroidered panels on ivory robe, curved golden bow with a pale blue frosted tip and icy glowing arrowhead. Exactly one archer per frame. Rows: 1 bow relaxed with arrow lowered, 2 drawing bowstring halfway, 3 aiming fully drawn toward column direction, 4 releasing arrow with relaxed string and a restrained cyan spark at bow. Cold glow is small and stays inside frame.
```

## catapult

Saved asset: `catapult/animation-v1.png`

Exact image_gen prompt:

```text
Use case: stylized-concept. Asset type: production animated unit sprite sheet for Crusader Defender. Use attached Seljuk archer sheet ONLY as style reference: ivory robes with colored scarf and embroidered panels, pointed steel helmet, warm leather boots, crisp painterly cartoon fantasy strategy game art with fine dark outlines. Create ONE transparent square PNG, exactly FOUR columns by FOUR rows, 16 equal square cells. Columns: front-right, front-left, back-left, back-right. Every frame is a genuine 3/4 view, not a flat rotation. Same unit identity and scale in all 16 frames. Feet and weapon chassis anchored on the identical baseline at 88% cell height. Keep every complete sprite inside its cell with 12% transparent margin; no overlap or clipping. No platform, no walls, no ground, no text, no labels, no grid lines. True alpha transparency. Subject: ONE dark-violet-scarfed Seljuk catapult operator in ivory robe with black-purple panels, standing next to a compact complete wooden trebuchet-like catapult with a single throwing arm, rounded stone in spoon and wooden wheeled chassis. Exactly one human per frame. Rows: 1 arm at rest, 2 winding arm down and loading a stone, 3 loaded arm pulled back ready to release, 4 releasing with arm raised forward and small violet magical highlight, NOT a large flying projectile. Throwing arm points toward column direction; chassis remains anchored. Keep the entire weapon within every cell.
```

## volley-archer

Saved asset: `volley-archer/animation-v1.png`

Exact image_gen prompt:

```text
undefined Subject: ONE Seljuk volley archer, bright magenta-purple scarf and ivory robe with magenta embroidered panels, golden recurved bow and a three-arrow cluster held together. Exactly one archer per cell. Rows: 1 idle lowered bow, 2 drawing three arrows halfway, 3 full draw aiming toward column direction, 4 releasing a three-arrow volley with relaxed string and a very small magenta spark. Keep all three arrow shafts contained in the cell, don't add long flying arrows outside.
```

## drummer

Saved asset: `drummer/animation-v1.png`

Exact image_gen prompt:

```text
undefined Subject: ONE Seljuk mehter drummer in deep green scarf and green embroidered ivory robe, wearing pointed steel helmet, carrying a large waist-mounted round brass-rimmed leather drum and holding two curved wooden drumsticks. Exactly one human per cell. Rows: 1 idle drumsticks resting, 2 sticks raised preparing rhythm, 3 right stick striking drum while left raised, 4 left stick striking while right raised with small green rhythmic spark. There is no bow and no cannon. Keep drum and both sticks complete in each cell; body orientation matches column direction.
```

## archer-team

Saved asset: `archer-team/animation-v1.png`

Exact image_gen prompt:

```text
undefined Subject: ONE three-person Seljuk archer team per cell, three consistent characters wearing WHITE/IVORY, MAGENTA/PURPLE, and DARK VIOLET/BLACK scarves respectively, pointed steel helmets and embroidered ivory robes with matching accents. The three archers stand tightly together in a staggered compact group, each with a golden recurved bow. Exactly THREE humans per cell in EVERY frame, never one, never four. Rows: 1 all bows lowered ready, 2 coordinated half draw, 3 coordinated full draw aiming in column direction, 4 synchronized arrow release. No castle or walls or platform. Scarf colors readable; don't merge characters. All three feet have a planted common ground baseline; consistent group size and clean transparent gutters.
```
