import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advanceYear,choose,takeLoan} from '../src/engine.js';
import {financeAction} from '../src/finance.js';
import {careerAction} from '../src/career.js';

const copy=x=>JSON.parse(JSON.stringify(x));
function play(l,age,{events=true}={}){
 let guard=0;
 while(l.age<age&&!l.dead&&guard++<500){
  if(l.pending)choose(l,l.pending.options.length-1);
  else advanceYear(l,{events});
 }
 return l;
}

test('modern China reaches basic school without cash or knowledge and is not a graduate at 22',()=>{
 const l=createLife({seed:'cn-basic',country:'CN'});
 l.money=0;l.debt=0;l.stats.knowledge=0;
 play(l,22);
 assert.equal(l.age,22);
 assert.equal(l.school.credential,'basic');
 assert.notEqual(l.education,'大学');
 assert.equal(l.school.program,null);
 assert.equal(l.money,0);
 assert.ok(!l.log.some(e=>e.age<18&&/接到了身边|搬来和你同住|养老/.test(`${e.title}${e.text}`)));
});

test('debt accrues interest, blocks new borrowing after missed bills, and family aid is partial',()=>{
 const l=createLife({seed:'debt-pressure',country:'US'});
 l.age=30;l.money=0;l.income=0;l.debt=10000;l.family.wealth=.8;l.family.mother.bond=80;l.family.father.bond=80;
 const before=l.debt;
 advanceYear(l,{events:false});
 assert.ok(l.debt>before);
 assert.ok(l.log.some(e=>e.title.includes('没能足额还款')));
 advanceYear(l,{events:false});
 assert.equal(takeLoan(l,1000).ok,false);
 const owed=l.debt,reserve=l.finance.familyReserve;
 const aid=financeAction(l,'family-aid');
 assert.equal(aid.ok,true);
 assert.ok(l.debt<owed);
 assert.ok(l.debt>0);
 assert.ok(l.finance.familyReserve<reserve);
 assert.equal(financeAction(l,'family-aid').ok,false);
});

test('support paid to the other parent is not also charged as a child at home',()=>{
 const a=createLife({seed:'support-cost',country:'US'});
 a.age=30;a.money=500000;a.income=0;a.debt=0;
 const b=copy(a);
 b.children=[{id:'c1',name:'小北',sex:'男',age:8,birthYear:b.birthYear+23,alive:true,bond:70,supportPayer:'player',supportSinceAge:30,supportAnnual:1000}];
 advanceYear(a,{events:false});advanceYear(b,{events:false});
 assert.equal(a.money-b.money,1000);
 assert.ok(b.log.some(e=>e.text.includes('小北')&&e.text.includes('1000')));
});

test('full-time study uses the real program id and can reject a job application',()=>{
 const l=createLife({seed:'career-gate',country:'CN'});
 l.age=20;l.school.credential='high';
 l.school.program={id:'apply-university',label:'大学',credential:'university',duration:4,progress:1,annualCost:1000,startedAge:19,paidAge:20,paused:false};
 assert.equal(careerAction(l,'office').ok,false);
 l.school.program.paused=true;l.money=0;
 assert.match(careerAction(l,'office').message,/没有通过|行政/);
});
