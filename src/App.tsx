import { useEffect, useState } from 'react'
import { IntroSplash } from './components/IntroSplash'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import type { ScanReport } from './lib/analyzer'

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
  const [showIntro, setShowIntro] = useState(true)
  const [report, setReport] = useState<ScanReport | null>(() => restoreReport())
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem(DEMO_KEY) === 'true')
  const [view, setView] = useState<View>(() => window.location.hash === '#report' && (restoreReport() || sessionStorage.getItem(DEMO_KEY) === 'true') ? 'dashboard' : 'landing')
  useEffect(() => {
    const listener = () => setView(window.location.hash === '#report' && (restoreReport() || sessionStorage.getItem(DEMO_KEY) === 'true') ? 'dashboard' : 'landing')
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  const go = (next: View) => { window.location.hash = next === 'dashboard' ? 'report' : ''; setView(next); window.scrollTo({ top: 0 }) }

  if (showIntro) return <IntroSplash onComplete={() => setShowIntro(false)} />

  return view === 'dashboard'
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
}
