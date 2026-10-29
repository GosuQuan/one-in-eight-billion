// Original, serializable life systems. Monetary figures are illustrative PPP units.
import { COUNTRIES } from './engine.js';

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
function person(l) { const sex = roll(l) < .5 ? '男' : '女'; const names = l.country.names; return { name: pick(l, names.surnames) + pick(l, names[sex === '男' ? 'male' : 'female']), sex }; }

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
 s.pet ??= null; s.business ??= null; s.conditions ||= []; s.care ||= {};
 s.world ??= { year: null, title: '等待年度新闻', kind: 'quiet', detail: '世界新闻将随年份更新。' };
 s.actionSequence ??= 0; s.lastYear ??= null; s.lastRelationshipAge ??= null; s.lastMigrationReview ??= r.abroadSince;
 for (let i = 0; i < l.children.length; i++) { const c = l.children[i]; c.id ??= `child-${c.birthYear ?? yearOf(l) - (c.age || 0)}-${i}`; c.bond ??= 70; c.development ??= 50; }
 return l;
}
function grandparents(l) { const r = l.systems.residence; return r.countryId === r.homeCountry ? [l.family.mother, l.family.father].filter(alive) : []; }
function childCare(l, child) {
 // Engine-created newborns also belong in the player's current household.
 if (child.age === 0 && child.birthYear === yearOf(l)) { child.countryId = l.systems.residence.countryId; l.systems.residence.with = 'family'; }
 const options = [option('self', '自己减少工作照顾', '每年减少收入并投入陪伴。')];
 if (alive(l.partner) && l.systems.residence.countryId === l.systems.residence.familyCountryId) options.push(option('partner', `由${l.partner.name}减少工作照顾`, '伴侣收入减少，保持共同育儿。'));
 options.push(option('nursery', '付费托育', '每年支付托育费用，保留工作时间。'));
 if (grandparents(l).length) options.push(option('grandparents', `请${grandparents(l).map(p => p.name).join('、')}帮忙`, '只有仍在世且在本国的祖父母可以帮忙。'));
 pending(l, 'child-care', `${child.name}由谁照顾`, '照护安排会持续到孩子上学；每年都有时间和费用。', options, { childId: child.id });
}
function medicalChoice(l, condition) {
 pending(l, 'medical', `${condition.name}的治疗`, `病情程度${Math.round(condition.severity)}。${l.insurance ? '医疗保险承担治疗费用的70%。' : '目前没有医疗保险，治疗自费。'}`, [option('standard', '规范治疗并复查', '效果较好，持续复诊和用药。'), option('basic', '选择廉价基础治疗', '费用较低，病情控制较慢。'), option('delay', '先拖一拖', '暂不付治疗费，病情可能加重。')], { conditionId: condition.id });
}
function migrationParty(l, id) {
 const c = country(id);
 if (!c || id === l.country.id) return result(false, '请选择不同的有效国家。');
 pending(l, 'migration-party', `迁居${c.name}`, '这次谁和你一起走？独自迁居后，家人会留在原居国。', [option('solo', '独自出国', '家人留在原居国，之后可以团聚或回国。'), option('family', '携家人同行', '伴侣与未成年孩子一起迁居，搬迁费用更高。'), option('cancel', '暂时不搬')], { countryId: id });
 return result(true, '请选择移民同行安排。');
}
function move(l, id, withFamily) {
 const r = l.systems.residence, from = l.country.name, destination = country(id), wasWith = r.with;
 if (r.abroadSince == null) { r.homeCountry = l.country.id; r.familyCountryId = l.country.id; r.familyWith = wasWith; r.abroadSince = l.age; }
 const count = withFamily ? 1 + (alive(l.partner) ? 1 : 0) + l.children.filter(c => alive(c) && c.age < 18).length : 1;
 spend(l, gdp(l) * .16 * count); l.country = copy(destination);
 r.countryId = destination.id; r.city = destination.city;
 r.with = withFamily && (alive(l.partner) || l.children.some(c => alive(c) && c.age < 18)) ? 'family' : 'alone';
 if (withFamily) { r.familyCountryId = destination.id; for (const c of l.children) if (alive(c) && c.age < 18) c.countryId = destination.id; }
 l.systems.lastMigrationReview = l.age; stats(l, { social: -5, knowledge: 4 });
 log(l, '在另一国安家', `${l.name}从${from}迁居${destination.name}${destination.city}，${withFamily ? '家人同行' : '独自出国，家人仍在' + (country(r.familyCountryId)?.name || '原居国')}。`, 'migration');
 action(l, 'moving', '搬进新的住所', from, destination.name);
}
function returnHome(l) {
 const r = l.systems.residence, home = country(r.homeCountry); if (!home) return result(false, '找不到原居国。');
 if (r.countryId === home.id && r.abroadSince == null) return result(false, '你已经在原居国。');
 const from = l.country.name; spend(l, gdp(l) * .1); l.country = copy(home);
 r.countryId = home.id; r.city = home.city; r.abroadSince = null; r.familyCountryId = home.id;
 for (const c of l.children) if (alive(c) && c.age < 18) c.countryId = home.id;
 r.with = alive(l.partner) || l.children.some(c => alive(c) && c.age < 18) ? 'family' : r.familyWith === 'parents' && grandparents(l).length ? 'parents' : 'alone';
 l.systems.lastMigrationReview = null; stats(l, { social: 7, happiness: 5 }); log(l, '回到原居国', `${l.name}从${from}回到${home.name}，重新安排与亲人的生活。`, 'migration'); action(l, 'moving', '回国安家', from, home.name); return result(true, '已经回到原居国。');
}
function reunite(l) {
 const r = l.systems.residence;
 if (r.abroadSince == null) return result(false, '目前没有海外团聚安排。');
 if (!alive(l.partner) && !l.children.some(c => alive(c) && c.age < 18)) return result(false, '没有可以随行的伴侣或未成年孩子。');
 spend(l, gdp(l) * .12); r.familyCountryId = r.countryId; r.with = 'family';
 for (const c of l.children) if (alive(c) && c.age < 18) c.countryId = r.countryId;
 stats(l, { happiness: 8, social: 5 });
 log(l, '一家人终于团聚', `家人来到${l.country.name}，与${l.name}共同生活。`, 'migration'); action(l, 'moving', '家人抵达新家'); return result(true, '家人已团聚同住。');
}

export function systemAction(l, name, payload = {}) {
 initSystems(l);
 if (l.dead) return result(false, '这一生已经结束。');
 if (l.pending) return result(false, '请先完成眼前的选择。');
 const s = l.systems, r = s.residence;
 if (['plan-child', 'start-business', 'move-abroad', 'housing'].includes(name) && l.age < 18) return result(false, '成年后才能安排这件事。');
 switch (name) {
 case 'plan-child':
  if (l.age > 50) return result(false, '当前年龄不再开放生育计划。');
  if (l.children.filter(alive).filter(c => c.age < 6).length >= 2) return result(false, '幼儿还小，先照顾好眼前的孩子。');
  pending(l, 'child-plan', '是否迎接一个孩子', `${alive(l.partner) ? `与${l.partner.name}共同` : '你准备独自'}承担生育和育儿的责任。`, [option('birth', '迎接孩子', '出生后立刻决定由谁照顾。'), option('wait', '暂缓计划', '把时间留给现有生活。')]); return result(true, '请选择生育计划。');
 case 'child-care': { const child = l.children.find(c => alive(c) && c.age < 6 && (!s.care[c.id] || payload.childId === c.id)); if (!child) return result(false, '没有需要重新安排照护的幼儿。'); childCare(l, child); return result(true, '请选择照护安排。'); }
 case 'adopt-dog': case 'adopt-cat':
  if (s.pet?.alive) return result(false, `请先照顾好${s.pet.name}。`);
  if (l.age < 8) return result(false, '长大一点再承担照顾宠物的责任。');
  s.pet = { name: String(payload.name || pick(l, ['团团', '豆包', '芝麻', '小麦', '栗子'])).slice(0, 24), kind: name === 'adopt-dog' ? 'dog' : 'cat', age: 0, health: 85, alive: true };
  spend(l, gdp(l) * .012); stats(l, { happiness: 5 }); log(l, '家里来了新伙伴', `你领养了${s.pet.kind === 'dog' ? '小狗' : '小猫'}${s.pet.name}，开始承担它的日常照顾。`, 'pet'); action(l, 'pet', `陪${s.pet.name}玩耍`); return result(true, `${s.pet.name}加入了家庭。`);
 case 'date': case 'family-time': {
  if (name === 'date' && !alive(l.partner)) return result(false, '目前没有伴侣。');
  const together = r.countryId === r.familyCountryId; if (alive(l.partner)) l.partner.bond = clamp(l.partner.bond + (together ? 8 : 4));
  for (const child of l.children.filter(alive)) child.bond = clamp(child.bond + 4);
  spend(l, gdp(l) * .004); stats(l, { happiness: 4, social: 3 }); log(l, together ? '留给彼此的时间' : '隔着时区的联系', alive(l.partner) ? `你与${l.partner.name}${together ? '共进晚餐，认真交谈' : '视频通话，分享日常'}。` : `你与亲人${together ? '相聚' : '通话'}，问起最近的生活。`); action(l, 'family', together ? '陪伴家人' : '和远方家人通话'); return result(true, '关系因为陪伴更亲近了一点。'); }
 case 'start-business':
  if (s.business) return result(false, '已经有一家企业，可进入经营菜单。');
  pending(l, 'business-start', '选择创业方向', '先投入启动资金，再承担每年的经营风险；投入不保证回本。', [option('shop', '社区小店', `投入约${Math.round(gdp(l) * .18)}，服务附近居民。`), option('service', '技术服务工作室', `投入约${Math.round(gdp(l) * .25)}，承接服务项目。`), option('food', '餐饮小馆', `投入约${Math.round(gdp(l) * .3)}，经营日常餐饮。`), option('cancel', '暂缓创业')], { businessName: String(payload.name || `${l.name}的小事业`).slice(0, 30) }); return result(true, '请选择行业。');
 case 'business-manage':
  if (!s.business) return result(false, '目前没有经营中的企业。');
  pending(l, 'business-manage', s.business.name, `行业：${s.business.sector}；员工${s.business.staff}人；上年净利润${s.business.income}。`, [option('hire', '招聘一名员工', '增加工资成本和服务能力。'), option('market', '投入营销', '花费预算争取客户。'), option('expand', '扩大经营', '追加资本，增加收益和亏损的幅度。'), option('close', '关闭并清算', '收回部分资本，结束年度经营风险。')]); return result(true, '请选择经营安排。');
 case 'checkup': {
  medicalBill(l, gdp(l) * .008);
  let c = s.conditions.find(c => !c.resolved);
  if (!c) { c = { id: `condition-${s.conditions.length}`, name: l.age >= 45 ? '高血压' : '慢性胃炎', severity: 20 + Math.floor(roll(l) * 25), treatment: 'untreated', diagnosedAge: l.age, resolved: false }; s.conditions.push(c); }
  log(l, '检查给出明确的诊断', `检查发现${c.name}，需要选择后续治疗。`, 'health'); action(l, 'hospital', '到医院检查'); medicalChoice(l, c); return result(true, '请选择治疗方案。'); }
 case 'move-abroad':
  if (payload.countryId) return migrationParty(l, payload.countryId);
  pending(l, 'migration-country', '去哪个国家生活', '这是迁居计划，还需要决定家人是否同行。', COUNTRIES.filter(c => c.id !== l.country.id).map(c => option(c.id, `${c.flag} ${c.name} · ${c.city}`, '新的语言、物价和机会都在等你。'))); return result(true, '请选择迁居国家。');
 case 'return-home': return returnHome(l);
 case 'reunite-family': return reunite(l);
 case 'visit-home':
  if (r.abroadSince == null) return result(false, '你目前在原居国生活。');
  spend(l, gdp(l) * .035); stats(l, { happiness: 5, social: 4 }); if (alive(l.partner)) l.partner.bond = clamp(l.partner.bond + 5);
  log(l, '回乡探亲', `你短暂回到${country(r.homeCountry)?.name || '原居国'}探望家人，随后返回${l.country.name}。`, 'travel'); action(l, 'travel', '回乡探亲后返回住处', l.country.name, country(r.homeCountry)?.name); return result(true, '完成了一次探亲旅程。');
 case 'housing':
  if (payload.with) return setHousing(l, payload.with);
  pending(l, 'housing', '和谁一起住', '同住安排决定家中的实际居民。家人在其他国家时，需要先团聚。', [option('alone', '自己住'), option('parents', '与在世父母同住'), option('family', '与伴侣和孩子同住')]); return result(true, '请选择同住安排。');
 default: return result(false, '未知的生活系统动作。');
 }
}
function setHousing(l, mode) {
 const r = l.systems.residence;
 if (!['alone', 'parents', 'partner', 'family'].includes(mode)) return result(false, '未知同住方式。');
 if (mode === 'parents' && !grandparents(l).length) return result(false, '目前无法与在世父母同住。');
 if (['family', 'partner'].includes(mode) && (!alive(l.partner) && !l.children.some(c => alive(c) && c.age < 18))) return result(false, '目前没有可同住的伴侣或孩子。');
 if (['family', 'partner'].includes(mode) && r.countryId !== r.familyCountryId) return result(false, '家人仍在原居国，请先办理团聚。');
 r.with = mode; log(l, '重新安排住处', `${l.name}选择${({ alone: '独自生活', parents: '与父母同住', partner: '与伴侣同住', family: '与伴侣和孩子同住' })[mode]}。`); action(l, 'moving', '重新安排同住'); return result(true, '同住安排已更新。');
}

export function systemChoice(l, p, index) {
 if (p?.kind !== 'system') return false;
 initSystems(l);
 const o = p.options?.[index]; if (!o) return false;
 const s = l.systems, key = o.key; l.pending = null;
 switch (p.system) {
 case 'child-plan':
  if (key === 'birth') {
   const c = { ...person(l), id: `child-${yearOf(l)}-${l.children.length}`, birthYear: yearOf(l), age: 0, alive: true, bond: 75, development: 50 };
   l.children.push(c); spend(l, gdp(l) * .08); stats(l, { happiness: 8, health: -3 });
   s.residence.with = 'family';
   c.countryId = s.residence.countryId;
   log(l, '孩子出生了', `${c.name}来到世上。${l.name}${alive(l.partner) ? `与${l.partner.name}` : '将独自'}承担抚养责任。`); action(l, 'family', `迎接${c.name}`); childCare(l, c);
  } else log(l, '暂缓生育', '你决定暂时把精力留给现有的生活。');
  break;
 case 'child-care': {
  const c = l.children.find(c => c.id === p.childId); if (!c) break;
  if (key === 'grandparents' && !grandparents(l).length) { childCare(l, c); break; }
  if (key === 'partner' && (!alive(l.partner) || s.residence.countryId !== s.residence.familyCountryId)) { childCare(l, c); break; }
  s.care[c.id] = { mode: key, since: l.age, annualCost: 0, incomeLoss: 0 };
  c.caregiver = key; log(l, `${c.name}的照护安排`, `选择${o.label}；此安排将按年计算费用、收入损失与成长。`); break;
 }
 case 'relationship':
  if (!alive(l.partner)) break;
  if (key === 'separate') { const name = l.partner.name; l.formerPartners ||= []; l.formerPartners.push({ ...l.partner, separatedAge: l.age }); l.partner = null; s.residence.with = l.children.some(c => alive(c) && c.age < 18) ? 'family' : 'alone'; stats(l, { happiness: -5 }); log(l, '各自生活', `你与${name}分开，重新商量孩子的照护和住处。`); }
  else { if (key === 'counsel') spend(l, gdp(l) * .025); l.partner.bond = clamp(l.partner.bond + (key === 'counsel' ? 25 : 12)); log(l, '把话说开', `你与${l.partner.name}${key === 'counsel' ? '接受伴侣咨询' : '认真沟通'}，关系有所缓和。`); } break;
 case 'pet-care':
  if (!s.pet?.alive) break;
  if (key === 'vet') { spend(l, gdp(l) * .025); s.pet.health = clamp(s.pet.health + 35); }
  else if (key === 'basic') { spend(l, gdp(l) * .006); s.pet.health = clamp(s.pet.health + 12); }
  else { s.pet.health = clamp(s.pet.health - 15); stats(l, { happiness: -3 }); }
  log(l, `${s.pet.name}的照顾`, `${o.label}，${s.pet.name}的健康为${Math.round(s.pet.health)}。`, 'pet'); break;
 case 'business-start':
  if (key !== 'cancel') { const factor = { shop: .18, service: .25, food: .3 }[key]; if (!factor) break; const capital = Math.round(gdp(l) * factor); spend(l, capital); s.business = { name: p.businessName, sector: ({ shop: '零售', service: '技术服务', food: '餐饮' })[key], capital, income: 0, level: 1, staff: 0, marketing: 0, foundedAge: l.age }; log(l, '自己的事业开张', `${p.businessName}投入${capital}启动资金，进入${s.business.sector}行业。`, 'business'); action(l, 'business', '为自己的事业开张'); } break;
 case 'business-manage': {
  const b = s.business; if (!b) break;
  if (key === 'close') { const recovered = Math.round(b.capital * .4); l.money += recovered; log(l, '关上店门', `${b.name}结束经营，清算收回${recovered}。`, 'business'); s.business = null; }
  else { const cost = gdp(l) * (key === 'expand' ? .18 : key === 'hire' ? .035 : .025); spend(l, cost); if (key === 'hire') b.staff++; if (key === 'expand') { b.capital += Math.round(cost); b.level++; } if (key === 'market') b.marketing += .15; log(l, '经营的新安排', `${b.name}：${o.label}，投入${Math.round(cost)}。`, 'business'); action(l, 'business', o.label); } break;
 }
 case 'medical': {
  const c = s.conditions.find(c => c.id === p.conditionId); if (!c) break;
  c.treatment = key; const billed = key === 'delay' ? 0 : medicalBill(l, gdp(l) * (key === 'standard' ? .07 : .018));
  c.severity = Math.max(0, c.severity + (key === 'standard' ? -18 : key === 'basic' ? -5 : 8)); stats(l, { health: key === 'standard' ? 7 : key === 'basic' ? 2 : -4 });
  c.resolved = c.severity <= 0; c.lastReviewAge = l.age;
  log(l, `${c.name}：${o.label}`, `实际支付${billed}${l.insurance && billed ? '（保险承担70%）' : ''}。${key === 'delay' ? '拖延使病情加重，后续仍需面对。' : '此后每年继续用药、观察与复查。'}`, 'health'); action(l, 'hospital', o.label); break;
 }
 case 'migration-country': migrationParty(l, key); break;
 case 'migration-party': if (key !== 'cancel') move(l, p.countryId, key === 'family'); break;
 case 'migration-review':
  s.lastMigrationReview = l.age;
  if (key === 'home') returnHome(l); else if (key === 'reunite') reunite(l); else { stats(l, { knowledge: 2 }); log(l, '继续在海外生活', `你决定继续住在${l.country.name}，与亲人保持联系。`, 'migration'); } break;
 case 'housing': { const outcome = setHousing(l, key); if (!outcome.ok) log(l, '暂未改变住处', outcome.message); break; }
 case 'pet-crisis': {
  const pet = s.pet; if (!pet?.alive) break;
  if (key === 'surgery') { const bill = Math.round(gdp(l) * .12); spend(l, bill); const ok = roll(l) < .55; if (ok) pet.health = clamp(pet.health + 30); else { pet.alive = false; stats(l, { happiness: -6 }); } log(l, `${pet.name}的手术`, `${ok ? `手术很成功，${pet.name}又在阳台上晒了整整一个下午的太阳。` : `手术没能留住${pet.name}。医生说，你做了能做的一切。`}`, 'pet'); }
  else if (key === 'comfort') { const bill = Math.round(gdp(l) * .03); spend(l, bill); pet.health = clamp(pet.health + 6); log(l, `${pet.name}的保守治疗`, `止痛和护理让${pet.name}舒服了一些。你把TA的窝搬到了卧室门口。`, 'pet'); }
  else { pet.alive = false; stats(l, { happiness: -4 }); log(l, '最后的告别', `在兽医的建议下，你陪${pet.name}走完了最后一段。它走的时候没有痛苦，头朝着家门的方向。`, 'pet'); }
  break; }
 case 'hometown-plan': {
  const res = s.residence;
  if (key === 'invite') { const cost = Math.round(gdp(l) * .1); spend(l, cost); res.familyCountryId = res.countryId; res.with = 'parents'; res.familyWith = 'parents'; action(l, 'moving', '父母搬来同住'); log(l, '把父母接到了身边', `${[l.family.mother, l.family.father].filter(alive).map(pa => pa.name).join('、')}收拾了老屋，把行李搬来和${l.name}同住。安置与适应花了${cost}。`, 'family'); }
  else if (key === 'visit') { const cost = Math.round(gdp(l) * .05); spend(l, cost); stats(l, { happiness: 4, social: 2 }); log(l, '回家的次数多了', `今年你回老家${1 + Math.floor(roll(l) * 3)}次。${[l.family.mother, l.family.father].filter(alive).map(pa => pa.name).join('、')}的气色好了不少。`, 'family'); }
  else log(l, '老家的安排', '你把这件事记在心里，想着以后再慢慢安排。');
  break; }
 case 'world-crisis':
  if (key === 'migrate') { systemAction(l, 'move-abroad'); break; }
  if (key === 'shelter') { spend(l, gdp(l) * .035); stats(l, { health: 2, happiness: -1 }); action(l, 'moving', '暂时前往安全住所'); }
  else { spend(l, gdp(l) * .015); stats(l, { health: -2, happiness: -2 }); }
  log(l, '危机中的选择', `面对年度情境，你选择了${o.label}。`, 'world'); break;
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
 const focusName = ({ study: '学习', work: '工作', health: '健康', family: '家人', joy: '生活体验' })[l.focus] || '生活';
 const rich = l.age >= 18 && l.money > gdp(l) * 8;
 const poor = l.age >= 18 && (l.money < gdp(l) * .5 || (l.debt || 0) > gdp(l) * 1.5);
 const sick = l.age >= 16 && l.stats.health < 40;
 const band = l.age < 25 ? 'youth' : l.age < 45 ? 'family' : l.age < 65 ? 'mid' : 'late';
 const pool = [];
 if (sick) pool.push(
  {w:1.2, run: () => { const paid = Math.round(medicalBill(l, gdp(l) * .05)); stats(l, { health: 4, knowledge: 1 }); log(l, '身体的警讯', `${year}年你${l.age}岁，健康只剩${Math.round(l.stats.health)}。${l.focus === 'work' ? '连轴转的工作把检查一拖再拖，' : ''}体检单上几个向上的箭头让你不能再拖。你花了${paid}${l.insurance ? '（保险承担70%）' : ''}做了全面检查，并把晚饭后的散步捡了起来。`, 'health'); return {effects:{}}; }},
  {w:.8, run: () => { stats(l, { health: 2, happiness: -1 }); log(l, '不得不慢下来', `${year}年你${l.age}岁，身体状况不允许再硬撑。你推掉了两个饭局，把闹钟拨早半小时睡觉。收入没变，但你也清楚，再透支就要住院了。`, 'health'); return {effects:{}}; }}
 );
 if (rich) pool.push(
  {w:.6, run: () => { const rel = person(l); const loan = Math.round(gdp(l) * .12); const before = Math.round(l.money); spend(l, loan); stats(l, { social: 1 }); log(l, `${rel.name}来借钱`, `${year}年你${l.age}岁，存款约${before}，在亲戚里算过得宽裕。${rel.name}${roll(l) < .5 ? '带着水果上门' : '在电话里吞吞吐吐'}，说孩子上学想借${loan}。你数了数存折把钱转了过去，也提醒自己下次要立个字据。`, 'family'); return {effects:{}}; }},
  {w:.5, run: () => { const amt = Math.round(gdp(l) * .05); spend(l, amt); stats(l, { knowledge: 3, happiness: -2 }); log(l, '投资找上门', `${year}年你${l.age}岁，手头的闲钱让老同学想起了你。对方拍着胸脯说一个“稳赚”的项目，你投了${amt}试试。三个月后群里安静了，那个头像再也没亮过。`, 'event'); return {effects:{}}; }}
 );
 if (poor) pool.push(
  {w:.7, run: () => { stats(l, { happiness: -1, health: 1 }); log(l, '精打细算的一个月', `${year}年你${l.age}岁，现金只剩${Math.round(l.money)}${l.debt ? `，还背着${Math.round(l.debt)}的债` : ''}。你把外卖换成自己做饭，购物车清了又清，一个月硬省下约${Math.round(gdp(l) * .03)}。日子紧，但账本终于不再往下掉。`, 'event'); return {effects:{}}; }},
  ...(l.age < 68 && !l.retired ? [{w:.6, run: () => { const earn = Math.round(gdp(l) * .06); l.money += earn; stats(l, { health: -2 }); log(l, '周末的兼职', `${year}年你${l.age}岁，收入${Math.round(l.income)}撑不住开销。你接了两份周末零工，多挣了${earn}。夜里腰有点酸，但卡里的数字让你踏实了一点。`, 'work'); return {effects:{}}; }}] : []),
  ...(!l.house ? [{w:.6, run: () => { const rent = Math.round(gdp(l) * .06); spend(l, rent); stats(l, { happiness: -2 }); log(l, '房东的消息', `${year}年你${l.age}岁，房租又到日子了。房东说附近都涨了，你央求宽限到月底，最后还是转了${rent}过去。关掉转账页面，你把求职软件的提醒重新打开了。`, 'event'); return {effects:{}}; }}] : [])
 );
 if (alive(l.partner)) {
  const p = l.partner;
  pool.push(
   {w:.8, run: () => { const bill = Math.round(gdp(l) * .04); spend(l, bill); stats(l, { happiness: -1 }); log(l, `${p.name}打碎了你的相机`, `${year}年你${l.age}岁。${p.name}大扫除时碰倒了书架，你用了两年的相机摔在地板上，镜头裂了。维修要${bill}，你们在客厅里沉默了很久，最后笑着说：“就当旧的不去，新的不来。”`, 'family'); return {effects:{}}; }},
   {w:.6, run: () => { const bill = Math.round(gdp(l) * .05); spend(l, bill); stats(l, { happiness: 1 }); log(l, `${p.name}驾驶的车被追尾`, `${year}年，你${l.age}岁，${p.name}照常开车上下班。雨天的路口TA的车被人追尾，人没事，但保险之外还要自付${bill}的维修费。${p.name}反复问你是不是很生气，你只说“人平安就好”。`, 'family'); return {effects:{}}; }},
   {w:.5, run: () => { const gift = Math.round(gdp(l) * .015); spend(l, gift); stats(l, { happiness: 5, social: 2 }); log(l, `${p.name}的生日`, `${year}年你${l.age}岁。你偷偷订了${p.name}念叨很久的那家餐厅，花了${gift}。餐后散步回家，${p.name}说这是这几年最放松的一晚。`, 'warm'); return {effects:{}}; }},
   {w:.35, run: () => { stats(l, { happiness: 4 }); log(l, `${p.name}升了职`, `${year}年你${l.age}岁，这一年的重心放在${focusName}上，家里的氛围也跟着起落。${p.name}的晋升通知下来了，晚归的夜里，两个人把冰箱里剩下的菜热了热，聊到很晚。`, 'warm'); return {effects:{}}; }},
   {w:.3, run: () => { const bill = Math.round(gdp(l) * .09); const paid = Math.round(medicalBill(l, bill)); log(l, `${p.name}的牙要治`, `${year}年你${l.age}岁，${p.name}牙疼了半个月终于去看了牙医，两颗牙的治疗费${bill}。${l.insurance ? `保险承担70%，实付${paid}。` : `没有保险，全额自付${paid}。`}`, 'health'); return {effects:{}}; }}
  );
  if (band === 'youth') pool.push({w:.6, run: () => { const cost = Math.round(gdp(l) * .02); spend(l, cost); stats(l, { happiness: 4, social: 2 }); log(l, '第一次一起过年', `${year}年你${l.age}岁，还在攒钱（现金约${Math.round(l.money)}）。你们挤着火车回${p.name}老家过年，年货和红包花了${cost}。围炉夜话时TA说：“明年把房子的事定下来。”`, 'family'); return {effects:{}}; }});
  if (band === 'family') pool.push(
   ...(l.children.some(c => alive(c) && c.age < 18) ? [{w:.55, run: () => { const c = l.children.find(c => alive(c) && c.age < 18); c.bond = clamp(c.bond + 3); stats(l, { happiness: 2 }); log(l, '谁去开家长会', `${year}年你${l.age}岁，${c.name}的学校通知开家长会，你的工作正处在要劲的时候。你们商量后由${p.name}去，回来的路上TA把老师的话一条条讲给你听。`, 'family'); return {effects:{}}; }}] : [{w:.55, run: () => { stats(l, { happiness: 3, social: 2 }); log(l, '两个人的分工表', `${year}年你${l.age}岁，家里的事越排越满。你和${p.name}在冰箱上贴了一张分工表：TA管账单和菜，你管修理和接送。贴上去那晚，两个人都笑了。`, 'family'); return {effects:{}}; }}]),
   {w:.4, run: () => { const cost = Math.round(gdp(l) * .04); spend(l, cost); stats(l, { happiness: 3 }); log(l, '请人搭把手', `${year}年你${l.age}岁，收入约${Math.round(l.income)}，家里两头顾不过来。你们请了钟点工每周来两次，一个月${cost}。争吵少了一些，晚饭后也能一起散步了。`, 'family'); return {effects:{}}; }}
  );
  if (band === 'mid') pool.push(
   {w:.5, run: () => { stats(l, { knowledge: 2, happiness: 2 }); log(l, '你们聊起以后', `${year}年你${l.age}岁，年收入约${Math.round(l.income)}。晚饭后你和${p.name}算了算：父母的身体、孩子的学费、自己的养老。最后决定把每年结余的一部分先存起来。账算得有点冷，牵手却更紧了。`, 'family'); return {effects:{}}; }},
   {w:.4, run: () => { const cost = Math.round(gdp(l) * .05); spend(l, cost); stats(l, { happiness: 5 }); log(l, '补上的蜜月', `${year}年你${l.age}岁，你们终于把年轻时没舍得的那趟旅行补上了，花了${cost}。照片里两个人的白发都比记忆里多，笑得却和当年一样。`, 'warm'); return {effects:{}}; }}
  );
  if (band === 'late') pool.push(
   {w:.55, run: () => { stats(l, { happiness: 4, health: 1 }); log(l, '相扶着散步', `${year}年你${l.age}岁，${p.name}也${p.age ?? l.age}岁了。你们把晚饭后的散步改成两圈，走慢一点，把年轻时没说完的话接着说。`, 'warm'); return {effects:{}}; }},
   {w:.4, run: () => { const paid = Math.round(medicalBill(l, gdp(l) * .04)); stats(l, { happiness: -1 }); log(l, `${p.name}的老花镜和药盒`, `${year}年，${p.name}配了新眼镜，又开了两个月的慢性病药，实付${paid}${l.insurance ? '（保险承担70%）' : ''}。你们把药盒摆在餐桌最显眼的地方，像给日子上了个闹钟。`, 'health'); return {effects:{}}; }}
  );
  if (l.focus === 'work') pool.push({w:.5, run: () => { p.bond = clamp(p.bond - 3); stats(l, { happiness: -1 }); log(l, '加班的夜晚', `${year}年你${l.age}岁，重心压在工作上，连续几周晚归。${p.name}给你留了一盏灯和一张字条：“汤在锅里。”你看着字条坐了一会儿，决定周末把时间还给这个家。`, 'family'); return {effects:{}}; }});
  if (l.focus === 'family') pool.push({w:.5, run: () => { p.bond = clamp(p.bond + 4); stats(l, { happiness: 3 }); log(l, '一起做饭的周末', `${year}年你${l.age}岁，你把重心拨回家人这边。周末你和${p.name}试着做了TA家乡的那道菜，咸了，两个人还是吃了个精光。`, 'warm'); return {effects:{}}; }});
 }
 if (s.pet?.alive) {
  const p = s.pet;
  pool.push(
   {w:.5, run: () => { const bill = Math.round(gdp(l) * .03); spend(l, bill); p.health = clamp(p.health - 6); log(l, `${p.name}咬坏了沙发`, `${p.name}把沙发角啃出一个大洞，宠物行为咨询和换沙发套一共花了${bill}。${l.partner ? `${l.partner.name}劝你：它还小。` : '你安慰自己：它还小。'}`, 'pet'); return {effects:{cash:-bill,happiness:-1}}; }},
   {w:.4, run: () => { const bill = Math.round(gdp(l) * .045); spend(l, bill); p.health = clamp(p.health + 8); log(l, `${p.name}深夜呕吐`, `${p.name}半夜吐了两次，宠物医院的检查和输液花了${bill}。凌晨四点的候诊室里，它一直把头靠在你的腿上。`, 'pet'); return {effects:{cash:-bill,happiness:1}}; }}
  );
  if (p.age >= 9 || p.health < 45) pool.push({w:.9, run: () => { pending(l, 'pet-crisis', `${p.name}病得很重`, `${p.age}岁的${p.name}查出了严重的病。医生说手术有风险，费用约${Math.round(gdp(l)*.12)}，且不能保证治好。`, [option('surgery', '全力治疗', '花这笔钱，陪它最后一程或重新开始。'), option('comfort', '保守治疗陪伴', '用止痛和护理让它舒服一些。'), option('farewell', '告别', '不让它再受苦，陪它到最后。')], {petKind:p.kind}); return null; }});
 }
 if (alive(l.partner) && l.age >= 55 && (l.partner.age ?? l.age) >= 55 && !l.formerPartners?.length) pool.push({w:.12, run: () => { l.partner.alive = false; l.partner.deathAge = l.partner.age ?? l.age; const name = l.partner.name; l.systems.residence.with = l.children.some(c => alive(c) && c.age < 18) ? 'family' : 'alone'; stats(l, { happiness: -12, health: -3 }); log(l, `${name}离开了`, `${name}在${l.partner.deathAge}岁时因病离世。你整理TA的抽屉时，发现一沓两人年轻时互相写的信。很长一段时间，你习惯性地给TA留一盏灯。`, 'family'); return null; }});
 if (pool.length) pickWeighted(l, tiltByLife(l, pool)).run();
}
function hometownEvents(l) {
 const s = l.systems, r = s.residence; if (l.pending || l.dead || l.age < 6) return;
 const parents = [l.family.mother, l.family.father].filter(alive);
 if (!parents.length) return;
 if (chance(l, .35)) return;
 const year = yearOf(l);
 const parent = pick(l, parents);
 const oldest = Math.max(...parents.map(p => p.age ?? 60));
 const withYou = r.with === 'parents' && r.familyCountryId === r.countryId;
 const farAway = r.countryId !== r.homeCountry || r.with !== 'parents';
 const homeName = country(r.homeCountry)?.name || '老家';
 const focusName = ({ study: '学习', work: '工作', health: '养身体', family: '家人', joy: '生活体验' })[l.focus] || '生活';
 const pool = [];
 if (!withYou) {
  pool.push(
   {w:.7, run: () => { log(l, `${parent.name}打来的电话`, `${year}年你${l.age}岁，这一年的重心放在${focusName}上。周末${parent.name}打来视频，镜头先对着院子里的菜地，再转到屋里：“鸡下蛋了，你小时候那间屋还空着。”${farAway ? '挂了电话，你想家乡的空气和这条城市的马路完全是两个世界。' : '你答应这周末回去吃晚饭。'}`, 'family'); return {effects:{happiness:2,social:1}}; }},
   {w:.4, run: () => { const cost = Math.round(gdp(l) * .08); spend(l, cost); log(l, '老家的屋顶要翻修', `${year}年你${l.age}岁，${parent.name}来电话说村里的房子漏雨了，找熟人问了价，翻修要${cost}。TA嘴上说“不急”，你却听出了心疼钱的意思，当天就把钱转了过去，也提醒自己回村的次数太少了。`, 'family'); return {effects:{happiness:-1,social:1}}; }},
   {w:.35, run: () => { const bill = Math.round(gdp(l) * .06); const paid = Math.round(medicalBill(l, bill)); log(l, `${parent.name}住院了`, `${year}年你${l.age}岁，${parent.name}${parent.age ?? 60}岁，在地里闪了腰，住院观察了几天。你赶回去陪了两晚，医疗和往返花了${paid}${l.insurance ? '（保险承担70%）' : ''}。出院时TA坚持不让你多花钱，你只把回程票订得更早了些。`, 'family'); return {effects:{happiness:-2,social:2}}; }},
   {w:.3, run: () => { const gift = Math.round(gdp(l) * .03); spend(l, gift); log(l, '从老家寄来的包裹', `${year}年你${l.age}岁。${parent.name}寄来一箱自家晒的干货和一罐腌菜，快递单上的字写得很大。你回寄了一盒点心和一件冬衣，一共${gift}。`, 'warm'); return {effects:{happiness:4}}; }}
  );
  if (farAway) pool.push({w:.5, run: () => { pending(l, 'hometown-plan', '老家的安排', `${parents.map(p=>p.name).join('、')}年纪渐渐大了，一个人在${homeName}的院子里生活。你可以把TA们接过来同住，或者多回去看看。`, [option('invite', '接来身边养老', '安排住房和适应，开销会增加。'), option('visit', '今年多回去看看', '多几次探望和电话，各自安好。'), option('later', '以后再说')]); return null; }});
  if (l.age >= 18) pool.push({w:.4, run: () => { const cost = Math.round(gdp(l) * .02); spend(l, cost); log(l, '回村的那几天', `${year}年你${l.age}岁，你回到${homeName}住了几天，来回路费${cost}。${parent.name}天不亮就去集上买了你爱吃的东西，走的时候后备箱被塞得满满的。`, 'warm'); return {effects:{happiness:4,social:2}}; }});
 } else {
  pool.push(
   {w:.55, run: () => { const cost = Math.round(gdp(l) * .02); spend(l, cost); log(l, '同住的一个家', `${year}年你${l.age}岁，${parents.map(p=>p.name).join('、')}搬来和你同住。晚饭桌上多了两双筷子，你带TA们熟悉了附近的菜市场和公园，这个月开销多出约${cost}。屋子挤了些，心却踏实了。`, 'warm'); return {effects:{happiness:4}}; }},
   {w:.4, run: () => { log(l, `${parent.name}搭把手`, `${year}年你${l.age}岁，重心放在${focusName}上，常常顾不上家。${parent.name}把饭做好、衣服晾好，还念叨你“别老点外卖”。你下班回家看见亮着的厨房灯，一天的疲惫散了一半。`, 'warm'); return {effects:{happiness:3,social:1}}; }},
   {w:.35, run: () => { const cost = Math.round(gdp(l) * .05); spend(l, cost); log(l, '想回老家看看', `${year}年，${parent.name}翻出老照片，想回${homeName}的老院子住几天。你订了车票，陪TA们回去待了一个周末，花了约${cost}。临走时TA把院子里的果子摘满了袋子。`, 'family'); return {effects:{happiness:3,social:1}}; }}
  );
  if (l.children.some(c => alive(c) && c.age < 12)) pool.push({w:.5, run: () => { const c = l.children.find(c => alive(c) && c.age < 12); c.bond = clamp(c.bond + 3); log(l, '隔代的疼爱', `${year}年你${l.age}岁，${c.name}放学回家，${parent.name}已经备好了点心。孩子缠着老人讲过去的故事，你在一旁听得出神。家里有老人，孩子的话都变多了。`, 'warm'); return {effects:{happiness:3}}; }});
 }
 if (oldest > 75) pool.push(
  {w:.8, run: () => { const bill = Math.round(gdp(l) * .04); const paid = Math.round(medicalBill(l, bill)); log(l, `带${parent.name}做体检`, `${year}年，${parent.name}已经${parent.age ?? 75}岁。你陪TA做了全面体检，配了半年的慢性病药，实付${paid}${l.insurance ? '（保险承担70%）' : ''}。医生说指标大体平稳，你这些年第一次松了口气。`, 'health'); return {effects:{happiness:2}}; }},
  {w:.45, run: () => { const bill = Math.round(gdp(l) * .07); spend(l, bill); log(l, '半夜的动静', `${year}年，${parent.age ?? 75}岁的${parent.name}夜里起床上洗手间时摔了一跤。所幸不重，检查和护理花了${bill}。你从此在走廊装了小夜灯，把TA的床换到靠门的位置。`, 'family'); return {effects:{happiness:-2,social:1}}; }},
  {w:.3, run: () => { log(l, `${parent.name}的话少了`, `${year}年，${parent.name}的耳朵越来越背，电视声音开得很大，人却越来越安静。你配了助听器，晚饭后陪TA慢慢散步，把当年没来得及听的故事一点点补上。`, 'warm'); return {effects:{happiness:2,social:1}}; }}
 );
 if (pool.length) pickWeighted(l, tiltByLife(l, pool)).run();
}
// Calendar arithmetic makes the year's headline identical across independently seeded lives.
function worldFor(year) {
 const historical={1973:['crisis','石油危机','1973年石油危机冲击能源供应和全球经济。'],1989:['culture','柏林墙开放','1989年柏林墙开放，欧洲政治格局发生重大变化。'],2001:['crisis','九一一事件','2001年九一一袭击发生，国际旅行和安全环境随之变化。'],2008:['crisis','全球金融危机','2008年金融危机引发就业与资产市场动荡。'],2020:['crisis','新冠疫情','2020年新冠疫情蔓延，出行、学习和工作受到广泛影响。'],2022:['war','俄乌战争全面升级','2022年俄罗斯全面入侵乌克兰，战争造成大量人员流离失所，并冲击粮食和能源市场。']};
 if(historical[year]){const [kind,title,detail]=historical[year];return {year,kind,title,detail:detail+'',fictional:false};}
 const n = ((Math.imul(year, 1664525) + 1013904223) >>> 0) % 1000;
 const entries = n < 18 ? ['war', '地区武装冲突', '地区冲突扰乱运输，生活物资涨价。'] : n < 55 ? ['crisis', '全球供应危机', '物流受阻，食品与能源开支上涨。'] : n < 250 ? ['climate', '城市应对极端天气', '多地加强防暑与防洪设施。'] : n < 500 ? ['science', '公共医疗出现新进展', '基层筛查和医疗技术逐步改善。'] : n < 750 ? ['economy', '工作方式继续变化', '新职业出现，人们重新学习技能。'] : ['culture', '跨国文化交流季', '社区展览与交流让陌生人相遇。'];
 return { year, kind: entries[0], title: entries[1], detail: entries[2] + '', fictional: true };
}
export function systemsYear(l, options = {}) {
 initSystems(l); const s = l.systems, r = s.residence;
 if (l.dead || s.lastYear === l.age) return l;
 s.lastYear = l.age;
 // Old saves and engine-created children acquire the same continuing care system.
 for (const c of l.children.filter(alive)) {
  c.age = Math.max(0, yearOf(l) - c.birthYear);
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
  log(l, `${c.name}又长大了一点`, `${c.age}岁；${({ self: l.name, partner: l.partner?.name, nursery: '托育机构', grandparents: grandparents(l).map(p => p.name).join('、') })[care.mode]}照护，费用${care.annualCost}，家庭收入损失${care.incomeLoss}。`);
 }
 if (alive(l.partner) && l.partner.bond < 35 && (s.lastRelationshipAge == null || l.age - s.lastRelationshipAge >= 3) && !l.pending) { s.lastRelationshipAge = l.age; offer(l, 'relationship', `与${l.partner.name}的距离`, '争执和沉默让关系变得脆弱，需要共同作出决定。', [option('talk', '认真沟通'), option('counsel', '接受伴侣咨询'), option('separate', '分开生活')]); }
 if (s.pet?.alive) {
  const pet = s.pet; pet.age++; spend(l, gdp(l) * (pet.kind === 'dog' ? .016 : .011)); pet.health = clamp(pet.health - (pet.age > 9 ? 7 : 2)); stats(l, { happiness: 1 });
  if (pet.health <= 0 || pet.age >= (pet.kind === 'dog' ? 17 : 21)) { pet.alive = false; stats(l, { happiness: -7 }); log(l, '和小伙伴告别', `${pet.name}在${pet.age}岁离开，你记得一起生活的那些日子。`, 'pet'); }
  else if ((pet.health < 55 || roll(l) < .07) && !l.pending) { pet.health = clamp(pet.health - 10); offer(l, 'pet-care', `${pet.name}不太舒服`, `${pet.age}岁的${pet.name}食欲下降，需要选择照顾方式。`, [option('vet', '去宠物医院治疗'), option('basic', '基础护理和复诊'), option('delay', '暂时拖延')]); }
 }
 if (s.business) {
  const b = s.business; const margin = roll(l) * .8 - .24 + b.marketing + Math.min(b.staff, 5) * .035;
  const profit = Math.round(b.capital * margin - b.staff * gdp(l) * .04); b.income = profit; b.marketing *= .5;
  if (profit >= 0) l.money += profit; else spend(l, -profit);
  stats(l, { knowledge: 1, health: -.6 }); log(l, `${b.name}年度账本`, `净${profit >= 0 ? '利润' : '亏损'}${Math.abs(profit)}，行业${b.sector}，员工${b.staff}人。`, 'business');
 }
 for (const c of s.conditions.filter(c => !c.resolved)) {
  const treated = c.treatment === 'standard', basic = c.treatment === 'basic';
  if (treated || basic) medicalBill(l, gdp(l) * (treated ? .018 : .006));
  c.severity = Math.max(0, c.severity + (treated ? -7 : basic ? -1 : 9)); stats(l, { health: treated ? 1 : basic ? -1 : -Math.min(10, 2 + c.severity / 20) });
  if (c.severity <= 0) { c.resolved = true; log(l, '病情得到控制', `${c.name}经过持续治疗，症状得到控制。`, 'health'); }
  else if ((c.severity >= 50 || l.age - (c.lastReviewAge ?? c.diagnosedAge) >= 3) && !l.pending) medicalChoice(l, c);
 }
 if (r.abroadSince != null && l.age - (s.lastMigrationReview ?? r.abroadSince) >= 3 && !l.pending) offer(l, 'migration-review', '海外的第三年', `你住在${l.country.name}，家人在${country(r.familyCountryId)?.name || '原居国'}。下一步如何安排？`, [option('stay', '继续留居'), ...(r.familyCountryId !== r.countryId && (alive(l.partner) || l.children.some(c => alive(c) && c.age < 18)) ? [option('reunite', '接家人团聚')] : []), option('home', '回原居国生活')]);
 if (options.events !== false) { hometownEvents(l); intimateEvents(l); }
 s.world = worldFor(yearOf(l)); log(l, s.world.title, s.world.detail, 'world');
 if (['war', 'crisis'].includes(s.world.kind)) { if (l.age >= 18) spend(l, gdp(l) * .025); stats(l, { happiness: -2, health: -1 }); if (options.events !== false && l.age >= 18) offer(l, 'world-crisis', s.world.title, s.world.detail, s.world.kind==='war' ? [option('stay', '留守并准备物资'), option('shelter', '暂时避难'), option('migrate', '考虑移民')] : [option('stay', '缩减开支，准备应急物资'), option('shelter', '动用应急预算渡过危机'), option('migrate', '寻找其他地方的机会')]); }
 else if (s.world.kind === 'science') stats(l, { health: .5 });
 return l;
}

export function getHousehold(l) {
 initSystems(l); const r = l.systems.residence;
 const residents = [{ id: 'self', name: l.name, role: '自己', age: l.age, sex: l.sex, countryId: r.countryId }];
 const add = (p, id, role, fallbackAge) => { if (alive(p)) residents.push({ id, name: p.name, role, age: p.age ?? fallbackAge, sex: p.sex || (role === '母亲' ? '女' : role === '父亲' ? '男' : '未知'), countryId: r.countryId }); };
 if (r.with === 'parents') { add(l.family.mother, 'mother', '母亲', 55); add(l.family.father, 'father', '父亲', 57); }
 if (['partner', 'family'].includes(r.with) && r.countryId === r.familyCountryId) add(l.partner, 'partner', '伴侣', l.age);
 if (r.with === 'family') for (const c of l.children) if ((c.age < 18 || c.livesWithPlayer === true) && (c.countryId || r.familyCountryId) === r.countryId) add(c, c.id, '孩子', 0);
 return residents;
}
export function getSceneState(l) {
 initSystems(l); const s = l.systems, r = s.residence;
 const current = l.sceneAction?.age === l.age ? l.sceneAction : null;
 const mapped = { hospital: 'hospital', business: 'business', moving: 'moving', travel: 'travel' };
 const kind = mapped[current?.type] || (r.abroadSince != null ? 'abroad' : 'home');
 return { kind, location: kind === 'hospital' ? `${l.country.city}医院` : kind === 'business' ? s.business?.name || '工作场所' : `${l.country.name} · ${r.city}`, countryId: r.countryId, residents: getHousehold(l), pet: s.pet?.alive ? copy(s.pet) : null, action: current ? copy(current) : null, caption: current?.text || (r.with === 'alone' ? `${l.name}独自生活` : '家人共同生活的日常'), abroad: r.abroadSince != null, year: yearOf(l), world: copy(s.world) };
}
