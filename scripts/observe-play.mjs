/** observe-play.mjs — 玩家视角观察式试玩：按真实节奏推进，逐年记录体验数据。
 *  不做"选最后一项速通"，而是：每个决策读标题/正文/选项长度，选一个合理选项，
 *  记录每年：年龄、事件标题、文案长度、是否有数字混杂、弹窗类型分布、卡点。
 */
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
const ev = async e => { const r = await page.evaluate(e); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result?.value; };

await ev(`location.href=${JSON.stringify(TARGET)}`);
await sleep(3500);
// clean state
await ev(`(() => { [...document.querySelectorAll('[data-action=close]')].forEach(b=>b.click()); const h=[...document.querySelectorAll('[data-action=home]')][0]; if(h) h.click(); return 1; })()`);
await sleep(900);
// start
await ev(`[...document.querySelectorAll('button')].find(b=>b.className.includes('cta'))?.click(); 1`);
await sleep(1000);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('翻开命运之卡'))?.click(); 1`);
await sleep(800);
const hero = await ev(`({ name: document.querySelector('.hero-name')?.textContent, cap: document.querySelector('.hero-caption')?.textContent })`);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('这是你的一生'))?.click(); 1`);
await sleep(700);
const cert = await ev(`document.querySelector('.cert-body')?.innerText?.slice(0, 600)`);
console.log('=== 出生 ===');
console.log('身份:', JSON.stringify(hero));
console.log('出生登记节选:', (cert || '').replace(/\n+/g, ' | ').slice(0, 420));
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始这一生'))?.click(); 1`);
await sleep(1200);

// observer style: choose first option (an attentive player tends to engage), record everything
const log = [];
let dialogs = 0, minis = 0, reflections = 0;
for (let i = 0; i < 260; i++) {
  const snap = await ev(`(() => {
    const d = document.querySelector('.dialog');
    const age = document.querySelector('.age-number')?.textContent?.trim() || '';
    if (d) {
      const t = document.querySelector('#dialog-title')?.textContent || '';
      const body = d.querySelector('p')?.textContent || '';
      const kicker = d.querySelector('.dialog-kicker')?.textContent || '';
      const btns = [...d.querySelectorAll('.choice-btn')].map(b => (b.querySelector('strong')?.textContent || '').trim());
      const isMini = kicker.includes('一件小事');
      const numbers = (body.match(/\\d+/g) || []).length;
      return JSON.stringify({ kind: 'dialog', age, title: t, kicker, isMini, bodyLen: body.length, numbers, options: btns });
    }
    const ending = !!document.querySelector('.ending-age');
    const feed = [...document.querySelectorAll('.feed-item')].slice(0, 2).map(e => e.querySelector('.feed-title')?.textContent || '');
    return JSON.stringify({ kind: 'free', age, ending, feed });
  })()`);
  const s = JSON.parse(snap);
  if (s.kind === 'dialog') {
    log.push(s); dialogs++;
    if (s.isMini) minis++;
    if (s.title.includes('停下来想一句')) {
      reflections++;
      await ev(`(() => { const a=document.querySelector('#note-text'); if(a){a.value='我一个普通人的一天'; a.dispatchEvent(new Event('input',{bubbles:true}));} const b=[...document.querySelectorAll('.dialog button')].find(x=>/写好|继续/.test(x.textContent)); if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1; })()`);
    } else {
      await ev(`(() => { const b=[...document.querySelectorAll('.dialog .choice-btn')][0]; if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1; })()`);
    }
  } else if (s.ending) {
    console.log('\n=== 终局 ===');
    const recap = await ev(`document.querySelector('.ending-walk')?.innerText?.slice(0, 900)`);
    console.log((recap || '').replace(/\n+/g, ' | ').slice(0, 760));
    break;
  } else {
    await ev(`document.querySelector('[data-action=skip]')?.click(); 1`);
    if (i % 6 === 0) log.push({ kind: 'year', age: s.age, feed: s.feed });
  }
  await sleep(150);
}

console.log('\n=== 观察数据 ===');
console.log('决策总数:', dialogs, '| 其中微型:', minis, '| 反思提问:', reflections);
const withNumbers = log.filter(x => x.kind === 'dialog' && x.numbers > 0).length;
console.log('正文含数字的决策:', withNumbers, '/', dialogs);
const longBodies = log.filter(x => x.kind === 'dialog' && x.bodyLen > 160).length;
console.log('正文过长(>160字):', longBodies, '/', dialogs);
const maxOpts = Math.max(0, ...log.filter(x => x.kind === 'dialog').map(x => x.options.length));
console.log('最多选项数:', maxOpts);
console.log('\n前 10 个决策:');
for (const x of log.filter(x => x.kind === 'dialog').slice(0, 10)) {
  console.log(`  ${x.age} ${x.isMini ? '[微]' : '[卡]'} ${x.title} — ${x.bodyLen}字/${x.numbers}个数字/${x.options.length}选项`);
}
page.close();
