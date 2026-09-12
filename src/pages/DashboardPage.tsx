import { Fragment, useMemo, useState } from "react";
import {
  Boxes,
  BrainCircuit,
  Braces,
  CircleAlert,
  FileCode2,
  FileText,
  Github,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { BrandMark } from "../components/BrandMark";
import { DeepAnalysisPanel } from "../components/DeepAnalysisPanel";
import { EmptyState } from "../components/EmptyState";
import { KPICard } from "../components/KPICard";
import type { ScanReport } from "../lib/analyzer";

const findings = [
  {
    id: 1,
    title: "مفتاح سري ظاهر في الكود",
    detail:
      "رُصدت قيمة حساسة في السطر ١٢ من ملف الإعدادات وتحتاج إلى مراجعة فورية",
    severity: "عالية",
    category: "الأمان",
    file: "config.ts",
  },
  {
    id: 2,
    title: "وحدة شديدة الترابط",
    detail: "الملف UserService.ts يجمع مسؤوليات متعددة ويتجاوز ٥٠٠ سطر",
    severity: "متوسطة",
    category: "البنية",
    file: "UserService.ts",
  },
  {
    id: 3,
    title: "إصدار تبعية غير مقيد",
    detail: "توجد حزمة تستخدم latest مما يمنع تثبيت إصدار متوقع في كل بيئة",
    severity: "منخفضة",
    category: "التبعيات",
    file: "package.json",
  },
];

const severityOrder = { عالية: 0, متوسطة: 1, منخفضة: 2 } as const;

function repairAction(title: string, category: string) {
  if (title.includes("سري") || title.includes("مفتاح") || title.includes("حساسة")) return "ألغ القيمة المكشوفة ودوّر المفتاح ثم انقلها إلى متغير بيئة"
  if (title.includes("eval")) return "استبدل التنفيذ الديناميكي بمسار صريح يقيّد المدخلات"
  if (title.includes("مضغوطة")) return "فك ملفات المشروع ثم أعد إنشاء ZIP يحتوي الملفات المصدرية مباشرة"
  if (title.includes("ملفات مصدر")) return "أرفق مجلد المصدر الحقيقي بدل ملفات النشر أو الحزم المغلقة"
  if (title.includes("قفل")) return "ولّد ملف قفل بأداة مدير الحزم واعتمده في المستودع"
  if (category === "البنية") return "قسّم الملف إلى وحدات أصغر وحدد مسؤولية واضحة لكل وحدة"
  if (category === "التبعيات") return "ثبّت إصدارًا محددًا واختبر التحديث قبل اعتماده"
  if (category === "الأمان") return "راجع تدفق المدخلات وعقّمها قبل وصولها إلى هذا الموضع"
  return "حوّل الملاحظة إلى مهمة محددة ثم أعد الفحص بعد تنفيذها"
}

export function DashboardPage({
  onBack,
  report,
  isDemo,
}: {
  onBack: () => void;
  report: ScanReport | null;
  isDemo: boolean;
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("الكل");
  const [category, setCategory] = useState("الكل");
  const [planReady, setPlanReady] = useState(false);
  const [deepOpen, setDeepOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const reportFindings = report?.findings ?? findings;
  const visible = useMemo(
    () =>
      reportFindings.filter(
        (item) =>
          (severity === "الكل" || item.severity === severity) &&
          (category === "الكل" || item.category === category) &&
          `${item.title} ${item.detail} ${item.file ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, severity, category, reportFindings],
  );
  const projectName = report?.projectName ?? "naif/project";
  const scores = report?.scores ?? {
    البنية: 82,
    الأمان: 71,
    التبعيات: 88,
    "قابلية الصيانة": 69,
  };
  const overall = report?.overall ?? 78;
  const scoreAvailable = report?.scoreAvailable ?? true;
  const planItems = useMemo(
    () => [...reportFindings].sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]),
    [reportFindings],
  );
  const showPlan = () => {
    setPlanReady(true);
    requestAnimationFrame(() => document.getElementById("repair-plan")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const showDeepAnalysis = () => {
    if (!report?.deepAnalysis) return;
    setDeepOpen(true);
    requestAnimationFrame(() => document.getElementById("deep-analysis")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <BrandMark />
        <nav>
          {[
            [LayoutDashboard, "نظرة عامة", "الكل"],
            [Boxes, "البنية", "البنية"],
            [ShieldCheck, "الأمان", "الأمان"],
            [PackageSearch, "التبعيات", "التبعيات"],
            [Braces, "جودة الكود", "قابلية الصيانة"],
          ].map(([Icon, label, value]) => {
            const NavIcon = Icon as typeof LayoutDashboard;
            return (
              <button
                className={category === value ? "active" : ""}
                key={String(label)}
                onClick={() => setCategory(String(value))}
              >
                <NavIcon />
                {String(label)}
              </button>
            );
          })}
          <button onClick={showPlan}>
            <Wrench />
            خطة الإصلاح
          </button>
        </nav>
        <div className="sidebar-foot">
          <button onClick={onBack}>
            <LogOut />
            العودة للرئيسية
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-top">
          <div className="repo-select">
            <Github />
            <span dir="auto">{projectName}</span>
          </div>
          <button className="back-link" onClick={onBack}>
            <LogOut />
            العودة للرئيسية
          </button>
        </header>
        <main className="report-page">
          <div className="page-header">
            <div>
              <span>
                المشاريع / <b dir="auto">{projectName}</b>
              </span>
              <h1>
                <FileText /> تقرير الفحص
              </h1>
              <p>
                {report
                  ? `فُحص ${report.scannedFilesCount.toLocaleString("ar-SA")} من أصل ${report.filesCount.toLocaleString("ar-SA")} ملفًا دون حفظ المشروع`
                  : "تقرير تجريبي يوضح شكل النتائج وخطة الإصلاح"}
              </p>
            </div>
            <div>
              <small>
                {isDemo ? "بيانات تجريبية وليست نتيجة فحص" : `آخر فحص ${report?.scannedAt ?? ""}`}
              </small>
              <ActionButton
                variant="secondary"
                icon={<RefreshCw />}
                onClick={onBack}
              >
                فحص مشروع آخر
              </ActionButton>
              <ActionButton
                icon={<Wrench />}
                onClick={showPlan}
              >
                عرض خطة الإصلاح
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon={<BrainCircuit />}
                onClick={showDeepAnalysis}
                disabled={isDemo || !report?.deepAnalysis}
              >
                التحليل العميق
              </ActionButton>
            </div>
          </div>
          {isDemo && <div className="demo-banner" role="status">هذا نموذج توضيحي ولا يمثل فحصًا حقيقيًا لمشروعك</div>}
          {report && (
            <section className="coverage-panel" aria-label="نطاق الفحص">
              <div><span>ثقة النتيجة</span><strong>{report.confidence}</strong></div>
              <div><span>ملفات فُحصت</span><strong>{report.scannedFilesCount.toLocaleString("ar-SA")}</strong></div>
              <div><span>ملفات لم تُفحص</span><strong>{report.skippedFilesCount.toLocaleString("ar-SA")}</strong></div>
              <p>{report.limitations[0]}</p>
            </section>
          )}
          {deepOpen && report?.deepAnalysis && <DeepAnalysisPanel analysis={report.deepAnalysis} onClose={() => setDeepOpen(false)} />}
          {planReady && (
            <section className="repair-plan" id="repair-plan" aria-labelledby="repair-plan-title">
              <div className="repair-plan-head">
                <div><span>مرتبة حسب الخطورة</span><h2 id="repair-plan-title">خطة الإصلاح</h2></div>
                <button onClick={() => setPlanReady(false)}>إخفاء الخطة</button>
              </div>
              {planItems.length ? (
                <ol>
                  {planItems.map((item) => <li key={item.id}>
                    <span className={`severity ${item.severity}`}>{item.severity}</span>
                    <div><strong>{item.title}</strong><p>{repairAction(item.title, item.category)}</p><code dir="ltr">{item.file ?? "المشروع"}</code></div>
                  </li>)}
                </ol>
              ) : <p className="plan-empty">لا توجد إجراءات مؤكدة من هذا الفحص المبدئي</p>}
              {report?.limitations?.length ? <div className="limitations"><strong>حدود التقرير</strong><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            </section>
          )}
          <section className="score-panel">
            <div className="overall-score">
              <span>
                <FileCode2 /> النتيجة الإجمالية
              </span>
              <strong>{scoreAvailable ? overall.toLocaleString("ar-SA") : "—"}</strong>
              {scoreAvailable && <small>/ ١٠٠</small>}
            </div>
            <KPICard label="البنية" score={scoreAvailable ? scores["البنية"] : null} icon={Boxes} />
            <KPICard
              label="الأمان"
              score={scoreAvailable ? scores["الأمان"] : null}
              icon={ShieldCheck}
              tone={scores["الأمان"] < 80 ? "gold" : undefined}
            />
            <KPICard
              label="التبعيات"
              score={scoreAvailable ? scores["التبعيات"] : null}
              icon={PackageSearch}
            />
            <KPICard
              label="قابلية الصيانة"
              score={scoreAvailable ? scores["قابلية الصيانة"] : null}
              icon={Wrench}
              tone={scores["قابلية الصيانة"] < 80 ? "gold" : undefined}
            />
          </section>
          <section className="results-section">
            <div className="filters">
              <label>
                <Search />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث في النتائج أو اسم الملف"
                />
              </label>
              <label>
                <SlidersHorizontal />
                <select
                  aria-label="تصفية حسب الخطورة"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="الكل">كل مستويات الخطورة</option>
                  <option>عالية</option>
                  <option>متوسطة</option>
                  <option>منخفضة</option>
                </select>
              </label>
              <button
                onClick={() => {
                  setQuery("");
                  setSeverity("الكل");
                  setCategory("الكل");
                }}
              >
                مسح الفلاتر
              </button>
            </div>
            {visible.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>م</th>
                      <th>البيان</th>
                      <th>التفاصيل</th>
                      <th>الخطورة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <Fragment key={item.id}>
                        <tr>
                          <td data-label="الرقم">{item.id.toLocaleString("ar-SA")}</td>
                          <td data-label="البيان">
                            <strong>
                              <CircleAlert />
                              {item.title}
                            </strong>
                          </td>
                          <td data-label="التفاصيل">{item.detail}</td>
                          <td data-label="الخطورة">
                            <span className={`severity ${item.severity}`}>
                              {item.severity}
                            </span>
                          </td>
                          <td data-label="الإجراء">
                            <button
                              className="details-button"
                              aria-expanded={expandedId === item.id}
                              onClick={() =>
                                setExpandedId(
                                  expandedId === item.id ? null : item.id,
                                )
                              }
                            >
                              {expandedId === item.id
                                ? "إخفاء"
                                : "عرض التفاصيل"}
                            </button>
                          </td>
                        </tr>
                        {expandedId === item.id && (
                          <tr
                            className="details-row"
                            key={`${item.id}-details`}
                          >
                            <td colSpan={5}>
                              <div>
                                <span>
                                  <b>التصنيف</b>
                                  {item.category}
                                </span>
                                <span>
                                  <b>الملف</b>
                                  <code dir="ltr">
                                    {item.file ?? "غير محدد"}
                                  </code>
                                </span>
                                <span>
                                  <b>الأولوية</b>
                                  {item.severity === "عالية"
                                    ? "عالجها قبل النشر"
                                    : item.severity === "متوسطة"
                                      ? "راجعها ضمن خطة الإصلاح"
                                      : "حسّنها عند الصيانة"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
