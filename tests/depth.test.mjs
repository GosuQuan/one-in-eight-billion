import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advanceYear,choose,takeLoan,incomePlace,lifeStage,improveLife} from '../src/engine.js';
import {financeAction,familyAidQuote} from '../src/finance.js';
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

test('only money is written as a number; other changes say up or down',()=>{
 const l=createLife({seed:'words',country:'CN'});
 l.age=30;
 l.pending={kind:'milestone',title:'t',text:'x',options:[{label:'先照顾自己',description:'把时间留给自己。',effects:{health:5,happiness:-2,cash:1200}}]};
 choose(l,0);
 const line=l.log.at(-1).text;
 assert.match(line,/现金\+1200/);
 assert.match(line,/健康上升/);
 assert.match(line,/幸福下降/);
 assert.doesNotMatch(line,/健康[+-]\d/);
 assert.doesNotMatch(line,/幸福[+-]\d/);
});

test('family will not repay a debt the player can already cover',()=>{
 const l=createLife({seed:'rich-debt',country:'US'});
 l.age=30;l.debt=4000;l.money=80000;l.income=50000;
 assert.equal(familyAidQuote(l).eligible,false);
 assert.equal(financeAction(l,'family-aid').ok,false);
 assert.equal(l.debt,4000);
});

test('surplus cash eases the current stage once a year and late life spends it on health and company',()=>{
 const child=createLife({seed:'ease-child',country:'CN'});
 child.age=12;child.money=child.country.gdp*2;child.debt=0;
 const before=child.money;
 assert.equal(lifeStage(child).id,'school');
 assert.equal(improveLife(child).ok,true);
 assert.ok(child.money<before);
 assert.match(child.log.at(-1).text,/知识上升/);
 assert.equal(improveLife(child).ok,false);
 const late=createLife({seed:'ease-late',country:'CN'});
 late.age=70;late.money=late.country.gdp*3;late.partner={name:'林晚',alive:true};
 assert.equal(lifeStage(late).id,'late');
 assert.equal(improveLife(late).ok,true);
 assert.ok(late.log.some(e=>e.text.includes('林晚')&&e.text.includes('身体')));
 const poor=createLife({seed:'ease-poor',country:'CN'});
 poor.age=30;poor.money=10;
 assert.equal(improveLife(poor).ok,false);
 assert.equal(poor.money,10);
});

test('income place is a game estimate and is empty without income',()=>{
 const l=createLife({seed:'place',country:'CN'});
 l.income=0;
 assert.equal(incomePlace(l).local,0);
 l.income=l.country.gdp;
 const place=incomePlace(l);
 assert.ok(place.local>=45&&place.local<=55);
 assert.ok(place.world>=1&&place.world<=99);
});
