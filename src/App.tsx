import { useEffect, useState } from 'react'
import { IntroSplash } from './components/IntroSplash'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import type { ScanReport } from './lib/analyzer'
import { getAnalyticsConsent, saveAnalyticsConsent, startAnalytics, trackPageView, type AnalyticsConsent } from './lib/analytics'

type View = 'landing' | 'dashboard'
const REPORT_KEY = 'nasq-code-report-v3'
const DEMO_KEY = 'nasq-code-demo'

function restoreReport(): ScanReport | null {
  try {
    const saved = sessionStorage.getItem(REPORT_KEY)
    if (!saved) return null
    const report = JSON.parse(saved) as ScanReport
    return report && Array.isArray(report.findings) && typeof report.overall === 'number' ? report : null
  } catch {
    return null
  }
}

export default function App() {
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent())
  const [showIntro, setShowIntro] = useState(true)
  const [report, setReport] = useState<ScanReport | null>(() => restoreReport())
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem(DEMO_KEY) === 'true')
  const [view, setView] = useState<View>(() => window.location.hash === '#report' && (restoreReport() || sessionStorage.getItem(DEMO_KEY) === 'true') ? 'dashboard' : 'landing')
  useEffect(() => {
    const listener = () => setView(window.location.hash === '#report' && (restoreReport() || sessionStorage.getItem(DEMO_KEY) === 'true') ? 'dashboard' : 'landing')
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  useEffect(() => {
    if (analyticsConsent !== 'accepted') return
    startAnalytics()
    const listener = () => trackPageView()
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [analyticsConsent])
  const chooseAnalytics = (consent: AnalyticsConsent) => {
    saveAnalyticsConsent(consent)
    setAnalyticsConsent(consent)
  }
  const go = (next: View) => { window.location.hash = next === 'dashboard' ? 'report' : ''; setView(next); window.scrollTo({ top: 0 }) }

  const page = view === 'dashboard'
    ? <DashboardPage onBack={() => go('landing')} report={report} isDemo={isDemo} />
    : <LandingPage
        onOpenDemo={() => {
          sessionStorage.removeItem(REPORT_KEY)
          sessionStorage.setItem(DEMO_KEY, 'true')
          setReport(null)
          setIsDemo(true)
          go('dashboard')
        }}
        onScan={(result) => {
          sessionStorage.setItem(REPORT_KEY, JSON.stringify(result))
          sessionStorage.removeItem(DEMO_KEY)
          setReport(result)
          setIsDemo(false)
          go('dashboard')
        }}
      />

  return (
    <>
      {showIntro && <IntroSplash onComplete={() => setShowIntro(false)} />}
      {page}
      {analyticsConsent === null && (
        <aside className="analytics-consent" aria-label="خيارات قياس الزيارات">
          <p>نستخدم قياسًا محدودًا لمعرفة عدد الزيارات وتحسين نَسَق ولا نرسل ملفات مشروعك أو نتائج الفحص</p>
          <div>
            <button className="consent-accept" onClick={() => chooseAnalytics('accepted')}>موافق</button>
            <button onClick={() => chooseAnalytics('rejected')}>رفض</button>
          </div>
        </aside>
      )}
    </>
  )
}
