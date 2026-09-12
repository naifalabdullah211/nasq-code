import type { LucideIcon } from 'lucide-react'

export function KPICard({ label, score, icon: Icon, tone = 'mint' }: { label: string; score: number | null; icon: LucideIcon; tone?: 'mint' | 'gold' }) {
  return (
    <div className={`kpi ${tone}`}>
      <div className="kpi-label"><Icon size={20} strokeWidth={1.8} /><span>{label}</span></div>
      <div className="kpi-score"><strong>{score === null ? '—' : score.toLocaleString('ar-SA')}</strong>{score !== null && <span>/ ١٠٠</span>}</div>
      <div className="progress"><span style={{ width: `${score ?? 0}%` }} /></div>
    </div>
  )
}
