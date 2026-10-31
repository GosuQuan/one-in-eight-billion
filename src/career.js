import { gateNewLocalJob, activeReference } from './lived.js';
const record = (l, title, text) => l.log.push({ age: l.age, year: l.birthYear + l.age, title, text, type: 'work' });
function roll(l) { l.randomState = (l.randomState + 0x6D2B79F5) >>> 0; let t = l.randomState; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rank = { none: 0, primary: 1, basic: 2, high: 3, vocational: 3, university: 4, masters: 5 };
const JOBS = {
 apprentice: { label: '维修学徒', factor: .3, minimum: 0, chance: .62 },
 office: { label: '行政职员', factor: .48, minimum: 3, chance: .4 },
 technical: { label: '技术人员', factor: .66, minimum: 3, chance: .34 },
 matched: { label: '专业对口岗位', factor: .72, minimum: 4, chance: .24 },
 remote: { label: '远程职员', factor: .55, minimum: 3, chance: .3, remote: true }
};
export function inferKind(job = '') {
 if (/远程/.test(job)) return 'remote';
 if (/学徒|临时|零工/.test(job)) return 'apprentice';
 if (/行政/.test(job)) return 'office';
 if (/对口|专业/.test(job)) return 'matched';
 if (/技术|工程/.test(job)) return 'technical';
 return 'office';
}
export function employed(l) { return !l.retired && l.income > 0 && !['待业', '尚未工作', '学生', '退休', '求职中'].includes(l.job || ''); }
export function localIncome(l, kind, country = l.country) {
 const spec = JOBS[kind] || JOBS.office;
 const edu = rank[l.school?.credential] ?? 0;
 const exp = Math.min(30, l.careerYears || 0);
 const focus = { work: 1.08, study: 1.03, family: .94, health: .96, joy: 1 }[l.focus] || 1;
 const interest = 1 + Math.min(.12, ((l.stats?.knowledge || 0) + (l.stats?.social || 0)) / 900);
 const gdp = country?.gdp || l.country?.gdp || 1;
 return Math.max(0, Math.round(gdp * spec.factor * (1 + edu * .06) * (1 + exp * .018) * focus * interest));
}
export function careerOptions(l) {
 const r = rank[l.school?.credential] ?? 0;
 const fulltime = !!(l.school?.program && !l.school.program.paused && ['apply-university', 'apply-masters', 'apply-high', 'apply-vocational'].includes(l.school.program.id));
 return [
  { id: 'apprentice', label: '应聘维修学徒', description: '跟师傅做维修。录用后收入按当地物价、学历和已有经验计算，不是一份固定美元。', ...JOBS.apprentice },
  { id: 'office', label: '应聘行政岗位', description: '需要高中或同等学历。面试可能失败，失败后仍是现在的状态。', ...JOBS.office },
  { id: 'technical', label: '应聘技术岗位', description: '职业教育可以试；只有高中学历时，这份岗位不开放。', ...JOBS.technical, minimum: l.school?.credential === 'high' ? 4 : 3 },
  { id: 'matched', label: '应聘专业对口岗位', description: '要大学学历。学历对上了，也不保证有空位。', ...JOBS.matched },
  { id: 'remote', label: '申请远程工作', description: '做成以后换国家，这份收入还在；吃住仍按你脚下的地方计算。可能失败。', ...JOBS.remote },
  { id: 'promotion', label: '提交晋升申请', description: '经验越多越容易被看见，仍可能被拒绝，拒绝后留在原岗位。', minimum: 0, chance: .18, factor: 0 }
 ].map(o => ({ ...o, disabled: l.age < 18 || l.dead || (l.lived?.serviceUntil || 0) >= l.age || r < o.minimum || fulltime || l.careerLastAge === l.age || (o.id === 'promotion' && (!employed(l) || (l.lived?.leaveUntil || 0) >= l.age || (l.lived?.sickUntil || 0) >= l.age || (l.lived?.injuryUntil || 0) >= l.age)), reason: (l.lived?.serviceUntil || 0) >= l.age ? '这一年在社区服役，不能同时应聘。服役不是职位。' : o.id === 'promotion' && (l.lived?.leaveUntil || 0) >= l.age ? '育儿假还没结束，这次不能升职。假不会变成晋升。' : o.id === 'promotion' && (l.lived?.sickUntil || 0) >= l.age ? '病假这一年不能升职。回来仍是原来的工作。' : o.id === 'promotion' && (l.lived?.injuryUntil || 0) >= l.age ? '伤还没好，这一年不能升职。职位先留着。' : l.age < 18 ? '成年后开放' : l.careerLastAge === l.age ? '今年已经参加过招聘或晋升评估' : r < o.minimum ? '目前学历不满足岗位要求' : o.id === 'promotion' && !employed(l) ? '需要一份在职工作' : fulltime ? '全日制学习期间请先完成或暂停学业' : '', income: o.id === 'promotion' ? Math.round((l.income || 0) * 1.16) : localIncome(l, o.id) }));
}
export function careerAction(l, id) {
 const o = careerOptions(l).find(x => x.id === id);
 if (!o || l.pending) return { ok: false, message: '请先处理当前选择' };
 if (o.disabled) return { ok: false, message: o.reason || '当前不能申请' };
 l.careerLastAge = l.age;
 if (id !== 'promotion') {
  const gate = gateNewLocalJob(l, id);
  if (!gate.ok) {
   record(l, gate.title, `${gate.text}你仍是${l.job}。`);
   l.stats.happiness = Math.max(0, l.stats.happiness - 2);
   return { ok: true, message: gate.title };
  }
 }
 const ref = id === 'promotion' ? null : activeReference(l);
  const probability = Math.min(.86, o.chance + (l.stats.knowledge || 0) * .002 + (l.stats.social || 0) * .001 + (l.focus === 'work' ? .08 : 0) + (id === 'promotion' ? Math.min(.28, (l.careerYears || 0) * .02) : 0) + (ref ? .12 : 0));
 if (roll(l) >= probability) {
  record(l, '没有等到那份录用通知', `${o.label}之后，对方选了更贴近岗位的人。${id === 'matched' ? '学历写在简历上，空位却要你还没有的项目经历。' : ''}${id === 'promotion' ? `你已有${l.careerYears || 0}年经验，这次评估仍没通过。` : ''}${ref ? `${ref.name}的名字在材料上，这次仍没有录用。推荐留到${l.lived.reference.until}岁，不是一张录用通知。` : ''}你仍是${l.job}。这样的消息以后还会再出现。`);
  l.stats.happiness = Math.max(0, l.stats.happiness - 2);
  return { ok: true, message: '这次没有通过' };
 }
 if (id === 'promotion') { l.income = Math.round(l.income * 1.16); l.job = '资深' + String(l.job || '职员').replace(/^资深/, ''); }
 else {
  l.jobKind = id; l.job = JOBS[id].label; l.remote = !!JOBS[id].remote; l.retired = false;
  if (l.remote) { l.employerGdp = l.country.gdp; l.employerCountryId = l.country.id; }
  else { l.employerGdp = null; l.employerCountryId = l.country.id; }
  l.income = localIncome(l, id, l.remote ? { gdp: l.employerGdp } : l.country);
 }
 record(l, id === 'promotion' ? '名字出现在晋升名单上' : '收到录用通知', `你现在是${l.job}，年收入${l.income}，按${l.remote ? '雇主所在地' : l.country.name}的物价、你的学历和${l.careerYears || 0}年经验计算。${ref ? `${ref.name}的名字在材料上，这句推荐到此用掉。` : ''}以后仍可能失业，换地方时收入和开销会重算。`);
  if (ref) l.lived.reference = null;
 return { ok: true, message: `成为${l.job}，年收入${l.income}` };
}
export function careerYear(l) {
 if (!l || l.dead || l.age < 18 || l.retired || l.careerYearSeen === l.age) return;
 l.careerYearSeen = l.age;
 if (!employed(l)) return;
 l.careerYears = (l.careerYears || 0) + 1;
 const country = l.remote && l.employerGdp ? { gdp: l.employerGdp } : l.country;
 const target = localIncome(l, l.jobKind || inferKind(l.job), country);
 l.income = Math.round(l.income * .5 + target * .5 * (.94 + roll(l) * .1));
}
