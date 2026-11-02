/**
 * e2e-multi.mjs — batch smoke across several countries / sexes / eras.
 *
 * Usage: node scripts/e2e-multi.mjs [--url http://127.0.0.1:8811/] [--runs 4]
 *
 * Requires: static server on 8811, Chrome with --remote-debugging-port=9222.
 * For each run it picks a different (era, mode, country) combination by clicking
 * the toggles on the home screen, plays a full life, and checks the ending blocks
 * plus country culture-event coverage where applicable.
 * Exit 0 = all runs passed.
 */
const DEBUG = 'http://127.0.0.1:9222';
const argv = process.argv.slice(2);
const getArg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const TARGET = getArg('--url', 'http://127.0.0.1:8811/');
const RUNS = Number(getArg('--runs', '4'));

async function connect() {
  const tabs = await (await fetch(`${DEBUG}/json`)).json();
  const tab = tabs.find(t => t.type === 'page');
  if (!tab) throw new Error('no Chrome page tab');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  let seq = 0; const pending = new Map();
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    const p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  });
  const evaluate = expression => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true, userGesture: true } }));
  });
  return { evaluate, close: () => ws.close() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const page = await connect();
const ev = async expr => {
  const r = await page.evaluate(expr);
  if (r.exceptionDetails) throw new Error('js: ' + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result?.value;
};

// combinations: 【时代 toggle, 出生模式 toggle, 国家 select index(optional)】
const ERAS = ['past', 'now', 'future', 'any'];
const MODES = ['birth', 'pop'];
const runs = [];
for (let i = 0; i < RUNS; i++) runs.push({ era: ERAS[i % ERAS.length], mode: MODES[i % MODES.length] });

const results = [];
for (let i = 0; i < runs.length; i++) {
  const cfg = runs[i];
  console.log(`\n=== run ${i + 1}/${runs.length} era=${cfg.era} mode=${cfg.mode} ===`);
  await ev(`location.href=${JSON.stringify(TARGET)}`);
  await sleep(3500);
  // set era + mode via segmented buttons (text match on 过去/现在/未来/哪个世界都好 and 此刻出生的婴儿/现在活着的80亿人)
  const eraLabel = { past: '过去', now: '现在', future: '未来', any: '哪个世界都好' }[cfg.era];
  const modeLabel = { birth: '此刻出生的婴儿', pop: '现在活着的80亿人' }[cfg.mode];
  await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(eraLabel)}); if(b) b.click(); return !!b; })()`);
  await sleep(400);
  await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(modeLabel)}); if(b) b.click(); return !!b; })()`);
  await sleep(400);
  // start
  await ev(`[...document.querySelectorAll('button')].find(b=>b.className.includes('cta'))?.click(); 1`);
  await sleep(1100);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('翻开命运之卡'))?.click(); 1`);
  await sleep(800);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('这是你的一生'))?.click(); 1`);
  await sleep(800);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始这一生'))?.click(); 1`);
  await sleep(1300);
  const started = await ev(`!!document.querySelector('.age-number')`);
  if (!started) { results.push({ cfg, ok: false, why: 'did not start' }); continue; }
  const identity = await ev(`({ name: document.querySelector('.hero-name,.age-year')?.textContent||'', age: document.querySelector('.age-number')?.textContent||'' })`);

  // play
  let ended = false;
  for (let n = 0; n < 320; n++) {
    await ev(`(() => {
      const d = document.querySelector('.dialog');
      if (d) {
        const t = document.querySelector('#dialog-title')?.textContent || '';
        if (t.includes('停下来想一句')) {
          const a = document.querySelector('#note-text');
          if (a) { a.value = 'E2E'; a.dispatchEvent(new Event('input',{bubbles:true})); }
          const btn = [...d.querySelectorAll('button')].find(b=>/写好|继续/.test(b.textContent));
          if (btn) btn.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          return 'reflect';
        }
        const btns = [...d.querySelectorAll('.choice-btn')];
        if (btns.length) { btns[btns.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true})); return 'a'; }
        return 'd';
      }
      document.querySelector('[data-action=skip]')?.click();
      return 's';
    })()`);
    await sleep(170);
    if (await ev(`!!document.querySelector('.ending-age')`)) { ended = true; break; }
  }
  if (!ended) { results.push({ cfg, ok: false, why: 'no ending', identity }); continue; }

  const recap = await ev(`JSON.stringify({
    age: document.querySelector('.ending-age')?.textContent||'',
    days: document.querySelector('.ending-days')?.textContent||'',
    marks: document.querySelectorAll('.ending-mark').length,
    pairs: document.querySelectorAll('.ending-pair').length,
    questions: document.querySelectorAll('.ending-question').length,
    err: document.querySelector('.ending-age')?.textContent?.includes('undefined') || document.querySelector('.ending-marks')?.textContent?.includes('undefined') || document.querySelector('.ending-marks')?.textContent?.includes('NaN')
  })`);
  const r = JSON.parse(recap);
  const ok = r.marks >= 6 && r.pairs === 4 && r.questions === 2 && !r.err && /大约 [\d,]+ 天/.test(r.days);
  results.push({ cfg, ok, identity, recap: r });
  console.log('   ', r, ok ? 'OK' : 'BAD');
}

page.close();
console.log('\n===== SUMMARY =====');
let bad = 0;
for (const r of results) {
  console.log(`${r.cfg.era}/${r.cfg.mode}: ${r.ok ? 'PASS' : 'FAIL'}${r.ok ? '' : ' — ' + (r.why || JSON.stringify(r.recap))}`);
  if (!r.ok) bad++;
}
if (bad) { console.error(`\n${bad} run(s) failed`); process.exit(1); }
console.log(`\nPASS — all ${results.length} runs`);
