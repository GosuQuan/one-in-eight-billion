// Monetary amounts and thresholds are game rules in PPP units, not credit law.
const clamp=n=>Math.max(0,Math.min(100,n));
const record=(l,title,text)=>l.log.push({age:l.age,year:l.birthYear+l.age,title,text,type:'finance'});
const alive=p=>p&&p.alive!==false&&!p.dead;
export function initFinance(l){
 const f=l.finance ||= {};
 f.arrears ??= 0; f.lastYear ??= null; f.lastAidAge ??= null; f.repaymentUntil ??= -1; f.austerityUntil ??= -1;
 f.familyReserve ??= Math.round((l.birthCountry||l.country).gdp*(.04+.76*Math.max(0,Math.min(1,l.family?.wealth??.4))));
 f.familyAidTotal ??= 0; f.lastBill ??= null;
 return f;
}
export function creditBlocked(l){const f=initFinance(l);return f.arrears>=2||f.repaymentUntil>=l.age;}
export function familyAidQuote(l){
 const f=initFinance(l),parents=[l.family?.mother,l.family?.father].filter(alive);
 const bond=parents.length?parents.reduce((s,p)=>s+(p.bond??60),0)/parents.length:0;
 const proportion=Math.max(.05,Math.min(.35,.08+(l.family?.wealth??.4)*.22+(bond-50)*.001));
 const amount=Math.min(Math.round((l.debt||0)*proportion),f.familyReserve,Math.round((l.birthCountry||l.country).gdp*(.025+.12*(l.family?.wealth??.4))));
 return {amount:parents.length&&bond>=25?amount:0,proportion,parents,eligible:l.age>=18&&l.debt>0&&parents.length>0&&(f.lastAidAge==null||l.age-f.lastAidAge>=3)};
}
export function financeAction(l,id){
 const f=initFinance(l);
 if(l.dead||l.age<18)return {ok:false,message:'成年后才能自己安排债务'};
 if(l.pending)return {ok:false,message:'请先处理眼前的选择'};
 if(id==='family-aid'){
  const q=familyAidQuote(l);
  if(!q.eligible)return {ok:false,message:q.parents.length?'家人也需要缓一缓，每隔三年才能再次求助':'已经没有可以承担这笔援助的父母'};
  f.lastAidAge=l.age;
  if(!q.amount){record(l,'电话另一端的账本',`${q.parents.map(p=>p.name).join('和')}听你说完了欠款，但家里的积蓄和你们目前的关系不足以支持这次求助。债务仍是${Math.round(l.debt)}。`);return {ok:true,message:'这次家人无法拿出钱，债务没有减少'};}
  const before=l.debt;l.debt-=q.amount;f.familyReserve-=q.amount;f.familyAidTotal+=q.amount;
  for(const p of q.parents)p.bond=clamp((p.bond??60)-3);
  record(l,'父母替你还了一部分',`${q.parents.map(p=>p.name).join('和')}把原本留给家里的${q.amount}直接转给了债权人，替你还掉约${Math.round(q.amount/before*100)}%。家里还能动用的援助积蓄剩${f.familyReserve}；你的欠款仍有${Math.round(l.debt)}，不是一笔能再随便开口的钱。`);
  return {ok:true,message:`家人代还 ${q.amount}，剩余负债 ${Math.round(l.debt)}`};
 }
 if(id==='austerity'){
  if(f.austerityUntil>=l.age)return {ok:false,message:'已经在执行缩减开支计划'};
  f.austerityUntil=l.age+3;l.stats.happiness=clamp(l.stats.happiness-3);
  record(l,'先把日子缩小一点','你退掉常用的订阅，改用公交，把外食预算写在冰箱上。未来三年日常生活开支减少20%；债务与孩子的抚养费仍要照付。');
  return {ok:true,message:'未来三年日常开支减少20%'};
 }
 if(id==='repayment-plan'){
  if(l.debt<=0)return {ok:false,message:'目前没有需要协商的债务'};
  if(f.repaymentUntil>=l.age)return {ok:false,message:'还款安排仍在执行'};
  f.repaymentUntil=l.age+3;
  record(l,'坐下来重排账单',`你把${Math.round(l.debt)}的欠款列在一张表上，接受三年的还款安排。利率暂降至4%，每年按收入与欠款安排还款；期间无法新增贷款，欠款不会凭空消失。`);
  return {ok:true,message:'三年还款安排生效，新增借款暂停'};
 }
 return {ok:false,message:'没有这项债务安排'};
}
export function financeYear(l){
 const f=initFinance(l);if(l.dead||l.age<18||f.lastYear===l.age)return;f.lastYear=l.age;
 if(l.debt<=0){f.arrears=0;f.lastBill=null;return;}
 const principal=Math.round(l.debt),rate=f.repaymentUntil>=l.age?.04:.06,interest=Math.round(principal*rate);
 l.debt+=interest;
 const due=Math.min(l.debt,Math.max(Math.round(principal*.12),Math.round(l.income*.15)));
 const reserve=Math.round(l.country.gdp*.025),paid=Math.min(due,Math.max(0,Math.round(l.money-reserve)));
 l.money-=paid;l.debt-=paid;
 const missed=paid<due;
 f.arrears=missed?f.arrears+1:Math.max(0,f.arrears-1);
 f.lastBill={age:l.age,principal,interest,due,paid,balance:Math.round(l.debt)};
 if(missed){l.stats.happiness=clamp(l.stats.happiness-2);if(f.arrears>=2)l.stats.health=clamp(l.stats.health-1);}
 record(l,missed?'这一期没能足额还款':'欠款少了一些',`账单上新增利息${interest}，本期应还${due}，实际还了${paid}。你保留了日常必需的钱，尚欠${Math.round(l.debt)}。${missed?(f.arrears>=2?'接连拖欠后，新的借款被拒；你开始为账单睡不好。可以求助家人、缩减开支或协商还款。':'这是一次还款缺口，下一年仍要继续承担。'):'付清这期以后，你在账本上划掉了一行。'}`);
}
