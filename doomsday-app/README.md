# מארוול גיקים · הנוקמים: דומסדיי

אתר מעריצים בעברית (RTL), שנבנה עם React, TypeScript, Tailwind CSS 4 ומבנה shadcn/ui.

## פקודות

```bash
cd doomsday-app
npm install        # התקנת התלויות
npm run dev        # שרת פיתוח
npm run typecheck  # בדיקת טיפוסים
npm run build      # בנייה לתיקייה ../avengers-doomsday
```

התוצר הבנוי נשמר בריפו בתיקייה `avengers-doomsday/`, כך ש-GitHub Pages ו-Netlify מגישים אותו כאתר סטטי. אחרי כל שינוי צריך להריץ `npm run build` ולשמור גם את התוצר. ב-Netlify, פרויקט ששמו מכיל "doomsday" מפרסם את התיקייה הזו (ראו `../netlify-build.sh`).

## מבנה

- `src/components/ui/`: רכיבים כלליים לשימוש חוזר בסגנון shadcn (button, badge, accordion, dialog, responsive-hero-banner). התיקייה שומרת על סדר ועל תאימות לכלי ה-CLI של shadcn (`components.json`).
- `src/components/`: רכיבי האתר (site-header, character-card, trailer-player, media-gallery, news-card, verification-badge, site-footer).
- `src/data/content.ts`: כל התוכן, עם מקור וסטטוס אימות לכל פריט. התוכן נפרד מהתצוגה.
- `src/types/content.ts`: הטיפוסים של התוכן.
- `src/index.css`: ערכת הנושא של Tailwind 4 (`@theme`), האנימציות וכלי העזר.

## נכסים חסרים

- תמונות השחקנים: לא נמצאו תמונות רשמיות שאפשר להשתמש בהן, ולכן מוצגות במקומן ראשי תיבות עם הכיתוב "התמונה תתווסף בקרוב".
- הפוסטר שפורסם עם הטריילר (Disney UK Press): המקור ידוע, אבל קובץ התמונה עוד לא הושג.
- פוסטר הדמות של דום ופריים הכפפה: התקבלו מהקהילה, ועמוד המקור הרשמי שלהם עוד לא אומת.
