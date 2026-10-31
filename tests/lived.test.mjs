import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose } from '../src/engine.js';
import { systemsYear } from '../src/life-systems.js';
import { financeYear } from '../src/finance.js';
import { LIVED_ACTS, initLived, livedAction, livedYear } from '../src/lived.js';

const adult = (seed, age = 30) => {
  const l = createLife({ seed, country: 'CN' });
  l.age = age; l.money = 80000; l.debt = 0; l.income = 40000; l.job = '职员'; l.stats.health = 80;
  l.pending = null;
  return l;
};

test('there are fifty distinct lived acts', () => {
  assert.equal(LIVED_ACTS.length, 50);
  assert.equal(new Set(LIVED_ACTS.map(a => a.id)).size, 50);
  for (const act of LIVED_ACTS) assert.ok(act.cost && act.time && act.risk && act.mark);
});

test('quitting smoking can fail and a pension cannot be drawn early', () => {
  let failed = false;
  for (let i = 0; i < 24; i++) {
    const l = adult('quit-' + i);
    const job = l.job, education = l.education;
    livedAction(l, 'smoke');
    livedAction(l, 'quit-smoke');
    assert.equal(l.job, job);
    assert.equal(l.education, education);
    assert.equal(l.children.length, 0);
    if (l.lived.smoke) failed = true;
  }
  assert.equal(failed, true);
  const late = adult('pension', 66);
  late.income = 0; late.job = '退休'; late.retired = true;
  initLived(late); late.lived.pensionYears = 4; late.lived.pensionPot = 900;
  const before = late.money;
  const drawn = livedAction(late, 'pension-draw');
  assert.equal(drawn.ok, true);
  assert.equal(late.money, before);
  assert.ok(!late.lived.pensionDrawn);
});

test('grief lasts beyond the year and does not replace an open choice', () => {
  const l = adult('grief', 40);
  l.family.mother.name = '林母'; l.family.mother.alive = true;
  initLived(l); l.lived.seen['母亲:林母'] = true;
  l.family.mother.alive = false;
  livedYear(l, { events: false });
  assert.equal(l.pending, null);
  assert.ok(l.lived.grief.some(g => g.name === '林母'));
  const happy = l.stats.happiness;
  l.systems.lastYear = l.age - 1;
  l.age += 1;
  livedYear(l, { events: false });
  assert.ok(l.stats.happiness <= happy);
  assert.ok(l.lived.grief.some(g => g.name === '林母'));
  l.pending = { kind: 'system', system: 'thread', title: '已有的事', text: '先处理这个', options: [{ key: 'stay', label: '留下' }] };
  l.age += 7;
  livedYear(l, { events: true });
  assert.equal(l.pending.system, 'thread');
});

test('an internship is not a job, and a quiet year does not offer', () => {
  let rejected = false;
  for (let i = 0; i < 30; i++) {
    const l = adult('intern-' + i, 20);
    l.income = 0; l.job = '尚未工作'; l.money = 1000;
    livedAction(l, 'internship');
    assert.equal(l.job, '尚未工作');
    assert.notEqual(l.education, '大学');
    if (l.money === 1000) rejected = true;
  }
  assert.equal(rejected, true);
  const quiet = adult('quiet', 21);
  const pending = quiet.pending;
  livedYear(quiet, { events: false });
  assert.equal(quiet.pending, pending);
});

test('a lived offer can be declined without a charge', () => {
  const l = adult('offer', 28);
  l.money = 20; l.debt = 0; l.income = 0; l.job = '尚未工作';
  livedYear(l, { events: true });
  assert.equal(l.pending && l.pending.system, 'lived');
  assert.equal(l.pending.options.at(-1).key, 'later');
  const money = l.money, debt = l.debt, job = l.job;
  choose(l, l.pending.options.length - 1);
  assert.equal(l.pending, null);
  assert.equal(l.money, money);
  assert.equal(l.debt, debt);
  assert.equal(l.job, job);
});

test('childhood years do not gain a lived bill or a banned log', () => {
  for (let seed = 0; seed < 20; seed++) {
    const l = createLife({ seed: 'child-' + seed, country: 'CN' });
    l.age = 6; l.money = 0; l.debt = 0; l.systems.residence.with = 'parents'; l.systems.lastYear = null;
    systemsYear(l);
    assert.equal(l.money, 0);
    assert.equal(l.debt, 0);
    assert.notEqual(l.pending && l.pending.system, 'lived');
    assert.equal(l.log.some(e => /养老|下班|搬来和你同住|屋顶要翻修/.test(`${e.title}${e.text}`)), false);
  }
});

test('leaving home names a landlord and does not charge rent again next year', () => {
  const l = adult('lease', 22);
  l.systems.residence.with = 'parents';
  const job = l.job;
  livedAction(l, 'leave-home');
  assert.equal(l.systems.residence.with, 'alone');
  assert.equal(l.job, job);
  assert.equal(typeof l.lived.lease.landlord, 'string');
  const after = l.money;
  l.age += 1;
  livedYear(l, { events: false });
  assert.equal(l.money, after);
  assert.equal(l.job, job);
  l.age = l.lived.lease.until + 1;
  let refused = false;
  for (let i = 0; i < 16 && !refused; i++) {
    const c = adult('renew-' + i, 24);
    c.systems.residence.with = 'parents';
    livedAction(c, 'leave-home');
    const landlord = c.lived.lease.landlord;
    c.age = c.lived.lease.until + 1;
    livedAction(c, 'rent-look');
    assert.equal(c.job, '职员');
    if (c.lived.lease.lapsed) { refused = true; assert.ok((c.log.at(-1).title + c.log.at(-1).text).includes(landlord)); }
  }
  assert.equal(refused, true);
});

test('a job search waits two years and never writes a job', () => {
  let silent = false;
  for (let i = 0; i < 18; i++) {
    const l = adult('search-' + i, 30);
    l.income = 0; l.job = '待业';
    livedAction(l, 'job-search');
    assert.equal(l.job, '待业');
    assert.equal(l.income, 0);
    assert.equal(typeof l.lived.search.name, 'string');
    l.age += 1;
    livedYear(l, { events: false });
    assert.equal(l.job, '待业');
    assert.equal(l.lived.search && l.lived.search.name, l.lived.search.name);
    l.age += 1;
    livedYear(l, { events: false });
    assert.equal(l.job, '待业');
    assert.equal(l.income, 0);
    assert.equal(l.lived.search, null);
    const blob = l.log.map(e => e.title + e.text).join('\n');
    if (blob.includes('没有回音') || blob.includes('不是录用')) silent = true;
  }
  assert.equal(silent, true);
});

test('sleep debt raises the cost of an injury and can block sick leave', () => {
  const tired = adult('hurt-tired', 34);
  const rested = adult('hurt-rested', 34);
  livedAction(tired, 'short-sleep');
  tired.stats.health = 40; rested.stats.health = 40;
  const tiredJob = tired.job, restedJob = rested.job;
  const tiredCash = tired.money, restedCash = rested.money;
  livedAction(tired, 'injury');
  livedAction(rested, 'injury');
  assert.equal(tired.job, tiredJob);
  assert.equal(rested.job, restedJob);
  assert.ok(tiredCash - tired.money > restedCash - rested.money);
  let refused = false;
  for (let i = 0; i < 16 && !refused; i++) {
    const l = adult('leave-' + i, 36);
    l.stats.health = 40;
    livedAction(l, 'short-sleep');
    const job = l.job;
    livedAction(l, 'sick-leave');
    assert.equal(l.job, job);
    if (l.log.some(e => e.title === '病假没有批下来')) refused = true;
  }
  assert.equal(refused, true);
});

test('informal work names a foreman and stops pension years without changing the job', () => {
  const a = adult('gig-a', 33);
  const b = adult('gig-b', 33);
  livedAction(a, 'informal');
  assert.equal(typeof a.lived.foreman, 'string');
  a.age += 1; b.age += 1;
  livedYear(a, { events: false });
  livedYear(b, { events: false });
  assert.ok(b.lived.pensionYears > a.lived.pensionYears);
  assert.equal(a.job, b.job);
});

test('an accepted internship names a mentor and still is not a job', () => {
  let mentored = false;
  for (let i = 0; i < 20 && !mentored; i++) {
    const l = adult('mentor-' + i, 20);
    l.income = 0; l.job = '尚未工作';
    livedAction(l, 'internship');
    assert.equal(l.job, '尚未工作');
    if (l.lived.mentor) { mentored = true; assert.equal(typeof l.lived.mentor.name, 'string'); }
  }
  assert.equal(mentored, true);
});

test('a partner is asked about a child, and declining creates none', () => {
  const l = adult('ask-child', 30);
  l.partner = { name: '林小舟', sex: '女', age: 30, alive: true, bond: 70 };
  l.pending = null;
  livedYear(l, { events: true });
  assert.equal(l.pending && l.pending.system, 'child-plan');
  assert.ok(`${l.pending.title}${l.pending.text}`.includes('林小舟'));
  assert.equal(l.pending.options.at(-1).key, 'wait');
  const money = l.money, job = l.job;
  choose(l, l.pending.options.length - 1);
  assert.equal(l.children.length, 0);
  assert.equal(l.money, money);
  assert.equal(l.job, job);
  const quiet = adult('ask-quiet', 30);
  quiet.partner = { name: '林小舟', sex: '女', age: 30, alive: true };
  quiet.pending = null;
  livedYear(quiet, { events: false });
  assert.equal(quiet.pending, null);
  const busy = adult('ask-busy', 30);
  busy.partner = { name: '林小舟', sex: '女', age: 30, alive: true };
  busy.pending = { kind: 'system', system: 'thread', title: '已有的事', text: '先处理这个', options: [{ key: 'stay', label: '留下' }] };
  livedYear(busy, { events: true });
  assert.equal(busy.pending.system, 'thread');
});

test('trying for a child can fail and never happens without a living partner', () => {
  let failed = false;
  for (let i = 0; i < 16; i++) {
    const l = adult('birth-' + i, 30);
    l.partner = { name: '周晚', sex: '男', age: 31, alive: true, bond: 60 };
    l.pending = null;
    livedYear(l, { events: true });
    assert.equal(l.pending.system, 'child-plan');
    choose(l, 0);
    assert.equal(l.job, '职员');
    if (!l.children.length) failed = true;
  }
  assert.equal(failed, true);
  const alone = adult('birth-alone', 30);
  alone.partner = null;
  alone.pending = null;
  livedYear(alone, { events: true });
  assert.notEqual(alone.pending && alone.pending.system, 'child-plan');
  assert.equal(alone.children.length, 0);
});

test('a debt crisis names a living parent and does not invent work', () => {
  let named = false;
  for (let i = 0; i < 8 && !named; i++) {
    const l = adult('crisis-' + i, 34);
    l.income = 0; l.job = '尚未工作'; l.money = 0; l.debt = l.country.gdp * 2;
    l.finance.arrears = 3; l.finance.lastYear = null; l.house = null;
    l.family.mother.alive = true; l.family.father.alive = true;
    financeYear(l);
    assert.equal(l.job, '尚未工作');
    assert.equal(l.income, 0);
    const hit = l.log.find(e => e.title === '有人在路上拦住你' || e.title === '夜里没有一个稳妥的地方');
    if (hit) named = hit.text.includes(l.family.mother.name) || hit.text.includes(l.family.father.name);
  }
  assert.equal(named, true);
});
