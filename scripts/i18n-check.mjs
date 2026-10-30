// Localisation check.
//   node scripts/i18n-check.mjs dump [file]   simulate seeded lives in the current LIFE_LANG and print/write JSON
//   node scripts/i18n-check.mjs compare [lang] run the same lives in zh-CN and <lang> (default en) and compare them
//   node scripts/i18n-check.mjs keys [lang]    list tr('…') keys in src/ that have no translation yet
// The engine is deterministic, so a translation must not change a single number, flag or array length.
// Strings may differ, but the translated run must not leak Chinese text except in internal data fields.
// With the "pseudo" language every string must also decode back to exactly the Chinese run.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEEDS = Number(process.env.SEEDS || 240);
const [mode = 'compare', arg] = process.argv.slice(2);
const CJK = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/;
// Fields whose values are internal identifiers, kept in Chinese on purpose and shown through label().
const INTERNAL = new Set((process.env.I18N_INTERNAL || 'sex,role,job,education,regime,background,classBand').split(','));
// Job titles from career.js JOBS: careerOptions() copies them into option.label, and the UI shows them with label().
const INTERNAL_VALUES = new Set(['维修学徒', '行政职员', '技术人员', '专业对口岗位', '远程职员']);

async function dump() {
  const engine = await import('../src/engine.js');
  const { educationOptions, educationAction } = await import('../src/education.js');
  const { careerOptions, careerAction } = await import('../src/career.js');
  const { financeAction, familyAidQuote } = await import('../src/finance.js');
  const { systemAction, getHousehold, getSceneState } = await import('../src/life-systems.js');
  const { COUNTRIES, DESTINATIONS, STOCKS, STOCK_RISKS, PURCHASES, createLife, advanceYear, choose, setFocus, summarize,
    invest, withdraw, investStocks, buyHouse, buyCar, buyItem, travel, travelCost, takeLoan, repayDebt, netWorth } = engine;
  const SYSTEM = ['plan-child', 'child-care', 'adopt-dog', 'adopt-cat', 'start-business', 'business-manage', 'checkup', 'medical',
    'move-abroad', 'return-home', 'reunite-family', 'housing', 'seek-partner', 'date', 'courtship', 'make-friend', 'friend-time',
    'family-time', 'visit-home', 'pet-care', 'relationship-talk', 'relationship-counsel', 'relationship-decide', 'divorce', 'thread-start', 'opportunity'];
  const FOCUS = ['study', 'work', 'health', 'family', 'joy'];
  const safe = f => { try { return f(); } catch (err) { return { error: String(err.message) }; } };
  const out = { static: { COUNTRIES, DESTINATIONS, STOCKS, STOCK_RISKS, PURCHASES }, lives: [] };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const life = createLife({ seed, era: ['now', 'past', 'future', 'any'][seed % 4], mode: seed % 2 ? 'birth' : 'pop' });
    const results = [];
    for (let n = 0; n < 240 && !life.dead; n++) {
      if (life.pending) { results.push(safe(() => choose(life, (seed + n) % life.pending.options.length))); continue; }
      const k = (seed * 7 + n) % 19;
      if (k === 0) setFocus(life, FOCUS[(seed + n) % 5]);
      else if (k === 1) results.push(safe(() => invest(life, ['index', 'bonds', 'property'][n % 3], Math.round((life.money || 0) * .3))));
      else if (k === 2) results.push(safe(() => withdraw(life, ['index', 'bonds', 'property'][n % 3], 100)));
      else if (k === 3) results.push(safe(() => investStocks(life, STOCK_RISKS[n % STOCK_RISKS.length].id, Math.round((life.money || 0) * .2))));
      else if (k === 4) results.push(safe(() => buyItem(life, PURCHASES[n % PURCHASES.length].id)));
      else if (k === 5) { const d = DESTINATIONS[n % DESTINATIONS.length].id, c = ['solo', 'partner', 'family', 'friends'][n % 4]; results.push(safe(() => [travelCost(life, d, c), travel(life, d, c)])); }
      else if (k === 6) results.push(safe(() => (n % 2 ? buyHouse(life, n % 4 ? 'normal' : 'small') : buyCar(life))));
      else if (k === 7) results.push(safe(() => (n % 2 ? takeLoan(life, 500) : repayDebt(life, 200))));
      else if (k === 8) { const o = safe(() => educationOptions(life)); results.push(o); const pick = Array.isArray(o) && o.find(x => !x.disabled); if (pick) results.push(safe(() => educationAction(life, pick.id))); }
      else if (k === 9) { const o = safe(() => careerOptions(life)); results.push(o); const pick = Array.isArray(o) && o.find(x => !x.disabled); if (pick) results.push(safe(() => careerAction(life, pick.id))); }
      else if (k === 10) results.push(safe(() => [familyAidQuote(life), financeAction(life, 'family-aid')]));
      else if (k >= 11) results.push(safe(() => systemAction(life, SYSTEM[(seed + n * 3) % SYSTEM.length], {})));
      if (life.pending) continue;
      results.push(safe(() => [getHousehold(life), getSceneState(life)]));
      advanceYear(life);
    }
    out.lives.push({ seed, life, results, summary: safe(() => summarize(life)), worth: safe(() => netWorth(life)) });
  }
  const json = JSON.stringify(out);
  if (arg) writeFileSync(arg, json); else process.stdout.write(json);
}

function run(lang) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'dump'], { env: { ...process.env, LIFE_LANG: lang }, maxBuffer: 1 << 30, encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  return JSON.parse(r.stdout);
}

// The pseudo language writes each Chinese character as ~<base36 code>;, so it can be decoded back exactly.
const unpseudo = s => s.replace(/~([0-9a-z]+);/g, (_, c) => String.fromCharCode(parseInt(c, 36)));

function compare(lang = 'en') {
  const zh = run('zh-CN'), other = run(lang);
  const structural = [], leaks = new Map();
  const walk = (a, b, path, key) => {
    if (structural.length > 40) return;
    if (typeof a === 'string' && typeof b === 'string') {
      const k = path.replace(/\[\d+\]/g, '[]');
      if (CJK.test(b) && !INTERNAL.has(key) && !INTERNAL_VALUES.has(b) && !leaks.has(b)) leaks.set(b, k);
      // pseudo must decode to exactly the Chinese run; any difference means logic reacted to the wording
      if (lang === 'pseudo') { if (unpseudo(b) !== a) structural.push(`${path}: "${a.slice(0, 80)}" decoded as "${unpseudo(b).slice(0, 80)}"`); return; }
      if (!CJK.test(a)) { if (a !== b) structural.push(`${path}: "${a}" became "${b}"`); return; }
      return;
    }
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { structural.push(`${path}: type ${typeof a} became ${typeof b}`); return; }
    if (Array.isArray(a)) { if (a.length !== b.length) structural.push(`${path}: length ${a.length} became ${b.length}`); a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`, key)); return; }
    if (a && typeof a === 'object') {
      const ka = Object.keys(a).join(), kb = Object.keys(b).join();
      if (ka !== kb) structural.push(`${path}: keys {${ka}} became {${kb}}`);
      for (const k of Object.keys(a)) walk(a[k], b[k], `${path}.${k}`, k);
      return;
    }
    if (a !== b) structural.push(`${path}: ${a} became ${b}`);
  };
  walk(zh, other, '$', '');
  console.log(`${SEEDS} lives compared, zh-CN vs ${lang}`);
  console.log(structural.length ? `\nSTRUCTURAL DIFFERENCES (translation changed game logic):\n${structural.slice(0, 40).join('\n')}` : 'structure: identical');
  console.log(`untranslated strings: ${leaks.size}`);
  for (const [s, p] of [...leaks].slice(0, Number(process.env.SHOW || 60))) console.log(`  ${p}  ${s.slice(0, 140)}`);
  process.exit(structural.length || leaks.size ? 1 : 0);
}

// Static check: every tr('…') key in src/ must have a translation in src/locales/<lang>/index.js.
async function keys(lang = 'en') {
  const dir = new URL('../src/', import.meta.url);
  const used = new Map();
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\btr\(\s*'((?:[^'\\]|\\.)*)'/g)) {
      const key = JSON.parse('"' + m[1].replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
      if (!used.has(key)) used.set(key, `${f}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  const dict = (await import(new URL(`locales/${lang}/index.js`, dir))).default;
  const missing = [...used].filter(([k]) => !(k in dict));
  // internal values shown with label() never appear as tr('…'), so also compare against English, the fullest table
  if (lang !== 'en') {
    const en = (await import(new URL('locales/en/index.js', dir))).default;
    for (const k of Object.keys(en)) if (!(k in dict) && !used.has(k)) missing.push([k, 'in en, not here']);
  }
  const unused = Object.keys(dict).filter(k => !used.has(k));
  console.log(`${used.size} keys in src, ${Object.keys(dict).length} entries in ${lang}`);
  console.log(`missing translations: ${missing.length}`);
  for (const [k, where] of missing.slice(0, Number(process.env.SHOW || 60))) console.log(`  ${where}  ${k}`);
  // entries not written as tr('…') are fine when they are internal values shown with label()
  console.log(`entries not referenced as tr('…'): ${unused.length}${unused.length ? ` (e.g. ${unused.slice(0, 8).join(', ')})` : ''}`);
  process.exit(missing.length ? 1 : 0);
}

if (mode === 'dump') await dump(); else if (mode === 'keys') await keys(arg); else compare(arg);
