// What moved this year. Right before a year turns, the page keeps a copy of the numbers it shows
// (life.yearEnds[age]), so it can say how far each one has gone since. Display only: the simulation never reads it.
import { netWorth, investedValue } from './engine.js';
import { tr, numberLocale } from './i18n.js';

const KEYS = ['health', 'happiness', 'knowledge', 'social', 'cash', 'invested', 'debt', 'net', 'income'];
const STATS = new Set(['health', 'happiness', 'knowledge', 'social']);
const names = () => ({ health: tr('健康'), happiness: tr('幸福'), knowledge: tr('知识'), social: tr('人际'), cash: tr('现金'), invested: tr('投资'), debt: tr('负债'), net: tr('净资产'), income: tr('年收入') });
const numbers = l => [l.stats.health, l.stats.happiness, l.stats.knowledge, l.stats.social, l.money, investedValue(l), l.debt, netWorth(l), l.income];

export function markYearEnd(l) {
 if (!l || l.dead || l.pending) return;
 (l.yearEnds ||= {})[l.age] = numbers(l).map((v, i) => i < 4 ? Math.round(v * 10) / 10 : Math.round(v));
}

// change of every number during `age`: from the end of the year before to the end of this one (or to now)
export function yearChanges(l, age = l?.age) {
 const from = l?.yearEnds?.[age - 1], to = age === l?.age ? numbers(l) : l?.yearEnds?.[age];
 if (!from || !to) return null;
 return Object.fromEntries(KEYS.map((k, i) => [k, to[i] - from[i]]));
}

// ▲3 for a 0–100 bar, ▲$1,200 for money; teal when it is good news (less debt is)
export function deltaHTML(key, by) {
 const n = Math.round(Math.abs(by || 0));
 if (!n) return '';
 const up = by > 0;
 return `<span class="delta ${up !== (key === 'debt') ? 'up' : 'down'}">${up ? '▲' : '▼'}${STATS.has(key) ? n : '$' + n.toLocaleString(numberLocale)}</span>`;
}

const listHTML = ch => { const name = names(); return KEYS.filter(k => deltaHTML(k, ch[k])).map(k => `<span class="delta-item">${name[k]} ${deltaHTML(k, ch[k])}</span>`).join(''); };

export function yearChangeHTML(l) {
 const ch = yearChanges(l);
 if (!ch) return '';
 return `<section class="year-change"><span class="year-change-kicker">${tr('今年的变化')}</span>${listHTML(ch) || `<span class="delta-item">${tr('数字没有变化')}</span>`}</section>`;
}

// one line above each finished year in the life story
export function yearLineHTML(l, age) {
 const ch = yearChanges(l, age), list = ch && listHTML(ch);
 return list ? `<li class="feed-year"><b>${tr('{age} 岁这一年的变化', { age })}</b>${list}</li>` : '';
}
