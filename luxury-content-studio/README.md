# Luxury Content Studio — Hebrew Instagram Carousel 01

A 5-slide Instagram carousel in Hebrew (RTL) for a luxury digital agency. It is built from HTML/CSS components and rendered to PNG with Playwright.

## Deliverables

| Path | What it is |
|---|---|
| `carousel-01/slide-01.png` … `slide-05.png` | Instagram-ready slides, **1080 × 1350 px** (4:5) |
| `carousel-01/carousel-preview.png` | All 5 slides in one strip, ordered right to left (slide 1 on the right) |
| `exports/slide-0X@2x.png` | High-resolution masters at **2160 × 2700 px** |
| `templates/` | Source files: tokens, components, slide content, local fonts |

## Slides
1. **Cover**: "העסק שלך / ראוי ל**יותר.**" ("יותר" in metallic gold), with the supporting question.
2. **The problem**: "הרושם הראשוני / מתחיל באינטרנט." with a browser shown mid-load.
3. **The issues**: "מה מונע מהאתר שלך להצליח?" with gold 01 / 02 / 03 and ivory items.
4. **The solution**: "הרבה יותר / מסתם אתר." with desktop and smartphone mockups of a premium website.
5. **Call to action**: "הגיע הזמן / להשאיר רושם." with a gold "בואו נדבר." button.

## Design system
- Colors: Black `#090909`, Metallic Gold `#C9A45C` (with a metallic gradient), Ivory `#F4F0E8`, Charcoal `#292929`.
- Fonts: **Frank Ruhl Libre** for Hebrew display headlines, **Heebo** for body text (Assistant is a fallback). The fonts are stored locally in `templates/fonts/`, so rendering does not depend on the network.
- Layout: `direction: rtl; text-align: right` on the whole document, 100 px side margins, and the same top bar, counter, progress bar and swipe hint on every slide. Body copy uses `text-wrap: balance` so a line never ends with a single orphan word.

## Components (`templates/components.js`)
`frame` (background, grain, gold frame, brand, counter, progress, swipe hint) · `eyebrow` · `headline` · `body` · `separator` (gold diamond rule) · `numberedList` · `cta` · `desktopMockup` · `phoneMockup` · `skeletonBrowser`.

All copy is in `templates/slides.js`. To change the brand label, edit the `BRAND` constant there or replace the mark in `components.js`. No brand name was supplied, so the slides show a neutral Hebrew label, "סטודיו לעיצוב דיגיטלי".

## Typography notes
- Hebrew text is live text in Hebrew fonts. It is never converted to images or reversed.
- Mixed-direction strings such as the `01 / 05` counter and the list numbers are wrapped in `dir=ltr` isolates, so the bidi algorithm cannot flip them.
- Punctuation (`.` `?` `,` `—`) sits at the end of each sentence in RTL, which is the left edge.
- The "next" arrows point left, the direction a Hebrew carousel moves forward.
- Before each screenshot, `render.js` loads Heebo and Frank Ruhl Libre and confirms they cover Hebrew glyphs. It aborts if a fallback font would be used.

## Render
```bash
cd luxury-content-studio
node render.js   # needs Playwright + Chromium
```
