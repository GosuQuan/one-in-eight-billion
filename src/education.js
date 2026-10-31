// Original simulation. All costs, thresholds, durations and probabilities are
// GAME BALANCE ASSUMPTIONS, not official national statistics or tuition quotes.
const cap=n=>Math.max(0,Math.min(100,n));
const rank={none:0,primary:1,basic:2,high:3,vocational:3,university:4,masters:5};
const labels={none:'尚未入学',primary:'小学',basic:'初中',high:'高中',vocational:'职业教育',university:'大学',masters:'研究生'};
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
function roll(l){const s=l.school;s.randomState=(s.randomState+0x6D2B79F5)>>>0;let t=s.randomState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
const note=(l,title,text)=>(l.log||=[]).push({age:l.age,year:l.birthYear+l.age,title,text,type:'education'});
const result=(l,ok,message)=>{note(l,ok?'教育进展':'教育申请未完成',message);return{ok,message};};
const cash=l=>Math.max(0,Number(l.money)||0);
const gdp=l=>Math.max(1000,Number(l.country?.gdp)||15000);
export function educationPolicy(l){
 const id=l.country?.id||'CN',year=(l.birthYear||2026)+(l.age||0);
 const established=['US','CA','GB','FR','DE','IT','ES','SE','PL','RU','JP','KR','AU','NZ'];
 const constrained=['PK','NG','ET','CD','UG','BD','NP'];
 let access=established.includes(id)?.99:constrained.includes(id)?.86:.96;
 if(year<1990)access-=constrained.includes(id)?.18:.08;
 if(year<1970)access-=.12;
 const modernCN=id==='CN'&&year>=2008;
 if(modernCN)access=1;
 if(id==='CN'&&year>=1986&&year<2008)access=.96;
 const universityFactor=id==='US'?.28:['GB','AU','CA'].includes(id)?.16:['DE','FR','SE'].includes(id)?.035:.08;
 return{country:id,year,publicEducation:true,basicYears:9,access,basicTuition:0,householdCost:Math.round(gdp(l)*(modernCN?.006:.012)),universityFactor,modernCN,
 description:modernCN?'现代中国：九年义务教育免学费，入学不以学识值筛选；交通、餐食等家庭支出与学费分开。':`${l.country?.name||id}：存在公共基础教育；本模型分别估计学校可及性与家庭交通、用品负担，不能据国家名称认定无法入学。`,
 caveat:'国家与年代采用简化政策分组；费用、录取率、学制和可及性为游戏平衡假设，不是官方统计。未来沿用现代假设。'};
}
function legacy(l){const text=l.education||'';if(/研究生|硕士|博士/.test(text))return'masters';if(/大学/.test(text)&&!/在读/.test(text))return'university';if(/大学在读|高中/.test(text))return'high';if(/职业/.test(text))return'vocational';if(/初中/.test(text))return'basic';if(/小学/.test(text))return'primary';return'none';}
export function initEducation(l){
 if(!l||typeof l!=='object')return l;
 if(!l.school){const credential=legacy(l);l.school={version:1,credential,basicProgress:rank[credential]>=2?9:credential==='primary'?6:0,program:null,preparation:0,attempts:{},lastApplicationAge:null,lastPreparationAge:null,lastYear:null,randomState:hash(`${l.seed??l.id??l.randomState??'legacy'}:education`),milestones:[]};
 if(l.education==='大学在读')l.school.program={id:'apply-university',label:'大学',credential:'university',duration:4,progress:0,annualCost:Math.round(gdp(l)*educationPolicy(l).universityFactor),startedAge:l.age,paidAge:l.age,paused:false};}
 const s=l.school;s.attempts||={};s.milestones||=[];s.preparation=Number(s.preparation)||0;
 if(s.randomState==null)s.randomState=hash(`${l.seed??l.id??'legacy'}:education`);
 if(!(s.credential in rank))s.credential=legacy(l);
 if(s.basicProgress==null)s.basicProgress=rank[s.credential]>=2?9:s.credential==='primary'?6:0;
 l.stats||={knowledge:5};return l;
}
function sync(l){const s=l.school;l.education=s.program?`${s.program.label}${s.program.paused?'（休学）':'在读'}`:labels[s.credential];}
function specs(l){const p=educationPolicy(l);return{
 'apply-high':{label:'普通高中',credential:'high',required:2,minAge:15,threshold:32,duration:3,factor:.025},
 'apply-vocational':{label:'职业学校',credential:'vocational',required:2,minAge:15,threshold:18,duration:3,factor:.02},
 'apply-university':{label:'大学',credential:'university',required:3,minAge:18,threshold:56,duration:4,factor:p.universityFactor},
 'apply-masters':{label:'研究生',credential:'masters',required:4,minAge:21,threshold:75,prep:12,duration:3,factor:p.universityFactor*.8},
 'adult-basic':{label:'成人基础学历',credential:'basic',required:0,minAge:16,threshold:0,duration:l.school.credential==='primary'?2:3,factor:.012,adult:true},
 'adult-high':{label:'夜校高中',credential:'high',required:2,minAge:18,threshold:24,duration:3,factor:.018,adult:true},
 'adult-university':{label:'成人大学',credential:'university',required:3,minAge:20,threshold:46,duration:5,factor:p.universityFactor*.55,adult:true}};}
function admissionReason(l,spec){const s=l.school;if(l.dead)return'这一生已结束';if(s.program)return'已有在读或休学项目，请先完成或退出';if(l.age<spec.minAge)return`至少${spec.minAge}岁可申请`;if(rank[s.credential]<spec.required)return`需要先完成${spec.required===4?'大学':spec.required===3?'高中或职业学校':'初中或成人基础学历'}`;if(rank[s.credential]>=rank[spec.credential])return'已取得同级或更高学历';if(s.lastApplicationAge===l.age)return'今年已经参加过录取，明年可重新申请';if((l.lived?.examWait||0)>l.age)return`你说过至少等到${l.lived.examWait}岁再申请。这一年的新申请被自己挡下，等待不会变成录取。`;if((l.stats.knowledge||0)+s.preparation<spec.threshold)return`成绩准备不足：学识加备考准备需达到${spec.threshold}，当前${Math.round((l.stats.knowledge||0)+s.preparation)}`;if(s.preparation<(spec.prep||0))return`研究生申请需至少${spec.prep}点专项备考准备`;const cost=Math.round(gdp(l)*spec.factor),fee=Math.max(10,Math.round(cost*.04));if(cash(l)<cost+fee)return`现金不足：首年学费${cost} + 申请费${fee}，需现金${cost+fee}；不自动借债`;return'';}
export function educationOptions(l){
 initEducation(l);const s=l.school,cost=Math.max(10,Math.round(gdp(l)*.003));
 const reason=l.dead?'这一生已结束':l.age<12?'12岁起可专项备考':s.lastPreparationAge===l.age?'本年已备考，明年继续':cash(l)<cost?`需现金${cost}`:'';
 const options=[{id:'prepare',label:'专项备考',description:`花费${cost}，准备+12、学识+3；每年一次。申请失败后可继续积累，研究生要求准备至少12。`,cost,duration:1,disabled:!!reason,reason}];
 for(const[id,spec]of Object.entries(specs(l))){const annualCost=Math.round(gdp(l)*spec.factor),fee=Math.max(10,Math.round(annualCost*.04)),why=admissionReason(l,spec);options.push({id,label:`申请${spec.label}`,description:`${spec.minAge}岁起；${spec.required===4?'大学毕业':spec.required===3?'高中或职业学校毕业':spec.required===2?'初中毕业':'无需已有学历'}；学识+准备≥${spec.threshold}${spec.prep?`、专项准备≥${spec.prep}`:''}；${spec.duration}年，每年学费${annualCost}，申请费${fee}。有名额竞争，申请费不退；每年考核可能延毕，缺学费休学，可次年重试。${spec.adult?'夜校/成人路径可兼顾工作。':''}`,cost:annualCost+fee,annualCost,applicationFee:fee,duration:spec.duration,disabled:!!why,reason:why});}
 if(s.program){const p=s.program,why=l.dead?'这一生已结束':!p.paused?'当前无需复学':cash(l)<p.annualCost?`复学需现金${p.annualCost}`:'';options.unshift({id:'resume',label:'缴费复学',description:`${p.label}已完成${p.progress}/${p.duration}年；缴本学年学费${p.annualCost}，下一年继续考核。`,cost:p.annualCost,duration:p.duration-p.progress,disabled:!!why,reason:why});options.push({id:'leave',label:'退出当前学业',description:'保留已取得的学历；当前项目的学分与已缴费用不返还，今后可重新申请。',cost:0,disabled:!!l.dead,reason:l.dead?'这一生已结束':''});}
 return options;
}
export function educationAction(l,id){
 initEducation(l);const s=l.school;if(l.pending&&l.pending.kind!=='education')return{ok:false,message:'请先完成当前事件选择'};
 const option=educationOptions(l).find(o=>o.id===id);if(!option)return{ok:false,message:'未知的教育行动'};if(option.disabled)return result(l,false,option.reason);
 if(id==='prepare'){l.money=cash(l)-option.cost;s.preparation=cap(s.preparation+12);s.lastPreparationAge=l.age;l.stats.knowledge=cap((l.stats.knowledge||0)+3);return result(l,true,`支付${option.cost}进行专项备考，准备现为${s.preparation}。`);}
 if(id==='leave'){s.program=null;sync(l);return result(l,true,'退出当前学业，保留已取得学历，可以在后续年份重新申请。');}
 if(id==='resume'){const p=s.program;l.money=cash(l)-p.annualCost;p.paused=false;p.paidAge=l.age;sync(l);return result(l,true,`缴纳${p.annualCost}复学，下一年继续${p.label}考核。`);}
 const spec=specs(l)[id],annualCost=option.annualCost,fee=option.applicationFee;l.money=cash(l)-fee;s.lastApplicationAge=l.age;s.attempts[id]=(s.attempts[id]||0)+1;
 const score=(l.stats.knowledge||0)+s.preparation,probability=Math.min(.94,(spec.adult?.78:.6)+Math.max(0,score-spec.threshold)*.004);
 if(roll(l)>=probability)return result(l,false,`未获${spec.label}录取：达到了最低准备要求，但本轮名额竞争未通过（游戏录取机会约${Math.round(probability*100)}%）。申请费${fee}不退，学费未扣；可继续备考，明年重试或选择成人/职业路径。`);
 l.money-=annualCost;s.program={id,label:spec.label,credential:spec.credential,duration:spec.duration,progress:0,annualCost,startedAge:l.age,paidAge:l.age,paused:false};s.preparation=Math.max(0,s.preparation-8);sync(l);
 return result(l,true,`获${spec.label}录取，支付申请费${fee}和首年学费${annualCost}；需完成${spec.duration}个学年，每年考核与续费，毕业前不授予学历。`);
}
export function educationYear(l){
 initEducation(l);const s=l.school;if(l.dead||s.lastYear===l.age)return l;s.lastYear=l.age;const p=s.program;
 if(p){if(p.paused||l.age<=p.paidAge)return l;const passChance=Math.min(.97,.78+(l.stats.knowledge||0)*.0015+(l.focus==='study'?.04:0));
 if(roll(l)<passChance){p.progress++;l.stats.knowledge=cap((l.stats.knowledge||0)+4);}else note(l,'学年考核未通过',`${p.label}课程或考核未完成，保留${p.progress}/${p.duration}年进度；下一学年需要重修并缴费。`);
 if(p.progress>=p.duration){s.credential=p.credential;if(rank[s.credential]>=2)s.basicProgress=9;s.program=null;sync(l);note(l,'完成学业',`经过逐年学习与考核，你获得${labels[s.credential]}学历。`);return l;}
 if(cash(l)<p.annualCost){p.paused=true;sync(l);note(l,'学费不足，暂时休学',`${p.label}已完成${p.progress}/${p.duration}年；续读需现金${p.annualCost}，当前${Math.round(cash(l))}。未新增债务；攒钱后可缴费复学。`);}else{l.money-=p.annualCost;p.paidAge=l.age;note(l,'继续学业',`${p.label}进度${p.progress}/${p.duration}年，支付下一学年学费${p.annualCost}。`);}return l;}
 if(rank[s.credential]>=2||l.age<6||l.age>18)return l;const policy=educationPolicy(l);
 if(l.age===6&&s.basicProgress===0){s.basicStarted=true;l.education='小学在读';note(l,'进入基础教育',`${policy.description}学费0；家庭用品交通估计每年${policy.householdCost}（由家庭生活预算承担，此处不重复扣款）。九年进度从下一学年累计。${policy.caveat}`);return l;}
 if(l.age<7)return l;
 if(roll(l)>=policy.access){note(l,'基础教育暂时中断','当地学校距离、交通或教学资源限制使本学年未完成；这不是学识不足。下一年继续尝试，成年后也可补读成人基础学历。');return l;}
 s.basicProgress=Math.min(9,s.basicProgress+1);l.stats.knowledge=cap((l.stats.knowledge||0)+2);
 if(s.basicProgress>=9){s.credential='basic';sync(l);note(l,'完成基础教育','完成九个学年，取得初中阶段学历；高中、职业学校需另行申请。');}else if(s.basicProgress>=6){s.credential='primary';l.education='初中在读';}else l.education='小学在读';return l;
}
export function educationMilestone(l,age=l.age){initEducation(l);if(l.dead||l.pending||![6,12,15,18,22].includes(age)||l.school.milestones.includes(age))return false;l.school.milestones.push(age);const policy=educationPolicy(l);l.pending={kind:'education',title:'教育与下一步',text:`${policy.description}当前：${l.education}。${policy.caveat}`,options:[...educationOptions(l).filter(o=>!o.disabled).map(o=>({...o,key:o.id})),{id:'continue',key:'continue',label:age>=18?'暂不升学，继续生活或前往求职':'按当前安排继续',description:'继续当前学习或生活；教育面板保留备考、重试和成人教育入口。成年后可从职业面板求职。'}]};return true;}
export function educationChoice(l,index){if(l.pending?.kind!=='education')return{ok:false,message:'当前不是教育选择'};if(!Number.isInteger(index)||!l.pending.options[index])throw new RangeError('选择不存在');const option=l.pending.options[index];l.pending=null;if(option.id==='continue'||option.key==='continue')return result(l,true,'继续当前安排；成年后可在职业面板求职，之后仍可在教育面板申请学习。');return educationAction(l,option.id||option.key);}
