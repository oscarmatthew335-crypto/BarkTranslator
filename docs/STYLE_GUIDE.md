# Pawlingo Kawaii Cartoon Style Guide

Extracted from the 5 reference frames for the Wardrobe ("Dress up") and Runner gameplay screens. All design tokens live in [`src/theme.js`](../src/theme.js).

---

## 1. Color Palette (Hex & RGBA)

### Surfaces, Text & Ink Outlines
| Token | Value | Usage |
| --- | --- | --- |
| `bg` | `#F2EFFC` | Soft lavender-white outer canvas & screen background |
| `paper` | `#FFFFFF` | Primary card, modal, and active tab surfaces |
| `tileBg` | `#F7F6FC` | Inactive item & colour grid tile surface |
| `tileActiveBg` | `#FFFDF2` | Selected item & colour tile warm tint |
| `tabInactive` | `#D3CFF0` | Periwinkle inactive folder tab fill |
| `tabIconMuted` | `#746E99` | Muted icon stroke/fill on inactive folder tabs |
| `ink` | `#241D3B` | Deep navy-indigo primary ink outlines & headline text |
| `shadow` | `#2D224C` | Hard 100%-opacity offset drop shadow under cards & buttons |
| `inkSoft` | `#6B5F8F` | Secondary captions & subtitles |
| `tileBorder` | `#D8D4EC` | Subtle unselected grid tile outline |
| `tileActiveBorder` | `#F5B82E` | Warm gold border for active wardrobe tile |

### Brand & Interactive Accents
| Token | Value | Usage |
| --- | --- | --- |
| `butter` / `gold` | `#FFC83B` | Primary CTA buttons, "+ Get treats" capsule, avatar ring (highlight `#FFE17D`, shade `#E09B18`) |
| `coral` / `tomato` | `#FF6B5B` | Circular close `✕` button, hazard/warning accents (highlight `#FF8E80`, shade `#D94A3A`) |
| `arcadeBlue` / `sky` | `#2EA8FF` | Primary circular arcade control button & square Pause button (highlight `#75CCFF`, shade `#1B72B8`) |
| `lime` / `mint` | `#58C942` | Runner progress bar fill, vertical meter, `+` gap badge (highlight `#85E06F`, shade `#3B9B28`) |
| `amber` | `#FF9F1C` | Combo multiplier text (`2x`, `3x`) |
| `pink` | `#FF5FA2` | Secondary accents & badges (soft inner ear `#FF9EBB`) |

### Runner HUD & Park / Scene Environment
| Token | Value | Usage |
| --- | --- | --- |
| `hudPill` | `rgba(68, 96, 122, 0.74)` | Translucent slate-blue HUD pills (score, best, treats, goal, gap) |
| `hudTrack` | `#2B324A` | Dark navy progress bar & vertical meter track |
| `hudCtrlMuted` | `rgba(92, 138, 158, 0.78)` | Muted circular directional controls (`>` / jump when secondary) |
| Sky top / horizon | `#8AD8F8` / `#D4F1FC` | Layered park sky with `#FFFFFF` clouds and `#E2F4FC` cloud undersides |
| Distant foliage | `#A5D6B8` / `#8CC4A7` | Far rolling hills and silhouette trees |
| Midground trees | `#77B843` / `#5E9E31` / `#4A8223` | Highlight, midtone, and deep canopy layers (`#7A4B2A` / `#5C361C` trunk) |
| Park props | `#C87D44` / `#9E5B28` (bench wood), `#3A3D45` (iron), `#8C9BAE` / `#6B7A8E` (bin) | Layered vector props |
| Path, turf & cutaway soil | `#F3DFAC` / `#E2C88B` (path), `#6EB83B` / `#4E8F25` (turf), `#6E5536` / `#574126` / `#5A532E` (soil) | Ground path & underground cutaway strip |

---

## 2. Border Radii (`R`)
| Token | Value | Usage |
| --- | --- | --- |
| `R.viewport` | `24` | Outer game / card viewport container |
| `R.modal` | `22` | Floating "Dress up" hero card & prominent offer cards |
| `R.tab` | `14` | Left vertical & bottom horizontal folder tabs |
| `R.tile` | `14` | Wardrobe grid tiles (colours & cosmetics) |
| `R.hudPill` | `16` | Translucent HUD status pills |
| `R.pauseBtn` | `11` | Square glossy Pause (`⏸`) button |
| `R.progress` | `7` | Progress bar track (`14px` height) |
| `R.pill` | `999` | Capsule CTAs ("Free on Google Play", "+ Get treats") & circular buttons (`36px` close, `54px` arcade controls) |

---

## 3. Borders & Hard Offset Shadows (`INK_WIDTH` & `S`)
- **Primary Ink Outline**: `2.5px` (`INK_WIDTH = 2.5`) solid `#241D3B` (`C.ink`).
- **Tile Outline**: `2px` solid `#D8D4EC` (`C.tileBorder`), switching to `2.5px` solid `#F5B82E` (`C.tileActiveBorder`) when active.
- **Hard Offset Shadow (`S.card`, `S.pill`)**: Offset `4px–5px` bottom-right (`#2D224C`), `shadowOpacity: 1`, `shadowRadius: 0`, crisp vector silhouette with zero blur.
- **Small Hard Offset (`S.small`)**: Offset `3px` bottom-right (`#2D224C`).
- **Glossy 3D Button Bevel**: Subtle inner top highlight highlight band (`rgba(255,255,255,0.45)`) + inner bottom shade border (`rgba(0,0,0,0.18)`) inside golden, coral, lime, and blue buttons.

---

## 4. Typography (`F` & `T`)
Primary font family: **Fredoka** (`Fredoka_400Regular`, `Fredoka_500Medium`, `Fredoka_600SemiBold`, `Fredoka_700Bold`).

| Style | Font | Size / Line Height | Color | Usage |
| --- | --- | --- | --- | --- |
| Display / Screen Title | `Fredoka_700Bold` | `28–30px` / `34px` | `#241D3B` | Top screen titles ("Can your cat outrun the dog?", Hub title) |
| Modal Title | `Fredoka_700Bold` | `18px` / `22px` | `#241D3B` | "Dress up {Pet}" card title |
| Primary CTA | `Fredoka_700Bold` | `17px` / `22px` | `#241D3B` | Full-width golden pills |
| Small Pill CTA | `Fredoka_700Bold` | `13px` / `18px` | `#241D3B` | "+ Get treats", small actions |
| HUD Telemetry | `Fredoka_700Bold` | `13–15px` / `18px` | `#FFFFFF` | Score, Best, Treats, Goal counter (`tabular-nums`) |
| Multiplier Badge | `Fredoka_700Bold` | `16px` / `20px` | `#FF9F1C` | `2x`, `3x` multiplier callout |
| Tile Caption | `Fredoka_600SemiBold` | `12px` / `15px` | `#241D3B` | Colour & item labels inside tiles |

---

## 5. Layout & Spacing (`SP`)
- **Screen horizontal padding**: `16px` (`SP.screenX`).
- **Card / Modal inner padding**: `16px` (`SP.cardPad`).
- **Wardrobe hero pet preview**: `148px`.
- **Left vertical folder tabs**: `width: 42px`, `height: 38px`, `gap: 6px`, tucked flush against the hero card's left edge (`marginRight: -2.5px`).
- **Bottom horizontal folder tabs**: `height: 40px`, `gap: 6px`, sitting flush above the white item tray (`marginBottom: -2.5px`).
- **Wardrobe grid**: `gap: 8px`, rounded `68×78` tiles with `14px` radius.
- **Runner HUD**: Overlaid `position: 'absolute'`, `top: 8px`, `left: 10px`, `right: 10px`, `gap: 6px`.
- **Runner circular controls**: Overlaid `position: 'absolute'`, `bottom: 12px`, `paddingHorizontal: 16px`; left duck/slow + forward cluster (`gap: 12px`), right jump button (`54×54` circles).
