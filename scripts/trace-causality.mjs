/** trace-causality.mjs — 中文版：跟踪"选择 → 后续具体事件"的因果链。
 *  策略：每次选择都记录（年龄/标题/正文/选项），选第一项（积极介入），
 *  然后记录之后 3 年内出现的每一条日志，标注是否与刚才的选择有关。
 */
const DEBUG = 'http://127.0.0.1:9222';
async function connect() {
  const tabs = await (await fetch(`${DEBUG}/json`)).json();
  const tab = tabs.find(t => t.type === 'page' && /1in8b/.test(t.url));
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

await ev(`newLife('birth', 60); 1`);
await sleep(1800);
const reg = await ev(`document.body.innerText.slice(0, 900)`);
console.log('=== 出生 ===');
console.log(reg.replace(/\n+/g, ' | ').slice(0, 700));

await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='开始这一生'); if(b) b.click(); return !!b; })()`);
await sleep(1500);

// main loop: answer pending with FIRST choice, record decisions + following log lines
const decisions = [];
const timeline = [];
let lastAnswered = null, logSeen = 0;
for (let step = 0; step < 200; step++) {
  const st = await ev(`(() => {
    const pend = S.pending;
    const logs = (S.log||[]).filter(l=>['ev','big'].includes(l.kind));
    return JSON.stringify({
      age: S.age, phase: S.phase,
      pend: pend ? { id: pend.id, title: pend.view?.title||'', body: pend.view?.body||'', fact: pend.view?.fact||'',
        choices: (pend.view?.choices||[]).map(c=>({k:c.k, txt:c.txt||''})) } : null,
      newLogs: logs.slice(window.__seenN||0).map(l=>({a:l.a,k:l.kind,t:l.text||''})),
      total: logs.length
    });
  })()`);
  const s = JSON.parse(st);
  if (s.newLogs.length) {
    for (const l of s.newLogs) timeline.push({ ...l, after: lastAnswered ? lastAnswered.title : null });
    await ev(`window.__seenN = ${s.total}; 1`);
  }
  if (s.phase !== 'life') { console.log('\n=== 结束 ===', s.age); break; }
  if (s.pend) {
    decisions.push(s.pend);
    console.log(`\n[${s.age}岁] 决策：${s.pend.title}`);
    console.log(`  正文：${s.pend.body.slice(0, 160)}`);
    if (s.pend.fact) console.log(`  来源：${s.pend.fact.slice(0, 90)}`);
    s.pend.choices.forEach((c, i) => console.log(`   ${i + 1}. ${c.txt || c.k}`));
    // choose the FIRST option (engaged player)
    const c0 = s.pend.choices[0];
    await ev(`(() => { if(S.pending){ try{ pickChoice(${JSON.stringify(c0.k)}, true); }catch(e){} } return 1; })()`);
    lastAnswered = s.pend;
    await sleep(220);
    // capture immediate consequence lines
    const post = await ev(`(() => { const logs=(S.log||[]).filter(l=>['ev','big'].includes(l.kind)); return JSON.stringify(logs.slice(-4)); })()`);
    const pa = JSON.parse(post || '[]');
    for (const l of pa) console.log(`   → 结果：${l.text}`);
  } else {
    await ev(`(() => { for(let k=0;k<50;k++){ try{frame0(performance.now()); }catch(e){} } return 1; })()`);
    await sleep(80);
  }
}

const { writeFileSync } = await import('fs');
writeFileSync('scripts/competitor-causality-zh.json', JSON.stringify({ decisions, timeline }, null, 1), 'utf8');
console.log('\n决策数:', decisions.length, '| 事件行:', timeline.length);
console.log('已保存 scripts/competitor-causality-zh.json');
page.close();
