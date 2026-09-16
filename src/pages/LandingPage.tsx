import { useState } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Boxes,
  Braces,
  Check,
  ChevronLeft,
  Github,
  GitBranch,
  LockKeyhole,
  PackageSearch,
  Play,
  ShieldCheck,
  Upload,
  Wrench,
} from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { BrandMark } from "../components/BrandMark";
import { ConnectDialog } from "../components/ConnectDialog";
import type { ScanReport } from "../lib/analyzer";
import { trackEvent } from "../lib/analytics";

const knowledgeGuides = [
  {
    href: "learn/code-security-scan/",
    title: "فحص أمان الكود قبل النشر",
    detail: "نقاط عملية لاكتشاف الأسرار والإعدادات المفتوحة والأنماط الحساسة",
  },
  {
    href: "learn/spaghetti-code-analysis/",
    title: "اكتشاف الكود المتشابك",
    detail: "كيف تميّز التشابك البنيوي وتحدد أول أجزاء المشروع التي تحتاج إلى فصل",
  },
  {
    href: "learn/github-repository-analysis/",
    title: "تحليل مستودع GitHub",
    detail: "قراءة بنية المستودع العام وتبعياته دون تعديل ملفاته",
  },
  {
    href: "learn/react-firebase-security/",
    title: "مراجعة مشاريع React وFirebase",
    detail: "فحص الواجهة والقواعد والإعدادات قبل الانتقال إلى بيئة الإنتاج",
  },
  {
    href: "learn/npm-dependency-audit/",
    title: "مراجعة تبعيات npm",
    detail: "تثبيت الإصدارات وملفات القفل وتقليل مخاطر سلسلة التوريد",
  },
];

export function LandingPage({
  onOpenDemo,
  onScan,
}: {
  onOpenDemo: () => void;
  onScan: (report: ScanReport) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSource, setDialogSource] = useState<"github" | "zip">("github");
  const [policy, setPolicy] = useState<"privacy" | "security" | "terms" | null>(
    null,
  );
  const openScanner = (source: "github" | "zip", placement: string) => {
    trackEvent("scan_dialog_opened", { source, placement });
    setDialogSource(source);
    setDialogOpen(true);
  };
  return (
    <div className="landing">
      <header className="site-header">
        <BrandMark />
        <nav aria-label="التنقل الرئيسي">
          <a href="#how">كيف يعمل</a>
          <a href="#layers">المزايا</a>
          <a href="#connect">التكاملات</a>
          <a href="#knowledge">المعرفة</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>
              كود أوضح
              <br />
              <em>مخاطر أقل</em>
            </h1>
            <p>
              افحص بنية مشروعك وتبعياته وحمايته واحصل على أولويات إصلاح مبنية على أدلة دون تعديل أي ملف
            </p>
            <div className="hero-actions">
              <ActionButton
                onClick={() => openScanner("github", "hero")}
                icon={<ArrowLeft />}
              >
                ابدأ فحصًا آمنًا
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={onOpenDemo}
                icon={<Play />}
              >
                شاهد نموذج التقرير
              </ActionButton>
            </div>
            <div className="trust-line">
              <LockKeyhole />
              <span>قراءة فقط</span>
              <span>دون تعديل الملفات</span>
              <span>لا نحفظ المشروع</span>
            </div>
          </div>

          <div className="report-preview" aria-label="معاينة تقرير الفحص">
            <div className="preview-top">
              <strong>نموذج التقرير</strong>
              <span>
                <Check /> تم الفحص قبل ٣ دقائق
              </span>
            </div>
            <div className="repo-row">
              <Github />
              <strong dir="ltr">acme / platform</strong>
              <code>main</code>
            </div>
            <h2>أهم النتائج</h2>
            <p>تم العثور على ١٢ ملاحظة تتطلب اهتمامًا</p>
            {[
              [
                "مفتاح سري ظاهر في الكود",
                "رُصدت قيمة حساسة تحتاج إلى مراجعة فورية",
                "عالية",
                "red",
              ],
              [
                "وحدة شديدة الترابط",
                "مكوّن يجمع مسؤوليات متعددة",
                "متوسطة",
                "gold",
              ],
              ["حزمة قديمة", "يتوفر إصدار أمني أحدث", "منخفضة", "mint"],
            ].map(([title, detail, level, tone]) => (
              <div className="finding" key={title}>
                <i className={tone} />
                <div>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </div>
                <small className={tone}>{level}</small>
                <ChevronLeft />
              </div>
            ))}
          </div>
        </section>

        <section
          id="connect"
          className="integrations"
          aria-label="مصادر المشاريع"
        >
          <button onClick={() => openScanner("github", "integrations")}>
            <Github />
            <strong>GitHub</strong>
            <span>افحص مستودعًا عامًا</span>
          </button>
          <button disabled>
            <GitBranch />
            <strong>GitLab</strong>
            <span>قريبًا</span>
          </button>
          <button disabled>
            <Archive />
            <strong>Bitbucket</strong>
            <span>قريبًا</span>
          </button>
          <button onClick={() => openScanner("zip", "integrations")}>
            <Upload />
            <strong>ملف ZIP</strong>
            <span>ارفعه وافحصه</span>
          </button>
        </section>

        <section id="layers" className="layers-section">
          <div className="section-heading">
            <h2>فحص شامل في أربع طبقات</h2>
            <p>صورة واضحة عن الحالة الحالية والمخاطر وفرص التحسين</p>
          </div>
          <div className="layers-rail">
            {[
              [Braces, "البنية", "كشف التشابك ونقاط الاختناق ودورات الاعتماد"],
              [ShieldCheck, "الأمان", "كشف الأسرار والقواعد المفتوحة والأنماط غير الآمنة"],
              [PackageSearch, "التبعيات", "مراجعة ملفات الحزم والإصدارات غير المقيدة"],
              [Wrench, "قابلية الصيانة", "رصد الملفات الكبيرة ومؤشرات الترابط"],
            ].map(([Icon, title, detail]) => {
              const LayerIcon = Icon as typeof Braces;
              return (
                <article key={String(title)}>
                  <span>
                    <LayerIcon />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(detail)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how" className="workflow-section">
          <div className="workflow-visual">
            <div className="code-sheet">
              <Boxes />
              <span />
              <span />
              <span />
            </div>
            <div className="result-sheet">
              <LockKeyhole />
              <Check />
              <Braces />
            </div>
          </div>
          <div className="workflow-copy">
            <h2>من المستودع إلى خطة إصلاح واضحة</h2>
            <p>ثلاث خطوات تنقلك من الكود الخام إلى أولويات قابلة للتنفيذ</p>
            <ol>
              <li>
                <b>١</b>
                <div>
                  <strong>اربط المصدر</strong>
                  <span>اختر مستودعًا أو ارفع ملف ZIP</span>
                </div>
              </li>
              <li>
                <b>٢</b>
                <div>
                  <strong>نفّذ الفحص الآمن</strong>
                  <span>تحليل ساكن ومبدئي بصلاحية القراءة فقط</span>
                </div>
              </li>
              <li>
                <b>٣</b>
                <div>
                  <strong>استلم خطة مرتبة</strong>
                  <span>ابدأ بالمخاطر الأعلى ثم أصلح دون فوضى</span>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="knowledge" className="knowledge-section" aria-labelledby="knowledge-title">
          <div className="knowledge-intro">
            <span><BookOpen /> مكتبة نَسَق</span>
            <h2 id="knowledge-title">أدلة عملية لكود أوضح ومخاطر أقل</h2>
            <p>محتوى مختصر يساعدك على فهم نتيجة الفحص وتحويلها إلى خطوات قابلة للتنفيذ</p>
          </div>
          <div className="knowledge-list">
            {knowledgeGuides.map((guide, index) => (
              <a
                href={`${import.meta.env.BASE_URL}${guide.href}`}
                key={guide.href}
                onClick={() => trackEvent("knowledge_guide_opened", { guide: guide.href })}
              >
                <b>{(index + 1).toLocaleString("ar-SA")}</b>
                <div>
                  <h3>{guide.title}</h3>
                  <p>{guide.detail}</p>
                </div>
                <ArrowLeft />
              </a>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <div>
            <h2>ابدأ من مشروعك الحالي</h2>
            <p>اكتشف المخاطر وحسّن جودة الكود بخطوات واضحة</p>
          </div>
          <div>
            <ActionButton onClick={() => openScanner("zip", "final_cta")} icon={<Upload />}>
              فحص ملف ZIP
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={onOpenDemo}
              icon={<Play />}
            >
              مشاهدة تقرير تجريبي
            </ActionButton>
          </div>
        </section>
      </main>
      <footer>
        <BrandMark compact />
        <div className="copyright-notice">
          <span>جميع الحقوق محفوظة © ٢٠٢٦ نَسَق كود</span>
          <small>لا يسمح بنسخ المحتوى أو إعادة استخدامه دون إذن كتابي</small>
        </div>
        <nav aria-label="روابط السياسات">
          <button onClick={() => setPolicy("privacy")}>الخصوصية</button>
          <button onClick={() => setPolicy("security")}>الأمان</button>
          <button onClick={() => setPolicy("terms")}>شروط الاستخدام</button>
        </nav>
      </footer>
      <ConnectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDemo={() => {
          setDialogOpen(false);
          onOpenDemo();
        }}
        onScan={(report) => {
          setDialogOpen(false);
          onScan(report);
        }}
        initialSource={dialogSource}
      />
      {policy && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setPolicy(null)
          }
        >
          <section
            className="dialog policy-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-title"
          >
            <button
              className="icon-button dialog-close"
              onClick={() => setPolicy(null)}
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 id="policy-title">
              {policy === "privacy"
                ? "الخصوصية"
                : policy === "security"
                  ? "الأمان"
                  : "شروط الاستخدام"}
            </h2>
            {policy === "privacy" && (
              <>
                <p>يُفحص ملف ZIP داخل متصفحك ولا يُرسل إلى خوادم نَسَق كود</p>
                <p>المستودع العام ينتقل من GitHub مباشرة إلى متصفحك ولا نحفظ محتواه</p>
                <p>لا نحفظ ملفات المشروع أو نتائج الفحص بعد إغلاق الصفحة</p>
                <p>بعد موافقتك فقط نستخدم Google Analytics لقياس عدد الزيارات ومشاهدات الصفحات وبيانات الجهاز العامة ولا نرسل ملفات مشروعك أو نتائج الفحص</p>
              </>
            )}
            {policy === "security" && (
              <>
                <p>الفحص للقراءة فقط ولا يغيّر أي ملف داخل مشروعك</p>
                <p>
                  لا ترفع مشروعًا يحتوي على بيانات شخصية أو أسرار غير مخصصة
                  للفحص
                </p>
              </>
            )}
            {policy === "terms" && (
              <>
                <p>
                  النتائج مؤشرات آلية للمراجعة وليست ضمانًا لاكتشاف جميع الثغرات
                </p>
                <p>أنت مسؤول عن مراجعة النتائج قبل تطبيق أي تغيير على مشروعك</p>
                <p>المحتوى والتصميم والهوية البصرية مملوكة لنَسَق كود ولا يسمح بنسخها أو إعادة استخدامها دون إذن كتابي</p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
