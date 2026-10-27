// HOP English default for the rhwp-studio language pack.
//
// rhwp-studio picks its UI language from ?lang= or localStorage('rhwp-locale'), and falls back to Korean.
// HOP ships in English, so when the user has not chosen a language yet, store 'en' before the
// app bundle runs. A stored choice (for example 'ko') is left alone.
// This is an external script because the app's CSP does not allow inline scripts.
(() => {
  const supported = ['ko', 'en'];
  const normalize = (value) => {
    if (!value) return null;
    const base = String(value).trim().toLowerCase().split(/[-_]/)[0];
    return supported.indexOf(base) >= 0 ? base : null;
  };
  let locale = null;
  try {
    locale = normalize(new URLSearchParams(location.search).get('lang'));
  } catch {
    locale = null;
  }
  if (!locale) {
    try {
      locale = normalize(localStorage.getItem('rhwp-locale'));
      if (!locale) {
        locale = 'en';
        localStorage.setItem('rhwp-locale', locale);
      }
    } catch {
      locale = null;
    }
  }
  document.documentElement.lang = locale || 'en';
})();
