/**
 * e2e-smoke.mjs — one-command end-to-end smoke test of the live page.
 *
 * Usage:
 *   node scripts/e2e-smoke.mjs            # expects a static server on :8811
 *   node scripts/e2e-smoke.mjs --url http://127.0.0.1:8811/
 *
 * Requires Chrome with --remote-debugging-port=9222 (see docs/nanobrowser-automation-feasibility.md).
 * It plays a whole life choosing the last option, then asserts the ending exposes:
 *   lifespan days, memorial marks (>=6), grain (4 pairs), philosophy and two questions.
 * Exit code 0 = pass.
 */
const DEBUG = 'http://127.0.0.1:9222';
const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const TARGET = urlIdx >= 0 ? args[urlIdx + 1] : 'http://127.0.0.1:8811/';

async function cdp() {
  const tabs = await (await fetch(`${DEBUG}/json`)).json();
  const tab = tabs.find(t => t.type === 'page');
  if (!tab) throw new Error('no Chrome page tab');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
  let seq = 0;
  const pending = new Map();
  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    const p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  });
  const evaluate = (expression) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true, userGesture: true } }));
  });
  return { evaluate, close: () => ws.close() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = msg => { console.error('FAIL: ' + msg); process.exit(1); };

const page = await cdp();
const ev = async expr => {
  const r = await page.evaluate(expr);
  if (r.exceptionDetails) fail('js error: ' + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result?.value;
};

console.log('1) navigate', TARGET);
await ev(`location.href=${JSON.stringify(TARGET)}`);
await sleep(4000);

console.log('2) start a life');
await ev(`[...document.querySelectorAll('button')].find(b=>b.className.includes('cta'))?.click(); 1`);
await sleep(1200);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('翻开命运之卡'))?.click(); 1`);
await sleep(900);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('这是你的一生'))?.click(); 1`);
await sleep(900);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始这一生'))?.click(); 1`);
await sleep(1500);
const age0 = await ev(`document.querySelector('.age-number')?.textContent?.trim() || ''`);
if (!age0) fail('life did not start');
console.log('   age:', age0);

console.log('3) play to the end (last option each time)');
let ended = false;
for (let i = 0; i < 320; i++) {
  await ev(`(() => {
    const d = document.querySelector('.dialog');
    if (d) {
      const t = document.querySelector('#dialog-title')?.textContent || '';
      if (t.includes('停下来想一句')) {
        const a = document.querySelector('#note-text');
        if (a) { a.value = 'E2E 自动化写下的一句'; a.dispatchEvent(new Event('input', {bubbles:true})); }
        const btn = [...d.querySelectorAll('button')].find(b => /写好|继续/.test(b.textContent));
        if (btn) btn.dispatchEvent(new MouseEvent('click', {bubbles:true}));
        return 'reflect';
      }
      const btns = [...d.querySelectorAll('.choice-btn')];
      if (btns.length) { btns[btns.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true})); return 'answer'; }
      return 'dialog';
    }
    document.querySelector('[data-action=skip]')?.click();
    return 'skip';
  })()`);
  await sleep(180);
  if (await ev(`!!document.querySelector('.ending-age')`)) { ended = true; break; }
}
if (!ended) fail('life never reached the ending within the step budget');

console.log('4) verify the ending exposes every recap block');
const checks = await ev(`JSON.stringify({
  age: document.querySelector('.ending-age')?.textContent || '',
  days: document.querySelector('.ending-days')?.textContent || '',
  marks: document.querySelectorAll('.ending-mark').length,
  grain: !!document.querySelector('.ending-grain-title'),
  pairs: document.querySelectorAll('.ending-pair').length,
  philosophy: (document.querySelector('.ending-philosophy')?.textContent || '').length,
  questions: document.querySelectorAll('.ending-question').length
})`);
const r = JSON.parse(checks);
console.log('   ', r);
if (!r.age) fail('no age line');
if (!/大约 [\d,]+ 天/.test(r.days)) fail('lifespan days missing: ' + r.days);
if (r.marks < 6) fail('memorial marks too few: ' + r.marks);
if (!r.grain) fail('grain title missing');
if (r.pairs !== 4) fail('grain pairs should be 4, got ' + r.pairs);
if (r.philosophy < 8) fail('philosophy missing');
if (r.questions !== 2) fail('expected 2 questions, got ' + r.questions);

page.close();
console.log('\nPASS — full life played, ending verified.');
