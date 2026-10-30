import { initSystems, systemsYear, systemChoice, systemAction, peopleMilestone } from './life-systems.js';
import { initEducation, educationYear, educationMilestone, educationChoice } from './education.js';
import { initFinance, financeYear, creditBlocked } from './finance.js';
import { careerAction, careerYear } from './career.js';
export { systemAction };
// A self-contained, deterministic life simulation for the demo.
// All country/price figures are approximate teaching data, not official statistics.
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
export const COUNTRIES = rows.map(([id,name,flag,region,city,pop,birth,life,gdp,male,female,surnames]) => ({
 id,name,flag,region,city,pop,birth,life,gdp,
 names:{male:male.split(','),female:female.split(','),surnames:surnames.split(',')},estimated:true
}));

export const DESTINATIONS = [
 {id:'domestic',name:'国内慢旅行',place:'山海之间的小城',flag:'🏞️',region:'国内',costFactor:.045,minCost:90,happiness:7,knowledge:2,social:3,risk:.018,blurb:'坐慢车去一座不赶时间的城市，住几天，走走停停。'},
 {id:'jp',name:'日本 · 京都',place:'京都',flag:'🇯🇵',region:'东亚',costFactor:.15,minCost:750,happiness:10,knowledge:6,social:2,risk:.02,blurb:'清晨的寺院、旧书店和一碗热汤面。'},
 {id:'th',name:'泰国 · 清迈',place:'清迈',flag:'🇹🇭',region:'东南亚',costFactor:.10,minCost:480,happiness:9,knowledge:4,social:3,risk:.025,blurb:'山城、夜市，还有一条慢慢流的河。'},
 {id:'kr',name:'韩国 · 釜山',place:'釜山',flag:'🇰🇷',region:'东亚',costFactor:.11,minCost:520,happiness:9,knowledge:4,social:3,risk:.02,blurb:'海边列车、市场小吃和傍晚的灯光。'},
 {id:'fr',name:'法国 · 巴黎',place:'巴黎',flag:'🇫🇷',region:'欧洲',costFactor:.22,minCost:1200,happiness:11,knowledge:6,social:2,risk:.025,blurb:'沿着塞纳河走，直到天完全黑下来。'},
 {id:'it',name:'意大利 · 托斯卡纳',place:'托斯卡纳',flag:'🇮🇹',region:'欧洲',costFactor:.19,minCost:1050,happiness:11,knowledge:5,social:3,risk:.02,blurb:'山坡上的小镇、橄榄树和一顿很长的午餐。'},
 {id:'us',name:'美国 · 西海岸',place:'西海岸',flag:'🇺🇸',region:'北美',costFactor:.24,minCost:1500,happiness:10,knowledge:5,social:3,risk:.03,blurb:'一号公路、国家公园和一间公路旅店。'},
 {id:'eg',name:'埃及 · 开罗',place:'开罗',flag:'🇪🇬',region:'北非',costFactor:.14,minCost:700,happiness:9,knowledge:7,social:2,risk:.035,blurb:'金字塔比照片更大，也更沉默。'},
 {id:'tr',name:'土耳其 · 伊斯坦布尔',place:'伊斯坦布尔',flag:'🇹🇷',region:'西亚',costFactor:.14,minCost:720,happiness:10,knowledge:6,social:3,risk:.03,blurb:'在欧亚之间坐渡轮，听整座城的晚祷。'},
 {id:'id',name:'印度尼西亚 · 巴厘岛',place:'巴厘岛',flag:'🇮🇩',region:'东南亚',costFactor:.11,minCost:560,happiness:11,knowledge:3,social:3,risk:.025,blurb:'稻田、海风和一场不设闹钟的早晨。'},
 {id:'br',name:'巴西 · 里约',place:'里约',flag:'🇧🇷',region:'南美',costFactor:.20,minCost:1100,happiness:11,knowledge:4,social:4,risk:.04,blurb:'山和海挤在一起，音乐从街角一直响到夜里。'},
 {id:'ma',name:'摩洛哥 · 马拉喀什',place:'马拉喀什',flag:'🇲🇦',region:'北非',costFactor:.13,minCost:680,happiness:9,knowledge:5,social:3,risk:.03,blurb:'老城的巷子像迷宫，香料和皮革的味道混在一起。'},
 {id:'in',name:'印度 · 拉贾斯坦',place:'拉贾斯坦',flag:'🇮🇳',region:'南亚',costFactor:.09,minCost:420,happiness:9,knowledge:6,social:3,risk:.045,blurb:'沙漠边的宫殿、火车和颜色很响亮的集市。'},
 {id:'mx',name:'墨西哥 · 瓦哈卡',place:'瓦哈卡',flag:'🇲🇽',region:'北美',costFactor:.14,minCost:720,happiness:10,knowledge:5,social:3,risk:.035,blurb:'市场里的玉米、辣椒和一场街头乐队。'},
 {id:'au',name:'澳大利亚 · 塔斯马尼亚',place:'塔斯马尼亚',flag:'🇦🇺',region:'大洋洲',costFactor:.26,minCost:1600,happiness:10,knowledge:4,social:2,risk:.025,blurb:'海崖、桉树林和几乎没有人的公路。'},
 {id:'is',name:'冰岛 · 环岛公路',place:'冰岛',flag:'🇮🇸',region:'欧洲',costFactor:.27,minCost:1700,happiness:11,knowledge:6,social:2,risk:.03,blurb:'瀑布、黑沙滩和午夜还亮着的天。'}
];

export const STOCKS = [
 {symbol:'NOVA',name:'新星科技',sector:'科技',price:118,mean:.10,vol:.34,beta:1.15,blurb:'做芯片和云服务，涨得快，也跌得急。'},
 {symbol:'GREEN',name:'绿野能源',sector:'能源',price:64,mean:.055,vol:.24,beta:.75,blurb:'风电和储能，受政策和油价影响。'},
 {symbol:'MOMO',name:'百味食品',sector:'消费',price:42,mean:.06,vol:.16,beta:.55,blurb:'做调味品和零食，日子再难也要吃饭。'},
 {symbol:'ORBIT',name:'环宇物流',sector:'物流',price:86,mean:.075,vol:.27,beta:.95,blurb:'港口、卡车和仓库，跟全球贸易一起呼吸。'},
 {symbol:'LOTUS',name:'莲花医药',sector:'医疗',price:132,mean:.08,vol:.25,beta:.7,blurb:'仿制药与医疗器械，研发消息会带来大波动。'}
];

export const STOCK_RISKS = [
 {id:'conservative',name:'保守',description:'偏向低波动行业，接受较小的涨跌。',allocations:{MOMO:.7,GREEN:.3},minReturn:-.08,maxReturn:.12},
 {id:'moderate',name:'适度',description:'分散配置多个行业，接受中等幅度亏损。',allocations:{NOVA:.2,GREEN:.2,MOMO:.2,ORBIT:.2,LOTUS:.2},minReturn:-.25,maxReturn:.35},
 {id:'high',name:'高风险',description:'集中配置高波动行业，可能大赚，也可能大亏。',allocations:{NOVA:.8,ORBIT:.2},minReturn:-.65,maxReturn:.85}
];

export const PURCHASES = [
 {id:'phone',name:'一部智能手机',desc:'拍照、联系朋友、查资料。',costFactor:.025,happiness:2,knowledge:2,once:true},
 {id:'computer',name:'一台笔记本电脑',desc:'学习、工作、写点自己的东西。',costFactor:.07,happiness:2,knowledge:4,once:true},
 {id:'bike',name:'一辆自行车',desc:'通勤和周末都方便，也让身体动起来。',costFactor:.035,health:2,happiness:2,once:true},
 {id:'gym',name:'一年的健身卡',desc:'把运动变成生活的一部分。',costFactor:.025,health:5,happiness:2,once:true},
 {id:'course',name:'一门职业课程',desc:'学一门能用在工作和生活里的技能。',costFactor:.06,knowledge:8,happiness:2,once:true},
 {id:'insurance',name:'医疗保险',desc:'生病时少一点账单上的惊吓。',costFactor:.015,insurance:true,once:false}
];

const clamp = (n,min=0,max=100) => Math.max(min,Math.min(max,n));
const round = n => Math.round(Number(n)||0);
const hash = seed => {let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
function roll(life){life.randomState=(life.randomState+0x6D2B79F5)>>>0;let t=life.randomState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
export function rng(seed=Date.now()){const s={randomState:hash(seed)};return()=>roll(s);}
const chance=(life,p)=>roll(life)<p;
const pick=(life,xs)=>xs[Math.floor(roll(life)*xs.length)];
const pickWeighted=(life,xs,weight=x=>x.weight||1)=>{const total=xs.reduce((s,x)=>s+weight(x),0);let n=roll(life)*total;for(const x of xs){n-=weight(x);if(n<0)return x;}return xs[xs.length-1];};
const countryFor=(life,mode)=>{const key=mode==='pop'||mode==='population'?'pop':'birth';let n=roll(life)*COUNTRIES.reduce((sum,c)=>sum+c[key],0);return COUNTRIES.find(c=>(n-=c[key])<0)||COUNTRIES.at(-1);};
const person=(life,c,sex=roll(life)<.5?'男':'女')=>({name:pick(life,c.names.surnames)+pick(life,c.names[sex==='男'?'male':'female']),sex});
const log=(life,title,text,type='life')=>life.log.push({age:life.age,year:life.birthYear+life.age,title,text,type});
const statLabels={health:'健康',happiness:'幸福',knowledge:'学识',social:'人际'};
const FOCUS_EFFECTS={study:{knowledge:4},work:{knowledge:1,health:-1,happiness:-1},health:{health:3,happiness:1},family:{social:3,happiness:2},joy:{happiness:3,social:1}};
export const FOCUS_NAMES={study:'学习',work:'事业',health:'健康',family:'家人',joy:'体验生活'};

function initialMarket(){return {index:100,lastReturn:0,regime:'平稳',stocks:Object.fromEntries(STOCKS.map(s=>[s.symbol,{price:s.price,change:0}]))};}
function initialInvestments(){return {index:0,bonds:0,property:0};}

export function upgradeLife(life){
 if(!life||typeof life!=='object')return life;
 if(life.money==null)life.money=0;
 if(life.money<0){life.debt=(life.debt||0)-life.money;life.money=0;}
 life.debt=life.debt||0;
 life.investments=Object.assign(initialInvestments(),life.investments||{});
 life.market=life.market&&life.market.stocks?life.market:initialMarket();
 for(const s of STOCKS)if(!life.market.stocks[s.symbol])life.market.stocks[s.symbol]={price:s.price,change:0};
 life.holdings=Array.isArray(life.holdings)?life.holdings:[];
 life.possessions=Array.isArray(life.possessions)?life.possessions:[];
 life.travels=Array.isArray(life.travels)?life.travels:[];
 life.recentEvents=Array.isArray(life.recentEvents)?life.recentEvents:[];
 life.netWorthHistory=Array.isArray(life.netWorthHistory)?life.netWorthHistory:[];
 life.house=life.house||null;
 life.car=!!life.car;
 life.insurance=!!life.insurance;
 life.retired=!!life.retired;
 life.partner=life.partner||null;
 if(life.partner&&life.partner.bond==null)life.partner.bond=68;
 life.children=Array.isArray(life.children)?life.children:[];
 for(const c of life.children){if(c.birthYear==null)c.birthYear=life.birthYear+life.age-(c.age||0);if(c.age==null)c.age=Math.max(0,life.age-(c.birthYear-life.birthYear));}
 life.family=life.family||{};
 if(typeof life.family.mother==='string')life.family.mother={name:life.family.mother,sex:'女',age:60};
 if(typeof life.family.father==='string')life.family.father={name:life.family.father,sex:'男',age:62};
 life.family.mother=life.family.mother||{name:'母亲',sex:'女',age:55};
 life.family.father=life.family.father||{name:'父亲',sex:'男',age:57};
 if(life.family.mother.alive==null)life.family.mother.alive=true;
 if(life.family.father.alive==null)life.family.father.alive=true;
 if(life.stats)for(const k of Object.keys(life.stats))life.stats[k]=clamp(life.stats[k]);
 if(!Array.isArray(life.log))life.log=[];
 if(!life.notes)life.notes=[];
 initSystems(life); initEducation(life); initFinance(life);
 return life;
}

export function createLife({era='now',mode='birth',seed=Date.now(),country,sex,name}={}){
 const s={randomState:hash(seed)};
 const c=COUNTRIES.find(c=>c.id===(typeof country==='object'?country?.id:country))||countryFor(s,mode);
 const birthYear=era==='past'?1970:era==='future'?2050:era==='any'?1950+Math.floor(roll(s)*101):2026;
 const who=person(s,c,sex==='男'||sex==='女'?sex:undefined),wealth=roll(s);
 Object.assign(s,{id:`life-${hash(seed).toString(36)}-${c.id}`,seed,era,mode,name:name||who.name,sex:who.sex,
  country:JSON.parse(JSON.stringify(c)),birthCountry:JSON.parse(JSON.stringify(c)),birthYear,age:0,
  stats:{health:65+Math.floor(roll(s)*30),happiness:55+Math.floor(roll(s)*30),knowledge:5,social:30+Math.floor(roll(s)*30)},
  money:Math.round(c.gdp*(.015+wealth*.08)),income:0,job:'尚未工作',education:'尚未入学',partner:null,children:[],
  family:{mother:{...person(s,c,'女'),age:22+Math.floor(roll(s)*15),job:pick(s,['教师','店员','农民','护士','技术员']),alive:true},
   father:{...person(s,c,'男'),age:24+Math.floor(roll(s)*16),job:pick(s,['司机','工人','农民','工程师','小店经营者']),alive:true},
   siblings:[],background:wealth<.22?'贫困':wealth<.48?'温饱':wealth<.78?'中产':'富裕',wealth},
  log:[],pending:null,dead:false,deathCause:null,deathAge:null,focus:'joy',companions:[],
  notes:[],
  longevity:clamp(c.life+(birthYear===1970?-6:birthYear>=2050?5:0)+(roll(s)-.5)*24,45,106),retired:false,
  investments:initialInvestments(),debt:0,holdings:[],market:initialMarket(),possessions:[],travels:[],house:null,car:false,insurance:false,
  recentEvents:[],lastEventAge:null,lastTravelYear:null,netWorthHistory:[],achievements:[]});
 for(let i=0;i<4;i++){
  const cc=countryFor(s,mode);s.companions.push({...person(s,cc),id:`companion-${i}`,country:JSON.parse(JSON.stringify(cc)),birthYear,
   life:Math.round(clamp(cc.life+(roll(s)-.5)*30,35,108)),age:0,dead:false,job:'尚未工作'});
 }
 s.classBand=s.family.background;
  log(s,'世界多了一个你',`${birthYear}年，你出生在${c.name}${c.city}。对照当地人均 GDP，你家大约高于${Math.round(wealth*100)}%的家庭，更接近${s.family.background}。这是游戏里的分层，不是官方收入统计。父母给你取名${s.name}。`,'birth');
 log(s,'同一秒的远方','另外四个孩子也在这个世界睁开眼睛。你们彼此陌生，却一起走进时间。','world');
 initSystems(s); initEducation(s); initFinance(s);
 return s;
}

export function classStanding(life){
 const gdp=life.country?.gdp||1;
 const worth=netWorth(life);
 const ratio=worth/gdp;
 const birth=Math.max(0,Math.min(1,life.family?.wealth??.4));
 const band=life.age<18?(birth<.22?'贫困':birth<.48?'温饱':birth<.78?'中产':'富裕'):(ratio<.15?'贫困':ratio<1.2?'温饱':ratio<4.5?'中产':'富裕');
 return {band,ratio,worth,birth};
}
export function netWorth(life){
 upgradeLife(life);
 const stockValue=life.holdings.reduce((sum,h)=>sum+h.shares*(life.market.stocks[h.symbol]?.price||0),0);
 return round(life.money+life.investments.index+life.investments.bonds+life.investments.property+stockValue+(life.house?.value||0)-life.debt-(life.house?.loan||0));
}
export function investedValue(life){upgradeLife(life);return round(life.investments.index+life.investments.bonds+life.investments.property+life.holdings.reduce((sum,h)=>sum+h.shares*(life.market.stocks[h.symbol]?.price||0),0));}
export function stockValue(life,symbol){upgradeLife(life);return round((life.holdings.find(h=>h.symbol===symbol)?.shares||0)*(life.market.stocks[symbol]?.price||0));}

function addDebt(life,amount){if(amount<=0)return;life.debt=round((life.debt||0)+amount);}
function spend(life,amount){
 upgradeLife(life);
 if(amount<=0)return;
 if(life.money>=amount){life.money-=amount;return;}
 let left=amount-life.money;life.money=0;
 for(const key of ['bonds','index','property']){
  if(left<=0)break;
  const take=Math.min(life.investments[key],left);life.investments[key]-=take;left-=take;
 }
 if(left<=0)return;
 for(const h of [...life.holdings]){
  if(left<=0)break;
  const price=life.market.stocks[h.symbol]?.price||0;const shares=Math.min(h.shares,left/price);h.shares-=shares;left-=shares*price;if(h.shares<.0001)life.holdings.splice(life.holdings.indexOf(h),1);
 }
 if(left>0)addDebt(life,left);
}
function applyStats(life,effects,details){
 for(const k of ['health','happiness','knowledge','social']){
  if(typeof effects[k]==='number'&&effects[k]!==0){life.stats[k]=clamp(life.stats[k]+effects[k]);details.push(`${statLabels[k]}${effects[k]>=0?'+':''}${effects[k]}`);}
 }
}
function ensurePartner(life){
 if(life.partner)return life.partner;
 const p=person(life,life.country,life.sex==='男'?'女':'男');life.partner={...p,age:life.age,countryId:life.country.id,distanceYears:0,bond:72,income:Math.round(life.country.gdp*.35),job:'职员'};return life.partner;
}
function ensureChild(life){
 const c=person(life,life.country,chance(life,.5)?'男':'女');life.children.push({...c,birthYear:life.birthYear+life.age,age:0,bond:70});return life.children.at(-1);
}

export function applyEffects(life,effects={}){
 upgradeLife(life);const details=[];
 applyStats(life,effects,details);
 if(effects.cash){const value=effects.cash<0&&effects.medical&&life.insurance?effects.cash*.3:effects.cash;if(value<0)spend(life,-value);else life.money+=value;details.push(`现金${value>=0?'+':''}${round(value)}${effects.medical&&life.insurance?'（保险承担70%）':''}`);}
 if(effects.debt){life.debt=Math.max(0,life.debt+effects.debt);details.push(`负债${effects.debt>=0?'+':''}${round(effects.debt)}`);}
 if(typeof effects.income==='number'){life.income=Math.max(0,effects.income);details.push(`年收入调整为${round(life.income)}`);}
 if(typeof effects.incomePct==='number'){life.income=Math.max(0,life.income*(1+effects.incomePct));details.push(`年收入${effects.incomePct>=0?'+':''}${Math.round(effects.incomePct*100)}%`);}
 if(effects.career){const r=careerAction(life,effects.career);details.push(r.message);}
 if(effects.job)life.job=effects.job;
 if(effects.education)details.push('学历改由逐年学业决定，这次选择不直接授予学历');
 if(effects.education)life.education=effects.education;
 if(effects.retired){life.retired=true;life.job='退休';}
 if(effects.partner){const r=systemAction(life,'seek-partner');details.push(r.message||'可以表达心意，对方仍可能拒绝');}
 if(effects.child||effects.conception){const r=systemAction(life,'plan-child');details.push(r.ok?r.message:'没有适龄伴侣，这次不会有孩子');}
 if(effects.relocate){systemAction(life,'move-abroad',{countryId:effects.relocate});details.push('开始讨论迁居与同行安排');}
 if(effects.insurance){life.insurance=true;details.push('有了医疗保险');}
 if(effects.car){life.car=true;if(!life.possessions.includes('car'))life.possessions.push('car');details.push('有了自己的车');}
 if(effects.item){const r=buyItem(life,effects.item,true);if(r.ok)details.push(r.message);}
 if(effects.invest){for(const [type,pct] of Object.entries(effects.invest)){const amount=life.money*Math.max(0,Math.min(1,pct));const r=invest(life,type,amount,true);if(r.ok)details.push(r.message);}}
 if(effects.travel){const r=travel(life,effects.travel,'solo',{free:true,silent:true});if(r.ok)details.push(r.message);}
 if(effects.sellAll){
  const total=investedValue(life);
  life.money+=total*.995;
  for(const type of ['index','bonds','property'])life.investments[type]=0;
  life.holdings=[];details.push(`卖出投资，到账约${round(total*.995)}`);
 }
 if(effects.healthRisk){const hurt=Math.round(effects.healthRisk);life.stats.health=clamp(life.stats.health-hurt);details.push(`健康-${hurt}`);}
 return details;
}

function marketStep(life){
 const crash=chance(life,.035),boom=!crash&&chance(life,.05);
 const shock=crash?-(.18+roll(life)*.2):boom?.12+roll(life)*.12:0;
 const idx=clamp((roll(life)+roll(life)+roll(life)-1.5)*.13+.065+shock,-.55,.55);
 const bonds=.025+(roll(life)-.5)*.02;
 const property=.04+(roll(life)-.5)*.05;
 life.investments.index*=1+idx;
 life.investments.bonds*=1+bonds;
 life.investments.property*=1+property;
 life.market.index*=1+idx;
 life.market.lastReturn=idx;
 life.market.regime=crash?'下跌':boom?'繁荣':Math.abs(idx)>.12?(idx>0?'回暖':'震荡'):'平稳';
 for(const s of STOCKS){
  const st=life.market.stocks[s.symbol];const sector=chance(life,.05)?(roll(life)-.5)*.35:0;
  let r=clamp(idx*s.beta+(roll(life)-.5)*s.vol*.7+sector,-.7,.8);
  const held=life.holdings.find(h=>h.symbol===s.symbol);
  if(held){ // 持有越久，这只股的年度涨跌越向它自己的长期平均回报回归
   held.heldYears=(held.heldYears||0)+1;
   r=clamp(r+(s.mean-r)*Math.min(.3,(held.heldYears-1)*.1),-.7,.8);
  }
  st.change=r;st.price=Math.max(1,st.price*(1+r));
  if(st.price>500){st.price/=4;for(const h of life.holdings)if(h.symbol===s.symbol)h.shares*=4;}
  if(st.price<3){st.price*=4;for(const h of life.holdings)if(h.symbol===s.symbol)h.shares/=4;}
 }
 if(Math.abs(idx)>.12||crash||boom){
  const direction=idx>=0?'上涨':'下跌';
  log(life,`市场${direction}`,`今年的市场${direction}了 ${Math.abs(idx*100).toFixed(0)}%。${crash?'新闻里全是“抛售”和“避险”，你的账户也缩水了。':boom?'身边的人突然都开始谈股票，连出租车司机也不例外。':'有人后悔没早点卖，有人觉得机会来了。'}`,'market');
 }
}
function appreciationStep(life){
 if(life.house){life.house.value=round(life.house.value*1.03);if(life.house.loan>0){const payment=life.house.loan*.075;spend(life,payment);life.house.loan=Math.max(0,life.house.loan*1.05-payment);if(life.house.loan<1)life.house.loan=0;}}

}
function familyStep(life){
 if(life.partner&&life.partner.alive!==false){
  life.partner.bond=clamp(life.partner.bond+(life.focus==='family'?3:life.focus==='work'?-2:-.5));
  life.partner.age=(life.partner.age||life.age)+1;
 }
 for(const c of life.children)c.age=Math.max(0,life.age-(c.birthYear-life.birthYear));
  for(const sib of life.family?.siblings||[])if(sib&&sib.alive!==false)sib.age=(sib.age||0)+1;
 for(const p of [life.family.mother,life.family.father]){
  if(!p||p.alive===false)continue;p.age=(p.age||60)+1;
  if(p.age>72&&chance(life,.035+(p.age-72)*.006)){
   p.alive=false;life.stats.happiness=clamp(life.stats.happiness-7);life.stats.social=clamp(life.stats.social-3);
   log(life,'一位亲人离开了',`${p.name}在${p.age}岁时离开了。你整理旧物时，发现一张很久以前的照片。`,'family');
  }
 }
 if(life.age>=18){
  const studying=life.school?.program&&!life.school.program.paused&&['apply-university','apply-masters','apply-high','apply-vocational'].includes(life.school.program.id);
  const minor=life.children.filter(c=>c.age<18&&c.alive!==false&&!c.dead&&c.supportPayer!=='player').length;
  let cost=life.country.gdp*(.2+(life.house?0:.06)+minor*.05+(life.car?.012:0)+(life.insurance?.012:0));
  if(life.income===0&&life.age<22)cost=life.country.gdp*.045;
  else if(life.income===0)cost*=.55;
  if(initFinance(life).austerityUntil>=life.age)cost*=.8;
  if(life.income>0&&life.money+life.income>=cost)life.money+=life.income-cost;
  else if(life.income>0){life.money+=life.income;spend(life,cost);}
  else spend(life,cost);
  life.money=Math.max(0,round(life.money*1.01))||0;
 }
}
function deathCheck(life){
 const limit=clamp(life.longevity+(life.stats.health-50)*.14,40,109);
 if(life.age>=110||life.age>=limit||(life.age>50&&chance(life,(100-life.stats.health)*.00015))){
  life.dead=true;life.deathAge=life.age;life.deathCause=life.stats.health<30?'长期疾病':'身体逐渐衰老';life.income=0;life.pending=null;
  log(life,'这一生，走到了终点',`${life.age}岁时，你的人生停在这里。那些相遇、选择与普通的日子，组成了独一无二的一生。`,'death');
  return true;
 }
 return false;
}

// ---------------- Milestone choices ----------------
const MILESTONES={
 5:{title:'还没上学的那个下午',text:'母亲把一本旧绘本放在桌边，门外传来邻居孩子的笑声。今天下午，你想怎样度过？',options:[
  {label:'认真听故事',description:'从阅读里发现更大的世界。',effects:{knowledge:10,happiness:3}},
  {label:'认识新朋友',description:'和邻座一起画一张想象中的地图。',effects:{social:12,happiness:7}},
  {label:'帮家里做事',description:'分担一点生活，也更早理解父母。',effects:{social:5,happiness:2,cash:200}}]},
 12:{title:'自己的课余时间',text:'课业变多了，你开始决定下午怎么过。',options:[
  {label:'加入科学小组',description:'花几个月完成一个小实验。',effects:{knowledge:12,happiness:-2}},
  {label:'参加运动队',description:'在操场上学会合作，也把身体练好。',effects:{health:9,social:8}},
  {label:'帮家里做事',description:'分担家务，也攒下一点零用钱。',effects:{social:5,money:0,cash:400,happiness:3}}]},
 30:{title:'家的形状',text:'你开始想象未来的家，会是什么样子。',options:[
  {label:'和伴侣尝试要一个孩子',description:'没有适龄伴侣就不会出生。即使尝试，这一年也可能没有孩子。',effects:{conception:true}},
  {label:'先照顾自己',description:'把时间留给自己的生活与兴趣。',effects:{health:5,happiness:7,cash:1200}}]},
 35:{title:'另一座城市',text:'外地的一次机会，让你想到搬家。',options:[
  {label:'去问那个外地机会',description:'只是开始申请。签证可能失败；去成后收入和开销都按目的地重算。',effects:{relocate:'__random__'}},
  {label:'留下扎根',description:'继续经营熟悉的人际关系。',effects:{social:10,happiness:6}}]},
 40:{title:'工作与生活的分量',text:'你已经积累了一些经验，也有了新的取舍。',options:[
  {label:'提交晋升申请',description:'根据技能、关系与工作投入竞争岗位，也可能被拒绝。',effects:{career:'promotion'}},
  {label:'给生活留白',description:'减少加班，让日子慢下来。',effects:{incomePct:-.1,health:8,happiness:10}}]},
 50:{title:'身体发来的提醒',text:'体检报告上有几个需要留意的数字。',options:[
  {label:'安排治疗和复查',description:'及时干预，并调整日常习惯。',effects:{medical:true,cash:'-gdp:.25',health:16}},
  {label:'从生活习惯做起',description:'多走路，按时休息，持续观察。',effects:{health:7,happiness:5}}]},
 60:{title:'时间留给谁',text:'熟悉的人慢慢老去，相聚变得珍贵。',options:[
  {label:'陪伴家人与朋友',description:'让寻常的一餐多一些交谈。',effects:{social:12,happiness:12,incomePct:-.1}},
  {label:'学习一直想学的事',description:'重新体验初学者的好奇。',effects:{knowledge:12,happiness:9}}]},
 65:{title:'新的生活节奏',text:'你可以重新安排工作的分量。',options:[
  {label:'正式退休',description:'以积蓄和养老金支持平静生活。',effects:{retired:true,job:'退休',income:'gdp:.25',health:7,happiness:8}},
  {label:'继续做些工作',description:'保留熟悉的节奏和同事。',effects:{job:'兼职顾问',income:'gdp:.45',social:6,health:-3}}]},
 70:{title:'把经验传下去',text:'有人向你请教年轻时经历过的难题。',options:[
  {label:'参与社区互助',description:'帮助别人，也建立新的联结。',effects:{social:12,happiness:8}},
  {label:'写下人生故事',description:'为记忆找一个长久的住处。',effects:{knowledge:8,happiness:10}}]},
 80:{title:'珍惜眼前的日子',text:'慢下来的日子里，许多小事更值得记住。',options:[
  {label:'接受照护与治疗',description:'让身体得到更周全的照顾。',effects:{medical:true,health:12,cash:'-gdp:.3'}},
  {label:'和亲友多相聚',description:'在熟悉的声音里度过时光。',effects:{social:10,happiness:12,health:3}}]}
};
function resolveIncome(value,life){
 if(typeof value==='number')return value;
 if(typeof value==='string'&&value.startsWith('gdp:')){const factor=Number(value.slice(4));return Math.round(life.country.gdp*factor);}
 return 0;
}
function resolveMoney(value,life){
 if(typeof value==='number')return value;
 if(typeof value==='string'&&value.startsWith('-gdp:'))return -Math.round(life.country.gdp*Number(value.slice(5)));
 if(typeof value==='string'&&value.startsWith('gdp:'))return Math.round(life.country.gdp*Number(value.slice(4)));
 return 0;
}
function prepareEffects(effects,life){
 const e={...effects};
 if(typeof e.income==='string')e.income=resolveIncome(e.income,life);
 if(typeof e.cash==='string')e.cash=resolveMoney(e.cash,life);
 if(typeof e.debt==='string')e.debt=resolveMoney(e.debt,life);
 if(e.relocate==='__random__'){
  const pool=COUNTRIES.filter(c=>c.id!==life.country.id);
  e.relocate=pick(life,pool).id;
 }
 return e;
}
function setMilestone(life,age){
 if([15,18,22].includes(age)){educationMilestone(life,age);return;}
 if(age===26){if(!life.partner||life.partner.alive===false)systemAction(life,'seek-partner');return;}
 if(age===5||age===12){peopleMilestone(life,age);return;}
 const m=MILESTONES[age];if(!m)return;
 const options=m.options.map(o=>({label:o.label,description:o.description,effects:prepareEffects(o.effects,life)}));
 life.pending={kind:'milestone',title:m.title,text:m.text,options};
 log(life,m.title,m.text,'choice');
}

// ---------------- Random events ----------------
const EVENTS=[
 {id:'school_praise',age:[7,14],weight:1,cond:l=>(l.school?.basicProgress||0)>0||!!(l.school?.program&&!l.school.program.paused),build:l=>({title:'老师多看了你一眼',text:'作业本上多了一行字：“你比昨天写得更好。”',type:'warm',options:[
  {key:'study',label:'把那句话记在心里',description:'认真对待下一次作业。',effects:{knowledge:6,happiness:2}},
  {key:'play',label:'和朋友去操场',description:'把下午留给奔跑和笑声。',effects:{happiness:6,social:4}}]})},
 {id:'bully',age:[8,15],weight:.8,cond:()=>true,build:l=>({title:'走廊尽头的声音',text:'有人反复拿你的口音开玩笑。你站在走廊尽头，不知道要不要回头。',type:'bad',options:[
  {key:'tell',label:'告诉老师和家人',description:'让大人知道，也让自己不再一个人扛。',effects:{social:4,happiness:2,knowledge:1}},
  {key:'endure',label:'假装没听见',description:'希望他们有一天会腻。',effects:{happiness:-5,social:-2}},
  {key:'fight',label:'当面顶回去',description:'把话说清楚，也承担冲突的后果。',effects:{health:-2,social:2,happiness:1}}]})},
 {id:'family_move',age:[6,16],weight:.5,cond:()=>true,build:l=>({title:'家搬到了另一边',text:'父母换了工作，你跟着搬去城市另一头。旧朋友还在原来的学校，新房间的窗朝北。',type:'event',effects:{social:-3,knowledge:4,happiness:-2}})},
 {id:'found_wallet',age:[8,16],weight:.5,cond:()=>true,build:l=>({title:'长椅上的钱包',text:'一只旧钱包躺在长椅上，里面有一张身份证和几张纸币。',type:'event',options:[
  {key:'return',label:'交给附近的店员',description:'也许失主会回来找。',effects:{social:5,happiness:3}},
  {key:'keep',label:'先收起来',description:'没有人看见。',effects:{cash:600,happiness:-3}}]})},
 {id:'sibling_try',age:[1,14],weight:.55,cond:l=>{const m=l.family?.mother,f=l.family?.father;if(!m||m.alive===false||!f||f.alive===false)return false;if((m.age??99)<20||(m.age??0)>45||(f.age??0)>62)return false;if((l.family.siblings||[]).length>=3)return false;return (l.family.lastSiblingTry??-9)+4<=l.age;},build:l=>{l.family.siblings||=[];l.family.lastSiblingTry=l.age;const mature=Math.max(0,(l.family.mother.age||40)-34)*.015+Math.max(0,(l.family.father.age||40)-50)*.01;if(!chance(l,Math.max(.12,.58-mature)))return{title:'家里没有添人',text:`${l.family.mother.name}和${l.family.father.name}都还在，也提过再要一个孩子。母亲${l.family.mother.age}岁，父亲${l.family.father.age}岁。这一年没有迎来新生儿。`,type:'family',effects:{happiness:-1}};const sex=chance(l,.5)?'男':'女';const sib={...person(l,l.country,sex),id:`sibling-${l.birthYear+l.age}-${l.family.siblings.length}`,age:0,birthYear:l.birthYear+l.age,alive:true,bond:55};l.family.siblings.push(sib);return{title:`${sib.name}出生了`,text:`${l.family.mother.name}生下了${sex==='男'?'弟弟':'妹妹'}${sib.name}。这是一个会和你一起长大的人。`,type:'warm',effects:{social:3,happiness:2}};}},
 {id:'child_illness',age:[1,10],weight:.5,cond:()=>true,build:l=>({title:'半夜的发烧',text:'你烧到三十九度，父母抱着你去了医院。走廊的灯很白。',type:'bad',effects:{medical:true,health:-4,cash:-600,happiness:-2}})},
 {id:'exam_pressure',age:[12,18],weight:1,cond:()=>true,build:l=>({title:'一场重要的考试',text:'成绩会决定下一步能去哪里。书桌上的台灯亮到很晚。',type:'event',options:[
  {key:'cram',label:'熬夜复习',description:'把能记住的都记住。',effects:{knowledge:8,health:-3}},
  {key:'normal',label:'按平常节奏复习',description:'睡够，也留一点空白。',effects:{knowledge:4,happiness:1}},
  {key:'giveup',label:'这次先放下',description:'承认自己需要休息。',effects:{knowledge:-4,happiness:2}}]})},
 {id:'first_crush',age:[14,19],weight:.8,cond:l=>!l.partner,build:l=>({title:'心跳得有点快',text:'你发现自己总在人群里找同一个人。对方笑起来的时候，你忘了要说什么。',type:'warm',options:[
  {key:'confess',label:'找个机会说出来',description:'不管结果如何，至少不再猜。',effects:{happiness:6,social:3}},
  {key:'friend',label:'先做朋友',description:'把喜欢放在心里，慢慢相处。',effects:{happiness:2,social:2}}]})},
 {id:'part_time',age:[15,19],weight:.6,cond:()=>true,build:l=>({title:'周末的零工',text:'一家店愿意让你周末去帮忙，工资不高，但够买自己想要的东西。',type:'event',options:[
  {key:'work',label:'去做兼职',description:'攒一点钱，也见识真实的工作。',effects:{cash:1200,social:3,knowledge:-2}},
  {key:'study',label:'把周末留给学习',description:'准备考试，暂时不打工。',effects:{knowledge:5}}]})},
 {id:'online_link',age:[12,30],weight:.5,cond:()=>true,build:l=>({title:'一条陌生的链接',text:'屏幕上弹出一条消息：点开就能领取一份礼物。你盯着那个陌生的网址。',type:'bad',options:[
  {key:'click',label:'点开看看',description:'也许是真的。',effects:{cash:'-gdp:.05',happiness:-3}},
  {key:'ignore',label:'关掉并举报',description:'不把时间交给陌生人的链接。',effects:{knowledge:1,happiness:1}}]})},
 {id:'promotion',age:[23,58],weight:1,cond:l=>l.age>=18&&!l.retired&&l.income>0,build:l=>({title:'更大的责任',text:'上司问你愿不愿意接手一个更重要的项目。它会占用很多晚上。',type:'event',options:[
  {key:'accept',label:'接下来',description:'收入和压力一起变多。',effects:{incomePct:.15,health:-4,happiness:3,social:2}},
  {key:'decline',label:'把手上的事做好',description:'不急着证明自己。',effects:{happiness:2,social:2}}]})},
 {id:'layoff',age:[25,60],weight:.5,cond:l=>!l.retired&&l.income>0,build:l=>({title:'一封信',text:'公司调整了业务，你的岗位被列进了名单。桌上的东西不多，一个纸箱就装完了。',type:'bad',options:[
  {key:'hunt',label:'马上找工作',description:'把简历投出去，也问问旧同事。',effects:{job:'求职中',income:-1,happiness:-5,cash:-1000}},
  {key:'reskill',label:'先学一门新技能',description:'用几个月补上缺口。',effects:{job:'求职中',income:0,cash:-2500,knowledge:8,happiness:-2}},
  {key:'rest',label:'休息一段时间',description:'允许自己停一停。',effects:{job:'待业',income:0,happiness:2,cash:-2000}}]})},
 {id:'side_hustle',age:[22,55],weight:.7,cond:l=>!l.retired&&l.income>0,build:l=>({title:'下班后的副业',text:'朋友拉你一起做一个小项目：周末拍视频，或者接一点设计活。',type:'event',options:[
  {key:'join',label:'试着做起来',description:'少睡一点，多一份可能。',effects:{cash:-800,incomePct:.08,health:-3,knowledge:4}},
  {key:'pass',label:'先顾好主业',description:'把精力留给已经选择的生活。',effects:{happiness:1}}]})},
 {id:'stock_tip',age:[22,65],weight:.7,cond:l=>l.money>800,build:l=>({title:'行情软件的深夜推送',text:'群里有人晒出收益截图，劝你在市场里下一注。你决定先想清楚自己能承受多大亏损，再由系统配置标的。这次投入四分之一现金，按一段持有期的行情结算。',type:'event',options:[
   ...STOCK_RISKS.map(risk=>({key:risk.id,label:`${risk.name}投入`,description:`${risk.description} 本次模拟收益范围 ${Math.round(risk.minReturn*100)}% 至 +${Math.round(risk.maxReturn*100)}%。`,resolve:l=>{
    const amount=round(l.money*.25);
    const move=risk.minReturn+roll(l)*(risk.maxReturn-risk.minReturn);
    const gain=round(amount*move);
    return{text:`你选择${risk.name}风险，投入 ${amount}，系统按风险承受能力分配标的。持有期结束后${gain>=0?'盈利':'亏损'} ${Math.abs(gain)}（${(move*100).toFixed(1)}%），收回 ${amount+gain}。`,effects:{cash:gain,happiness:gain>=0?4:-3,knowledge:2}};
   }})),
   {key:'pass',label:'不投',description:'保留现金，不承担这次市场波动。',effects:{knowledge:1}}]})},
 {id:'market_crash',age:[25,75],weight:.6,cond:l=>investedValue(l)>1000,build:l=>({title:'屏幕上的红色',text:'市场连续几天大跌。手机里的数字变小了，群里有人开始骂，有人开始抄底。',type:'market',options:[
  {key:'sell',label:'先卖掉，落袋为安',description:'把能保住的保住。',resolve:l=>({text:'你卖掉了大部分投资。手续费吞掉一点，但今晚终于睡着了。',effects:{sellAll:true,happiness:-2,knowledge:2}})},
  {key:'hold',label:'什么都不做',description:'相信时间，也接受波动。',effects:{happiness:-2,knowledge:3}},
  {key:'buy',label:'再买一点',description:'用一成现金加仓。',resolve:l=>({text:'你又买了一些。没有人知道这是底部，还是半山腰。',effects:{invest:{index:.1},happiness:-1,knowledge:2}})}]})},
 {id:'lottery',age:[18,80],weight:.5,cond:l=>l.money>500,build:l=>({title:'街角的彩票店',text:'一张彩票只要很少的钱，海报上写着“改变命运”。',type:'event',options:[
  {key:'buy',label:'买一张',description:'当作一个很便宜的梦。',resolve:l=>{const win=chance(l,.03);return{text:win?'你中了一个小奖。金额不算多，但足够请朋友吃一顿。':'没有中。你把彩票夹进书里，当作今年的一枚书签。',effects:{cash:win?8000:-200,happiness:win?6:0}}}},
  {key:'pass',label:'走过去',description:'把这点钱留给更确定的事。',effects:{knowledge:1}}]})},
 {id:'scam_call',age:[20,80],weight:.7,cond:()=>true,build:l=>({title:'自称客服的电话',text:'对方说你的账户出了问题，需要马上把钱转到“安全账户”。背景音里有人在敲键盘。',type:'bad',options:[
  {key:'transfer',label:'按对方说的做',description:'你很担心账户真的出事。',effects:{cash:-Math.min(5000,Math.max(800,Math.round(l.money*.25))),happiness:-6}},
  {key:'hangup',label:'挂断并打官方电话',description:'先核实，再决定。',effects:{knowledge:2,happiness:1}},
  {key:'report',label:'报警并提醒家人',description:'让这件事停在今天。',effects:{social:2,happiness:2}}]})},
 {id:'wedding',age:[20,50],weight:.7,cond:l=>l.age>=20,build:l=>({title:'一张婚礼请柬',text:'老朋友要结婚了。请柬上写着你的名字，地点在另一座城市。',type:'event',options:[
  {key:'go',label:'去参加，随一份礼',description:'见见旧朋友，也送上祝福。',effects:{cash:'-gdp:.08',social:5,happiness:4}},
  {key:'decline',label:'礼到人不到',description:'最近实在走不开。',effects:{cash:-500,social:-1}}]})},
 {id:'rent_rise',age:[22,60],weight:.5,cond:l=>!l.house,build:l=>({title:'房东发来的消息',text:'房租下个月要涨。房东说附近都这个价，你可以考虑，也可以搬。',type:'event',options:[
  {key:'accept',label:'接受涨租',description:'不用折腾，但每月更紧。',effects:{cash:-1800,happiness:-2}},
  {key:'move',label:'找更便宜的房子',description:'搬家很累，但能省下一点。',effects:{cash:-2500,social:-2,happiness:-1,knowledge:1}},
  {key:'negotiate',label:'和房东谈谈',description:'说明自己的情况，争取一个折中。',effects:{cash:-700,happiness:1,social:1}}]})},
 {id:'health_scare',age:[30,75],weight:.7,cond:()=>true,build:l=>({title:'身体发出的信号',text:'持续几周的疲惫和疼痛，让你开始想：要不要去医院查一查？',type:'bad',options:[
  {key:'check',label:'做一次全面检查',description:'花钱买一个确定的答案。',effects:{medical:true,cash:-2500,health:5,knowledge:2}},
  {key:'wait',label:'再观察一阵',description:'也许只是最近太累了。',effects:{health:-3,happiness:-1}}]})},
 {id:'burnout',age:[25,55],weight:.6,cond:l=>!l.retired&&l.income>0,build:l=>({title:'提不起劲的早晨',text:'闹钟响了三遍，你还是不想起床。工作没有出错，但你已经很久没有期待过周一。',type:'bad',options:[
  {key:'rest',label:'请一段假',description:'把时间还给自己。',effects:{cash:-2000,health:6,happiness:5}},
  {key:'push',label:'再撑一阵',description:'项目结束就好了。',effects:{health:-5,incomePct:.03,happiness:-2}}]})},
 {id:'parent_illness',age:[25,60],weight:.6,cond:l=>l.family.mother?.alive||l.family.father?.alive,build:l=>{const p=l.family.mother?.alive?l.family.mother:l.family.father;return{title:'医院走廊',text:`${p.name}住院了。医生说需要有人照顾，也需要一笔不算小的费用。`,type:'bad',options:[
  {key:'pay',label:'承担治疗费用',description:'把积蓄拿出来，换一个安心。',effects:{medical:true,cash:-6000,social:5,happiness:2}},
  {key:'company',label:'请几天假去陪伴',description:'钱可以再挣，时间不能。',effects:{cash:'-gdp:.08',social:6,happiness:3,health:-1}},
  {key:'busy',label:'先忙完手上的事',description:'你知道自己会为此难过很久。',effects:{happiness:-6,social:-3}}]}}},
 {id:'child_school',age:[30,55],weight:.8,cond:l=>l.children.some(c=>c.age>=5&&c.age<=17),build:l=>{const c=l.children.find(c=>c.age>=5&&c.age<=17);return{title:'孩子的学校',text:`${c.name}到了要选学校的年纪。公立学校近，私立学校资源更多，也更贵。`,type:'event',options:[
  {key:'public',label:'就近上公立学校',description:'把省下的钱留给生活。',effects:{cash:-1000,knowledge:2,happiness:2}},
  {key:'private',label:'咬牙送私立',description:'希望孩子有更多选择。',effects:{cash:'-gdp:.3',knowledge:6,happiness:3}},
  {key:'home',label:'多花时间陪他学',description:'学校之外，家庭也是课堂。',effects:{social:5,knowledge:3,happiness:3}}]}}},
 {id:'reunion',age:[30,70],weight:.8,cond:()=>true,build:l=>({title:'多年后的重逢',text:'你在街上遇见一个很久没见的人。你们站在路边，从近况聊到从前。',type:'warm',effects:{happiness:5,social:4}})},
 {id:'inheritance',age:[40,75],weight:.4,cond:()=>true,build:l=>({title:'一封律师信',text:'一位远房亲人去世了，留给你一笔不多的钱。你甚至想不起上次见他是什么时候。',type:'event',effects:{cash:Math.round(l.country.gdp*.7),happiness:-2}})},
 {id:'business_idea',age:[28,60],weight:.5,cond:l=>!l.retired&&l.money>3000,build:l=>({title:'一个开店的机会',text:'朋友要转让一家小店。位置不错，但要先投入一笔钱，也不保证能赚回来。',type:'event',options:[
  {key:'invest',label:'把钱投进去',description:'自己当一次老板。',resolve:l=>{const win=chance(l,.52);const gain=round(l.money*.5*(win?.8:-.5));return{text:win?'小店慢慢有了回头客。你第一次体会到“为自己工作”的重量。':'生意没有撑过一年。你关掉店门，把剩下的货折价处理。',effects:{cash:gain,incomePct:win?.12:0,happiness:win?6:-5,knowledge:3}}}},
  {key:'pass',label:'继续现在的工作',description:'不做没有把握的冒险。',effects:{happiness:1}}]})},
 {id:'home_repair',age:[30,80],weight:.4,cond:l=>!!l.house,build:l=>({title:'屋顶漏水了',text:'一场大雨之后，天花板出现了一块水渍。维修师傅说，最好尽快处理。',type:'event',effects:{cash:-3500,happiness:-2}})},
 {id:'travel_deal',age:[25,70],weight:.6,cond:l=>l.money>1500,build:l=>{const d=pick(l,DESTINATIONS.slice(1));return{title:'一张便宜的机票',text:`朋友发来一张去${d.name}的折扣机票，只比他去年买的价格贵一点。`,type:'event',options:[
  {key:'book',label:`订票去${d.place}`,description:`大约 ${Math.round(d.minCost*.8)} 的机票和住宿。`,resolve:l=>{const r=travel(l,d.id,'solo',{discount:.8});return{text:r.ok?`你去了${d.place}。回来之后，手机里多了几百张照片。`:'你翻了翻账户，最后还是把页面关掉了。',effects:{happiness:r.ok?3:0}}}},
  {key:'skip',label:'把假期留到以后',description:'以后也许会有更合适的时候。',effects:{knowledge:1}}]}}},
 {id:'volunteer',age:[25,80],weight:.5,cond:()=>true,build:l=>({title:'社区在招志愿者',text:'社区中心贴出通知，周末需要人帮忙整理旧书、陪老人聊天。',type:'warm',options:[
  {key:'join',label:'去帮一天忙',description:'做一些不赚钱但有用的事。',effects:{social:6,happiness:4}},
  {key:'donate',label:'捐一点钱',description:'用另一种方式参与。',effects:{cash:-500,social:2,happiness:2}}]})},
 {id:'insurance_offer',age:[25,60],weight:.5,cond:l=>!l.insurance,build:l=>({title:'一份医疗保险',text:'保险代理人打来电话，说一场大病可能让一个家庭很多年缓不过来。',type:'event',options:[
  {key:'buy',label:'给自己买一份',description:'每年交一笔保费，生病时少一点压力。',effects:{insurance:true,cash:'-gdp:.05',happiness:2}},
  {key:'skip',label:'暂时不需要',description:'先把钱用在眼前。',effects:{knowledge:1}}]})},
 {id:'grandchild',age:[55,88],weight:.7,cond:l=>l.children.length>0,build:l=>({title:'家里又添了一个小人',text:'你的孩子有了孩子。你抱着那个小小的身体，突然想起很多年前的这个季节。',type:'warm',effects:{happiness:8,social:4}})},
 {id:'old_friend_loss',age:[55,92],weight:.4,cond:()=>true,build:l=>({title:'一个熟悉的名字',text:'你听说一位老朋友走了。你们约过好几次要见面，最后都没有成行。',type:'bad',effects:{happiness:-4,health:-1,social:-1}})},
 {id:'late_learning',age:[50,82],weight:.5,cond:()=>true,build:l=>({title:'一直想学的事',text:'社区大学开了一门课，是你年轻时一直想学、却总没有时间学的东西。',type:'event',options:[
  {key:'enroll',label:'报名去上课',description:'和比自己年轻很多的人坐进同一间教室。',effects:{cash:'-gdp:.08',knowledge:8,happiness:4}},
  {key:'self',label:'自己找书看',description:'按自己的节奏慢慢学。',effects:{knowledge:4,happiness:2}}]})},
 {id:'natural_disaster',age:[10,85],weight:.3,cond:()=>true,build:l=>({title:'天气变得陌生',text:'一场罕见的暴雨打乱了城市。你家的窗户进了水，附近的道路也断了。',type:'bad',effects:{cash:-4200,health:-2,happiness:-4}})},
 {id:'windfall',age:[20,80],weight:.3,cond:()=>true,build:l=>({title:'一笔意外的钱',text:'你整理旧物时，发现一张多年前的存单，金额比记忆里多了一点。',type:'warm',effects:{cash:Math.round(l.country.gdp*.25),happiness:4}})},
 {id:'theft',age:[20,75],weight:.3,cond:()=>true,build:l=>({title:'空掉的口袋',text:'在拥挤的车站，你的钱包不见了。补办证件比丢钱更让人疲惫。',type:'bad',effects:{cash:-Math.min(2000,Math.round(l.money*.08)),happiness:-4}})},
 {id:'mentor',age:[20,40],weight:.5,cond:l=>!l.retired,build:l=>({title:'愿意带你的人',text:'一位前辈说，愿意花时间教你做事，也会把一些机会交给你。',type:'event',options:[
  {key:'follow',label:'认真跟着学',description:'多做一些，也多学一些。',effects:{knowledge:6,incomePct:.05,health:-1}},
  {key:'distance',label:'保持自己的节奏',description:'不想把生活全部交给工作。',effects:{happiness:2}}]})},
 {id:'health_check',age:[40,70],weight:.5,cond:()=>true,build:l=>({title:'一次体检',text:'社区医院在组织体检。排队的人不少，大家都安静地看着手机。',type:'event',options:[
  {key:'go',label:'去做检查',description:'早一点知道，早一点处理。',effects:{medical:true,cash:'-gdp:.05',health:4,knowledge:2}},
  {key:'skip',label:'改天再说',description:'最近实在太忙。',effects:{health:-1}}]})},
 {id:'retire_plan',age:[55,66],weight:.5,cond:l=>!l.retired,build:l=>({title:'退休这件事',text:'你开始认真算一笔账：还要工作几年，养老金够不够，房子和存款能不能撑住。',type:'event',options:[
  {key:'save',label:'再多存一点',description:'把一部分现金放进更稳的地方。',effects:{cash:'-gdp:.15',invest:{bonds:1},happiness:-1}},
  {key:'enjoy',label:'也给自己花一点',description:'日子不是只为退休准备的。',effects:{cash:'-gdp:.08',happiness:5}}]})}
];
const EVENT_BY_ID=Object.fromEntries(EVENTS.map(e=>[e.id,e]));

function maybeEvent(life){
 if(life.pending||life.dead||life.age<2)return;
 const since=life.lastEventAge==null?99:life.age-life.lastEventAge;
 let p=life.age<10?.12:.2;
 if(since>=4)p+=.12;
 if(since>=7)p+=.18;
 if(!chance(life,p))return;
 const pool=EVENTS.filter(e=>life.age>=e.age[0]&&life.age<=e.age[1]&&!life.recentEvents.includes(e.id)&&(!e.cond||e.cond(life)));
 if(!pool.length)return;
 const event=pickWeighted(life,pool);
 const buildState=life.randomState;
 const data=event.build(life);
 if(!data)return;
 if(life.age<6&&data.options?.length)return;
 life.lastEventAge=life.age;life.recentEvents.push(event.id);if(life.recentEvents.length>8)life.recentEvents.shift();
 if(data.options?.length){
  life.pending={kind:'event',eventId:event.id,buildState,title:data.title,text:data.text,options:data.options.map(o=>({key:o.key,label:o.label,description:o.description}))};
  log(life,data.title,data.text,'event');
 }else{
  const details=applyEffects(life,data.effects||{});
  log(life,data.title,`${data.text}${details.length?` ${details.join('，')}。`:''}`,data.type||'event');
 }
}

function randomEventCount(life){return life.recentEvents.length;}

// ---------------- Public actions ----------------
export function setFocus(life,focus){
 upgradeLife(life);
 if(!Object.hasOwn(FOCUS_EFFECTS,focus))throw new RangeError('未知的生活重心');
 if(!life.dead)life.focus=focus;return life;
}

export function choose(life,index){
 upgradeLife(life);
 if(life.dead||!life.pending)return life;
 if(!Number.isInteger(index)||!life.pending.options[index])throw new RangeError('选择不存在');
 const pending=life.pending;
 if(pending.kind==='education'){educationChoice(life,index);return life;}
 if(pending.kind==='system'){systemChoice(life,pending,index);return life;}
 life.pending=null;
 const option=pending.options[index];let outcome={effects:option.effects||{},text:option.description||''};
 if(pending.kind==='event'){
  const event=EVENT_BY_ID[pending.eventId];
  const context=JSON.parse(JSON.stringify(life));
  if(pending.buildState!=null)context.randomState=pending.buildState;
  const built=event?.build(context);
  const source=built?.options?.find(o=>o.key===option.key);
  if(source?.resolve)outcome=source.resolve(life);else if(source)outcome={effects:source.effects||{},text:source.description||''};
 }
 const effects=prepareEffects(outcome.effects||{},life);
 const details=applyEffects(life,effects);
 log(life,option.label,`${outcome.text||option.description||''}${details.length?` ${details.join('，')}。`:''}`,'consequence');
 for(const k of Object.keys(life.stats))life.stats[k]=clamp(life.stats[k]);
 life.money=Math.max(0,round(life.money));life.income=Math.max(0,round(life.income));life.debt=Math.max(0,round(life.debt));
 return life;
}

export function advanceYear(life,options={}){
 upgradeLife(life);
 if(life.dead||life.pending)return life;
 life.age++;const age=life.age;
 const focus=FOCUS_EFFECTS[life.focus]||FOCUS_EFFECTS.joy;
 for(const [k,v] of Object.entries(focus))life.stats[k]=clamp(life.stats[k]+v);
 life.stats.health-=(age<40?.3:age<65?.75:1.6);
 if(age<18)life.stats.knowledge=clamp(life.stats.knowledge+((life.school?.basicProgress>0||life.school?.program)&&!life.school?.program?.paused?2:.4));
 careerYear(life);
  if(age>=18&&!life.retired&&life.income>0)life.income*=1+(life.focus==='work'?.045:.02);
 if(life.retired&&life.income<=0)life.income=Math.round(life.country.gdp*.2);
 marketStep(life);
 appreciationStep(life);
 familyStep(life);
 educationYear(life);
 if(options.events!==false&&!life.pending)setMilestone(life,age);
 systemsYear(life, options);
 financeYear(life);
 for(const p of life.companions){p.age=Math.min(age,p.life);p.dead=age>=p.life;p.job=p.dead?'人生已结束':age<18?'学生':age>=65?'退休':age>=22?'在自己的城市工作':'初入社会';}
 life.netWorthHistory.push({age,value:netWorth(life)});
 if(deathCheck(life))return life;
 if(options.events!==false){
  if(!life.pending)maybeEvent(life);
 }
 if(!life.dead&&life.stats.health<=0){
  life.dead=true;life.deathAge=age;life.deathCause='身体长期衰弱';life.income=0;life.pending=null;
  log(life,'这一生，走到了终点',`${age}岁时，你的人生停在这里。那些相遇、选择与普通的日子，组成了独一无二的一生。`,'death');
 }
 if(!life.dead&&life.debt>life.country.gdp*.8&&(life.income<life.country.gdp*.5||life.debt>Math.max(life.income*3,life.country.gdp)))life.stats.happiness=Math.min(life.stats.happiness,58);
  const standing=classStanding(life);
  if(life.classBand&&life.classBand!==standing.band&&life.age>=18){const order=['富裕','中产','温饱','贫困'];const fell=order.indexOf(standing.band)>order.indexOf(life.classBand);log(life,fell?'家境往下掉了一截':'越过了原来的那条线',fell?`欠款、失业或亏掉的钱把你从${life.classBand}带到${standing.band}。在${life.country.name}，接下来的账单变了。`:`工作、经验和你待的地方让日子越过了${life.classBand}。你现在更接近${standing.band}，仍可能掉回去。`,'life');}
  life.classBand=standing.band;
  for(const k of Object.keys(life.stats))life.stats[k]=clamp(life.stats[k]);
 life.money=Math.max(0,round(life.money));life.income=Math.max(0,round(life.income));life.debt=Math.max(0,round(life.debt));
 return life;
}

export function invest(life,type,amount,quiet=false){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 if(!['index','bonds','property'].includes(type))return {ok:false,message:'未知的投资类型'};
 amount=Math.round(Number(amount)||0);
 if(!Number.isFinite(amount)||amount<10)return {ok:false,message:'请输入至少 10 的有效金额'};
 if(life.money<amount)return {ok:false,message:'现金不足，先留出生活费和应急钱'};
 const fee=Math.round(amount*.005);life.money-=amount;life.investments[type]+=amount-fee;
 if(!quiet)log(life,{index:'买入指数基金',bonds:'买入债券',property:'买入不动产基金'}[type],`投入 ${amount}，手续费 ${fee}。市场有涨有跌，这笔钱需要时间。`,'finance');
 return {ok:true,message:`已投入 ${amount-fee} 到${ {index:'指数基金',bonds:'债券',property:'不动产基金'}[type]}`};
}
export function withdraw(life,type,amount,quiet=false){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 if(!['index','bonds','property'].includes(type))return {ok:false,message:'未知的投资类型'};
 amount=Math.round(Number(amount)||0);
 if(!Number.isFinite(amount)||amount<=0)return {ok:false,message:'金额无效'};
 const value=life.investments[type];if(value<=0)return {ok:false,message:'这里没有可卖出的钱'};
 const sell=Math.min(value,amount),fee=Math.round(sell*.005);life.investments[type]-=sell;life.money+=sell-fee;
 if(!quiet)log(life,'卖出一部分投资',`卖出 ${sell}，手续费 ${fee}，到账 ${sell-fee}。`,'finance');
 return {ok:true,message:`到账 ${sell-fee}`};
}
export function buyStock(life,symbol,amount){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 const meta=STOCKS.find(s=>s.symbol===symbol);const price=life.market.stocks[symbol]?.price;
 if(!meta||!price)return {ok:false,message:'没有这个标的'};
 amount=Math.round(Number(amount)||0);
 if(!Number.isFinite(amount)||amount<10)return {ok:false,message:'请输入至少 10 的有效金额'};
 if(life.money<amount)return {ok:false,message:'现金不足'};
 const fee=Math.round(amount*.005),shares=(amount-fee)/price;
 life.money-=amount;
 const h=life.holdings.find(h=>h.symbol===symbol);
 if(h){h.shares+=shares;}else life.holdings.push({symbol,shares,cost:price});
 log(life,`买入 ${meta.name}`,`以 ${price.toFixed(1)} 的价格买入 ${shares.toFixed(2)} 股，手续费 ${fee}。`,'finance');
 return {ok:true,message:`买入 ${meta.name} ${shares.toFixed(2)} 股`};
}
export function investStocks(life,riskId,amount){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 if(riskId==='pass'){
  log(life,'这次不投股票','你保留了现金，没有新增持仓，也不承担这次投资的波动。','finance');
  return {ok:true,message:'保留现金，暂不投资'};
 }
 const risk=STOCK_RISKS.find(r=>r.id===riskId);
 if(!risk)return {ok:false,message:'请选择风险承受程度'};
 amount=Math.round(Number(amount)||0);
 if(!Number.isFinite(amount)||amount<50)return {ok:false,message:'请输入至少 50 的有效金额'};
 if(life.money<amount)return {ok:false,message:'现金不足'};
 const allocations=Object.entries(risk.allocations);
 // Validate the whole order before buying so an invalid market cannot leave a partial purchase.
 if(allocations.some(([symbol])=>!Number.isFinite(life.market.stocks[symbol]?.price)||life.market.stocks[symbol].price<=0))return {ok:false,message:'行情暂不可用'};
 let remaining=amount;
 for(const [index,[symbol,weight]] of allocations.entries()){
  const part=index===allocations.length-1?remaining:Math.floor(amount*weight);
  buyStock(life,symbol,part);remaining-=part;
 }
 log(life,`${risk.name}风险投资`,`投入 ${amount}，系统按${risk.name}风险配置：${allocations.map(([symbol,weight])=>`${STOCKS.find(s=>s.symbol===symbol).name} ${Math.round(weight*100)}%`).join('、')}。持仓随每年行情变化，可能盈利或亏损。`,'finance');
 return {ok:true,message:`已按${risk.name}风险配置 ${amount}`};
}
export function sellStock(life,symbol,shares){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 const h=life.holdings.find(h=>h.symbol===symbol);const price=life.market.stocks[symbol]?.price;
 if(!h||!price)return {ok:false,message:'没有这只股票'};
 shares=Math.min(h.shares,Math.max(0,Number(shares)||0));
 if(!Number.isFinite(shares)||shares<=0)return {ok:false,message:'股数无效'};
 const gross=shares*price,fee=Math.round(gross*.005);life.money+=gross-fee;h.shares-=shares;
 if(h.shares<.0001)life.holdings.splice(life.holdings.indexOf(h),1);
 log(life,`卖出 ${symbol}`,`卖出 ${shares.toFixed(2)} 股，到账 ${Math.round(gross-fee)}，手续费 ${fee}。`,'finance');
 return {ok:true,message:`卖出 ${shares.toFixed(2)} 股`};
}
export function buyHouse(life,variant='normal'){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 if(life.age<18)return {ok:false,message:'成年后才能买房'};
 if(life.house)return {ok:false,message:'已经有一个家'};
 const base=Math.round(life.country.gdp*(variant==='small'?3:4.2));
 const down=Math.round(base*.2),loan=base-down;
 if(life.money<down)return {ok:false,message:`首付还差 ${down-life.money}`};
 life.money-=down;life.house={name:variant==='small'?'一个小家':'自己的家',value:base,loan,down};
 log(life,'买下了一个家',`首付 ${down}，贷款 ${loan}。从此每个月多了一笔固定的支出，也多了一扇可以关上的门。`,'finance');
 return {ok:true,message:'拿到钥匙了'};
}
export function buyCar(life){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 if(life.age<18)return {ok:false,message:'成年后才能买车'};
 if(life.car)return {ok:false,message:'已经有车了'};
 const cost=Math.round(life.country.gdp*.45);
 if(life.money<cost)return {ok:false,message:`还差 ${cost-life.money}`};
 life.money-=cost;life.car=true;if(!life.possessions.includes('car'))life.possessions.push('car');
 life.stats.happiness=clamp(life.stats.happiness+4);
 log(life,'有了自己的车',`花 ${cost} 买下一辆旧车。它不一定快，但能带你去更远的地方。`,'finance');
 return {ok:true,message:'车钥匙到手'};
}
export function buyItem(life,id,quiet=false){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 const item=PURCHASES.find(p=>p.id===id);
 if(!item)return {ok:false,message:'没有这个商品'};
 if(item.insurance&&life.insurance)return {ok:false,message:'已有医疗保险'};
 if(item.once&&life.possessions.includes(id))return {ok:false,message:'已经买过了'};
 const cost=Math.round(life.country.gdp*item.costFactor);
 if(life.money<cost)return {ok:false,message:`还差 ${cost-life.money}`};
 if(item.insurance){life.money-=cost;life.insurance=true;if(!quiet)log(life,'买了医疗保险','以后生病时，账单会轻一点。','finance');return {ok:true,message:'医疗保险已生效'};}
 life.money-=cost;life.possessions.push(id);
 for(const k of ['health','happiness','knowledge','social'])if(item[k])life.stats[k]=clamp(life.stats[k]+item[k]);
 if(!quiet)log(life,`买下${item.name}`,item.desc,'finance');
 return {ok:true,message:`买下${item.name}`};
}
export function creditLimit(life){return Math.round(Math.max(life.country.gdp*.5,life.income*1.5));}
export function takeLoan(life,amount){
 upgradeLife(life);amount=Math.round(Number(amount)||0);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 if(life.age<18)return {ok:false,message:'成年后才能借款'};
 if(!Number.isFinite(amount)||amount<=0)return {ok:false,message:'金额无效'};
 if(creditBlocked(life))return {ok:false,message:'连续拖欠或还款计划期间不能新增借款，先处理现有债务'};
 if(life.debt+amount>creditLimit(life))return {ok:false,message:'已超过当前收入可承担的借款额度'};
 life.debt+=amount;life.money+=amount;
 log(life,'借了一笔钱',`借入 ${amount}。它会在未来几年里，以利息的形式提醒你。`,'finance');
 return {ok:true,message:'钱到账了'};
}
export function repayDebt(life,amount){
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 upgradeLife(life);amount=Math.min(Math.round(Number(amount)||0),life.debt,life.money);
 if(amount<=0)return {ok:false,message:'没有可还的钱'};
 life.debt-=amount;life.money-=amount;
 log(life,'还掉一部分债',`还了 ${amount}，剩下的慢慢来。`,'finance');
 return {ok:true,message:`已还 ${amount}`};
}
export function setInsurance(life,on=true){
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 upgradeLife(life);life.insurance=!!on;
 log(life,on?'有了医疗保险':'停掉了医疗保险',on?'以后生病时，账单会轻一点。':'每个月少一笔固定支出，但风险回到自己身上。','finance');
 return {ok:true,message:on?'保险已开启':'保险已关闭'};
}
export function travelCost(life,destinationId,companion='solo'){
 const d=DESTINATIONS.find(x=>x.id===destinationId);if(!d)return null;
 const base=Math.max(d.minCost,life.country.gdp*d.costFactor);
 const mult=companion==='partner'?1.8:companion==='family'?(1+(life.partner?.8:0)+Math.min(3,life.children.filter(c=>c.age<18).length)*.5):companion==='friends'?1:1;
 return Math.round(base*mult);
}
export function travel(life,destinationId,companion='solo',options={}){
 upgradeLife(life);
 if(life.dead)return {ok:false,message:'这一生已经结束'};
 const d=DESTINATIONS.find(x=>x.id===destinationId);if(!d)return {ok:false,message:'没有这个目的地'};
 if(life.age<5)return {ok:false,message:'还太小，等长大一点再出发'};
 if(life.lastTravelYear===life.age&&!options.force)return {ok:false,message:'今年已经出过远门了'};
 if(companion==='partner'&&!life.partner)companion='solo';
 if(companion==='family'&&!life.partner&&!life.children.length)companion='solo';
 const rawCost=options.free?0:travelCost(life,destinationId,companion);
 const cost=options.free?0:Math.round(rawCost*(options.discount||1));
 if(life.money<cost&&!options.free)return {ok:false,message:`现金不足，还差 ${cost-life.money}`};
 life.money-=cost;life.lastTravelYear=life.age;
 life.stats.happiness=clamp(life.stats.happiness+d.happiness+(companion==='family'?2:0));
 life.stats.knowledge=clamp(life.stats.knowledge+d.knowledge);
 life.stats.social=clamp(life.stats.social+(companion==='solo'?1:d.social+2));
 life.stats.health=clamp(life.stats.health-(['is','au','br','us'].includes(d.id)?1:0));
 const risk=chance(life,d.risk);
 if(risk){life.stats.health=clamp(life.stats.health-4);spend(life,Math.round(cost*.08));}
 const companionName=companion==='partner'?life.partner?.name:companion==='family'?'家人':companion==='friends'?'朋友':'自己';
 const memory=`${d.flag} ${d.place} · 和${companionName}${risk?'（旅途中生了一场小病）':''}`;
 life.travels.push({id:d.id,name:d.name,place:d.place,flag:d.flag,year:life.birthYear+life.age,age:life.age,companion,cost,memory});
 life.sceneAction={id:`trip-${life.age}-${life.travels.length}`,type:'travel',age:life.age,text:`${companionName} · ${d.name}旅行`,from:life.country.name,to:d.name};
 if(!options.silent)log(life,`去了${d.name}`,risk?`${d.blurb} 只是回程时身体不太舒服，躺了两天才缓过来。`:`${d.blurb} 这趟旅行花了 ${cost}，但你记住了其中一些不需要花钱的瞬间。`,'travel');
 return {ok:true,cost,message:`${d.flag} ${d.place}`};
}

export function summarize(life){
 upgradeLife(life);
 const nw=netWorth(life);
 return {name:life.name,age:life.age,years:`${life.birthYear}—${life.dead?life.birthYear+life.deathAge:'至今'}`,title:life.dead?'一生的回响':'仍在书写的人生',
 text:`${life.name}在${life.country.name}走过${life.age}年，${life.education}，${life.job}。${life.children.length?'养育了'+life.children.length+'个孩子。':''}每个平凡的选择，都留下了自己的痕迹。`,
 country:life.country.name,score:Math.round(Object.values(life.stats).reduce((a,b)=>a+b,0)/4),money:nw,cash:life.money,invested:investedValue(life),debt:life.debt,
 education:life.education,job:life.job,children:life.children.length,travels:life.travels.length,house:!!life.house,
 highlights:life.log.filter(e=>['birth','consequence','death','travel','market'].includes(e.type)).slice(-8),dead:life.dead,deathCause:life.deathCause};
}
