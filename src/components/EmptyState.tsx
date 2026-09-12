import { FileSearch } from 'lucide-react'

export function EmptyState({ title = 'لا توجد نتائج', detail = 'غيّر عوامل التصفية أو ابدأ فحصًا جديدًا' }: { title?: string; detail?: string }) {
  return <div className="empty-state"><FileSearch /><strong>{title}</strong><span>{detail}</span></div>
}
