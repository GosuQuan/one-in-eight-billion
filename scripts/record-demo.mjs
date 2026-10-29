import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Real UI recording: no imported engine, injected save, or fabricated game state.
// Usage: node scripts/record-demo.mjs [http://127.0.0.1:4173]
const base = process.argv[2] || 'http://127.0.0.1:4173';
const out = path.resolve('docs/.frames');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let frames = [];
try {
  for (let attempt = 0; attempt < 8; attempt++) {
    frames = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const capture = async (caption, duration = 1500) => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(100);
      const file = `frame-${String(frames.length).padStart(3, '0')}.png`;
      await page.screenshot({ path: path.join(out, file) });
      frames.push({ file, duration, caption });
    };
    await page.goto(base, { waitUntil: 'networkidle' });
    await capture('01 / 世界 · 八十亿种可能，从这里开始', 1800);
    await page.locator('[data-pref="pace"][data-value="slow"]').click();
    await page.locator('[data-action="new"]').click();
    await capture('02 / 出生证 · 随机起点，独一无二的名字', 1800);
    await page.locator('[data-action="begin"]').click();
    await page.locator('[data-action="pause"]').click();
    await capture('03 / 生活 · 档案、状态与同一秒出生的人', 1500);
    let sawFive = false, sawEighteen = false, sawAdult = false;
    for (let step = 0; step < 180; step++) {
      if (await page.locator('.ending').count()) break;
      if (await page.locator('[data-choice]').count()) {
        const kicker = await page.locator('.dialog-kicker').textContent();
        if (kicker.startsWith('5 岁')) { sawFive = true; await capture('04 / 五岁 · 在第一间教室里，作出自己的选择', 2200); }
        if (kicker.startsWith('18 岁')) { sawEighteen = true; await capture('05 / 十八岁 · 继续求学，还是开始工作？', 2200); }
        await page.locator('[data-choice="0"]').click();
      } else {
        const age = parseInt(await page.locator('.age-number').innerText());
        if (age === 6) await capture('童年 · 每一年，选择都在留下痕迹', 1000);
        if (age === 19) { await page.locator('[data-focus="study"]').click(); await capture('成年 · 选择学习作为今年的重心', 1600); }
        if (age === 30) { sawAdult = true; await page.locator('[data-focus="family"]').click(); await capture('06 / 家人与生活 · 也成为别人生命里的重要角色', 2200); }
        if (age === 50) await capture('中年 · 一年的重量，汇入人生的记录', 1400);
        if (age === 65) await capture('晚年 · 看岁月流过，也看世界继续', 1400);
        await page.locator('[data-action="next"]').click();
      }
    }
    if (sawFive && sawEighteen && sawAdult && await page.locator('.ending').count()) {
      await capture('07 / 终章 · 这一生，曾经属于你', 2400);
      await page.locator('.ending-body').scrollIntoViewIfNeeded();
      await capture('人生回顾 · 记住那些值得珍藏的片刻', 1800);
      await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ source: base, method: 'Real browser UI clicks; no game state injection', viewport: { width: 1440, height: 1050 }, frames }, null, 2));
      await context.close();
      console.log(`Recorded ${frames.length} frames, ${frames.reduce((s,f)=>s+f.duration,0)/1000}s`);
      break;
    }
    await context.close();
    if (attempt === 7) throw new Error('No complete adult life recorded after eight real UI runs.');
  }
} finally { await browser.close(); }
