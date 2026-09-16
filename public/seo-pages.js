const MEASUREMENT_ID = "G-HLF60MJXVP";
const CONSENT_KEY = "nasq-analytics-consent";

function startAnalytics() {
  if (document.querySelector(`[data-nasq-analytics="${MEASUREMENT_ID}"]`)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    page_path: window.location.pathname,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.dataset.nasqAnalytics = MEASUREMENT_ID;
  document.head.appendChild(script);
}

const consentBanner = document.querySelector("[data-consent-banner]");
const savedConsent = localStorage.getItem(CONSENT_KEY);

if (savedConsent === "accepted") {
  startAnalytics();
} else if (savedConsent !== "rejected" && consentBanner) {
  consentBanner.hidden = false;
}

document.querySelectorAll("[data-consent]").forEach((button) => {
  button.addEventListener("click", () => {
    const consent = button.dataset.consent;
    if (consent !== "accepted" && consent !== "rejected") return;
    localStorage.setItem(CONSENT_KEY, consent);
    if (consentBanner) consentBanner.hidden = true;
    if (consent === "accepted") startAnalytics();
  });
});

document.querySelectorAll("[data-track]").forEach((link) => {
  link.addEventListener("click", () => {
    window.gtag?.("event", link.dataset.track, {
      guide: link.dataset.guide || "unknown",
      link_url: link.getAttribute("href") || "",
    });
  });
});
