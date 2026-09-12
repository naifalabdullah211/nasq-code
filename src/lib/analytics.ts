const MEASUREMENT_ID = 'G-HLF60MJXVP'
const CONSENT_KEY = 'nasq-analytics-consent'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export type AnalyticsConsent = 'accepted' | 'rejected'

export function getAnalyticsConsent(): AnalyticsConsent | null {
  const saved = localStorage.getItem(CONSENT_KEY)
  return saved === 'accepted' || saved === 'rejected' ? saved : null
}

export function saveAnalyticsConsent(consent: AnalyticsConsent) {
  localStorage.setItem(CONSENT_KEY, consent)
  if (consent === 'accepted') startAnalytics()
}

export function startAnalytics() {
  if (document.querySelector(`script[data-nasq-analytics="${MEASUREMENT_ID}"]`)) return

  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args)
  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    page_path: `${window.location.pathname}${window.location.hash}`,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  script.dataset.nasqAnalytics = MEASUREMENT_ID
  document.head.appendChild(script)
}

export function trackPageView() {
  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.hash}`,
  })
}
