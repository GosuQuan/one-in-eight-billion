// Original, serializable life systems. Monetary figures are illustrative PPP units.
import { COUNTRIES } from './engine.js';
import { inferKind, localIncome, careerOptions } from './career.js';
import { tr, label } from './i18n.js';

const clamp = n => Math.max(0, Math.min(100, Number(n) || 0));
const copy = x => JSON.parse(JSON.stringify(x));
const yearOf = l => l.birthYear + l.age;
const alive = p => p && p.alive !== false && !p.dead;
const country = id => COUNTRIES.find(c => c.id === id);
function roll(l) { l.randomState = (l.randomState + 0x6D2B79F5) >>> 0; let t = l.randomState; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = (l, xs) => xs[Math.floor(roll(l) * xs.length)];
const chance = (l, p) => roll(l) < p;
const pickWeighted = (l, xs) => { const total = xs.reduce((sum, x) => sum + (x.w || 1), 0); let n = roll(l) * total; for (const x of xs) { n -= (x.w || 1); if (n < 0) return x; } return xs.at(-1); };
const log = (l, title, text, type = 'family') => l.log.push({ age: l.age, year: yearOf(l), title, text, type });
function stats(l, effects) { for (const [k, v] of Object.entries(effects)) l.stats[k] = clamp(l.stats[k] + v); }
function spend(l, n) { n = Math.max(0, Math.round(n)); const paid = Math.min(l.money, n); l.money -= paid; l.debt = (l.debt || 0) + n - paid; return n; }
function medicalBill(l, amount) { return spend(l, amount * (l.insurance ? .3 : 1)); }
function action(l, type, text, from = '', to = '') { l.systems.actionSequence++; l.sceneAction = { id: `scene-${l.age}-${l.systems.actionSequence}`, type, age: l.age, text, from, to }; }
const option = (key, label, description = '') => ({ key, label, description });
function pending(l, system, title, text, options, context = {}) { l.pending = { kind: 'system', system, title, text, options, ...context }; }
function offer(l, ...args) { if (!l.pending) pending(l, ...args); }
const result = (ok, message) => ({ ok, message });
const gdp = l => l.country.gdp;
function person(l) { const sex = roll(l) < .5 ? '男' : '女'; const names = l.country.names; return { name: tr('{surname}{given}', { surname: pick(l, names.surnames), given: pick(l, names[sex === '男' ? 'male' : 'female']), country: l.country.id, sex }), sex }; }

export function initSystems(l) {
 if (!l || typeof l !== 'object') return l;
 l.children ||= []; l.family ||= {}; l.log ||= []; l.stats ||= { health: 70, happiness: 60, knowledge: 10, social: 50 };
 const s = l.systems ||= {};
 s.residence ||= {};
 const r = s.residence;
 r.countryId ??= l.country.id; r.city ??= l.country.city;
 r.with ??= l.age < 18 ? 'parents' : alive(l.partner) || l.children.some(alive) ? 'family' : 'alone';
 r.abroadSince ??= r.countryId !== (l.birthCountry || l.country).id ? l.age : null;
 r.homeCountry ??= (l.birthCountry || l.country).id;
 r.familyCountryId ??= r.countryId; r.familyWith ??= r.with;
 l.family.siblings ||= []; s.migration ||= []; s.residency ??= r.abroadSince != null ? 'temporary' : 'citizen'; s.visaUntil ??= 0;
  s.pet ??= null; s.business ??= null; s.conditions ||= []; s.care ||= {};
 s.world ??= { year: null, title: tr('等待年度新闻'), kind: 'quiet', detail: tr('世界新闻将随年份更新。') };
 s.actionSequence ??= 0; s.lastYear ??= null; s.lastRelationshipAge ??= null; s.lastMigrationReview ??= r.abroadSince;
 s.eventCooldowns ||= {}; s.relationshipActions ||= {}; l.friends ||= [];
 for (let i = 0; i < l.friends.length; i++) { const f = l.friends[i]; f.id ??= `friend-${i}`; f.bond ??= 50; f.countryId ??= r.countryId; f.metThrough ??= tr('旧日相识'); }
 if (alive(l.partner)) { l.partner.bond ??= 60; l.partner.countryId ??= r.familyCountryId; l.partner.distanceYears ??= 0; }
 for (let i = 0; i < l.children.length; i++) { const c = l.children[i]; c.id ??= `child-${c.birthYear ?? yearOf(l) - (c.age || 0)}-${i}`; c.bond ??= 70; c.development ??= 50; }
 return l;
}
function grandparents(l) { const r = l.systems.residence; return r.countryId === (r.parentsCountryId || r.homeCountry) ? [l.family.mother, l.family.father].filter(alive) : []; }
function childCare(l, child) {
 // Engine-created newborns also belong in the player's current household.
 if (child.age === 0 && child.birthYear === yearOf(l)) { child.countryId = l.systems.residence.countryId; l.systems.residence.with = 'family'; }
 const options = [option('self', tr('自己减少工作照顾'), tr('每年减少收入并投入陪伴。'))];
 if (alive(l.partner) && l.systems.residence.countryId === l.systems.residence.familyCountryId) options.push(option('partner', tr('由{name}减少工作照顾', {name: l.partner.name}), tr('伴侣收入减少，保持共同育儿。')));
 options.push(option('nursery', tr('付费托育'), tr('每年支付托育费用，保留工作时间。')));
 if (grandparents(l).length) options.push(option('grandparents', tr('请{grandparents}帮忙', {grandparents: grandparents(l).map(p => p.name).join(tr('、'))}), tr('只有仍在世且在本国的祖父母可以帮忙。')));
 pending(l, 'child-care', tr('{name}由谁照顾', {name: child.name}), tr('照护安排会持续到孩子上学；每年都有时间和费用。'), options, { childId: child.id });
}
function medicalChoice(l, condition) {
 pending(l, 'medical', tr('{name}的治疗', {name: condition.name}), tr('病情程度{severity}。{x}', {severity: Math.round(condition.severity), x: l.insurance ? tr('医疗保险承担治疗费用的70%。') : tr('目前没有医疗保险，治疗自费。')}), [option('standard', tr('规范治疗并复查'), tr('效果较好，持续复诊和用药。')), option('basic', tr('选择廉价基础治疗'), tr('费用较低，病情控制较慢。')), option('delay', tr('先拖一拖'), tr('暂不付治疗费，病情可能加重。'))], { conditionId: condition.id });
}
function migrationParty(l, id) {
 const c = country(id);
 if (!c || id === l.country.id) return result(false, tr('请选择不同的有效国家。'));
 pending(l, 'migration-party', tr('迁居{name}', {name: c.name}), tr('这次谁和你一起走？独自迁居后，家人会留在原居国。'), [option('solo', tr('独自出国'), tr('家人留在原居国，之后可以团聚或回国。')), option('family', tr('携家人同行'), tr('伴侣与未成年孩子一起迁居，搬迁费用更高。')), option('cancel', tr('暂时不搬'))], { countryId: id });
 return result(true, tr('请选择移民同行安排。'));
}
function visaOdds(l) {
 const edu = { none: 0, primary: 1, basic: 2, high: 3, vocational: 3, university: 4, masters: 5 }[l.school?.credential] || 0;
 const cash = Math.max(0, l.money) / Math.max(1, gdp(l));
 return Math.max(.08, Math.min(.78, .18 + edu * .07 + Math.min(.18, cash * .008) + (l.stats.knowledge || 0) * .0012));
}
function fertilityBlock(l) {
 if (!alive(l.partner)) return tr('没有在世的伴侣，不能开始生育。');
 const page = l.partner.age ?? l.age;
 if (l.age < 18 || page < 18) return tr('还没到可以共同生育的年龄。');
 if (l.age > 45 || page > 45) return tr('你或伴侣已经超出这次生育安排的年龄。');
 return '';
}
function arriveWork(l, destination, originGdp, mode) {
 if (mode === 'transfer') {
  const kind = l.jobKind || inferKind(l.job);
  l.remote = false; l.employerGdp = null; l.employerCountryId = destination.id; l.jobKind = kind;
  if (!l.job || ['待业', '尚未工作', '学生'].includes(l.job)) l.job = '本地职员';
  l.income = localIncome(l, kind, destination);
  const cheaper = destination.gdp < originGdp * .75, richer = destination.gdp > originGdp * 1.25;
  stats(l, cheaper ? { happiness: 6, knowledge: 2 } : richer ? { happiness: -3, knowledge: 3 } : { knowledge: 1 });
  log(l, cheaper ? tr('到了消费更低的地方') : tr('收入和开销改按这里计算'), tr('年收入现在是{income}，按{name}的物价重算。日常开销也改按这里，不再沿用原来的账单。{x}', {income: l.income, name: destination.name, x: cheaper ? tr('消费没那么高，收入通常会降下来，日子却松一点。') : richer ? tr('收入有机会更高，房租和日常也跟着涨。') : ''}), 'work');
 } else if (l.remote) {
  if (destination.gdp < originGdp * .75) stats(l, { happiness: 5 });
  log(l, tr('远程收入还在'), tr('工作仍按原雇主那边计算，年收入{income}。你住在{name}，吃饭、房租和账单改按这里。', {income: l.income, name: destination.name}), 'work');
 } else if ((l.income || 0) > 0 || (l.job && !['待业', '尚未工作', '学生', '退休'].includes(l.job))) {
  l.income = 0; l.job = '待业'; l.jobKind = null; l.remote = false;
  log(l, tr('工作没有一起过来'), tr('你到了{name}。开销按这里计算，但这份工作不能远程，收入先归零。{careerYears}年经验还在，要等当地的机会。', {name: destination.name, careerYears: l.careerYears || 0}), 'work');
 }
}
function move(l, id, withFamily, mode = 'none') {
 const destination = country(id);
 if (!destination || id === l.country.id) return result(false, tr('请选择不同的有效国家。'));
 const s = l.systems, r = s.residence;
 if ((s.visaUntil || 0) > l.age) { log(l, tr('还不能再递交'), tr('上次没有通过。要到{visaUntil}岁才能再申请前往{name}。你仍在{name2}。', {visaUntil: s.visaUntil, name: destination.name, name2: l.country.name}), 'migration'); return result(false, tr('要到{visaUntil}岁才能再申请。', {visaUntil: s.visaUntil})); }
 const fromName = l.country.name, fromId = l.country.id, originGdp = l.country.gdp;
 const fee = Math.round(gdp(l) * (mode === 'refuge' ? .03 : .02));
 spend(l, fee);
 s.migration ||= [];
 const odds = Math.min(.85, visaOdds(l) + (mode === 'refuge' ? .08 : 0) + (mode === 'transfer' ? .1 : 0));
 if (!chance(l, odds)) {
  s.visaUntil = l.age + 4;
  if (mode === 'refuge') { spend(l, gdp(l) * .05); stats(l, { health: -6, happiness: -6 }); }
  else stats(l, { happiness: -3 });
  s.migration.push({ from: fromId, to: id, age: l.age, status: 'refused', fee });
  log(l, mode === 'refuge' ? tr('避难没有走通') : tr('签证没有通过'), tr('{name}没有批准这次申请。申请费已经花掉。{x}最早{visaUntil}岁可以再试。你仍在{fromName}。', {name: destination.name, x: mode === 'refuge' ? tr('路上还损失了一笔钱和精力。') : '', visaUntil: s.visaUntil, fromName}), 'migration');
  return result(false, tr('申请没有通过。'));
 }
 if (r.abroadSince == null) { r.homeCountry = l.country.id; r.familyCountryId = l.country.id; r.familyWith = r.with; r.abroadSince = l.age; }
 const count = withFamily ? 1 + (alive(l.partner) ? 1 : 0) + l.children.filter(c => alive(c) && c.age < 18 && c.supportPayer !== 'player').length : 1;
 spend(l, gdp(l) * .16 * count); l.country = copy(destination);
 r.countryId = destination.id; r.city = destination.city;
 r.with = withFamily && (alive(l.partner) || l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player')) ? 'family' : 'alone';
 if (withFamily) { r.familyCountryId = destination.id; if (alive(l.partner)) { l.partner.countryId = destination.id; l.partner.distanceYears = 0; } for (const c of l.children) if (alive(c) && c.age < 18 && c.supportPayer !== 'player') c.countryId = destination.id; }
 s.lastMigrationReview = l.age; s.residency = 'temporary';
 s.migration.push({ from: fromId, to: destination.id, age: l.age, status: 'temporary', fee });
 stats(l, { social: -5, knowledge: 4 });
 log(l, tr('在另一国安家'), tr('{name}从{fromName}迁居{name2}{city}，{x}。居留是临时的，不会自动变成永居。', {name: l.name, fromName, name2: destination.name, city: destination.city, x: withFamily ? tr('家人同行') : tr('独自出国，家人仍在') + (country(r.familyCountryId)?.name || tr('原居国'))}), 'migration');
 action(l, 'moving', tr('搬进新的住所'), fromName, destination.name);
 arriveWork(l, destination, originGdp, l.remote ? 'remote' : mode);
 return result(true, tr('已迁居{name}。', {name: destination.name}));
}
function returnHome(l, mode = 'none') {
 const r = l.systems.residence, home = country(r.homeCountry); if (!home) return result(false, tr('找不到原居国。'));
 if (r.countryId === home.id && r.abroadSince == null) return result(false, tr('你已经在原居国。'));
 const from = l.country.name, originGdp = l.country.gdp; spend(l, gdp(l) * .1); l.country = copy(home);
 r.countryId = home.id; r.city = home.city; r.abroadSince = null; r.familyCountryId = home.id;
 for (const c of l.children) if (alive(c) && c.age < 18 && c.supportPayer !== 'player') c.countryId = home.id;
 if (alive(l.partner)) { l.partner.countryId = home.id; l.partner.distanceYears = 0; }
 r.with = alive(l.partner) || l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player') ? 'family' : r.familyWith === 'parents' && grandparents(l).length ? 'parents' : 'alone';
 l.systems.lastMigrationReview = null; l.systems.residency = 'citizen';
 l.systems.migration ||= []; l.systems.migration.push({ from, to: home.id, age: l.age, status: 'returned' });
 stats(l, { social: 4 });
 arriveWork(l, home, originGdp, mode === 'transfer' ? 'transfer' : 'none');
 log(l, tr('回到原居国'), tr('{name}从{from}回到{name2}。开销改按这里计算。{x}', {name: l.name, from, name2: home.name, x: l.remote ? tr('远程工作还在。') : tr('原来的本地工作没有跟回来。')}), 'migration');
 action(l, 'moving', tr('回国安家'), from, home.name); return result(true, tr('已经回到原居国。'));
}
function reunite(l) {
 const r = l.systems.residence;
 if (r.abroadSince == null || r.familyCountryId === r.countryId) return result(false, tr('目前没有海外团聚安排。'));
 if (!alive(l.partner) && !l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player')) return result(false, tr('没有可以随行的伴侣或未成年孩子。'));
 const cost = Math.round(gdp(l) * .12 * ((alive(l.partner) ? 1 : 0) + l.children.filter(c => alive(c) && c.age < 18 && c.supportPayer !== 'player').length));
  if (l.money < cost + gdp(l) * .15) return result(false, tr('团聚需搬迁费{cost}，并保留{gdp}的生活储备。', {cost, gdp: Math.round(gdp(l) * .15)}));
  spend(l, cost); if (alive(l.partner)) { l.partner.countryId = r.countryId; l.partner.distanceYears = 0; l.partner.bond = clamp(l.partner.bond + 5); } r.familyCountryId = r.countryId; r.with = 'family';
 for (const c of l.children) if (alive(c) && c.age < 18 && c.supportPayer !== 'player') c.countryId = r.countryId;
 stats(l, { happiness: 8, social: 5 });
 log(l, tr('一家人终于团聚'), tr('家人来到{name}，与{name2}共同生活。', {name: l.country.name, name2: l.name}), 'migration'); action(l, 'moving', tr('家人抵达新家')); return result(true, tr('家人已团聚同住。'));
}

export function befriend(l, details = {}) {
 initSystems(l);
 const f = { ...person(l), age: l.age, bond: 45, countryId: l.country.id, metThrough: l.age < 18 ? tr('同班同学') : tr('社区活动'), sharedMemory: tr('一起收拾活动场地'), lastContactAge: l.age, ...details, id: `friend-${l.systems.friendSequence = (l.systems.friendSequence || 0) + 1}` };
 l.friends.push(f); log(l, tr('认识了{name}', {name: f.name}), tr('你与{name}因{metThrough}相识。{sharedMemory}成了后来聊天的开场。', {name: f.name, metThrough: f.metThrough, sharedMemory: f.sharedMemory}), 'social'); return f;
}
function communicate(l, mode) {
 const p = l.partner, remote = p.countryId !== l.country.id;
 spend(l, gdp(l) * (mode === 'counsel' ? .025 : .004)); p.lastContactAge = l.age;
 const success = chance(l, Math.max(.15, Math.min(.85, .25 + p.bond / 180 + (mode === 'counsel' ? .15 : 0) - (remote ? .1 : 0))));
 p.bond = clamp(p.bond + (success ? mode === 'counsel' ? 16 : 8 : -3)); stats(l, { happiness: success ? 3 : -2 });
 log(l, success ? tr('终于听懂了一点') : tr('谈话停在半途'), tr('你与{name}{x}。{x2}', {name: p.name, x: mode === 'counsel' ? tr('预约了伴侣咨询') : remote ? tr('隔着时差拨通视频') : tr('在晚饭后坐下来交谈'), x2: success ? tr('你听到对方没说出口的担心，约好从一件小事开始改变。') : tr('话题又绕回旧争执，对方说需要时间；这次努力没有让感情好转。')}));
 return result(true, success ? tr('这次交谈拉近了彼此。') : tr('对方没有接受解释，关系仍需要时间。'));
}
function divorceOffer(l) {
 const house = l.house;
 pending(l, 'divorce', tr('与{name}分开生活', {name: l.partner.name}), tr('游戏简化规则：现有现金各半，你保留约{money}；{x}投资与企业归持有人，个人债务不转移。孩子若随对方生活，你每年每名支付{gdp}抚养费至18岁，不重复计入家中儿童生活费。', {money: Math.floor(l.money / 2), x: house ? tr('出售住房先结清房贷，净值各半，你承担或取得{value}，住房移出资产。', {value: Math.round((house.value - (house.loan || 0)) / 2)}) : tr('没有住房需要处置。'), gdp: Math.round(gdp(l) * .05)}), [option('self', tr('分开，孩子随我生活'), tr('继续承担日常育儿开销。')), option('other', tr('分开，孩子随对方生活'), tr('按年支付抚养费，仍可保持联系。')), option('cancel', tr('暂不分开'))], { partnerName: l.partner.name });
}
function settleSeparation(l, custody) {
 const p = l.partner; if (!alive(p)) return;
 const cashPaid = Math.ceil(Math.max(0, l.money) / 2); l.money -= cashPaid;
 let equityShare = 0;
 if (l.house) { equityShare = Math.round((l.house.value - (l.house.loan || 0)) / 2); l.house = null; if (equityShare >= 0) l.money += equityShare; else spend(l, -equityShare); }
 l.formerPartners ||= []; l.formerPartners.push({ ...p, separatedAge: l.age, settlement: { cashPaid, equityShare, custody } }); l.partner = null;
 for (const c of l.children.filter(c => alive(c) && c.age < 18)) { c.livesWithPlayer = custody === 'self'; c.supportPayer = custody === 'other' ? 'player' : null; c.supportSinceAge = l.age; c.supportAnnual = Math.round(gdp(l) * .05); c.countryId = custody === 'self' ? l.country.id : p.countryId; if (custody === 'other' || l.systems.care[c.id]?.mode === 'partner') delete l.systems.care[c.id]; }
 l.systems.residence.with = custody === 'self' && l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player') ? 'family' : 'alone';
 stats(l, { happiness: -7 }); log(l, tr('把共同生活分开'), tr('你与{name}办完安排。现金交付{cashPaid}，房产结清贷款后你的净份额为{equityShare}。{x}抽屉里留下的合照还没有决定放到哪里。', {name: p.name, cashPaid, equityShare, x: custody === 'other' ? tr('孩子随对方生活，你按年承担抚养费。') : tr('孩子的日常照护由你承担。')}));
}

export function systemAction(l, name, payload = {}) {
 initSystems(l);
 if (l.dead) return result(false, tr('这一生已经结束。'));
 if (l.pending) return result(false, tr('请先完成眼前的选择。'));
 const s = l.systems, r = s.residence;
 if (['plan-child', 'start-business', 'move-abroad', 'housing', 'seek-partner', 'relationship-talk', 'relationship-counsel', 'relationship-decide', 'divorce'].includes(name) && l.age < 18) return result(false, tr('成年后才能安排这件事。'));
 switch (name) {
 case 'plan-child': {
   const why = fertilityBlock(l);
   if (why) return result(false, why);
   if (l.children.filter(alive).filter(c => c.age < 6).length >= 2) return result(false, tr('幼儿还小，先照顾好眼前的孩子。'));
   pending(l, 'child-plan', tr('要不要试着要一个孩子'), tr('与{name}一起尝试。检查要花钱，这一年也可能没有孩子。没有伴侣不会进入这一步。', {name: l.partner.name}), [option('birth', tr('尝试生育'), tr('付检查费。成功才会有一个有名字的孩子，失败则今年不能再试。')), option('wait', tr('暂缓计划'), tr('把时间留给现有生活，不花钱。'))]); return result(true, tr('请选择是否尝试。出生不是必然。'));
  }
 case 'child-care': { const child = l.children.find(c => alive(c) && c.age < 6 && c.supportPayer !== 'player' && (!s.care[c.id] || payload.childId === c.id)); if (!child) return result(false, tr('没有需要重新安排照护的幼儿。')); childCare(l, child); return result(true, tr('请选择照护安排。')); }
 case 'adopt-dog': case 'adopt-cat':
  if (s.pet?.alive) return result(false, tr('请先照顾好{name}。', {name: s.pet.name}));
  if (l.age < 8) return result(false, tr('长大一点再承担照顾宠物的责任。'));
  s.pet = { name: String(payload.name || pick(l, [tr('团团'), tr('豆包'), tr('芝麻'), tr('小麦'), tr('栗子')])).slice(0, 24), kind: name === 'adopt-dog' ? 'dog' : 'cat', age: 0, health: 85, alive: true };
  spend(l, gdp(l) * .012); stats(l, { happiness: 5 }); log(l, tr('家里来了新伙伴'), tr('你领养了{x}{name}，开始承担它的日常照顾。', {x: s.pet.kind === 'dog' ? tr('小狗') : tr('小猫'), name: s.pet.name}), 'pet'); action(l, 'pet', tr('陪{name}玩耍', {name: s.pet.name})); return result(true, tr('{name}加入了家庭。', {name: s.pet.name}));
 case 'make-friend':
  if (l.age < 5) return result(false, tr('上学以后再独自认识朋友。'));
  if (s.lastMakeFriendAge === l.age) return result(false, tr('今年先熟悉新认识的朋友吧。'));
  s.lastMakeFriendAge = l.age; befriend(l, payload); return result(true, tr('你们交换了联系方式。'));
 case 'friend-time': {
  const friends = l.friends.filter(alive); if (!friends.length) return result(false, tr('还没有熟悉的朋友。'));
  if (payload.friendId) { const f = friends.find(f => f.id === payload.friendId); if (!f) return result(false, tr('找不到这位朋友。')); if (f.interactionAge === l.age) return result(false, tr('今年已经专门约过这位朋友。')); pending(l, 'friend-time', tr('和{name}的约定', {name: f.name}), tr('你们因{metThrough}相识，还记得{sharedMemory}。', {metThrough: f.metThrough, sharedMemory: f.sharedMemory}), [option('share', tr('约一次聊天')), option('help', tr('帮对方完成一件事'), tr('花时间和少量路费，不保证对方领情。')), option('cancel', tr('改天再约'))], { friendId: f.id }); }
  else pending(l, 'friend-pick', tr('想起哪位朋友'), tr('选择一个有过共同经历的人。'), friends.map(f => option(f.id, f.name, tr('{metThrough} · 亲近{bond}', {metThrough: f.metThrough, bond: Math.round(f.bond)}))));
  return result(true, tr('请选择相处方式。')); }
 case 'seek-partner': {
  if (alive(l.partner)) return result(false, tr('目前已有伴侣。'));
  if (s.lastCourtAge === l.age) return result(false, tr('给彼此一些时间，明年再试。'));
  let friends = l.friends.filter(f => alive(f) && f.age >= 18);
  if (!friends.length) friends = [befriend(l, { metThrough: tr('朋友组织的聚会') })];
  pending(l, 'courtship', tr('把心意告诉谁'), tr('共同经历让你想更了解对方；对方也有拒绝的自由。'), [...friends.map(f => option(f.id, tr('向{name}表达心意', {name: f.name}), tr('{metThrough} · 亲近{bond}', {metThrough: f.metThrough, bond: Math.round(f.bond)}))), option('cancel', tr('先继续做朋友'))]); return result(true, tr('请选择想进一步了解的人。')); }
 case 'divorce': case 'relationship-decide':
  if (!alive(l.partner)) return result(false, tr('目前没有伴侣。'));
  divorceOffer(l); return result(true, tr('请确认财产与照护安排。'));
 case 'relationship-talk': case 'relationship-counsel': case 'date': case 'family-time': {
  if (!alive(l.partner)) { if (name !== 'family-time') return result(false, tr('目前没有伴侣。')); if (s.relationshipActions.family === l.age) return result(false, tr('今年已经安排过家庭相聚。')); s.relationshipActions.family = l.age; for (const c of l.children.filter(alive)) c.bond = clamp(c.bond + 3); log(l, tr('给亲人的一通电话'), tr('你问起家人最近的生活，约好下次见面的时间。')); return result(true, tr('和亲人保持了联系。')); }
  if (s.relationshipActions.contact === l.age) return result(false, tr('今年已经专门安排过关系沟通，留些时间让彼此消化。'));
  s.relationshipActions.contact = l.age; return communicate(l, name === 'relationship-counsel' ? 'counsel' : 'talk'); }
 case 'start-business':
  if (s.business) return result(false, tr('已经有一家企业，可进入经营菜单。'));
  pending(l, 'business-start', tr('选择创业方向'), tr('先投入启动资金，再承担每年的经营风险；投入不保证回本。'), [option('shop', tr('社区小店'), tr('投入约{gdp}，服务附近居民。', {gdp: Math.round(gdp(l) * .18)})), option('service', tr('技术服务工作室'), tr('投入约{gdp}，承接服务项目。', {gdp: Math.round(gdp(l) * .25)})), option('food', tr('餐饮小馆'), tr('投入约{gdp}，经营日常餐饮。', {gdp: Math.round(gdp(l) * .3)})), option('cancel', tr('暂缓创业'))], { businessName: (payload.name ? String(payload.name).slice(0, 30) : tr('{name}的小事业', {name: l.name})) }); return result(true, tr('请选择行业。'));
 case 'business-manage':
  if (!s.business) return result(false, tr('目前没有经营中的企业。'));
  pending(l, 'business-manage', s.business.name, tr('行业：{sector}；员工{staff}人；上年净利润{income}。', {sector: s.business.sector, staff: s.business.staff, income: s.business.income}), [option('hire', tr('招聘一名员工'), tr('增加工资成本和服务能力。')), option('market', tr('投入营销'), tr('花费预算争取客户。')), option('expand', tr('扩大经营'), tr('追加资本，增加收益和亏损的幅度。')), option('close', tr('关闭并清算'), tr('收回部分资本，结束年度经营风险。'))]); return result(true, tr('请选择经营安排。'));
 case 'checkup': {
  medicalBill(l, gdp(l) * .008);
  let c = s.conditions.find(c => !c.resolved);
  if (!c) { c = { id: `condition-${s.conditions.length}`, name: l.age >= 45 ? tr('高血压') : tr('慢性胃炎'), severity: 20 + Math.floor(roll(l) * 25), treatment: 'untreated', diagnosedAge: l.age, resolved: false }; s.conditions.push(c); }
  log(l, tr('检查给出明确的诊断'), tr('检查发现{name}，需要选择后续治疗。', {name: c.name}), 'health'); action(l, 'hospital', tr('到医院检查')); medicalChoice(l, c); return result(true, tr('请选择治疗方案。')); }
 case 'move-abroad':
  if (payload.countryId) return migrationParty(l, payload.countryId);
  pending(l, 'migration-country', tr('去哪个国家生活'), tr('这是迁居计划，还需要决定家人是否同行。'), COUNTRIES.filter(c => c.id !== l.country.id).map(c => option(c.id, `${c.flag} ${c.name} · ${c.city}`, tr('新的语言、物价和机会都在等你。')))); return result(true, tr('请选择迁居国家。'));
 case 'return-home': return returnHome(l);
 case 'reunite-family': return reunite(l);
 case 'visit-home':
  if (r.abroadSince == null) return result(false, tr('你目前在原居国生活。'));
  spend(l, gdp(l) * .035); stats(l, { happiness: 5, social: 4 }); if (alive(l.partner)) l.partner.bond = clamp(l.partner.bond + 5);
  log(l, tr('回乡探亲'), tr('你短暂回到{name}探望家人，随后返回{name2}。', {name: country(r.homeCountry)?.name || tr('原居国'), name2: l.country.name}), 'travel'); action(l, 'travel', tr('回乡探亲后返回住处'), l.country.name, country(r.homeCountry)?.name); return result(true, tr('完成了一次探亲旅程。'));
 case 'housing':
  if (payload.with) return setHousing(l, payload.with);
  pending(l, 'housing', tr('和谁一起住'), tr('同住安排决定家中的实际居民。家人在其他国家时，需要先团聚。'), [option('alone', tr('自己住')), option('parents', tr('与在世父母同住')), option('family', tr('与伴侣和孩子同住'))]); return result(true, tr('请选择同住安排。'));
 default: return result(false, tr('未知的生活系统动作。'));
 }
}
function setHousing(l, mode) {
 const r = l.systems.residence;
 if (!['alone', 'parents', 'partner', 'family'].includes(mode)) return result(false, tr('未知同住方式。'));
 if (mode === 'parents' && !grandparents(l).length) return result(false, tr('目前无法与在世父母同住。'));
 if (['family', 'partner'].includes(mode) && (!alive(l.partner) && !l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player'))) return result(false, tr('目前没有可同住的伴侣或孩子。'));
 if (['family', 'partner'].includes(mode) && r.countryId !== r.familyCountryId) return result(false, tr('家人仍在原居国，请先办理团聚。'));
 r.with = mode; log(l, tr('重新安排住处'), tr('{name}选择{x}。', {name: l.name, x: ({ alone: tr('独自生活'), parents: tr('与父母同住'), partner: tr('与伴侣同住'), family: tr('与伴侣和孩子同住') })[mode]})); action(l, 'moving', tr('重新安排同住')); return result(true, tr('同住安排已更新。'));
}

export function systemChoice(l, p, index) {
 if (p?.kind !== 'system' || l.pending !== p) return false;
 initSystems(l);
 const o = p.options?.[index]; if (!o) return false;
 const s = l.systems, key = o.key; l.pending = null;
 switch (p.system) {
 case 'child-plan':
  if (key === 'birth') {
   const why = fertilityBlock(l);
   if (why) { log(l, tr('没有开始生育'), why); break; }
   if (s.lastConceptionAge === l.age) { log(l, tr('今年已经试过'), tr('一年只安排一次生育尝试。')); break; }
   s.lastConceptionAge = l.age; spend(l, gdp(l) * .04);
   const page = l.partner.age ?? l.age;
   const conceived = chance(l, Math.max(.12, .62 - Math.max(0, l.age - 32) * .02 - Math.max(0, page - 32) * .02 - (l.stats.health < 40 ? .2 : 0)));
   if (!conceived) { stats(l, { happiness: -4, health: -2 }); log(l, tr('这一年没有迎来孩子'), tr('{name}和{name2}试过了。检查和等待都花了钱，新生儿没有来。今年不能再试。', {name: l.name, name2: l.partner.name})); break; }
   const c = { ...person(l), id: `child-${yearOf(l)}-${l.children.length}`, birthYear: yearOf(l), age: 0, alive: true, bond: 75, development: 50 };
   l.children.push(c); spend(l, gdp(l) * .08); stats(l, { happiness: 8, health: -3 });
   s.residence.with = 'family';
   c.countryId = s.residence.countryId;
   log(l, tr('孩子出生了'), tr('{name}来到世上。{name2}{x}承担抚养责任。', {name: c.name, name2: l.name, x: alive(l.partner) ? tr('与{name}', {name: l.partner.name}) : tr('将独自')})); action(l, 'family', tr('迎接{name}', {name: c.name})); childCare(l, c);
  } else log(l, tr('暂缓生育'), tr('你决定暂时把精力留给现有的生活。'));
  break;
 case 'child-care': {
  const c = l.children.find(c => c.id === p.childId); if (!c) break;
  if (key === 'grandparents' && !grandparents(l).length) { childCare(l, c); break; }
  if (key === 'partner' && (!alive(l.partner) || s.residence.countryId !== s.residence.familyCountryId)) { childCare(l, c); break; }
  s.care[c.id] = { mode: key, since: l.age, annualCost: 0, incomeLoss: 0 };
  c.caregiver = key; log(l, tr('{name}的照护安排', {name: c.name}), tr('选择{label}；此安排将按年计算费用、收入损失与成长。', {label: o.label})); break;
 }
 case 'friend-pick': systemAction(l, 'friend-time', { friendId: key }); break;
 case 'friend-time': {
  const f = l.friends.find(f => f.id === p.friendId); if (!f || key === 'cancel' || f.interactionAge === l.age) break;
  f.interactionAge = l.age; f.lastContactAge = l.age;
  if (key === 'help' && l.age >= 18) spend(l, gdp(l) * .008);
  const ok = chance(l, .35 + f.bond / 200); f.bond = clamp(f.bond + (ok ? key === 'help' ? 12 : 8 : -2));
  if (ok) f.sharedMemory = key === 'help' ? (f.countryId === l.country.id ? tr('帮忙搬完书箱后一起在门口吃面') : tr('隔着屏幕整理申请材料，终于赶上截止日期')) : tr('聊起第一次见面的糗事');
  log(l, tr('与{name}的{x}', {name: f.name, x: f.countryId === l.country.id ? tr('见面') : tr('远程联系')}), `${f.name}${ok ? tr('赴了约，你们{sharedMemory}。', {sharedMemory: f.sharedMemory}) : tr('临时有事，短短几句问候后就挂断了电话；你们还没找到合适的相处节奏。')}`, 'social'); break; }
 case 'courtship': {
  if (key === 'cancel' || alive(l.partner) || l.age < 18 || s.lastCourtAge === l.age) break;
  const f = l.friends.find(f => f.id === key && alive(f) && f.age >= 18); if (!f) break;
  s.lastCourtAge = l.age; const ok = chance(l, Math.min(.85, .15 + f.bond / 140 - (f.countryId !== l.country.id ? .2 : 0)));
  if (ok) {
   const minors = l.children.filter(c => alive(c) && c.age < 18 && c.supportPayer !== 'player');
   const placeOf = c => c.countryId || s.residence.familyCountryId;
   const kidsAway = minors.some(c => placeOf(c) !== l.country.id);
   const kidsHere = minors.some(c => placeOf(c) === l.country.id);
   l.partner = { ...f, countryId: l.country.id, income: Math.round(gdp(l) * .45), bond: Math.max(50, f.bond), distanceYears: 0, togetherSince: l.age };
   if (!kidsAway) s.residence.familyCountryId = l.country.id;
   if (s.residence.with !== 'parents') s.residence.with = kidsHere ? 'family' : 'partner';
  }
  else f.bond = clamp(f.bond - 3);
  log(l, ok ? tr('关系有了新的名字') : tr('心意没有得到回应'), `${f.name}${ok ? tr('愿意和你试着交往。你们约好，先认真了解彼此的日常。') : tr('认真听完，仍希望做朋友。你有些失落，也尊重了这个答复。')}`, 'love'); break; }
 case 'divorce': if (key !== 'cancel' && l.age >= 18 && l.partner?.name === p.partnerName) settleSeparation(l, key); break;
 case 'relationship':
  if (!alive(l.partner)) break;
  if (key === 'separate') divorceOffer(l);
  else { s.relationshipActions.contact = l.age; communicate(l, key); } break;
 case 'pet-care':
  if (!s.pet?.alive) break;
  if (key === 'vet') { spend(l, gdp(l) * .025); s.pet.health = clamp(s.pet.health + 35); }
  else if (key === 'basic') { spend(l, gdp(l) * .006); s.pet.health = clamp(s.pet.health + 12); }
  else { s.pet.health = clamp(s.pet.health - 15); stats(l, { happiness: -3 }); }
  log(l, tr('{name}的照顾', {name: s.pet.name}), tr('{label}，{name}的健康为{health}。', {label: o.label, name: s.pet.name, health: Math.round(s.pet.health)}), 'pet'); break;
 case 'business-start':
  if (key !== 'cancel') { const factor = { shop: .18, service: .25, food: .3 }[key]; if (!factor) break; const capital = Math.round(gdp(l) * factor); spend(l, capital); s.business = { name: p.businessName, sector: ({ shop: tr('零售'), service: tr('技术服务'), food: tr('餐饮') })[key], capital, income: 0, level: 1, staff: 0, marketing: 0, foundedAge: l.age }; log(l, tr('自己的事业开张'), tr('{businessName}投入{capital}启动资金，进入{sector}行业。', {businessName: p.businessName, capital, sector: s.business.sector}), 'business'); action(l, 'business', tr('为自己的事业开张')); } break;
 case 'business-manage': {
  const b = s.business; if (!b) break;
  if (key === 'close') { const recovered = Math.round(b.capital * .4); l.money += recovered; log(l, tr('关上店门'), tr('{name}结束经营，清算收回{recovered}。', {name: b.name, recovered}), 'business'); s.business = null; }
  else { const cost = gdp(l) * (key === 'expand' ? .18 : key === 'hire' ? .035 : .025); spend(l, cost); if (key === 'hire') b.staff++; if (key === 'expand') { b.capital += Math.round(cost); b.level++; } if (key === 'market') b.marketing += .15; log(l, tr('经营的新安排'), tr('{name}：{label}，投入{cost}。', {name: b.name, label: o.label, cost: Math.round(cost)}), 'business'); action(l, 'business', o.label); } break;
 }
 case 'medical': {
  const c = s.conditions.find(c => c.id === p.conditionId); if (!c) break;
  c.treatment = key; const billed = key === 'delay' ? 0 : medicalBill(l, gdp(l) * (key === 'standard' ? .07 : .018));
  c.severity = Math.max(0, c.severity + (key === 'standard' ? -18 : key === 'basic' ? -5 : 8)); stats(l, { health: key === 'standard' ? 7 : key === 'basic' ? 2 : -4 });
  c.resolved = c.severity <= 0; c.lastReviewAge = l.age;
  log(l, tr('{name}：{label}', {name: c.name, label: o.label}), tr('实际支付{billed}{x}。{x2}', {billed, x: l.insurance && billed ? tr('（保险承担70%）') : '', x2: key === 'delay' ? tr('拖延使病情加重，后续仍需面对。') : tr('此后每年继续用药、观察与复查。')}), 'health'); action(l, 'hospital', o.label); break;
 }
 case 'migration-country': migrationParty(l, key); break;
 case 'migration-party': if (key !== 'cancel') move(l, p.countryId, key === 'family', p.mode || 'none'); break;
 case 'migration-review':
  s.lastMigrationReview = l.age;
  if (key === 'home') returnHome(l); else if (key === 'reunite') reunite(l); else if (key === 'pr') tryResidency(l); else { stats(l, { knowledge: 2 }); log(l, tr('继续按当前身份住下去'), tr('你留在{name}。这不会自动变成永居，开销仍按这里计算。', {name: l.country.name}), 'migration'); } break;
 case 'housing': { const outcome = setHousing(l, key); if (!outcome.ok) log(l, tr('暂未改变住处'), outcome.message); break; }
 case 'pet-crisis': {
  const pet = s.pet; if (!pet?.alive) break;
  if (key === 'surgery') { const bill = Math.round(gdp(l) * .12); spend(l, bill); const ok = roll(l) < .55; if (ok) pet.health = clamp(pet.health + 30); else { pet.alive = false; stats(l, { happiness: -6 }); } log(l, tr('{name}的手术', {name: pet.name}), `${ok ? tr('手术很成功，{name}又在阳台上晒了整整一个下午的太阳。', {name: pet.name}) : tr('手术没能留住{name}。医生说，你做了能做的一切。', {name: pet.name})}`, 'pet'); }
  else if (key === 'comfort') { const bill = Math.round(gdp(l) * .03); spend(l, bill); pet.health = clamp(pet.health + 6); log(l, tr('{name}的保守治疗', {name: pet.name}), tr('止痛和护理让{name}舒服了一些。你把TA的窝搬到了卧室门口。', {name: pet.name}), 'pet'); }
  else { pet.alive = false; stats(l, { happiness: -4 }); log(l, tr('最后的告别'), tr('在兽医的建议下，你陪{name}走完了最后一段。它走的时候没有痛苦，头朝着家门的方向。', {name: pet.name}), 'pet'); }
  break; }
 case 'hometown-plan': {
  const res = s.residence;
   if (l.age < 18 || ![l.family.mother, l.family.father].some(alive)) break;
   s.lastHometownPlanAge = l.age;
  if (key === 'invite') { const cost = Math.round(gdp(l) * .1); spend(l, cost); res.parentsCountryId = res.countryId; res.with = 'parents'; res.familyWith = 'parents'; action(l, 'moving', tr('父母搬来同住')); log(l, tr('把父母接到了身边'), tr('{x}收拾了老屋，把行李搬来和{name}同住。安置与适应花了{cost}。', {x: [l.family.mother, l.family.father].filter(alive).map(pa => pa.name).join(tr('、')), name: l.name, cost}), 'family'); }
  else if (key === 'visit') { const cost = Math.round(gdp(l) * .05); spend(l, cost); stats(l, { happiness: 4, social: 2 }); log(l, tr('回家的次数多了'), tr('今年你回老家{x}次。{x2}的气色好了不少。', {x: 1 + Math.floor(roll(l) * 3), x2: [l.family.mother, l.family.father].filter(alive).map(pa => pa.name).join(tr('、'))}), 'family'); }
  else log(l, tr('老家的安排'), tr('你把这件事记在心里，想着以后再慢慢安排。'));
  break; }
 case 'world-crisis':
  if (key === 'migrate') { log(l, tr('开始问能不能离开'), tr('移民不是买到的船票。接下来要选国家，签证可能被拒，避难路线也可能中断。'), 'world'); systemAction(l, 'move-abroad'); break; }
  if (key === 'shelter') {
   spend(l, gdp(l) * .035);
   if (!chance(l, .62)) { spend(l, gdp(l) * .04); stats(l, { health: -6, happiness: -5 }); log(l, tr('避难没有走通'), tr('你赶到了集合点，但名额和路都断了。钱和身体都受了损，人还在原地。'), 'world'); break; }
   stats(l, { health: 2, happiness: -1 }); action(l, 'moving', tr('暂时前往安全住所')); log(l, tr('暂时避到了更安全的地方'), tr('这一次避难走通了。它不是保证，下一次仍可能失败。'), 'world'); break;
  }
  spend(l, gdp(l) * .015); stats(l, { health: -2, happiness: -2 }); log(l, tr('危机中的选择'), tr('面对年度情境，你选择了{label}。钱已经花出去，安全并不因此确定。', {label: o.label}), 'world'); break;
 case 'opportunity': {
   if (key === 'skip' || key === 'cancel') { log(l, tr('让这个消息过去'), tr('你听见了，但没有去追。机会不会在原地等你。')); break; }
   const kind = p.offerKind;
   if (kind === 'local') {
    const preview = localIncome(l, p.jobKind);
    const pass = chance(l, .28 + (l.stats.knowledge || 0) * .002 + Math.min(.2, (l.careerYears || 0) * .02));
    if (!pass) { stats(l, { happiness: -2 }); log(l, tr('本地的位置没有你'), tr('面试结束了。以你现在的学历和{careerYears}年经验，对方选了别人。你仍是{job}。', {careerYears: l.careerYears || 0, job: label(l.job)}), 'work'); break; }
    l.jobKind = p.jobKind; l.remote = false; l.employerGdp = null; l.employerCountryId = l.country.id; l.retired = false;
    l.job = { apprentice: '维修学徒', office: '行政职员', technical: '技术人员', matched: '专业对口岗位' }[p.jobKind] || '本地职员';
    l.income = preview; log(l, tr('本地录用了你'), tr('年收入{income}，按{name}的物价、学历和经验计算。以后仍可能失业。', {income: l.income, name: l.country.name}), 'work');
   } else if (kind === 'raise') {
    if (!chance(l, Math.min(.7, .18 + (l.careerYears || 0) * .03 + (l.stats.knowledge || 0) * .002)) || !(l.income > 0)) { log(l, tr('评估没有通过'), tr('你已有{careerYears}年经验，这次名单上没有你。岗位和收入维持原样。', {careerYears: l.careerYears || 0}), 'work'); break; }
    l.income = Math.round(l.income * 1.14); l.job = '资深' + String(l.job || '职员').replace(/^资深/, '');
    log(l, tr('晋升名单上有你'), tr('年收入调整为{income}。这是在{name}的物价上加的，不是一张永远有效的证明。', {income: l.income, name: l.country.name}), 'work');
   } else if (kind === 'remote') {
    if (!chance(l, .32 + (l.stats.knowledge || 0) * .002)) { log(l, tr('远程岗位没你'), tr('对方要的经验和时区你暂时对不上。'), 'work'); break; }
    l.remote = true; l.employerGdp = l.country.gdp; l.employerCountryId = l.country.id; l.jobKind = 'remote'; l.job = '远程职员'; l.retired = false; l.income = localIncome(l, 'remote');
    log(l, tr('做成了一份远程工作'), tr('年收入{income}，按现在雇主所在的物价计算。以后换国家，这份收入还在，开销按你住的地方算。', {income: l.income}), 'work');
   } else if (kind === 'pr') tryResidency(l);
   else if (kind === 'home-offer') returnHome(l, 'transfer');
   else if (kind === 'abroad') move(l, p.countryId, false, 'transfer');
   break;
  }
  case 'thread-start': startThread(l, p, key); break;
  case 'thread': resolveThread(l, p, key); break;
  default: l.pending = p; return false;
 }
 return true;
}

function tiltByLife(l, pool) { // 年龄/健康/经济/重心决定哪类家里的事更容易找上门
 const byFocus = l.focus === 'family' ? 1.5 : l.focus === 'work' ? .7 : 1;
 const byHealth = l.stats.health < 35 ? 1.25 : 1;
 const byMoney = l.money > gdp(l) * 2 ? .85 : l.money < gdp(l) * .5 ? 1.2 : 1;
 for (const e of pool) e.w = Math.max(.05, e.w * byFocus * byHealth * byMoney);
 return pool;
}
// Concrete, named incidents: spouse, pets, and the hometown family.
function intimateEvents(l) {
 const s = l.systems;
 if (l.pending || l.dead) return;
 if (chance(l, .3)) return;
 const year = yearOf(l);
 const focusName = ({ study: tr('学习'), work: tr('工作'), health: tr('健康'), family: tr('家人'), joy: tr('生活体验') })[l.focus] || tr('生活');
 const rich = l.age >= 18 && l.money > gdp(l) * 8;
 const poor = l.age >= 18 && (l.money < gdp(l) * .5 || (l.debt || 0) > gdp(l) * 1.5);
 const sick = l.age >= 16 && l.stats.health < 40;
 const band = l.age < 25 ? 'youth' : l.age < 45 ? 'family' : l.age < 65 ? 'mid' : 'late';
 const pool = [];
 if (sick) pool.push(
  {w:1.2, run: () => { const paid = Math.round(medicalBill(l, gdp(l) * .05)); stats(l, { health: 4, knowledge: 1 }); log(l, tr('身体的警讯'), tr('健康只剩{health}。{x}体检单上几个向上的箭头让你不能再拖。你花了{paid}{x2}做了全面检查，并把晚饭后的散步捡了起来。', {health: Math.round(l.stats.health), x: l.focus === 'work' ? tr('连轴转的工作把检查一拖再拖，') : '', paid, x2: l.insurance ? tr('（保险承担70%）') : ''}), 'health'); return {effects:{}}; }},
  {w:.8, run: () => { stats(l, { health: 2, happiness: -1 }); log(l, tr('不得不慢下来'), tr('身体状况不允许再硬撑。你推掉了两个饭局，把闹钟拨早半小时睡觉。收入没变，但你也清楚，再透支就要住院了。'), 'health'); return {effects:{}}; }}
 );
 if (rich) pool.push(
  {w:.6, run: () => { const rel = l.friends.find(alive) || befriend(l); const loan = Math.round(gdp(l) * .12); const before = Math.round(l.money); spend(l, loan); stats(l, { social: 1 }); log(l, tr('{name}来借钱', {name: rel.name}), tr('存款约{before}，在朋友眼里算过得宽裕。{name}{x}，说孩子上学想借{loan}。你数了数存折把钱转了过去，也提醒自己下次要立个字据。', {before, name: rel.name, x: roll(l) < .5 ? tr('带着水果上门') : tr('在电话里吞吞吐吐'), loan}), 'family'); return {effects:{}}; }},
  {w:.5, run: () => { const amt = Math.round(gdp(l) * .05); spend(l, amt); stats(l, { knowledge: 3, happiness: -2 }); log(l, tr('投资找上门'), tr('手头的闲钱让老同学想起了你。对方拍着胸脯说一个“稳赚”的项目，你投了{amt}试试。三个月后群里安静了，那个头像再也没亮过。', {amt}), 'event'); return {effects:{}}; }}
 );
 if (poor) pool.push(
  {w:.7, run: () => { stats(l, { happiness: -1, health: 1 }); log(l, tr('精打细算的一个月'), tr('现金只剩{money}{x}。你把外卖换成自己做饭，购物车清了又清，一个月硬省下约{gdp}。日子紧，但账本终于不再往下掉。', {money: Math.round(l.money), x: l.debt ? tr('，还背着{debt}的债', {debt: Math.round(l.debt)}) : '', gdp: Math.round(gdp(l) * .03)}), 'event'); return {effects:{}}; }},
  ...(l.age < 68 && !l.retired ? [{w:.6, run: () => { const earn = Math.round(gdp(l) * .06); l.money += earn; stats(l, { health: -2 }); log(l, tr('周末的兼职'), tr('收入{income}撑不住开销。你接了两份周末零工，多挣了{earn}。夜里腰有点酸，但卡里的数字让你踏实了一点。', {income: Math.round(l.income), earn}), 'work'); return {effects:{}}; }}] : []),
  ...(!l.house ? [{w:.6, run: () => { const rent = Math.round(gdp(l) * .06); spend(l, rent); stats(l, { happiness: -2 }); log(l, tr('房东的消息'), tr('房租又到日子了。房东说附近都涨了，你央求宽限到月底，最后还是转了{rent}过去。关掉转账页面，你把求职软件的提醒重新打开了。', {rent}), 'event'); return {effects:{}}; }}] : [])
 );
 if (alive(l.partner)) {
  const p = l.partner;
  pool.push(
   {w:.8, run: () => { const bill = Math.round(gdp(l) * .04); spend(l, bill); stats(l, { happiness: -1 }); log(l, tr('{name}打碎了你的相机', {name: p.name}), tr('{name}大扫除时碰倒了书架，你用了两年的相机摔在地板上，镜头裂了。维修要{bill}，你们在客厅里沉默了很久，最后笑着说：“就当旧的不去，新的不来。”', {name: p.name, bill}), 'family'); return {effects:{}}; }},
   {w:.6, run: () => { const bill = Math.round(gdp(l) * .05); spend(l, bill); stats(l, { happiness: 1 }); log(l, tr('{name}驾驶的车被追尾', {name: p.name}), tr('{name}照常开车上下班。雨天的路口TA的车被人追尾，人没事，但保险之外还要自付{bill}的维修费。{name}反复问你是不是很生气，你只说“人平安就好”。', {name: p.name, bill}), 'family'); return {effects:{}}; }},
   {w:.5, run: () => { const gift = Math.round(gdp(l) * .015); spend(l, gift); stats(l, { happiness: 5, social: 2 }); log(l, tr('{name}的生日', {name: p.name}), tr('你偷偷订了{name}念叨很久的那家餐厅，花了{gift}。餐后散步回家，{name}说这是这几年最放松的一晚。', {name: p.name, gift}), 'warm'); return {effects:{}}; }},
   {w:.35, run: () => { stats(l, { happiness: 4 }); log(l, tr('{name}升了职', {name: p.name}), tr('这一年的重心放在{focusName}上，家里的氛围也跟着起落。{name}的晋升通知下来了，晚归的夜里，两个人把冰箱里剩下的菜热了热，聊到很晚。', {focusName, name: p.name}), 'warm'); return {effects:{}}; }},
   {w:.3, run: () => { const bill = Math.round(gdp(l) * .09); const paid = Math.round(medicalBill(l, bill)); log(l, tr('{name}的牙要治', {name: p.name}), tr('{name}牙疼了半个月终于去看了牙医，两颗牙的治疗费{bill}。{x}', {name: p.name, bill, x: l.insurance ? tr('保险承担70%，实付{paid}。', {paid}) : tr('没有保险，全额自付{paid}。', {paid})}), 'health'); return {effects:{}}; }}
  );
  if (band === 'youth' && !p.sharedNewYear) pool.push({w:.6, run: () => { p.sharedNewYear = true; const cost = Math.round(gdp(l) * .02); spend(l, cost); stats(l, { happiness: 4, social: 2 }); log(l, tr('第一次一起过年'), tr('还在攒钱（现金约{money}）。你们挤着火车回{name}老家过年，年货和红包花了{cost}。围炉夜话时TA说：“明年把房子的事定下来。”', {money: Math.round(l.money), name: p.name, cost}), 'family'); return {effects:{}}; }});
  if (band === 'family') pool.push(
   ...(l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player') ? [{w:.55, run: () => { const c = l.children.find(c => alive(c) && c.age < 18); c.bond = clamp(c.bond + 3); stats(l, { happiness: 2 }); log(l, tr('谁去开家长会'), tr('{name}的学校通知开家长会，你的工作正处在要劲的时候。你们商量后由{name2}去，回来的路上TA把老师的话一条条讲给你听。', {name: c.name, name2: p.name}), 'family'); return {effects:{}}; }}] : [{w:.55, run: () => { stats(l, { happiness: 3, social: 2 }); log(l, tr('两个人的分工表'), tr('家里的事越排越满。你和{name}在冰箱上贴了一张分工表：TA管账单和菜，你管修理和接送。贴上去那晚，两个人都笑了。', {name: p.name}), 'family'); return {effects:{}}; }}]),
   {w:.4, run: () => { const cost = Math.round(gdp(l) * .04); spend(l, cost); stats(l, { happiness: 3 }); log(l, tr('请人搭把手'), tr('收入约{income}，家里两头顾不过来。你们请了钟点工每周来两次，一个月{cost}。争吵少了一些，晚饭后也能一起散步了。', {income: Math.round(l.income), cost}), 'family'); return {effects:{}}; }}
  );
  if (band === 'mid') pool.push(
   {w:.5, run: () => { stats(l, { knowledge: 2, happiness: 2 }); log(l, tr('你们聊起以后'), tr('年收入约{income}。晚饭后你和{name}算了算：父母的身体、孩子的学费、自己的养老。最后决定把每年结余的一部分先存起来。账算得有点冷，牵手却更紧了。', {income: Math.round(l.income), name: p.name}), 'family'); return {effects:{}}; }},
   {w:.4, run: () => { const cost = Math.round(gdp(l) * .05); spend(l, cost); stats(l, { happiness: 5 }); log(l, tr('补上的蜜月'), tr('你们终于把年轻时没舍得的那趟旅行补上了，花了{cost}。照片里两个人的白发都比记忆里多，笑得却和当年一样。', {cost}), 'warm'); return {effects:{}}; }}
  );
  if (band === 'late') pool.push(
   {w:.55, run: () => { stats(l, { happiness: 4, health: 1 }); log(l, tr('相扶着散步'), tr('{name}也{age}岁了。你们把晚饭后的散步改成两圈，走慢一点，把年轻时没说完的话接着说。', {name: p.name, age: p.age ?? l.age}), 'warm'); return {effects:{}}; }},
   {w:.4, run: () => { const paid = Math.round(medicalBill(l, gdp(l) * .04)); stats(l, { happiness: -1 }); log(l, tr('{name}的老花镜和药盒', {name: p.name}), tr('{name}配了新眼镜，又开了两个月的慢性病药，实付{paid}{x}。你们把药盒摆在餐桌最显眼的地方，像给日子上了个闹钟。', {name: p.name, paid, x: l.insurance ? tr('（保险承担70%）') : ''}), 'health'); return {effects:{}}; }}
  );
  if (l.focus === 'work') pool.push({w:.5, run: () => { p.bond = clamp(p.bond - 3); stats(l, { happiness: -1 }); log(l, tr('加班的夜晚'), tr('重心压在工作上，连续几周晚归。{name}给你留了一盏灯和一张字条：“汤在锅里。”你看着字条坐了一会儿，决定周末把时间还给这个家。', {name: p.name}), 'family'); return {effects:{}}; }});
  if (l.focus === 'family') pool.push({w:.5, run: () => { p.bond = clamp(p.bond + 4); stats(l, { happiness: 3 }); log(l, tr('一起做饭的周末'), tr('你把重心拨回家人这边。周末你和{name}试着做了TA家乡的那道菜，咸了，两个人还是吃了个精光。', {name: p.name}), 'warm'); return {effects:{}}; }});
 }
 if (s.pet?.alive) {
  const p = s.pet;
  pool.push(
   {w:.5, run: () => { const bill = Math.round(gdp(l) * .03); spend(l, bill); p.health = clamp(p.health - 6); log(l, tr('{name}咬坏了沙发', {name: p.name}), tr('{name}把沙发角啃出一个大洞，宠物行为咨询和换沙发套一共花了{bill}。{x}', {name: p.name, bill, x: l.partner ? tr('{name}劝你：它还小。', {name: l.partner.name}) : tr('你安慰自己：它还小。')}), 'pet'); return {effects:{cash:-bill,happiness:-1}}; }},
   {w:.4, run: () => { const bill = Math.round(gdp(l) * .045); spend(l, bill); p.health = clamp(p.health + 8); log(l, tr('{name}深夜呕吐', {name: p.name}), tr('{name}半夜吐了两次，宠物医院的检查和输液花了{bill}。凌晨四点的候诊室里，它一直把头靠在你的腿上。', {name: p.name, bill}), 'pet'); return {effects:{cash:-bill,happiness:1}}; }}
  );
  if (p.age >= 9 || p.health < 45) pool.push({w:.9, run: () => { pending(l, 'pet-crisis', tr('{name}病得很重', {name: p.name}), tr('{age}岁的{name}查出了严重的病。医生说手术有风险，费用约{gdp}，且不能保证治好。', {age: p.age, name: p.name, gdp: Math.round(gdp(l)*.12)}), [option('surgery', tr('全力治疗'), tr('花这笔钱，陪它最后一程或重新开始。')), option('comfort', tr('保守治疗陪伴'), tr('用止痛和护理让它舒服一些。')), option('farewell', tr('告别'), tr('不让它再受苦，陪它到最后。'))], {petKind:p.kind}); return null; }});
 }
 if (alive(l.partner) && l.age >= 55 && (l.partner.age ?? l.age) >= 55 && !l.formerPartners?.length) pool.push({w:.12, run: () => { l.partner.alive = false; l.partner.deathAge = l.partner.age ?? l.age; const name = l.partner.name; l.systems.residence.with = l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player') ? 'family' : 'alone'; stats(l, { happiness: -12, health: -3 }); log(l, tr('{name}离开了', {name}), tr('{name}在{deathAge}岁时因病离世。你整理TA的抽屉时，发现一沓两人年轻时互相写的信。很长一段时间，你习惯性地给TA留一盏灯。', {name, deathAge: l.partner.deathAge}), 'family'); return null; }});
 if (pool.length && l.age - (s.lastIntimateAge ?? -10) >= 2) { s.lastIntimateAge = l.age; const available = pool.filter((e, i) => l.age - (s.eventCooldowns[`intimate-${i}`] ?? -20) >= 5); if (available.length) { const event = pickWeighted(l, tiltByLife(l, available)); s.eventCooldowns[`intimate-${pool.indexOf(event)}`] = l.age; event.run(); } }
}
function hometownEvents(l) {
 const s = l.systems, r = s.residence; if (l.pending || l.dead || l.age < 18 || l.age - (s.lastHometownAge ?? -10) < 3) return;
 const parents = [l.family.mother, l.family.father].filter(alive);
 if (!parents.length) return;
 if (chance(l, .35)) return;
 const year = yearOf(l);
 const parent = pick(l, parents);
 const oldest = Math.max(...parents.map(p => p.age ?? 60));
 const withYou = r.with === 'parents' && (r.parentsCountryId || r.homeCountry) === r.countryId;
 const farAway = r.countryId !== r.homeCountry || r.with !== 'parents';
 const homeName = country(r.homeCountry)?.name || tr('老家');
 const focusName = ({ study: tr('学习'), work: tr('工作'), health: tr('养身体'), family: tr('家人'), joy: tr('生活体验') })[l.focus] || tr('生活');
 const pool = [];
 if (!withYou) {
  pool.push(
   {w:.7, run: () => { log(l, tr('{name}打来的电话', {name: parent.name}), tr('这一年的重心放在{focusName}上。周末{name}打来视频，镜头先对着院子里的菜地，再转到屋里：“鸡下蛋了，你小时候那间屋还空着。”{x}', {focusName, name: parent.name, x: farAway ? tr('挂了电话，你想家乡的空气和这条城市的马路完全是两个世界。') : tr('你答应这周末回去吃晚饭。')}), 'family'); return {effects:{happiness:2,social:1}}; }},
   {w:.4, run: () => { const cost = Math.round(gdp(l) * .08); spend(l, cost); log(l, tr('老家的屋顶要翻修'), tr('{name}来电话说村里的房子漏雨了，找熟人问了价，翻修要{cost}。TA嘴上说“不急”，你却听出了心疼钱的意思，当天就把钱转了过去，也提醒自己回村的次数太少了。', {name: parent.name, cost}), 'family'); return {effects:{happiness:-1,social:1}}; }},
   {w:.35, run: () => { const bill = Math.round(gdp(l) * .06); const paid = Math.round(medicalBill(l, bill)); log(l, tr('{name}住院了', {name: parent.name}), tr('{name}{age}岁，在地里闪了腰，住院观察了几天。你赶回去陪了两晚，医疗和往返花了{paid}{x}。出院时TA坚持不让你多花钱，你只把回程票订得更早了些。', {name: parent.name, age: parent.age ?? 60, paid, x: l.insurance ? tr('（保险承担70%）') : ''}), 'family'); return {effects:{happiness:-2,social:2}}; }},
   {w:.3, run: () => { const gift = Math.round(gdp(l) * .03); spend(l, gift); log(l, tr('从老家寄来的包裹'), tr('{name}寄来一箱自家晒的干货和一罐腌菜，快递单上的字写得很大。你回寄了一盒点心和一件冬衣，一共{gift}。', {name: parent.name, gift}), 'warm'); return {effects:{happiness:4}}; }}
  );
  if (farAway && oldest >= 60 && l.age - (s.lastHometownPlanAge ?? -10) >= 6) pool.push({w:.5, run: () => { pending(l, 'hometown-plan', tr('老家的安排'), tr('{parents}年纪渐渐大了，仍在{homeName}的院子里生活。你可以把TA们接过来同住，或者多回去看看。', {parents: parents.map(p=>p.name).join(tr('、')), homeName}), [option('invite', tr('接来身边养老'), tr('安排住房和适应，开销会增加。')), option('visit', tr('今年多回去看看'), tr('多几次探望和电话，各自安好。')), option('later', tr('以后再说'))]); return null; }});
  if (l.age >= 18) pool.push({w:.4, run: () => { const cost = Math.round(gdp(l) * .02); spend(l, cost); log(l, tr('回村的那几天'), tr('你回到{homeName}住了几天，来回路费{cost}。{name}天不亮就去集上买了你爱吃的东西，走的时候后备箱被塞得满满的。', {homeName, cost, name: parent.name}), 'warm'); return {effects:{happiness:4,social:2}}; }});
 } else {
  pool.push(
   {w:.55, run: () => { const cost = Math.round(gdp(l) * .02); spend(l, cost); log(l, tr('同住的一个家'), tr('{parents}和你住在一起。周末一起逛过菜市场，再去公园坐一会儿，这个月开销多出约{cost}。屋子挤了些，心却踏实了。', {parents: parents.map(p=>p.name).join(tr('、')), cost}), 'warm'); return {effects:{happiness:4}}; }},
   {w:.4, run: () => { log(l, tr('{name}搭把手', {name: parent.name}), tr('重心放在{focusName}上，常常顾不上家。{name}把饭做好、衣服晾好，还念叨你“别老点外卖”。你下班回家看见亮着的厨房灯，一天的疲惫散了一半。', {focusName, name: parent.name}), 'warm'); return {effects:{happiness:3,social:1}}; }},
   {w:.35, run: () => { const cost = Math.round(gdp(l) * .05); spend(l, cost); log(l, tr('想回老家看看'), tr('{name}翻出老照片，想回{homeName}的老院子住几天。你订了车票，陪TA们回去待了一个周末，花了约{cost}。临走时TA把院子里的果子摘满了袋子。', {name: parent.name, homeName, cost}), 'family'); return {effects:{happiness:3,social:1}}; }}
  );
  if (l.children.some(c => alive(c) && c.age < 12)) pool.push({w:.5, run: () => { const c = l.children.find(c => alive(c) && c.age < 12); c.bond = clamp(c.bond + 3); log(l, tr('隔代的疼爱'), tr('{name}放学回家，{name2}已经备好了点心。孩子缠着老人讲过去的故事，你在一旁听得出神。家里有老人，孩子的话都变多了。', {name: c.name, name2: parent.name}), 'warm'); return {effects:{happiness:3}}; }});
 }
 if (oldest > 75) pool.push(
  {w:.8, run: () => { const bill = Math.round(gdp(l) * .04); const paid = Math.round(medicalBill(l, bill)); log(l, tr('带{name}做体检', {name: parent.name}), tr('{name}已经{age}岁。你陪TA做了全面体检，配了半年的慢性病药，实付{paid}{x}。医生说指标大体平稳，你这些年第一次松了口气。', {name: parent.name, age: parent.age ?? 75, paid, x: l.insurance ? tr('（保险承担70%）') : ''}), 'health'); return {effects:{happiness:2}}; }},
  {w:.45, run: () => { const bill = Math.round(gdp(l) * .07); spend(l, bill); log(l, tr('半夜的动静'), tr('{age}岁的{name}夜里起床上洗手间时摔了一跤。所幸不重，检查和护理花了{bill}。你从此在走廊装了小夜灯，把TA的床换到靠门的位置。', {age: parent.age ?? 75, name: parent.name, bill}), 'family'); return {effects:{happiness:-2,social:1}}; }},
  {w:.3, run: () => { log(l, tr('{name}的话少了', {name: parent.name}), tr('{name}的耳朵越来越背，电视声音开得很大，人却越来越安静。你配了助听器，晚饭后陪TA慢慢散步，把当年没来得及听的故事一点点补上。', {name: parent.name}), 'warm'); return {effects:{happiness:2,social:1}}; }}
 );
 if (pool.length) { s.lastHometownAge = l.age; pickWeighted(l, tiltByLife(l, pool)).run(); }
}
// Calendar arithmetic makes the year's headline identical across independently seeded lives.
function worldFor(year) {
 const historical={1973:['crisis',tr('石油危机'),tr('1973年石油危机冲击能源供应和全球经济。')],1989:['culture',tr('柏林墙开放'),tr('1989年柏林墙开放，欧洲政治格局发生重大变化。')],2001:['crisis',tr('九一一事件'),tr('2001年九一一袭击发生，国际旅行和安全环境随之变化。')],2008:['crisis',tr('全球金融危机'),tr('2008年金融危机引发就业与资产市场动荡。')],2020:['crisis',tr('新冠疫情'),tr('2020年新冠疫情蔓延，出行、学习和工作受到广泛影响。')],2022:['war',tr('俄乌战争全面升级'),tr('2022年俄罗斯全面入侵乌克兰，战争造成大量人员流离失所，并冲击粮食和能源市场。')]};
 if(historical[year]){const [kind,title,detail]=historical[year];return {year,kind,title,detail:detail+'',fictional:false};}
 const n = ((Math.imul(year, 1664525) + 1013904223) >>> 0) % 1000;
 const entries = n < 18 ? ['war', tr('地区武装冲突'), tr('地区冲突扰乱运输，生活物资涨价。')] : n < 55 ? ['crisis', tr('全球供应危机'), tr('物流受阻，食品与能源开支上涨。')] : n < 250 ? ['climate', tr('城市应对极端天气'), tr('多地加强防暑与防洪设施。')] : n < 500 ? ['science', tr('公共医疗出现新进展'), tr('基层筛查和医疗技术逐步改善。')] : n < 750 ? ['economy', tr('工作方式继续变化'), tr('新职业出现，人们重新学习技能。')] : ['culture', tr('跨国文化交流季'), tr('社区展览与交流让陌生人相遇。')];
 return { year, kind: entries[0], title: entries[1], detail: entries[2] + '', fictional: true };
}
export function systemsYear(l, options = {}) {
 initSystems(l); const s = l.systems, r = s.residence;
 if (l.dead || s.lastYear === l.age) return l;
 s.lastYear = l.age;
 if (options.events !== false) threadYear(l);
 if (options.events !== false && l.age >= 5 && !l.friends.length) befriend(l);
 for (const f of l.friends.filter(alive)) { if (!(f.lastContactAge === l.age && f.age === l.age)) f.age = (f.age ?? l.age - 1) + 1; if (l.age - (f.lastContactAge ?? l.age) > 1) f.bond = clamp(f.bond - (f.countryId === r.countryId ? 2 : 4)); }
 if (alive(l.partner)) {
  const p = l.partner;
  if (p.countryId !== r.countryId) { p.distanceYears++; const contacted = l.age - (p.lastContactAge ?? -10) <= 1; p.bond = clamp(p.bond - (contacted ? 3 : 8) - Math.min(6, p.distanceYears)); if (p.distanceYears === 1 || p.distanceYears % 3 === 0) log(l, tr('与{name}隔着时区', {name: p.name}), tr('异地已经{distanceYears}年。{x}你开始认真考虑下次什么时候能见面。', {distanceYears: p.distanceYears, x: contacted ? tr('通话还在继续，但屏幕代替不了共同生活。') : tr('约好的电话错过了几次，聊天框里只剩简单的问候。')})); }
  else p.distanceYears = 0;
 }

 // Old saves and engine-created children acquire the same continuing care system.
 for (const c of l.children.filter(alive)) {
  c.age = Math.max(0, yearOf(l) - c.birthYear);
   if (c.supportPayer === 'player') { if (c.age < 18 && l.age > c.supportSinceAge && c.lastSupportAge !== l.age) { const bill = c.supportAnnual ?? Math.round(gdp(l) * .05); spend(l, bill); c.lastSupportAge = l.age; log(l, tr('{name}的抚养费', {name: c.name}), tr('你按约定转去{bill}，用于{name}的生活和上学。日常照护由另一方安排。', {bill, name: c.name})); } continue; }
  const care = s.care[c.id];
  if (c.age < 6 && !care) { if (!l.pending) childCare(l, c); continue; }
  if (c.age >= 6) { if (care) { care.annualCost = 0; care.incomeLoss = 0; care.completed = true; } continue; }
  if (care.mode === 'grandparents' && !grandparents(l).length) { delete s.care[c.id]; if (!l.pending) childCare(l, c); continue; }
  if (care.mode === 'partner' && (!alive(l.partner) || r.countryId !== r.familyCountryId)) { delete s.care[c.id]; if (!l.pending) childCare(l, c); continue; }
  const cost = gdp(l) * (care.mode === 'nursery' ? .065 : care.mode === 'grandparents' ? .012 : .008);
  const loss = care.mode === 'self' ? (l.income || 0) * .22 : care.mode === 'partner' ? (l.partner.income || 0) * .22 : 0;
  care.annualCost = Math.round(cost); care.incomeLoss = Math.round(loss); spend(l, cost + loss);
  c.bond = clamp(c.bond + (care.mode === 'nursery' ? 1 : 3)); c.development = clamp(c.development + (care.mode === 'nursery' ? 4 : 3));
  stats(l, { happiness: 1, social: 1, health: care.mode === 'self' ? -.7 : 0 });
  log(l, tr('{name}又长大了一点', {name: c.name}), tr('{age}岁；{x}照护，费用{annualCost}，家庭收入损失{incomeLoss}。', {age: c.age, x: ({ self: l.name, partner: l.partner?.name, nursery: tr('托育机构'), grandparents: grandparents(l).map(p => p.name).join(tr('、')) })[care.mode], annualCost: care.annualCost, incomeLoss: care.incomeLoss}));
 }
 if (alive(l.partner) && l.partner.bond < 35 && (s.lastRelationshipAge == null || l.age - s.lastRelationshipAge >= 3) && !l.pending) { s.lastRelationshipAge = l.age; offer(l, 'relationship', tr('与{name}的距离', {name: l.partner.name}), tr('争执和沉默让关系变得脆弱，需要共同作出决定。'), [option('talk', tr('认真沟通')), option('counsel', tr('接受伴侣咨询')), option('separate', tr('分开生活'))]); }
 if (s.pet?.alive) {
  const pet = s.pet; pet.age++; spend(l, gdp(l) * (pet.kind === 'dog' ? .016 : .011)); pet.health = clamp(pet.health - (pet.age > 9 ? 7 : 2)); stats(l, { happiness: 1 });
  if (pet.health <= 0 || pet.age >= (pet.kind === 'dog' ? 17 : 21)) { pet.alive = false; stats(l, { happiness: -7 }); log(l, tr('和小伙伴告别'), tr('{name}在{age}岁离开，你记得一起生活的那些日子。', {name: pet.name, age: pet.age}), 'pet'); }
  else if ((pet.health < 55 || roll(l) < .07) && !l.pending) { pet.health = clamp(pet.health - 10); offer(l, 'pet-care', tr('{name}不太舒服', {name: pet.name}), tr('{age}岁的{name}食欲下降，需要选择照顾方式。', {age: pet.age, name: pet.name}), [option('vet', tr('去宠物医院治疗')), option('basic', tr('基础护理和复诊')), option('delay', tr('暂时拖延'))]); }
 }
 if (s.business) {
  const b = s.business; const margin = roll(l) * .8 - .24 + b.marketing + Math.min(b.staff, 5) * .035;
  const profit = Math.round(b.capital * margin - b.staff * gdp(l) * .04); b.income = profit; b.marketing *= .5;
  if (profit >= 0) l.money += profit; else spend(l, -profit);
  stats(l, { knowledge: 1, health: -.6 }); log(l, tr('{name}年度账本', {name: b.name}), tr('净{x}{profit}，行业{sector}，员工{staff}人。', {x: profit >= 0 ? tr('利润') : tr('亏损'), profit: Math.abs(profit), sector: b.sector, staff: b.staff}), 'business');
 }
 for (const c of s.conditions.filter(c => !c.resolved)) {
  const treated = c.treatment === 'standard', basic = c.treatment === 'basic';
  if (treated || basic) medicalBill(l, gdp(l) * (treated ? .018 : .006));
  c.severity = Math.max(0, c.severity + (treated ? -7 : basic ? -1 : 9)); stats(l, { health: treated ? 1 : basic ? -1 : -Math.min(10, 2 + c.severity / 20) });
  if (c.severity <= 0) { c.resolved = true; log(l, tr('病情得到控制'), tr('{name}经过持续治疗，症状得到控制。', {name: c.name}), 'health'); }
  else if ((c.severity >= 50 || l.age - (c.lastReviewAge ?? c.diagnosedAge) >= 3) && !l.pending) medicalChoice(l, c);
 }
 if (r.abroadSince != null && l.age - (s.lastMigrationReview ?? r.abroadSince) >= 3 && !l.pending) {
   const years = l.age - r.abroadSince; const home = country(r.homeCountry); const familyHere = r.familyCountryId === r.countryId;
   const separated = !familyHere && (alive(l.partner) || l.children.some(c => alive(c) && c.age < 18 && c.supportPayer !== 'player'));
   offer(l, 'migration-review', tr('在{name}的第{years}年', {name: l.country.name, years}), familyHere ? tr('你和家人都在{name}，已经{years}年。身份仍是{x}，留下不会自动变成永居。回{name2}会结束这段居住；非远程工作不会跟回去。', {name: l.country.name, years, x: s.residency === 'permanent' ? tr('长期居留') : tr('临时居留'), name2: home?.name || tr('原居国')}) : tr('你在{name}，家人在{name2}。分开已经{years}年。团聚要另付搬迁费，也不会自动办成。', {name: l.country.name, name2: country(r.familyCountryId)?.name || tr('原居国'), years}), [option('stay', tr('继续按当前身份住下去'), tr('不会自动获得永居。开销仍按这里计算。')), ...(separated ? [option('reunite', tr('接家人团聚'), tr('需要搬迁费和生活储备，家人到齐以后才同住。'))] : []), ...(s.residency !== 'permanent' && years >= 4 ? [option('pr', tr('申请长期居留'), tr('申请费不退。可能被拒，被拒后三年不能再申。'))] : []), option('home', tr('回原居国生活'), tr('非远程的工作不会跟回去，收入会先归零，开销改按原居国。'))]);
  }
 if (options.events !== false) { hometownEvents(l); intimateEvents(l); }
 s.world = worldFor(yearOf(l));
 if (['war', 'crisis'].includes(s.world.kind) && l.age >= 18) { spend(l, gdp(l) * .025); stats(l, { happiness: -2, health: -1 }); if (options.events !== false) offer(l, 'world-crisis', s.world.title, s.world.detail, s.world.kind==='war' ? [option('stay', tr('留守并准备物资')), option('shelter', tr('暂时避难')), option('migrate', tr('考虑移民'))] : [option('stay', tr('缩减开支，准备应急物资')), option('shelter', tr('动用应急预算渡过危机')), option('migrate', tr('寻找其他地方的机会'))]); }
 else if (s.world.kind === 'science') stats(l, { health: .5 });
 if (options.events !== false && !l.pending) hearOpportunity(l);
 return l;
}


function tryResidency(l) {
 const s = l.systems;
 if (s.residency === 'permanent') { log(l, tr('已经是长期居留'), tr('不用再申请一次。')); return; }
 if ((s.prUntil || 0) > l.age) { log(l, tr('永居申请还在冷却'), tr('上次被拒。要到{prUntil}岁才能再递。', {prUntil: s.prUntil})); return; }
 const fee = Math.round(gdp(l) * .04); spend(l, fee);
 if (!chance(l, Math.min(.7, visaOdds(l) + .05))) { s.prUntil = l.age + 3; stats(l, { happiness: -3 }); log(l, tr('长期居留没有通过'), tr('申请费{fee}已经交掉。你仍是临时居留，最早{prUntil}岁可以再试。欠款和没有收入仍可能让你被要求离开。', {fee, prUntil: s.prUntil}), 'migration'); return; }
 s.residency = 'permanent'; log(l, tr('拿到了长期居留'), tr('你付了{fee}。这不是公民身份，严重欠款仍可能被重新审查，但一次换工作不会立刻把你送走。', {fee}), 'migration');
}
function hearOpportunity(l) {
 if (l.pending || l.dead || l.retired || l.age < 18 || l.age > 67) return;
 if (!chance(l, .62)) return;
 const employedNow = (l.income || 0) > 0 && !['待业', '尚未工作', '学生', '退休', '求职中'].includes(l.job || '');
 if (employedNow && chance(l, .12)) {
  l.income = 0; l.job = '待业'; l.remote = false; l.jobKind = null;
  log(l, tr('这份工作结束了'), tr('没有人提前保证岗位。你在{name}失去了收入，{careerYears}年经验还留着。接下来只能等新的消息，或自己去投。', {name: l.country.name, careerYears: l.careerYears || 0}), 'work');
  return;
 }
 const dest = pick(l, COUNTRIES.filter(c => c.id !== l.country.id));
 const r = l.systems.residence;
 const open = careerOptions(l).filter(o => !o.disabled && o.id !== 'promotion');
 const localJobs = open.filter(o => o.id !== 'remote');
 const kinds = ['abroad'];
 if (localJobs.length) kinds.push('local');
 if (employedNow) kinds.push('raise');
 if (open.some(o => o.id === 'remote')) kinds.push('remote');
 if (r.abroadSince != null && l.age - r.abroadSince >= 4 && l.systems.residency === 'temporary') kinds.push('pr');
 if (r.abroadSince != null) kinds.push('home-offer');
 const kind = pick(l, kinds);
 if (kind === 'local') {
  const jobKind = pick(l, localJobs).id;
  const preview = localIncome(l, jobKind);
  pending(l, 'opportunity', tr('有人提起一个本地的位置'), tr('在{name}，以你的学历和{careerYears}年经验，这份工作不一定录用。若做成，年收入大约{preview}，按这里的物价计算。', {name: l.country.name, careerYears: l.careerYears || 0, preview}), [option('try', tr('去试试'), tr('花时间面试，可能没有回音。')), option('skip', tr('先不接'), tr('消息会过去，你留在现在的状态。'))], { offerKind: 'local', jobKind });
 } else if (kind === 'raise') {
  pending(l, 'opportunity', tr('主管提起你的名字'), tr('你在这里做了{careerYears}年。晋升不看你想不想，看他们认不认。没通过就留在原岗位。', {careerYears: l.careerYears || 0}), [option('try', tr('参加评估'), tr('可能被拒绝。')), option('skip', tr('当作没听见'), tr('岗位维持原样。'))], { offerKind: 'raise' });
 } else if (kind === 'remote') {
  pending(l, 'opportunity', tr('一份可以不坐在办公室的工作'), tr('申请可能失败。若做成，以后换国家这份收入还在，开销仍按你住的地方算。'), [option('try', tr('去申请'), tr('失败就还是现在的工作。')), option('skip', tr('先不申请'), tr('机会会过去。'))], { offerKind: 'remote' });
 } else if (kind === 'pr') {
  pending(l, 'opportunity', tr('可以申请在{name}长期留下', {name: l.country.name}), tr('你已住了{age}年，身份仍是临时的。申请费不退，可能被拒，被拒后三年不能再申。', {age: l.age - r.abroadSince}), [option('try', tr('递交申请'), tr('花钱，结果不确定。')), option('skip', tr('以后再说'), tr('继续临时居留。'))], { offerKind: 'pr' });
 } else if (kind === 'home-offer') {
  const home = country(r.homeCountry);
  const cheaper = home && home.gdp < l.country.gdp * .75;
  pending(l, 'opportunity', tr('老家有人叫你回去'), tr('{name}的物价和{name2}不一样。如果回去接那份本地工作，收入按老家重算，开销也改按老家。{x}', {name: home?.name || tr('原居国'), name2: l.country.name, x: cheaper ? tr('消费没这边高，收入通常会降，账单会轻一些。') : ''}), [option('try', tr('回去看看那份工作'), tr('人会回去，收入按老家重算。')), option('skip', tr('继续留在这里'), tr('老家的消息就过去了。'))], { offerKind: 'home-offer' });
 } else {
  const cheaper = dest.gdp < l.country.gdp * .75;
  pending(l, 'opportunity', tr('听说{name}有一个能接上的位置', {name: dest.name}), tr('你现在在{name}（人均参照 {gdp}）。那边约为 {gdp2}。去成的话，收入和开销都改按{name2}计算。{x}签证可能被拒，被拒后四年不能再走这条申请。', {name: l.country.name, gdp: l.country.gdp, gdp2: dest.gdp, name2: dest.name, x: cheaper ? tr('消费没这边高，收入通常会降，但日子可能松一点。') : tr('物价更高时，收入有机会上去，开销也跟着涨。')}), [option('try', tr('去试试这份机会'), tr('提交申请。被拒就留在原地。')), option('skip', tr('当作没听见'), tr('你留在现在的地方。'))], { offerKind: 'abroad', countryId: dest.id });
 }
}
function namedPeer(l, metThrough) {
 const seq = l.systems.friendSequence = (l.systems.friendSequence || 0) + 1;
 return { ...person(l), id: `friend-${seq}`, age: l.age, bond: 42, countryId: l.country.id, alive: true, metThrough, sharedMemory: tr('还没有共同的回忆'), lastContactAge: l.age };
}
export function peopleMilestone(l, age) {
 initSystems(l);
 const parent = [l.family.mother, l.family.father].find(alive) || null;
 const club = namedPeer(l, age >= 12 ? tr('科学小组') : tr('一起看书'));
 const team = namedPeer(l, tr('运动队'));
 const homeName = parent?.name || tr('家里');
 const title = age >= 12 ? tr('自己的课余时间') : tr('还没上学的那个下午');
 const text = age >= 12
  ? tr('课业变多了。{name}在等你做实验，{name2}在操场喊你，{homeName}也需要人搭把手。你选了谁，接下来几年就会绕着这个人发生，而且不一定顺利。', {name: club.name, name2: team.name, homeName})
  : tr('{name}想和你一起把故事听完，{name2}在外面等你，{homeName}还在屋里。今天下午跟谁过，以后就会记住谁。', {name: club.name, name2: team.name, homeName});
 pending(l, 'thread-start', title, text, [
  option('science', age >= 12 ? tr('和{name}做实验', {name: club.name}) : tr('和{name}听故事', {name: club.name}), tr('{name}会变成固定见面的人。事情可能做成，也可能中途散掉。', {name: club.name})),
  option('sport', tr('和{name}出去', {name: team.name}), tr('{name}想拉你做搭档。加练、受伤或者散伙都还没发生。', {name: team.name})),
  option('home', tr('留在{homeName}身边', {homeName}), tr('这不是独自做家务。{homeName}会记住你在不在。', {homeName})),
 ], { cast: { science: club, sport: team, home: parent ? { role: parent === l.family.father ? 'father' : 'mother', name: parent.name } : null } });
 log(l, title, text, 'choice');
}
function remember(f, l) { f.lastContactAge = l.age; f.bond = clamp(f.bond); }
function threadYear(l) {
 if (l.pending || l.dead || l.age < 6) return;
 const home = l.systems.homeThread;
 if (home && !home.ended && home.nextAge <= l.age) { offerHomeBeat(l, home); return; }
 const f = l.friends.find(f => alive(f) && f.thread && !f.thread.ended && f.thread.nextAge <= l.age);
 if (f) offerFriendBeat(l, f);
}
function offerFriendBeat(l, f) {
 const t = f.thread;
 if (f.countryId && f.countryId !== l.country.id) {
  pending(l, 'thread', tr('{name}还在原来的地方', {name: f.name}), tr('你们因为{metThrough}认识。你已经不住在同一个地方，这条线不会自动跟着你走。', {metThrough: f.metThrough}), [option('write', tr('给{name}写信', {name: f.name}), tr('可能有回音，也可能没有。')), option('letgo', tr('先各自生活'), tr('人还在，故事先停在这里。'))], { friendId: f.id, beat: 'apart' });
  return;
 }
 if (t.kind === 'sport') {
  if (t.stage <= 1) pending(l, 'thread', tr('{name}想加练', {name: f.name}), tr('你们从{since}岁起一起运动。{name}说这周还想再练一次。留下会累，也可能受伤；回去，{name}会觉得你不是真的想一起。', {since: t.since, name: f.name}), [option('stay', tr('留下来和{name}练', {name: f.name}), tr('健康和关系都会变，受伤也有可能。')), option('home', tr('先回家'), tr('关系会松一点，故事还没结束。'))], { friendId: f.id, beat: 'sport-1' });
  else if (t.stage === 2) pending(l, 'thread', tr('{name}受伤了', {name: f.name}), tr('{name}训练时扭了脚，问你能不能去看看。去要花一点钱和时间；不去，你们可能就不再约了。', {name: f.name}), [option('visit', tr('去看{name}', {name: f.name}), tr('花钱，关系会靠近。')), option('skip', tr('继续自己练'), tr('你的身体还在进步，这段搭档可能到此为止。'))], { friendId: f.id, beat: 'sport-2' });
  else if (t.stage === 3) {
   const other = namedPeer(l, tr('{name}介绍', {name: f.name}));
   pending(l, 'thread', tr('{name}要介绍一个人', {name: f.name}), tr('{name}说{name2}也常在这边。见一面可能多一个朋友，年龄够的话也许有一次周末的零工；对方也可能不想见。', {name: f.name, name2: other.name}), [option('meet', tr('去见{name}', {name: other.name}), tr('不保证认识成功，更不保证有工作。')), option('later', tr('这次不见'), tr('和原来的人保持现状，这条线先停。'))], { friendId: f.id, beat: 'sport-3', mentor: other });
  } else t.ended = true;
  return;
 }
 if (t.stage <= 1) pending(l, 'thread', tr('{name}把事情带到了你面前', {name: f.name}), tr('你们从{since}岁起因为{metThrough}见面。{name}说这次一个人做不完。一起做，可能被看见，也可能互相埋怨。', {since: t.since, metThrough: f.metThrough, name: f.name}), [option('together', tr('和{name}一起做完', {name: f.name}), tr('花几个晚上。成功或失败都会留下。')), option('alone', tr('让{name}自己收尾', {name: f.name}), tr('你腾出时间，一起做事的关系会松掉。'))], { friendId: f.id, beat: 'science-1' });
 else if (t.stage === 2) pending(l, 'thread', tr('{name}提起一个机会', {name: f.name}), tr('{name}听到一个对外的小比赛，想拉你一起报名。要交一点费用。赢了会有人记住你们，输了就只是一次尝试。', {name: f.name}), [option('enter', tr('和{name}报名', {name: f.name}), tr('费用不退。结果不确定。')), option('stop', tr('这次算了'), tr('{name}会失望，这条线可以停在这里。', {name: f.name}))], { friendId: f.id, beat: 'science-2' });
 else if (t.stage === 3) {
  const other = namedPeer(l, tr('{name}介绍', {name: f.name}));
  pending(l, 'thread', tr('{name}说可以帮你引见', {name: f.name}), tr('{name}认识{name2}。你如果开口，对方可能愿意见你，也可能推说没空。见上一面不等于拿到任何资格。', {name: f.name, name2: other.name}), [option('ask', tr('请{name}介绍', {name: f.name}), tr('可能认识一个新人，也可能白跑一趟。')), option('stay', tr('只和{name}来往', {name: f.name}), tr('不展开新的人，原来的故事先告一段落。'))], { friendId: f.id, beat: 'science-3', mentor: other });
 } else t.ended = true;
}
function offerHomeBeat(l, home) {
 const parent = home.role === 'father' ? l.family.father : l.family.mother;
 if (!alive(parent)) { home.ended = true; log(l, tr('{name}不在了', {name: home.name}), tr('你还想接着帮家里，可是那个人已经不在。这条线停在这里。'), 'family'); return; }
 home.name = parent.name;
 if (home.stage <= 1) pending(l, 'thread', tr('{name}又提起下午的事', {name: parent.name}), tr('自从{since}岁那个下午，{name}知道你会留下来。现在又问你：这阵子还帮不帮。继续会有一点零用钱，也会占掉你自己的时间。', {since: home.since, name: parent.name}), [option('keep', tr('继续帮{name}', {name: parent.name}), tr('拿到一点钱，关系更近。')), option('own', tr('把下午要回来'), tr('{name}可能理解，也可能不说话。', {name: parent.name}))], { beat: 'home-1' });
 else if (home.stage === 2) {
  const sib = (l.family.siblings || []).find(c => alive(c) && (c.age ?? 0) < 12);
  if (sib) pending(l, 'thread', tr('{name}让你看着{name2}', {name: parent.name, name2: sib.name}), tr('{name}还小。{name2}问你能不能带一会儿。这是两个有名字的人，不是一项家务数值。', {name: sib.name, name2: parent.name}), [option('watch', tr('带{name}出去', {name: sib.name}), tr('你们会多一段共同的记忆。')), option('study', tr('说你要做自己的事'), tr('{name}会记住你拒绝了。', {name: sib.name}))], { beat: 'home-2', siblingId: sib.id });
  else pending(l, 'thread', tr('{name}今天起不来', {name: parent.name}), tr('{name}说身上没劲。你留在家里，还是去过自己的下午，{name}都看在眼里。', {name: parent.name}), [option('stay', tr('留下来陪{name}', {name: parent.name}), tr('没有报酬，人会记住。')), option('go', tr('还是出去'), tr('关系会远一点。'))], { beat: 'home-2' });
 } else if (home.stage === 3) pending(l, 'thread', tr('要不要开口找{name}', {name: parent.name}), tr('你需要一笔大约{gdp}的开支。{name}想帮，但不一定帮得起。开口可能只听到“家里也紧”。', {gdp: Math.round(gdp(l) * .04), name: parent.name}), [option('ask', tr('问{name}能不能帮一点', {name: parent.name}), tr('最多帮一部分，也可能一点都没有。')), option('no', tr('不麻烦家里'), tr('这条线到这里结束。'))], { beat: 'home-3' });
 else home.ended = true;
}
function startThread(l, p, key) {
 const s = l.systems;
 const cast = p.cast || {};
 if (key === 'home') {
  const role = cast.home?.role;
  const parent = role === 'father' ? l.family.father : l.family.mother;
  if (!alive(parent)) { log(l, tr('家里没有人在'), tr('你想留下来，可是这天下午没有人应你。'), 'family'); return; }
  s.homeThread = { role, name: parent.name, stage: 1, since: l.age, nextAge: l.age + 2, ended: false };
  parent.bond = clamp((parent.bond ?? 60) + 4);
  const pocket = Math.round(gdp(l) * (l.age >= 12 ? .012 : .004));
  l.money += pocket; stats(l, { happiness: 2, social: 3 });
  log(l, tr('和{name}过了一个下午', {name: parent.name}), tr('你留下来分担手上的事。{name}把{pocket}塞到你手里。过一阵还会再找你，帮不帮得上要到时候才知道。', {name: parent.name, pocket}), 'family');
  return;
 }
 const f = cast[key === 'sport' ? 'sport' : 'science'];
 if (!f?.name) return;
 f.thread = { kind: key === 'sport' ? 'sport' : 'science', stage: 1, since: l.age, nextAge: l.age + 2, ended: false };
 f.sharedMemory = key === 'sport' ? tr('第一次一起跑到喘不上气') : (l.age >= 12 ? tr('第一天下午一起洗烧杯') : tr('一起把旧书翻到最后一页'));
 f.metThrough = key === 'sport' ? tr('运动队') : (l.age >= 12 ? tr('科学小组') : tr('一起看书'));
 l.friends.push(f); remember(f, l);
 stats(l, key === 'sport' ? { health: 4, social: 4 } : { knowledge: 4, social: 3 });
 log(l, tr('认识了{name}', {name: f.name}), key === 'sport' ? tr('{name}拉你去了外面。你们约好下次还一起。受伤、散伙或者认识新人，都还没发生。', {name: f.name}) : tr('{name}和你把这个下午过完了。你们约好继续见面。做成做砸，都要等下一次。', {name: f.name}), 'social');
}
function resolveThread(l, p, key) {
 const s = l.systems;
 const f = p.friendId ? l.friends.find(x => x.id === p.friendId) : null;
 const beat = p.beat;
 if (beat === 'apart' && f?.thread) {
  if (key === 'letgo') { f.thread.ended = true; log(l, tr('和{name}先停在这里', {name: f.name}), tr('{name}还在原来的地方。你们没有断掉这个人，只是不再推进这件事。', {name: f.name}), 'social'); return; }
  const reply = chance(l, .6);
  f.bond = clamp(f.bond + (reply ? 4 : -3)); f.thread.nextAge = l.age + 3; remember(f, l);
  log(l, reply ? tr('{name}回信了', {name: f.name}) : tr('信没有回音'), reply ? tr('{name}写了近况。人没有搬到你身边，故事只能隔着距离慢慢继续。', {name: f.name}) : tr('你把信寄给了{name}。这一次没有回音，关系淡了一点。', {name: f.name}), 'social');
  return;
 }
 if (beat === 'science-1' && f?.thread) {
  if (key === 'alone') { f.bond = clamp(f.bond - 8); f.thread.ended = true; remember(f, l); log(l, tr('{name}不再来找你', {name: f.name}), tr('你让{name}自己收尾。过了两周，{name}没有再约你。人还在，一起做事的线断了。', {name: f.name}), 'social'); return; }
  const ok = chance(l, Math.min(.8, .42 + (l.stats.knowledge || 0) * .003));
  f.bond = clamp(f.bond + (ok ? 10 : -5)); stats(l, { knowledge: ok ? 6 : 2, happiness: ok ? 3 : -2 });
  f.sharedMemory = ok ? tr('实验做成的那个晚上') : tr('实验失败后互相不说话的走廊');
  f.thread.stage = 2; f.thread.nextAge = l.age + 2; f.thread.strained = !ok; remember(f, l);
  log(l, ok ? tr('和{name}做成了', {name: f.name}) : tr('{name}和你吵了一架', {name: f.name}), ok ? tr('老师看见了你们的结果。{name}说下次还有机会，想继续拉你。', {name: f.name}) : tr('东西没有做出来。{name}埋怨你拖了时间，你也觉得委屈。人还在，后面的机会会更难。', {name: f.name}), 'social');
  return;
 }
 if (beat === 'science-2' && f?.thread) {
  if (key === 'stop') { f.bond = clamp(f.bond - 4); f.thread.ended = true; remember(f, l); log(l, tr('你拒绝了{name}', {name: f.name}), tr('{name}自己去问了报名的事，没有再拉你。这条线停了。', {name: f.name}), 'social'); return; }
  const fee = Math.round(gdp(l) * .008); spend(l, fee);
  const ok = chance(l, Math.max(.15, .36 + f.bond / 400 - (f.thread.strained ? .15 : 0)));
  f.thread.stage = 3; f.thread.nextAge = l.age + 2; remember(f, l);
  if (ok) { const prize = Math.round(gdp(l) * .02); l.money += prize; f.bond = clamp(f.bond + 8); stats(l, { knowledge: 4, happiness: 4 }); f.sharedMemory = tr('一起拿到名次的那天'); log(l, tr('和{name}一起去了', {name: f.name}), tr('报名费{fee}。你们拿到了一个小名次，带回{prize}。{name}说有人想认识你们。那还不是资格，只是下一次可以去问问。', {fee, prize, name: f.name}), 'social'); }
  else { f.bond = clamp(f.bond - 2); stats(l, { happiness: -2 }); log(l, tr('和{name}没能入选', {name: f.name}), tr('报名费{fee}已经交掉。名单上没有你们。{name}说没关系，但回家的路上话很少。', {fee, name: f.name}), 'social'); }
  return;
 }
 if (beat === 'science-3' && f?.thread) {
  f.thread.ended = true; remember(f, l);
  if (key !== 'ask') { f.bond = clamp(f.bond + 2); log(l, tr('和{name}的故事先停在这里', {name: f.name}), tr('你没有去见新的人。{name}还是你认识的那一个。', {name: f.name}), 'social'); return; }
  const mentor = p.mentor;
  const ok = chance(l, Math.min(.75, .3 + f.bond / 200));
  if (!ok || !mentor) { stats(l, { happiness: -1 }); log(l, tr('{name}没能促成', {name: f.name}), mentor ? tr('{name}说最近没空。你和{name2}白等了一个下午，谁也没有因此得到新的路。', {name: mentor.name, name2: f.name}) : tr('{name}一时找不到可以引见的人。', {name: f.name}), 'social'); return; }
  mentor.bond = 36; mentor.sharedMemory = tr('{name}介绍你们认识的那个下午', {name: f.name}); l.friends.push(mentor); remember(mentor, l);
  stats(l, { knowledge: 3, social: 4 }); log(l, tr('经{name}认识了{name2}', {name: f.name, name2: mentor.name}), tr('{name}跟你们坐了一会儿，留下一个联系方式。没有承诺录取、工作或任何资格，只是多了一个以后还能再联系的人。', {name: mentor.name}), 'social');
  return;
 }
 if (beat === 'sport-1' && f?.thread) {
  if (key === 'home') { f.bond = clamp(f.bond - 5); f.thread.stage = 2; f.thread.nextAge = l.age + 2; remember(f, l); log(l, tr('你先回了家'), tr('{name}在操场上又练了一会儿。下次见面，话会少一点。', {name: f.name}), 'social'); return; }
  const hurt = chance(l, .28);
  if (hurt) { stats(l, { health: -6, social: 2 }); f.bond = clamp(f.bond + 6); f.sharedMemory = tr('你受伤时来看你的那个傍晚'); log(l, tr('加练时你受伤了'), tr('{name}把你送到校医那里。健康掉了一截，{name}没有丢下你。', {name: f.name}), 'social'); }
  else { stats(l, { health: 5, social: 3 }); f.bond = clamp(f.bond + 4); log(l, tr('和{name}加练完了', {name: f.name}), tr('没有受伤。你们约好还一起练，也说好不要每次都硬撑。'), 'social'); }
  f.thread.stage = 2; f.thread.nextAge = l.age + 2; remember(f, l);
  return;
 }
 if (beat === 'sport-2' && f?.thread) {
  if (key === 'skip') { f.bond = clamp(f.bond - 8); stats(l, { health: 2 }); f.thread.ended = chance(l, .55); if (!f.thread.ended) f.thread.nextAge = l.age + 3; remember(f, l); log(l, f.thread.ended ? tr('{name}不再约你', {name: f.name}) : tr('{name}还是来了', {name: f.name}), f.thread.ended ? tr('你没有去看{name}。后来的训练名单里没有你。', {name: f.name}) : tr('{name}养好了脚，又来找你，但没有以前热络。', {name: f.name}), 'social'); return; }
  const bill = Math.round(gdp(l) * .01); spend(l, bill);
  f.bond = clamp(f.bond + 10); f.sharedMemory = tr('去看{name}的那一次', {name: f.name}); f.thread.stage = 3; f.thread.nextAge = l.age + 2; remember(f, l); stats(l, { social: 3, happiness: 2 });
  log(l, tr('你去看了{name}', {name: f.name}), tr('花了{bill}。{name}说等好了，要介绍一个也常在这边的人给你。那个人还不一定想见你。', {bill, name: f.name}), 'social');
  return;
 }
 if (beat === 'sport-3' && f?.thread) {
  f.thread.ended = true; remember(f, l);
  if (key !== 'meet') { log(l, tr('你没有去见新的人'), tr('{name}点点头，没有再约。原来的搭档还在。', {name: f.name}), 'social'); return; }
  const mentor = p.mentor;
  const ok = chance(l, Math.min(.7, .28 + f.bond / 220));
  if (!ok || !mentor) { log(l, tr('{name}没有出现', {name: p.mentor?.name || tr('那个人')}), tr('{name}等了很久，最后说大概是记错了时间。你们没有新的朋友，也没有新的活。', {name: f.name}), 'social'); return; }
  mentor.bond = 34; mentor.sharedMemory = tr('{name}拉你们见面', {name: f.name}); l.friends.push(mentor); remember(mentor, l); stats(l, { social: 4 });
  if (l.age >= 15 && chance(l, .5)) { const pay = Math.round(gdp(l) * .015); l.money += pay; log(l, tr('经{name}认识了{name2}', {name: f.name, name2: mentor.name}), tr('{name}让你周末去店里帮了一次，给了{pay}。这不是一份稳定工作，下周还有没有班，要再问。', {name: mentor.name, pay}), 'social'); }
  else log(l, tr('经{name}认识了{name2}', {name: f.name, name2: mentor.name}), tr('{name}和你们说了会儿话。没有给你位置，也没有承诺，只是多认识了一个人。', {name: mentor.name}), 'social');
  return;
 }
 const home = s.homeThread;
 if (!home) return;
 const parent = home.role === 'father' ? l.family.father : l.family.mother;
 if (beat === 'home-1') {
  if (!alive(parent)) { home.ended = true; return; }
  if (key === 'own') {
   const ok = chance(l, .55);
   parent.bond = clamp((parent.bond ?? 60) + (ok ? 1 : -8));
   home.ended = true; stats(l, { happiness: ok ? 2 : -2 });
   log(l, ok ? tr('{name}说去吧', {name: parent.name}) : tr('{name}没再说话', {name: parent.name}), ok ? tr('{name}让你去过自己的下午，晚饭仍给你留了位置。', {name: parent.name}) : tr('你把下午要了回来。{name}点了点头，那顿饭吃得很静。', {name: parent.name}), 'family');
   return;
  }
  const pocket = Math.round(gdp(l) * .012); l.money += pocket; parent.bond = clamp((parent.bond ?? 60) + 6); stats(l, { social: 2 });
  home.stage = 2; home.nextAge = l.age + 2;
  log(l, tr('又帮了{name}一阵', {name: parent.name}), tr('{name}给了你{pocket}。说好过些日子还有事找你，不一定是钱。', {name: parent.name, pocket}), 'family');
  return;
 }
 if (beat === 'home-2') {
  if (!alive(parent)) { home.ended = true; return; }
  const sib = (l.family.siblings || []).find(c => c.id === p.siblingId);
  home.stage = 3; home.nextAge = l.age + 2;
  if (sib && key === 'watch') { sib.bond = clamp((sib.bond ?? 50) + 8); parent.bond = clamp((parent.bond ?? 60) + 3); stats(l, { social: 3, happiness: 2 }); log(l, tr('带{name}出去了一趟', {name: sib.name}), tr('{name}在家休息。{name2}一路叫你的名字。你们有了一件以后能一起说的事。', {name: parent.name, name2: sib.name}), 'family'); return; }
  if (sib) { sib.bond = clamp((sib.bond ?? 50) - 4); log(l, tr('你没有带{name}', {name: sib.name}), tr('{name}听到了。{name2}自己看着孩子，没责备你，也没像以前那样把事情交给你。', {name: sib.name, name2: parent.name}), 'family'); return; }
  if (key === 'stay') { parent.bond = clamp((parent.bond ?? 60) + 6); stats(l, { happiness: 1 }); log(l, tr('你陪着{name}', {name: parent.name}), tr('没什么大事。{name}后来能起床了，记得是你留了下来。', {name: parent.name}), 'family'); return; }
  parent.bond = clamp((parent.bond ?? 60) - 4); log(l, tr('你还是出去了'), tr('{name}说自己可以。你走的时候，屋里没有再叫你。', {name: parent.name}), 'family');
  return;
 }
 if (beat === 'home-3') {
  home.ended = true;
  if (key !== 'ask' || !alive(parent)) { log(l, tr('你没有开口'), alive(parent) ? tr('你决定不麻烦{name}。缺的那笔钱还得自己想办法。', {name: parent.name}) : tr('你想问的人已经不在了。'), 'family'); return; }
  const need = Math.round(gdp(l) * .04);
  const can = (l.family?.wealth ?? .5) > .3 && chance(l, .5);
  if (!can) { stats(l, { happiness: -1 }); log(l, tr('{name}帮不上', {name: parent.name}), tr('{name}听完，沉默了一会儿，说家里也紧，{need}凑不出来。你没有拿到钱。', {name: parent.name, need}), 'family'); return; }
  const gift = Math.round(need * .45); l.money += gift; parent.bond = clamp((parent.bond ?? 60) + 2);
  log(l, tr('{name}帮了一部分', {name: parent.name}), tr('{name}拿出{gift}，还差的要你自己补。这不是一笔永远的资助。', {name: parent.name, gift}), 'family');
 }
}

export function getHousehold(l) {
 initSystems(l); const r = l.systems.residence;
 const residents = [{ id: 'self', name: l.name, role: '自己', age: l.age, sex: l.sex, countryId: r.countryId }];
 const add = (p, id, role, fallbackAge) => { if (alive(p)) residents.push({ id, name: p.name, role, age: p.age ?? fallbackAge, sex: p.sex || (id === 'mother' ? '女' : id === 'father' ? '男' : '未知'), countryId: r.countryId }); };
 if (r.with === 'parents') { add(l.family.mother, 'mother', '母亲', 55); add(l.family.father, 'father', '父亲', 57); for (const sib of l.family?.siblings || []) if (alive(sib) && (sib.age ?? 0) < 18) add(sib, sib.id || sib.name, sib.sex === '男' ? '弟弟' : '妹妹', 0); }
 if (['partner', 'family'].includes(r.with) && alive(l.partner) && (l.partner.countryId || r.familyCountryId) === r.countryId) add(l.partner, 'partner', '伴侣', l.age);
 if (r.with === 'family') for (const c of l.children) if (c.livesWithPlayer !== false && (c.age < 18 || c.livesWithPlayer === true) && (c.countryId || r.familyCountryId) === r.countryId) add(c, c.id, '孩子', 0);
 return residents;
}
export function getSceneState(l) {
 initSystems(l); const s = l.systems, r = s.residence;
 const current = l.sceneAction?.age === l.age ? l.sceneAction : null;
 const mapped = { hospital: 'hospital', business: 'business', moving: 'moving', travel: 'travel' };
 const kind = mapped[current?.type] || (r.abroadSince != null ? 'abroad' : 'home');
 return { kind, location: kind === 'hospital' ? tr('{city}医院', {city: l.country.city}) : kind === 'business' ? s.business?.name || tr('工作场所') : `${l.country.name} · ${r.city}`, countryId: r.countryId, residents: getHousehold(l), pet: s.pet?.alive ? copy(s.pet) : null, action: current ? copy(current) : null, caption: current?.text || (r.with === 'alone' ? tr('{name}独自生活', {name: l.name}) : tr('家人共同生活的日常')), abroad: r.abroadSince != null, year: yearOf(l), world: copy(s.world) };
}
