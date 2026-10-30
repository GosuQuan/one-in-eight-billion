// Gettext-style localisation: the Simplified Chinese text in the code is the key,
// and each language maps it to a translation. Missing translations fall back to the Chinese source.
// Placeholders in translations:
//   {name}               inserts a param
//   {n|one|other}        plural forms in the order of PLURAL_FORMS below, # stands for the number
//   {~male|female}       picks a form by the player's sex, for languages where verbs and adjectives agree with "you"
// The language is fixed for a page load, so module-level tables can call tr() once.
const STORE_KEY = 'one-in-eight-demo:lang';
export const LANGUAGES = { 'zh-CN': '简体中文', en: 'English', uk: 'Українська' };
// "pseudo" is a test language (?lang=pseudo or LIFE_LANG=pseudo): every translated character becomes Latin,
// so untranslated text and game logic that depends on Chinese wording both show up.
const PSEUDO = 'pseudo';
const NUMBER_LOCALES = { 'zh-CN': 'zh-CN', en: 'en-US', uk: 'uk-UA', [PSEUDO]: 'en-US' };
const PLURAL_FORMS = { en: ['one', 'other'], uk: ['one', 'few', 'many', 'other'] };

const supported = code => {
  if (!code) return null;
  const c = String(code).toLowerCase();
  if (c === PSEUDO) return PSEUDO;
  const base = c.split(/[-_]/)[0];
  return Object.keys(LANGUAGES).find(k => k.toLowerCase() === c) || (base === 'zh' ? 'zh-CN' : base in LANGUAGES ? base : null);
};

// Order: ?lang= for this visit, then the language picked in the switcher, then the browser's preferred languages.
function detect() {
  if (typeof window === 'undefined') return supported(globalThis.process?.env?.LIFE_LANG) || 'zh-CN';
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch {}
  const chosen = supported(new URLSearchParams(location.search).get('lang')) || supported(saved);
  if (chosen) return chosen;
  // Readers whose browser asks for none of our languages get English rather than Chinese.
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  return supported(preferred.find(l => supported(l) && supported(l) !== PSEUDO)) || 'en';
}

export const lang = detect();
export const numberLocale = NUMBER_LOCALES[lang];
const CJK = /[㐀-鿿　-〿＀-￯]/g;
const pseudo = s => s.replace(CJK, c => '~' + c.charCodeAt(0).toString(36) + ';');
const dict = lang === 'zh-CN' ? null
  : lang === PSEUDO ? new Proxy({}, { get: (_, k) => (typeof k === 'string' ? pseudo(k) : undefined) })
  // a missing or broken language file falls back to the Chinese text rather than a blank page
  : (await import(`./locales/${lang}/index.js`).catch(err => { console.error(err); return { default: null }; })).default;
export const missing = new Set();

// The player's sex, for {~male|female}. createLife() sets it; the page sets it again when it loads a saved life.
let playerFemale = false;
export function setPlayer(sex) { playerFemale = sex === '女'; }

const plurals = new Intl.PluralRules(numberLocale);
const fill = (text, params) => text.replace(/\{~([^|{}]*)\|([^|{}]*)\}/g, (m, male, female) => (playerFemale ? female : male)).replace(/\{(\w+)((?:\|[^|{}]*)+)?\}/g, (m, k, forms) => {
  if (!params || !(k in params)) return m;
  if (!forms) return String(params[k]);
  const list = forms.slice(1).split('|'), order = PLURAL_FORMS[lang] || PLURAL_FORMS.en;
  const index = Math.max(0, order.indexOf(plurals.select(Number(params[k]))));
  return list[Math.min(index, list.length - 1)].replace(/#/g, String(params[k]));
});

export function tr(source, params) {
  if (!dict) return fill(source, params);
  const entry = dict[source];
  if (entry == null) { missing.add(source); return fill(source, params); }
  return typeof entry === 'function' ? String(entry(params || {})) : fill(entry, params);
}

// Values the game logic matches on (sex, jobs, family background, market mood) stay in Chinese inside the save.
// Translate them only where they are shown. A promoted job is stored as '资深' + the job title.
export function label(value) {
  if (typeof value !== 'string' || !/[㐀-鿿]/.test(value)) return value ?? '';
  if (value.startsWith('资深') && value.length > 2) return tr('资深{job}', { job: label(value.slice(2)) });
  return tr(value);
}

export function setLanguage(code) {
  const next = supported(code);
  if (!next) return;
  try { localStorage.setItem(STORE_KEY, next); } catch {}
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url);
}
