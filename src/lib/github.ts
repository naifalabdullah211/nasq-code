import { zipSync } from "fflate"

const REQUEST_TIMEOUT = 30_000
const MAX_FILES = 500
const MAX_FILE_SIZE = 1024 * 1024
const MAX_TOTAL_SIZE = 15 * 1024 * 1024
const DOWNLOAD_BATCH_SIZE = 8
const REPOSITORY_PART = /^[A-Za-z0-9_.-]+$/
const IGNORED_PARTS = ["/node_modules/", "/.git/", "/dist/", "/build/", "/coverage/", "/vendor/"]
const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "json", "html", "css", "scss", "md", "yml", "yaml",
  "env", "py", "rb", "php", "java", "kt", "kts", "swift", "go", "rs", "sh",
  "tf", "tfvars", "toml", "xml", "properties", "gradle", "c", "cpp", "h", "hpp",
  "cs", "vue", "svelte", "sql", "zip", "rar", "7z", "tar", "gz", "tgz",
])
const LOCKFILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"])

type GitHubTreeEntry = { path?: string; type?: string; size?: number }

function parseRepositoryUrl(value: string) {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new Error("ألصق رابط GitHub صحيحًا مثل https://github.com/owner/repository")
  }

  if (
    parsed.protocol !== "https:" ||
    !["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase()) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("يجب أن يكون الرابط لمستودع عام على github.com")
  }

  const parts = parsed.pathname.split("/").filter(Boolean)
  const owner = parts[0]
  const name = parts[1]?.replace(/\.git$/i, "")
  if (parts.length !== 2 || !owner || !name || !REPOSITORY_PART.test(owner) || !REPOSITORY_PART.test(name)) {
    throw new Error("استخدم رابط الصفحة الرئيسية للمستودع دون مسار ملف أو فرع")
  }
  return { owner, name }
}

function githubError(status: number) {
  if (status === 404) return new Error("المستودع غير موجود أو خاص ولا يمكن فحصه دون تسجيل دخول")
  if (status === 403 || status === 429) return new Error("وصل GitHub إلى حد الطلبات المؤقت حاول مرة أخرى لاحقًا")
  return new Error("تعذر الاتصال بـ GitHub الآن")
}

async function fetchGitHubApi(url: string, signal: AbortSignal) {
  try {
    return await fetch(url, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("استغرق الاتصال بـ GitHub وقتًا أطول من المتوقع")
    }
    throw new Error("تعذر الوصول إلى GitHub تحقق من الاتصال وحاول مجددًا")
  }
}

function isScannableFile(path: string) {
  const normalized = `/${path.toLowerCase()}`
  if (IGNORED_PARTS.some((part) => normalized.includes(part))) return false
  const name = path.split("/").pop()?.toLowerCase() ?? ""
  if (name.startsWith(".env") || LOCKFILES.has(name)) return true
  if (name === "dockerfile") return true
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : ""
  return TEXT_EXTENSIONS.has(extension)
}

function rawFileUrl(owner: string, name: string, revision: string, path: string) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/")
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${encodeURIComponent(revision)}/${encodedPath}`
}

async function downloadFiles(
  owner: string,
  name: string,
  revision: string,
  entries: Array<{ path: string; size: number }>,
  signal: AbortSignal,
) {
  const archive: Record<string, Uint8Array> = {}
  let downloadedSize = 0

  for (let start = 0; start < entries.length; start += DOWNLOAD_BATCH_SIZE) {
    const batch = entries.slice(start, start + DOWNLOAD_BATCH_SIZE)
    const results = await Promise.all(batch.map(async (entry) => {
      let response: Response
      try {
        response = await fetch(rawFileUrl(owner, name, revision, entry.path), { signal })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error("استغرق تنزيل ملفات المستودع وقتًا أطول من المتوقع")
        }
        throw new Error("تعذر تنزيل ملفات المستودع من GitHub")
      }
      if (!response.ok) throw githubError(response.status)
      return { path: entry.path, bytes: new Uint8Array(await response.arrayBuffer()) }
    }))

    for (const result of results) {
      downloadedSize += result.bytes.byteLength
      if (downloadedSize > MAX_TOTAL_SIZE) {
        throw new Error("حجم الملفات القابلة للفحص يتجاوز ١٥ ميجابايت استخدم ملف ZIP")
      }
      archive[result.path] = result.bytes
    }
  }
  return archive
}

export async function downloadPublicGitHubRepository(value: string) {
  const { owner, name } = parseRepositoryUrl(value)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const detailsResponse = await fetchGitHubApi(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      controller.signal,
    )
    if (!detailsResponse.ok) throw githubError(detailsResponse.status)

    const details = (await detailsResponse.json()) as { private?: boolean; default_branch?: string }
    if (details.private || !details.default_branch) {
      throw new Error("المستودعات الخاصة تحتاج تسجيل دخول GitHub وستتاح لاحقًا")
    }

    const treeResponse = await fetchGitHubApi(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(details.default_branch)}?recursive=1`,
      controller.signal,
    )
    if (!treeResponse.ok) throw githubError(treeResponse.status)

    const treeData = (await treeResponse.json()) as { sha?: string; truncated?: boolean; tree?: GitHubTreeEntry[] }
    if (treeData.truncated) throw new Error("المستودع كبير جدًا للفحص المباشر استخدم ملف ZIP")
    if (!treeData.sha || !treeData.tree) throw new Error("تعذر قراءة شجرة ملفات المستودع")

    const entries = treeData.tree
      .filter((entry): entry is { path: string; type: string; size: number } => (
        entry.type === "blob" &&
        typeof entry.path === "string" &&
        typeof entry.size === "number" &&
        entry.size <= MAX_FILE_SIZE &&
        isScannableFile(entry.path)
      ))
      .map(({ path, size }) => ({ path, size }))

    if (!entries.length) throw new Error("لم نجد ملفات نصية مدعومة داخل المستودع")
    if (entries.length > MAX_FILES) throw new Error("المستودع يحتوي على أكثر من ٥٠٠ ملف قابل للفحص استخدم ملف ZIP")
    const declaredSize = entries.reduce((sum, entry) => sum + entry.size, 0)
    if (declaredSize > MAX_TOTAL_SIZE) {
      throw new Error("حجم الملفات القابلة للفحص يتجاوز ١٥ ميجابايت استخدم ملف ZIP")
    }

    const archive = await downloadFiles(owner, name, treeData.sha, entries, controller.signal)
    const bytes = zipSync(archive, { level: 6 })
    return new File([bytes], `${name}.zip`, { type: "application/zip" })
  } finally {
    window.clearTimeout(timeout)
  }
}
