export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="نَسَق كود">
      <svg className="brand-mark" viewBox="0 0 52 58" role="img" aria-hidden="true">
        <path d="M26 3 47 11v16c0 13-8.2 22.8-21 28C13.2 49.8 5 40 5 27V11L26 3Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="m15 28 7 7 15-16" fill="none" stroke="#33D6A6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 16h20" stroke="#E8B84B" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span><strong>نَسَق</strong>{!compact && <small>كود</small>}</span>
    </div>
  )
}
