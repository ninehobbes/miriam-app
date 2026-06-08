(function () {
  const config = window.MIRIAM_I18N;
  if (!config) return;

  const supported = ["ko", "en", "ja"];
  const storageKey = "miriam.language";

  function getSavedLanguage() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function setSavedLanguage(language) {
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // Manual switching should still work for the current page even if storage is unavailable.
    }
  }

  function normalize(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function detectLanguage() {
    const saved = getSavedLanguage();
    if (supported.includes(saved)) return saved;

    const languages = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "ko"];

    for (const language of languages) {
      const code = language.toLowerCase();
      if (code.startsWith("ko")) return "ko";
      if (code.startsWith("ja")) return "ja";
      if (code.startsWith("en")) return "en";
    }

    return "ko";
  }

  function preserveEdgeWhitespace(original, replacement) {
    const leading = original.match(/^\s*/)[0];
    const trailing = original.match(/\s*$/)[0];
    return `${leading}${replacement}${trailing}`;
  }

  function applyTextMap(language) {
    const textMap = config.text || {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      if (!node.__miriamOriginalText) node.__miriamOriginalText = node.nodeValue;
      const key = normalize(node.__miriamOriginalText);
      if (!key || !textMap[key]) continue;
      const replacement = language === "ko" ? key : textMap[key][language];
      if (!replacement) continue;
      node.nodeValue = preserveEdgeWhitespace(node.__miriamOriginalText, replacement);
    }
  }

  function applyAttributes(language) {
    const attrMap = config.attrs || {};
    for (const [selector, attrs] of Object.entries(attrMap)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      for (const [name, translations] of Object.entries(attrs)) {
        if (translations[language]) element.setAttribute(name, translations[language]);
      }
    }
  }

  function applyMeta(language) {
    const meta = config.meta && config.meta[language];
    if (!meta) return;
    if (meta.title) document.title = meta.title;
    if (meta.description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
    }
    if (meta.ogTitle || meta.title) {
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.ogTitle || meta.title);
    }
  }

  function applyLanguage(language) {
    document.documentElement.lang = language;
    applyMeta(language);
    applyTextMap(language);
    applyAttributes(language);

    document.querySelectorAll("[data-lang-option]").forEach((button) => {
      const active = button.getAttribute("data-lang-option") === language;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    window.dispatchEvent(new CustomEvent("miriam:languagechange", { detail: { language } }));
  }

  function bindLanguageButtons() {
    document.querySelectorAll("[data-lang-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const language = button.getAttribute("data-lang-option");
        if (!supported.includes(language)) return;
        setSavedLanguage(language);
        applyLanguage(language);
      });
    });
  }

  bindLanguageButtons();
  applyLanguage(detectLanguage());
})();
