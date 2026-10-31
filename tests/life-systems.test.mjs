import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, COUNTRIES, advanceYear, choose } from '../src/engine.js';
import { financeYear } from '../src/finance.js';
import { initSystems, systemsYear, systemAction, systemChoice, getHousehold, getSceneState, peopleMilestone } from '../src/life-systems.js';
const clone = x => JSON.parse(JSON.stringify(x));
function adult(seed = 'systems') { const l = createLife({ seed, country: 'CN' }); l.age = 28; l.income = 20000; l.money = 500000; initSystems(l); l.systems.residence.with = 'alone'; return l; }
function select(l, key) { const p = l.pending; assert.equal(p?.kind, 'system'); const i = p.options.findIndex(o => o.key === key); assert.ok(i >= 0, key); assert.equal(systemChoice(l, p, i), true); }
function next(l) { l.pending = null; l.age++; systemsYear(l); }
function addPartner(l) { l.partner = { name: '林小舟', sex: '女', age: 28, income: 14000, bond: 75, alive: true }; }
function conceive(l) {
 if (!l.partner) addPartner(l);
 for (let i = 0; i < 16 && !l.children.length; i++) {
  l.pending = null; l.systems.lastConceptionAge = null; if (i) l.age++;
  assert.equal(systemAction(l, 'plan-child').ok, true); select(l, 'birth');
 }
 assert.equal(l.children.length, 1);
}
function emigrate(l, id) {
 for (let i = 0; i < 24 && l.country.id !== id; i++) {
  l.pending = null; l.systems.visaUntil = 0; l.money = Math.max(l.money, 800000);
  systemAction(l, 'move-abroad', { countryId: id }); select(l, 'solo');
 }
 assert.equal(l.country.id, id, id);
}

test('initialization is idempotent, consumes no randomness and preserves JSON', () => {
 const l = createLife({ seed: 'init', country: 'CN' }); const state = l.randomState; initSystems(l); const saved = clone(l); initSystems(l);
 assert.equal(l.randomState, state); assert.deepEqual(l, saved); assert.deepEqual(clone(l), l);
 assert.deepEqual(getHousehold(l).map(p => p.role), ['自己', '母亲', '父亲']);
 assert.equal(getHousehold(l)[1].name, l.family.mother.name);
});
test('birth immediately chains care, with continuing costs and child growth', () => {
 const l = adult(); addPartner(l); conceive(l);
 assert.equal(l.children.length, 1); assert.equal(l.pending.system, 'child-care'); const c = l.children[0];
 assert.equal(getHousehold(l).find(p => p.id === c.id).name, c.name);
 select(l, 'partner'); const cash = l.money; next(l);
 assert.equal(c.age, 1); assert.ok(l.money < cash); assert.equal(l.systems.care[c.id].incomeLoss, 3080); assert.ok(c.development > 50);
 assert.ok(l.log.some(e => e.text.includes(c.name) || e.title.includes(c.name)));
 l.partner.alive = false; next(l); assert.equal(l.pending.system, 'child-care'); assert.ok(!l.pending.options.some(o => o.key === 'partner'));
});
test('grandparent care is only offered while grandparents are alive and local', () => {
 const l = adult(); l.family.mother.alive = l.family.father.alive = false;
 conceive(l); assert.ok(!l.pending.options.some(o => o.key === 'grandparents'));
 select(l, 'nursery'); next(l); assert.ok(l.systems.care[l.children[0].id].annualCost > 0);
});
test('solo migration leaves named family home, reunion moves them, return restores country', () => {
 const l = adult('migration'); addPartner(l); l.children.push({ name: '林小雨', sex: '男', age: 2, birthYear: l.birthYear + l.age - 2 }); initSystems(l);
 l.systems.residence.with = 'family';
 emigrate(l, 'CA');
 assert.equal(l.country.id, 'CA'); assert.equal(l.country.gdp, COUNTRIES.find(c => c.id === 'CA').gdp);
 assert.deepEqual(getHousehold(l).map(p => p.id), ['self']); assert.equal(l.systems.residence.familyCountryId, 'CN');
 assert.equal(systemAction(l, 'reunite-family').ok, true);
 assert.deepEqual(getHousehold(l).map(p => p.name), [l.name, '林小舟', '林小雨']);
 assert.equal(systemAction(l, 'return-home').ok, true); assert.equal(l.country.id, 'CN'); assert.equal(l.systems.residence.abroadSince, null);
 assert.equal(getHousehold(l).length, 3); assert.ok(l.log.every(e => Number.isFinite(e.age) && Number.isFinite(e.year)));
});
test('migration review follows three years and preserves choice chains through JSON', () => {
 const l = adult('review'); addPartner(l); emigrate(l, 'JP');
 l.age += 3; systemsYear(l); assert.equal(l.pending.system, 'migration-review');
 const saved = clone(l); select(l, 'reunite'); select(saved, 'reunite'); assert.deepEqual(l, saved);
 assert.equal(getHousehold(l).length, 2);
});
test('pets retain names, age, costs and medical choices', () => {
 const l = adult('pet'); assert.equal(systemAction(l, 'adopt-cat', { name: '橘子' }).ok, true); const cash = l.money;
 next(l); assert.equal(l.systems.pet.age, 1); assert.ok(l.money < cash); l.pending = null; l.systems.pet.health = 35;
 next(l); assert.equal(l.pending.system, 'pet-care'); select(l, 'vet'); assert.ok(l.systems.pet.health > 35);
 assert.equal(getSceneState(l).pet.name, '橘子'); assert.equal(systemAction(l, 'adopt-dog').ok, false);
});
test('business requires investment, supports management and annual profit or loss', () => {
 const l = adult('business'); const cash = l.money; systemAction(l, 'start-business', { name: '小雨工作室' }); select(l, 'service');
 assert.ok(l.money < cash); assert.equal(l.systems.business.sector, '技术服务');
 systemAction(l, 'business-manage'); select(l, 'hire'); assert.equal(l.systems.business.staff, 1);
 next(l); assert.ok(Number.isFinite(l.systems.business.income)); assert.ok(l.log.some(e => /年度账本/.test(e.title)));
 l.pending = null; systemAction(l, 'business-manage'); select(l, 'expand'); assert.equal(l.systems.business.level, 2);
 systemAction(l, 'business-manage'); select(l, 'close'); assert.equal(l.systems.business, null);
});
test('medical plans persist, delay harms health and insurance reduces actual expense', () => {
 const a = adult('medical'), b = clone(a); b.insurance = true;
 systemAction(a, 'checkup'); systemAction(b, 'checkup'); select(a, 'standard'); select(b, 'standard');
 assert.ok(b.money > a.money); assert.equal(a.systems.conditions[0].treatment, 'standard');
 const d = adult('delay'); systemAction(d, 'checkup'); select(d, 'delay'); const health = d.stats.health; const severity = d.systems.conditions[0].severity;
 next(d); assert.ok(d.stats.health < health); assert.ok(d.systems.conditions[0].severity > severity);
 assert.equal(getSceneState(a).kind, 'hospital'); a.age++; assert.notEqual(getSceneState(a).kind, 'hospital');
});
test('annual world events share calendar headlines and include rare war', () => {
 const a = adult('world-a'), b = adult('world-b'); systemsYear(a); systemsYear(b); assert.deepEqual(a.systems.world, b.systems.world);
 assert.equal(a.systems.world.year, a.birthYear + a.age); assert.ok(a.systems.world.detail.length > 0);
 const headlines = [];
 for (let y = 2030; y < 3030; y++) { const l = adult('war'); l.birthYear = y - l.age; systemsYear(l); headlines.push(l.systems.world.kind); if (l.systems.world.kind === 'war') { assert.equal(l.pending.system, 'world-crisis'); assert.ok(l.systems.world.detail.length > 0); } }
 assert.ok(headlines.includes('war')); assert.ok(headlines.filter(k => k === 'war').length < 30);
});
test('residents respect independent housing, death, absent and adult children', () => {
 const l = adult('residents'); addPartner(l); l.children.push({ name: '成年孩子', age: 22, birthYear: l.birthYear + 6, sex: '男' }); initSystems(l);
 assert.deepEqual(getHousehold(l).map(p => p.role), ['自己']); systemAction(l, 'housing', { with: 'family' }); assert.equal(getHousehold(l).length, 2);
 l.partner.alive = false; assert.equal(getHousehold(l).length, 1);
 systemAction(l, 'housing', { with: 'parents' }); l.family.mother.alive = false;
 assert.deepEqual(getHousehold(l).map(p => p.role), ['自己', '父亲']);
 const saved = clone(l); assert.deepEqual(getSceneState(l), getSceneState(saved));
});
test('low relationship bond offers communication, counseling and separation', () => {
 const l = adult('relationship'); addPartner(l); l.systems.residence.with = 'family'; l.partner.bond = 20; systemsYear(l);
 assert.equal(l.pending.system, 'relationship'); select(l, 'separate'); assert.equal(l.pending.system, 'divorce'); select(l, 'self'); assert.equal(l.partner, null); assert.equal(getHousehold(l).length, 1);
});
test('named spouse and pet incidents actually cost money and mention real names', () => {
 const l = adult('intimate'); addPartner(l); systemAction(l, 'adopt-dog');
 let partnerNamed = 0, spouseLoss = false, petStory = false;
 for (let year = 0; year < 60 && !l.dead; year++) {
  const before = l.money; next(l);
  const spent = Math.round(before - l.money);
  for (const entry of l.log.slice(-4)) {
   if (entry.type === 'family' && entry.text.includes(l.partner.name)) partnerNamed++;
   if (entry.type === 'pet' && entry.text.includes(l.systems.pet?.name || '\u0000')) petStory = true;
  }
  if (l.log.some(entry => entry.type === 'family' && /打碎|追尾/.test(entry.title + entry.text) && spent > 0)) spouseLoss = true;
  if (l.pending && l.pending.kind === 'system') systemChoice(l, l.pending, 0);
 }
 assert.ok(partnerNamed >= 1, 'partner appears by name in yearly events');
 assert.ok(spouseLoss, 'spouse incident actually bills the player');
 assert.ok(petStory, 'pet story mentions its name');
});
test('hometown plan can move rural parents in and is offered while abroad', () => {
 const l = adult('hometown'); addPartner(l);
 l.systems.residence.familyWith = 'alone'; l.family.mother.age = l.family.father.age = 65;
 emigrate(l, 'US');
 assert.equal(l.systems.residence.abroadSince, l.age);
 let offered = false;
 for (let year = 0; year < 80 && !l.dead; year++) {
  next(l);
  if (l.pending?.system === 'hometown-plan') { offered = true; select(l, 'invite'); break; }
  if (l.pending?.kind === 'system') systemChoice(l, l.pending, 0);
 }
 assert.ok(offered, 'hometown plan appears during an extended overseas life');
 const res = l.systems.residence;
 assert.equal(res.with, 'parents'); assert.equal(res.parentsCountryId, res.countryId); assert.notEqual(res.familyCountryId, res.countryId);
 const names = getHousehold(l).map(p => p.name);
 assert.ok(names.includes(l.family.mother.name) || names.includes(l.family.father.name));
});

test('children never receive adult hometown costs or elder relocation choices', () => {
 for (let seed = 0; seed < 100; seed++) { const l = adult(`young-${seed}`); l.age = 6; l.money = 0; l.systems.residence.with = 'parents'; systemsYear(l); assert.notEqual(l.pending?.system, 'hometown-plan'); assert.equal(l.money, 0); assert.equal(l.debt, 0); assert.ok(!l.log.some(e => /养老|下班|搬来和你同住|屋顶要翻修/.test(e.text + e.title))); assert.equal(systemAction(l, 'divorce').ok, false); }
});
test('distance weakens bonds, contact helps but reunion needs cash reserves', () => {
 const a = adult('distance'); addPartner(a); emigrate(a, 'CA');
 const b = clone(a); b.partner.lastContactAge = b.age;
 a.age++; b.age++; systemsYear(a, { events: false }); systemsYear(b, { events: false });
 assert.equal(a.partner.distanceYears, 1); assert.ok(a.partner.bond < b.partner.bond); assert.ok(b.partner.bond < 75);
 a.pending = null; a.money = 0; const debt = a.debt; assert.equal(systemAction(a, 'reunite-family').ok, false); assert.equal(a.debt, debt); assert.equal(a.partner.countryId, 'CN');
 a.money = 500000; assert.equal(systemAction(a, 'reunite-family').ok, true); assert.equal(a.partner.distanceYears, 0); const cash = a.money; assert.equal(systemAction(a, 'reunite-family').ok, false); assert.equal(a.money, cash);
});
test('divorce settles cash and house once, supports children annually without duplicate care', () => {
 const l = adult('split'); addPartner(l); l.house = { value: 200000, loan: 100000 }; l.money = 100000;
 l.children.push({ name: '小雨', age: 3, birthYear: l.birthYear + l.age - 3, alive: true }); initSystems(l);
 systemAction(l, 'divorce'); const p = l.pending; select(l, 'other');
 assert.equal(l.money, 100000); assert.equal(l.house, null); assert.equal(l.partner, null); assert.equal(l.formerPartners[0].settlement.cashPaid, 50000);
 const cash = l.money; assert.equal(systemChoice(l, p, 1), false); assert.equal(l.money, cash); assert.equal(getHousehold(l).length, 1);
 l.birthYear = 2030 - l.age; l.children[0].birthYear = 2027; l.age++; systemsYear(l, { events: false });
 assert.equal(l.children[0].lastSupportAge, l.age); assert.equal(l.pending?.system === 'child-care', false); assert.equal(l.systems.care[l.children[0].id], undefined);
 const once = l.money; systemsYear(l, { events: false }); assert.equal(l.money, once);
 l.age += 14; l.pending = null; systemsYear(l, { events: false }); assert.equal(l.children[0].age, 18); assert.notEqual(l.children[0].lastSupportAge, l.age);
});
test('keeping custody retains ordinary care and underwater house shares its loss', () => {
 const l = adult('custody'); addPartner(l); l.money = 1000; l.house = { value: 10000, loan: 14000 };
 l.children.push({ name: '小雨', age: 2, birthYear: l.birthYear + l.age - 2 }); initSystems(l);
 systemAction(l, 'divorce'); select(l, 'self'); assert.equal(l.money, 0); assert.equal(l.debt, 1500); assert.equal(l.children[0].supportPayer, null); assert.equal(getHousehold(l).length, 2);
 l.age++; systemsYear(l, { events: false }); assert.equal(l.pending.system, 'child-care');
});
test('communication can fail and counseling differs from a simple talk', () => {
 let success = false, failure = false, difference = false;
 for (let seed = 0; seed < 80; seed++) { const a = adult(`talk-${seed}`); addPartner(a); a.partner.bond = 30; const b = clone(a); systemAction(a, 'relationship-talk'); systemAction(b, 'relationship-counsel'); success ||= a.partner.bond > 30; failure ||= a.partner.bond < 30; difference ||= a.partner.bond !== b.partner.bond; assert.ok(b.money < a.money); assert.equal(systemAction(a, 'date').ok, false); }
 assert.ok(success && failure && difference);
});
test('named friends persist, share memories and can decline romance', () => {
 let accepted = false, declined = false;
 for (let seed = 0; seed < 60; seed++) { const l = adult(`friend-${seed}`); systemAction(l, 'make-friend', { name: '陈小青', metThrough: '读书会' }); const f = l.friends[0]; assert.equal(clone(l).friends[0].name, '陈小青');
 systemAction(l, 'friend-time', { friendId: f.id }); select(l, 'help'); assert.ok(l.log.some(e => e.text.includes('陈小青'))); systemAction(l, 'seek-partner'); select(l, f.id); accepted ||= !!l.partner; declined ||= !l.partner; }
 assert.ok(accepted && declined);
});
test('world updates its panel without filling the personal timeline', () => {
 const l = adult('headlines'); l.log = []; for (let i = 0; i < 8; i++) { l.age++; l.pending = null; systemsYear(l, { events: false }); }
 assert.equal(l.log.filter(e => e.type === 'world').length, 0); assert.equal(l.systems.world.year, l.birthYear + l.age);
});
test('birth needs a living partner and can fail', () => {
 const solo = adult('no-partner'); assert.equal(systemAction(solo, 'plan-child').ok, false); assert.equal(solo.children.length, 0);
 let failed = false;
 for (let seed = 0; seed < 40 && !failed; seed++) { const l = adult('miss-' + seed); addPartner(l); systemAction(l, 'plan-child'); select(l, 'birth'); failed = l.children.length === 0 && l.log.some(e => e.title === '这一年没有迎来孩子'); }
 assert.ok(failed, 'conception can fail');
});
test('returning home ends a local job and keeps a remote one', () => {
 const l = adult('return-job'); emigrate(l, 'US'); assert.equal(l.job, '待业'); assert.equal(l.income, 0);
 l.remote = true; l.job = '远程职员'; l.income = 90000; l.employerGdp = 80000; l.pending = null;
 assert.equal(systemAction(l, 'return-home').ok, true); assert.equal(l.country.id, 'CN'); assert.equal(l.income, 90000); assert.equal(l.remote, true);
});
test('a heard offer home from a richer country reprices pay downward', () => {
 const l = adult('cheaper'); emigrate(l, 'US');
 l.pending = null; l.income = 60000; l.job = '行政职员'; l.jobKind = 'office'; l.careerYears = 3;
 l.pending = { kind: 'system', system: 'opportunity', offerKind: 'home-offer', title: '老家有人叫你回去', text: '收入按老家重算。', options: [{ key: 'try', label: '回去看看那份工作', description: '人会回去，收入按老家重算。' }] };
 select(l, 'try'); assert.equal(l.country.id, 'CN'); assert.ok(l.income > 0 && l.income < 60000); assert.ok(l.log.some(e => /开销/.test(e.text)));
});
test('heavy debt with no income is not a calm life', () => {
 const l = adult('debt-crisis'); l.money = 100; l.income = 0; l.debt = l.country.gdp * 4; l.stats.happiness = 100; l.stats.health = 80; l.finance.arrears = 3; l.finance.lastYear = null;
 financeYear(l); assert.ok(l.stats.happiness < 80); assert.ok(l.log.some(e => /拦住|房子保不住|夜里没有|居留没有|债压着/.test(e.title)));
});
test('siblings are named people or the birth does not happen', () => {
 let named = false, missed = false;
 for (let seed = 0; seed < 40 && !(named && missed); seed++) {
  const l = createLife({ seed: 'sib-' + seed, country: 'CN' });
  for (let y = 0; y < 18 && !l.dead && !(named && missed); y++) { if (l.pending) choose(l, 0); else advanceYear(l); }
  named ||= (l.family.siblings || []).some(s => s.name && s.alive !== false);
  missed ||= l.log.some(e => e.title === '家里没有添人');
 }
 assert.ok(named, 'a named sibling appears'); assert.ok(missed, 'a parental birth can fail');
});

test('a new partner does not relocate children who still live elsewhere', () => {
 const l = adult('court-away');
 l.country = JSON.parse(JSON.stringify(COUNTRIES.find(c => c.id === 'US')));
 l.systems.residence.countryId = 'US'; l.systems.residence.abroadSince = 26; l.systems.residence.homeCountry = 'CN'; l.systems.residence.familyCountryId = 'CN'; l.systems.residence.with = 'alone';
 l.children = [{ id: 'child-x', name: '小林', age: 4, alive: true, countryId: 'CN', bond: 70, supportPayer: null }];
 const friend = { id: 'friend-9', name: '陈夏', sex: '女', age: 28, alive: true, bond: 100, countryId: 'US' };
 l.friends = [friend];
 for (let i = 0; i < 8 && !l.partner; i++) { l.pending = null; l.systems.lastCourtAge = null; if (i) l.age++; systemAction(l, 'seek-partner'); select(l, friend.id); }
 assert.ok(l.partner, 'courtship eventually succeeds');
 assert.equal(l.partner.countryId, 'US'); assert.equal(l.children[0].countryId, 'CN'); assert.equal(l.systems.residence.familyCountryId, 'CN');
 const home = getHousehold(l).map(p => p.role);
 assert.ok(home.includes('伴侣')); assert.equal(home.includes('孩子'), false);
});
test('a heard local job stays within the current schooling', () => {
 const l = adult('no-degree-job');
 l.school = { credential: 'primary' }; l.income = 0; l.job = '待业'; l.jobKind = null; l.careerYears = 0; l.stats.knowledge = 0;
 l.family.mother.alive = false; l.family.father.alive = false; l.partner = null;
 const kinds = new Set();
 for (let i = 0; i < 60; i++) { l.pending = null; l.age++; l.systems.lastYear = null; systemsYear(l); if (l.pending?.offerKind === 'local') kinds.add(l.pending.jobKind); }
 assert.ok(kinds.size > 0, 'a local offer appears'); assert.deepEqual([...kinds], ['apprentice']);
});

test('after-school choice starts a named story that can continue or fail', () => {
 const l = adult('thread-story'); l.age = 12; l.systems.lastYear = 11;
 peopleMilestone(l, 12);
 assert.equal(l.pending.system, 'thread-start');
 const labels = l.pending.options.map(o => o.label).join(' ');
 const club = l.pending.cast.science.name, team = l.pending.cast.sport.name, home = l.pending.cast.home.name;
 assert.ok(labels.includes(club) && labels.includes(team) && labels.includes(home));
 assert.notEqual(club, team);
 select(l, 'science');
 assert.equal(l.friends.filter(f => f.name === team).length, 0);
 const friend = l.friends.find(f => f.name === club);
 assert.ok(friend.thread && !friend.thread.ended);
 assert.ok(l.log.some(e => e.text.includes(club)));
 l.age = friend.thread.nextAge; l.systems.lastYear = null; l.pending = null;
 systemsYear(l);
 assert.equal(l.pending?.system, 'thread');
 assert.ok(l.pending.text.includes(club) || l.pending.title.includes(club));
 select(l, 'together');
 assert.ok(l.log.some(e => (e.title + e.text).includes(club)));
 assert.equal(l.children.length, 0);
});
test('staying with a parent does not invent a new child', () => {
 const l = adult('thread-home'); l.age = 12;
 peopleMilestone(l, 12);
 const parent = l.pending.cast.home.name;
 select(l, 'home');
 assert.equal(l.systems.homeThread.name, parent);
 assert.equal(l.children.length, 0);
 l.age = l.systems.homeThread.nextAge; l.systems.lastYear = null;
 systemsYear(l);
 assert.equal(l.pending.system, 'thread');
 assert.ok((l.pending.title + l.pending.text).includes(parent));
});
test('a storyline can introduce someone new or fail to', () => {
 let met = false, missed = false;
 for (let seed = 0; seed < 24 && !(met && missed); seed++) {
  const l = adult('thread-next-' + seed); l.age = 16;
  peopleMilestone(l, 12);
  select(l, 'science');
  const friend = l.friends.find(f => f.thread);
  friend.thread.stage = 3; friend.thread.nextAge = l.age; friend.bond = 80;
  l.systems.lastYear = null; l.pending = null;
  systemsYear(l);
  if (l.pending?.beat !== 'science-3') continue;
  const before = l.friends.length;
  select(l, 'ask');
  met ||= l.friends.length > before;
  missed ||= l.friends.length === before && l.log.some(e => /没能促成|没有/.test(e.title + e.text));
 }
 assert.ok(met, 'introduction can succeed');
 assert.ok(missed, 'introduction can fail');
});

test('a single adult is asked again, and a refusal adds no partner', () => {
  const l = adult('court-again');
  l.age = 31; l.partner = null; l.pending = null; l.systems.lastYear = null;
  if (l.systems.homeThread) l.systems.homeThread.ended = true;
  for (const f of l.friends) if (f.thread) f.thread.ended = true;
  systemsYear(l);
  assert.equal(l.pending && l.pending.system, 'courtship');
  assert.equal(l.pending.options.at(-1).key, 'cancel');
  select(l, 'cancel');
  assert.equal(l.partner, null);
  const quiet = adult('court-quiet');
  quiet.age = 31; quiet.partner = null; quiet.pending = null; quiet.systems.lastYear = null;
  systemsYear(quiet, { events: false });
  assert.notEqual(quiet.pending && quiet.pending.system, 'courtship');
});

test('telling someone can be turned down and still is not a partner', () => {
  let refused = false;
  for (let i = 0; i < 16 && !refused; i++) {
    const l = adult('court-no-' + i);
    l.age = 31; l.partner = null; l.pending = null; l.systems.lastYear = null;
    if (l.systems.homeThread) l.systems.homeThread.ended = true;
    for (const f of l.friends) if (f.thread) f.thread.ended = true;
    systemsYear(l);
    assert.equal(l.pending.system, 'courtship');
    const choice = l.pending.options.find(o => o.key !== 'cancel');
    select(l, choice.key);
    if (!l.partner) refused = true;
    assert.notEqual(l.job, '伴侣');
  }
  assert.equal(refused, true);
});
