/** verify-stages.mjs — 一次跑完三个阶段，验证左侧「这个阶段」面板随人生变化 */
const DEBUG = 'http://127.0.0.1:9222';
const TARGET = 'http://127.0.0.1:8811/';
async function connect() {
  const tabs = await (await fetch(`${DEBUG}/json`)).json();
  const own = tabs.filter(t => t.type === 'page' && /127\.0\.0\.1:8811/.test(t.url || ''));
  const tab = own[0] || tabs.find(t => t.type === 'page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  let seq = 0; const pending = new Map();
  ws.on('message', raw => { const m = JSON.parse(raw); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
  const evaluate = expression => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true, userGesture: true } })); });
  return { evaluate, close: () => ws.close() };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const page = await connect();
const ev = async e => { const r = await page.evaluate(e); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result?.value; };

await ev(`location.href=${JSON.stringify(TARGET)}`);
await sleep(3500);
await ev(`(() => { [...document.querySelectorAll('[data-action=close]')].forEach(b=>b.click()); const h=[...document.querySelectorAll('[data-action=home]')][0]; if(h) h.click(); return 1; })()`);
await sleep(800);
// if a life is in progress, accept starting over
await ev(`(() => { const b=[...document.querySelectorAll('.dialog button')].find(x=>x.textContent.includes('开始新的人生')); if(b){b.click(); return 1;} return 0; })()`);
await sleep(600);
await ev(`[...document.querySelectorAll('button')].find(b=>b.className.includes('cta'))?.click(); 1`);
await sleep(1100);
await ev(`(() => { const b=[...document.querySelectorAll('.dialog button')].find(x=>x.textContent.includes('开始新的人生')); if(b){b.click(); return 1;} return 0; })()`);
await sleep(900);
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('翻开命运之卡')); if(b){b.click(); return 1;} return 0; })()`);
await sleep(900);
const who = await ev(`document.querySelector('.hero-name')?.textContent + ' | ' + document.querySelector('.hero-caption')?.textContent`);
console.log('样本:', who);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('这是你的一生'))?.click(); 1`);
await sleep(800);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始这一生'))?.click(); 1`);
await sleep(1400);

const read = async () => await ev(`(() => { const el=document.querySelector('.stage-panel'); return el ? el.innerText.replace(/\\n+/g,' | ') : 'none'; })()`);
const ageOf = async () => await ev(`document.querySelector('.age-number')?.textContent?.trim()`);

console.log('\n[童年] age', await ageOf(), '→', await read());

// advance to school age (~10)
for (let i = 0; i < 60; i++) {
  await ev(`(() => { const d=document.querySelector('.dialog'); if(d){const b=[...d.querySelectorAll('.choice-btn')]; if(b.length){b[b.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1;}} document.querySelector('[data-action=skip]')?.click(); return 2; })()`);
  await sleep(120);
  const a = parseInt((await ageOf() || '0'), 10);
  if (a >= 10) break;
}
console.log('[求学] age', await ageOf(), '→', await read());

// advance to adult (~24)
for (let i = 0; i < 80; i++) {
  await ev(`(() => { const d=document.querySelector('.dialog'); if(d){const b=[...d.querySelectorAll('.choice-btn')]; if(b.length){b[b.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1;}} document.querySelector('[data-action=skip]')?.click(); return 2; })()`);
  await sleep(120);
  const a = parseInt((await ageOf() || '0'), 10);
  if (a >= 24) break;
}
console.log('[成年] age', await ageOf(), '→', await read());

// advance to late (~66)
for (let i = 0; i < 260; i++) {
  await ev(`(() => { const d=document.querySelector('.dialog'); if(d){const b=[...d.querySelectorAll('.choice-btn')]; if(b.length){b[b.length-1].dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1;}} document.querySelector('[data-action=skip]')?.click(); return 2; })()`);
  await sleep(110);
  const a = parseInt((await ageOf() || '0'), 10);
  if (a >= 66 || await ev(`!!document.querySelector('.ending-age')`)) break;
}
console.log('[晚年] age', await ageOf(), '→', await read());
page.close();
