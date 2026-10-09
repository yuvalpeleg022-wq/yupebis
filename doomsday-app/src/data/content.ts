import type { Character, FaqItem, FilmInfo, GalleryImage, NavLink, NewsItem, SourceLink, Trailer } from "@/types/content"

/** Date of the last manual content review. The site has no live data feed. */
export const LAST_REVIEWED = "2026-10-09"

// ===== Sources (all found during the content review; nothing invented) =====
const S = {
  movie: { label: "Marvel.com · עמוד הסרט", url: "https://www.marvel.com/movies/avengers-doomsday" },
  production: { label: "Marvel.com · תחילת הצילומים והצוות", url: "https://www.marvel.com/articles/movies/marvel-studios-avengers-doomsday-begins-production" },
  teasers: { label: "Marvel.com · הטיזרים", url: "https://www.marvel.com/articles/movies/avengers-doomsday-teaser-trailer" },
  trailer: { label: "Marvel.com · הטריילר וכרטיסי Infinity Vision", url: "https://www.marvel.com/articles/movies/avengers-doomsday-trailer-infinity-vision-tickets" },
  secretWars: { label: "Marvel.com · מלחמות סודיות", url: "https://www.marvel.com/movies/avengers-secret-wars" },
  synopsis: { label: "Infinity Vision · התקציר הרשמי", url: "https://www.infinityvisiontickets.com/avengers-doomsday-synopsis/" },
  disneyPress: { label: "Disney UK Press", url: "https://press.disney.co.uk/news/marvel-studios-avengers-doomsday-debuts-new-trailer-and-poster" },
  sdcc: { label: "CBC", url: "https://www.cbc.ca/lite/story/1.7278090" },
  d23: { label: "ABC30", url: "https://abc30.com/post/new-avengers-doomsday-trailer-drops-d23-featuring-robert-downey-jr-more/19681468/" },
  jackman: { label: "Popverse", url: "https://www.thepopverse.com/movies-avengers-doomsday-deadpool-wolverine-ryan-reynolds-hugh-jackman/" },
  axios: { label: "Axios", url: "https://www.axios.com/2026/07/20/avengers-doomsday-trailer-marvel-infinity-vision" },
  castRumor: { label: "JoBlo", url: "https://www.joblo.com/avengers-doomsday-cast-rumor/" },
  marvelYoutube: { label: "YouTube · Marvel Entertainment", url: "https://www.youtube.com/@marvel" },
} satisfies Record<string, SourceLink>

export const SOURCES = S

export const NAV_LINKS: NavLink[] = [
  { label: "ראשי", href: "#top" },
  { label: "על הסרט", href: "#about" },
  { label: "דמויות", href: "#characters" },
  { label: "טריילרים", href: "#trailers" },
  { label: "גלריה", href: "#gallery" },
  { label: "עדכונים", href: "#news" },
  { label: "שאלות נפוצות", href: "#faq" },
]

export const FILM: FilmInfo = {
  titleHe: "הנוקמים: דומסדיי",
  titleEn: "Avengers: Doomsday",
  releaseDate: "2026-12-18",
  releaseRegionHe: "בתי הקולנוע בארה״ב",
  directorsEn: ["Anthony Russo", "Joe Russo"],
  studioEn: "Marvel Studios",
  synopsisHe:
    "עולמות מתנגשים, וסאגת המולטיוורס מתחילה את הפרק האחרון שלה. גיבורים אהובים משלושה יקומים שונים יוצאים למסלול התנגשות קטלני, ובסופו של דבר ניצבים מול איום קיומי שלא דומה לשום דבר שפגשו עד היום. הסרט האפי הזה יניח את היסודות לעתיד של היקום הקולנועי של מארוול.",
  synopsisSource: S.synopsis,
  sequel: { titleHe: "הנוקמים: מלחמות סודיות", titleEn: "Avengers: Secret Wars", releaseDate: "2027-12-17", source: S.secretWars },
  sources: [S.movie, S.production],
}

// ===== Media =====
export const GALLERY: GalleryImage[] = [
  {
    id: "doom-poster",
    src: "./media/doom-character-poster.webp",
    width: 1024,
    height: 1280,
    altHe: "דוקטור דום בברדס ירוק ובשריון מתכת, על רקע ויטראז׳ ירוק",
    captionHe: "פוסטר הדמות של דוקטור דום, עם תאריך הבכורה (18 בדצמבר) וסימן זכויות היוצרים של Marvel.",
    kind: "poster",
    provenance: "unverified",
    provenanceNoteHe: "התקבל מקהילת מארוול גיקים. הפוסטר נושא את סימני הזכויות של Marvel, אך את עמוד המקור הרשמי עוד לא איתרנו.",
    focus: "50% 22%",
  },
  {
    id: "frame-gauntlet",
    src: "./media/frame-gauntlet.webp",
    width: 2000,
    height: 825,
    altHe: "תקריב של כפפה משוריינת כהה עם אורות ירוקים זוהרים",
    captionHe: "כפפה משוריינת עם אורות ירוקים.",
    kind: "trailer-frame",
    provenance: "unverified",
    provenanceNoteHe: "פריים שהתקבל מהקהילה. עוד לא אימתנו שהוא לקוח מטריילר רשמי, והחותמת בזמן אינה ידועה.",
    focus: "60% 40%",
  },
  {
    id: "frame-battlefield",
    src: "./media/frame-battlefield.webp",
    width: 2000,
    height: 825,
    altHe: "רגל ענקית של סנטינל דורכת בשדה קרב מוצף אור ירוק",
    captionHe: "רגל של סנטינל בשדה קרב מוצף אור ירוק.",
    kind: "trailer-frame",
    provenance: "official",
    provenanceNoteHe: "פריים מחומרי הקידום הרשמיים של הסרט. המקור אומת על ידי מארוול גיקים. החותמת בזמן אינה ידועה.",
    focus: "35% 55%",
  },
  {
    id: "official-trailer-poster",
    width: 1600,
    height: 900,
    altHe: "הפוסטר החדש שפורסם יחד עם הטריילר",
    captionHe: "הפוסטר שפורסם יחד עם הטריילר החדש, לפי הודעת העיתונות של דיסני.",
    kind: "poster",
    provenance: "official",
    provenanceNoteHe: "מקור רשמי. קובץ התמונה עוד לא הושג.",
    source: S.disneyPress,
  },
  {
    id: "official-trailer-thumb",
    src: "https://i.ytimg.com/vi/irVNGjRFZGk/maxresdefault.jpg",
    width: 1280,
    height: 720,
    altHe: "התמונה הממוזערת של הטריילר הרשמי",
    captionHe: "התמונה הממוזערת של הטריילר הרשמי מ-20 ביולי 2026.",
    kind: "trailer-thumbnail",
    provenance: "official",
    provenanceNoteHe: "תמונה ממוזערת רשמית מערוץ ה-YouTube של Marvel Entertainment.",
    source: { label: "YouTube · הטריילר הרשמי", url: "https://www.youtube.com/watch?v=irVNGjRFZGk" },
  },
  {
    id: "d23-thumb",
    src: "https://i.ytimg.com/vi/X1aFkAkFASk/maxresdefault.jpg",
    width: 1280,
    height: 720,
    altHe: "התמונה הממוזערת של המבט המיוחד מכנס D23",
    captionHe: "התמונה הממוזערת של המבט המיוחד מכנס D23, אוגוסט 2026.",
    kind: "trailer-thumbnail",
    provenance: "official",
    provenanceNoteHe: "תמונה ממוזערת רשמית מערוץ ה-YouTube של Marvel Entertainment.",
    source: { label: "YouTube · מבט מיוחד", url: "https://www.youtube.com/watch?v=X1aFkAkFASk" },
  },
]

export const HERO_IMAGE = GALLERY[0]

// ===== Trailers =====
export const TRAILERS: Trailer[] = [
  {
    id: "main-trailer",
    youtubeId: "irVNGjRFZGk",
    titleHe: "הטריילר הרשמי",
    publishedAt: "2026-07-20",
    descriptionHe: "הטריילר המלא הראשון לקהל הרחב. יחד איתו נפתחה מכירת הכרטיסים לאולמות Infinity Vision.",
    status: "official",
    source: S.trailer,
  },
  {
    id: "d23-special-look",
    youtubeId: "X1aFkAkFASk",
    titleHe: "מבט מיוחד מכנס D23",
    publishedAt: "2026-08-14",
    descriptionHe: "הוצג על הבמה בכנס D23 באנהיים, עם קווין פייגי, רוברט דאוני ג׳וניור, כריס אוונס והיילי אטוול. במרכזו דוקטור דום.",
    status: "official",
    source: S.d23,
  },
  {
    id: "teaser-1",
    youtubeId: "UiMg566PREA",
    titleHe: "טיזר 1 · סטיב רוג׳רס",
    publishedAt: "2025-12-23",
    descriptionHe: "הטיזר הראשון חשף את חזרתו של כריס אוונס בתפקיד סטיב רוג׳רס.",
    status: "official",
    source: S.teasers,
  },
  {
    id: "teaser-2",
    youtubeId: "1clWprLC5Ak",
    titleHe: "טיזר 2 · ת׳ור",
    publishedAt: "2025-12-30",
    descriptionHe: "טיזר שבמרכזו כריס המסוורת׳ בתפקיד ת׳ור.",
    status: "official",
    source: S.teasers,
  },
  {
    id: "teaser-3",
    youtubeId: "kH1XlwHQv9o",
    titleHe: "טיזר 3 · אקס-מן",
    publishedAt: "2026-01-06",
    descriptionHe: "פטריק סטיוארט בתפקיד פרופסור X, איאן מקלן בתפקיד מגנטו וג׳יימס מרסדן בתפקיד סייקלופס.",
    status: "official",
    source: S.teasers,
  },
  {
    id: "teaser-4",
    youtubeId: "399Ez7WHK5s",
    titleHe: "טיזר 4 · וואקנדה וארבעת המופלאים",
    publishedAt: "2026-01-13",
    descriptionHe: "לטישה רייט בתפקיד שורי, וינסטון דיוק בתפקיד מ׳באקו, טנוך הוארטה מחיה בתפקיד נמור ואבון מוס-בכרך בתפקיד הדבר.",
    status: "official",
    source: S.teasers,
  },
]

// ===== Characters & cast =====
const announced = "הוכרז בשידור החי של מארוול ב-26 במרץ 2025, עם תחילת הצילומים."
const roleOpen = "התפקיד בסרט עוד לא אושר רשמית."

export const CHARACTERS: Character[] = [
  { id: "rdj", actorEn: "Robert Downey Jr.", actorHe: "רוברט דאוני ג׳וניור", characterHe: "ויקטור פון דום", characterEn: "Victor von Doom", group: "doom", status: "official", source: S.production,
    descriptionHe: "הוכרז בכנס קומיק-קון בסן דייגו ב-27 ביולי 2024. אחרי עשרה סרטים בתפקיד טוני סטארק, הוא חוזר בתפקיד חדש: הנבל של הסרט." },
  { id: "evans", actorEn: "Chris Evans", actorHe: "כריס אוונס", characterHe: "סטיב רוג׳רס", characterEn: "Steve Rogers", group: "avengers", status: "official", source: S.teasers,
    descriptionHe: "חזרתו נחשפה בטיזר הראשון ב-23 בדצמבר 2025." },
  { id: "hemsworth", actorEn: "Chris Hemsworth", actorHe: "כריס המסוורת׳", characterHe: "ת׳ור", characterEn: "Thor", group: "avengers", status: "official", source: S.teasers,
    descriptionHe: "במרכז הטיזר השני, שפורסם ב-30 בדצמבר 2025." },
  { id: "mackie", actorEn: "Anthony Mackie", actorHe: "אנתוני מאקי", group: "avengers", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את סם וילסון. ${roleOpen}` },
  { id: "stan", actorEn: "Sebastian Stan", actorHe: "סבסטיאן סטן", group: "avengers", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את באקי בארנס. ${roleOpen}` },
  { id: "rudd", actorEn: "Paul Rudd", actorHe: "פול ראד", group: "avengers", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את סקוט לאנג. ${roleOpen}` },
  { id: "hiddleston", actorEn: "Tom Hiddleston", actorHe: "טום הידלסטון", group: "avengers", status: "official", source: S.production, descriptionHe: `${announced} בסרטים ובסדרות קודמים גילם את לוקי. ${roleOpen}` },
  { id: "liu", actorEn: "Simu Liu", actorHe: "סימו ליו", group: "avengers", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את שאנג-צ׳י. ${roleOpen}` },
  { id: "ramirez", actorEn: "Danny Ramirez", actorHe: "דני רמירז", group: "avengers", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את חואקין טורס. ${roleOpen}` },
  { id: "wright", actorEn: "Letitia Wright", actorHe: "לטישה רייט", characterHe: "שורי", characterEn: "Shuri", group: "wakanda-talokan", status: "official", source: S.teasers,
    descriptionHe: "מופיעה בטיזר הרביעי, שפורסם ב-13 בינואר 2026." },
  { id: "duke", actorEn: "Winston Duke", actorHe: "וינסטון דיוק", characterHe: "מ׳באקו", characterEn: "M'Baku", group: "wakanda-talokan", status: "official", source: S.teasers,
    descriptionHe: "מופיע בטיזר הרביעי, שפורסם ב-13 בינואר 2026." },
  { id: "huerta", actorEn: "Tenoch Huerta Mejía", actorHe: "טנוך הוארטה מחיה", characterHe: "נמור", characterEn: "Namor", group: "wakanda-talokan", status: "official", source: S.teasers,
    descriptionHe: "מופיע בטיזר הרביעי, שפורסם ב-13 בינואר 2026." },
  { id: "moss-bachrach", actorEn: "Ebon Moss-Bachrach", actorHe: "אבון מוס-בכרך", characterHe: "בן גרים (הדבר)", characterEn: "The Thing", group: "fantastic-four", status: "official", source: S.teasers,
    descriptionHe: "מופיע בטיזר הרביעי, שפורסם ב-13 בינואר 2026." },
  { id: "pascal", actorEn: "Pedro Pascal", actorHe: "פדרו פסקל", group: "fantastic-four", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את ריד ריצ׳רדס. ${roleOpen}` },
  { id: "kirby", actorEn: "Vanessa Kirby", actorHe: "ונסה קירבי", group: "fantastic-four", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילמה את סו סטורם. ${roleOpen}` },
  { id: "quinn", actorEn: "Joseph Quinn", actorHe: "ג׳וזף קווין", group: "fantastic-four", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את ג׳וני סטורם. ${roleOpen}` },
  { id: "pugh", actorEn: "Florence Pugh", actorHe: "פלורנס פיו", group: "thunderbolts", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילמה את ילנה בלובה. ${roleOpen}` },
  { id: "harbour", actorEn: "David Harbour", actorHe: "דיוויד הארבור", group: "thunderbolts", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילם את אלכסיי שוסטקוב. ${roleOpen}` },
  { id: "russell", actorEn: "Wyatt Russell", actorHe: "וויאט ראסל", group: "thunderbolts", status: "official", source: S.production, descriptionHe: `${announced} בסדרות ובסרטים קודמים גילם את ג׳ון ווקר. ${roleOpen}` },
  { id: "john-kamen", actorEn: "Hannah John-Kamen", actorHe: "האנה ג׳ון-קיימן", group: "thunderbolts", status: "official", source: S.production, descriptionHe: `${announced} בסרטים קודמים גילמה את אווה סטאר. ${roleOpen}` },
  { id: "pullman", actorEn: "Lewis Pullman", actorHe: "לואיס פולמן", group: "thunderbolts", status: "official", source: S.production, descriptionHe: `${announced} בסרט קודם גילם את בוב. ${roleOpen}` },
  { id: "stewart", actorEn: "Patrick Stewart", actorHe: "פטריק סטיוארט", characterHe: "פרופסור X", characterEn: "Professor X", group: "x-men", status: "official", source: S.teasers,
    descriptionHe: "מופיע בטיזר השלישי, שפורסם ב-6 בינואר 2026." },
  { id: "mckellen", actorEn: "Ian McKellen", actorHe: "איאן מקלן", characterHe: "מגנטו", characterEn: "Magneto", group: "x-men", status: "official", source: S.teasers,
    descriptionHe: "מופיע בטיזר השלישי, שפורסם ב-6 בינואר 2026." },
  { id: "marsden", actorEn: "James Marsden", actorHe: "ג׳יימס מרסדן", characterHe: "סייקלופס", characterEn: "Cyclops", group: "x-men", status: "official", source: S.teasers,
    descriptionHe: "מופיע בטיזר השלישי, שפורסם ב-6 בינואר 2026." },
  { id: "grammer", actorEn: "Kelsey Grammer", actorHe: "קלסי גראמר", group: "x-men", status: "official", source: S.production, descriptionHe: `${announced} בסרטי האקס-מן הקודמים גילם את ביסט. ${roleOpen}` },
  { id: "cumming", actorEn: "Alan Cumming", actorHe: "אלן קאמינג", group: "x-men", status: "official", source: S.production, descriptionHe: `${announced} בסרטי האקס-מן הקודמים גילם את נייטקרולר. ${roleOpen}` },
  { id: "romijn", actorEn: "Rebecca Romijn", actorHe: "רבקה רומיין", group: "x-men", status: "official", source: S.production, descriptionHe: `${announced} בסרטי האקס-מן הקודמים גילמה את מיסטיק. ${roleOpen}` },
  { id: "tatum", actorEn: "Channing Tatum", actorHe: "צ׳נינג טייטום", group: "x-men", status: "official", source: S.production, descriptionHe: `${announced} בסרט קודם גילם את גמביט. ${roleOpen}` },
  { id: "atwell", actorEn: "Hayley Atwell", actorHe: "היילי אטוול", group: "avengers", status: "report", source: S.d23,
    descriptionHe: "עלתה לבמה בכנס D23 יחד עם דאוני ג׳וניור ואוונס, אבל לא הופיעה ברשימת השחקנים מ-26 במרץ 2025. מארוול עוד לא הודיעה על תפקידה בסרט." },
  { id: "jackman", actorEn: "Hugh Jackman", actorHe: "יו ג׳קמן", group: "x-men", status: "rumor", source: S.jackman,
    descriptionHe: "בסרטון בכנס D23 ״הציע את עזרתו״ לצוות. הסרטון לא אישר השתתפות, ומארוול לא הודיעה על כך." },
  { id: "reynolds", actorEn: "Ryan Reynolds", actorHe: "ריאן ריינולדס", group: "x-men", status: "rumor", source: S.jackman,
    descriptionHe: "נשמע ברקע של סרטון D23 של ג׳קמן. ההשתתפות שלו לא אושרה." },
]

export const CHARACTER_GROUPS: Record<Character["group"], string> = {
  doom: "דום",
  avengers: "הנוקמים",
  "fantastic-four": "ארבעת המופלאים",
  thunderbolts: "ת׳אנדרבולטס",
  "x-men": "אקס-מן",
  "wakanda-talokan": "וואקנדה וטלוקן",
}

// ===== News =====
export const NEWS: NewsItem[] = [
  {
    id: "d23",
    titleHe: "מבט מיוחד חדש בכנס D23",
    summaryHe: "מארוול הציגה בכנס D23 באנהיים מבט מיוחד שבמרכזו דוקטור דום. על הבמה עלו קווין פייגי, רוברט דאוני ג׳וניור, כריס אוונס והיילי אטוול.",
    publishedAt: "2026-08-14",
    status: "official",
    source: S.d23,
  },
  {
    id: "trailer",
    titleHe: "הטריילר המלא יצא, ונפתחה מכירת הכרטיסים",
    summaryHe: "הטריילר המלא פורסם ב-20 ביולי 2026. איתו נפתחה מכירת הכרטיסים לאולמות Infinity Vision, תו תקן חדש של דיסני לאולמות פרימיום גדולים.",
    publishedAt: "2026-07-20",
    status: "official",
    source: S.trailer,
  },
  {
    id: "teasers",
    titleHe: "ארבעה טיזרים בארבעה שבועות",
    summaryHe: "בין 23 בדצמבר 2025 ל-13 בינואר 2026 פרסמה מארוול ארבעה טיזרים: סטיב רוג׳רס, ת׳ור, האקס-מן, ולבסוף וואקנדה עם ארבעת המופלאים.",
    publishedAt: "2025-12-23",
    status: "official",
    source: S.teasers,
  },
  {
    id: "production",
    titleHe: "הצילומים התחילו, והצוות נחשף",
    summaryHe: "מארוול הודיעה על תחילת הצילומים, וחשפה את הצוות בשידור חי ארוך עם כיסאות במאי ששמות השחקנים כתובים עליהם.",
    publishedAt: "2025-03-26",
    status: "official",
    source: S.production,
  },
  {
    id: "sdcc",
    titleHe: "רוברט דאוני ג׳וניור הוא דוקטור דום",
    summaryHe: "בכנס קומיק-קון בסן דייגו הוכרז על הסרט, ודאוני ג׳וניור הסיר את המסיכה על הבמה. האחים רוסו חוזרים לביים.",
    publishedAt: "2024-07-27",
    status: "official",
    source: S.sdcc,
  },
  {
    id: "jackman-rumor",
    titleHe: "יו ג׳קמן וריאן ריינולדס בדומסדיי?",
    summaryHe: "בסרטון בכנס D23 ג׳קמן ״הציע את עזרתו״ לצוות, וריינולדס נשמע ברקע. רוב הדיווחים מציינים שזה לא אישור רשמי.",
    publishedAt: "2026-08-15",
    status: "rumor",
    source: S.jackman,
  },
]

// ===== FAQ =====
export const FAQ: FaqItem[] = [
  { id: "release", questionHe: "מתי הסרט יוצא?", answerHe: "התאריך הרשמי הוא 18 בדצמבר 2026, בבתי הקולנוע בארה״ב. בכל מדינה עשוי להיות תאריך מעט שונה, ושעות ההקרנה ייקבעו בבתי הקולנוע.", source: S.movie },
  { id: "directors", questionHe: "מי מביים את הסרט?", answerHe: "האחים אנתוני וג׳ו רוסו, שביימו גם את ״מלחמת האינסוף״ ואת ״סוף המשחק״. הם יביימו גם את ״מלחמות סודיות״.", source: S.production },
  { id: "doom", questionHe: "מי מגלם את דוקטור דום?", answerHe: "רוברט דאוני ג׳וניור, שגילם את טוני סטארק. ההכרזה הייתה בכנס קומיק-קון ב-27 ביולי 2024.", source: S.sdcc },
  { id: "evans", questionHe: "האם כריס אוונס משתתף בסרט?", answerHe: "כן. הטיזר הראשון, מ-23 בדצמבר 2025, חשף אותו בתפקיד סטיב רוג׳רס. פרטים נוספים על חלקו בעלילה לא פורסמו.", source: S.teasers },
  { id: "plot", questionHe: "על מה הסרט?", answerHe: "לפי התקציר הרשמי, גיבורים משלושה יקומים שונים יוצאים למסלול התנגשות ופוגשים איום קיומי. מעבר לזה, פרטי העלילה עוד לא פורסמו.", source: S.synopsis },
  { id: "infinity-vision", questionHe: "מה זה Infinity Vision?", answerHe: "תו תקן חדש של דיסני לאולמות פרימיום גדולים. הוא לא טכנולוגיית הקרנה חדשה. הכרטיסים לאולמות האלה נמכרו ראשונים.", source: S.axios },
  { id: "next", questionHe: "מה מגיע אחרי דומסדיי?", answerHe: "״הנוקמים: מלחמות סודיות״, שמתוכנן ל-17 בדצמבר 2027.", source: S.secretWars },
  { id: "official-site", questionHe: "האם זה אתר רשמי?", answerHe: "לא. זה אתר מעריצים עצמאי של קהילת מארוול גיקים, בלי קשר ל-Marvel או ל-Disney. כל מידע באתר מסומן לפי רמת האימות שלו, עם קישור למקור." },
]
