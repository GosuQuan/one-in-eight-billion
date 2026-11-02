import { COUNTRIES, DESTINATIONS, classStanding } from './engine.js';
import { tr, label, numberLocale, recordText } from './i18n.js';

const countryById = id => COUNTRIES.find(c => c.id === id);
const destById = id => DESTINATIONS.find(d => d.id === id);

export function formatPlay(ms) {
  const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (s < 5) return '';
  if (s < 60) return tr('{s} 秒', {s});
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r ? tr('{m} 分 {r} 秒', {m, r}) : tr('{m} 分', {m});
  return tr('{m} 小时 {m2} 分', {m: Math.floor(m / 60), m2: m % 60});
}

function birthOf(life) {
  return life.birthCountry || life.country || { name: tr('出发的地方'), city: '', region: '' };
}

function movesOf(life) {
  return (life.systems?.migration || []).filter(m => m && m.status && m.status !== 'refused' && m.to);
}

export function memorialOf(life) {
  const birth = birthOf(life);
  const here = life.country || birth;
  const stops = [{ age: 0, label: [birth.city, birth.name].filter(Boolean).join(' · ') }];
  for (const m of movesOf(life)) {
    const to = countryById(m.to);
    if (!to) continue;
    const label = [to.city, to.name].filter(Boolean).join(' · ');
    if (stops.at(-1)?.label !== label) stops.push({ age: m.age ?? 0, label });
  }
  const endLabel = [here.city, here.name].filter(Boolean).join(' · ');
  if (stops.at(-1)?.label !== endLabel) stops.push({ age: life.age ?? 0, label: endLabel });
  const pathBody = stops.map(s => tr('{age}岁 {label}', {age: s.age, label: s.label})).join(' → ');

  const scenes = [];
  const pushScene = text => { if (text && !scenes.includes(text)) scenes.push(text); };
  pushScene(tr('{city}的家', {city: birth.city || birth.name}));
  for (const sc of life.systems?.scenes || []) pushScene(sc.text || sc.place);
  for (const t of life.travels || []) pushScene(tr('{age}岁的旅途 · {place}', {age: t.age ?? '', place: t.place || t.name}).replace(/^岁/, ''));
  for (const m of movesOf(life)) {
    const to = countryById(m.to);
    if (to) pushScene(tr('{age}岁迁居 · {city}', {age: m.age, city: to.city}));
  }
  if (life.systems?.business?.name) pushScene(tr('经营 {name}', {name: life.systems.business.name}));
  if ((life.log || []).some(l => l.type === 'health')) pushScene(tr('医院里的一天'));
  if ((life.partner && life.partner.alive !== false) || (life.formerPartners || []).length) pushScene(tr('和伴侣同住过的屋子'));

  const regions = [];
  const pushRegion = r => { if (r && !regions.includes(r)) regions.push(r); };
  pushRegion(birth.region);
  pushRegion(here.region);
  for (const m of movesOf(life)) pushRegion(countryById(m.to)?.region);
  for (const t of life.travels || []) pushRegion(destById(t.id)?.region);

  const mother = life.family?.mother?.name;
  const father = life.family?.father?.name;
  const kids = (life.children || []).filter(c => c?.name);
  const partner = life.partner?.name;
  // partnership length and aging-parent care, both derived from the record
  const since = life.partner?.togetherSince;
  const partnerYears = partner && since != null && life.age != null ? Math.max(1, life.age - since) : 0;
  const caredParents = (life.log || []).some(l => /照护|探望|陪.*医院|照顾.*(父亲|母亲|爸|妈)/.test(recordText(l)));
  const people = [
    [mother, father].filter(Boolean).length ? tr('父母 {x}', {x: [mother, father].filter(Boolean).join(tr('、'))}) : '',
    partner ? tr('伴侣 {partner}{x}', {partner, x: partnerYears ? tr('（共同度过 {partnerYears} 年）', {partnerYears}) : ''}) : (life.formerPartners || [])[0]?.name ? tr('曾经的伴侣 {name}', {name: (life.formerPartners || [])[0].name}) : tr('没有结成长期的伴侣'),
    kids.length ? tr('孩子 {kids}', {kids: kids.map(c => c.name).join(tr('、'))}) : tr('没有把孩子带到世上'),
    tr('最后的事 {job}', {job: label(life.job) || tr('没有固定的职业')})
  ].filter(Boolean);

  const standing = classStanding(life);
  const helped = (life.log || []).some(l => /志愿|社区|帮忙|陪伴/.test(recordText(l)));
  const contribution = [
    life.careerYears ? tr('工作大约 {careerYears} 年', {careerYears: life.careerYears}) : tr('没有一段稳定的受雇年限'),
    kids.length ? tr('把 {kids} 带在身边', {kids: kids.map(c => c.name).slice(0, 3).join(tr('、'))}) : '',
    life.systems?.business?.name ? tr('经营过 {name}', {name: life.systems.business.name}) : '',
    helped ? tr('做过不拿工资的帮忙或陪伴') : '',
    caredParents ? tr('照顾过年迈的父母') : ''
  ].filter(Boolean).join(tr('。')) || tr('没有一份可计的功绩，日子被身边的人记住。');

  // ---- the grain: four pairs, derived from the record ----
  const kidsCount = kids.length;
  const movesCount = movesOf(life).length;
  const travelsCount = (life.travels || []).length;
  const friendsTouched = (life.log || []).filter(l => /朋友|好友|相识|介绍/.test(recordText(l))).length;
  const careTouched = (life.log || []).filter(l => /照护|陪伴|探望|守着/.test(recordText(l))).length;
  const workTouched = (life.log || []).filter(l => /录用|晋升|加班|求职|副业|岗位/.test(recordText(l))).length;
  const calmTouched = (life.log || []).filter(l => /散步|读|休息|静|爱好|长椅/.test(recordText(l))).length;
  const moneyGiven = (life.log || []).filter(l => /汇给|帮忙|借给|捐|塞到/.test(recordText(l))).length;
  const moneyKept = (life.log || []).filter(l => /存款|投资|买入|攒|还清/.test(recordText(l))).length;
  const pair = (a, b, aw, bw) => {
    const total = aw + bw;
    const lean = total === 0 ? 0 : Math.round((aw - bw) / total * 100);
    return { a, b, lean };
  };
  const grain = [
    pair(tr('身边有人'), tr('远方奔波'), friendsTouched + careTouched + kidsCount * 2, movesCount * 3),
    pair(tr('守在这里'), tr('出去闯荡'), (movesCount ? 0 : 2) + calmTouched, movesCount * 2 + travelsCount * 2),
    pair(tr('慢慢过'), tr('赶着走'), calmTouched, workTouched),
    pair(tr('给出去'), tr('攒下来'), moneyGiven * 2 + kidsCount, moneyKept * 2),
  ];
  const grainWords = grain.map(g => (g.lean > 30 ? g.a : g.lean < -30 ? g.b : '')).filter(Boolean);
  const grainBody = grain.map(g => tr('{a}／{b}：{x}', {a: g.a, b: g.b, x: g.lean > 30 ? tr('偏') + g.a : g.lean < -30 ? tr('偏') + g.b : tr('两边都占一些')})).join(tr('。'));
  const grainTitle = grainWords.length >= 2 ? tr('这是一段{grainWords}的人生', {grainWords: grainWords.slice(0, 2).join(tr('、'))}) : tr('这是一段两边都沾一些的人生');

  const who = partner || mother || life.name || tr('这一生');
  const stayed = stops.length < 2;
  const q1 = stayed
    ? tr('{who}说过，一直留在{city}的人，也活过不止一种日子。你会不会是这样？', {who, city: birth.city || birth.name})
    : tr('{who}说过，人可以离开{city}，但带不走当时的自己。你会不会是这样？', {who, city: birth.city || birth.name});
  const q2 = kids.length
    ? tr('{name}把{kids}带到了这个世界上。有人说过，下一代不是一笔账，是还有人接着过。你会不会想被这样接住？', {name: life.name, kids: kids.map(c => c.name).slice(0, 2).join(tr('、'))})
    : tr('{name}没有把孩子带到世上。有人说过，没有后代的人，也可以把一天过成别人的依靠。你会不会是这样？', {name: life.name});

  const lines = [
    tr('人走完的不是年份，是那些没有再回去的地方。'),
    tr('选择一旦做成，就变成了别人眼里的你。'),
    tr('被记住的，往往不是你赚过多少，而是还有没有人用你的名字起一个头。')
  ];
  const philosophy = lines[(stops.length + kids.length + (life.age || 0)) % lines.length];
  const played = formatPlay(life.playMs);
  const reflections = Object.entries(life.reflections || {}).filter(([k, v]) => v);
  const reflectionQuote = reflections.length
    ? `"${reflections[reflections.length - 1][1]}"`
    : '';
  const days = Math.round((life.age || 0) * 365.25);
  const lifespan = { title: tr('人生的长度'), body: tr('{age} 岁，大约 {days} 天。天数按每年 365.25 天的游戏换算，只作纪念。', {age: life.age, days: days.toLocaleString(numberLocale)}) };

  return {
    playTitle: tr('你停留的时间'),
    playBody: played ? tr('这局游戏里，你真实停留了 {played}，走过角色的 {age} 年。', {played, age: life.age}) : tr('这场游玩的计时从你打开这一生开始。再停留一会儿，卡片会写下分钟。'),
    lifespan,
    pathTitle: tr('地点轨迹'),
    pathBody,
    sceneTitle: tr('到过的场景'),
    sceneBody: scenes.slice(0, 7).join(tr(' ／ ')) || tr('大多时候在家里'),
    regionTitle: tr('地区'),
    regionBody: regions.join(tr('、')) || tr('还没有离开出发的地区'),
    peopleTitle: tr('人物的轨迹'),
    peopleBody: people.join(tr('。')) + tr('。'),
    fertility: kids.length ? tr('{kids} 个孩子：{kids2}', {kids: kids.length, kids2: kids.map(c => c.name).join(tr('、'))}) : tr('这一生没有孩子'),
    status: `${label(standing.band)} · ${label(life.job) || tr('没有固定职业')} · ${label(life.education) || tr('学历停在原处')}`,
    contribution,
    philosophy,
    grain: { title: grainTitle, body: grainBody, pairs: grain },
    ownWords: reflectionQuote,
    ownWordsAge: reflections.length ? Number(reflections[reflections.length - 1][0]) : null,
    questions: [q1, q2]
  };
}
