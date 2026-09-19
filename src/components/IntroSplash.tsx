import { useEffect, useState } from 'react'

const INTRO_IMAGE = `${import.meta.env.BASE_URL}nasq-inside-comparison.webp`

type IntroSplashProps = {
  onComplete: () => void
}

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setIsLeaving(true), 7000)
    const closeTimer = window.setTimeout(onComplete, 7550)

    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(closeTimer)
    }
  }, [onComplete])

  const close = () => {
    setIsLeaving(true)
    window.setTimeout(onComplete, 420)
  }

  return (
    <section
      className={`intro-splash show-image${isLeaving ? ' is-leaving' : ''}`}
      aria-label="مقدمة نَسَق كود"
    >
      <div className="intro-splash__lead">
        <span>من الخارج</span>
        <strong>قد يبدو المشروعان متشابهين</strong>
      </div>

      <div className="intro-splash__visual">
        <img
          src={INTRO_IMAGE}
          alt="مبنيان متشابهان من الخارج وبنية فوضوية وأخرى منظمة في الداخل"
          fetchPriority="high"
          decoding="sync"
        />
        <h1>
          الفرق
          <em>جوهري</em>
        </h1>
      </div>

      <div className="intro-splash__message">
        <strong>نَسَق يرى ما لا يظهر في الواجهة</strong>
        <span>يكشف الفوضى الخفية ومخاطر الحماية ويحوّلها إلى أولويات إصلاح واضحة</span>
      </div>

      <button type="button" className="intro-splash__skip" onClick={close}>
        تخطَّ المقدمة
      </button>

      <div className="intro-splash__progress" aria-hidden="true">
        <i />
      </div>
    </section>
  )
}
