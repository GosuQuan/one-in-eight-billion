import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose } from '../src/engine.js';
import { systemsYear } from '../src/life-systems.js';
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
