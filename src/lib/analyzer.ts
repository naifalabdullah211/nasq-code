import { unzip } from 'fflate'

export type Severity = 'عالية' | 'متوسطة' | 'منخفضة'
export type FindingCategory = 'الأمان' | 'البنية' | 'التبعيات' | 'قابلية الصيانة'

export type ScanFinding = {
  id: number
  title: string
  detail: string
  severity: Severity
  category: FindingCategory
  file?: string
}

export type ScanReport = {
  projectName: string
  scannedAt: string
  filesCount: number
  findings: ScanFinding[]
  scores: Record<FindingCategory, number>
  overall: number
  scannedFilesCount: number
  skippedFilesCount: number
  confidence: 'عالية' | 'متوسطة' | 'منخفضة'
  limitations: string[]
  scoreAvailable: boolean
}

const MAX_ZIP_SIZE = 20 * 1024 * 1024
const MAX_FILES = 5000
const MAX_UNPACKED_SIZE = 100 * 1024 * 1024
const MAX_TEXT_FILE_SIZE = 1024 * 1024
const ignoredParts = ['/node_modules/', '/.git/', '/dist/', '/build/', '/coverage/', '/vendor/']
const textExtensions = new Set(['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'md', 'yml', 'yaml', 'env', 'py', 'rb', 'php', 'java', 'kt', 'kts', 'swift', 'go', 'rs', 'sh', 'tf', 'tfvars', 'toml', 'xml', 'properties', 'gradle', 'c', 'cpp', 'h', 'hpp', 'cs', 'vue', 'svelte', 'sql'])
const sourceExtensions = new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'java', 'kt', 'kts', 'swift', 'go', 'rs', 'sh', 'c', 'cpp', 'h', 'hpp', 'cs', 'vue', 'svelte', 'sql'])
const nestedArchiveExtensions = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz'])

function isTextFile(path: string) {
  const normalized = `/${path.toLowerCase()}`
  if (ignoredParts.some((part) => normalized.includes(part))) return false
  const name = path.split('/').pop() ?? ''
  if (name.startsWith('.env')) return true
  if (name.toLowerCase() === 'dockerfile') return true
  const extension = name.includes('.') ? name.split('.').pop() ?? '' : ''
  return textExtensions.has(extension)
}

function lineNumber(text: string, index: number) {
  return text.slice(0, index).split('\n').length
}

function inspectZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const minimum = Math.max(0, bytes.byteLength - 65_557)
  let endOffset = -1
  for (let index = bytes.byteLength - 22; index >= minimum; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      endOffset = index
      break
    }
  }
  if (endOffset < 0) throw new Error('ملف ZIP غير صالح')
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralOffset = view.getUint32(endOffset + 16, true)
  if (entryCount === 0xffff || centralOffset === 0xffffffff) throw new Error('صيغة ZIP64 غير مدعومة حاليًا')
  if (entryCount > MAX_FILES) throw new Error('المشروع يحتوي على أكثر من ٥٠٠٠ ملف')

  let cursor = centralOffset
  let totalSize = 0
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > endOffset || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('بنية ملف ZIP غير صالحة')
    if ((view.getUint16(cursor + 8, true) & 1) !== 0) throw new Error('ملفات ZIP المشفرة بكلمة مرور غير مدعومة')
    totalSize += view.getUint32(cursor + 24, true)
    if (totalSize > MAX_UNPACKED_SIZE) throw new Error('حجم الملفات بعد فك الضغط يتجاوز ١٠٠ ميجابايت')
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    cursor += 46 + nameLength + extraLength + commentLength
  }
}

export async function analyzeZip(file: File): Promise<ScanReport> {
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('اختر ملفًا بصيغة ZIP')
  if (file.size > MAX_ZIP_SIZE) throw new Error('حجم الملف يتجاوز ٢٠ ميجابايت')

  const compressedBytes = new Uint8Array(await file.arrayBuffer())
  inspectZip(compressedBytes)
  let archive: Record<string, Uint8Array>
  try {
    archive = await new Promise((resolve, reject) => {
      unzip(compressedBytes, (error, data) => error ? reject(error) : resolve(data))
    })
  } catch {
    throw new Error('تعذر فتح الملف المضغوط أو أن الملف غير صالح')
  }

  const entries = Object.entries(archive).filter(([path]) => !path.endsWith('/'))
  if (entries.length > MAX_FILES) throw new Error('المشروع يحتوي على أكثر من ٥٠٠٠ ملف')
  const unpackedSize = entries.reduce((sum, [, bytes]) => sum + bytes.byteLength, 0)
  if (unpackedSize > MAX_UNPACKED_SIZE) throw new Error('حجم الملفات بعد فك الضغط يتجاوز ١٠٠ ميجابايت')

  const decoder = new TextDecoder('utf-8', { fatal: false })
  const findings: Omit<ScanFinding, 'id'>[] = []
  let hasLockfile = false
  let hasEnv = false
  let hasEnvExample = false
  let scannedFilesCount = 0
  let sourceFilesCount = 0
  let oversizedTextFiles = 0
  const nestedArchives: string[] = []
  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null = null

  for (const [path, bytes] of entries) {
    const normalized = path.replace(/\\/g, '/')
    const basename = normalized.split('/').pop()?.toLowerCase() ?? ''
    const extension = basename.includes('.') ? basename.split('.').pop() ?? '' : ''
    const isLockfile = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].includes(basename)
    if (nestedArchiveExtensions.has(extension)) nestedArchives.push(normalized)
    if (isLockfile) hasLockfile = true
    if (basename === '.env') hasEnv = true
    if (basename === '.env.example') hasEnvExample = true
    if (!isTextFile(normalized)) continue
    if (bytes.byteLength > MAX_TEXT_FILE_SIZE) {
      oversizedTextFiles += 1
      continue
    }
    scannedFilesCount += 1
    if (sourceExtensions.has(extension)) sourceFilesCount += 1

    const text = decoder.decode(bytes)
    const lines = text.split('\n').length
    if (!isLockfile && lines > 500) findings.push({ title: 'ملف كبير متعدد المسؤوليات', detail: `${normalized} يحتوي على ${lines.toLocaleString('ar-SA')} سطرًا ويحتاج إلى تقسيم`, severity: 'متوسطة', category: 'البنية', file: normalized })

    const imports = (text.match(/(?:import\s.+?from\s+|require\s*\()/g) ?? []).length
    if (imports > 25) findings.push({ title: 'ترابط مرتفع داخل ملف واحد', detail: `${normalized} يعتمد على ${imports.toLocaleString('ar-SA')} استيرادًا`, severity: 'متوسطة', category: 'البنية', file: normalized })

    const secretChecks = [
      { title: 'مفتاح AWS محتمل داخل الكود', pattern: /AKIA[0-9A-Z]{16}/g },
      { title: 'مفتاح خاص داخل المشروع', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
      { title: 'رمز وصول GitHub محتمل', pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/g },
      { title: 'قيمة حساسة محتملة داخل الكود', pattern: /(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*["'][^"'\s]{16,}["']/gi },
    ]
    for (const check of secretChecks) {
      const match = check.pattern.exec(text)
      if (match && !basename.includes('example') && !normalized.toLowerCase().includes('/test')) {
        findings.push({ title: check.title, detail: `${normalized} عند السطر ${lineNumber(text, match.index).toLocaleString('ar-SA')}`, severity: 'عالية', category: 'الأمان', file: normalized })
      }
    }

    if (/dangerouslySetInnerHTML\s*=/.test(text)) findings.push({ title: 'إدراج HTML مباشر', detail: `${normalized} يستخدم dangerouslySetInnerHTML ويحتاج إلى التحقق من تعقيم المدخلات`, severity: 'متوسطة', category: 'الأمان', file: normalized })
    if (/\beval\s*\(/.test(text)) findings.push({ title: 'استخدام eval', detail: `${normalized} ينفذ نصًا برمجيًا ديناميكيًا`, severity: 'عالية', category: 'الأمان', file: normalized })

    const todoCount = (text.match(/(?:\/\/|\/\*|#|<!--)[^\n]*(?:TODO|FIXME|HACK)/gi) ?? []).length
    if (todoCount >= 5) findings.push({ title: 'ديون تقنية متراكمة', detail: `${normalized} يحتوي على ${todoCount.toLocaleString('ar-SA')} علامة TODO أو FIXME أو HACK`, severity: 'منخفضة', category: 'قابلية الصيانة', file: normalized })

    if (basename === 'package.json') {
      try { packageJson = JSON.parse(text) } catch {
        findings.push({ title: 'ملف package.json غير صالح', detail: `${normalized} لا يمكن تحليله بصيغة JSON`, severity: 'عالية', category: 'التبعيات', file: normalized })
      }
    }
  }

  if (nestedArchives.length) findings.push({
    title: 'ملفات مشروع مضغوطة لم تُفحص',
    detail: `عُثر على ${nestedArchives.length.toLocaleString('ar-SA')} ملف مضغوط داخل الحزمة ولا يمكن تحليل محتواه تلقائيًا`,
    severity: 'عالية',
    category: 'قابلية الصيانة',
    file: nestedArchives[0],
  })
  if (sourceFilesCount === 0) findings.push({
    title: 'لم نعثر على ملفات مصدر قابلة للتحليل',
    detail: 'النتيجة لا تمثل جودة المشروع لأن الحزمة لا تحتوي كودًا مصدريًا مدعومًا بصورة مباشرة',
    severity: 'عالية',
    category: 'البنية',
  })

  if (hasEnv) findings.push({ title: 'ملف بيئة داخل الحزمة', detail: 'وُجد ملف .env ويجب التأكد من عدم احتوائه على أسرار قبل مشاركة المشروع', severity: 'عالية', category: 'الأمان', file: '.env' })
  if (hasEnv && !hasEnvExample) findings.push({ title: 'لا يوجد نموذج لإعدادات البيئة', detail: 'أضف .env.example بأسماء المتغيرات فقط دون القيم الحساسة', severity: 'منخفضة', category: 'قابلية الصيانة' })

  if (packageJson) {
    const dependencies = packageJson.dependencies ?? {}
    const development = packageJson.devDependencies ?? {}
    const loose = Object.entries({ ...dependencies, ...development }).filter(([, version]) => version === '*' || version === 'latest')
    if (loose.length) findings.push({ title: 'إصدارات تبعيات غير مقيدة', detail: `الحزم التالية تستخدم latest أو *: ${loose.map(([name]) => name).slice(0, 5).join('، ')}`, severity: 'متوسطة', category: 'التبعيات', file: 'package.json' })
    const duplicates = Object.keys(dependencies).filter((name) => name in development)
    if (duplicates.length) findings.push({ title: 'تبعيات مكررة', detail: `الحزم التالية موجودة في قسمي التبعيات: ${duplicates.slice(0, 5).join('، ')}`, severity: 'منخفضة', category: 'التبعيات', file: 'package.json' })
    if (Object.keys(dependencies).length && !hasLockfile) findings.push({ title: 'ملف قفل التبعيات مفقود', detail: 'لا يوجد ملف lock لتثبيت الإصدارات نفسها في كل بيئة', severity: 'متوسطة', category: 'التبعيات' })
  }

  const severities: Record<Severity, number> = { عالية: 14, متوسطة: 7, منخفضة: 3 }
  const categories: FindingCategory[] = ['الأمان', 'البنية', 'التبعيات', 'قابلية الصيانة']
  const scores = Object.fromEntries(categories.map((category) => {
    const deduction = findings.filter((item) => item.category === category).reduce((sum, item) => sum + severities[item.severity], 0)
    return [category, Math.max(0, 100 - deduction)]
  })) as Record<FindingCategory, number>
  const calculatedOverall = Math.round(categories.reduce((sum, category) => sum + scores[category], 0) / categories.length)
  const confidence: ScanReport['confidence'] = sourceFilesCount === 0 ? 'منخفضة' : nestedArchives.length || oversizedTextFiles ? 'متوسطة' : 'عالية'
  const scoreAvailable = sourceFilesCount > 0
  const overall = !scoreAvailable ? 0 : confidence === 'متوسطة' ? Math.min(80, calculatedOverall) : calculatedOverall
  const limitations = [
    'الفحص ساكن ومبدئي ولا يشغّل التطبيق ولا يثبت خلوه من الثغرات',
    'لا تُطابق التبعيات مع قاعدة بيانات CVE في الإصدار الحالي',
    ...(nestedArchives.length ? ['الملفات المضغوطة داخل المشروع لم تُفك'] : []),
    ...(oversizedTextFiles ? [`تُرك ${oversizedTextFiles.toLocaleString('ar-SA')} ملف نصي يتجاوز ١ ميجابايت`] : []),
    ...(sourceFilesCount === 0 ? ['لم تُفحص ملفات مصدر مدعومة'] : []),
  ]

  return {
    projectName: file.name.replace(/\.zip$/i, ''),
    scannedAt: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    filesCount: entries.length,
    findings: findings.map((item, index) => ({ ...item, id: index + 1 })),
    scores,
    overall,
    scannedFilesCount,
    skippedFilesCount: Math.max(0, entries.length - scannedFilesCount),
    confidence,
    limitations,
    scoreAvailable,
  }
}
