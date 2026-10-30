import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advanceYear,choose,applyEffects,invest,withdraw,buyStock,buyHouse,buyCar,travel,takeLoan,creditLimit} from '../src/engine.js';
const copy=x=>JSON.parse(JSON.stringify(x));
test('education and child costs subtract cash rather than add it',()=>{
 const l=createLife({seed:'cost-sign',country:'US'});l.age=17;l.money=100000;l.debt=0;
 advanceYear(l);const before=l.money;choose(l,0);assert.ok(l.money<before);
 l.partner={name:'林夏',alive:true,age:29,sex:'女',bond:80};l.age=29;l.pending=null;l.money=100000;advanceYear(l);choose(l,0);assert.equal(l.pending.system,'child-plan');const cash=l.money;choose(l,0);assert.ok(l.money<cash);assert.ok(l.children.length===1||l.log.some(e=>/没有迎来孩子/.test(e.title)));
});
test('car and insurance recurring cost is charged once per year',()=>{
 const a=createLife({seed:'cost-once',country:'US'});a.age=30;a.money=1000000;a.income=0;a.longevity=100;
 const b=copy(a);b.car=true;b.insurance=true;
 advanceYear(a,{events:false});advanceYear(b,{events:false});
 assert.ok(Math.abs((a.money-b.money)-a.country.gdp*.024*.55*1.01)<=2);
});
test('medical insurance reimburses 70 percent of medical costs',()=>{
 const a=createLife({seed:'insurance'});a.money=10000;
 const b=copy(a);b.insurance=true;
 applyEffects(a,{medical:true,cash:-1000});applyEffects(b,{medical:true,cash:-1000});
 assert.equal(a.money,9000);assert.equal(b.money,9700);
});
test('loans require adulthood and respect income based credit limits',()=>{
 const l=createLife({seed:'credit'});assert.equal(takeLoan(l,5000).ok,false);
 l.age=25;l.income=10000;const max=creditLimit(l);
 assert.equal(takeLoan(l,max).ok,true);assert.equal(takeLoan(l,1).ok,false);
 assert.equal(takeLoan(l,Infinity).ok,false);
});
test('finished lives reject financial actions and travel',()=>{
 const l=createLife({seed:'ended'});l.dead=true;l.age=80;l.money=100000;
 for(const fn of [()=>invest(l,'index',1000),()=>withdraw(l,'index',100),()=>buyStock(l,'NOVA',100),()=>buyHouse(l),()=>buyCar(l),()=>takeLoan(l,100),()=>travel(l,'jp')])assert.equal(fn().ok,false);
});
test('random event build is stable and never changes the displayed destination',()=>{
 for(let seed=0;seed<80;seed++){
  const l=createLife({seed,country:'US'});
  l.age=24;l.money=80000;l.debt=0;l.income=40000;l.job='职员';l.pending=null;
  if(l.systems?.finance)l.systems.finance.arrears=0;
  for(let i=0;i<80&&!l.dead;i++){
   if(l.pending){
    if(l.pending.eventId==='travel_deal'){
     const expected=l.pending.options[0].label;const a=copy(l),b=copy(l);
     choose(a,0);choose(b,0);assert.deepEqual(a,b);
     if(a.travels.length>l.travels.length)assert.ok(expected.includes(a.travels.at(-1).place));
     return;
    }
    choose(l,l.pending.options.length-1);
   }else advanceYear(l);
  }
 }
 assert.fail('a travel offer should be generated among prepared adult lives');
});
