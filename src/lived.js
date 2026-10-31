// Lived-in details. Costs are game balance, not official statistics.
import { escape as e } from './art.js';

const clamp = n => Math.max(0, Math.min(100, Number(n) || 0));
function roll(l) { l.randomState = (l.randomState + 0x6D2B79F5) >>> 0; let t = l.randomState; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = (l, xs) => xs[Math.floor(roll(l) * xs.length)];
const chance = (l, p) => roll(l) < p;
const gdp = l => l.country?.gdp || 1;
const log = (l, title, text) => l.log.push({ age: l.age, year: (l.birthYear || 0) + l.age, title, text, type: 'life' });
function stats(l, effects) { for (const [k, v] of Object.entries(effects)) l.stats[k] = clamp((l.stats[k] || 0) + v); }
function spend(l, n) { n = Math.max(0, Math.round(n)); const paid = Math.min(l.money || 0, n); l.money = (l.money || 0) - paid; l.debt = (l.debt || 0) + n - paid; return n; }
function named(l) {
 const sex = roll(l) < .5 ? '男' : '女';
 const names = l.country?.names || { surnames: ['林'], male: ['一'], female: ['一'] };
 return { name: pick(l, names.surnames) + pick(l, names[sex === '男' ? 'male' : 'female']), sex };
}
const working = l => !l.retired && (l.income || 0) > 0 && !['待业', '尚未工作', '学生', '退休', '求职中'].includes(l.job || '');
const parents = l => [l.family?.mother, l.family?.father].filter(p => p && p.alive !== false);
const abroad = l => l.systems?.residence?.abroadSince != null;
const kid = (l, max) => (l.children || []).find(c => c && c.alive !== false && !c.dead && c.age <= max && c.supportPayer !== 'player');

export function initLived(l) {
 if (!l || typeof l !== 'object') return null;
 const v = l.lived ||= {};
 v.grief ||= []; v.seen ||= {}; v.letters ||= [];
 v.pensionYears ??= 0; v.pensionPot ??= 0; v.barrierYears ??= 0; v.exerciseYears ??= 0; v.hobbyYears ??= 0; v.commuteYears ??= 0;
 return v;
}

export const LIVED_ACTS = [
 { id: 'short-sleep', title: '连续熬夜', ages: [16, 60], cost: '几乎不花钱', time: '睡眠债留下两年', risk: '身体已经很差时，撑不住，记不成', mark: '接下来两年健康更容易往下掉' },
 { id: 'catch-sleep', title: '把觉补回来', ages: [16, 70], cost: '不花钱', time: '用来还睡眠债的一年', risk: '没有睡眠债时无事可做', mark: '错过的安排不会自动补上' },
 { id: 'commute', title: '接受一段通勤', ages: [18, 65], cost: '大约当地水平的 1.5%', time: '只要还干着这份非远程的工作，就按年累计', risk: '没有工作，或工作本来就能远程，就不成立', mark: '只要还是非远程的工作，往后每年都会再记一笔。工作没了或改成远程就停' },
 { id: 'rent-look', title: '算一遍住处', ages: [18, 80], cost: '不再另收费，生活费里已经有住房', time: '看清这一年', risk: '和父母同住或已有自己的房子时，算法不同，这次不重复记', mark: '记下住房大概占收入的多少' },
 { id: 'informal', title: '先干一份没有保障的活', ages: [18, 60], cost: '不加新账单', time: '直到你另外办成正式保障', risk: '没有收入时无从“转成”无保障', mark: '这段年数不再计入以后的养老金' },
 { id: 'formalize', title: '试着补上工作保障', ages: [18, 64], cost: '大约当地水平的 4%，花了不一定办成', time: '申请这一年', risk: '大约一半会被退回，钱不退', mark: '办成才重新开始计养老金' },
 { id: 'parental-leave', title: '为幼儿请一段假', ages: [18, 50], cost: '工作还在，但这年和明年收入按七成算', time: '两年', risk: '没有两岁以内、由你这边照料的孩子，或本来就没有收入，请不了', mark: '假结束前不会变成升职' },
 { id: 'childcare-bill', title: '为上学的孩子加一笔辅导', ages: [18, 60], cost: '大约当地水平的 1%，孩子不愿学也已经花掉', time: '这一年', risk: '没有 6 到 17 岁、跟你生活的孩子就无从加', mark: '孩子肯学才多一点成长，否则只是账单' },
 { id: 'bully', title: '正视那个针对你的同学', ages: [8, 16], cost: '不花钱', time: '没说开的话，接下来三年心情和相处都会更紧', risk: '已经有这样一个人，就不会再造一个', mark: '对方有名字。不和解，名字还在，日常会紧几年' },
 { id: 'reconcile', title: '试着和那个同学说开', ages: [8, 20], cost: '不花钱', time: '一次谈话', risk: '对方可以不接受，关系会更僵', mark: '说开了才结束这段针对' },
 { id: 'puberty', title: '承认身体在变', ages: [11, 16], cost: '不花钱', time: '这一年', risk: '只发生一次', mark: '情绪和跟人相处的把握会晃一下，没有别的奖励' },
 { id: 'elder-care', title: '照顾年老的父母', ages: [25, 70], cost: '大约当地水平的 4%', time: '这一年的照护', risk: '父母可能说不用你管，钱仍可能已经垫上', mark: '照护过会留在你们的关系里' },
 { id: 'sibling', title: '和兄弟姐妹谈一次', ages: [12, 70], cost: '不花钱', time: '一次', risk: '对方可能不想谈', mark: '谈崩了，名字还在，隔阂会留下' },
 { id: 'grief-visit', title: '去看望离开的人', ages: [10, 90], cost: '大约当地水平的 1%，没去成也不退', time: '一天', risk: '路可能断，没有正在想念的人就没有可去的地方', mark: '看成了心情松一点。没看成，钱也花了。想念都不会提前结束' },
 { id: 'letter', title: '写一封不会寄出的信', ages: [10, 90], cost: '不花钱', time: '一个晚上', risk: '离开超过八年，或没有这个人，就写不成', mark: '信留在档案里。人离开后的八年里都还写得成' },
 { id: 'adhere', title: '按医嘱把这一年的药用上', ages: [16, 90], cost: '大约当地水平的 1.2%，续不上也不退', time: '这一年', risk: '停过药再重新用，这一年也可能对不上剂量', mark: '用上了，病情才往下走，停药的拖尾也停' },
 { id: 'skip-meds', title: '把药停一停', ages: [16, 90], cost: '省下药费', time: '停了之后还会再拖两年', risk: '没有在治的病，谈不上停', mark: '当年加重，后面两年还在加重，除非重新用上' },
 { id: 'smoke', title: '开始抽烟', ages: [16, 50], cost: '以后每年都在损耗身体', time: '直到戒掉，不保证戒得成', risk: '健康已经很低时，身体拒绝这个习惯', mark: '档案里多一项烟龄' },
 { id: 'quit-smoke', title: '试着把烟戒了', ages: [16, 80], cost: '不保证成功', time: '这一次尝试', risk: '大约一半会失败，失败了烟还在，心情更差', mark: '只有戒成才停掉每年的损耗' },
 { id: 'drink', title: '喝成习惯', ages: [18, 55], cost: '以后每年损耗健康和心情', time: '直到戒掉', risk: '已经有这个习惯就不会再“开始”一次', mark: '习惯留下，直到某一次真的停住' },
 { id: 'quit-drink', title: '试着把酒停了', ages: [18, 80], cost: '不保证成功', time: '这一次尝试', risk: '可能停不住', mark: '停不住就还是习惯' },
 { id: 'exercise', title: '把活动变成习惯', ages: [12, 75], cost: '每年大约当地水平的 0.4%', time: '年年累计，停了就断', risk: '已经在坚持时不用再开始', mark: '健康涨得很慢' },
 { id: 'stop-exercise', title: '停掉锻炼', ages: [12, 80], cost: '省下那笔小钱', time: '从现在起', risk: '本来没有习惯就无事可停', mark: '累计的年数还在，但不再增加' },
 { id: 'cheap-food', title: '把吃的换成更便宜的', ages: [16, 80], cost: '这一年少花大约当地水平的 1.5%', time: '这一年', risk: '身体会记下营养不足', mark: '钱留下一点，健康下一小档' },
 { id: 'pension-look', title: '看自己的养老累计', ages: [22, 90], cost: '不花钱', time: '看一眼', risk: '没有正式工作的年份不会凭空出现', mark: '不满大约十年正式工作，到龄也领不到这笔' },
 { id: 'pension-draw', title: '到龄领取养老积累', ages: [65, 95], cost: '不另收费', time: '一次', risk: '正式工作不满十年，或已经领过，就领不到', mark: '领到的是这些年扣下的积累，不是新的工作' },
 { id: 'tax-look', title: '看账单里的税和物价', ages: [18, 80], cost: '不另收，生活费已经随当地水平走', time: '看明白这一年', risk: '没有收入时只能看到物价，看不到预扣', mark: '明白账单会随当地水平变，不是固定的旧数字' },
 { id: 'hustle', title: '下班后再做一单', ages: [18, 65], cost: '占用休息', time: '这一次，两年内不重复', risk: '大约六成没有入账，只是更累', mark: '入账也只是一笔，不会变成第二份正式工作' },
 { id: 'overtime', title: '这个月加班', ages: [18, 65], cost: '身体和心情，补贴可能不来', time: '这一年只能加一次', risk: '大约一半没有补贴；睡眠债还在时更不容易入账，身体也掉得更多', mark: '有补贴也只是一笔现金，职位不变' },
 { id: 'job-search', title: '开始一段要等的求职', ages: [18, 64], cost: '不保证有回音', time: '至少再等两年才有回音', risk: '已经有工作时，这不是失业求职', mark: '明年之前不会因此出现新职位' },
 { id: 'reference', title: '请认识的人作推荐', ages: [18, 65], cost: '不花钱', time: '对方若答应，名字保留三年', risk: '对方可以拒绝', mark: '名字留三年。下一次求职可以写上，仍可能被拒；录用了，这句推荐就用掉' },
 { id: 'credential', title: '问海外是否承认学历', ages: [22, 60], cost: '问询本身不另收费', time: '不被承认的话，疑虑留下六年', risk: '人在原居国，或学历还停留在基础教育，就没有可认证的更高学历', mark: '不被承认的几年里，要学历的新本地工作会被挡下；学徒、远程和回国后不走这条' },
 { id: 'language', title: '补当地的语言', ages: [18, 70], cost: '大约当地水平的 3%', time: '要累计四次学进去，才不再被当成刚来的人', risk: '大约一半学不进去，钱照花', mark: '没补够之前，新的本地工作可能因此被拒；远程和回国后不走这条' },
 { id: 'remittance', title: '给家里汇一笔', ages: [18, 75], cost: '大约当地水平的 3%，不够就只能汇出手上的', time: '这一笔', risk: '父母都不在了就没有收款的人', mark: '钱不够时，家里会知道这不是足额' },
 { id: 'chores', title: '和伴侣分家务', ages: [18, 80], cost: '不花钱', time: '谈一次', risk: '大约一半谈不拢，别扭会留下两年', mark: '谈不拢时，接下来两年会点出对方的名字' },
 { id: 'leave-home', title: '从父母家搬出来', ages: [18, 30], cost: '安家大约当地水平的 8%', time: '搬这一次', risk: '不是和父母同住，就无从搬出', mark: '房东有名字，住房份额不再另扣，工作也不会出现' },
 { id: 'service-year', title: '做一年社区服役', ages: [18, 26], cost: '身体累一点', time: '一年，只有微薄补贴', risk: '地方可以不收你。收下了，这一年不能再去应聘', mark: '收下才有补贴。没有职位，这一年的应聘会被服役挡住' },
 { id: 'prepare', title: '为坏年景预备一点', ages: [18, 80], cost: '大约当地水平的 1.5%', time: '预备能撑五年', risk: '钱不够就会记进欠款', mark: '预备在，真遇到紧张年份才少慌一点' },
 { id: 'neighbor', title: '认识隔壁的人', ages: [8, 80], cost: '不花钱', time: '从这一年记住名字', risk: '已经有这位邻居就不再认识一个新的', mark: '以后求助，对方可以拒绝' },
 { id: 'neighbor-ask', title: '请邻居帮一个忙', ages: [8, 85], cost: '不花钱', time: '这一次', risk: '关系浅时更容易被拒绝', mark: '帮成了关系近一点，拒绝了就得自己扛' },
 { id: 'teacher', title: '记住一位老师', ages: [7, 18], cost: '不花钱', time: '学生年代的一次', risk: '只记一次', mark: '以后写信，可能没有回音' },
 { id: 'write-teacher', title: '给老师写一封信', ages: [10, 40], cost: '不花钱', time: '等一等', risk: '大约一半没有回信', mark: '没有回信，信还是留着' },
 { id: 'exam-wait', title: '等下一次再考', ages: [15, 35], cost: '不花钱，也不获得学历', time: '至少再等一年', risk: '正在顺利在读时，不必用这种方式停下来', mark: '等到那岁之前，新的升学申请会被自己挡下。备考可以继续，文凭不会出现' },
 { id: 'gap-year', title: '空出一年', ages: [17, 26], cost: '这一年不产生学历，也没有工资', time: '一年', risk: '已经有工作或正在读一个项目，就不能再空一次', mark: '这一年新的升学申请先不递。空年不会变成学历或工资' },
 { id: 'internship', title: '试一份短期实习', ages: [16, 23], cost: '地方可以不收你', time: '短短一段，不是岗位', risk: '大约四成半被回绝；有正式工作就不必再实习', mark: '带教有名字，补贴不是职业' },
 { id: 'injury', title: '处理工作时的伤', ages: [18, 65], cost: '医药大约当地水平的 2%，再损失一小段收入', time: '停下来处理', risk: '没有工作，或身体还没有报警，就不会走到这一步', mark: '职位还在，身体要时间' },
 { id: 'sick-leave', title: '请病假', ages: [18, 67], cost: '大约三周工资，职位先留着', time: '这一段', risk: '没有工作或身体还撑得住，请不了', mark: '回来仍是原来的工作，不是晋升' },
 { id: 'birthday', title: '给一个具体的人过生日', ages: [6, 90], cost: '大约当地水平的 0.4%', time: '这一天', risk: '人若在别处，礼物大约四成送不到', mark: '送到了关系近一点，送不到钱也花了' },
 { id: 'pet-night', title: '夜里守着老去的伙伴', ages: [10, 80], cost: '不另收费，但会欠下睡眠', time: '这一夜，睡眠债留下两年', risk: '伙伴不一定因此好起来，离开也不会被拦住', mark: '名字留在这一年，工作不会因此改变' },
 { id: 'hobby', title: '把爱好再做一年', ages: [10, 70], cost: '每年一点点时间', time: '做满八年才可能换到一笔钱', risk: '那一次也大约只有四分之一能入账，而且只试一次', mark: '入账也不是职业' }
];

function elder(l) { return parents(l).find(p => (p.age || 0) >= 70); }
function schoolchild(l) { return (l.children || []).find(c => c && c.alive !== false && !c.dead && c.age >= 6 && c.age <= 17 && c.supportPayer !== 'player'); }
function condition(l) { return (l.systems?.conditions || []).find(c => c && !c.resolved); }
function friend(l) { return (l.friends || []).find(f => f && f.alive !== false && !f.dead && (f.bond || 0) >= 45); }
function someone(l) {
 const pool = [...parents(l), ...(l.friends || []).filter(f => f && f.alive !== false && !f.dead)];
 return pool[0] || null;
}
function higherEd(l) {
 const text = `${l.education || ''} ${l.school?.credential || ''}`;
 return /大学|本科|硕士|博士|职业/.test(text);
}

function open(l, id) {
 const v = l.lived;
 switch (id) {
  case 'short-sleep': return (v.sleepUntil || 0) < l.age && (l.stats.health || 0) >= 25;
  case 'catch-sleep': return (v.sleepUntil || 0) >= l.age;
  case 'commute': return working(l) && !l.remote && !v.commuteOn;
  case 'rent-look': return !!(v.lease && l.age > v.lease.until) || (!l.house && l.systems?.residence?.with !== 'parents' && l.age - (v.rentAt || -10) >= 5);
  case 'informal': return working(l) && !v.informal;
  case 'formalize': return !!v.informal;
  case 'parental-leave': return !!kid(l, 1) && working(l);
  case 'childcare-bill': return !!schoolchild(l) && l.age - (v.tutorAt || -10) >= 4;
  case 'bully': return !v.bully;
  case 'reconcile': return !!(v.bully && !v.bully.ended && (v.bully.next || 0) <= l.age);
  case 'puberty': return !v.puberty;
  case 'elder-care': return !!elder(l) && l.age - (v.elderAt || -10) >= 3;
  case 'sibling': return (l.family?.siblings || []).some(s => s && s.alive !== false);
  case 'grief-visit': return v.grief.some(g => l.age - g.since <= 4);
  case 'letter': return v.grief.some(g => l.age - g.since <= 8);
  case 'adhere': case 'skip-meds': return !!condition(l);
  case 'smoke': return !v.smoke && (l.stats.health || 0) >= 25;
  case 'quit-smoke': return !!v.smoke && (v.smokeNext || 0) <= l.age;
  case 'drink': return !v.drink;
  case 'quit-drink': return !!v.drink && (v.drinkNext || 0) <= l.age;
  case 'exercise': return !v.exercise;
  case 'stop-exercise': return !!v.exercise;
  case 'cheap-food': return (v.cheapUntil || 0) < l.age;
  case 'pension-look': return true;
  case 'pension-draw': return !v.pensionDrawn;
  case 'tax-look': return l.age - (v.taxAt || -10) >= 5;
  case 'hustle': return working(l) && (v.hustleUntil || 0) <= l.age;
  case 'overtime': return working(l) && (v.overtimeUntil || 0) <= l.age;
  case 'job-search': return !working(l) && (v.searchUntil || 0) <= l.age;
  case 'reference': return !!friend(l) && (v.reference?.until || 0) < l.age;
  case 'credential': return abroad(l) && higherEd(l) && (v.unrecognizedUntil || 0) < l.age;
  case 'language': return abroad(l) && !v.fluent;
  case 'remittance': return parents(l).length > 0;
  case 'chores': return !!(l.partner && l.partner.alive !== false);
  case 'leave-home': return l.systems?.residence?.with === 'parents';
  case 'service-year': return !v.served && (v.serviceNext || 0) <= l.age && !working(l);
  case 'prepare': return (v.preparedUntil || 0) < l.age;
  case 'neighbor': return !v.neighbor;
  case 'neighbor-ask': return !!(v.neighbor && (v.neighbor.next || 0) <= l.age);
  case 'teacher': return !v.teacher;
  case 'write-teacher': return !!(v.teacher && (v.teacher.next || 0) <= l.age);
  case 'exam-wait': return !(l.school?.program && !l.school.program.paused);
  case 'gap-year': return !v.gap && !working(l) && !(l.school?.program && !l.school.program.paused);
  case 'internship': return !v.intern && !working(l);
  case 'injury': return working(l) && (l.stats.health || 0) < 55;
  case 'sick-leave': return working(l) && (l.stats.health || 0) < 50;
  case 'birthday': return !!someone(l);
  case 'pet-night': return !!(l.systems?.pet?.alive && ((l.systems.pet.age || 0) >= 8 || (l.systems.pet.health || 100) < 55) && (v.petNightUntil || 0) < l.age);
  case 'hobby': return !v.hobbyTried;
  default: return false;
 }
}

function run(l, id) {
 const v = l.lived;
 const g = gdp(l);
 switch (id) {
  case 'short-sleep': {
   v.sleepUntil = l.age + 2; stats(l, { health: -1, happiness: -1 });
   log(l, '睡眠先欠下了', '你把夜里的时间让给了别的事。今年精神先下去一点，接下来两年还会更容易累。这不是徽章。');
   return { ok: true, message: '睡眠债会再留两年。' };
  }
  case 'catch-sleep': {
   v.sleepUntil = l.age - 1; stats(l, { happiness: -1, health: 1 });
   log(l, '把觉补上了', '你推掉了一些原定的事。精神回来一点，错过的那些不会自动排回日历。');
   return { ok: true, message: '觉补上了，错过的事还在。' };
  }
  case 'commute': {
   spend(l, g * .015); v.commuteOn = true; v.commuteSince = l.age; v.commuteYears += 1; stats(l, { happiness: -1 });
   log(l, '路上的时间', `在${l.country.city}，这段非远程的工作要花路上的时间。今年交通大约${Math.round(g * .015)}，心情被挤掉一点。通勤累计 ${v.commuteYears} 年。`);
   return { ok: true, message: '通勤记进了这一年。' };
  }
  case 'rent-look': {
   const housing = Math.round(g * .06);
   const base = Math.max(l.income || 0, Math.round(g * .2));
   const ratio = Math.round(housing / base * 100);
   if (v.lease && l.age <= v.lease.until) {
    log(l, `${v.lease.landlord}的租约还在`, `约到${v.lease.until}岁。住房大约占收入口径的 ${ratio}%，已经含在生活费里，这一年不再另扣。`);
    return { ok: true, message: '租约还在，没有另收费。' };
   }
   if (v.lease && l.age > v.lease.until) {
    const fee = Math.round(g * .01); spend(l, fee);
    if (!chance(l, .55)) {
     v.lease.lapsed = l.age;
     log(l, `${v.lease.landlord}没有续约`, `你又付了${fee}去谈。对方不续。人还住着，但这份约已经过期，工作也不会因此出现。`);
     return { ok: true, message: '续约被拒绝了。' };
    }
    v.lease.until = l.age + 2; v.lease.lapsed = 0;
    log(l, `${v.lease.landlord}把约续了两年`, `谈话花了${fee}。新的到期是${v.lease.until}岁。住房份额仍在原来的生活费里，不重复扣。`);
    return { ok: true, message: '续了两年。' };
   }
   v.rentAt = l.age;
   log(l, '住处在账单里', `你没有自己的房子，也不是和父母同住。生活费里住房大约${housing}，相当于收入口径的 ${ratio}% 上下。还没有单独的租约。这是游戏里的住房份额，不是官方租金统计。`);
   return { ok: true, message: `住房大约是收入口径的 ${ratio}%。` };
  }
  case 'informal': {
   v.informal = true;
   const who = named(l); v.foreman = who.name;
   log(l, '这份活没有保障', `${who.name}说先这么干。收入还在，但${l.job || '这份工作'}不再往养老累计里记。生病、空窗和以后的领取，都要另算。`);
   return { ok: true, message: `${who.name}这边没有保障。` };
  }
  case 'formalize': {
   const fee = Math.round(g * .04); spend(l, fee);
   if (!chance(l, .5)) { log(l, '保障没有办上', `你交了${fee}。材料被退回来，工作仍算没有保障，养老累计继续停着。`); return { ok: true, message: '没办成，费用不退。' }; }
   v.informal = false;
   log(l, '保障办上了', `你交了${fee}。从这一年起，正式工作的年份重新计入养老累计。它不追溯以前。`);
   return { ok: true, message: '从今年重新累计。' };
  }
  case 'parental-leave': {
   const c = kid(l, 1); v.leaveUntil = l.age + 1; v.leaveFull = l.income || 0; v.leaveCut = l.age;
   if ((l.income || 0) > 0) l.income = Math.round(l.income * .7);
   log(l, '为孩子请假', `${c?.name || '孩子'}还小。工作先留着。这年和明年各自按当年工资的七成算，不会在已经压过的数字上再砍一刀，也不会因此升职。`);
   return { ok: true, message: '假请了。两年各按七成，不是七成再打七成。' };
  }
  case 'childcare-bill': {
   const c = schoolchild(l); const fee = Math.round(g * .01); spend(l, fee); v.tutorAt = l.age;
   if (!chance(l, .55)) { log(l, '辅导没坐住', `${c.name}这个年纪不想加课。${fee}已经付了，成长没有因此变快。`); return { ok: true, message: '钱花了，孩子没坐住。' }; }
   c.development = clamp((c.development || 50) + 2);
   log(l, '加了一年辅导', `${c.name}愿意试。费用${fee}，成长慢一点往前。这不是一张文凭。`);
   return { ok: true, message: '这一年的辅导坐住了。' };
  }
  case 'bully': {
   const who = named(l);
   l.friends ||= []; l.systems ||= {};
   const idn = `friend-${(l.systems.friendSequence = (l.systems.friendSequence || 0) + 1)}`;
   const f = { ...who, id: idn, age: l.age, bond: 22, countryId: l.country.id, metThrough: '课间被针对', sharedMemory: '那次没有人把场面揭过去', lastContactAge: l.age, alive: true };
   l.friends.push(f); v.bully = { id: f.id, name: f.name, ended: false, next: l.age + 1, since: l.age };
   log(l, `${f.name}总在那个时候出现`, `你看清了是${f.name}。可以以后试着说开，也可以一直避开。说开不一定有用。`);
   return { ok: true, message: `记住了${f.name}。` };
  }
  case 'reconcile': {
   const f = (l.friends || []).find(x => x.id === v.bully.id);
   v.bully.next = l.age + 1;
   const ok = chance(l, Math.min(.7, .28 + (l.stats.social || 0) / 220));
   if (!ok || !f) { if (f) f.bond = clamp((f.bond || 20) - 5); log(l, '话没有说开', `${v.bully.name}没有接。这段针对还在，下一年才能再试。`); return { ok: true, message: '对方没有接受。' }; }
   f.bond = clamp(f.bond + 12); v.bully.ended = true;
   log(l, '和同学把话说开了', `${f.name}听完了。你们没有变成好友，但这件具体的事可以放下。`);
   return { ok: true, message: '说开了。' };
  }
  case 'puberty': {
   v.puberty = true; const up = chance(l, .5); stats(l, { social: up ? 1 : -2, happiness: -1 });
   log(l, '身体在变', `衣服和情绪都有点跟不上。${up ? '你慢慢知道怎么跟别人站在一起。' : '你更不想被看出来。'}没有奖励，也没有人替你跳过这一年。`);
   return { ok: true, message: '这一年就这样过去。' };
  }
  case 'elder-care': {
   const p = elder(l); const fee = Math.round(g * .04); spend(l, fee); v.elderAt = l.age;
   if (!p) return { ok: false, message: '没有需要照顾的年长父母。' };
   if (!chance(l, .62)) { log(l, '父母把你挡回去了', `${p.name}说还不用。垫上的${fee}退不回来，照护没有开始。`); return { ok: true, message: '对方说还不用。' }; }
   p.bond = clamp((p.bond || 50) + 4); p.caredAge = l.age;
   log(l, `这一年照着${p.name}`, `医药和来回大约${fee}。${p.name}的日子轻一点，你的时间少了一块。这不能阻止以后的分别。`);
   return { ok: true, message: `照过${p.name}这一年。` };
  }
  case 'sibling': {
   const s = (l.family.siblings || []).find(x => x && x.alive !== false);
   if (!chance(l, .5)) { if (s) s.bond = clamp((s.bond || 40) - 6); log(l, '兄弟姐妹不想谈', `${s?.name || '对方'}把话题岔开。隔阂留下了，人还是那一个。`); return { ok: true, message: '没谈成。' }; }
   if (s) s.bond = clamp((s.bond || 40) + 5);
   log(l, '和兄弟姐妹说上了', `${s?.name || '对方'}愿意讲近况。没有解决所有旧账，至少这一次没有不欢而散。`);
   return { ok: true, message: '谈了一次。' };
  }
  case 'grief-visit': {
   const g0 = v.grief.find(g1 => l.age - g1.since <= 4);
   if (!g0) return { ok: false, message: '没有正在想念的人。' };
   const fee = Math.round(g * .01); spend(l, fee);
   if (!chance(l, .6)) { log(l, `没能去成${g0.name}那里`, `路费${fee}花了。路或时间断了，人没有看成。想念仍按它自己的年份走。`); return { ok: true, message: '没去成。' }; }
   stats(l, { happiness: 2 });
   log(l, `去看${g0.name}`, '你去了。心情松一点。想念还要按它自己的年份走完，不会因为这一趟提前结束。');
   return { ok: true, message: '去看过了，想念还在。' };
  }
  case 'letter': {
   const g0 = v.grief.find(g1 => l.age - g1.since <= 8);
   v.letters.push({ name: g0?.name || '一个人', age: l.age, text: '有些话没有寄出。' });
   log(l, `写给${g0?.name || '一个人'}的信`, '这封信不会寄出。它留在你的档案里，年份都在。');
   return { ok: true, message: '信留下了。' };
  }
  case 'adhere': {
   const c = condition(l); spend(l, g * .012);
   if (v.medLapse && !chance(l, .55)) { log(l, '药没有续上', `${v.medLapse.name}停过。这一年剂量和日子对不上，费用已经花了。影响还要走到${v.medLapse.until}岁。`); return { ok: true, message: '没有续上。' }; }
   if (c) c.severity = Math.max(0, (c.severity || 20) - 6);
   v.medLapse = null; stats(l, { health: 1 });
   log(l, '药按这一年用了', `${c?.name || '病'}需要持续的花费。用上了，严重程度往下走一点，停药的拖尾也停。`);
   return { ok: true, message: '这一年的药用上了。' };
  }
  case 'skip-meds': {
   const c = condition(l); if (c) c.severity = (c.severity || 20) + 8;
   v.medLapse = { name: c?.name || '病', until: l.age + 2 }; stats(l, { health: -2 });
   log(l, '药停了', `${v.medLapse.name}没有因为省钱而停住。这一年加重，而且会再拖到${v.medLapse.until}岁，除非重新用上。`);
   return { ok: true, message: '省下了药费，病情还会再走两年。' };
  }
  case 'smoke': {
   v.smoke = true; stats(l, { health: -1 });
   log(l, '烟成了习惯', '从现在起，每一年都会再削一点健康。戒烟可以试，不保证成功。');
   return { ok: true, message: '习惯留下了。' };
  }
  case 'quit-smoke': {
   v.smokeNext = l.age + 1;
   if (!chance(l, .5)) { stats(l, { happiness: -2 }); log(l, '烟没有戒掉', '你试了。习惯还在，心情更差，下一年才能再试。'); return { ok: true, message: '没戒成。' }; }
   v.smoke = false; log(l, '烟停住了', '这一次停住了。以前的年份不会从身体里抹掉，只是不再每年加重。');
   return { ok: true, message: '停住了。' };
  }
  case 'drink': {
   v.drink = true; stats(l, { happiness: 1, health: -1 });
   log(l, '酒成了习惯', '这一年开始觉得放松，身体以后每年都要付。停不停得再试。');
   return { ok: true, message: '习惯留下了。' };
  }
  case 'quit-drink': {
   v.drinkNext = l.age + 1;
   if (!chance(l, .48)) { stats(l, { happiness: -2 }); log(l, '酒没有停住', '你说过要停。这一次没有，下一年才能再试。'); return { ok: true, message: '没停住。' }; }
   v.drink = false; log(l, '酒停住了', '停住了。以前喝过的那些年还在。');
   return { ok: true, message: '停住了。' };
  }
  case 'exercise': {
   v.exercise = true;
   log(l, '活动变成习惯', `每年大约${Math.round(g * .004)}，健康涨得很慢。停了，年数就不再增加。`);
   return { ok: true, message: '从明年起按年累计。' };
  }
  case 'stop-exercise': {
   v.exercise = false;
   log(l, '锻炼停了', `累计的 ${v.exerciseYears} 年还在档案里，但从现在起不再增加，也不再收那笔小钱。`);
   return { ok: true, message: '停了。' };
  }
  case 'cheap-food': {
   const save = Math.round(g * .015); l.money = (l.money || 0) + save; v.cheapUntil = l.age + 1; stats(l, { health: -1 });
   log(l, '吃得更便宜', `这一年餐食大约省下${save}。营养不足，健康下去一点，省下的钱不会变成体质。`);
   return { ok: true, message: '省下了一点，身体记下了。' };
  }
  case 'pension-look': {
   log(l, '养老累计', `正式工作记了 ${v.pensionYears} 年，账上积累 ${Math.round(v.pensionPot)}。${v.informal ? '现在这份活没有保障，年份暂停。' : ''}${v.pensionYears < 10 ? '不满十年，到了岁数也领不到。' : '已经够领取的年限，仍要到 65 岁之后自己去领，而且只领一次。'}这是游戏规则，不是官方社保。`);
   return { ok: true, message: `累计 ${v.pensionYears} 年。` };
  }
  case 'pension-draw': {
   if (v.pensionYears < 10 || v.pensionPot <= 0) { log(l, '没有可领的积累', `正式工作只有 ${v.pensionYears} 年。不满十年，或账上是空的，就没有这笔钱。`); return { ok: true, message: '年限不够，领不到。' }; }
   const pot = Math.round(v.pensionPot); l.money = (l.money || 0) + pot; v.pensionPot = 0; v.pensionDrawn = true;
   log(l, '领到养老积累', `你领到这些年扣下的${pot}。这不是新的工资，领过就不能再领一次。`);
   return { ok: true, message: `领到 ${pot}。` };
  }
  case 'tax-look': {
   v.taxAt = l.age;
   const tax = working(l) ? Math.round((l.income || 0) * .08) : 0;
   log(l, '物价和预扣', `生活费跟着${l.country.name}的水平走，不是一个写死的旧账单。${tax ? `若粗算预扣，大约是收入的一成以内（${tax}），已经含在生活费的口径里，不再另扣一次。` : '没有工资时，看不到预扣，只能看到物价本身在变。'}数字是游戏假设。`);
   return { ok: true, message: '看过账单的口径了。' };
  }
  case 'hustle': {
   v.hustleUntil = l.age + 2; stats(l, { health: -1, happiness: -1 });
   if (!chance(l, .4)) { log(l, '额外的一单没有入账', '你下班后又做了。没有进账，只是更累。两年内不再重复这一单。'); return { ok: true, message: '没有入账。' }; }
   const gain = Math.round(g * .05); l.money = (l.money || 0) + gain;
   log(l, '额外的一单入了账', `进账${gain}。这是一笔，不是第二份正式工作，职位不变。`);
   return { ok: true, message: `入账 ${gain}。` };
  }
  case 'overtime': {
   v.overtimeUntil = l.age + 1;
   const sleepy = (v.sleepUntil || 0) >= l.age;
   stats(l, { health: sleepy ? -3 : -2, happiness: -2 });
   if (!chance(l, sleepy ? .35 : .55)) { log(l, '加班没有补贴', `${sleepy ? '睡眠债还在，' : ''}这个月的额外时间没有换成钱。职位还是${l.job || '原来的'}。明年才能再加一次。`); return { ok: true, message: '没有补贴。' }; }
   const bonus = Math.round((l.income || 0) * .04); l.money = (l.money || 0) + bonus;
   log(l, '加班换了一笔', `补贴${bonus}进了现金。身体和心情都下去。职位还是${l.job || '原来的'}。明年才能再加一次。`);
   return { ok: true, message: '补贴进了现金，职位没变。' };
  }
  case 'job-search': {
   const who = named(l);
   v.search = { name: who.name, since: l.age, until: l.age + 2 };
   v.searchUntil = l.age + 2;
   log(l, '求职要等', `${who.name}收下了材料。最早${v.search.until}岁才有回音。这期间没有工资，也不会先写上一个职位。`);
   return { ok: true, message: `${who.name}说再等两年。` };
  }
  case 'reference': {
   const f = friend(l);
   if (!f) return { ok: false, message: '没有关系够得上开口的人。' };
   if (!chance(l, Math.min(.75, .35 + (f.bond || 0) / 200))) { log(l, `${f.name}没有答应`, '推荐不是义务。对方拒绝了，你的求职没有因此更近。'); return { ok: true, message: '对方拒绝了。' }; }
   v.reference = { name: f.name, until: l.age + 3 };
   log(l, `${f.name}答应提到你`, `名字可以在材料里留到${v.reference.until}岁。这不是录用，职位不会因此出现。`);
   return { ok: true, message: '只是一句推荐。' };
  }
  case 'credential': {
   if (!chance(l, .45)) { v.unrecognizedUntil = l.age + 6; log(l, '学历在这里不被承认', `在${l.country.name}，你原来的学历这次对不上。疑虑留到${v.unrecognizedUntil}岁。没有新的文凭，也没有工作。`); return { ok: true, message: '不被承认。' }; }
   v.unrecognizedUntil = 0;
   log(l, '学历被认了一部分', '对方认了你已有的学习，但没有因此给你职位或新文凭。');
   return { ok: true, message: '认了一部分，没有职位。' };
  }
  case 'language': {
   const fee = Math.round(g * .03); spend(l, fee);
   if (!chance(l, .5)) { log(l, '语言没有学进去', `学费${fee}花了。你还是容易被当成刚到${l.country.name}的人。`); return { ok: true, message: '没学进去。' }; }
   v.languageStudy = (v.languageStudy || 0) + 1;
   if (v.languageStudy >= 4) { v.fluent = true; log(l, '语言终于够用', `第${v.languageStudy}次学进去了。日常可以自己应付，这仍不等于工作或居留。`); }
   else log(l, '语言进了一点', `学费${fee}。还要再学进去${4 - v.languageStudy}次，才不再被当成刚来的人。`);
   return { ok: true, message: v.fluent ? '日常语言够用了。' : '进了一点，还没够。' };
  }
  case 'remittance': {
   const need = Math.round(g * .03);
   const names = parents(l).map(p => p.name).join('和');
   if ((l.money || 0) < need) {
    const paid = Math.max(0, Math.round(l.money || 0)); l.money = 0;
    for (const p of parents(l)) p.bond = clamp((p.bond || 40) + 1);
    log(l, '汇款没有足额', `你想汇${need}给${names}，手上只有${paid}。家里知道这不是足额。`);
    return { ok: true, message: '没有足额。' };
   }
   spend(l, need); for (const p of parents(l)) p.bond = clamp((p.bond || 40) + 3);
   log(l, '给家里汇了一笔', `${need}汇给${names}。关系近一点，你的现金少一截。`);
   return { ok: true, message: '汇出了。' };
  }
  case 'chores': {
   const p = l.partner;
   if (!chance(l, .5)) { v.choreUntil = l.age + 2; p.bond = clamp((p.bond || 40) - 4); log(l, '家务没有分清', `${p.name}觉得还是不公平。别扭会留两年。`); return { ok: true, message: '没谈拢。' }; }
   p.bond = clamp((p.bond || 40) + 3); v.choreUntil = 0;
   log(l, '家务说定了一轮', `${p.name}和你把这一轮说定了。下一轮仍可能再吵。`);
   return { ok: true, message: '这一轮说定了。' };
  }
  case 'leave-home': {
   const fee = Math.round(g * .08); spend(l, fee);
   l.systems.residence.with = 'alone';
   const who = named(l);
   v.lease = { landlord: who.name, since: l.age, until: l.age + 2, lapsed: 0 };
   log(l, '从父母家搬出来', `${who.name}把钥匙给了你，安家花了${fee}。约到${v.lease.until}岁。生活费里原来的住房份额不再另扣一遍。工作不会因此出现。`);
   return { ok: true, message: `搬出来了，房东是${who.name}。` };
  }
  case 'service-year': {
   const who = named(l);
   if (!chance(l, .55)) { v.serviceNext = l.age + 1; log(l, `${who.name}没有收下服役`, '名额满了。没有补贴，也没有职位。明年才能再问一次。'); return { ok: true, message: '今年没有名额。' }; }
   v.served = true; v.serviceUntil = l.age;
   const stipend = Math.round(g * .04); l.money = (l.money || 0) + stipend; stats(l, { health: -1, knowledge: 2 });
   log(l, '社区服役的一年', `${who.name}收下了你。补贴${stipend}。这一年不能再去应聘。结束以后档案里只留下做过一年，不是职位。`);
   return { ok: true, message: '服役这一年没有职位。' };
  }
  case 'prepare': {
   const fee = Math.round(g * .015); spend(l, fee); v.preparedUntil = l.age + 5;
   log(l, '为坏年景留了一点', `你拿出${fee}。到${v.preparedUntil}岁之前，真遇到紧张的年份，会少慌一点。它不能取消灾害。`);
   return { ok: true, message: '预备留了五年。' };
  }
  case 'neighbor': {
   const who = named(l); v.neighbor = { ...who, bond: 35, next: l.age + 1 };
   log(l, `隔壁是${who.name}`, '你们互相知道了名字。以后如果求助，对方可以拒绝。');
   return { ok: true, message: `认识了${who.name}。` };
  }
  case 'neighbor-ask': {
   const n = v.neighbor; n.next = l.age + 1;
   if (!chance(l, Math.min(.7, .25 + (n.bond || 0) / 180))) { log(l, `${n.name}帮不了`, '邻居拒绝了。这件事还得你自己扛。'); return { ok: true, message: '对方拒绝了。' }; }
   n.bond = clamp(n.bond + 6); stats(l, { happiness: 1 });
   log(l, `${n.name}帮了这个忙`, '忙帮成了。关系近一点，没有变成一份长期的义务。');
   return { ok: true, message: '帮成了。' };
  }
  case 'teacher': {
   const who = named(l); v.teacher = { ...who, next: l.age + 1 };
   log(l, `记住了${who.name}老师`, '以后可以写信。信可能没有回音。');
   return { ok: true, message: `记住了${who.name}。` };
  }
  case 'write-teacher': {
   const t = v.teacher; t.next = l.age + 2;
   v.letters.push({ name: t.name, age: l.age, text: '写给老师的一封信。' });
   if (!chance(l, .45)) { log(l, `${t.name}没有回信`, '信寄出去了，没有回音。信还留在档案里。'); return { ok: true, message: '没有回信。' }; }
   stats(l, { happiness: 2, knowledge: 1 });
   log(l, `${t.name}回了信`, '回信不长。你被记得，但这不会改写学历。');
   return { ok: true, message: '有回信。' };
  }
  case 'exam-wait': {
   v.examWait = l.age + 1;
   log(l, '等下一次再考', `你决定至少等到${v.examWait}岁再申请。等待不会变成录取，也不会发一张文凭。`);
   return { ok: true, message: '只是等待。' };
  }
  case 'gap-year': {
   v.gap = true; v.gapUntil = l.age + 1; stats(l, { knowledge: 2, happiness: 1 });
   log(l, '空出的一年', `这一年没有工资，也没有新学历。新的升学申请至少等到${v.gapUntil}岁。你只是多看见了一点生活怎么运转。`);
   return { ok: true, message: '空年记下了，没有学历。' };
  }
  case 'internship': {
   v.intern = true;
   const who = named(l);
   if (!chance(l, .55)) { log(l, '实习没有收下你', `${who.name}看了材料，地方回绝了。没有补贴，也没有职位。`); return { ok: true, message: '没被收下。' }; }
   v.mentor = { name: who.name, age: l.age };
   const stipend = Math.round(g * .02); l.money = (l.money || 0) + stipend;
   log(l, '短短一段实习', `${who.name}带了你这一段。补贴${stipend}。结束以后你仍没有一份职业，档案里只写着试过。`);
   return { ok: true, message: `${who.name}带过你，这不是职业。` };
  }
  case 'injury': {
   const sleepy = (v.sleepUntil || 0) >= l.age;
   const bill = Math.round(g * (sleepy ? .035 : .02));
   const lost = Math.round(Math.min((l.income || 0) * (sleepy ? .08 : .05), g * (sleepy ? .06 : .04)));
   spend(l, bill + lost); stats(l, { health: sleepy ? -5 : -3 });
   log(l, '工作时的伤', `${sleepy ? '睡眠债还在，' : ''}医药${bill}，少掉的收入大约${lost}。${l.job || '工作'}还在，身体要时间，没有人因此给你升职。`);
   return { ok: true, message: '伤处理了，职位没变。' };
  }
  case 'sick-leave': {
   const sleepy = (v.sleepUntil || 0) >= l.age;
   if (sleepy && !chance(l, .55)) { stats(l, { health: -2 }); log(l, '病假没有批下来', `你已经连着缺觉。单位没有批。职位还是${l.job || '原来的工作'}，人却更累。`); return { ok: true, message: '假没有批。' }; }
   const lost = Math.round((l.income || 0) * .06); spend(l, lost); stats(l, { health: 2 });
   log(l, '病假', `大约三周工资${lost}。回来仍是${l.job || '原来的工作'}，不是晋升。`);
   return { ok: true, message: '假请了，职位还是原来的。' };
  }
  case 'birthday': {
   const person = someone(l); const gift = Math.round(g * .004); spend(l, gift);
   const away = person.countryId && person.countryId !== l.country.id;
   if (away && chance(l, .4)) { log(l, `给${person.name}的礼物没送到`, `花了${gift}。人在别处，这一次没送到。`); return { ok: true, message: '没送到。' }; }
   person.bond = clamp((person.bond || 40) + 3);
   log(l, `${person.name}的生日`, `礼物${gift}送到了。关系近一点，也就这一天。`);
   return { ok: true, message: `给${person.name}过了。` };
  }
  case 'pet-night': {
   const pet = l.systems?.pet;
   if (!pet?.alive) return { ok: false, message: '没有需要守着的伙伴。' };
   v.petNightUntil = l.age + 2; v.sleepUntil = Math.max(v.sleepUntil || 0, l.age + 2);
   const eased = chance(l, .5); if (eased) pet.health = clamp((pet.health || 40) + 4);
   stats(l, { happiness: eased ? 1 : -1, health: -1 });
   log(l, `夜里守着${pet.name}`, eased ? `${pet.name}这一夜安稳一点。你的睡眠债会再留两年。它的年纪不会因此停住，工作也不会因此出现。` : `${pet.name}还是不舒服。你守到天亮，睡眠债留下，什么都没有被保证。`);
   return { ok: true, message: eased ? `守过${pet.name}这一夜。` : `${pet.name}没有好起来。` };
  }
  case 'hobby': {
   if (!v.hobby) { v.hobby = true; v.hobbyYears = 0; log(l, '爱好又做了一年', '从现在起按年累计。做满八年，才可能换到一笔钱，而且多半换不到。它不会变成职业。'); return { ok: true, message: '爱好开始累计。' }; }
   if ((v.hobbyYears || 0) < 8) { log(l, '爱好还在', `才 ${v.hobbyYears} 年。不满八年，没有收入可谈。`); return { ok: true, message: '还早。' }; }
   v.hobbyTried = true;
   if (!chance(l, .25)) { log(l, '爱好还是爱好', '你试过让它养活一个角落。没有入账。它仍然不是职业。'); return { ok: true, message: '没有入账。' }; }
   const gain = Math.round(g * .1); l.money = (l.money || 0) + gain;
   log(l, '爱好换来一笔', `入账${gain}。只此一笔，职位没有出现。`);
   return { ok: true, message: '只是一笔，不是职业。' };
  }
  default: return { ok: false, message: '没有这件事。' };
 }
}

function watch(l) {
 const v = l.lived;
 const list = [];
 const add = (role, p) => { if (p?.name) list.push({ role, name: p.name, dead: p.alive === false || p.dead === true }); };
 add('母亲', l.family?.mother); add('父亲', l.family?.father); add('伴侣', l.partner);
 for (const f of l.friends || []) add('朋友', f);
 if (l.systems?.pet) add('伙伴', l.systems.pet);
 for (const c of l.children || []) add('孩子', c);
 const fresh = [];
 for (const p of list) {
  const key = `${p.role}:${p.name}`;
  if (v.seen[key] === true && p.dead && !v.grief.some(g => g.key === key)) {
   v.grief.push({ key, name: p.name, role: p.role, since: l.age });
   fresh.push(p.name);
  }
  v.seen[key] = !p.dead;
 }
 v.grief = v.grief.filter(g => l.age - g.since <= 8);
 if (fresh.length) log(l, '想念留了下来', `${fresh.join('、')}离开以后，这种空着的感觉会留几年。不是选一句就能过去。`);
 const fading = (l.lived.grief || []).filter(g => l.age - g.since === 4);
 if (fading.length) log(l, '想念还在，但这一天可以重新安排', `${fading.map(g => g.name).join('、')}离开已经四年。你仍会在普通的下午想起对方。`);
 const active = v.grief.filter(g => l.age - g.since <= 4 && l.age !== g.since);
 if (active.length) stats(l, { happiness: -Math.min(3, active.length) });
}

export function gateNewLocalJob(l, kind) {
  initLived(l);
  if (kind === 'remote' || kind === 'promotion' || kind === 'raise') return { ok: true };
  if (l.systems?.residence?.abroadSince == null) return { ok: true };
  const v = l.lived;
  if ((v.unrecognizedUntil || 0) >= l.age && kind !== 'apprentice') {
    return { ok: false, title: '学历挡住了这份本地工作', text: `在${l.country.name}，你的学历要到${v.unrecognizedUntil}岁才不再被卡住。这份要学历的本地职位没有录用你。学徒和远程不受这条限制。` };
  }
  if (!v.fluent && !chance(l, .38)) {
    const who = named(l);
    return { ok: false, title: '面试停在语言上', text: `${who.name}在${l.country.name}问了几个只有本地才答得顺的问题。你没接上。这份新的本地工作没有给你，原来的${l.job || '状态'}还在。远程工作不走这条。` };
  }
  return { ok: true };
}

export function activeReference(l) {
 const ref = l?.lived?.reference;
 if (!ref || (ref.until || 0) < (l.age || 0)) return null;
 return (l.friends || []).find(f => f && f.name === ref.name && f.alive !== false && !f.dead) || null;
}

export function askChild(l) {
 const v = l.lived;
 if (l.age < 24 || l.age > 42 || l.age % 6 !== 0 || v.childAsk === l.age) return false;
 if (l.systems?.residence?.abroadSince != null) return false;
 const partner = l.partner;
 if (!partner || partner.alive === false || partner.dead || !partner.name) return false;
 const page = partner.age ?? l.age;
 if (page < 18 || page > 45) return false;
 if ((l.children || []).some(c => c && c.alive !== false && !c.dead)) return false;
 v.childAsk = l.age;
 l.pending = { kind: 'system', system: 'child-plan', title: `要不要和${partner.name}试着要一个孩子`, text: `${partner.name}和你都还在可以商量这件事的年纪。检查要花钱。这一年也可能没有孩子，没有人会凭空把孩子交给你。`, options: [{ key: 'birth', label: '试一次', description: '付检查费。成功才有一个有名字的孩子，失败则今年不能再试。' }, { key: 'wait', label: '今年先不要', description: '不花钱。过几年仍可能再问，也可以一直不要。' }] };
 log(l, `和${partner.name}谈孩子`, '这件事不会自己完成。试了也可能没有孩子。');
 return true;
}
function tick(l) {
 const v = l.lived;
 watch(l);
 if ((v.sleepUntil || 0) >= l.age) stats(l, { health: -0.5 });
 if (v.search && l.age >= v.search.until) {
  const who = v.search.name;
  const hard = (v.unrecognizedUntil || 0) >= l.age || (abroad(l) && !v.fluent);
  const replied = chance(l, hard ? .18 : .34);
  v.search = null; v.searchUntil = l.age + 1;
  if (!replied) log(l, `${who}没有回音`, '材料石沉大海。你仍没有职位，也没有工资。');
  else log(l, `${who}回了一封信`, '信里说这次没有空位。这不是录用，职位和收入都没有变。');
 }
 if (v.smoke) stats(l, { health: -0.45 });
 if (v.drink) stats(l, { health: -0.25 });
 if (v.exercise) { v.exerciseYears += 1; stats(l, { health: 0.3 }); spend(l, gdp(l) * .004); }
 if (v.medLapse && l.age <= v.medLapse.until && l.age > v.medLapse.until - 2) {
  const illness = (l.systems?.conditions || []).find(c => c && !c.resolved && c.name === v.medLapse.name);
  if (illness) illness.severity = (illness.severity || 20) + 4;
  stats(l, { health: -1 });
  log(l, '停药还在起作用', `${v.medLapse.name}这一年仍没有按医嘱走。要到${v.medLapse.until}岁，或重新用上，才会停。`);
 }
 if (v.bully && !v.bully.ended) {
  const span = l.age - (v.bully.since ?? l.age);
  if (span >= 1 && span <= 3) stats(l, { happiness: -1, social: -1 });
  if (span === 4 && !v.bully.noted) { v.bully.noted = true; log(l, `${v.bully.name}不再天天出现`, '针对慢慢淡了。你们没有把话说开，这个名字还在。'); }
 }
 if ((v.choreUntil || 0) >= l.age && l.age > v.choreUntil - 2) {
  const partner = l.partner;
  if (partner && partner.alive !== false && !partner.dead && partner.name) {
   partner.bond = clamp((partner.bond || 40) - 1); stats(l, { happiness: -1 });
   log(l, `${partner.name}还记着那轮家务`, `别扭留到${v.choreUntil}岁。这一年没有重新说定，工作也不会因此出现。`);
  }
 }
 if (v.commuteOn) {
  if (working(l) && !l.remote && l.age > (v.commuteSince || 0)) {
   const fare = gdp(l) * .015; spend(l, fare); v.commuteYears += 1; v.commuteSince = l.age; stats(l, { happiness: -1 });
   log(l, '路上的时间还在', `在${l.country.city}，非远程的工作又占了一年路。交通大约${Math.round(fare)}。累计 ${v.commuteYears} 年。职位没有因此变化。`);
  } else if (!working(l) || l.remote) {
   v.commuteOn = false;
   log(l, '路上的时间停了', `${l.remote ? '工作改成远程，' : '没有这份非远程的工作，'}通勤不再按年累计。档案里还留着 ${v.commuteYears} 年。`);
  }
 }
 if (v.hobby && !v.hobbyTried) v.hobbyYears += 1;
 if ((v.cheapUntil || 0) >= l.age) stats(l, { health: -0.4 });
 if ((v.leaveUntil || 0) >= l.age && v.leaveCut !== l.age && (l.income || 0) > 0) { v.leaveCut = l.age; l.income = Math.round(l.income * .7); }
 if (formal(l)) { v.pensionYears += 1; v.pensionPot += Math.round(gdp(l) * .012); }
 if (abroad(l) && !v.fluent) v.barrierYears += 1;
 if ((v.preparedUntil || 0) >= l.age && ['war', 'crisis'].includes(l.systems?.world?.kind)) stats(l, { happiness: 1 });
}
function formal(l) { return working(l) && !l.lived?.informal && l.age >= 18 && l.age < 65; }

export function livedYear(l, options = {}) {
 initLived(l);
 if (!l || l.dead) return l;
 tick(l);
 if (options.events === false || l.pending) return l;
 if (askChild(l)) return l;
 if (l.age < 18 || l.age > 88 || l.age % 7 !== 0 || l.lived.lastOfferAge === l.age) return l;
 const choices = LIVED_ACTS.filter(a => l.age >= a.ages[0] && l.age <= a.ages[1] && open(l, a.id));
 if (!choices.length) return l;
 const act = choices[Math.floor(l.age / 7) % choices.length];
 l.lived.lastOfferAge = l.age;
 l.pending = { kind: 'system', system: 'lived', title: act.title, text: `${act.mark}。花费：${act.cost}。时间：${act.time}。不确定：${act.risk}。`, options: [{ key: act.id, label: '试着去做', description: act.mark }, { key: 'later', label: '今年先放下', description: '它不会自动完成。过几年仍可能再出现。' }] };
 log(l, act.title, '一件生活里的事找上门。可以做，也可以先放下。时间不会因此停住太久。');
 return l;
}

export function livedChoice(l, key) {
 initLived(l);
 if (!key || key === 'later') { log(l, '今年先放下', '你知道这件事还在。它不会自己完成，过几年仍可能再出现。'); return { ok: true, message: '先放下了。' }; }
 const act = LIVED_ACTS.find(a => a.id === key);
 if (!act || l.age < act.ages[0] || l.age > act.ages[1] || !open(l, key)) { log(l, '这件事暂时做不了', '年龄、身体、关系或收入已经变了，没有硬做成。'); return { ok: false, message: '条件已经变了。' }; }
 return run(l, key);
}

export function livedAction(l, id) {
 initLived(l);
 if (l.dead) return { ok: false, message: '这一生已经结束。' };
 if (l.pending) return { ok: false, message: '请先完成眼前的选择。' };
 const act = LIVED_ACTS.find(a => a.id === id);
 if (!act) return { ok: false, message: '没有这件事。' };
 if (l.age < act.ages[0] || l.age > act.ages[1]) return { ok: false, message: `这件事适合 ${act.ages[0]} 到 ${act.ages[1]} 岁。` };
 if (!open(l, id)) return { ok: false, message: '现在的年龄、身体、关系或收入还不适合。' };
 return run(l, id);
}

export function livedBrief(l) {
 const v = l?.lived; if (!v) return '';
 const bits = [];
 if ((v.sleepUntil || 0) >= (l.age || 0)) bits.push('睡眠债');
 if (v.smoke) bits.push('烟');
 if (v.drink) bits.push('酒');
 if (v.exercise) bits.push(`活动 ${v.exerciseYears} 年`);
 if (v.informal) bits.push('工作无保障');
 if ((v.leaveUntil || 0) >= (l.age || 0)) bits.push('育儿假');
 if (v.grief?.length) bits.push(`想念${v.grief.map(g => g.name).join('、')}`);
 if (v.medLapse && (l.age || 0) <= v.medLapse.until) bits.push(`停药：${v.medLapse.name}`);
 if (v.bully && !v.bully.ended) bits.push(`针对：${v.bully.name}`);
 if (v.lease?.landlord && !(v.lease.lapsed > 0 && l.age > v.lease.until)) bits.push(`租约：${v.lease.landlord}`);
 else if (v.lease?.lapsed) bits.push(`${v.lease.landlord}的约过期了`);
 if (v.search?.name) bits.push(`在等${v.search.name}的回音`);
 if (v.foreman) bits.push(`无保障：${v.foreman}`);
 if (v.mentor?.name) bits.push(`带教 ${v.mentor.name}`);
 if (v.reference?.until >= (l.age || 0)) bits.push(`${v.reference.name}的推荐还在`);
 if (v.commuteOn) bits.push(`通勤 ${v.commuteYears} 年`);
 if ((v.serviceUntil || 0) >= (l.age || 0)) bits.push('服役这一年');
 if ((v.gapUntil || 0) > (l.age || 0)) bits.push('空年');
 if ((v.overtimeUntil || 0) > (l.age || 0)) bits.push('今年加过班');
 if ((v.examWait || 0) > (l.age || 0)) bits.push(`等到${v.examWait}岁再申请`);
 if ((v.choreUntil || 0) >= (l.age || 0) && l.partner?.name) bits.push(`家务别扭：${l.partner.name}`);
 if (abroad(l) && !v.fluent) bits.push(`当地语言还生疏（${v.barrierYears}年）`);
 if ((v.pensionYears || 0) > 0) bits.push(`养老累计 ${v.pensionYears} 年`);
 return bits.join(' · ');
}

export function livedCatalogHTML(l) {
 initLived(l);
 const cards = LIVED_ACTS.map(a => {
  const ok = l.age >= a.ages[0] && l.age <= a.ages[1] && open(l, a.id) && !l.pending && !l.dead;
  return `<button class="choice-btn lived-card" data-lived="${a.id}" ${ok ? '' : 'disabled'}><strong>${e(a.title)} <span>${ok ? '↗' : '—'}</span></strong><small>${a.ages[0]}–${a.ages[1]}岁 · ${e(a.cost)} · ${e(a.time)}</small><small>${e(a.risk)} ${e(a.mark)}</small></button>`;
 }).join('');
 const brief = livedBrief(l);
 return `<div class="dialog-kicker">${l.age} 岁 · 生活的节奏</div><h2 id="dialog-title">五十件不会一下子跳过的事</h2><p>这些事多数时候等你来找。只有少数年份、而且眼前没有别的选择时，才会自己找上门。做成与否都不发放学历、签证、孩子或永久的工作。费用是游戏假设，不是官方统计。</p>${brief ? `<p class="small-note">正在发生：${e(brief)}</p>` : ''}<div class="choice-list lived-list">${cards}</div>`;
}
