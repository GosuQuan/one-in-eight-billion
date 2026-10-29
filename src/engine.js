// Approximate 2020s estimates, not a complete statistical dataset:
// pop/birth: millions; life: years; gdp: PPP international dollars/person.
const rows = [
['CN','中国','🇨🇳','东亚','成都',1410,9,78,25000,'明,浩然,宇航','雨桐,欣怡,思涵','王,李,张'],
['IN','印度','🇮🇳','南亚','浦那',1430,23,70,10000,'阿尔琼,维杰,拉胡尔','阿莎,普里娅,米拉','夏尔马,帕特尔,辛格'],
['US','美国','🇺🇸','北美','芝加哥',340,3.6,78,80000,'诺亚,伊桑,利亚姆','艾玛,奥莉维亚,索菲娅','史密斯,约翰逊,威廉姆斯'],
['ID','印度尼西亚','🇮🇩','东南亚','万隆',278,4.5,72,15000,'阿迪,里扎,布迪','阿尤,德薇,茜蒂','普拉塔马,维贾亚,桑托索'],
['PK','巴基斯坦','🇵🇰','南亚','拉合尔',241,6.6,67,6500,'阿里,哈桑,奥马尔','法蒂玛,阿伊莎,萨娜','汗,马利克,艾哈迈德'],
['NG','尼日利亚','🇳🇬','西非','伊巴丹',224,7.5,55,6000,'图恩德,奇迪,穆萨','阿达,阿米娜,伊费','奥科耶,巴洛贡,阿德耶米'],
['BR','巴西','🇧🇷','南美','累西腓',216,2.6,76,20000,'若昂,卢卡斯,佩德罗','安娜,朱莉娅,玛丽亚','席尔瓦,桑托斯,奥利维拉'],
['BD','孟加拉国','🇧🇩','南亚','吉大港',173,3,73,8000,'拉菲克,哈桑,阿里夫','努斯拉特,法尔扎娜,萨米拉','拉赫曼,伊斯兰,侯赛因'],
['RU','俄罗斯','🇷🇺','欧亚','喀山',144,1.3,73,39000,'伊万,米哈伊尔,阿列克谢','安娜,达莉娅,叶莲娜','伊万诺夫,彼得罗夫,索科洛夫'],
['MX','墨西哥','🇲🇽','北美','瓜达拉哈拉',129,2,75,24000,'迭戈,卡洛斯,马特奥','索菲娅,瓦莱里娅,露西亚','加西亚,埃尔南德斯,洛佩斯'],
['ET','埃塞俄比亚','🇪🇹','东非','亚的斯亚贝巴',126,4,66,3000,'达维特,阿贝尔,约纳斯','汉娜,萨拉,梅龙','特斯法耶,贝克勒,格塔丘'],
['JP','日本','🇯🇵','东亚','福冈',124,.73,85,48000,'莲,悠真,凑','葵,阳菜,结衣','佐藤,铃木,高桥'],
['PH','菲律宾','🇵🇭','东南亚','宿务',117,1.9,72,10000,'米格尔,加布里埃尔,保罗','玛丽亚,安吉拉,卡米尔','桑托斯,雷耶斯,克鲁兹'],
['EG','埃及','🇪🇬','北非','亚历山大',113,2.7,71,17000,'优素福,奥马尔,艾哈迈德','玛丽亚姆,努尔,莱拉','哈桑,马哈茂德,易卜拉欣'],
['CD','刚果（金）','🇨🇩','中非','基桑加尼',102,4.5,61,1500,'让,帕特里克,约瑟夫','玛丽,格蕾丝,艾丝特','卡比拉,恩戈马,穆肯迪'],
['VN','越南','🇻🇳','东南亚','岘港',100,1.5,75,14000,'明,光,德','兰,芳,玲','阮,陈,黎'],
['TR','土耳其','🇹🇷','西亚','伊兹密尔',85,1,78,42000,'埃米尔,克雷姆,梅尔特','埃利芙,泽伊内普,黛芙内','耶尔马兹,卡亚,德米尔'],
['IR','伊朗','🇮🇷','西亚','设拉子',89,1.1,75,18000,'阿米尔,雷扎,阿里','萨拉,玛丽亚姆,尼卢法尔','艾哈迈迪,雷扎伊,侯赛尼'],
['DE','德国','🇩🇪','欧洲','莱比锡',84,.69,81,66000,'本,埃米尔,保罗','米娅,汉娜,莉娜','穆勒,施密特,施耐德'],
['TH','泰国','🇹🇭','东南亚','清迈',72,.52,79,23000,'阿南,素拉猜,纳隆','玛丽,苏达,皮姆','素旺,差伦,西里'],
['GB','英国','🇬🇧','欧洲','布里斯托尔',68,.61,81,57000,'奥利弗,乔治,阿瑟','艾米莉,艾娃,艾尔西','史密斯,琼斯,泰勒'],
['FR','法国','🇫🇷','欧洲','里昂',68,.68,83,60000,'加布里埃尔,路易,亚瑟','露易丝,爱丽丝,罗丝','马丁,贝尔纳,迪布瓦'],
['ZA','南非','🇿🇦','南部非洲','德班',61,1.1,65,16000,'西波,塔博,恩科西','诺姆萨,勒拉托,赞迪','德拉米尼,恩科西,库马洛'],
['IT','意大利','🇮🇹','欧洲','博洛尼亚',59,.38,83,56000,'莱昂纳多,弗朗切斯科,洛伦佐','索菲娅,朱莉娅,奥罗拉','罗西,鲁索,费拉里'],
['KE','肯尼亚','🇰🇪','东非','内罗毕',55,1.5,63,6500,'卡马乌,布赖恩,奥蒂诺','万吉鲁,阿金伊,费丝','姆万吉,奥迪安博,基马尼'],
['KR','韩国','🇰🇷','东亚','釜山',52,.24,84,59000,'道允,瑞俊,志浩','瑞妍,智宇,夏恩','金,李,朴'],
['CO','哥伦比亚','🇨🇴','南美','麦德林',52,.57,77,21000,'圣地亚哥,塞巴斯蒂安,马丁','伊莎贝拉,瓦莱里娅,玛丽安娜','罗德里格斯,戈麦斯,马丁内斯'],
['ES','西班牙','🇪🇸','欧洲','瓦伦西亚',48,.32,84,50000,'乌戈,马丁,卢卡斯','露西亚,玛蒂娜,葆拉','加西亚,费尔南德斯,洛佩斯'],
['AR','阿根廷','🇦🇷','南美','科尔多瓦',46,.5,77,28000,'马特奥,本杰明,蒂亚戈','艾玛,奥莉维娅,卡塔琳娜','冈萨雷斯,罗德里格斯,佩雷斯'],
['DZ','阿尔及利亚','🇩🇿','北非','奥兰',46,.9,77,15000,'亚辛,阿米尔,伊利亚斯','伊内斯,莉娜,梅丽姆','本阿里,萨阿迪,曼苏里'],
['UG','乌干达','🇺🇬','东非','坎帕拉',49,1.8,64,3000,'卡托,穆基萨,丹尼尔','纳卡托,纳姆比,莎伦','穆索凯,卡萨,塞穆'],
['CA','加拿大','🇨🇦','北美','蒙特利尔',40,.35,82,60000,'利亚姆,诺亚,威廉','夏洛特,艾玛,艾丽丝','史密斯,布朗,特朗布莱'],
['AU','澳大利亚','🇦🇺','大洋洲','阿德莱德',27,.3,83,68000,'奥利弗,杰克,查理','艾米莉亚,艾拉,米娅','史密斯,威尔逊,布朗'],
['SA','沙特阿拉伯','🇸🇦','西亚','吉达',37,.6,78,65000,'阿卜杜拉,哈立德,费萨尔','努拉,萨拉,拉蒂法','哈比,卡赫塔尼,奥泰比'],
['PE','秘鲁','🇵🇪','南美','阿雷基帕',34,.56,76,16000,'迭戈,阿隆索,华金','瓦伦蒂娜,露西亚,卡米拉','基斯佩,弗洛雷斯,桑切斯'],
['NP','尼泊尔','🇳🇵','南亚','博卡拉',31,.6,70,5000,'阿尔琼,比卡什,苏曼','阿妮塔,西塔,普佳','夏尔马,塔帕,古隆'],
['MY','马来西亚','🇲🇾','东南亚','槟城',34,.43,76,37000,'阿米尔,哈菲兹,丹尼尔','努尔,艾娜,法拉','依斯迈,阿卜杜拉,陈'],
['PL','波兰','🇵🇱','欧洲','克拉科夫',38,.27,79,47000,'扬,亚历山大,安东尼','佐菲娅,苏珊娜,汉娜','诺瓦克,科瓦尔斯基,维希涅夫斯基'],
['SE','瑞典','🇸🇪','欧洲','哥德堡',11,.1,83,69000,'威廉,卢卡斯,埃利亚斯','阿斯特丽德,艾尔莎,艾丽丝','安德松,约翰松,卡尔松'],
['NZ','新西兰','🇳🇿','大洋洲','惠灵顿',5.2,.058,82,53000,'奥利弗,诺亚,杰克','艾拉,阿米莉亚,夏洛特','史密斯,威廉姆斯,威尔逊']
];
export const COUNTRIES=rows.map(([id,name,flag,region,city,pop,birth,life,gdp,male,female,surnames])=>({
 id,name,flag,region,city,pop,birth,life,gdp,names:{male:male.split(','),female:female.split(','),surnames:surnames.split(',')},estimated:true
}));
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
function hash(seed) {
 let h=2166136261;for(const c of String(seed)) h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;
}
function roll(s) {
 s.randomState=(s.randomState+0x6D2B79F5)>>>0;let t=s.randomState;
 t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;
}
export function rng(seed=Date.now()) {const s={randomState:hash(seed)};return ()=>roll(s);}
const pick=(s,xs)=>xs[Math.floor(roll(s)*xs.length)];
function countryFor(s,mode) {
 const key=mode==='pop'||mode==='population'?'pop':'birth';let n=roll(s)*COUNTRIES.reduce((sum,c)=>sum+c[key],0);
 return COUNTRIES.find(c=>(n-=c[key])<0)||COUNTRIES.at(-1);
}
function person(s,c,sex=roll(s)<.5?'男':'女') {
 return {name:pick(s,c.names.surnames)+pick(s,c.names[sex==='男'?'male':'female']),sex};
}
function log(s,title,text,type='life') {s.log.push({age:s.age,year:s.birthYear+s.age,title,text,type});}
function normalize(s) {
 for(const k of Object.keys(s.stats)) s.stats[k]=Math.round(clamp(s.stats[k]));
 s.money=Math.round(s.money);s.income=Math.max(0,Math.round(s.income));
}
export function createLife({era='now',mode='birth',seed=Date.now(),country,sex,name}={}) {
 const s={randomState:hash(seed)};
 const c=COUNTRIES.find(c=>c.id===(typeof country==='object'?country?.id:country))||countryFor(s,mode);
 const birthYear=era==='past'?1970:era==='future'?2050:era==='any'?1950+Math.floor(roll(s)*101):2026;
 const who=person(s,c,sex==='男'||sex==='女'?sex:undefined),wealth=roll(s);
 Object.assign(s,{id:`life-${hash(seed).toString(36)}-${c.id}`,seed,era,mode,name:name||who.name,sex:who.sex,
 country:JSON.parse(JSON.stringify(c)),birthCountry:JSON.parse(JSON.stringify(c)),birthYear,age:0,
 stats:{health:65+Math.floor(roll(s)*30),happiness:55+Math.floor(roll(s)*30),knowledge:5,social:30+Math.floor(roll(s)*30)},
 money:Math.round(c.gdp*(.015+wealth*.08)),income:0,job:'尚未工作',education:'尚未入学',partner:null,children:[],
 family:{mother:{...person(s,c,'女'),age:22+Math.floor(roll(s)*15),job:pick(s,['教师','店员','农民','护士','技术员'])},
 father:{...person(s,c,'男'),age:24+Math.floor(roll(s)*16),job:pick(s,['司机','工人','农民','工程师','小店经营者'])},
 background:wealth<.25?'生活拮据':wealth>.8?'相对宽裕':'普通家庭',wealth},
 log:[],pending:null,dead:false,deathCause:null,deathAge:null,focus:'joy',companions:[],
 notes:['本演示使用近似人口、出生、寿命及购买力数据；国家样本有限，概率在样本内归一化。','金钱为购买力折算的演示单位；经历、姓名及未来情境均为虚构。'],
 longevity:clamp(c.life+(birthYear===1970?-6:birthYear>=2050?5:0)+(roll(s)-.5)*24,45,106),retired:false});
 for(let i=0;i<4;i++) {
  const cc=countryFor(s,mode);s.companions.push({...person(s,cc),id:`companion-${i}`,country:JSON.parse(JSON.stringify(cc)),birthYear,
   life:Math.round(clamp(cc.life+(roll(s)-.5)*30,35,108)),age:0,dead:false,job:'尚未工作'});
 }
 log(s,'世界多了一个你',`${birthYear}年，你出生在${c.name}${c.city}的一个${s.family.background}。父母给你取名${s.name}。`,'birth');
 log(s,'同一秒的远方','另外四个孩子也在这个世界睁开眼睛。你们彼此陌生，却一起走进时间。','world');return s;
}
const option=(label,description,effects)=>({label,description,effects});
function opportunity(s) {
 const g=s.country.gdp;
 const events={
 5:['第一间教室','你站在教室门口，手里捏着一支新铅笔。',[
 option('认真听故事','从阅读中发现更大的世界。',{knowledge:10,happiness:3,education:'小学'}),
 option('认识新朋友','和邻座一起画一张想象中的地图。',{social:12,happiness:7,education:'小学'})]],
 12:['自己的课余时间','课业变多了，你开始决定如何使用下午。',[
 option('加入科学小组','花时间完成一个小实验。',{knowledge:12,happiness:-2}),
 option('参加运动队','在操场上学会合作。',{health:9,social:8}),
 option('帮家里做事','分担生活，也更早理解父母。',{social:5,money:g*.02,happiness:3})]],
 15:['成长的岔路','毕业后的方向，需要你第一次认真想一想。',[
 option('继续普通高中','为更多学习机会打基础。',{education:'高中',knowledge:12,money:-g*.02}),
 option('学习实用技术','学习一门可以谋生的手艺。',{education:'职业学校',knowledge:7,social:5}),
 option('尽早帮补家用','开始零工生活，学习机会更少。',{education:'初中',job:'零工',income:g*.25,knowledge:2})]],
 18:['离开熟悉的街道','成年后的第一步，可以有不同的走法。',[
 option('争取大学机会','投入几年学习，承受一些经济压力。',{education:'大学在读',knowledge:16,money:-g*.12,job:'学生',income:0}),
 option('开始第一份工作','从学徒做起，积累实际经验。',{job:'学徒',income:g*.4,knowledge:5,social:6}),
 option('读职业课程','将学习与实践结合起来。',{education:'职业教育',knowledge:10,job:'技术助理',income:g*.3})]],
 22:['工作的第一道门','一封邮件和一次面试，让未来变得具体。',[
 option('选择稳定岗位','收入适中，生活更有规律。',{education:s.education==='大学在读'?'大学':s.education,job:'行政职员',income:g*.6,happiness:5}),
 option('进入技术行业','继续钻研技能，承担工作压力。',{education:s.education==='大学在读'?'大学':s.education,job:'技术人员',income:g*(.6+s.stats.knowledge/100),health:-4,knowledge:8}),
 option('尝试自由职业','收入有波动，也有更多自主时间。',{job:'自由职业者',income:g*(.35+roll(s)*.8),happiness:10,social:5})]],
 26:['一个聊得来的人','有人愿意听你讲那些平凡的日子。',[
 option('认真经营关系','给彼此时间，尝试共同生活。',{partner:person(s,s.country),happiness:12,social:7,money:-g*.03}),
 option('保持朋友关系','你想先走好自己的路。',{happiness:5,social:10,knowledge:4})]],
 30:['家的形状','你开始想象未来的家，会是什么样子。',[
 option('迎接一个孩子','育儿需要金钱、精力和耐心。',{child:true,happiness:10,health:-3,money:-g*.12}),
 option('先照顾自己','把时间留给自己的生活与兴趣。',{health:5,happiness:7,money:g*.03})]],
 35:['另一座城市','外地的一次机会，让你想到搬家。',[
 option('搬去新的国家','适应陌生环境，寻找新的工作空间。',{relocate:countryFor(s,'pop').id,social:-8,knowledge:6,money:-g*.15,income:s.income*1.2}),
 option('留下扎根','继续经营熟悉的人际关系。',{social:10,happiness:6})]],
 40:['工作与生活的分量','你已积累了一些经验，也有了新的取舍。',[
 option('承担更大责任','争取晋升，同时承受压力。',{job:'资深'+s.job,income:s.income*1.3,health:-7,happiness:-3}),
 option('给生活留白','减少加班，让日子慢下来。',{income:s.income*.9,health:8,happiness:10})]],
 50:['身体发来的提醒','体检报告上有几个需要留意的数字。',[
 option('安排治疗和复查','及时干预，并调整日常习惯。',{money:-g*.08,health:16}),
 option('从生活习惯做起','多走路，按时休息，持续观察。',{health:7,happiness:5})]],
 60:['时间留给谁','熟悉的人慢慢老去，相聚变得珍贵。',[
 option('陪伴家人与朋友','让寻常的一餐多一些交谈。',{social:12,happiness:12,income:s.income*.9}),
 option('学习一直想学的事','重新体验初学者的好奇。',{knowledge:12,happiness:9})]],
 65:['新的生活节奏','你可以重新安排工作的分量。',[
 option('正式退休','以积蓄和养老金支持平静生活。',{retired:true,job:'退休',income:g*.25,health:7,happiness:8}),
 option('继续做些工作','保留熟悉的节奏和同事。',{job:'兼职顾问',income:Math.max(s.income*.55,g*.2),social:6,health:-3})]],
 70:['把经验传下去','有人向你请教年轻时经历过的难题。',[
 option('参与社区互助','帮助别人，也建立新的联结。',{social:12,happiness:8}),
 option('写下人生故事','为记忆找一个长久的住处。',{knowledge:8,happiness:10})]],
 80:['珍惜眼前的日子','慢下来的日子里，许多小事更值得记住。',[
 option('接受照护与治疗','让身体得到更周全的照顾。',{health:12,money:-g*.1}),
 option('和亲友多相聚','在熟悉的声音里度过时光。',{social:10,happiness:12,health:3})]]
 };
 if(events[s.age]&&(s.age<=22||roll(s)>.12)) {
  const [title,text,options]=events[s.age];s.pending={title,text,options};log(s,title,text,'choice');
 }
}
const focusEffects={study:{knowledge:4},work:{knowledge:1,health:-1,happiness:-1},health:{health:3,happiness:1},family:{social:3,happiness:2},joy:{happiness:3,social:1}};
export function setFocus(s,focus) {
 if(!Object.hasOwn(focusEffects,focus)) throw new RangeError('未知的生活重心');if(!s.dead) s.focus=focus;return s;
}
export function choose(s,index) {
 if(s.dead||!s.pending) return s;
 if(!Number.isInteger(index)||!s.pending.options[index]) throw new RangeError('选择不存在');
 const o=s.pending.options[index],e=o.effects||{},details=[];
 const labels={health:'健康',happiness:'幸福',knowledge:'学识',social:'社交'};
 for(const k of Object.keys(s.stats)) if(typeof e[k]==='number') {
  s.stats[k]+=e[k];details.push(`${labels[k]}${e[k]>=0?'+':''}${e[k]}`);
 }
 if(e.money) {s.money+=e.money;details.push(`积蓄${e.money>=0?'+':''}${Math.round(e.money)}`);}
 for(const k of ['income','job','education','partner','retired']) if(e[k]!==undefined) s[k]=e[k];
 if(e.income!==undefined) details.push(`年收入调整为${Math.round(e.income)}`);
 if(e.partner) details.push(`与${e.partner.name}成为伴侣`);
 if(e.child) {
  const child={...person(s,s.country),birthYear:s.birthYear+s.age,age:0};s.children.push(child);details.push(`孩子${child.name}来到家中`);
 }
 if(e.relocate) {
  s.country=JSON.parse(JSON.stringify(COUNTRIES.find(c=>c.id===e.relocate)));details.push(`迁居${s.country.name}${s.country.city}`);
 }
 log(s,o.label,`${o.description}${details.length?' '+details.join('，')+'。':''}`,'consequence');
 s.pending=null;normalize(s);return s;
}
export function advanceYear(s) {
 if(s.dead||s.pending) return s;s.age++;const a=s.age;
 for(const [k,v] of Object.entries(focusEffects[s.focus]||focusEffects.joy)) s.stats[k]+=v;
 s.stats.health-=(a<40?.25:a<65?.8:1.6);if(a<18) s.stats.knowledge+=2;
 if(a>=18&&!s.retired&&s.income>0) s.income*=s.focus==='work'?1.045:1.012;
 const cost=s.country.gdp*(a<18?.015:s.retired?.18:.28);
 s.money+=s.income*(s.focus==='family'?.96:1)-cost;
 if(s.money < -s.country.gdp) {s.stats.happiness-=2;s.stats.health-=.3;}
 if(roll(s)<.16) {
  const good=roll(s)>.4;s.stats.happiness+=good?5:-4;s.stats.social+=good?2:-1;
  log(s,good?'小小的亮光':'不太顺利的一年',good?pick(s,['一次重逢让你想起了旧日的自己。','你和朋友分享了一顿简单却难忘的饭。','一件坚持许久的小事终于有了回报。']):pick(s,['生活有些忙乱，你试着给自己一点耐心。','一项计划暂时搁置了，你仍在寻找新的办法。']),'event');
 }
 for(const child of s.children) child.age=s.birthYear+a-child.birthYear;
 for(const p of s.companions) {
  p.age=Math.min(a,p.life);p.dead=a>=p.life;p.job=p.dead?'人生已结束':a<18?'学生':a>=65?'退休':a>=22?'在自己的城市工作':'初入社会';
 }
 normalize(s);const limit=clamp(s.longevity+(s.stats.health-50)*.12,35,109);
 if(a>=110||a>=limit||(a>45&&roll(s)<(100-s.stats.health)*.00012)) {
  s.dead=true;s.deathAge=a;s.deathCause=a<65?'疾病带来的生命终点':'身体逐渐衰老';s.income=0;
  log(s,'这一生，走到了终点',`${a}岁时，你的人生停在这里。那些相遇、选择与普通的日子，组成了独一无二的一生。`,'death');
 } else opportunity(s);return s;
}
export function summarize(s) {
 return {name:s.name,age:s.age,years:`${s.birthYear}—${s.dead?s.birthYear+s.deathAge:'至今'}`,
 title:s.dead?'一生的回响':'仍在书写的人生',text:`${s.name}在${s.country.name}走过${s.age}年，${s.education}，${s.job}。${s.children.length?'养育了'+s.children.length+'个孩子。':''}每个平凡的选择，都留下了自己的痕迹。`,
 country:s.country.name,score:Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/4),money:s.money,education:s.education,job:s.job,children:s.children.length,
 highlights:s.log.filter(e=>['birth','consequence','death'].includes(e.type)).slice(-8),dead:s.dead,deathCause:s.deathCause};
}
