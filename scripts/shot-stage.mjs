/** shot-stage.mjs — 在指定年龄截图人生面板，用于人工核对阶段元素 */
const DEBUG = 'http://127.0.0.1:9222';
const TARGET = 'http://127.0.0.1:8811/';
const want = Number(process.argv[2] || 12);
const out = process.argv[3] || `scripts/stage-${want}.png`;

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
  const shoot = () => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  });
  return { evaluate, shoot, close: () => ws.close() };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const page = await connect();
const ev = async e => { const r = await page.evaluate(e); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result?.value; };

await ev(`location.href=${JSON.stringify(TARGET)}`);
await sleep(3200);
await ev(`(() => { const b=[...document.querySelectorAll('.dialog button')].find(x=>x.textContent.includes('开始新的人生')); if(b) b.click(); return 1; })()`);
await sleep(500);
await ev(`[...document.querySelectorAll('button')].find(b=>b.className.includes('cta'))?.click(); 1`);
await sleep(1000);
await ev(`(() => { const b=[...document.querySelectorAll('.dialog button')].find(x=>x.textContent.includes('开始新的人生')); if(b) b.click(); return 1; })()`);
await sleep(800);
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('翻开命运之卡')); if(b){b.click(); return 1;} return 0; })()`);
await sleep(900);
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('这是你的一生')); if(b){b.click(); return 1;} return 0; })()`);
await sleep(800);
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('开始这一生')); if(b){b.click(); return 1;} return 0; })()`);
await sleep(1300);

for (let i = 0; i < 300; i++) {
  const a = parseInt((await ev(`document.querySelector('.age-number')?.textContent?.trim()||'0'`)) || '0', 10);
  if (a >= want) break;
  if (await ev(`!!document.querySelector('.ending-age')`)) break;
  await ev(`(() => { const d=document.querySelector('.dialog'); if(d){const b=[...d.querySelectorAll('.choice-btn')]; if(b.length){b[0].dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1;}} document.querySelector('[data-action=skip]')?.click(); return 2; })()`);
  await sleep(110);
}
await ev(`document.querySelector('.scene-panel')?.scrollIntoView({block:'center'}); 1`);
await sleep(500);
const info = await ev(`({ age: document.querySelector('.age-number')?.textContent?.trim(), scene: document.querySelector('.scene-shell')?.getAttribute('data-scene'), props: document.querySelectorAll('.stage-prop').length, stage: document.querySelector('.stage-panel')?.innerText?.replace(/\\n+/g,' | ').slice(0,120) })`);
console.log(JSON.stringify(info));
const r = await page.shoot();
const { writeFileSync } = await import('fs');
writeFileSync(out, Buffer.from(r.data, 'base64'));
console.log('saved', out);
page.close();
