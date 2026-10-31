import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose, advanceYear } from '../src/engine.js';
import { systemsYear } from '../src/life-systems.js';
import { financeYear } from '../src/finance.js';
import { LIVED_ACTS, initLived, livedAction, livedYear } from '../src/lived.js';
import { careerAction } from '../src/career.js';
import { educationAction } from '../src/education.js';

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

test('an unrecognized credential blocks a new local job, not a remote one or a job at home', () => {
  const blocked = adult('cred-block', 34);
  blocked.systems.residence.abroadSince = 30;
  blocked.school = { credential: 'university' };
  initLived(blocked);
  blocked.lived.fluent = true;
  blocked.lived.unrecognizedUntil = blocked.age + 4;
  blocked.job = '待业'; blocked.income = 0; blocked.pending = null;
  const state = blocked.randomState;
  const result = careerAction(blocked, 'office');
  assert.equal(result.ok, true);
  assert.match(result.message, /学历/);
  assert.equal(blocked.job, '待业');
  assert.equal(blocked.income, 0);
  assert.equal(blocked.randomState, state);

  const home = adult('cred-home', 34);
  home.systems.residence.abroadSince = null;
  home.school = { credential: 'university' };
  initLived(home);
  home.lived.fluent = false;
  home.lived.unrecognizedUntil = home.age + 5;
  home.job = '待业'; home.income = 0; home.pending = null;
  careerAction(home, 'office');
  assert.equal(home.log.some(e => e.title === '学历挡住了这份本地工作' || e.title === '面试停在语言上'), false);

  let remote = false;
  for (let i = 0; i < 20 && !remote; i++) {
    const l = adult('cred-remote-' + i, 34);
    l.systems.residence.abroadSince = 30;
    l.school = { credential: 'university' };
    initLived(l);
    l.lived.fluent = false;
    l.lived.unrecognizedUntil = l.age + 4;
    l.job = '待业'; l.income = 0; l.pending = null;
    l.stats.knowledge = 90; l.focus = 'work';
    careerAction(l, 'remote');
    assert.equal(l.log.some(e => e.title === '面试停在语言上' || e.title === '学历挡住了这份本地工作'), false);
    if (l.remote && l.income > 0) remote = true;
  }
  assert.equal(remote, true);
});

test('language can refuse a new local job and can still allow one', () => {
  let refused = false, hired = false;
  for (let i = 0; i < 28 && !(refused && hired); i++) {
    const l = adult('lang-job-' + i, 34);
    l.systems.residence.abroadSince = 30;
    initLived(l);
    l.lived.fluent = false;
    l.lived.unrecognizedUntil = 0;
    l.job = '待业'; l.income = 0; l.pending = null;
    l.stats.knowledge = 80; l.stats.social = 80; l.focus = 'work';
    careerAction(l, 'apprentice');
    if (l.log.some(e => e.title === '面试停在语言上')) {
      assert.equal(l.job, '待业');
      assert.equal(l.income, 0);
      refused = true;
    }
    if (l.job === '维修学徒' && l.income > 0) hired = true;
  }
  assert.equal(refused, true);
  assert.equal(hired, true);

  const heard = adult('heard-cred', 34);
  heard.systems.residence.abroadSince = 30;
  initLived(heard);
  heard.lived.fluent = true;
  heard.lived.unrecognizedUntil = 40;
  heard.job = '待业'; heard.income = 0;
  heard.pending = { kind: 'system', system: 'opportunity', offerKind: 'local', jobKind: 'office', title: '本地', text: '试', options: [{ key: 'try', label: '去试试', description: '面试' }] };
  choose(heard, 0);
  assert.equal(heard.income, 0);
  assert.equal(heard.job, '待业');
  assert.equal(heard.log.some(e => e.title === '学历挡住了这份本地工作'), true);
});

test('stopping medicine keeps costing for two more years and restarting can fail', () => {
  const l = adult('meds', 30);
  l.systems.conditions = [{ name: '慢性胃炎', severity: 20, resolved: false }];
  livedAction(l, 'skip-meds');
  assert.equal(l.systems.conditions[0].severity, 28);
  assert.equal(l.lived.medLapse.until, 32);
  assert.equal(l.job, '职员');
  l.age = 31;
  livedYear(l, { events: false });
  assert.equal(l.systems.conditions[0].severity, 32);
  l.age = 32;
  livedYear(l, { events: false });
  assert.equal(l.systems.conditions[0].severity, 36);
  assert.ok(l.stats.health < 80);
  assert.ok(l.log.some(e => e.title === '停药还在起作用' && e.text.includes('慢性胃炎')));
  l.age = 33;
  const sev = l.systems.conditions[0].severity;
  const health = l.stats.health;
  livedYear(l, { events: false });
  assert.equal(l.systems.conditions[0].severity, sev);
  assert.equal(l.stats.health, health);

  let failed = false, restarted = false;
  for (let i = 0; i < 20 && !(failed && restarted); i++) {
    const a = adult('restart-' + i, 30);
    a.systems.conditions = [{ name: '慢性胃炎', severity: 28, resolved: false }];
    initLived(a);
    a.lived.medLapse = { name: '慢性胃炎', until: 32 };
    const before = a.money;
    livedAction(a, 'adhere');
    assert.ok(a.money < before);
    if (a.log.some(e => e.title === '药没有续上')) {
      assert.equal(a.lived.medLapse.until, 32);
      assert.equal(a.systems.conditions[0].severity, 28);
      failed = true;
    }
    if (a.lived.medLapse == null) {
      assert.equal(a.systems.conditions[0].severity, 22);
      restarted = true;
    }
  }
  assert.equal(failed, true);
  assert.equal(restarted, true);
});

test('a visit can miss the person, and a letter still has a name years later', () => {
  let missed = false, seen = false;
  for (let i = 0; i < 20 && !(missed && seen); i++) {
    const l = adult('visit-' + i, 40);
    initLived(l);
    l.lived.grief = [{ key: '母亲:林母', name: '林母', role: '母亲', since: 40 }];
    const happy = l.stats.happiness;
    const money = l.money;
    livedAction(l, 'grief-visit');
    assert.ok(l.money < money);
    assert.ok(l.lived.grief.some(g => g.name === '林母'));
    if (l.log.some(e => e.title === '没能去成林母那里')) {
      assert.equal(l.stats.happiness, happy);
      missed = true;
    }
    if (l.log.some(e => e.title === '去看林母')) seen = true;
  }
  assert.equal(missed, true);
  assert.equal(seen, true);

  const late = adult('letter-late', 40);
  initLived(late);
  late.lived.grief = [{ key: '母亲:林母', name: '林母', role: '母亲', since: 34 }];
  livedAction(late, 'letter');
  assert.ok(late.log.some(e => e.title.includes('林母')));
  late.age = 43;
  const letters = late.lived.letters.length;
  const blocked = livedAction(late, 'letter');
  assert.equal(blocked.ok, false);
  assert.equal(late.lived.letters.length, letters);
});

test('a named classmate keeps the days tight until the talk happens or the years pass', () => {
  const l = adult('bully-drag', 14);
  l.job = '尚未工作'; l.income = 0;
  const happy = l.stats.happiness;
  const social = l.stats.social;
  livedAction(l, 'bully');
  const name = l.lived.bully.name;
  assert.ok(l.friends.some(f => f.name === name));
  l.age = 16;
  livedYear(l, { events: false });
  assert.ok(l.stats.happiness < happy);
  assert.ok(l.stats.social < social);
  assert.equal(l.job, '尚未工作');
  assert.equal(l.income, 0);
  l.age = 18;
  livedYear(l, { events: false });
  assert.equal(l.lived.bully.ended, false);
  assert.ok(l.log.some(e => e.title === `${name}不再天天出现`));

  let refused = false;
  for (let i = 0; i < 16 && !refused; i++) {
    const a = adult('bully-no-' + i, 14);
    a.stats.social = 0;
    livedAction(a, 'bully');
    const who = a.lived.bully.name;
    a.age = 15;
    livedAction(a, 'reconcile');
    if (a.log.some(e => e.title === '话没有说开')) {
      assert.equal(a.lived.bully.ended, false);
      assert.equal(a.lived.bully.name, who);
      refused = true;
    }
  }
  assert.equal(refused, true);
});

test('a recommendation can sit on the next job and still fail', () => {
  const named = (seed, age = 34) => {
    const l = adult(seed, age);
    l.job = '待业'; l.income = 0; l.pending = null; l.school = { credential: 'none' };
    l.friends = [{ id: 'f1', name: '林荐', alive: true, bond: 60 }];
    initLived(l);
    l.lived.reference = { name: '林荐', until: l.age + 3 };
    l.stats.knowledge = 10; l.stats.social = 10; l.focus = 'joy';
    return l;
  };
  let refused = false, hired = false;
  for (let i = 0; i < 24 && !(refused && hired); i++) {
    const l = named('ref-' + i);
    careerAction(l, 'apprentice');
    if (l.log.some(e => e.text.includes('林荐的名字在材料上，这次仍没有录用'))) {
      assert.equal(l.job, '待业');
      assert.equal(l.income, 0);
      assert.equal(l.lived.reference.name, '林荐');
      refused = true;
    }
    if (l.log.some(e => e.text.includes('林荐的名字在材料上，这句推荐到此用掉'))) {
      assert.equal(l.job, '维修学徒');
      assert.ok(l.income > 0);
      assert.equal(l.lived.reference, null);
      hired = true;
    }
  }
  assert.equal(refused, true);
  assert.equal(hired, true);

  const dead = named('ref-dead');
  dead.friends[0].alive = false;
  careerAction(dead, 'apprentice');
  assert.equal(dead.log.some(e => e.text.includes('的名字在材料上')), false);
  assert.equal(dead.lived.reference.name, '林荐');

  const promo = named('ref-promo');
  promo.income = 40000; promo.job = '职员'; promo.jobKind = 'office'; promo.careerYears = 6;
  careerAction(promo, 'promotion');
  assert.equal(promo.log.some(e => e.text.includes('的名字在材料上')), false);
  assert.equal(promo.lived.reference.name, '林荐');

  let heardNo = false, heardYes = false;
  for (let i = 0; i < 30 && !(heardNo && heardYes); i++) {
    const l = named('heard-ref-' + i);
    l.stats.knowledge = 0; l.careerYears = 0;
    l.pending = { kind: 'system', system: 'opportunity', offerKind: 'local', jobKind: 'apprentice', title: '本地', text: '试', options: [{ key: 'try', label: '去试试', description: '面试' }] };
    choose(l, 0);
    if (l.log.some(e => e.title === '本地的位置没有你' && e.text.includes('林荐'))) {
      assert.equal(l.job, '待业');
      assert.equal(l.lived.reference.name, '林荐');
      heardNo = true;
    }
    if (l.log.some(e => e.title === '本地录用了你' && e.text.includes('林荐'))) {
      assert.equal(l.lived.reference, null);
      assert.ok(l.income > 0);
      heardYes = true;
    }
  }
  assert.equal(heardNo, true);
  assert.equal(heardYes, true);
});

test('waiting to apply again blocks the next application and does not grant a credential', () => {
  const l = adult('exam-wait', 30);
  initLived(l);
  l.lived.examWait = 31;
  l.school.credential = 'none'; l.school.program = null; l.stats.knowledge = 80; l.money = 80000;
  const money = l.money;
  const blocked = educationAction(l, 'adult-basic');
  assert.match(blocked.message, /等到31岁/);
  assert.equal(l.money, money);
  assert.equal(l.school.credential, 'none');
  assert.equal(l.school.program, null);
  l.age = 31;
  const again = educationAction(l, 'adult-basic');
  assert.doesNotMatch(again.message, /等到/);
  assert.ok(l.money < money);
  assert.equal(l.school.credential, 'none');
});

test('an unfinished chore argument keeps the partner name for two years', () => {
  let fought = false, settled = false;
  for (let i = 0; i < 16 && !(fought && settled); i++) {
    const l = adult('chore-' + i, 32);
    l.partner = { name: '林伴', alive: true, bond: 50 };
    l.job = '职员'; l.income = 40000;
    livedAction(l, 'chores');
    if (l.log.some(e => e.title === '家务没有分清')) {
      assert.equal(l.lived.choreUntil, 34);
      const bond = l.partner.bond;
      l.age = 33;
      livedYear(l, { events: false });
      assert.ok(l.log.some(e => e.title === '林伴还记着那轮家务'));
      assert.ok(l.partner.bond < bond);
      assert.equal(l.job, '职员');
      assert.equal(l.income, 40000);
      fought = true;
    }
    if (l.log.some(e => e.title === '家务说定了一轮')) {
      assert.equal(l.lived.choreUntil, 0);
      l.age = 33;
      livedYear(l, { events: false });
      assert.equal(l.log.some(e => e.title === '林伴还记着那轮家务'), false);
      settled = true;
    }
  }
  assert.equal(fought, true);
  assert.equal(settled, true);
});

test('commute keeps charging while the job stays local and stops when it does not', () => {
  const l = adult('commute', 34);
  l.remote = false;
  const happy = l.stats.happiness;
  const money = l.money;
  livedAction(l, 'commute');
  assert.equal(l.lived.commuteOn, true);
  assert.equal(l.lived.commuteYears, 1);
  assert.ok(l.money < money);
  assert.equal(l.job, '职员');
  const once = l.money;
  const again = livedAction(l, 'commute');
  assert.equal(again.ok, false);
  assert.equal(l.money, once);
  l.age = 35;
  livedYear(l, { events: false });
  assert.equal(l.lived.commuteYears, 2);
  assert.ok(l.money < once);
  assert.ok(l.stats.happiness < happy);
  assert.equal(l.job, '职员');
  assert.equal(l.income, 40000);
  assert.ok(l.log.some(e => e.title === '路上的时间还在'));
  l.remote = true;
  l.age = 36;
  const income = l.income;
  livedYear(l, { events: false });
  assert.equal(l.lived.commuteOn, false);
  assert.equal(l.income, income);
  assert.ok(l.log.some(e => e.title === '路上的时间停了'));
});

test('a service year can be refused, and an accepted one is not a job', () => {
  const idle = (seed) => {
    const l = adult(seed, 22);
    l.job = '待业'; l.income = 0; l.remote = false;
    return l;
  };
  const busy = idle('service-busy');
  busy.job = '职员'; busy.income = 40000;
  assert.equal(livedAction(busy, 'service-year').ok, false);
  assert.equal(busy.income, 40000);

  let refused = false, accepted = false;
  for (let i = 0; i < 24 && !(refused && accepted); i++) {
    const l = idle('service-' + i);
    const money = l.money;
    livedAction(l, 'service-year');
    if (l.log.some(e => e.title.endsWith('没有收下服役'))) {
      assert.equal(l.money, money);
      assert.equal(l.income, 0);
      assert.equal(l.job, '待业');
      assert.equal(l.lived.served, undefined);
      assert.equal(l.lived.serviceNext, 23);
      assert.equal(livedAction(l, 'service-year').ok, false);
      refused = true;
    }
    if (l.log.some(e => e.title === '社区服役的一年')) {
      assert.ok(l.money > money);
      assert.equal(l.income, 0);
      assert.equal(l.job, '待业');
      assert.equal(l.lived.served, true);
      assert.equal(l.lived.serviceUntil, 22);
      const blocked = careerAction(l, 'apprentice');
      assert.match(blocked.message, /服役/);
      assert.equal(l.job, '待业');
      assert.equal(l.income, 0);
      l.pending = { kind: 'system', system: 'opportunity', offerKind: 'local', jobKind: 'apprentice', title: '本地', text: '试', options: [{ key: 'try', label: '去试试', description: '面试' }] };
      choose(l, 0);
      assert.ok(l.log.some(e => e.title === '服役还没结束'));
      assert.equal(l.job, '待业');
      assert.equal(l.income, 0);
      accepted = true;
    }
  }
  assert.equal(refused, true);
  assert.equal(accepted, true);
});

test('a gap year blocks the next application and does not create a wage or a credential', () => {
  const l = adult('gap', 22);
  l.job = '待业'; l.income = 0;
  l.school = { credential: 'none', program: null, preparation: 0, attempts: {}, randomState: 1, milestones: [], basicProgress: 0 };
  l.stats.knowledge = 80; l.money = 80000;
  livedAction(l, 'gap-year');
  assert.equal(l.lived.gapUntil, 23);
  assert.equal(l.income, 0);
  const money = l.money;
  const blocked = educationAction(l, 'adult-basic');
  assert.match(blocked.message, /空着/);
  assert.equal(l.money, money);
  assert.equal(l.school.credential, 'none');
  assert.equal(l.school.program, null);
  l.age = 23;
  const again = educationAction(l, 'adult-basic');
  assert.doesNotMatch(again.message, /空着/);
  assert.ok(l.money < money);
  assert.equal(l.school.credential, 'none');
  assert.equal(l.income, 0);
});

test('overtime can go unpaid, and sleep debt makes the month cost more', () => {
  let unpaid = false, paid = false;
  for (let i = 0; i < 24 && !(unpaid && paid); i++) {
    const l = adult('ot-' + i, 33);
    const money = l.money;
    const health = l.stats.health;
    livedAction(l, 'overtime');
    assert.equal(l.job, '职员');
    assert.equal(l.income, 40000);
    assert.equal(l.lived.overtimeUntil, 34);
    assert.equal(livedAction(l, 'overtime').ok, false);
    assert.equal(l.stats.health, health - 2);
    if (l.log.some(e => e.title === '加班没有补贴')) {
      assert.equal(l.money, money);
      unpaid = true;
    }
    if (l.log.some(e => e.title === '加班换了一笔')) {
      assert.ok(l.money > money);
      paid = true;
    }
  }
  assert.equal(unpaid, true);
  assert.equal(paid, true);

  const sleepy = adult('ot-sleep', 33);
  initLived(sleepy);
  sleepy.lived.sleepUntil = 40;
  const health = sleepy.stats.health;
  livedAction(sleepy, 'overtime');
  assert.equal(sleepy.stats.health, health - 3);
  assert.equal(sleepy.job, '职员');
  assert.equal(sleepy.income, 40000);
  let sleepyUnpaid = sleepy.log.some(e => e.title === '加班没有补贴' && e.text.includes('睡眠债'));
  for (let i = 0; i < 20 && !sleepyUnpaid; i++) {
    const l = adult('ot-sleep-' + i, 33);
    initLived(l);
    l.lived.sleepUntil = 40;
    const money = l.money;
    livedAction(l, 'overtime');
    if (l.log.some(e => e.title === '加班没有补贴' && e.text.includes('睡眠债'))) {
      assert.equal(l.money, money);
      assert.equal(l.income, 40000);
      assert.equal(l.job, '职员');
      sleepyUnpaid = true;
    }
  }
  assert.equal(sleepyUnpaid, true);
});

test('parental leave stays at seventy percent for two years and is not a promotion', () => {
  const parentOf = (seed) => {
    const l = adult(seed, 30);
    l.jobKind = 'office';
    l.children = [{ id: 'lin-tong', name: '林童', sex: '女', age: 0, birthYear: l.birthYear + 30, alive: true, bond: 70 }];
    l.systems.care = { 'lin-tong': { mode: 'nursery', since: 30 } };
    l.income = 40000; l.job = '职员';
    return l;
  };
  const none = adult('leave-none', 30);
  assert.equal(livedAction(none, 'parental-leave').ok, false);
  assert.equal(none.income, 40000);

  const a = parentOf('leave');
  const b = parentOf('leave');
  assert.equal(a.randomState, b.randomState);
  livedAction(a, 'parental-leave');
  assert.equal(a.income, 28000);
  assert.equal(a.job, '职员');
  assert.equal(a.lived.leaveFull, 40000);
  assert.equal(a.lived.leaveUntil, 31);
  livedYear(a, { events: false });
  assert.equal(a.income, 28000);
  assert.match(careerAction(a, 'promotion').message, /育儿假/);
  assert.equal(a.job, '职员');
  assert.equal(a.income, 28000);
  a.pending = { kind: 'system', system: 'opportunity', offerKind: 'raise', title: '评估', text: '试', options: [{ key: 'try', label: '去', description: '评估' }] };
  choose(a, 0);
  assert.ok(a.log.some(e => e.title === '假还没结束'));
  assert.equal(a.job, '职员');
  assert.equal(a.income, 28000);

  advanceYear(a, { events: false });
  advanceYear(b, { events: false });
  assert.equal(a.age, 31);
  assert.equal(a.job, '职员');
  assert.equal(b.job, '职员');
  assert.ok(Math.abs(a.income - Math.round(b.income * 0.7)) <= 1);
  assert.ok(a.income > b.income * 0.6);
  assert.equal(a.lived.leaveCut, 31);
  advanceYear(a, { events: false });
  assert.equal(a.age, 32);
  assert.equal(a.lived.leaveCut, 31);
  assert.equal(a.job, '职员');
});

test('a refused talk with a sibling keeps that name for two years', () => {
  const withSib = (seed) => {
    const l = adult(seed, 34);
    l.family.siblings = [{ name: '林兄', alive: true, bond: 40 }];
    return l;
  };
  let refused = false, settled = false;
  for (let i = 0; i < 24 && !(refused && settled); i++) {
    const l = withSib('sib-' + i);
    livedAction(l, 'sibling');
    assert.equal(l.job, '职员');
    assert.equal(l.income, 40000);
    assert.equal(livedAction(l, 'sibling').ok, false);
    if (l.log.some(e => e.title === '兄弟姐妹不想谈')) {
      assert.equal(l.family.siblings[0].bond, 34);
      assert.equal(l.lived.siblingRift.name, '林兄');
      assert.equal(l.lived.siblingRift.until, 36);
      l.age = 35;
      livedYear(l, { events: false });
      assert.equal(l.family.siblings[0].bond, 33);
      assert.equal(l.job, '职员');
      assert.equal(l.income, 40000);
      assert.ok(l.log.some(e => e.age === 35 && e.title === '林兄还记着那次没谈拢'));
      refused = true;
    }
    if (l.log.some(e => e.title === '和兄弟姐妹说上了')) {
      assert.equal(l.family.siblings[0].bond, 45);
      assert.equal(l.lived.siblingRift, undefined);
      l.age = 35;
      livedYear(l, { events: false });
      assert.ok(!l.log.some(e => e.title === '林兄还记着那次没谈拢'));
      settled = true;
    }
  }
  assert.equal(refused, true);
  assert.equal(settled, true);

  const gone = withSib('sib-gone');
  initLived(gone);
  gone.lived.siblingRift = { name: '林兄', until: 36 };
  gone.family.siblings[0].alive = false;
  gone.age = 35;
  livedYear(gone, { events: false });
  assert.equal(gone.lived.siblingRift, null);
  assert.ok(!gone.log.some(e => e.title === '林兄还记着那次没谈拢'));
  assert.equal(gone.job, '职员');
  assert.equal(gone.income, 40000);

  let cleared = false;
  for (let i = 0; i < 40 && !cleared; i++) {
    const l = withSib('sib-clear-' + i);
    livedAction(l, 'sibling');
    if (!l.lived.siblingRift) continue;
    l.age = 35;
    livedAction(l, 'sibling');
    if (l.log.some(e => e.age === 35 && e.title === '和兄弟姐妹说上了')) {
      assert.equal(l.lived.siblingRift, null);
      assert.equal(l.job, '职员');
      assert.equal(l.income, 40000);
      l.age = 36;
      livedYear(l, { events: false });
      assert.ok(!l.log.some(e => e.age === 36 && e.title === '林兄还记着那次没谈拢'));
      cleared = true;
    }
  }
  assert.equal(cleared, true);
});

test('elder care keeps visiting for two years and stops if the parent is gone', () => {
  const elderOf = (seed) => {
    const l = adult(seed, 40);
    l.family.mother = { ...(l.family.mother || {}), name: '林母', alive: true, age: 74, bond: 50 };
    if (l.family.father) l.family.father.alive = false;
    return l;
  };
  let refused = false, kept = false;
  for (let i = 0; i < 24 && !(refused && kept); i++) {
    const l = elderOf('elder-' + i);
    const fee = Math.round(l.country.gdp * .04);
    const before = l.money;
    livedAction(l, 'elder-care');
    assert.equal(l.money, before - fee);
    assert.equal(l.debt, 0);
    assert.equal(l.job, '职员');
    assert.equal(l.income, 40000);
    assert.equal(livedAction(l, 'elder-care').ok, false);
    if (l.log.some(e => e.title === '父母把你挡回去了')) {
      assert.equal(l.family.mother.bond, 50);
      assert.equal(l.lived.elderKeep, undefined);
      const held = l.money;
      l.age = 41;
      livedYear(l, { events: false });
      assert.equal(l.money, held);
      assert.equal(l.job, '职员');
      assert.equal(l.income, 40000);
      assert.ok(!l.log.some(e => e.title === '林母还等你再来'));
      refused = true;
    }
    if (l.log.some(e => e.title === '这一年照着林母')) {
      assert.equal(l.family.mother.bond, 54);
      assert.equal(l.lived.elderKeep.name, '林母');
      assert.equal(l.lived.elderKeep.until, 42);
      const after = l.money;
      livedYear(l, { events: false });
      assert.equal(l.money, after);
      const trip = Math.round(l.country.gdp * .008);
      l.age = 41;
      livedYear(l, { events: false });
      assert.equal(l.money, after - trip);
      assert.equal(l.family.mother.bond, 54);
      assert.equal(l.job, '职员');
      assert.equal(l.income, 40000);
      assert.ok(l.log.some(e => e.age === 41 && e.title === '林母还等你再来'));
      l.age = 42;
      livedYear(l, { events: false });
      assert.equal(l.money, after - trip * 2);
      l.age = 43;
      livedYear(l, { events: false });
      assert.equal(l.money, after - trip * 2);
      assert.ok(!l.log.some(e => e.age === 43 && e.title === '林母还等你再来'));
      kept = true;
    }
  }
  assert.equal(refused, true);
  assert.equal(kept, true);

  const gone = elderOf('elder-gone');
  initLived(gone);
  gone.lived.elderKeep = { name: '林母', until: 42 };
  const held = gone.money;
  gone.family.mother.alive = false;
  gone.age = 41;
  livedYear(gone, { events: false });
  assert.equal(gone.lived.elderKeep, null);
  assert.equal(gone.money, held);
  assert.equal(gone.job, '职员');
  assert.equal(gone.income, 40000);
  assert.ok(!gone.log.some(e => e.title === '林母还等你再来'));
});

test('sick leave keeps the job and blocks a promotion that year', () => {
  const l = adult('sick-ok', 36);
  l.stats.health = 40;
  const before = l.money;
  const lost = Math.round(l.income * .06);
  assert.equal(livedAction(l, 'sick-leave').ok, true);
  assert.equal(l.job, '职员');
  assert.equal(l.income, 40000);
  assert.equal(l.money, before - lost);
  assert.equal(l.lived.sickUntil, 36);
  assert.equal(livedAction(l, 'sick-leave').ok, false);
  assert.match(careerAction(l, 'promotion').message, /病假/);
  assert.equal(l.job, '职员');
  assert.equal(l.income, 40000);
  l.pending = { kind: 'system', system: 'opportunity', offerKind: 'raise', title: '评估', text: '试', options: [{ key: 'try', label: '去', description: '评估' }] };
  choose(l, 0);
  assert.ok(l.log.some(e => e.title === '病假还没结束'));
  assert.equal(l.job, '职员');
  assert.equal(l.income, 40000);
  l.pending = null;
  l.age = 37;
  assert.equal(/病假/.test(careerAction(l, 'promotion').message), false);

  let refused = false;
  for (let i = 0; i < 20 && !refused; i++) {
    const x = adult('sick-no-' + i, 36);
    x.stats.health = 40;
    livedAction(x, 'short-sleep');
    const cash = x.money;
    livedAction(x, 'sick-leave');
    if (x.log.some(e => e.title === '病假没有批下来')) {
      assert.equal(x.money, cash);
      assert.equal(x.income, 40000);
      assert.equal(x.job, '职员');
      assert.equal(x.lived.sickUntil, undefined);
      assert.equal(livedAction(x, 'sick-leave').ok, false);
      refused = true;
    }
  }
  assert.equal(refused, true);
});
