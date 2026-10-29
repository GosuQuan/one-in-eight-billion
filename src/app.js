import {
  COUNTRIES, DESTINATIONS, STOCKS, STOCK_RISKS, PURCHASES,
  createLife, upgradeLife, advanceYear, choose, setFocus, summarize,
  netWorth, investedValue, invest, withdraw, investStocks, sellStock,
  buyHouse, buyCar, buyItem, travel, travelCost, takeLoan, repayDebt
} from './engine.js';
import { escape as e, worldMap, portrait } from './art.js';
import { scene } from './scene.js';
import { systemAction, getHousehold, getSceneState } from './life-systems.js';
import { worldHTML as worldPanel, choiceResultHTML as resultPanel, familyHTML as familyPanel, systemsDialogHTML } from './system-ui.js';
import { gachaCard, avatarSVG } from './art.js';
const $ = s => document.querySelector(s);
const KEY = 'one-in-eight-demo:v1';
const app = $('#app'), overlay = $('#overlay');
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let store = read();
let prefs = { era: 'now', mode: 'birth', pace: 'normal', ...store.prefs };
let life = store.current ? upgradeLife(store.current) : null;
let history = Array.isArray(store.history) ? store.history.map(upgradeLife) : [];
let view = 'home', paused = false, auto = false, speed = 1, music = false, modalKind = '', lastFocus, archived = false;
let gachaCountry = null, gachaFlipped = false;
let investTab = 'overview', travelCompanion = 'solo';
let startTime = Date.now(), stepTime = 0, toastTimer, timer, audio, audioTimer;
const focusNames = { study: '学习', work: '事业', health: '健康', family: '家人', joy: '体验生活' };
const statNames = { health: ['健康', '#4b897b'], happiness: ['幸福', '#c0a260'], knowledge: ['知识', '#638e9b'], social: ['人际', '#b37380'] };
const eraNames = { past: '过去的世界', now: '现在的世界', future: '未来的世界', any: '哪个世界都好' };
const num = n => Math.round(Number(n) || 0).toLocaleString('zh-CN');
const money = n => `${Number(n) < 0 ? '-' : ''}$${num(Math.abs(Number(n) || 0))}`;
const pct = n => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
const countryOf = c => typeof c === 'object' ? c : COUNTRIES.find(x => x.id === c) || COUNTRIES[0];
const nameOf = n => typeof n === 'object' ? n.full || n.name || '' : n || '';
const save = () => { store = { ...store, prefs, current: archived ? store.current : life, history }; try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { toast('浏览器暂时无法保存，请导出人生记录。'); } };
const homeLink = `<button class="wordmark" data-action="home" aria-label="返回首页">80亿分之<em>1</em></button>`;
const footer = () => `<footer class="footer section-rule"><span>80亿分之1 <span style="display:inline">© ${new Date().getFullYear()}</span></span><span>灵感来自 <a href="https://1in8b.life/zh-hans/" target="_blank" rel="noopener">1in8b.life ↗</a> · <button class="plain" data-action="about">关于</button> · <a href="https://github.com/GosuQuan/one-in-eight-billion" target="_blank" rel="noopener">GitHub ↗</a></span></footer>`;
const nav = () => `<nav class="site-nav">${homeLink}<div class="nav-links"><button class="plain" data-action="history">前世纪录 <span style="font:10px monospace">${history.length ? String(history.length).padStart(2,'0') : ''}</span></button><button class="plain nav-extra" data-action="about">关于人生</button><span class="tiny">简体中文</span><button class="plain theme" data-action="theme" aria-label="切换深色模式">◐</button></div></nav>`;

function renderHome() {
 if (archived) { life = store.current || null; archived = false; }
 if (life) upgradeLife(life);
 view = 'home';
 const odds = [['印度',17.6],['中国',6.7],['尼日利亚',5.7],['巴基斯坦',5.2],['印度尼西亚',3.4],['刚果民主共和国',3.3]];
 app.innerHTML = `<div class="wrap">${nav()}<main>
  <section class="hero"><div class="hero-text"><div class="eyebrow"><span class="dot"></span> ONE IN EIGHT BILLION <span style="margin-left:8px">人生模拟</span></div>
   <h1><span>80亿</span><span class="title-bottom">分之<em>1</em></span></h1>
   <p class="lede">就在此刻，每秒都有新的生命降临。<br>随机出生，读书、工作、恋爱，投资、旅行、经历意外，<br>把世界交给偶然，把选择留给自己。</p>
   <div class="counters"><div class="counter"><strong id="birth-counter">0</strong><span>打开页面后，世界上新生的婴儿</span></div><div class="counter"><strong id="death-counter">0</strong><span>同一刻，向世界告别的人</span></div></div>
   <p class="live-line"><i class="live-dot"></i>每一段看似普通的人生，都只有一次。</p></div>
   <div class="hero-right">${worldMap()}<div class="odds paper"><h2>如果你是此刻出生的婴儿</h2><p class="tiny">全球出生分布参考 · 联合国《世界人口展望2024》</p>${odds.map(([n,v])=>`<div class="odds-row"><span>${n}</span><div class="track"><i style="width:${v/17.6*100}%"></i></div><span class="percent">${v.toFixed(1)}%</span></div>`).join('')}<div class="odds-row"><span>世界其他地方</span><div class="track"><i style="width:100%;opacity:.35"></i></div><span class="percent">58.1%</span></div><button class="text-link" data-action="countries">探索 ${COUNTRIES.length} 个国家的出生资料 <span class="arrow">↗</span></button></div></div></section>
  <section class="settings section-rule" aria-label="人生模拟设置"><div><span class="label">01 / 出生的世界</span><div class="seg">${Object.entries(eraNames).map(([k,v])=>`<button data-pref="era" data-value="${k}" class="${prefs.era===k?'active':''}" aria-pressed="${prefs.era===k}">${v.replace('的世界','')}</button>`).join('')}</div><p class="hint">${{past:'回到 1970 年。用另一代人的起点，重新认识世界。',now:'从 2026 年开始，在当下的世界里走完一生。',future:'来到 2050 年。医疗与教育条件使用简化的未来假设。',any:'让时代也成为一次随机的相遇。'}[prefs.era]}</p></div><div><span class="label">02 / 出生地的抽选方式</span><div class="seg"><button data-pref="mode" data-value="birth" class="${prefs.mode==='birth'?'active':''}" aria-pressed="${prefs.mode==='birth'}">此刻出生的婴儿</button><button data-pref="mode" data-value="pop" class="${prefs.mode==='pop'?'active':''}" aria-pressed="${prefs.mode==='pop'}">现在活着的80亿人</button></div><p class="hint">分别按出生人数或人口比例抽选，人生都从 0 岁开始。</p></div><div><span class="label">03 / 人生播放节奏</span><div class="seg">${[['slow','慢慢读'],['normal','刚刚好'],['fast','快一些']].map(([k,v])=>`<button data-pref="pace" data-value="${k}" class="${prefs.pace===k?'active':''}" aria-pressed="${prefs.pace===k}">${v}</button>`).join('')}</div><p class="hint">每年约 2 秒，可随时暂停、加速，或手动前进。</p></div></section>
  <div class="birth-actions"><button class="cta" data-action="new">出生 <span>↗</span></button>${life&&!life.dead?'<button class="ghost" data-action="resume">继续这一生 →</button>':''}<p class="hint">不必做好准备，人生就这样开始了。</p><span class="spacer"></span><button class="plain music-toggle ${music?'music-on':''}" data-action="music"><span class="round-icon">♫</span>${music?'关闭音乐':'轻柔的音乐'}</button></div>
  <p class="disclaimer"><span>命运有偶然，选择有分量。游戏包含疾病、失业、市场波动与自然离世等人生事件。</span><span>无需注册 · 进度只保存在你的浏览器</span></p>
  <section class="intro-notes section-rule"><div><span class="num">01</span><h3>没有人选择自己的起点</h3><p>从不同的国家、家庭和时代开始。你无法决定出身，但可以决定如何回应生活。</p></div><div><span class="num">02</span><h3>在转弯处，停一停</h3><p>升学、工作、恋爱、健康、家庭。除了固定的成长节点，每年还可能有意外来敲门。</p></div><div><span class="num">03</span><h3>钱、时间和人，都要安放</h3><p>把现金放进存款、基金或股票，也可能亏损；攒钱去旅行、买房、买保险，或把钱留给家人。</p></div></section>
  ${history.length?historyHTML():''}</main>${footer()}</div>`;
 updateCounters();
}

function historyHTML(){return `<section class="history section-rule" id="history"><div class="section-heading"><h2>前世纪录</h2><span class="tiny">${history.length} 段曾经走过的人生 · 保存在此浏览器</span></div><div class="history-list">${history.map((l,i)=>`<button class="history-card paper" data-history="${i}"><h3>${e(l.name)}</h3><p>${e(l.country.flag)} ${e(l.country.name)} · ${l.birthYear} — ${l.birthYear+l.age}</p><div class="ribbon">${l.age} 岁 · ${e(l.job || '平凡而独特的一生')} · ${money(netWorth(l))} <span class="arrow">→</span></div></button>`).join('')}</div></section>`;}

function renderBirth(){
 view='birth';const c=life.country;
 app.innerHTML=`<div class="wrap">${nav()}<main class="birth-wrap"><button class="back" data-action="home">← 回到世界</button><div class="cert paper"><div class="cert-band"><b>出生登记</b><small>NO. ${e(String(life.id).slice(-10).toUpperCase())}</small></div><div class="cert-body"><div class="cert-watermark">仅此一生</div><div class="avatar-hero" style="margin:0 auto 18px">${avatarSVG(life,{size:96})}<div class="hero-name">${e(life.name)}</div></div><span class="label">一个新生命的名字</span><h1>${e(life.name)}</h1><p class="cert-story">${e(life.log[0]?.text || `你在${c.name}的${c.city}出生了。窗外的世界很大，而你的人生才刚刚开始。`)}</p><div class="cert-fields">${[['出生地',c.flag+' '+c.name],['出生年份',life.birthYear+' 年'],['性别',life.sex],['城市',c.city],['当地平均寿命',c.life+' 岁'],['家庭起点',life.family?.background || '普通家庭']].map(([k,v])=>`<div class="cert-field"><span>${k}</span><strong>${e(v)}</strong></div>`).join('')}</div><p class="cert-quote">世界有八十亿人。<br>从此刻起，你是其中独一无二的一个。</p><div class="cert-companions">与你在同一秒出生的人<div class="people">${life.companions.map(p=>{const c=countryOf(p.country);return `<span>${e(c.flag)} ${e(nameOf(p.name))}</span>`}).join('')}</div></div></div><div class="cert-foot"><span class="tiny">你无法选择起点，<br>但故事还等着你来写。</span><button class="cta" data-action="begin">开始这一生 <span>→</span></button></div></div></main>${footer()}</div>`;
 window.scrollTo(0,0);
}

const statHTML=()=>Object.entries(statNames).map(([k,[label,color]])=>`<div class="stat"><div class="stat-label"><span>${label}</span><b>${Math.round(life.stats[k])}</b></div><div class="stat-track"><i style="width:${life.stats[k]}%;background:${color}"></i></div></div>`).join('');
const lifeGrid=()=>Array.from({length:110},(_,i)=>`<span class="${i<life.age?'lived':i===life.age?'now':''}" title="${i} 岁" aria-label="${i}岁${i<life.age?'，已走过':''}"></span>`).join('');
const companionsHTML=()=>life.companions.map(p=>{const c=countryOf(p.country);const deathAge=p.deathAge??p.lifespan??p.life??85;const passed=life.age>=deathAge;return `<div class="companion ${passed?'passed':''}"><span class="flag">${e(c.flag)}</span><div class="info"><div class="name">${e(nameOf(p.name))}</div><p>${e(c.name)} · ${passed?`${deathAge} 岁，已告别`:`${life.age} 岁，仍在生活`}</p></div><i class="alive-dot"></i></div>`;}).join('');
const feedHTML=()=>[...life.log].reverse().slice(0,40).map(l=>`<li class="feed-item ${e(l.type)}"><span class="feed-age">${({event:'✦ ',market:'↗ ',travel:'✈ ',family:'♡ ',finance:'$ ',consequence:'· '}[l.type]||'')}${l.age} 岁 / ${l.year || life.birthYear+l.age}</span><div class="feed-title">${e(l.title)}</div><p class="feed-text">${e(l.text)}</p></li>`).join('');
const familyHTML=()=>familyPanel(life);
const worldHTML=()=>worldPanel(life);
const choiceResultHTML=()=>resultPanel(life);
const curveHTML=()=>{const x=Math.min(210,life.age/110*210);return `<svg class="curve" viewBox="0 0 230 100" aria-label="简化的存活概率示意曲线"><path d="M10 10V85H220" fill="none" stroke="var(--line)"/><path d="M10 14C55 14 100 15 130 29S175 75 220 84" fill="none" stroke="var(--teal)" stroke-width="2"/><path d="M${10+x} 12V85" stroke="var(--wine)" stroke-dasharray="3 3"/><text x="12" y="98" font-size="8" fill="var(--muted)">0岁</text><text x="194" y="98" font-size="8" fill="var(--muted)">110岁</text></svg><p class="tiny">形状仅作示意，不代表真实生命表。</p>`;};
const assetHTML=()=>`<div class="asset-mini"><div><span>现金</span><b>${money(life.money)}</b></div><div><span>投资</span><b>${money(investedValue(life))}</b></div><div><span>负债</span><b class="${life.debt>0?'warn':''}">${money(life.debt)}</b></div></div>`;
const marketHTML=()=>{const m=life.market||{index:100,lastReturn:0,regime:'平稳'};return `<div class="market-strip"><div><span>市场指数</span><b>${Number(m.index||100).toFixed(1)}</b></div><div><span>今年</span><b class="${m.lastReturn>=0?'up':'down'}">${pct(m.lastReturn||0)}</b></div><div><span>状态</span><b>${e(m.regime||'平稳')}</b></div></div>`;};
const wealthChartHTML=()=>{const p=life.netWorthHistory.slice(-30);if(p.length<2)return '';const vals=p.map(x=>x.value),lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||1;const pts=p.map((x,i)=>`${(i/(p.length-1)*220+5).toFixed(1)},${(50-(x.value-lo)/span*40).toFixed(1)}`).join(' ');return `<svg class="wealth-chart" viewBox="0 0 230 58" role="img" aria-label="近年净资产变化"><path d="M5 52H225" fill="none" stroke="var(--line)"/><polyline points="${pts}" fill="none" stroke="var(--teal)" stroke-width="2"/><circle cx="${(p.length-1)/(p.length-1)*220+5}" cy="${(50-(vals.at(-1)-lo)/span*40).toFixed(1)}" r="2.5" fill="var(--wine)"/></svg><p class="tiny">近年净资产变化</p>`;};
const travelHTML=()=>`<div class="travel-list">${life.travels.length?life.travels.slice(-3).reverse().map(t=>`<div class="travel-item"><span>${e(t.flag)}</span><div><b>${e(t.place||t.name)}</b><small>${t.age}岁 · ${e(t.companion==='solo'?'独自':t.companion==='family'?'与家人':t.companion==='partner'?'与伴侣':'与朋友')} · ${money(t.cost)}</small></div></div>`).join(''):'<p class="empty-small">还没有出过远门。攒一点钱，去看看别处的生活。</p>'}</div>`;
const holdingHTML=()=>{const rows=life.holdings.map(h=>{const s=STOCKS.find(x=>x.symbol===h.symbol),p=life.market.stocks[h.symbol]?.price||0;return `<div class="holding"><span>${e(s?.name||h.symbol)}</span><b>${h.shares.toFixed(2)} 股 · ${money(h.shares*p)}</b></div>`;});return rows.length?rows.join(''):'<p class="empty-small">还没有持有股票。</p>';};

function renderLife(){
 view='life';const c=life.country;
 app.innerHTML=`<header class="topbar"><div class="wrap">${homeLink}<div class="age-display"><div class="age-number">${life.age}<small>岁</small></div><div class="age-year">${life.birthYear+life.age} 年<div class="year-track"><i style="width:${life.age/110*100}%"></i></div></div></div><div class="controls"><button class="ghost" data-action="pause" aria-pressed="${paused}">${paused?'▶ 继续':'Ⅱ 暂停'}</button><div class="speed-group" role="group" aria-label="播放速度">${[1,2,4,8].map(s=>`<button data-speed="${s}" class="${speed===s?'active':''}" aria-pressed="${speed===s}">${s}×</button>`).join('')}</div><button class="ghost" data-action="next">下一年 ›</button><button class="ghost ${auto?'active':''}" data-action="auto" aria-pressed="${auto}">自动抉择</button><button class="ghost" data-action="invest">投资</button><button class="ghost" data-action="travel">旅行</button><button class="ghost" data-action="systems">家与人生</button><button class="plain theme" data-action="menu" aria-label="更多选项">⋯</button></div></div></header>
 <main class="wrap">${worldHTML()}<div class="life-layout">
  <aside class="column">
   <section class="panel identity"><div class="id-band"><span>${e(c.flag)} ${e(c.name)}</span><span>人生档案</span></div><div class="id-body">${avatarSVG(life,{size:84})}<div class="id-info"><h2>${e(life.name)}</h2><p>${e(life.sex)} · ${life.birthYear} 年生 · ${life.age} 岁</p><p>${e(c.city)} · ${e(life.education || '尚未入学')}</p><p>${e(life.job || '还在慢慢长大')}</p></div></div><div class="mrz">LIFE&lt;${e(c.id)}&lt;${String(life.birthYear)}&lt;${e(String(life.id).slice(-12))}<br>ONE&lt;IN&lt;EIGHT&lt;BILLION&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div></section>
   <section class="panel stats-panel"><h3>此刻的你 <small>0 — 100</small></h3>${statHTML()}<div class="money-block"><span class="tiny">净资产 · 购买力平价美元</span><strong class="balance">${money(netWorth(life))}</strong>${assetHTML()}<p class="tiny">年收入 ${money(life.income)} · ${e(life.job || '还没有职业')}</p><div class="money-actions"><button class="ghost sm" data-action="invest">投资 / 资产</button><button class="ghost sm" data-action="travel">去旅行</button></div></div></section>
   <section class="panel family-panel"><h3>家人与生活 <small>与你相连的人</small></h3>${familyHTML()}</section>
  </aside>
  <div class="column">
   ${choiceResultHTML()}
   <section class="panel scene-panel">${scene(life)}</section>
   <section class="panel focus-panel"><h3>今年的重心 <small>每一种选择，都有自己的意义</small></h3><p class="life-status">${e(life.job || '成长中')} · ${e(life.education || '探索世界')} · ${life.partner?'有爱相伴':'按照自己的步调生活'}</p><div class="focus-chips">${Object.entries(focusNames).map(([k,n])=>`<button class="focus-chip ${life.focus===k?'active':''}" data-focus="${k}" aria-pressed="${life.focus===k}">${{study:'⌘',work:'◇',health:'＋',family:'♡',joy:'☼'}[k]} ${n}</button>`).join('')}</div></section>
   <section class="panel feed-panel"><h3>人生纪录 <small>最新的一页，写在最前面</small></h3><ol class="feed">${feedHTML()}</ol></section>
  </div>
  <aside class="column">
   <section class="panel"><h3>同一秒出生的人 <small>和你一起长大</small></h3>${companionsHTML()}</section>
   <section class="panel"><h3>市场与资产 <small>${e(life.market?.regime||'平稳')}</small></h3>${marketHTML()}${wealthChartHTML()}${assetHTML()}<div class="holding-list">${holdingHTML()}</div><button class="text-link" data-action="invest">管理投资 <span class="arrow">→</span></button></section>
   <section class="panel"><h3>旅行足迹 <small>${life.travels.length} 次出发</small></h3>${travelHTML()}<button class="text-link" data-action="travel">计划一次旅行 <span class="arrow">→</span></button></section>
   <section class="panel"><h3>人生地图 <small>一格 = 一年</small></h3><div class="life-grid">${lifeGrid()}</div><div class="grid-legend"><span>已走过 ${life.age} 年</span><span>此刻 <i style="color:var(--wine)">■</i></span></div></section>
   <section class="panel country-panel"><h3>${e(c.flag)} ${e(c.name)} <small>目前居住地</small></h3><dl class="country-dl"><div><dt>平均寿命参考</dt><dd>${c.life} 岁</dd></div><div><dt>人均 GDP（PPP）</dt><dd>${money(c.gdp)}</dd></div><div><dt>地区</dt><dd>${e(c.region)}</dd></div><div><dt>世界</dt><dd>${eraNames[life.era] || '现在的世界'}</dd></div></dl><p class="tiny" style="margin-top:14px">你的每一次选择，都在这些数字之外留下痕迹。</p></section>
  </aside>
 </div><div class="life-bottom"><span><i class="live-dot" style="display:inline-block;margin-right:6px"></i>${paused?'时间暂停，人生可以慢慢读。':auto?'自动抉择中，静静看一生展开。':'时间向前，故事还在继续。'} · 已自动保存</span><button class="plain" data-action="note">✎ 写下一点想法</button></div></main>`;
 if(life.pending && !auto) showChoice();
}
function updateCounters(){const secs=(Date.now()-startTime)/1000;if($('#birth-counter'))$('#birth-counter').textContent=num(secs*4.18);if($('#death-counter'))$('#death-counter').textContent=num(secs*1.95);}
function step(){
 if(!life||life.dead||view!=='life')return;
 if(life.pending){if(auto){choose(life,Math.floor(Math.random()*life.pending.options.length));save();renderLife();}else showChoice();return;}
 advanceYear(life);save();
 if(life.dead){finish();return;}
 renderLife();
}
function finish(){
 if(!history.some(l=>l.id===life.id)){history.unshift(JSON.parse(JSON.stringify(life)));history=history.slice(0,30);}
 save();closeModal();renderEnding();window.scrollTo(0,0);
}
function renderEnding(){
 view='ending';const c=life.country;const important=life.log.filter(l=>l.type==='consequence'||l.type==='travel'||l.type==='market'||l.age===0||l.type==='death');const chosen=important.length>2?important:life.log;
 app.innerHTML=`<div class="wrap">${nav()}<main class="ending paper"><header class="ending-header"><div class="eyebrow"><span class="dot"></span> A LIFE, ONCE LIVED</div><h1>${e(life.name)}</h1><div class="years">${life.birthYear} — ${life.birthYear+life.age}</div><p class="epitaph">从${e((life.birthCountry||c).name)}出发，一个生命用 ${life.age} 年写完了自己的故事。<br>${e(life.deathCause || '生命最终自然走到了终点')}。<br>没有哪一生是标准答案，而这一生，曾经真实地属于你。</p></header>${scene(life,{ending:true})}<section class="ending-metrics six"><div><strong>${life.age}</strong><span>走过的年岁</span></div><div><strong>${life.log.filter(l=>l.type==='consequence').length}</strong><span>做过的重要选择</span></div><div><strong>${life.travels.length}</strong><span>次出发旅行</span></div><div><strong>${money(netWorth(life))}</strong><span>最后的净资产</span></div><div><strong>${life.children?.length || 0}</strong><span>下一代的生命</span></div><div><strong>${Math.round(life.stats.happiness)}</strong><span>最终的幸福感</span></div></section><div class="ending-body"><div class="section-heading"><h2>这一生，值得记住的片刻</h2><span class="tiny">${e(c.flag)} ${e(c.name)}</span></div><div class="record-list">${chosen.filter((_,i,a)=>i===0||i===a.length-1||i%Math.max(1,Math.floor(a.length/8))===0).slice(0,10).map(l=>`<article class="record"><small>${l.age} 岁 · ${life.birthYear+l.age}</small><strong>${e(l.title)}</strong><p>${e(l.text)}</p></article>`).join('')}</div>${life.travels.length?`<div class="ending-travels"><span class="label">去过的地方</span><div>${life.travels.map(t=>`<span class="travel-pill">${e(t.flag)} ${e(t.place||t.name)}</span>`).join('')}</div></div>`:''}<div class="ending-note">${life.farewell?e(life.farewell):'“如果能对这一生的自己说一句话，你想说什么？”'}</div><button class="text-link" data-action="farewell">${life.farewell?'修改留给自己的话':'✎ 留给这一生一句话'} →</button><p class="tiny" style="margin-top:22px">人生记录已保存在此浏览器。你可以导出完整记录，或下载一张人生纪念卡。</p></div><div class="ending-actions"><button class="cta" data-action="new">再活一次 <span>↗</span></button><button class="ghost" data-action="card">↓ 人生纪念卡</button><button class="ghost" data-action="export">↓ 完整记录</button><button class="ghost" data-action="home">回到世界</button></div></main>${footer()}</div>`;
}

function showModal(html,kind='info',wide=false){
 if(!modalKind)lastFocus=document.activeElement;
 modalKind=kind;overlay.innerHTML=`<section class="dialog ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${kind==='choice'?'':'<button class="dialog-close" data-action="close" aria-label="关闭弹窗">×</button>'}${html}</section>`;overlay.hidden=false;document.body.style.overflow='hidden';
 setTimeout(()=>overlay.querySelector('textarea,button')?.focus(),30);
}
function closeModal(){overlay.hidden=true;overlay.innerHTML='';modalKind='';document.body.style.overflow='';lastFocus?.isConnected&&lastFocus.focus();stepTime=Date.now();}
function showChoice(){if(!life.pending||modalKind==='choice')return;const p=life.pending;showModal(`<div class="dialog-kicker">${life.age} 岁 / ${life.birthYear+life.age} · ${p.kind==='event'?'一件没有预料到的事':p.kind==='system'?'人生还在继续 · '+(p.system||'生活安排'):'人生的岔路口'}</div><h2 id="dialog-title">${e(p.title)}</h2><p>${e(p.text)}</p><div class="choice-list">${p.options.map((o,i)=>`<button class="choice-btn" data-choice="${i}"><strong>${e(o.label)} <span>↗</span></strong><small>${e(o.description || '选择属于你的方向')}</small></button>`).join('')}</div><p class="tiny" style="margin:16px 0 0">没有最优解，只有你愿意走的路。选择后时间会继续。</p>`,'choice');}

function noteDialog(farewell=false){showModal(`<div class="dialog-kicker">${farewell?'写给这一生':'在时间里，暂停片刻'}</div><h2 id="dialog-title">${farewell?'你想对自己说些什么？':'把此刻的想法，留在这里。'}</h2><p>只保存在你的浏览器里，不会发布到任何地方。</p><textarea id="note-text" maxlength="300" placeholder="写下一句话……" aria-label="你的想法">${e(farewell?life.farewell||'':'')}</textarea><button class="cta" data-action="${farewell?'save-farewell':'save-note'}">留下这句话 →</button>`,farewell?'farewell':'note');}

function countryDialog(){const sorted=[...COUNTRIES].sort((a,b)=>b.birth-a.birth);const total=COUNTRIES.reduce((s,c)=>s+c.birth,0);showModal(`<div class="dialog-kicker">世界很大，起点各不相同</div><h2 id="dialog-title">${COUNTRIES.length} 个国家的出生资料</h2><p>出生与人口权重、寿命及人均 GDP 使用约数。出生地按照所列国家的出生人口权重抽取。</p><table><thead><tr><th>国家 / 地区</th><th>抽样权重</th><th>寿命</th><th>GDP / PPP</th></tr></thead><tbody>${sorted.map(c=>`<tr><td>${e(c.flag)} ${e(c.name)}</td><td>${(c.birth/total*100).toFixed(1)}%</td><td>${c.life} 岁</td><td>${money(c.gdp)}</td></tr>`).join('')}</tbody></table>`,'countries',true);}

function aboutDialog(){showModal(`<div class="dialog-kicker">关于</div><h2 id="dialog-title">八十亿种可能，<br>仅此一次的人生。</h2><p>你会随机出生在 ${COUNTRIES.length} 个国家之一，经历成长、教育、事业、亲密关系、投资、旅行和晚年，最终走完一生。选择和年度重心会影响状态、收入与结局；每年还可能遇到随机事件。</p><p>可以随时打开「投资 / 资产」配置存款、指数基金、债券、不动产和股票，或买手机、电脑、车与房子；也可以打开「旅行」选择目的地和同行的人，或在「家与人生」里安排育儿、宠物、创业与迁居。</p><p>进度自动保存于当前浏览器。不需要账户，可随时暂停、逐年推进，或开启自动抉择。</p><p class="tiny">操作：空格暂停 / 继续，方向右键前进一年。弹窗打开时，时间会暂停。</p>`);}

function newLife(){if(life&&!life.dead&&view!=='birth'){showModal(`<div class="dialog-kicker">另一种可能</div><h2 id="dialog-title">准备开始新的人生？</h2><p>当前这段人生还在继续。重新出生会覆盖当前的进度，已经完成的前世纪录会保留。</p><div class="dialog-actions"><button class="cta" data-action="confirm-new">开始新的人生 →</button><button class="ghost" data-action="close">继续这一生</button></div>`);return;}startNew();}
function startNew(){
 closeModal();archived=false;
 const seed = (prefs.era||'now')+'|'+(prefs.mode||'birth')+'|'+Date.now();
 life = createLife({era:prefs.era,mode:prefs.mode,seed});
 gachaCountry = life.country; gachaFlipped = false;
 paused=false;auto=false;speed=1;investTab='overview';travelCompanion='solo';save();
 view='gacha';renderGacha();
}
function renderGacha(){
 view='gacha';const c=gachaCountry||life.country;
 app.innerHTML=`<div class="wrap">${nav()}<main class="birth-wrap"><button class="back" data-action="home">← 回到世界</button>
  <div class="gacha-stage"><div class="eyebrow" style="justify-content:center"><span class="dot"></span> 命运抽卡</div>
   <h2 class="gacha-title">你在哪里出生？</h2>
   <p class="hint" style="text-align:center;margin:0 auto 22px;max-width:430px">没有人选择自己的起点。这一卡，决定你的国家、家庭与命里的空气。</p>
   <div class="gacha-card-trigger ${gachaFlipped?'gacha-glow':''}" data-gacha-card role="button" tabindex="0" aria-label="${gachaFlipped?'已揭晓出生地':'抽选出生地'}">${gachaCard(c,{revealed:gachaFlipped})}</div>
   ${gachaFlipped?`<div class="avatar-hero">${avatarSVG(life,{size:110})}<div class="hero-name">${e(life.name)}</div><div class="hero-caption">${e(c.flag)} ${e(c.name)} · ${life.sex} · 出生于 ${life.birthYear} 年</div><button class="cta" data-action="gacha-accept">这是你的一生 <span>→</span></button></div>`:`<div class="birth-actions" style="justify-content:center"><button class="cta" data-action="gacha-draw">翻开命运之卡 <span>✦</span></button><button class="ghost" data-action="gacha-redraw">换一张</button></div>`}
  </div></main>${footer()}</div>`;
 window.scrollTo(0,0);
}
function exportLife(){download(new Blob([JSON.stringify(life,null,2)],{type:'application/json'}),`人生记录-${life.name}.json`);toast('完整人生记录已导出');}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function downloadCard(){
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1280;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#edf1eb';ctx.fillRect(0,0,1000,1280);ctx.strokeStyle='#cbd4c9';ctx.strokeRect(48,48,904,1184);ctx.fillStyle='#8c2946';ctx.fillRect(48,48,904,12);
 ctx.textAlign='center';ctx.fillStyle='#8c2946';ctx.font='20px Georgia';ctx.fillText('ONE IN EIGHT BILLION',500,145);ctx.fillStyle='#263a3b';ctx.font='64px "Microsoft YaHei", sans-serif';ctx.fillText(life.name,500,280,850);
 ctx.font='32px Georgia';ctx.fillStyle='#74817b';ctx.fillText(`${life.birthYear} — ${life.birthYear+life.age}`,500,345);ctx.font='24px "Microsoft YaHei"';ctx.fillText(`${(life.birthCountry||life.country).name}出生 · ${life.sex} · ${life.age} 岁`,500,415);
 ctx.strokeStyle='#cbd4c9';ctx.beginPath();ctx.moveTo(130,475);ctx.lineTo(870,475);ctx.stroke();ctx.fillStyle='#263a3b';ctx.font='28px "Microsoft YaHei"';ctx.fillText(`走过 ${life.age} 年，成为独一无二的自己。`,500,565);ctx.font='22px "Microsoft YaHei"';ctx.fillStyle='#74817b';ctx.fillText(`最后的职业：${life.job || '生活的探索者'}`,500,630);ctx.fillText(`幸福 ${Math.round(life.stats.happiness)} / 100 · ${life.children.length} 个孩子 · ${life.travels.length} 次旅行`,500,680);
 const quote=life.farewell||'每一段普通的人生，都有自己的微光。';ctx.fillStyle='#8c2946';ctx.font='30px "Microsoft YaHei"';const chars=[...quote];let line='',lines=[];for(const ch of chars){if(ctx.measureText(line+ch).width>720){lines.push(line);line=ch;}else line+=ch;}if(line)lines.push(line);lines.slice(0,4).forEach((l,i)=>ctx.fillText(l,500,830+i*50));ctx.fillStyle='#74817b';ctx.font='18px "Microsoft YaHei"';ctx.fillText('80亿分之1 · 人生模拟',500,1140);ctx.font='16px Georgia';ctx.fillText('github.com/GosuQuan/one-in-eight-billion',500,1180);canvas.toBlob(blob=>blob&&download(blob,`人生纪念卡-${life.name}.png`));
}

function toggleMusic(){
 music=!music;
 if(music){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66];let i=0;const play=()=>{if(!music)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=notes[i++%notes.length]/2;gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.035,audio.currentTime+.2);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+2.7);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+3);};play();audioTimer=setInterval(play,1400);}catch{music=false;toast('当前浏览器无法播放音乐');}}
 else {clearInterval(audioTimer);audio?.suspend();}
 toast(music?'轻柔的音乐已开启':'音乐已关闭');if(view==='home')renderHome();
}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}

function tabsHTML(){
 return `<div class="tabs" role="tablist"><button class="${investTab==='overview'?'active':''}" data-invest-tab="overview">总览</button><button class="${investTab==='funds'?'active':''}" data-invest-tab="funds">基金 · 债券</button><button class="${investTab==='stocks'?'active':''}" data-invest-tab="stocks">股票</button><button class="${investTab==='life'?'active':''}" data-invest-tab="life">消费 · 负债</button></div>`;
}
function overviewPanel(){
 const nw=netWorth(life),inv=investedValue(life),gdp=life.country.gdp;
 return `<div class="metric-grid"><div><span>净资产</span><strong>${money(nw)}</strong></div><div><span>现金</span><strong>${money(life.money)}</strong></div><div><span>投资市值</span><strong>${money(inv)}</strong></div><div><span>负债</span><strong class="${life.debt?'warn':''}">${money(life.debt)}</strong></div></div>
 <div class="alloc"><div class="alloc-bar">${allocBar()}</div><div class="alloc-key"><span><i style="background:#367b73"></i>指数 ${money(life.investments.index)}</span><span><i style="background:#b59a5f"></i>债券 ${money(life.investments.bonds)}</span><span><i style="background:#a85d58"></i>不动产 ${money(life.investments.property)}</span><span><i style="background:#8c2946"></i>股票 ${money(stockTotal())}</span></div></div>
 ${marketHTML()}<p class="small-note">投资有风险，过去涨跌不代表未来。急用钱时可以先卖出，现金不够时生活会自动动用投资，仍不够才会变成负债。</p>
 <div class="action-row"><button class="cta" data-invest-tab="funds">配置资产 →</button><button class="ghost" data-action="travel">去旅行 →</button></div>`;
}
const stockTotal=()=>life.holdings.reduce((s,h)=>s+h.shares*(life.market.stocks[h.symbol]?.price||0),0);
function allocBar(){const parts=[['#367b73',life.investments.index],['#b59a5f',life.investments.bonds],['#a85d58',life.investments.property],['#8c2946',stockTotal()]];const total=parts.reduce((s,[,v])=>s+v,0)||1;return parts.map(([c,v])=>v?`<i style="background:${c};width:${Math.max(1,v/total*100)}%"></i>`:'').join('');}
function fundsPanel(){
 const funds=[['index','指数基金','一篮子公司，长期平均回报较高，短期会跌。'],['bonds','债券','回报低一些，波动通常更小。'],['property','不动产基金','和房产市场相关，流动性一般。']];
 return `<div class="panel-copy"><h3 class="modal-subtitle">把钱放到哪里？</h3><p class="small-note">现金留着过日子。投资部分需要时间，也可能亏损。买入和卖出各收 0.5% 手续费。</p>
 <label class="field-label" for="fund-amount">投入金额</label><div class="amount-row"><input id="fund-amount" type="number" min="10" step="100" value="${Math.max(100,Math.round(life.money*.2))}" inputmode="numeric"><span>现金 ${money(life.money)}</span></div>
 <div class="fund-list">${funds.map(([id,name,desc])=>`<div class="fund-row"><div><b>${name}</b><small>${desc}</small><em>已持有 ${money(life.investments[id])}</em></div><div class="fund-actions"><button class="ghost sm" data-fund="${id}">买入</button><button class="ghost sm" data-withdraw="${id}">卖出</button></div></div>`).join('')}</div></div>`;
}
function stocksPanel(){
 return `<div class="panel-copy"><h3 class="modal-subtitle">你愿意承担多大风险？</h3><p class="small-note">选择投入金额和风险承受程度，系统会配置相应的股票组合。保守偏向低波动行业，适度分散配置，高风险集中配置高波动行业；各档都可能亏损。持仓随每年行情变化，买入和卖出各收 0.5% 手续费。</p>
 <label class="field-label" for="stock-amount">投入金额</label><div class="amount-row"><input id="stock-amount" type="number" min="50" step="100" value="${Math.max(100,Math.round(life.money*.15))}" inputmode="numeric"><span>现金 ${money(life.money)}</span></div>
 <div class="choice-list" role="group" aria-label="风险承受选择">${STOCK_RISKS.map(r=>`<button class="choice-btn" data-stock-risk="${r.id}"><strong>${e(r.name)}投入 <span>↗</span></strong><small>${e(r.description)}</small></button>`).join('')}<button class="choice-btn" data-stock-risk="pass"><strong>不投</strong><small>保留现金，暂不增加股票持仓。</small></button></div>
 <h3 class="modal-subtitle">已有持仓</h3><div class="stock-list">${life.holdings.length?life.holdings.map(h=>{const s=STOCKS.find(x=>x.symbol===h.symbol),m=life.market.stocks[h.symbol];return `<div class="stock-row"><div class="stock-name"><b>${e(s?.name||h.symbol)}</b><small>${e(s?.sector||'股票')}</small></div><div class="stock-price"><b>${(m?.price||0).toFixed(1)}</b><small class="${m?.change>=0?'up':'down'}">${pct(m?.change||0)}</small></div><div class="stock-held"><span>${h.shares.toFixed(2)} 股</span><small>${money(h.shares*(m?.price||0))}</small></div><div class="stock-actions"><button class="ghost sm" data-stock-sell="${e(h.symbol)}">全卖</button></div></div>`;}).join(''):'<p class="empty-small">还没有持有股票。</p>'}</div></div>`;
}
function lifePanel(){
 const items=PURCHASES.map(item=>{const cost=Math.round(life.country.gdp*item.costFactor);const owned=item.once&&life.possessions.includes(item.id);return `<div class="buy-row"><div><b>${e(item.name)}</b><small>${e(item.desc)}</small></div><span>${owned?'已拥有':money(cost)}</span><button class="ghost sm" data-buy="${item.id}" ${owned?'disabled':''}>${owned?'已买':'买下'}</button></div>`;}).join('');
 const housePrice=Math.round(life.country.gdp*4.2),down=Math.round(housePrice*.2);
 return `<div class="panel-copy"><h3 class="modal-subtitle">改善生活</h3><div class="buy-list">${items}</div><div class="buy-row"><div><b>一辆二手车</b><small>周末可以开去更远的地方，每年有保养和油费。</small></div><span>${money(Math.round(life.country.gdp*.45))}</span><button class="ghost sm" data-car ${life.car?'disabled':''}>${life.car?'已拥有':'买车'}</button></div><div class="buy-row"><div><b>自己的房子</b><small>首付 20%，其余是房贷；每月固定支出，但房子会慢慢增值。</small></div><span>${life.house?'已拥有':money(down)+' 首付'}</span><button class="ghost sm" data-house ${life.house?'disabled':''}>${life.house?'已拥有':'买房'}</button></div>
 <div class="debt-box"><div><b>负债 ${money(life.debt)}</b><small>年利率 6%。可以先还一部分，或借一笔应急钱。</small></div><div class="action-row"><button class="ghost sm" data-loan>借 5,000</button><button class="ghost sm" data-repay ${life.debt<=0||life.money<=0?'disabled':''}>还 5,000</button></div></div></div>`;
}
function openInvest(tab=investTab){
 investTab=tab;
 const body=tab==='funds'?fundsPanel():tab==='stocks'?stocksPanel():tab==='life'?lifePanel():overviewPanel();
 showModal(`<div class="dialog-kicker">${life.age} 岁 · ${e(life.country.name)} · 现金 ${money(life.money)}</div><h2 id="dialog-title">投资 · 资产</h2>${tabsHTML()}<div class="invest-body">${body}</div><p class="tiny" style="margin-top:16px">市场有涨有跌，投入的钱可能变多也可能变少。</p>`,'invest',true);
}
function openTravel(){
 const companions=[['solo','独自出发'],['partner','和伴侣'],['family','和家人'],['friends','和朋友']].filter(([k])=>k==='solo'||(k==='partner'&&life.partner)||(k==='family'&&(life.partner||life.children.length))||k==='friends');
 const traveled=life.lastTravelYear===life.age;
 showModal(`<div class="dialog-kicker">${life.age} 岁 · 现金 ${money(life.money)}</div><h2 id="dialog-title">去旅行</h2><p>离开熟悉的地方几天，看看别处的人怎样生活。旅行会花掉一笔钱，也会留下记忆。</p><div class="companion-picker">${companions.map(([k,n])=>`<button class="focus-chip ${travelCompanion===k?'active':''}" data-companion="${k}">${n}</button>`).join('')}</div>${traveled?'<p class="small-note">今年已经出过远门了，明年再计划吧。</p>':''}<div class="travel-grid">${DESTINATIONS.map(d=>{const cost=travelCost(life,d.id,travelCompanion);const short=Math.max(0,cost-life.money);const disabled=traveled||life.age<5;return `<article class="travel-card ${disabled?'disabled':''}"><div class="travel-flag">${d.flag}</div><div><h3>${e(d.name)}</h3><small>${e(d.blurb)}</small></div><div class="travel-meta"><span>${e(d.region)} · ${d.happiness} 幸福</span><b>${money(cost)}</b></div><button class="ghost sm" data-travel="${d.id}" data-loan-travel="${short>0?1:0}" ${disabled?'disabled':''}>${short>0?'借钱出发':'出发'}</button></article>`;}).join('')}</div><p class="small-note">旅行价格按当地收入水平估算，同行的人越多，总花费越高。现金不足时可以选择借钱出发，代价是负债；年龄太小或今年已经出过远门时无法出发。</p>`,'travel',true);
}

app.addEventListener('click',handleClick);overlay.addEventListener('click',handleClick);
function handleClick(event){
 const b=event.target.closest('button,[data-gacha-card]');if(!b)return;
 if(b.dataset.pref){prefs[b.dataset.pref]=b.dataset.value;save();renderHome();return;}
 if(b.dataset.speed){speed=Number(b.dataset.speed);renderLife();return;}
 if(b.dataset.focus){setFocus(life,b.dataset.focus);save();renderLife();return;}
 if(b.dataset.choice!==undefined){const selected=life.pending?.options[Number(b.dataset.choice)];choose(life,Number(b.dataset.choice));life.lastChoiceResult={age:life.age,title:selected?.label||'新的选择',text:life.log.at(-1)?.text||'',id:Date.now()};closeModal();save();if(life.dead)finish();else renderLife();return;}
 if(b.dataset.system){const action=b.dataset.system;closeModal();const r=systemAction(life,action,{});save();renderLife();toast(r?.message||'生活有了新的安排');return;}
 if(b.matches('[data-gacha-card]')&&view==='gacha'&&!gachaFlipped){gachaFlipped=true;renderGacha();return;}
 if(b.dataset.action==='gacha-draw'){gachaFlipped=true;renderGacha();return;}
 if(b.dataset.action==='gacha-redraw'){life=createLife({era:prefs.era,mode:prefs.mode,seed:Math.random().toString(36).slice(2)});gachaCountry=life.country;gachaFlipped=false;save();renderGacha();toast('命运重新洗牌……');return;}
 if(b.dataset.action==='gacha-accept'){renderBirth();window.scrollTo(0,0);return;}
 if(b.dataset.history!==undefined){archived=true;life=JSON.parse(JSON.stringify(history[Number(b.dataset.history)]));renderEnding();window.scrollTo(0,0);return;}
 if(b.dataset.investTab){openInvest(b.dataset.investTab);return;}
 if(b.dataset.fund){const amount=Number($('#fund-amount')?.value)||Math.round(life.money*.2);const r=invest(life,b.dataset.fund,amount);save();toast(r.message);openInvest('funds');return;}
 if(b.dataset.withdraw){const amount=Number($('#fund-amount')?.value)||Math.round(life.investments[b.dataset.withdraw]*.2);const r=withdraw(life,b.dataset.withdraw,amount);save();toast(r.message);openInvest('funds');return;}
 if(b.dataset.stockRisk){const amount=Number($('#stock-amount')?.value);const r=investStocks(life,b.dataset.stockRisk,amount);save();toast(r.message);openInvest('stocks');return;}
 if(b.dataset.stockSell){const h=life.holdings.find(h=>h.symbol===b.dataset.stockSell);const r=sellStock(life,b.dataset.stockSell,h?.shares||0);save();toast(r.message);openInvest('stocks');return;}
 if(b.dataset.buy){const r=buyItem(life,b.dataset.buy);save();toast(r.message);openInvest('life');return;}
 if(b.dataset.car!==undefined){const r=buyCar(life);save();toast(r.message);openInvest('life');return;}
 if(b.dataset.house!==undefined){const r=buyHouse(life);save();toast(r.message);openInvest('life');return;}
 if(b.dataset.loan!==undefined){const r=takeLoan(life,5000);save();toast(r.message);openInvest('life');return;}
 if(b.dataset.repay!==undefined){const r=repayDebt(life,5000);save();toast(r.message);openInvest('life');return;}
 if(b.dataset.companion){travelCompanion=b.dataset.companion;openTravel();return;}
 if(b.dataset.travel){const cost=travelCost(life,b.dataset.travel,travelCompanion);if(b.dataset.loanTravel==='1'&&cost>life.money){const loan=takeLoan(life,cost-life.money);if(!loan.ok){toast(loan.message);return;}}const r=travel(life,b.dataset.travel,travelCompanion);save();toast(r.ok?`${r.message}，回来了`:`${r.message}`);openTravel();return;}
 const action=b.dataset.action;
 switch(action){
  case 'home':closeModal();save();renderHome();window.scrollTo(0,0);break;
  case 'new':newLife();break;
  case 'confirm-new':startNew();break;
  case 'begin':view='life';paused=false;stepTime=Date.now();save();renderLife();window.scrollTo(0,0);break;
  case 'resume':paused=false;stepTime=Date.now();renderLife();window.scrollTo(0,0);break;
  case 'next':step();stepTime=Date.now();break;
  case 'pause':paused=!paused;stepTime=Date.now();renderLife();break;
  case 'auto':auto=!auto;toast(auto?'自动抉择已开启':'自动抉择已关闭');renderLife();break;
  case 'theme':store.dark=!store.dark;document.body.classList.toggle('dark',store.dark);save();break;
  case 'history':if(view!=='home')renderHome();if(history.length)$('#history')?.scrollIntoView({behavior:'smooth'});else toast('完成第一段人生后，会在这里留下记录。');break;
  case 'countries':countryDialog();break;
  case 'about':aboutDialog();break;
  case 'close':{const refresh=['invest','travel','systems'].includes(modalKind);closeModal();if(refresh&&view==='life')renderLife();break;}
  case 'note':noteDialog();break;
  case 'farewell':noteDialog(true);break;
  case 'systems':showModal(systemsDialogHTML(life),'systems',true);break;
  case 'invest':openInvest();break;
  case 'travel':openTravel();break;
  case 'save-note':{const text=$('#note-text').value.trim();if(text){life.notes ||= [];life.notes.push({age:life.age,text});save();}closeModal();toast(text?'此刻的想法已留下':'留一点空白，也很好');break;}
  case 'save-farewell':life.farewell=$('#note-text').value.trim();{const idx=history.findIndex(l=>l.id===life.id);if(idx>=0)history[idx]=JSON.parse(JSON.stringify(life));}save();closeModal();renderEnding();break;
  case 'export':exportLife();break;
  case 'card':downloadCard();break;
  case 'music':toggleMusic();break;
  case 'menu':showModal(`<div class="dialog-kicker">让人生，按你的步调前进</div><h2 id="dialog-title">暂停片刻</h2><div class="choice-list"><button class="choice-btn" data-action="invest">投资 · 看看资产</button><button class="choice-btn" data-action="travel">去旅行</button><button class="choice-btn" data-action="note">✎ 写下此刻的想法</button><button class="choice-btn" data-action="export">↓ 导出当前人生</button><button class="choice-btn" data-action="theme">◐ 切换画面明暗</button><button class="choice-btn" data-action="music">♫ ${music?'关闭':'开启'}轻柔音乐</button><button class="choice-btn" data-action="home">← 保存并回到世界</button></div>`);break;
 }
}
document.addEventListener('keydown',event=>{
 if(view==='gacha'&&event.target.closest('[data-gacha-card]')&&(event.key==='Enter'||event.code==='Space')){event.preventDefault();event.target.closest('[data-gacha-card]').click();return;}
 if(modalKind){if(event.key==='Escape'&&modalKind!=='choice')closeModal();if(event.key==='Tab'){const els=[...overlay.querySelectorAll('button,textarea,a,input')].filter(el=>!el.disabled);if(!els.length)return;if(event.shiftKey&&document.activeElement===els[0]){event.preventDefault();els.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===els.at(-1)){event.preventDefault();els[0].focus();}}return;}
 if(view!=='life'||event.target.closest('button,input,textarea,select,a'))return;
 if(event.code==='Space'){event.preventDefault();paused=!paused;stepTime=Date.now();renderLife();}else if(event.code==='ArrowRight'){event.preventDefault();step();}
});
document.addEventListener('visibilitychange',()=>{stepTime=Date.now();if(document.hidden)save();});
window.addEventListener('beforeunload',save);
document.body.classList.toggle('dark',!!store.dark);
renderHome();
timer=setInterval(()=>{updateCounters();if(view!=='life'||paused||document.hidden||modalKind)return;const duration=({slow:4000,normal:2200,fast:900}[prefs.pace]||2200)/speed;if(Date.now()-stepTime>=duration){stepTime=Date.now();step();}},150);
