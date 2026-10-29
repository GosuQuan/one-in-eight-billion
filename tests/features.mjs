import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const screenshots = new URL('../docs/screenshots/', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-proxy-server'] });
const errors = [];
const fixture = async page => {
  await page.goto(base, { waitUntil: 'networkidle' });
  const data = await page.evaluate(async () => {
    const e = await import('./src/engine.js');
    const life = e.createLife({ seed: 'feature-walkthrough', country: 'US' });
    for (let i = 0; i < 160 && !life.dead && life.age < 35; i++) {
      if (life.pending) e.choose(life, 0); else e.advanceYear(life);
    }
    life.money = 60000;
    life.debt = 0;
    life.pending = null;
    life.lastTravelYear = null;
    life.travels = [];
    life.holdings = [];
    life.investments = { index: 0, bonds: 0, property: 0 };
    if (!life.partner) life.partner = { name: '林知夏', sex: '女', age: 33, bond: 75, income: 20000, job: '设计师' };
    return { prefs: { era: 'now', mode: 'birth', pace: 'normal' }, current: life, history: [] };
  });
  await page.addInitScript(saved => localStorage.setItem('one-in-eight-demo:v1', JSON.stringify(saved)), data);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /继续这一生/ }).click();
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  return data.current;
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, locale: 'zh-CN' });
  page.on('pageerror', err => errors.push(err.message));
  const current = await fixture(page);
  assert.ok(current.age >= 25, 'fixture should reach adulthood');

  await page.getByRole('button', { name: '投资', exact: true }).click();
  await page.locator('.dialog').waitFor();
  assert.match(await page.locator('.dialog').innerText(), /投资 · 资产/);
  await page.screenshot({ path: screenshots + 'feature-invest-overview.png' });

  await page.getByRole('button', { name: '基金 · 债券' }).click();
  await page.locator('#fund-amount').fill('5000');
  await page.locator('[data-fund="index"]').click();
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('one-in-eight-demo:v1')).current);
  assert.ok(saved.investments.index > 0, 'index fund bought');
  assert.ok(saved.money < 60000, 'cash spent');
  await page.screenshot({ path: screenshots + 'feature-invest-funds.png' });

  await page.getByRole('button', { name: '股票' }).click();
  await page.locator('#stock-amount').fill('2000');
  await page.locator('[data-stock-buy="NOVA"]').click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('one-in-eight-demo:v1')).current);
  assert.equal(saved.holdings.length, 1, 'stock holding recorded');
  assert.ok(saved.holdings[0].shares > 0);
  await page.screenshot({ path: screenshots + 'feature-invest-stocks.png' });

  await page.getByRole('button', { name: '消费 · 负债' }).click();
  await page.locator('[data-buy="phone"]').click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('one-in-eight-demo:v1')).current);
  assert.ok(saved.possessions.includes('phone'), 'item purchase recorded');
  await page.screenshot({ path: screenshots + 'feature-invest-life.png' });

  const ageBefore = saved.age;
  await page.getByRole('button', { name: '关闭弹窗' }).click();
  await page.getByRole('button', { name: '旅行', exact: true }).click();
  await page.locator('.dialog').waitFor();
  assert.match(await page.locator('.dialog').innerText(), /去旅行/);
  await page.locator('[data-companion="partner"]').click();
  await page.locator('[data-travel="jp"]').click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('one-in-eight-demo:v1')).current);
  assert.equal(saved.travels.length, 1, 'trip recorded');
  assert.equal(saved.travels[0].id, 'jp');
  assert.equal(saved.age, ageBefore, 'modal paused time');
  assert.ok(saved.stats.happiness > 0);
  await page.screenshot({ path: screenshots + 'feature-travel.png' });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '关闭弹窗' }).click();

  // A real engine-driven random event, not a hand-authored modal.
  await page.evaluate(async () => {
    const e = await import('./src/engine.js');
    const saved = JSON.parse(localStorage.getItem('one-in-eight-demo:v1'));
    const s = saved.current;
    s.pending = null;
    s.lastEventAge = null;
    s.recentEvents = [];
    for (let i = 0; i < 30 && !s.dead; i++) {
      if (s.pending) {
        if (s.pending.kind === 'event') break;
        e.choose(s, 0);
      } else e.advanceYear(s);
    }
    saved.current = s;
    localStorage.setItem('one-in-eight-demo:v1', JSON.stringify(saved));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /继续这一生/ }).click();
  await page.locator('[data-choice]').first().waitFor();
  assert.match(await page.locator('.dialog-kicker').innerText(), /没有预料到/);
  await page.screenshot({ path: screenshots + 'feature-event.png' });
  await page.locator('[data-choice="0"]').click();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, locale: 'zh-CN' });
  mobile.on('pageerror', err => errors.push(err.message));
  await fixture(mobile);
  await mobile.getByRole('button', { name: '投资', exact: true }).click();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile invest modal fits');
  await mobile.screenshot({ path: screenshots + 'mobile-invest.png' });
  await mobile.getByRole('button', { name: '关闭弹窗' }).click();
  await mobile.getByRole('button', { name: '旅行', exact: true }).click();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile travel modal fits');
  await mobile.screenshot({ path: screenshots + 'mobile-travel.png' });

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    result: 'PASS',
    checks: ['open invest overview', 'buy index fund', 'buy stock', 'buy phone', 'travel with partner', 'modal pauses time', 'mobile invest/travel fit', 'no page errors'],
    final: { cash: saved.money, investments: saved.investments, holdings: saved.holdings.length, travels: saved.travels.length, age: saved.age },
    screenshots
  }, null, 2));
} finally {
  await browser.close();
}
