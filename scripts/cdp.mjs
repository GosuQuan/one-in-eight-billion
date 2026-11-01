// Minimal CDP driver for the game tab (connect per command, one-shot)
import WebSocket from 'ws';

const DEBUG = 'http://127.0.0.1:9222';

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const tabs = await (await fetch(`${DEBUG}/json`)).json();
  const tab = tabs.find(t => t.type === 'page');
  if (!tab) throw new Error('no page tab');

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
    const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
    ws.on('open', async () => {
      const send = (id, method, params = {}) => ws.send(JSON.stringify({ id, method, params }));
      if (cmd === 'text') {
        send(1, 'Runtime.evaluate', { expression: 'document.body.innerText.slice(0, 2500)', returnByValue: true });
      } else if (cmd === 'eval') {
        send(1, 'Runtime.evaluate', { expression: rest[0], returnByValue: true, awaitPromise: rest[1] === 'await', userGesture: true });
      } else if (cmd === 'click') {
        send(1, 'Runtime.evaluate', { expression: `(() => {
          const els = [...document.querySelectorAll('button, a, [data-action], [data-gacha-card]')];
          const el = els.find(b => (b.textContent || '').trim().includes(${JSON.stringify(rest[0])}));
          if (!el) return 'NOT_FOUND';
          el.click();
          return 'clicked:' + (el.textContent || '').trim().slice(0, 24);
        })()`, returnByValue: true });
      } else if (cmd === 'shot') {
        send(1, 'Page.captureScreenshot', { format: 'png' });
      } else { console.log('commands: text | eval <js> [await] | click <text> | shot <file>'); process.exit(0); }
    });
    ws.on('message', async raw => {
      const m = JSON.parse(raw);
      if (m.id !== 1) return;
      clearTimeout(timeout);
      const r = m.result?.result?.value;
      if (cmd === 'shot') {
        const { writeFileSync } = await import('fs');
        writeFileSync(rest[0], Buffer.from(m.result.data, 'base64'));
        console.log(`saved ${rest[0]}`);
      } else if (m.result?.exceptionDetails) {
        console.log('EXC:', JSON.stringify(m.result.exceptionDetails).slice(0, 300));
      } else {
        console.log(typeof r === 'string' ? r : JSON.stringify(r));
      }
      process.exit(0);
    });
    ws.on('error', e => { clearTimeout(timeout); console.log('ERR:', e.message); process.exit(1); });
  });
}
main();
