/* Carousel 02 — "5 דברים שכל אתר עסקי חייב לכלול". All visible copy is Hebrew. */
(function () {
  const C = window.C;
  const G = (t) => `<span class="gold-text">${t}</span>`;

  const BRAND = "סטודיו לעיצוב דיגיטלי"; // same brand label as Carousel 01
  const SWIPE = "החליקו";
  const TOTAL = 7;
  const frame = (index, opts) => C.frame({ index, total: TOTAL, brand: BRAND, swipeLabel: index < TOTAL ? SWIPE : null, ...opts });

  /* Fictional client website shown in the mockups (same "אורה" site as Carousel 01) */
  const SITE = {
    logo: "אורה",
    links: ["בית", "שירותים", "פרויקטים"],
    contact: "צרו קשר",
    kicker: "סטודיו לאדריכלות ועיצוב פנים",
    title: "מרחבים<br>שמספרים סיפור.",
    text: "תכנון ועיצוב ברמת גימור בלתי מתפשרת, מהשרטוט הראשון ועד מסירת המפתח.",
    textShort: "תכנון ועיצוב ברמת גימור בלתי מתפשרת, מהשרטוט הראשון ועד מסירת המפתח.",
    primary: "לתיאום פגישה",
    secondary: "לפרויקטים",
    stats: [
      { n: "15", l: "שנות ניסיון" },
      { n: "120", l: "פרויקטים שהושלמו" },
      { n: "3", l: "פרסי עיצוב" },
    ],
    services: ["תכנון אדריכלי", "עיצוב פנים", "ליווי ופיקוח"],
    menu: ["בית", "שירותים", "פרויקטים", "אודות", "צרו קשר"],
  };

  const HERO = {
    logo: "אורה",
    links: ["שירותים", "פרויקטים", "אודות"],
    contact: "צרו קשר",
    title: "עיצוב פנים<br>לבתים פרטיים.",
    subtitle: "לזוגות ומשפחות שמחפשים בית שמרגיש כמו מלון בוטיק.",
    button: "לשיחת היכרות",
    phone: "03-5550123",
  };

  const CONTACT = {
    kicker: "צרו קשר",
    title: "בואו נתחיל<br>לעבוד יחד.",
    text: "השאירו פרטים ונחזור אליכם עוד היום, או רכשו חבילת ייעוץ ישירות באתר.",
    meta: [
      { l: "טלפון", v: "03-5550123" },
      { l: "כתובת", v: "שדרות רוטשילד 22, תל אביב" },
    ],
    fields: ["שם מלא", "טלפון", "במה נוכל לעזור?"],
    button: "שליחת פרטים",
    alt: "לרכישת חבילת ייעוץ",
  };

  const SLIDES = [
    /* 01 — Cover */
    () => frame(1, {
      decor: `
        <div class="glow" style="width:700px;height:700px;left:-260px;top:420px;background:rgba(201,164,92,0.13)"></div>
        <div class="outline-num" style="left:-90px;top:300px;font-size:1060px">5</div>`,
      inner: `
        <div style="margin-top:auto">
          <h1 class="headline" style="font-size:124px;line-height:1.06">
            ${G("5")} דברים<br>שכל אתר עסקי<br>חייב לכלול.</h1>
        </div>
        <div style="margin-bottom:auto">
          ${C.separator()}
          ${C.body("המדריך הקצר לבניית נוכחות דיגיטלית מקצועית.", "lg")}
        </div>`,
    }),

    /* 02 — First impression: monitor in a dark studio */
    () => frame(2, {
      decor: `
        <div class="lamp-glow" style="width:820px;height:560px;left:130px;top:600px"></div>
        <div class="desk" style="height:186px"></div>
        <div class="stage" style="top:0;bottom:0">
          ${C.monitorMockup(SITE, "left:253px; top:648px; transform:scale(0.70);")}
        </div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(0deg,rgba(7,7,7,0.7),rgba(7,7,7,0));z-index:13"></div>`,
      inner: `
        ${C.stepHeadline("01", "הרושם הראשוני.")}
        ${C.separator()}
        ${C.body([
          "האתר שלך הוא לעיתים המפגש הראשון של הלקוח עם העסק שלך.",
          "עיצוב מקצועי <strong>יוצר אמון ומשדר רצינות.</strong>",
        ], "sm")}`,
    }),

    /* 03 — Mobile: two phones on the left, copy column on the right */
    () => frame(3, {
      decor: `
        <div class="glow" style="width:560px;height:720px;left:40px;top:440px;background:rgba(201,164,92,0.16)"></div>
        <div class="stage" style="top:0;bottom:0">
          ${C.phoneSite(SITE, "left:150px; top:430px; transform:scale(1.04);")}
        </div>`,
      inner: `
        ${C.stepHeadline("02", "התאמה לנייד.")}
        ${C.separator()}
        <div style="width:440px">
          ${C.body([
            "רוב הגלישה כיום מתבצעת ממכשירים ניידים.",
            "האתר חייב להיראות ולעבוד <strong>מצוין גם בסמארטפון.</strong>",
          ], "sm")}
          <div style="margin-top:60px; width:220px; opacity:0.85">${C.ICON.devices}</div>
        </div>`,
    }),

    /* 04 — Clear message: question list ↔ annotated hero section */
    () => frame(4, {
      decor: `
        <div class="glow" style="width:900px;height:500px;left:90px;top:780px;background:rgba(201,164,92,0.12)"></div>
        <div class="stage" style="top:0;bottom:0">
          ${C.clearHero(HERO, "left:100px; top:742px; width:880px;")}
        </div>`,
      inner: `
        ${C.stepHeadline("03", "מסר ברור.")}
        <div style="margin-top:44px">${C.body("הלקוח צריך להבין <strong>תוך שניות:</strong>", "sm")}</div>
        <div style="margin-top:34px">
          ${C.markerList(["מה העסק שלך מציע?", "למי השירות מתאים?", "איך אפשר ליצור איתך קשר?"])}
        </div>`,
    }),

    /* 05 — Performance: gauge on top, copy below */
    () => frame(5, {
      decor: `
        <div class="glow" style="width:700px;height:440px;left:190px;top:200px;background:rgba(201,164,92,0.13)"></div>
        ${C.gauge(0.92, "left:200px; top:196px; width:680px; height:380px; z-index:11")}
        <div style="position:absolute;left:540px;top:560px;width:0;height:0"></div>`,
      inner: `
        <div style="margin-top:400px">
          ${C.stepHeadline("04", "מהירות ונוחות.")}
          ${C.separator()}
          ${C.body([
            "אתר איטי או מסורבל עלול לגרום למבקרים לעזוב.",
            "בנה חוויית גלישה <strong>מהירה, ברורה ונוחה.</strong>",
          ], "sm")}
        </div>
        <div style="margin-top:auto">
          ${C.iconRow([
            { icon: "bolt", text: "מהירה" },
            { icon: "eye", text: "ברורה" },
            { icon: "touch", text: "נוחה" },
          ])}
        </div>`,
    }),

    /* 06 — Call to action: three paths + contact section mockup */
    () => frame(6, {
      decor: `
        <div class="glow" style="width:900px;height:460px;left:90px;top:720px;background:rgba(201,164,92,0.12)"></div>
        <div class="stage" style="top:0;bottom:0">
          ${C.contactSection(CONTACT, "left:100px; top:666px; width:880px;")}
        </div>`,
      inner: `
        ${C.stepHeadline("05", "הנעה לפעולה.")}
        <div style="margin-top:40px">
          ${C.body(["אל תשאיר את הלקוחות שלך לנחש מה לעשות.", "הצג להם <strong>דרך ברורה:</strong>"], "sm")}
        </div>
        <div style="margin-top:30px">${C.chips(["לרכוש מוצר.", "להשאיר פרטים.", "ליצור קשר."])}</div>`,
    }),

    /* 07 — Final CTA: centered, gold typography */
    () => frame(7, {
      decor: `
        <div class="glow" style="width:900px;height:700px;left:90px;top:160px;background:rgba(201,164,92,0.12)"></div>`,
      inner: `
        <div class="centered" style="display:flex;flex-direction:column;height:100%">
          <div style="margin-top:auto">
            <div class="five-dots"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i></div>
          </div>
          <h1 class="headline gold-text" style="font-size:84px;line-height:1.18;margin-top:56px;white-space:nowrap">האם האתר שלך<br>עומד בכל חמשת התנאים?</h1>
          ${C.separator()}
          <p class="body-text sm"><span class="save-line">${C.ICON.bookmark}<span>שמור את הפוסט ובדוק את האתר שלך.</span></span></p>
          <p class="body-text sm" style="margin-top:18px">רוצה לשדרג את הנוכחות הדיגיטלית של העסק?</p>
          <div style="margin-top:90px; margin-bottom:auto">${C.cta("שלחו לנו הודעה.")}</div>
        </div>`,
    }),
  ];

  window.SLIDES = SLIDES;
})();
