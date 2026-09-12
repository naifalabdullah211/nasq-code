import { AlertTriangle, BrainCircuit, GitMerge, Layers3, ShieldCheck, X } from 'lucide-react'
import type { DeepAnalysis } from '../lib/deepAnalysis'

export function DeepAnalysisPanel({ analysis, onClose }: { analysis: DeepAnalysis; onClose: () => void }) {
  return (
    <section className="deep-analysis" id="deep-analysis" aria-labelledby="deep-analysis-title">
      <header className="deep-analysis-head">
        <div>
          <span>تحليل متعدد القواعد مع أدلة من المشروع</span>
          <h2 id="deep-analysis-title"><BrainCircuit /> التحليل العميق</h2>
        </div>
        <button onClick={onClose} aria-label="إغلاق التحليل العميق"><X /> إغلاق</button>
      </header>

      <div className="deep-summary">
        <div className="deep-score risk">
          <span><Layers3 /> مؤشر التشابك</span>
          <strong>{analysis.spaghettiRisk.toLocaleString('ar-SA')}</strong>
          <small>/ ١٠٠ وكلما ارتفع زاد الخطر</small>
        </div>
        <div className="deep-score protection">
          <span><ShieldCheck /> درجة الحماية</span>
          <strong>{analysis.protectionScore.toLocaleString('ar-SA')}</strong>
          <small>/ ١٠٠ ضمن الملفات المفحوصة</small>
        </div>
        <div className="deep-stat"><span>ملفات المصدر</span><strong>{analysis.sourceFiles.toLocaleString('ar-SA')}</strong></div>
        <div className="deep-stat"><span>روابط الاعتماد</span><strong>{analysis.dependencyEdges.toLocaleString('ar-SA')}</strong></div>
        <div className="deep-stat"><span>دورات الاعتماد</span><strong>{analysis.circularDependencies.length.toLocaleString('ar-SA')}</strong></div>
        <div className="deep-stat"><span>مقاطع متكررة</span><strong>{analysis.duplicateBlocks.toLocaleString('ar-SA')}</strong></div>
      </div>

      <p className="deep-verdict"><BrainCircuit /> {analysis.summary}</p>

      <div className="deep-columns">
        <section className="hotspots" aria-labelledby="hotspots-title">
          <div className="subsection-title">
            <span>ابدأ بالأعلى تأثيرًا</span>
            <h3 id="hotspots-title">نقاط الاختناق</h3>
          </div>
          {analysis.hotspots.length ? analysis.hotspots.map((item) => (
            <article key={item.file}>
              <div><code dir="ltr">{item.file}</code><strong>{item.score.toLocaleString('ar-SA')}</strong></div>
              <div className="hotspot-bar"><span style={{ width: `${item.score}%` }} /></div>
              <p>{item.reasons.join(' مع ')}</p>
            </article>
          )) : <p className="deep-empty">لم تظهر نقطة اختناق مرتفعة في الملفات التي تم تحليلها</p>}
        </section>

        <section className="deep-priorities" aria-labelledby="priorities-title">
          <div className="subsection-title">
            <span>دليل وإجراء وجهد متوقع</span>
            <h3 id="priorities-title">أولويات التنفيذ</h3>
          </div>
          {analysis.priorities.length ? <ol>{analysis.priorities.map((item) => (
            <li key={item.id}>
              <div className="priority-top">
                <span className={`severity ${item.severity}`}>{item.severity}</span>
                <span className="priority-area">{item.area}</span>
                <span className="priority-effort">الجهد {item.effort}</span>
              </div>
              <h4>{item.title}</h4>
              <p><b>الدليل</b> {item.evidence}</p>
              <p><b>الإجراء</b> {item.action}</p>
              <code dir="ltr">{item.file}{item.line ? `:${item.line}` : ''}</code>
            </li>
          ))}</ol> : <p className="deep-empty">لا توجد أولوية عميقة مؤكدة من القواعد الحالية</p>}
        </section>
      </div>

      {analysis.circularDependencies.length > 0 && (
        <section className="dependency-cycles">
          <h3><GitMerge /> الاعتمادات الدائرية</h3>
          {analysis.circularDependencies.map((cycle) => <code dir="ltr" key={cycle.join('|')}>{cycle.join(' → ')}</code>)}
        </section>
      )}

      <footer className="deep-limitations">
        <AlertTriangle />
        <div><strong>حدود التحليل</strong>{analysis.limitations.map((item) => <span key={item}>{item}</span>)}</div>
      </footer>
    </section>
  )
}
