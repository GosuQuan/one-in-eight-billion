import { COUNTRIES, DESTINATIONS, classStanding } from './engine.js';

const countryById = id => COUNTRIES.find(c => c.id === id);
const destById = id => DESTINATIONS.find(d => d.id === id);

export function formatPlay(ms) {
  const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (s < 5) return '';
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r ? `${m} 分 ${r} 秒` : `${m} 分`;
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分`;
}

function birthOf(life) {
  return life.birthCountry || life.country || { name: '出发的地方', city: '', region: '' };
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
  const pathBody = stops.map(s => `${s.age}岁 ${s.label}`).join(' → ');

  const scenes = [];
  const pushScene = text => { if (text && !scenes.includes(text)) scenes.push(text); };
  pushScene(`${birth.city || birth.name}的家`);
  for (const sc of life.systems?.scenes || []) pushScene(sc.text || sc.place);
  for (const t of life.travels || []) pushScene(`${t.age ?? ''}岁的旅途 · ${t.place || t.name}`.replace(/^岁/, ''));
  for (const m of movesOf(life)) {
    const to = countryById(m.to);
    if (to) pushScene(`${m.age}岁迁居 · ${to.city}`);
  }
  if (life.systems?.business?.name) pushScene(`经营 ${life.systems.business.name}`);
  if ((life.log || []).some(l => l.type === 'health')) pushScene('医院里的一天');
  if ((life.partner && life.partner.alive !== false) || (life.formerPartners || []).length) pushScene('和伴侣同住过的屋子');

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
  const people = [
    [mother, father].filter(Boolean).length ? `父母 ${[mother, father].filter(Boolean).join('、')}` : '',
    partner ? `伴侣 ${partner}` : (life.formerPartners || [])[0]?.name ? `曾经的伴侣 ${(life.formerPartners || [])[0].name}` : '没有结成长期的伴侣',
    kids.length ? `孩子 ${kids.map(c => c.name).join('、')}` : '没有把孩子带到世上',
    `最后的事 ${life.job || '没有固定的职业'}`
  ].filter(Boolean);

  const standing = classStanding(life);
  const helped = (life.log || []).some(l => /志愿|社区|帮忙|陪伴/.test(`${l.title || ''}${l.text || ''}`));
  const contribution = [
    life.careerYears ? `工作大约 ${life.careerYears} 年` : '没有一段稳定的受雇年限',
    kids.length ? `把 ${kids.map(c => c.name).slice(0, 3).join('、')} 带在身边` : '',
    life.systems?.business?.name ? `经营过 ${life.systems.business.name}` : '',
    helped ? '做过不拿工资的帮忙或陪伴' : ''
  ].filter(Boolean).join('。') || '没有一份可计的功绩，日子被身边的人记住。';

  const who = partner || mother || life.name || '这一生';
  const stayed = stops.length < 2;
  const q1 = stayed
    ? `${who}说过，一直留在${birth.city || birth.name}的人，也活过不止一种日子。你会不会是这样？`
    : `${who}说过，人可以离开${birth.city || birth.name}，但带不走当时的自己。你会不会是这样？`;
  const q2 = kids.length
    ? `${life.name}把${kids.map(c => c.name).slice(0, 2).join('、')}带到了这个世界上。有人说过，下一代不是一笔账，是还有人接着过。你会不会想被这样接住？`
    : `${life.name}没有把孩子带到世上。有人说过，没有后代的人，也可以把一天过成别人的依靠。你会不会是这样？`;

  const lines = [
    '人走完的不是年份，是那些没有再回去的地方。',
    '选择一旦做成，就变成了别人眼里的你。',
    '被记住的，往往不是你赚过多少，而是还有没有人用你的名字起一个头。'
  ];
  const philosophy = lines[(stops.length + kids.length + (life.age || 0)) % lines.length];
  const played = formatPlay(life.playMs);

  return {
    playTitle: '你停留的时间',
    playBody: played ? `这局游戏里，你真实停留了 ${played}，走过角色的 ${life.age} 年。` : '这场游玩的计时从你打开这一生开始。再停留一会儿，卡片会写下分钟。',
    pathTitle: '地点轨迹',
    pathBody,
    sceneTitle: '到过的场景',
    sceneBody: scenes.slice(0, 7).join(' ／ ') || '大多时候在家里',
    regionTitle: '地区',
    regionBody: regions.join('、') || '还没有离开出发的地区',
    peopleTitle: '人物的轨迹',
    peopleBody: people.join('。') + '。',
    fertility: kids.length ? `${kids.length} 个孩子：${kids.map(c => c.name).join('、')}` : '这一生没有孩子',
    status: `${standing.band} · ${life.job || '没有固定职业'} · ${life.education || '学历停在原处'}`,
    contribution,
    philosophy,
    questions: [q1, q2]
  };
}
