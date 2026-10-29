const record=(l,title,text)=>l.log.push({age:l.age,year:l.birthYear+l.age,title,text,type:'work'});
function roll(l){l.randomState=(l.randomState+0x6D2B79F5)>>>0;let t=l.randomState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const rank={none:0,primary:1,basic:2,high:3,vocational:3,university:4,masters:5};
export function careerOptions(l){
 const r=rank[l.school?.credential]??0;
 return [
  {id:'apprentice',label:'应聘维修学徒',description:'跟师傅做维修，从基础工序学起；不要求大学学历。',minimum:0,factor:.36,chance:.65},
  {id:'office',label:'应聘行政岗位',description:'需要高中或同等学历，面试考核沟通与表格处理。',minimum:3,factor:.6,chance:.42},
  {id:'technical',label:'应聘技术岗位',description:'需要职业教育或大学学历，以技能测试和项目经历竞争岗位。',minimum:l.school?.credential==='high'?4:3,factor:.82,chance:.35},
  {id:'promotion',label:'提交晋升申请',description:'拿出这一年的成果，接受主管评估；未获通过仍保留原岗位。',minimum:0,factor:0,chance:.28}
 ].map(o=>{const fulltime=!!(l.school?.program&&!l.school.program.paused&&['apply-university','apply-masters','apply-high','apply-vocational'].includes(l.school.program.id));return {...o,disabled:l.age<18||l.dead||r<o.minimum||fulltime||l.careerLastAge===l.age||(o.id==='promotion'&&(l.income<=0||l.retired)),reason:l.age<18?'成年后开放':l.careerLastAge===l.age?'今年已经参加过招聘或晋升评估':r<o.minimum?'目前学历不满足岗位要求':o.id==='promotion'&&(l.income<=0||l.retired)?'需要一份在职工作':fulltime?'全日制学习期间请先完成或暂停学业':'',income:Math.round(l.country.gdp*o.factor)};});
}
export function careerAction(l,id){
 const o=careerOptions(l).find(x=>x.id===id);
 if(!o||l.pending)return {ok:false,message:'请先处理当前选择'};
 if(o.disabled)return {ok:false,message:o.reason||'当前不能申请'};
 l.careerLastAge=l.age;
 const probability=Math.min(.9,o.chance+l.stats.knowledge*.002+l.stats.social*.001+(l.focus==='work'?.1:0));
 if(roll(l)>=probability){record(l,'没有等到那份录用通知',`${o.label}之后，你等了两周。对方最后选了经历更贴近岗位的人；准备没有白费，但这次没有得到${id==='promotion'?'晋升':'工作'}。你仍是${l.job}，明年可以再试，也可以先去进修。`);l.stats.happiness=Math.max(0,l.stats.happiness-2);return {ok:true,message:'这次没有通过，明年可重新申请'};}
 if(id==='promotion'){l.income=Math.round(l.income*1.22);l.job='资深'+l.job.replace(/^资深/,'');}
 else {l.income=o.income;l.job={apprentice:'维修学徒',office:'行政职员',technical:'技术人员'}[id];l.retired=false;}
 record(l,id==='promotion'?'名字出现在晋升名单上':'收到录用通知',`${id==='promotion'?'主管终于批下了你申请的岗位。':'你反复确认了邮件上的报到时间，把需要的材料装进文件袋。'}你现在是${l.job}，预计年收入${l.income}。之后仍有日常开销、岗位变化与失业风险。`);
 return {ok:true,message:`成为${l.job}，年收入${l.income}`};
}
