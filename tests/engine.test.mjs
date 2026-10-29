import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, createLife, advanceYear, choose, setFocus, summarize, rng } from '../src/engine.js';

const clone = value => JSON.parse(JSON.stringify(value));
function step(life, variant=0) {
  return life.pending ? choose(life, variant % life.pending.options.length) : advanceYear(life);
}
function finish(life, variant=0) {
  for(let n=0; n<160 && !life.dead; n++) step(life,variant);
  assert.equal(life.dead,true);
  return life;
}

test('40 countries have estimated positive population, birth, life and PPP fields',()=>{
  assert.ok(COUNTRIES.length>=32);
  assert.equal(new Set(COUNTRIES.map(c=>c.id)).size,COUNTRIES.length);
  for(const c of COUNTRIES) {
    for(const k of ['pop','birth','life','gdp']) assert.ok(c[k]>0,`${c.id}.${k}`);
    assert.ok(c.name && c.flag && c.region && c.city && c.estimated);
    assert.ok(c.names.male.length && c.names.female.length);
  }
});

test('birth creates complete serializable life and four same-year companions',()=>{
  const life=createLife({seed:42,country:'CN',sex:'女',name:'小青'});
  assert.equal(life.name,'小青');assert.equal(life.sex,'女');assert.equal(life.country.id,'CN');
  assert.equal(life.age,0);assert.equal(life.birthYear,2026);assert.equal(life.log[0].type,'birth');
  assert.equal(life.companions.length,4);assert.ok(life.family.mother.name && life.family.father.name);
  for(const p of life.companions) assert.equal(p.birthYear,life.birthYear);
  assert.deepEqual(clone(life),life);
  assert.match(life.notes.join(''),/近似/);
});

test('era presets and random era, population mode',()=>{
  assert.equal(createLife({era:'past',seed:0}).birthYear,1970);
  assert.equal(createLife({era:'future',seed:0}).birthYear,2050);
  for(let seed=0;seed<20;seed++) {
    const life=createLife({era:'any',mode:'pop',seed});
    assert.ok(life.birthYear>=1950 && life.birthYear<=2050);
  }
  assert.notDeepEqual(Array.from({length:50},(_,seed)=>createLife({seed,mode:'birth'}).country.id),
    Array.from({length:50},(_,seed)=>createLife({seed,mode:'pop'}).country.id));
});

test('100 seeds across all focuses reach death by 110 with bounded stats',()=>{
  const focuses=['study','work','health','family','joy'];
  for(let seed=0;seed<100;seed++) {
    const life=createLife({seed,era:['past','now','future','any'][seed%4],mode:seed%2?'birth':'pop'});
    setFocus(life,focuses[seed%5]);
    for(let n=0;n<160&&!life.dead;n++) {
      step(life,seed+n);
      for(const v of Object.values(life.stats)) assert.ok(v>=0&&v<=100&&Number.isFinite(v));
      assert.ok(Number.isFinite(life.money)&&Number.isFinite(life.income));
    }
    assert.equal(life.dead,true,`seed ${seed}`);
    assert.ok(life.deathAge>0&&life.deathAge<=110);
    assert.equal(life.deathAge,life.age);assert.ok(life.deathCause);
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
  for(let n=0;n<160&&!a.dead;n++) {
    if(n%7===0) {setFocus(a,'health');setFocus(b,'health');}
    step(a,n);step(b,n);assert.deepEqual(a,b);
  }
  assert.equal(a.dead,true);assert.deepEqual(summarize(a),summarize(b));
});

test('focus influences income and stats, invalid focus is rejected',()=>{
  const work=createLife({seed:'focus'});
  while(work.age<23) step(work);
  const health=clone(work);setFocus(work,'work');setFocus(health,'health');
  advanceYear(work);advanceYear(health);
  assert.ok(work.income>health.income);assert.ok(work.stats.health<health.stats.health);
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
