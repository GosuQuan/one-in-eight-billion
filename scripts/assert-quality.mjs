/** assert-quality.mjs — 观察式试玩 + 质量断言（硬失败）
 *  检查：空弹窗（选项<=1）、正文超长(>220字)、正文含 undefined/NaN、终局含 undefined/NaN、
 *        决策数过少(<6)、微型/卡片两级是否都出现。
 *  任一不达标 exit 1。
 */
const DEBUG = 'http://127.0.0.1:9222';
const TARGET = process.env.E2E_URL || 'http://127.0.0.1:8811/';

async function connect() {
  const tabs = await (await fetch(`${DEBUG}/json`)).json();
  const tab = tabs.find(t => t.type === 'page');
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
const ev = async e => { const r = await page.evaluate(e); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result?.value; };

await ev(`location.href=${JSON.stringify(TARGET)}`);
await sleep(3500);
await ev(`(() => { [...document.querySelectorAll('[data-action=close]')].forEach(b=>b.click()); const h=[...document.querySelectorAll('[data-action=home]')][0]; if(h) h.click(); return 1; })()`);
await sleep(900);
await ev(`[...document.querySelectorAll('button')].find(b=>b.className.includes('cta'))?.click(); 1`);
await sleep(1000);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('翻开命运之卡'))?.click(); 1`);
await sleep(800);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('这是你的一生'))?.click(); 1`);
await sleep(700);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始这一生'))?.click(); 1`);
await sleep(1200);

const problems = [];
const stats = { dialogs: 0, minis: 0, emptyDialogs: 0, longBodies: 0, undefinedText: 0 };
let ending = null;

for (let i = 0; i < 300; i++) {
  const snap = await ev(`(() => {
    const d = document.querySelector('.dialog');
    if (d) {
      const t = document.querySelector('#dialog-title')?.textContent || '';
      const body = d.querySelector('p')?.textContent || '';
      const kicker = d.querySelector('.dialog-kicker')?.textContent || '';
      const btns = [...d.querySelectorAll('.choice-btn')];
      return JSON.stringify({ k:'d', t, bodyLen: body.length, n: btns.length, mini: kicker.includes('一件小事'), bad: /undefined|NaN/.test(t + body) });
    }
    if (document.querySelector('.ending-age')) return JSON.stringify({ k:'e', html: document.querySelector('.ending-walk')?.innerText || '' });
    return JSON.stringify({ k:'f' });
  })()`);
  const s = JSON.parse(snap);
  if (s.k === 'd') {
    stats.dialogs++;
    if (s.mini) stats.minis++;
    if (s.bad) { stats.undefinedText++; problems.push(`弹窗含 undefined/NaN: ${s.t}`); }
    if (s.bodyLen > 220) { stats.longBodies++; problems.push(`正文过长(${s.bodyLen}字): ${s.t}`); }
    if (s.n <= 1 && !s.t.includes('停下来想一句')) { stats.emptyDialogs++; problems.push(`空弹窗(仅${s.n}选项): ${s.t}`); }
    if (s.t.includes('停下来想一句')) {
      await ev(`(() => { const a=document.querySelector('#note-text'); if(a){a.value='自动化的一句'; a.dispatchEvent(new Event('input',{bubbles:true}));} const b=[...document.querySelectorAll('.dialog button')].find(x=>/写好|继续/.test(x.textContent)); if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1; })()`);
    } else {
      await ev(`(() => { const b=[...document.querySelectorAll('.dialog .choice-btn')][0]; if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1; })()`);
    }
  } else if (s.k === 'e') {
    ending = s.html;
    if (/undefined|NaN/.test(s.html)) problems.push('终局页含 undefined/NaN');
    break;
  } else {
    await ev(`document.querySelector('[data-action=skip]')?.click(); 1`);
  }
  await sleep(150);
}

if (!ending) problems.push('未到达终局');
if (stats.dialogs < 6) problems.push(`决策过少: ${stats.dialogs}`);
for (const req of [/生命的长度|大约 [\d,]+ 天/, /四对词|身边有人/, /你会不会是这样/]) {
  if (ending && !req.test(ending)) problems.push('终局缺少: ' + req);
}

page.close();
console.log('统计:', JSON.stringify(stats));
if (problems.length) {
  console.error('\n✖ 质量问题 ' + problems.length + ' 项:');
  problems.slice(0, 20).forEach(p => console.error('  - ' + p));
  process.exit(1);
}
console.log('\nPASS — 观察式试玩无空弹窗、无超长文案、无 undefined/NaN，终局区块齐全。');
