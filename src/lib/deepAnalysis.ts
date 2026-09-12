type Severity = 'عالية' | 'متوسطة' | 'منخفضة'

export type DeepSourceFile = {
  path: string
  text: string
  lines: number
}

export type DeepPriority = {
  id: number
  title: string
  severity: Severity
  area: 'التشابك' | 'الحماية' | 'الاعتماد' | 'الجودة'
  file: string
  line?: number
  evidence: string
  action: string
  effort: 'صغير' | 'متوسط' | 'كبير'
}

export type DeepAnalysis = {
  spaghettiRisk: number
  protectionScore: number
  sourceFiles: number
  dependencyEdges: number
  circularDependencies: string[][]
  duplicateBlocks: number
  hotspots: Array<{ file: string; score: number; reasons: string[] }>
  priorities: DeepPriority[]
  summary: string
  limitations: string[]
}

type BaselineFinding = {
  title: string
  detail: string
  severity: Severity
  category: string
  file?: string
}

const codeExtensions = new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'java', 'kt', 'kts', 'swift', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs', 'vue', 'svelte'])
const moduleExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']
const severityWeight: Record<Severity, number> = { عالية: 3, متوسطة: 2, منخفضة: 1 }

function extension(path: string) {
  const name = path.split('/').pop() ?? ''
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : ''
}

function normalizePath(path: string) {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function resolveImport(from: string, target: string, paths: Set<string>) {
  if (!target.startsWith('.')) return null
  const base = normalizePath(`${from.split('/').slice(0, -1).join('/')}/${target}`)
  const candidates = [base, ...moduleExtensions.map((suffix) => `${base}${suffix}`), ...moduleExtensions.map((suffix) => `${base}/index${suffix}`)]
  return candidates.find((candidate) => paths.has(candidate)) ?? null
}

function importedModules(text: string) {
  const modules: string[] = []
  const pattern = /(?:import\s+(?!type\b)(?:[^'";]+?\s+from\s+)?|export\s+(?!type\b)[^'";]+?\s+from\s+|require\s*\(|import\s*\()\s*["']([^"']+)["']/g
  for (const match of text.matchAll(pattern)) modules.push(match[1])
  return modules
}

function structuralText(text: string) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\[\s\S]|[^\\`])*`/g, '``')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/\/(?:\\.|[^/\\\n])+\/[dgimsuvy]*/g, '//')
}

function findCycles(graph: Map<string, string[]>) {
  const cycles = new Map<string, string[]>()
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  function visit(node: string) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node)
      const cycle = [...stack.slice(start), node]
      const key = [...new Set(cycle)].sort().join('|')
      if (!cycles.has(key)) cycles.set(key, cycle)
      return
    }
    if (visited.has(node)) return
    visiting.add(node)
    stack.push(node)
    for (const dependency of graph.get(node) ?? []) visit(dependency)
    stack.pop()
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of graph.keys()) visit(node)
  return [...cycles.values()].slice(0, 10)
}

function duplicateBlockCount(files: DeepSourceFile[]) {
  const owners = new Map<string, Set<string>>()
  for (const file of files) {
    const lines = file.text
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter((line) => line.length >= 18 && !line.startsWith('//') && !line.startsWith('*'))
    for (let index = 0; index <= lines.length - 6; index += 3) {
      const block = lines.slice(index, index + 6).join('\n')
      if (block.length < 180) continue
      const blockOwners = owners.get(block) ?? new Set<string>()
      blockOwners.add(file.path)
      owners.set(block, blockOwners)
    }
  }
  return [...owners.values()].filter((blockOwners) => blockOwners.size > 1).length
}

function lineOf(text: string, match: RegExpMatchArray) {
  return text.slice(0, match.index ?? 0).split('\n').length
}

export function buildDeepAnalysis(allFiles: DeepSourceFile[], baselineFindings: BaselineFinding[] = []): DeepAnalysis {
  const sourceFiles = allFiles.filter((file) => codeExtensions.has(extension(file.path)))
  const paths = new Set(sourceFiles.map((file) => file.path))
  const graph = new Map<string, string[]>()
  let dependencyEdges = 0
  const priorities: Omit<DeepPriority, 'id'>[] = []
  const hotspots: DeepAnalysis['hotspots'] = []

  for (const file of sourceFiles) {
    const structure = structuralText(file.text)
    const resolved = importedModules(file.text)
      .map((target) => resolveImport(file.path, target, paths))
      .filter((target): target is string => Boolean(target))
    graph.set(file.path, [...new Set(resolved)])
    dependencyEdges += new Set(resolved).size

    const branchCount = (structure.match(/\b(?:if|else if|for|while|case|catch)\b|&&|\|\||\?(?=[^?.])/g) ?? []).length
    const functionCount = (structure.match(/\bfunction\b|=>|\b(?:def|func|fn)\s+|\b(?:public|private|protected)?\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/g) ?? []).length
    const responsibilities = [
      /(?:useState|useEffect|document\.|window\.|<\w+)/.test(structure),
      /(?:fetch\s*\(|axios\.|firestore|database|SELECT\s|INSERT\s)/i.test(structure),
      /(?:auth|permission|role|token|session)/i.test(structure),
      /(?:route|router|navigate|location\.hash)/i.test(structure),
    ].filter(Boolean).length
    const reasons: string[] = []
    let hotspotScore = 0
    if (file.lines > 450) { hotspotScore += 30; reasons.push(`${file.lines.toLocaleString('ar-SA')} سطرًا`) }
    if (branchCount > 45) { hotspotScore += 25; reasons.push(`${branchCount.toLocaleString('ar-SA')} نقطة تفرع`) }
    if (functionCount > 18) { hotspotScore += 20; reasons.push(`${functionCount.toLocaleString('ar-SA')} دالة أو معالجًا`) }
    if (resolved.length > 18) { hotspotScore += 15; reasons.push(`${resolved.length.toLocaleString('ar-SA')} اعتمادًا داخليًا`) }
    if (responsibilities >= 3) { hotspotScore += 25; reasons.push(`${responsibilities.toLocaleString('ar-SA')} أنواع من المسؤوليات`) }
    if (hotspotScore >= 25) hotspots.push({ file: file.path, score: Math.min(100, hotspotScore), reasons })

    if (file.lines > 700 || branchCount > 70 || responsibilities === 4) priorities.push({
      title: 'ملف مرشح بقوة للتشابك',
      severity: file.lines > 1000 || branchCount > 100 ? 'عالية' : 'متوسطة',
      area: 'التشابك',
      file: file.path,
      evidence: reasons.join(' مع '),
      action: 'افصل واجهة العرض والوصول للبيانات والصلاحيات إلى وحدات مستقلة ثم اختبر كل وحدة',
      effort: file.lines > 1000 ? 'كبير' : 'متوسط',
    })

  }

  const securityRules = [
    { pattern: /\bhttp:\/\//i, title: 'اتصال غير مشفر داخل المشروع', severity: 'عالية' as const, action: 'استخدم HTTPS وارفض الرجوع إلى اتصال غير مشفر' },
    { pattern: /allow\s+(?:read|write)(?:\s*,\s*(?:read|write))?\s*:\s*if\s+true/i, title: 'قاعدة وصول مفتوحة للجميع', severity: 'عالية' as const, action: 'اربط القراءة والكتابة بهوية المستخدم وملكية السجل' },
    { pattern: /(?:localStorage|sessionStorage)\.setItem\s*\([^\n]*(?:token|password|secret)/i, title: 'بيانات حساسة داخل تخزين المتصفح', severity: 'عالية' as const, action: 'لا تخزن كلمات المرور أو الرموز الحساسة في Web Storage' },
    { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)[^\n]*(?:\$\{|\+\s*\w+)/i, title: 'استعلام مبني بدمج النصوص', severity: 'عالية' as const, action: 'استخدم الاستعلامات المعلّمة وربط القيم كمعاملات' },
    { pattern: /Access-Control-Allow-Origin["']?\s*[:,=]\s*["']\*/i, title: 'سياسة CORS مفتوحة', severity: 'متوسطة' as const, action: 'حدد النطاقات المسموح لها بدل النجمة العامة' },
    { pattern: /^\s*permissions\s*:\s*write-all\s*$/im, title: 'صلاحيات كتابة عامة في سير العمل', severity: 'عالية' as const, action: 'حدد أقل صلاحيات مطلوبة لكل مهمة في GitHub Actions' },
    { pattern: /^\s*FROM\s+\S+:latest\s*$/im, title: 'صورة Docker غير مثبتة الإصدار', severity: 'متوسطة' as const, action: 'ثبّت وسمًا محددًا ويفضل تثبيت digest للصورة' },
    { pattern: /(?:cidr_blocks|source_ranges)\s*=\s*\[[^\]]*["']0\.0\.0\.0\/0["'][^\]]*\]/i, title: 'نطاق شبكي مفتوح للعامة', severity: 'عالية' as const, action: 'قيّد نطاقات المصدر واضبط قواعد منفصلة للخدمات العامة فقط' },
  ]
  for (const file of allFiles) {
    for (const rule of securityRules) {
      if (rule.title === 'اتصال غير مشفر داخل المشروع' && ['xml', 'md', 'css', 'scss'].includes(extension(file.path))) continue
      const match = file.text.match(rule.pattern)
      if (!match) continue
      const matchLine = lineOf(file.text, match)
      const line = file.text.split('\n')[matchLine - 1] ?? ''
      if (/pattern\s*:|RegExp\s*\(/.test(line)) continue
      priorities.push({ title: rule.title, severity: rule.severity, area: 'الحماية', file: file.path, line: matchLine, evidence: `ظهر النمط في السطر ${matchLine.toLocaleString('ar-SA')}`, action: rule.action, effort: 'صغير' })
    }

    if (file.path.split('/').pop()?.toLowerCase() === 'dockerfile' && !/^\s*USER\s+\S+/im.test(file.text)) priorities.push({
      title: 'حاوية Docker قد تعمل بصلاحية root',
      severity: 'متوسطة',
      area: 'الحماية',
      file: file.path,
      evidence: 'لم يظهر توجيه USER في Dockerfile',
      action: 'أنشئ مستخدمًا محدود الصلاحيات وشغّل التطبيق من خلاله',
      effort: 'صغير',
    })
  }

  for (const finding of baselineFindings.filter((item) => item.category === 'الأمان')) {
    if (priorities.some((item) => item.title === finding.title && item.file === (finding.file ?? 'المشروع'))) continue
    priorities.push({
      title: finding.title,
      severity: finding.severity,
      area: 'الحماية',
      file: finding.file ?? 'المشروع',
      evidence: finding.detail,
      action: finding.title.includes('مفتاح') || finding.title.includes('حساسة') || finding.title.includes('رمز وصول')
        ? 'ألغ السر المكشوف ودوّره ثم انقله إلى مخزن أسرار ولا تضع قيمته في المستودع'
        : 'راجع مسار البيانات عند هذا الموضع وأغلق المدخل غير الموثوق قبل إعادة الفحص',
      effort: 'صغير',
    })
  }

  const circularDependencies = findCycles(graph)
  for (const cycle of circularDependencies) priorities.push({
    title: 'اعتماد دائري بين الملفات',
    severity: cycle.length > 4 ? 'عالية' : 'متوسطة',
    area: 'الاعتماد',
    file: cycle[0],
    evidence: cycle.join(' ← '),
    action: 'انقل العقد المشترك إلى وحدة مستقلة واجعل اتجاه الاعتماد أحاديًا',
    effort: cycle.length > 4 ? 'كبير' : 'متوسط',
  })

  const duplicateBlocks = duplicateBlockCount(sourceFiles)
  if (duplicateBlocks) priorities.push({
    title: 'مقاطع متطابقة بين ملفات مختلفة',
    severity: duplicateBlocks > 5 ? 'متوسطة' : 'منخفضة',
    area: 'الجودة',
    file: 'عدة ملفات',
    evidence: `${duplicateBlocks.toLocaleString('ar-SA')} مقطعًا متكررًا من ستة أسطر أو أكثر`,
    action: 'استخرج المنطق المتكرر إلى دالة أو مكوّن مشترك بعد التأكد من تطابق السلوك',
    effort: 'متوسط',
  })

  hotspots.sort((a, b) => b.score - a.score)
  priorities.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
  const spaghettiRisk = Math.min(100, Math.round(
    hotspots.reduce((sum, item) => sum + item.score, 0) / Math.max(1, sourceFiles.length) + circularDependencies.length * 12 + Math.min(20, duplicateBlocks * 2),
  ))
  const securityDeduction = priorities.filter((item) => item.area === 'الحماية').reduce((sum, item) => sum + severityWeight[item.severity] * 12, 0)
  const protectionScore = Math.max(0, 100 - securityDeduction)
  const summary = spaghettiRisk >= 65
    ? 'التشابك مرتفع ويستحسن إيقاف التوسع مؤقتًا وتقسيم نقاط الاختناق أولًا'
    : spaghettiRisk >= 35
      ? 'التشابك متوسط ويمكن خفضه تدريجيًا بدءًا من الملفات الأعلى تأثيرًا'
      : 'التشابك منخفض ضمن الملفات التي استطاع المحرك تحليلها'

  return {
    spaghettiRisk,
    protectionScore,
    sourceFiles: sourceFiles.length,
    dependencyEdges,
    circularDependencies,
    duplicateBlocks,
    hotspots: hotspots.slice(0, 8),
    priorities: priorities.map((item, index) => ({ ...item, id: index + 1 })),
    summary,
    limitations: [
      'التحليل ساكن ولا يشغّل التطبيق أو يختبر الخادم وقت التشغيل',
      'درجة الحماية مبنية على الأنماط التي ظهرت في الملفات المفحوصة وليست شهادة أمان',
      'قد تحتاج بعض النتائج إلى مراجعة مطور للتأكد من سياقها',
    ],
  }
}
