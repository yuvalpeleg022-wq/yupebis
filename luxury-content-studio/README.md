# Luxury Content Studio — Hebrew Instagram Carousels

Hebrew (RTL) Instagram carousels for a luxury digital agency. They are built from shared HTML/CSS components and rendered to PNG with Playwright.

- **Carousel 01:** "העסק שלך ראוי ליותר." (5 slides)
- **Carousel 02:** "5 דברים שכל אתר עסקי חייב לכלול." (7 slides)

# Carousel 01

## Deliverables

| Path | What it is |
|---|---|
| `carousel-01/slide-01.png` … `slide-05.png` | Instagram-ready slides, **1080 × 1350 px** (4:5) |
| `carousel-01/carousel-preview.png` | All 5 slides in one strip, ordered right to left (slide 1 on the right) |
| `exports/carousel-01/slide-0X@2x.png` | High-resolution masters at **2160 × 2700 px** |
| `exports/carousel-01.zip` | ZIP of the Instagram-ready PNGs and preview |
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

All copy is in `templates/slides-01.js` and `templates/slides-02.js`. To change the brand label, edit the `BRAND` constant in each file or replace the mark in `components.js`. No brand name was supplied, so the slides show a neutral Hebrew label, "סטודיו לעיצוב דיגיטלי".

# Carousel 02 — five essential elements of a business website

| Path | What it is |
|---|---|
| `carousel-02/slide-01.png` … `slide-07.png` | Instagram-ready slides, **1080 × 1350 px** |
| `carousel-02/carousel-preview.png` | All 7 slides in one strip, right to left |
| `exports/carousel-02/slide-0X@2x.png` | 2160 × 2700 masters |
| `exports/carousel-02.zip` | ZIP of the Instagram-ready PNGs and preview |

It uses the same frame, colors, fonts and margins as Carousel 01. Each slide has its own composition:

1. **Cover:** "5 דברים / שכל אתר עסקי / חייב לכלול." with a gold 5 and a large outlined gold 5 in the background.
2. **01 — הרושם הראשוני.** The "אורה" homepage on a desktop monitor, on a desk in a dark studio lit by a warm lamp glow.
3. **02 — התאמה לנייד.** A large smartphone showing a responsive page (navigation, hero, button, list of services) beside a column of copy.
4. **03 — מסר ברור.** The three questions as a numbered gold list. Each number matches a callout on the hero-section mockup: the offer (1), who it is for (2), and how to make contact (3).
5. **04 — מהירות ונוחות.** A thin gold speed gauge above the copy, with "מהירה / ברורה / נוחה" as icon tiles.
6. **05 — הנעה לפעולה.** The three paths as chips, above a website contact section with a form and a gold button.
7. **Final CTA:** a centered gold headline, five gold diamonds for the five conditions, a save (bookmark) prompt, and the "שלחו לנו הודעה." button.

Components added (in `components.js`): `stepHeadline`, `monitorMockup`, `phoneSite`, `marker` / `markerList`, `clearHero`, `gauge`, `iconRow`, `chips`, `contactSection`. `siteDesktop` was split out of `desktopMockup` so the browser window and the monitor can share it.

## Typography notes
- Hebrew text is live text in Hebrew fonts. It is never converted to images or reversed.
- Mixed-direction strings such as the `01 / 05` counter and the list numbers are wrapped in `dir=ltr` isolates, so the bidi algorithm cannot flip them.
- Punctuation (`.` `?` `,` `—`) sits at the end of each sentence in RTL, which is the left edge.
- The "next" arrows point left, the direction a Hebrew carousel moves forward.
- Before each screenshot, `render.js` loads Heebo and Frank Ruhl Libre and confirms they cover Hebrew glyphs. It aborts if a fallback font would be used.

## Render
```bash
cd luxury-content-studio
node render.js 01   # Carousel 01
node render.js 02   # Carousel 02
```
For each carousel the script writes the 1080×1350 slides, the preview strip, the @2x masters and the ZIP. Before each screenshot it checks that the Hebrew fonts are loaded, and it reports any text that runs off the canvas.
