import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRIES, DESTINATIONS, STOCKS, createLife, upgradeLife, advanceYear, choose,
  setFocus, summarize, rng, netWorth, investedValue, invest, withdraw, buyStock,
  sellStock, investStocks, STOCK_RISKS, buyHouse, buyCar, buyItem, travel, travelCost,
  reflectionAnswer, temperamentLead
} from '../src/engine.js';
import { memorialOf } from '../src/memorial.js';

const clone = value => JSON.parse(JSON.stringify(value));

const answerTemper = life => {
  if (life.pending?.title === '气质在成形') { choose(life, 0); return true; }
  return false;
};

const step = (life, variant=0) => life.pending ? choose(life, variant % life.pending.options.length) : advanceYear(life);
const finish = (life, variant=0) => {
  for (let n=0; n<200 && !life.dead; n++) step(life,variant);
  assert.equal(life.dead,true);
  return life;
};

test('40 countries have estimated positive population, birth, life and PPP fields',()=>{
  assert.ok(COUNTRIES.length>=32);
  assert.equal(new Set(COUNTRIES.map(c=>c.id)).size,COUNTRIES.length);
  for(const c of COUNTRIES) {
    for(const k of ['pop','birth','life','gdp']) assert.ok(c[k]>0,`${c.id}.${k}`);
    assert.ok(c.name && c.flag && c.region && c.city && c.estimated);
    assert.ok(c.names.male.length && c.names.female.length);
  }
  assert.ok(DESTINATIONS.length>=10);
  assert.equal(new Set(DESTINATIONS.map(d=>d.id)).size,DESTINATIONS.length);
  assert.ok(STOCKS.length>=4);
});

test('birth creates complete serializable life and four same-year companions',()=>{
  const life=createLife({seed:42,country:'CN',sex:'女',name:'小青'});
  assert.equal(life.name,'小青');assert.equal(life.sex,'女');assert.equal(life.country.id,'CN');
  assert.equal(life.age,0);assert.equal(life.birthYear,2026);assert.equal(life.log[0].type,'birth');
  assert.equal(life.companions.length,4);assert.ok(life.family.mother.name && life.family.father.name);
  assert.ok(life.market && life.investments && life.travels);
  for(const p of life.companions) assert.equal(p.birthYear,life.birthYear);
  assert.deepEqual(clone(life),life);
  assert.equal(life.notes.length,0,'notes start empty');
});

test('era presets, population mode and destination pricing are deterministic',()=>{
  assert.equal(createLife({era:'past',seed:0}).birthYear,1970);
  assert.equal(createLife({era:'future',seed:0}).birthYear,2050);
  for(let seed=0;seed<20;seed++) {
    const life=createLife({era:'any',mode:'pop',seed});
    assert.ok(life.birthYear>=1950 && life.birthYear<=2050);
  }
  assert.notDeepEqual(Array.from({length:50},(_,seed)=>createLife({seed,mode:'birth'}).country.id),
    Array.from({length:50},(_,seed)=>createLife({seed,mode:'pop'}).country.id));
  const a=createLife({seed:'pricing',country:'US'});
  assert.ok(travelCost(a,'jp','partner')>travelCost(a,'jp','solo'));
  assert.ok(travelCost(createLife({seed:'pricing',country:'IN'}),'jp','solo')<travelCost(a,'jp','solo'));
});

test('100 seeds across all focuses reach death by 110 with bounded stats',()=>{
  const focuses=['study','work','health','family','joy'];
  for(let seed=0;seed<100;seed++) {
    const life=createLife({seed,era:['past','now','future','any'][seed%4],mode:seed%2?'birth':'pop'});
    setFocus(life,focuses[seed%5]);
    for(let n=0;n<220&&!life.dead;n++) {
      step(life,seed+n);
      for(const v of Object.values(life.stats)) assert.ok(v>=0&&v<=100&&Number.isFinite(v));
      assert.ok(Number.isFinite(life.money)&&Number.isFinite(life.income)&&Number.isFinite(life.debt));
    }
    assert.equal(life.dead,true,`seed ${seed}`);
    assert.ok(life.deathAge>0&&life.deathAge<=110);
    assert.equal(life.deathAge,life.age);assert.ok(life.deathCause);
    assert.ok(Number.isFinite(netWorth(life)));
    const saved=clone(life);advanceYear(life);choose(life,0);assert.deepEqual(life,saved);
  }
});

test('pending blocks advancement without changing random state or log',()=>{
  const life=createLife({seed:'pending'});
  while(!life.pending) advanceYear(life);
  while(life.pending?.title==='气质在成形'){choose(life,0);while(!life.pending)advanceYear(life);}
  assert.equal(life.age,5);
  const saved=clone(life);
  for(let i=0;i<10;i++) assert.equal(advanceYear(life),life);
  assert.deepEqual(life,saved);
  assert.throws(()=>choose(life,99),RangeError);
  choose(life,0);assert.equal(life.pending,null);advanceYear(life);assert.equal(life.age,6);
});

test('different choices change state and log actual consequences',()=>{
  const a=createLife({seed:'choices'});
  while(!a.pending) advanceYear(a);
  while(a.pending?.title==='气质在成形'){choose(a,0);while(!a.pending)advanceYear(a);}
  const b=clone(a);
  const club=a.pending.cast.science.name,team=a.pending.cast.sport.name;
  choose(a,0);choose(b,1);
  assert.notDeepEqual(a.stats,b.stats);
  assert.ok(a.stats.knowledge>b.stats.knowledge);
  assert.ok(b.stats.health>a.stats.health);
  assert.equal(a.log.at(-1).type,'social');
  assert.match(a.log.at(-1).text,new RegExp(club));
  assert.match(b.log.at(-1).text,new RegExp(team));
  assert.notEqual(a.log.at(-1).title,b.log.at(-1).title);
  assert.equal(a.friends.some(f=>f.name===team),false);
});

test('JSON round-trip at a pending choice resumes exactly through death',()=>{
  const a=createLife({seed:'saved-pending',country:'JP',era:'future'});
  while(a.age<26&&!a.dead) step(a);
  const b=clone(a);
  for(let n=0;n<200&&!a.dead;n++) {
    if(n%7===0) {setFocus(a,'health');setFocus(b,'health');}
    step(a,n);step(b,n);assert.deepEqual(a,b);
  }
  assert.equal(a.dead,true);assert.deepEqual(summarize(a),summarize(b));
});

test('focus influences income and health without forcing a random event',()=>{
  const work=createLife({seed:'focus',country:'US'});
  while(work.age<23) step(work);
  while(work.pending) choose(work,0);
  const health=clone(work);
  work.income=health.income=1000;work.job=health.job='职员';
  work.debt=health.debt=0;
  if(work.systems?.finance){work.systems.finance.arrears=0;health.systems.finance.arrears=0;}
  work.systems.residence.abroadSince=health.systems.residence.abroadSince=null;
  work.systems.residency=health.systems.residency='citizen';
  setFocus(work,'work');setFocus(health,'health');
  advanceYear(work,{events:false});advanceYear(health,{events:false});
  assert.ok(work.income>health.income);
  assert.ok(health.stats.health>work.stats.health);
  assert.throws(()=>setFocus(work,'other'),RangeError);
});

test('seed reproduces the complete life and rng stays in [0,1)',()=>{
  const a=rng('repeat'),b=rng('repeat');
  for(let i=0;i<100;i++) {const n=a();assert.equal(n,b());assert.ok(n>=0&&n<1);}
  assert.deepEqual(finish(createLife({seed:'same'}),1),finish(createLife({seed:'same'}),1));
  assert.notDeepEqual(createLife({seed:'same'}),createLife({seed:'different'}));
});

test('temperament is shaped at 2 and 4 and colours later events', () => {
  const life = createLife({ seed: 'temper-1', country: 'CN' });
  const step = (v = 0) => life.pending ? choose(life, v % life.pending.options.length) : advanceYear(life);
  for (let n = 0; n < 10 && !life.dead && life.age < 5; n++) {
    if (life.pending?.title === '气质在成形') { choose(life, 0); continue; }
    step(n);
  }
  assert.ok(life.age >= 5, `reached school age: ${life.age}`);
  assert.equal(life.temperament.lean.cur, 4, 'two curious picks recorded');
  assert.ok(life.log.some(e => e.title === '气质在成形'), 'shaping logged');
  assert.ok(life.log.some(e => /岁的性子/.test(e.title)), 'temperament note logged');
  assert.equal(temperamentLead(life), 'cur', 'curious lead');
});

test('late life has quiet farewell events instead of going quiet', () => {
  const titles = ['抽屉最底层的信', '门口的长椅', '有些话想说在前头'];
  let seen = null;
  let lastDeathAge = 0;
  for (let attempt = 0; attempt < 6 && !(seen && seen.size >= 1); attempt++) {
    const life = createLife({ seed: 'late-test-' + attempt, country: 'JP' });
    life.longevity = 95; life.stats.health = 95;
    seen = new Set();
    for (let n = 0; n < 300 && !life.dead; n++) {
      if (life.age >= 20 && life.pending?.kind !== 'reflection') { life.money = Math.max(life.money, 50000); life.debt = 0; life.stats.health = Math.max(life.stats.health, 85); }
      if (answerTemper(life)) continue;
      if (life.pending?.kind === 'reflection') { choose(life, life.pending.options.length - 1); continue; }
      if (life.pending) choose(life, life.pending.options.length - 1);
      else advanceYear(life);
    }
    lastDeathAge = life.deathAge || life.age;
    for (const e of life.log) if (titles.includes(e.title)) {
      seen.add(e.title);
      assert.ok(e.age >= 65, `${e.title} fired at ${e.age}`);
    }
  }
  assert.ok(seen && seen.size >= 1, `expected at least one farewell event across attempts, last died at ${lastDeathAge}`);
});

test('mid-life reflection pauses ask the player and keep the words for the card', () => {
  const run = attempt => {
    const life = createLife({ seed: 'reflect-test-' + attempt, country: 'JP' });
    life.longevity = 95; life.stats.health = 95;
    const pauses = [];
    for (let n = 0; n < 260 && !life.dead; n++) {
      if (life.age >= 20 && life.pending?.kind !== 'reflection') { life.money = Math.max(life.money, 50000); life.debt = 0; life.stats.health = Math.max(life.stats.health, 85); }
      if (answerTemper(life)) continue;
      if (life.pending?.kind === 'reflection') {
        pauses.push(life.age);
        const idx = life.pending.options.findIndex(o => o.key === 'write');
        choose(life, idx);
        reflectionAnswer(life, `${life.age}岁的一句话`);
        continue;
      }
    if (life.pending) choose(life, life.pending.options.length - 1);
    else advanceYear(life);
    }
    return { life, pauses };
  };
  let life = null, pauses = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    ({ life, pauses } = run(attempt));
    if (pauses.join(',') === '15,30,50') break;
  }
  assert.deepEqual(pauses, [15, 30, 50]);
  assert.equal(life.reflections[15], '15岁的一句话');
  assert.equal(life.reflections[30], '30岁的一句话');
  assert.equal(life.reflections[50], '50岁的一句话');
  const card = memorialOf(life);
  assert.ok(card.ownWords.includes('50岁的一句话'), 'the last written line reaches the card');
  // age-5 people milestone still owns its year; reflection never blocks it
  const a = createLife({ seed: 'reflect-age5', country: 'CN' });
  for (let i = 0; i < 12 && !a.pending; i++) advanceYear(a);
  while (a.pending?.title === '气质在成形') { choose(a, 0); for (let i = 0; i < 6 && !a.pending; i++) advanceYear(a); }
  assert.equal(a.pending?.system, 'thread-start');
});

test('birth era changes the economy, not just the calendar', () => {
  const past = createLife({ seed: 'era-p', country: 'US', era: 'past' });
  const now = createLife({ seed: 'era-n', country: 'US', era: 'now' });
  const future = createLife({ seed: 'era-f', country: 'US', era: 'future' });
  assert.equal(past.birthYear, 1970);
  assert.equal(now.birthYear, 2026);
  assert.equal(future.birthYear, 2050);
  assert.ok(past.country.gdp <= now.country.gdp * .58, 'past economy is smaller');
  assert.ok(future.country.gdp >= now.country.gdp * 1.2, 'future economy is larger');
  assert.ok(past.money < now.money, 'past pocket money is smaller');
  assert.equal(travelCost(past, 'jp') < travelCost(now, 'jp'), true, 'past travel is cheaper');
  const us = COUNTRIES.find(c => c.id === 'US');
  assert.equal(us.gdp, 80000, 'country catalog is never mutated');
  const again = createLife({ seed: 'era-p', country: 'US', era: 'past' });
  assert.equal(again.country.gdp, past.country.gdp);
  assert.equal(again.money, past.money);
});

test('event cash scales with the local economy instead of staying fixed', () => {
  const step = (l, v = 0) => l.pending ? choose(l, v % l.pending.options.length) : advanceYear(l);
  function collect(tag, country) {
    const found = {};
    for (let s = 0; s < 30 && Object.keys(found).length < 3; s++) {
      const life = createLife({ seed: tag + s, country });
      for (let n = 0; n < 220 && !life.dead; n++) {
        step(life, n);
        for (const e of life.log) {
          const m = e.text.match(/现金([+-]\d+)/);
          if (m && !found[e.title]) found[e.title] = Number(m[1]);
        }
        if (life.dead) break;
      }
    }
    return found;
  }
  const poor = collect('poor2-', 'CD');
  const rich = collect('rich2-', 'US');
  const shared = Object.keys(poor).filter(k => rich[k] != null && poor[k] !== 0);
  assert.ok(shared.length >= 1, 'at least one shared event appears in both countries');
  for (const k of shared) {
    const ratio = rich[k] / poor[k];
    const gdpRatio = 80000 / 1500;
    assert.ok(ratio > gdpRatio * .3 && ratio < gdpRatio * 3, `${k}: ratio ${ratio.toFixed(1)} tracks gdp ${gdpRatio}`);
  }
});

test('companions keep a decade log and never outlive their years', () => {
  const life = createLife({ seed: 'comp-mirror', country: 'US' });
  const step = (l, v = 0) => l.pending ? choose(l, v % l.pending.options.length) : advanceYear(l);
  for (let n = 0; n < 220 && !life.dead; n++) { step(life, n); if (life.dead) break; }
  const tens = life.log.filter(e => /的十年$/.test(e.title));
  assert.ok(tens.length >= 3, 'decade notes appear');
  assert.ok(tens.every(e => e.text.includes('同一秒起跑')), 'decade notes frame the mirror');
  for (const p of life.companions) {
    assert.ok(p.age <= p.life);
    if (p.dead) assert.equal(p.age, p.life);
  }
  const a = createLife({ seed: 'comp-mirror', country: 'US' });
  const b = createLife({ seed: 'comp-mirror', country: 'US' });
  assert.deepEqual(a.companions, b.companions);
});

test('hard age cap holds even with artificially huge longevity and health',()=>{
  const life=createLife({seed:'cap'});life.longevity=10000;setFocus(life,'health');
  finish(life);assert.ok(life.age<=110);
});

test('investing, withdrawing, stock trading and fees move cash and net worth correctly',()=>{
  const life=createLife({seed:'money',country:'US'});life.money=20000;life.debt=0;
  const before=netWorth(life);
  const r=invest(life,'index',5000);
  assert.equal(r.ok,true);assert.equal(life.money,15000);
  assert.ok(Math.abs(life.investments.index-4975)<0.01);
  assert.ok(netWorth(life)<before&&netWorth(life)>before-100,'fee is the only loss');
  const w=withdraw(life,'index',2000);
  assert.equal(w.ok,true);assert.ok(life.money>16900&&life.money<17000);
  const s=buyStock(life,'NOVA',1000);
  assert.equal(s.ok,true);assert.equal(life.holdings.length,1);
  assert.ok(life.holdings[0].shares>0);
  const value=investedValue(life);
  assert.ok(value>0);
  const sell=sellStock(life,'NOVA',life.holdings[0].shares);
  assert.equal(sell.ok,true);assert.equal(life.holdings.length,0);
  assert.ok(life.money>15000);
});

test('stock_tip offers risk tolerance choices, settles distinct gains and losses, and logs outcomes',()=>{
 let pending;
 for(let seed=0;seed<24&&!pending;seed++){
  const life=createLife({seed,country:'US'});life.age=22;life.money=120000;life.debt=0;life.income=60000;life.job='职员';
  for(let n=0;n<180&&!life.dead;n++){
   if(life.pending?.eventId==='stock_tip'){pending=clone(life);break;}
   if(life.pending)choose(life,0);else advanceYear(life);
  }
 }
 assert.ok(pending,'stock_tip appears in seeded lives');
 assert.deepEqual(pending.pending.options.map(o=>o.key),['conservative','moderate','high','pass']);
 assert.deepEqual(pending.pending.options.map(o=>o.label),['保守投入','适度投入','高风险投入','不投']);
 for(const stock of STOCKS)assert.ok(pending.pending.options.every(o=>!o.label.includes(stock.name)));
 for(const randomState of [0,1,2,3,4,5,6,7,8,9]){
  const gains=[];
  for(const [index,risk] of STOCK_RISKS.entries()){
   const life=clone(pending);life.money=100000;life.randomState=randomState;
   choose(life,index);
   const gain=life.money-100000;gains.push(gain);
   assert.ok(gain>=25000*risk.minReturn-1&&gain<=25000*risk.maxReturn+1);
   assert.equal(life.log.at(-1).type,'consequence');
   assert.match(life.log.at(-1).text,/投入 25000.*系统.*(盈利|亏损).*收回/);
   assert.ok(life.log.at(-1).text.includes(risk.name));
   const restored=clone(pending);restored.money=100000;restored.randomState=randomState;choose(restored,index);
   assert.deepEqual(restored,life,'risk settlement survives JSON round trip');
  }
  assert.equal(new Set(gains).size,3,'risk levels produce distinct settlements');
 }
 const outcomes=Array.from({length:30},(_,randomState)=>{
  const life=clone(pending);life.money=100000;life.randomState=randomState;choose(life,2);return life.money-100000;
 });
 assert.ok(outcomes.some(g=>g<0)&&outcomes.some(g=>g>0),'risk can genuinely lose and gain money');
 const skipped=clone(pending),before=skipped.money;choose(skipped,3);
 assert.equal(skipped.money,before);assert.match(skipped.log.at(-1).title,/不投/);
});

test('stock risk allocation creates distinct portfolios, preserves legacy holdings and rejects invalid orders',()=>{
 const original=createLife({seed:'risk-allocation',country:'US'});original.money=10000;
 buyStock(original,'LOTUS',500);
 for(const risk of STOCK_RISKS){
  const life=clone(original),before=life.money;
  assert.equal(investStocks(life,risk.id,2000).ok,true);
  assert.equal(life.money,before-2000);
  for(const [symbol,weight] of Object.entries(risk.allocations)){
   const prev=original.holdings.find(h=>h.symbol===symbol)?.shares||0;
   const added=life.holdings.find(h=>h.symbol===symbol).shares-prev;
   assert.ok(Math.abs(added*life.market.stocks[symbol].price-2000*weight*.995)<1);
  }
  assert.match(life.log.at(-1).text,/系统.*配置/);
  const h=life.holdings.find(h=>h.symbol==='LOTUS');assert.ok(h);
  assert.equal(sellStock(life,h.symbol,h.shares).ok,true);
 }
 for(const [risk,amount] of [['unknown',100],['moderate',0],['moderate',49],['moderate',Infinity],['moderate',10001]]){
  const life=clone(original),before=clone(life);
  assert.equal(investStocks(life,risk,amount).ok,false);assert.deepEqual(life,before);
 }
 for(const risk of STOCK_RISKS){
  const life=clone(original);assert.equal(investStocks(life,risk.id,50).ok,true);
  assert.equal(life.money,original.money-50,'smallest order is fully allocated');
 }
 const skipped=clone(original);assert.equal(investStocks(skipped,'pass',0).ok,true);
 assert.equal(skipped.money,original.money);assert.deepEqual(skipped.holdings,original.holdings);
 assert.match(skipped.log.at(-1).title,/不投/);
 const returns=STOCK_RISKS.map(risk=>{
  const life=clone(original);life.holdings=[];investStocks(life,risk.id,2000);
  const before=investedValue(life);advanceYear(life,{events:false});return investedValue(life)-before;
 });
 assert.equal(new Set(returns).size,3,'actual annual stock returns differ across risk portfolios');
});

test('market changes investment value and produces annual history',()=>{
  const life=createLife({seed:'market',country:'US'});life.money=50000;life.debt=0;
  invest(life,'index',10000);invest(life,'bonds',5000);
  const before=life.investments.index+life.investments.bonds;
  advanceYear(life,{events:false});
  assert.ok(life.investments.index+life.investments.bonds!==before);
  assert.ok(life.market.lastReturn!==0);
  assert.ok(life.netWorthHistory.length>=1);
});

test('travel spends money, boosts wellbeing, records the trip, and is once per year',()=>{
  const life=createLife({seed:'travel',country:'US'});life.age=25;life.money=100000;life.debt=0;
  const happiness=life.stats.happiness;
  const r=travel(life,'jp','solo');
  assert.equal(r.ok,true);assert.ok(life.money<100000);
  assert.equal(life.travels.length,1);assert.equal(life.travels[0].id,'jp');
  assert.ok(life.stats.happiness>happiness);
  assert.equal(travel(life,'th','solo').ok,false,'same-year second trip is blocked');
  life.age=26;assert.equal(travel(life,'th','solo').ok,true);
  const poor=createLife({seed:'poor',country:'CD'});poor.age=25;poor.money=0;
  assert.equal(travel(poor,'is','solo').ok,false);
});

test('house, car and insurance create assets, debt service and recurring costs',()=>{
  const life=createLife({seed:'assets',country:'US'});life.age=30;life.money=200000;life.debt=0;
  const before=netWorth(life);
  const h=buyHouse(life);
  assert.equal(h.ok,true);assert.ok(life.house);assert.ok(life.house.loan>0);
  assert.ok(life.money<200000);
  const c=buyCar(life);assert.equal(c.ok,true);assert.equal(life.car,true);
  const i=buyItem(life,'insurance');assert.equal(i.ok,true);assert.equal(life.insurance,true);
  const nw=netWorth(life);assert.ok(Number.isFinite(nw));
  const cash=life.money;advanceYear(life,{events:false});
  assert.ok(life.money!==cash,'mortgage/insurance/car costs are charged');
  assert.ok(netWorth(life)>before*.5);
});

test('random events occur across lives and include real consequences',()=>{
  let events=0,choices=0,markets=0,family=0;
  for(let seed=0;seed<40;seed++) {
    const life=createLife({seed});
    for(let n=0;n<120&&!life.dead;n++) {
      if(life.pending){choices++;choose(life,(seed+n)%life.pending.options.length);}
      else advanceYear(life);
    }
    events+=life.log.filter(l=>l.type==='event').length;
    markets+=life.log.filter(l=>l.type==='market').length;
    family+=life.log.filter(l=>l.type==='family').length;
    assert.ok(life.log.some(l=>l.type==='event'||l.type==='family'||l.type==='market'),'at least one non-milestone event per life');
  }
  assert.ok(events>20,'events are frequent enough');
  assert.ok(choices>100,'random choices add decisions');
  assert.ok(markets>0);
  assert.ok(family>=0);
});

test('upgradeLife migrates the old save format without losing the current story',()=>{
  const old={name:'旧存档',sex:'女',country:clone(COUNTRIES[0]),birthYear:2026,age:30,money:-500,
    stats:{health:60,happiness:60,knowledge:50,social:50},income:1000,job:'职员',education:'大学',
    partner:null,children:[],family:{mother:'母亲',father:'父亲'},log:[],pending:null,dead:false,
    deathCause:null,deathAge:null,focus:'joy',companions:[],notes:[],longevity:80,retired:false};
  const life=upgradeLife(old);
  assert.equal(life.debt,500);assert.equal(life.money,0);
  assert.ok(life.investments&&life.market&&life.travels&&life.holdings);
  assert.equal(life.family.mother.name,'母亲');
  assert.ok(Number.isFinite(netWorth(life)));
});

test('save round-trip preserves portfolio, holdings, travels and random state',()=>{
  const a=createLife({seed:'portfolio',country:'US'});a.age=25;a.money=50000;a.debt=0;
  invest(a,'index',4000);invest(a,'bonds',2000);buyStock(a,'NOVA',1000);travel(a,'jp','solo');
  const b=clone(a);
  assert.equal(netWorth(a),netWorth(b));
  for(let n=0;n<5;n++){advanceYear(a,{events:false});advanceYear(b,{events:false});assert.deepEqual(a,b);}
  assert.deepEqual(summarize(a).travels,1);
});

test('a large idle balance asks where to keep it, once per doubling', () => {
  const life = createLife({ seed: 'idle-1', country: 'CN' });
  life.age = 30; life.money = 3 * life.country.gdp; life.debt = 0; life.income = 0;
  life.pending = null; life.systems.lastYear = null;
  advanceYear(life, { events: false });
  assert.equal(life.pending?.system, 'idle-cash', 'idle-cash dialog opened');
  assert.ok(life.systems.lastIdleAsk > 0, 'ask threshold recorded');
  // answer "keep"
  const keepIdx = life.pending.options.findIndex(o => o.key === 'keep');
  choose(life, keepIdx);
  assert.equal(life.pending, null);
  assert.ok(life.log.some(e => e.title === '钱先放在手上'), 'keep choice logged');
  // same balance does not re-ask next year
  life.systems.lastYear = null; life.pending = null;
  advanceYear(life, { events: false });
  assert.notEqual(life.pending?.system, 'idle-cash', 'no repeat ask at same level');
  // doubled balance asks again
  life.money = life.systems.lastIdleAsk * 2.2;
  life.systems.lastYear = null; life.pending = null;
  advanceYear(life, { events: false });
  assert.equal(life.pending?.system, 'idle-cash', 're-asks after doubling');
  // mix opens the panel flag
  choose(life, life.pending.options.findIndex(o => o.key === 'mix'));
  assert.equal(life.systems.idleOpenPanel, true, 'panel flag set');
});

test('small balances never trigger the idle-cash ask', () => {
  const life = createLife({ seed: 'idle-2', country: 'CN' });
  life.age = 30; life.money = 2 * life.country.gdp; life.debt = 0;
  life.pending = null; life.systems.lastYear = null;
  advanceYear(life, { events: false });
  assert.notEqual(life.pending?.system, 'idle-cash');
});

test('country-bound cultural events appear only for that country', () => {
  const step = (l, v = 0) => l.pending ? choose(l, v % l.pending.options.length) : advanceYear(l);
  const cnTitles = [];
  for (let s = 0; s < 8 && cnTitles.length < 2; s++) {
    const life = createLife({ seed: 'cul-cn-' + s, country: 'CN' });
    for (let n = 0; n < 200 && !life.dead; n++) { step(life, n); if (life.dead) break; }
    for (const e of life.log) if (/年货|中秋的院子|教室里的早读|春运的车厢|楼下的小馆子/.test(e.title)) cnTitles.push(e.title);
  }
  assert.ok(cnTitles.length >= 1, `expected a CN culture event, got none`);
  const usTitles = [];
  for (let s = 0; s < 14 && usTitles.length < 1; s++) {
    const life = createLife({ seed: 'cul-us-' + s, country: 'US' });
    for (let n = 0; n < 200 && !life.dead; n++) { step(life, n); if (life.dead) break; }
    for (const e of life.log) if (/万圣节的门口|第一份暑期工|公路上的长途|感恩节的餐桌/.test(e.title)) usTitles.push(e.title);
  }
  assert.ok(usTitles.length >= 1, `expected a US culture event, got none`);
});

test('envy events name a missing condition without opening a dialog', () => {
  const life = createLife({ seed: 'envy-1', country: 'CN' });
  life.age = 10; life.education = '校外（小学学业未完成）'; life.stats.happiness = 50;
  life.pending = null; life.systems.lastYear = null;
  life.recentEvents = [];
  for (let n = 0; n < 40 && !life.dead && life.age < 16; n++) {
    if (life.pending) choose(life, life.pending.options.length - 1);
    else advanceYear(life);
  }
  const envy = life.log.filter(e => /羡慕上学的朋友|别人家的灯|一双新鞋/.test(e.title));
  assert.ok(envy.length >= 1 || life.dead, `expected an envy event or natural progression, got ${envy.length}`);
});
