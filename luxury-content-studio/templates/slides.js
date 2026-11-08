/* Carousel 01 — content & layout. All visible copy is Hebrew. */
(function () {
  const C = window.C;
  const G = (t) => `<span class="gold-text">${t}</span>`;

  const BRAND = "סטודיו לעיצוב דיגיטלי"; // replace with the agency's brand name / logo
  const SWIPE = "החליקו";
  const TOTAL = 5;

  /* Copy for the fictional client website shown in the mockups */
  const SITE = {
    logo: "אורה",
    links: ["בית", "שירותים", "פרויקטים"],
    contact: "צרו קשר",
    kicker: "סטודיו לאדריכלות ועיצוב פנים",
    title: "מרחבים<br>שמספרים סיפור.",
    text: "תכנון ועיצוב ברמת גימור בלתי מתפשרת — מהשרטוט הראשון ועד מסירת המפתח.",
    textShort: "תכנון ועיצוב ברמת גימור בלתי מתפשרת, מהשרטוט הראשון ועד מסירת המפתח.",
    primary: "לתיאום פגישה",
    secondary: "לפרויקטים",
    stats: [
      { n: "15", l: "שנות ניסיון" },
      { n: "120", l: "פרויקטים שהושלמו" },
      { n: "3", l: "פרסי עיצוב" },
    ],
  };

  const rings = (x, y, sizes) => sizes.map((s) =>
    `<div class="ring" style="width:${s}px;height:${s}px;left:${x - s / 2}px;top:${y - s / 2}px"></div>`).join("");

  const SLIDES = [
    /* 1 — Cover */
    () => C.frame({
      index: 1, total: TOTAL, brand: BRAND, swipeLabel: SWIPE,
      decor: `
        <div class="glow" style="width:620px;height:620px;left:-220px;top:620px;background:rgba(201,164,92,0.16)"></div>
        ${rings(120, 1010, [520, 760, 1000])}
        <div style="position:absolute;left:0;top:0;width:1px;height:100%;"></div>`,
      inner: `
        <div style="margin-top:auto">
          ${C.headline(["העסק שלך", `ראוי ל${G("יותר.")}`], "")}
        </div>
        <div style="margin-bottom:auto; padding-bottom:20px">
          ${C.separator()}
          ${C.body("האם האתר שלך באמת משקף את האיכות של העסק שלך?", "lg")}
        </div>`,
    }).replace('class="headline "', 'class="headline" style="font-size:150px;line-height:1.02"'),

    /* 2 — The problem */
    () => C.frame({
      index: 2, total: TOTAL, brand: BRAND, swipeLabel: SWIPE,
      decor: `
        <div class="glow" style="width:700px;height:500px;left:-100px;top:900px;background:rgba(201,164,92,0.12)"></div>
        ${C.skeletonBrowser("left:-60px; top:860px; transform: rotate(-4deg); width:760px; opacity:0.95;")}
        <div style="position:absolute;left:0;right:0;bottom:0;height:420px;background:linear-gradient(0deg,#070707 25%,rgba(7,7,7,0));z-index:5"></div>`,
      inner: `
        ${C.eyebrow("הבעיה")}
        ${C.headline(["הרושם הראשוני", `מתחיל ${G("באינטרנט.")}`])}
        ${C.separator()}
        ${C.body("הלקוחות הפוטנציאליים שלך מגבשים רושם על העסק שלך עוד לפני שדיברו איתך.")}`,
    }),

    /* 3 — The issues */
    () => C.frame({
      index: 3, total: TOTAL, brand: BRAND, swipeLabel: SWIPE,
      decor: `<div class="glow" style="width:600px;height:600px;left:-260px;top:300px;background:rgba(201,164,92,0.10)"></div>`,
      inner: `
        ${C.eyebrow("האתגרים")}
        ${C.headline(["מה מונע מהאתר", `שלך ${G("להצליח?")}`], "md")}
        <div style="margin-top:auto">
          ${C.numberedList([
            { num: "01", text: "עיצוב מיושן." },
            { num: "02", text: "חוויית משתמש לא נוחה." },
            { num: "03", text: "נראות דיגיטלית לא מקצועית." },
          ])}
        </div>`,
    }),

    /* 4 — The solution */
    () => C.frame({
      index: 4, total: TOTAL, brand: BRAND, swipeLabel: SWIPE,
      decor: `
        <div class="glow" style="width:900px;height:460px;left:100px;top:860px;background:rgba(201,164,92,0.14)"></div>
        <div class="stage" style="top:0;bottom:0">
          ${C.desktopMockup(SITE, "left:380px; top:765px; width:780px; transform:scale(0.78);")}
          ${C.phoneMockup(SITE, "left:120px; top:725px; transform:scale(0.78);")}
        </div>`,
      inner: `
        ${C.eyebrow("הפתרון")}
        ${C.headline(["הרבה יותר", `מסתם ${G("אתר.")}`], "md")}
        <div style="margin-top:30px">
          ${C.body([
            "אתר מקצועי הוא <strong>הזהות הדיגיטלית</strong> של העסק שלך.",
            "הוא בונה אמון, מציג את הערך שלך ומעניק ללקוחות חוויית שימוש טובה יותר.",
          ], "sm")}
        </div>`,
    }),

    /* 5 — Call to action */
    () => C.frame({
      index: 5, total: TOTAL, brand: BRAND, swipeLabel: null,
      decor: `
        <div class="glow" style="width:800px;height:800px;left:-300px;top:-200px;background:rgba(201,164,92,0.12)"></div>
        ${rings(140, 300, [420, 640, 860])}`,
      inner: `
        <div style="margin-top:120px">
          ${C.eyebrow("הצעד הבא")}
          ${C.headline(["הגיע הזמן", `להשאיר ${G("רושם.")}`])}
          ${C.separator()}
          ${C.body("מוכנים לשדרג את הנוכחות הדיגיטלית של העסק שלכם?", "lg")}
        </div>
        <div style="margin-top:auto; margin-bottom:20px">${C.cta("בואו נדבר.")}</div>`,
    }),
  ];

  window.SLIDES = SLIDES;
})();
