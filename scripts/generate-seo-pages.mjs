import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://nasq-code.web.app";
const PUBLISHED_AT = "2026-09-16";
const distDirectory = fileURLToPath(new URL("../dist", import.meta.url));
const baseArgument = process.argv.find((argument) => argument.startsWith("--base="));
const rawAssetBase = baseArgument?.slice("--base=".length) || "/";
const assetBase = `/${rawAssetBase.split("/").filter(Boolean).join("/")}${rawAssetBase === "/" ? "" : "/"}`;
const assetPath = (filePath = "") => `${assetBase}${filePath.replace(/^\//, "")}`;

const guides = [
  {
    slug: "code-security-scan",
    title: "فحص أمان الكود قبل النشر | نَسَق كود",
    description: "دليل عملي لفحص أسرار الكود والإعدادات المفتوحة والأنماط غير الآمنة قبل نشر التطبيق، مع ترتيب الملاحظات حسب الأولوية.",
    h1: "فحص أمان الكود قبل النشر",
    lead: "الفحص المبكر لا يضمن خلو التطبيق من الثغرات، لكنه يكشف مؤشرات قابلة للإصلاح قبل أن تتحول إلى مشكلة في بيئة الإنتاج.",
    opening: [
      "تبدأ المراجعة الجيدة من الملفات التي تحدد طريقة تشغيل التطبيق: متغيرات البيئة، ملفات الإعدادات، قواعد الوصول، إعدادات البناء، ومسارات الاتصال بالخدمات الخارجية. وجود قيمة حساسة داخل المستودع أو قاعدة وصول مفتوحة قد يكون أهم من عشرات الملاحظات الشكلية.",
      "يرتب نَسَق النتائج وفق الدليل والخطورة، ويعرض الملف المرتبط بالملاحظة والإجراء المقترح. الهدف هو مساعدة المطور على بدء الإصلاح من النقطة الأعلى أثرًا بدل توزيع الجهد عشوائيًا.",
    ],
    checks: [
      ["الأسرار المكشوفة", "البحث عن أنماط المفاتيح والرموز الحساسة داخل ملفات المصدر والإعدادات مع تجنب إرسال محتوى المشروع إلى خوادم نَسَق."],
      ["قواعد الوصول", "مراجعة أولية لقواعد Firebase والأنماط التي تسمح بالقراءة أو الكتابة العامة دون قيد واضح."],
      ["التنفيذ الديناميكي", "رصد استخدامات شديدة الحساسية مثل التنفيذ الديناميكي للكود عندما تظهر داخل ملفات قابلة للتحليل."],
      ["سير العمل والنشر", "فحص مؤشرات الصلاحيات الواسعة داخل ملفات GitHub Actions وملفات الحاويات والإعدادات التشغيلية."],
    ],
    steps: [
      "ألغِ أي مفتاح مكشوف ودوّره قبل تعديل الكود؛ حذف السطر وحده لا يبطل المفتاح القديم.",
      "انقل القيم السرية إلى مدير أسرار أو متغيرات بيئة غير مضمّنة في المستودع.",
      "قلّص قواعد الوصول والصلاحيات إلى الحد الأدنى المطلوب ثم اختبر المسارات الفعلية.",
      "أعد الفحص بعد الإصلاح وتحقق يدويًا من الملاحظات عالية الخطورة.",
    ],
    limitation: "نَسَق ينفذ تحليلًا ساكنًا ومبدئيًا؛ لا يشغّل التطبيق ولا يجري اختبار اختراق ولا يثبت خلو المشروع من جميع الثغرات.",
  },
  {
    slug: "spaghetti-code-analysis",
    title: "اكتشاف الكود المتشابك وتقليل Spaghetti Code | نَسَق",
    description: "تعرف على مؤشرات الكود المتشابك: الملفات الضخمة، المسؤوليات المختلطة، دورات الاعتماد ونقاط الاختناق، وكيف ترتب إعادة البناء.",
    h1: "كيف تكتشف الكود المتشابك؟",
    lead: "المشكلة ليست في شكل المجلدات من الخارج؛ التشابك الحقيقي يظهر في الاعتمادات والمسؤوليات المختلطة وصعوبة تعديل جزء دون كسر أجزاء أخرى.",
    opening: [
      "قد يبدو المشروع مرتبًا لأن أسماء المجلدات واضحة، بينما تبقى وحداته الداخلية متشابكة. الملف الذي يجمع الوصول إلى البيانات وقواعد العمل والواجهة، أو الوحدة التي تعتمد عليها أجزاء كثيرة، يصبح نقطة اختناق حتى لو كان موقعه داخل مجلد منظم.",
      "التحليل البنيوي يبحث عن الأدلة القابلة للقياس مثل حجم الملفات، كثافة الاستيرادات، دورات الاعتماد، وتكرار المقاطع. هذه المؤشرات لا تصدر حكمًا نهائيًا، لكنها تحدد أين تبدأ المراجعة البشرية.",
    ],
    checks: [
      ["الملفات متعددة المسؤوليات", "ملفات كبيرة تجمع وظائف لا تنتمي إلى سبب تغيير واحد وتحتاج إلى فصل تدريجي."],
      ["نقاط الاختناق", "وحدات تعتمد عليها أجزاء كثيرة؛ أي تغيير فيها يرفع احتمال التأثير على مساحة واسعة من التطبيق."],
      ["الاعتمادات الدائرية", "سلاسل استيراد تعود إلى نقطة البداية وتُصعّب الاختبار وإعادة الاستخدام والفصل."],
      ["التكرار البنيوي", "مقاطع متشابهة تشير إلى منطق يمكن توحيده بعد التأكد من أن السلوك المقصود متطابق."],
    ],
    steps: [
      "ابدأ بوحدة واحدة عالية الأثر بدل إعادة كتابة المشروع كاملًا.",
      "ثبّت السلوك الحالي باختبارات تركز على المدخلات والمخرجات المهمة.",
      "افصل حدود المسؤوليات وانقل الاعتمادات خلف واجهات واضحة.",
      "قارن نتيجة الفحص قبل التعديل وبعده، ولا تعتبر انخفاض عدد الملفات هدفًا بحد ذاته.",
    ],
    limitation: "إعادة البناء الناجحة تعتمد على سياق المنتج واختباراته؛ المؤشرات الآلية لا تعرف جميع القرارات المعمارية المقصودة.",
  },
  {
    slug: "github-repository-analysis",
    title: "تحليل مستودع GitHub العام دون تعديل الملفات | نَسَق",
    description: "طريقة آمنة لتحليل مستودع GitHub عام وقراءة بنيته وتبعياته ومؤشرات الحماية دون تسجيل دخول أو تعديل الملفات.",
    h1: "تحليل مستودع GitHub العام",
    lead: "يمكن بدء الفحص من رابط المستودع العام مباشرة، بصلاحية القراءة فقط ودون إنشاء التزامات أو فروع أو تعديلات داخل GitHub.",
    opening: [
      "عند إدخال رابط مستودع عام، ينتقل أرشيف المشروع من GitHub إلى المتصفح ثم يبدأ التحليل محليًا. لا يحتاج نَسَق إلى كلمة مرور أو رمز وصول للمستودعات العامة، ولا يرسل تعديلات إلى المستودع.",
      "قبل الفحص تأكد أن الرابط يشير إلى مستودع تملك حق مراجعته، وأنه لا يحتوي على بيانات شخصية أو أسرار غير مخصصة للتحليل. ظهور ملف داخل مستودع عام يعني أنه متاح أصلًا للقراءة العامة، لكنه لا يلغي مسؤولية التعامل الحذر مع النتائج.",
    ],
    checks: [
      ["خريطة المشروع", "التعرف على المجلدات وملفات المصدر والإعدادات ومديري الحزم المستخدمة."],
      ["جودة العينة", "تمييز الملفات التي أمكن تحليلها والملفات الثنائية أو الكبيرة التي جرى تجاوزها مع توضيح حدود التغطية."],
      ["البنية والحماية", "تجميع مؤشرات الترابط والأسرار والقواعد والإعدادات الحساسة في تقرير واحد مرتب."],
      ["خطة الإصلاح", "تحويل الملاحظات إلى أولويات تبدأ بالمخاطر الأعلى بدل عرض قائمة غير مرتبة."],
    ],
    steps: [
      "انسخ رابط المستودع العام من GitHub دون إضافة أي رمز وصول إلى الرابط.",
      "ابدأ الفحص وراجع نطاق الملفات التي شملها التقرير ونسبة التغطية.",
      "افتح تفاصيل كل ملاحظة وتحقق من الملف والسياق قبل تنفيذ الإجراء.",
      "نفّذ التغييرات في بيئتك المعتادة ثم أعد الفحص للتأكد من انخفاض المؤشرات.",
    ],
    limitation: "المستودعات الخاصة لا تعمل في هذه النسخة، والفحص لا ينفذ التطبيق أو اختبارات المشروع ولا يطابق كل تبعية مع قواعد ثغرات خارجية.",
  },
  {
    slug: "react-firebase-security",
    title: "مراجعة أمان مشاريع React وFirebase قبل الإنتاج | نَسَق",
    description: "قائمة مراجعة لمشاريع React وFirebase تشمل أسرار الواجهة وقواعد Firestore وإعدادات الاستضافة وحدود الحماية قبل الإنتاج.",
    h1: "مراجعة مشاريع React وFirebase",
    lead: "وجود مفاتيح إعداد Firebase داخل الواجهة ليس وحده دليلًا على اختراق؛ الحماية الفعلية تعتمد على قواعد الوصول والتحقق من الصلاحيات وفصل الأسرار الحقيقية.",
    opening: [
      "تطبيقات React تعمل في متصفح المستخدم، ولذلك يمكن قراءة الكود والقيم المضمّنة في الحزمة المنشورة. يجب ألا تحتوي الواجهة على مفاتيح خدمات إدارية أو رموز سرية، بينما تحتاج القيم العامة الخاصة بتهيئة Firebase إلى قواعد خلفية تمنع الوصول غير المصرح.",
      "المراجعة العملية تجمع بين كود الواجهة وقواعد Firestore وإعدادات Hosting وسياسة أمان المحتوى. فحص جزء واحد وترك بقية السلسلة قد يعطي إحساسًا زائفًا بالأمان.",
    ],
    checks: [
      ["قواعد Firestore", "البحث عن قواعد عامة مثل السماح غير المشروط بالقراءة أو الكتابة، ومراجعة الاعتماد على هوية المستخدم وشروط الملكية."],
      ["الأسرار في الواجهة", "التأكد من عدم تضمين مفاتيح إدارية أو رموز خدمات خاصة داخل متغيرات Vite أو ملفات JavaScript المنشورة."],
      ["سياسات المتصفح", "مراجعة رؤوس الحماية مثل CSP ومنع التأطير وسياسة الإحالة بما يناسب مصادر التطبيق الفعلية."],
      ["حدود الثقة", "عدم الاعتماد على إخفاء الأزرار في React كوسيلة حماية؛ القرار الحاسم يجب أن يطبق في القواعد أو الخادم."],
    ],
    steps: [
      "افصل القيم العامة للواجهة عن بيانات الاعتماد الإدارية والسرية.",
      "اختبر قواعد Firestore باستخدام حسابات وأدوار مختلفة وحالات رفض متوقعة.",
      "قلّص مصادر CSP إلى الخدمات الضرورية وتحقق من عدم كسر الوظائف الأساسية.",
      "راجع سجلات الوصول والتنبيهات بعد النشر ولا تعتمد على الفحص السابق للنشر وحده.",
    ],
    limitation: "هذا الفحص يراجع الملفات المتاحة فقط ولا يحاكي جميع محاولات تجاوز الصلاحيات أو سلوك خدمات Firebase وقت التشغيل.",
  },
  {
    slug: "npm-dependency-audit",
    title: "مراجعة تبعيات npm وملفات القفل | نَسَق كود",
    description: "دليل لمراجعة package.json وملفات القفل والإصدارات غير المقيدة وتقليل مخاطر التبعيات قبل النشر.",
    h1: "مراجعة تبعيات npm قبل النشر",
    lead: "قائمة الحزم ليست مجرد متطلبات بناء؛ كل تبعية تضيف كودًا وتحديثات ومسارًا محتملًا لمخاطر سلسلة التوريد.",
    opening: [
      "تبدأ المراجعة من مقارنة ملف package.json بملف القفل الفعلي. غياب ملف القفل أو استخدام إصدارات غير محددة يجعل إعادة البناء أقل قابلية للتوقع بين بيئات المطور والاختبار والإنتاج.",
      "لا يعني قدم الحزمة أنها تحتوي على ثغرة مؤكدة، كما لا يعني حداثتها أنها آمنة. القرار يحتاج إلى معرفة وظيفة الحزمة، مدى استخدامها، سجل تحديثها، ونتائج الاختبار بعد الترقية.",
    ],
    checks: [
      ["ملف القفل", "التأكد من وجود ملف قفل متوافق مع مدير الحزم المستخدم واعتماده داخل المستودع."],
      ["الإصدارات غير المقيدة", "رصد latest أو النطاقات الواسعة التي قد تغيّر ناتج البناء دون مراجعة صريحة."],
      ["الحزم غير الضرورية", "تمييز التبعيات التي يمكن إزالتها لتقليل مساحة الهجوم وحجم الصيانة والحزمة النهائية."],
      ["فصل بيئة التطوير", "وضع أدوات الاختبار والبناء في devDependencies عندما لا يحتاجها التطبيق وقت التشغيل."],
    ],
    steps: [
      "أنشئ نسخة قابلة للاستعادة قبل تحديث الحزم وراجع سجل التغييرات للإصدارات الرئيسية.",
      "حدّث مجموعة صغيرة من التبعيات في كل مرة لتسهيل عزل الأعطال.",
      "شغّل الاختبارات والبناء وافحص المسارات الأساسية بعد كل مجموعة تحديثات.",
      "احذف الحزم غير المستخدمة وأعد توليد ملف القفل من مصدر موثوق.",
    ],
    limitation: "نَسَق يراجع مؤشرات ملفات الحزم ولا يقدم في هذه النسخة مطابقة شاملة وفورية مع جميع قواعد بيانات CVE.",
  },
];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function renderGuide(guide) {
  const pageUrl = `${SITE_URL}/learn/${guide.slug}/`;
  const relatedGuides = guides.filter((item) => item.slug !== guide.slug).slice(0, 3);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: guide.h1,
      description: guide.description,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      datePublished: PUBLISHED_AT,
      dateModified: PUBLISHED_AT,
      inLanguage: "ar-SA",
      author: { "@type": "Organization", name: "نَسَق كود", url: SITE_URL },
      publisher: {
        "@type": "Organization",
        name: "نَسَق كود",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
      },
      image: `${SITE_URL}/nasq-inside-comparison.webp`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "نَسَق كود", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "مكتبة نَسَق", item: `${SITE_URL}/#knowledge` },
        { "@type": "ListItem", position: 3, name: guide.h1, item: pageUrl },
      ],
    },
  ];

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1B3A6B" />
    <meta name="description" content="${escapeHtml(guide.description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <link rel="canonical" href="${pageUrl}" />
    <link rel="alternate" hreflang="ar-SA" href="${pageUrl}" />
    <link rel="alternate" hreflang="x-default" href="${pageUrl}" />
    <link rel="icon" href="${assetPath("brand-icon.svg")}" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${assetPath("apple-touch-icon.png")}" />
    <link rel="stylesheet" href="${assetPath("seo-pages.css")}" />
    <meta property="og:title" content="${escapeHtml(guide.title)}" />
    <meta property="og:description" content="${escapeHtml(guide.description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:locale" content="ar_SA" />
    <meta property="og:site_name" content="نَسَق كود" />
    <meta property="og:image" content="${SITE_URL}/nasq-inside-comparison.webp" />
    <meta property="og:image:alt" content="مقارنة بين بنية برمجية متشابكة وبنية منظمة" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(guide.title)}" />
    <meta name="twitter:description" content="${escapeHtml(guide.description)}" />
    <meta name="twitter:image" content="${SITE_URL}/nasq-inside-comparison.webp" />
    <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script>
    <script src="${assetPath("seo-pages.js")}" defer></script>
    <title>${escapeHtml(guide.title)}</title>
  </head>
  <body>
    <header class="guide-header">
      <a class="guide-brand" href="${assetPath()}" aria-label="العودة إلى نَسَق كود">
        <img src="${assetPath("brand-icon.svg")}" width="43" height="48" alt="" />
        <span><strong>نَسَق</strong><small>كود</small></span>
      </a>
      <nav aria-label="التنقل الرئيسي">
        <a href="${assetPath()}#how">كيف يعمل</a>
        <a href="${assetPath()}#knowledge">مكتبة نَسَق</a>
        <a class="header-action" href="${assetPath()}#connect" data-track="start_scan" data-guide="${guide.slug}">افحص مشروعك</a>
      </nav>
    </header>

    <main>
      <article>
        <div class="guide-hero">
          <nav class="breadcrumbs" aria-label="مسار الصفحة">
            <a href="${assetPath()}">الرئيسية</a><span>←</span><a href="${assetPath()}#knowledge">المعرفة</a><span>←</span><span>${escapeHtml(guide.h1)}</span>
          </nav>
          <h1>${escapeHtml(guide.h1)}</h1>
          <p>${escapeHtml(guide.lead)}</p>
          <div class="hero-actions">
            <a class="primary-action" href="${assetPath()}#connect" data-track="start_scan" data-guide="${guide.slug}">ابدأ فحصًا آمنًا</a>
            <a class="secondary-action" href="${assetPath()}#knowledge" data-track="browse_guides" data-guide="${guide.slug}">تصفح بقية الأدلة</a>
          </div>
        </div>

        <section class="guide-copy" aria-labelledby="guide-introduction">
          <div class="section-label">الفكرة الأساسية</div>
          <div>
            <h2 id="guide-introduction">ما الذي يعنيه هذا الفحص؟</h2>
            ${guide.opening.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n            ")}
          </div>
        </section>

        <section class="guide-checks" aria-labelledby="guide-checks">
          <div class="section-heading">
            <span>نطاق المراجعة</span>
            <h2 id="guide-checks">أهم المؤشرات التي تستحق الانتباه</h2>
          </div>
          <div class="checks-list">
            ${guide.checks.map(([title, detail], index) => `<section><b>${(index + 1).toLocaleString("ar-SA")}</b><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div></section>`).join("\n            ")}
          </div>
        </section>

        <section class="guide-steps" aria-labelledby="guide-steps">
          <div>
            <span>بعد ظهور التقرير</span>
            <h2 id="guide-steps">كيف تحوّل النتيجة إلى إجراء؟</h2>
          </div>
          <ol>
            ${guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("\n            ")}
          </ol>
        </section>

        <aside class="scope-note" aria-label="حدود الفحص">
          <strong>حدود يجب أن تعرفها</strong>
          <p>${escapeHtml(guide.limitation)}</p>
        </aside>

        <section class="related-guides" aria-labelledby="related-title">
          <div class="section-heading">
            <span>اقرأ أيضًا</span>
            <h2 id="related-title">أدلة مرتبطة</h2>
          </div>
          <div>
            ${relatedGuides.map((item) => `<a href="${assetPath(`learn/${item.slug}/`)}"><strong>${escapeHtml(item.h1)}</strong><span>اقرأ الدليل ←</span></a>`).join("\n            ")}
          </div>
        </section>

        <section class="guide-cta">
          <div><h2>حوّل الملاحظات إلى خطة واضحة</h2><p>افحص مشروعك داخل المتصفح واحصل على ترتيب عملي للمخاطر وفرص التحسين.</p></div>
          <a href="${assetPath()}#connect" data-track="start_scan" data-guide="${guide.slug}">ابدأ الفحص</a>
        </section>
      </article>
    </main>

    <footer class="guide-footer">
      <a class="guide-brand compact" href="${assetPath()}">
        <img src="${assetPath("brand-icon.svg")}" width="34" height="38" alt="" />
        <span><strong>نَسَق</strong><small>كود</small></span>
      </a>
      <p>جميع الحقوق محفوظة © ٢٠٢٦ نَسَق كود</p>
      <a href="${assetPath()}">العودة إلى الموقع</a>
    </footer>

    <aside class="seo-consent" data-consent-banner hidden aria-label="خيارات قياس الزيارات">
      <p>نستخدم قياسًا محدودًا لمعرفة عدد الزيارات وتحسين نَسَق ولا نرسل ملفات مشروعك أو نتائج الفحص</p>
      <div><button data-consent="accepted">موافق</button><button data-consent="rejected">رفض</button></div>
    </aside>
  </body>
</html>`;
}

for (const guide of guides) {
  const guideDirectory = path.join(distDirectory, "learn", guide.slug);
  await mkdir(guideDirectory, { recursive: true });
  await writeFile(path.join(guideDirectory, "index.html"), renderGuide(guide), "utf8");
}

const sitemapEntries = [
  { url: `${SITE_URL}/`, priority: "1.0" },
  ...guides.map((guide) => ({ url: `${SITE_URL}/learn/${guide.slug}/`, priority: "0.8" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(({ url, priority }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${PUBLISHED_AT}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

await writeFile(path.join(distDirectory, "sitemap.xml"), sitemap, "utf8");
await writeFile(
  path.join(distDirectory, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  "utf8",
);

console.log(`Generated ${guides.length} SEO guide pages and sitemap.xml`);
