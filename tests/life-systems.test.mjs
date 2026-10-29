import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, COUNTRIES } from '../src/engine.js';
import { initSystems, systemsYear, systemAction, systemChoice, getHousehold, getSceneState } from '../src/life-systems.js';
const clone = x => JSON.parse(JSON.stringify(x));
function adult(seed = 'systems') { const l = createLife({ seed, country: 'CN' }); l.age = 28; l.income = 20000; l.money = 500000; initSystems(l); l.systems.residence.with = 'alone'; return l; }
function select(l, key) { const p = l.pending; assert.equal(p?.kind, 'system'); const i = p.options.findIndex(o => o.key === key); assert.ok(i >= 0, key); assert.equal(systemChoice(l, p, i), true); }
function next(l) { l.pending = null; l.age++; systemsYear(l); }
function addPartner(l) { l.partner = { name: '林小舟', sex: '女', age: 28, income: 14000, bond: 75, alive: true }; }

test('initialization is idempotent, consumes no randomness and preserves JSON', () => {
 const l = createLife({ seed: 'init', country: 'CN' }); const state = l.randomState; initSystems(l); const saved = clone(l); initSystems(l);
 assert.equal(l.randomState, state); assert.deepEqual(l, saved); assert.deepEqual(clone(l), l);
 assert.deepEqual(getHousehold(l).map(p => p.role), ['自己', '母亲', '父亲']);
 assert.equal(getHousehold(l)[1].name, l.family.mother.name);
});
test('birth immediately chains care, with continuing costs and child growth', () => {
 const l = adult(); addPartner(l); systemAction(l, 'plan-child'); select(l, 'birth');
 assert.equal(l.children.length, 1); assert.equal(l.pending.system, 'child-care'); const c = l.children[0];
 assert.equal(getHousehold(l).find(p => p.id === c.id).name, c.name);
 select(l, 'partner'); const cash = l.money; next(l);
 assert.equal(c.age, 1); assert.ok(l.money < cash); assert.equal(l.systems.care[c.id].incomeLoss, 3080); assert.ok(c.development > 50);
 assert.ok(l.log.some(e => e.text.includes(c.name) || e.title.includes(c.name)));
 l.partner.alive = false; next(l); assert.equal(l.pending.system, 'child-care'); assert.ok(!l.pending.options.some(o => o.key === 'partner'));
});
test('grandparent care is only offered while grandparents are alive and local', () => {
 const l = adult(); l.family.mother.alive = l.family.father.alive = false;
 systemAction(l, 'plan-child'); select(l, 'birth'); assert.ok(!l.pending.options.some(o => o.key === 'grandparents'));
 select(l, 'nursery'); next(l); assert.ok(l.systems.care[l.children[0].id].annualCost > 0);
});
test('solo migration leaves named family home, reunion moves them, return restores country', () => {
 const l = adult('migration'); addPartner(l); l.children.push({ name: '林小雨', sex: '男', age: 2, birthYear: l.birthYear + l.age - 2 }); initSystems(l);
 l.systems.residence.with = 'family';
 systemAction(l, 'move-abroad', { countryId: 'CA' }); select(l, 'solo');
 assert.equal(l.country.id, 'CA'); assert.equal(l.country.gdp, COUNTRIES.find(c => c.id === 'CA').gdp);
 assert.deepEqual(getHousehold(l).map(p => p.id), ['self']); assert.equal(l.systems.residence.familyCountryId, 'CN');
 assert.equal(systemAction(l, 'reunite-family').ok, true);
 assert.deepEqual(getHousehold(l).map(p => p.name), [l.name, '林小舟', '林小雨']);
 assert.equal(systemAction(l, 'return-home').ok, true); assert.equal(l.country.id, 'CN'); assert.equal(l.systems.residence.abroadSince, null);
 assert.equal(getHousehold(l).length, 3); assert.ok(l.log.every(e => Number.isFinite(e.age) && Number.isFinite(e.year)));
});
test('migration review follows three years and preserves choice chains through JSON', () => {
 const l = adult('review'); addPartner(l); systemAction(l, 'move-abroad', { countryId: 'JP' }); select(l, 'solo');
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
test('annual world events share calendar headlines, label fiction and include rare war', () => {
 const a = adult('world-a'), b = adult('world-b'); systemsYear(a); systemsYear(b); assert.deepEqual(a.systems.world, b.systems.world);
 assert.equal(a.systems.world.year, a.birthYear + a.age); assert.match(a.systems.world.detail, /模拟|虚构/);
 const headlines = [];
 for (let y = 2030; y < 3030; y++) { const l = adult('war'); l.birthYear = y - l.age; systemsYear(l); headlines.push(l.systems.world.kind); if (l.systems.world.kind === 'war') { assert.equal(l.pending.system, 'world-crisis'); assert.match(l.systems.world.detail, /并非事实或预测/); } }
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
 assert.equal(l.pending.system, 'relationship'); select(l, 'separate'); assert.equal(l.partner, null); assert.equal(getHousehold(l).length, 1);
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
 l.systems.residence.familyWith = 'alone';
 systemAction(l, 'move-abroad', { countryId: 'US' }); select(l, 'solo');
 assert.equal(l.systems.residence.abroadSince, l.age);
 let offered = false;
 for (let year = 0; year < 12 && !l.dead; year++) {
  next(l);
  if (l.pending?.system === 'hometown-plan') { offered = true; select(l, 'invite'); break; }
  if (l.pending?.kind === 'system') systemChoice(l, l.pending, 0);
 }
 assert.ok(offered, 'hometown plan appears within 12 years abroad');
 const res = l.systems.residence;
 assert.equal(res.with, 'parents'); assert.equal(res.familyCountryId, res.countryId);
 const names = getHousehold(l).map(p => p.name);
 assert.ok(names.includes(l.family.mother.name) || names.includes(l.family.father.name));
});
