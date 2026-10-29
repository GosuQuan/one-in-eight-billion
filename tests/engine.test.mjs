import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRIES, DESTINATIONS, STOCKS, createLife, upgradeLife, advanceYear, choose,
  setFocus, summarize, rng, netWorth, investedValue, invest, withdraw, buyStock,
  sellStock, buyHouse, buyCar, buyItem, travel, travelCost
} from '../src/engine.js';

const clone = value => JSON.parse(JSON.stringify(value));
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
  assert.match(life.notes.join(''),/近似/);
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
  const b=clone(a);choose(a,0);choose(b,1);
  assert.notDeepEqual(a.stats,b.stats);
  assert.equal(a.log.at(-1).type,'consequence');
  assert.match(a.log.at(-1).text,/学识\+10/);
  assert.notEqual(a.log.at(-1).title,b.log.at(-1).title);
});

test('JSON round-trip at a pending choice resumes exactly through death',()=>{
  const a=createLife({seed:'saved-pending',country:'JP',era:'future'});
  while(a.age<26) step(a);
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
  const health=clone(work);
  work.income=health.income=1000;work.job=health.job='职员';
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
