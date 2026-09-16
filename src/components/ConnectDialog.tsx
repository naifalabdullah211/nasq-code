import { useEffect, useRef, useState } from "react";
import { Github, GitBranch, LoaderCircle, Upload, X } from "lucide-react";
import { ActionButton } from "./ActionButton";
import { analyzeZip, type ScanReport } from "../lib/analyzer";
import { trackEvent } from "../lib/analytics";
import { downloadPublicGitHubRepository } from "../lib/github";

export function ConnectDialog({
  open,
  onClose,
  onDemo,
  onScan,
  initialSource = "github",
}: {
  open: boolean;
  onClose: () => void;
  onDemo: () => void;
  onScan: (report: ScanReport) => void;
  initialSource?: "github" | "zip";
}) {
  const [source, setSource] = useState<
    "github" | "gitlab" | "bitbucket" | "zip"
  >("zip");
  const [url, setUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setSource(initialSource);
    setError("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [initialSource, open, onClose]);
  if (!open) return null;

  const completeScan = (result: ScanReport, scanSource: "github" | "zip") => {
    trackEvent("scan_completed", {
      source: scanSource,
      scanned_files: result.scannedFilesCount,
      findings_count: result.findings.length,
      deep_analysis_available: Boolean(result.deepAnalysis),
    });
    onScan(result);
  };

  const submit = async () => {
    setError("");
    if (source === "github") {
      if (!url.trim()) return setError("ألصق رابط المستودع أولًا");
      setLoading(true);
      trackEvent("scan_started", { source: "github" });
      try {
        const repositoryFile = await downloadPublicGitHubRepository(url);
        completeScan(await analyzeZip(repositoryFile), "github");
      } catch (caught) {
        trackEvent("scan_failed", { source: "github" });
        setError(caught instanceof Error ? caught.message : "تعذر فحص المستودع");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (source !== "zip") return setError("هذا المصدر سيتاح لاحقًا");
    if (!zipFile) return setError("اختر ملف ZIP أولًا");
    setLoading(true);
    trackEvent("scan_started", { source: "zip" });
    try {
      completeScan(await analyzeZip(zipFile), "zip");
    } catch (caught) {
      trackEvent("scan_failed", { source: "zip" });
      setError(caught instanceof Error ? caught.message : "تعذر فحص الملف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          className="icon-button dialog-close"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <X />
        </button>
        <h2 id="connect-title">اختر مصدر المشروع</h2>
        <p>فحص ساكن ومبدئي بصلاحية القراءة فقط دون تعديل ملفات المستودع</p>
        <div className="source-options">
          {[
            ["github", "GitHub", <Github />],
            ["gitlab", "GitLab", <GitBranch />],
            ["bitbucket", "Bitbucket", <GitBranch />],
            ["zip", "ملف ZIP", <Upload />],
          ].map(([value, label, icon]) => (
            <button
              key={String(value)}
              disabled={value === "gitlab" || value === "bitbucket"}
              className={source === value ? "selected" : ""}
              onClick={() => {
                setSource(value as typeof source);
                setError("");
              }}
            >
              {icon}
              {label}
              {value === "github" && <small>عام</small>}
              {(value === "gitlab" || value === "bitbucket") && <small>قريبًا</small>}
            </button>
          ))}
        </div>
        {source === "zip" ? (
          <label className="upload-field">
            <Upload />
            <span>
              {zipFile ? zipFile.name : "اختر ملف ZIP حتى ٢٠ ميجابايت"}
            </span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <label className="field">
            <span>رابط المستودع</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              dir="ltr"
            />
            <small className="field-hint">المستودعات العامة فقط دون تسجيل دخول</small>
          </label>
        )}
        <p className="privacy-note">
          <strong>{source === "github" ? "اتصال مباشر" : "فحص محلي"}</strong>{" "}
          {source === "github"
            ? "ينتقل المستودع من GitHub إلى متصفحك ولا نحفظ أي ملف"
            : "لا يغادر الكود جهازك ولا نحفظ أي ملف"}
        </p>
        <p className="scan-limit">لا يشغّل الفحص التطبيق ولا يثبت خلوه من الثغرات</p>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <ActionButton
            onClick={submit}
            disabled={loading}
            icon={loading ? <LoaderCircle className="spin" /> : undefined}
          >
            {loading
              ? source === "github" ? "جاري جلب المستودع" : "جاري الفحص"
              : source === "github" ? "فحص المستودع" : source === "zip" ? "فحص الملف" : "متابعة"}
          </ActionButton>
          <ActionButton variant="ghost" onClick={onDemo}>
            عرض تقرير تجريبي
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
