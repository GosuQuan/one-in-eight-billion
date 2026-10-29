const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export { escape };

export function worldMap(){
 const lands=[[[20,58],[42,32],[83,21],[116,34],[139,29],[165,47],[147,67],[111,74],[102,95],[77,99],[59,80],[31,80]],[[104,101],[128,109],[143,139],[134,165],[121,196],[107,213],[99,186],[104,159],[93,130]],[[181,34],[212,27],[220,40],[200,57],[177,51]],[[218,64],[237,48],[261,43],[285,51],[317,40],[356,44],[388,62],[407,80],[384,91],[362,84],[346,105],[317,110],[305,131],[286,119],[278,95],[250,89],[237,76]],[[222,90],[250,88],[267,106],[267,132],[253,161],[236,172],[225,150],[213,126],[210,105]],[[321,126],[338,129],[350,145],[367,148],[365,155],[341,151]],[[354,169],[380,157],[400,168],[403,190],[379,199],[354,190]],[[414,196],[422,204],[414,214],[407,210]],[[276,161],[281,176],[276,184],[272,175]]];
 let dots='';const inside=(x,y,p)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>y)!=(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c;return c;};
 for(let y=20;y<222;y+=5)for(let x=15;x<430;x+=5)if(lands.some(p=>inside(x,y,p)))dots+=`<circle cx="${x}" cy="${y}" r="1.1"/>`;
 const locations=[[80,60],[98,65],[112,121],[124,142],[238,68],[246,71],[262,55],[247,107],[240,129],[258,124],[291,93],[299,98],[308,101],[321,91],[350,84],[347,128],[382,182],[393,76],[227,97],[272,83],[91,84],[143,153]];
 return `<svg class="world-map" viewBox="0 0 440 240" role="img" aria-label="世界人口分布示意地图"><g fill="currentColor" opacity=".23">${dots}</g><g fill="var(--wine)">${locations.map(([x,y],i)=>`<circle class="map-pulse" cx="${x}" cy="${y}" r="${i%3+2.5}" style="animation-delay:${i*.17}s" opacity="${.4+i%4*.15}"/>`).join('')}</g></svg>`;
}

export function scene(age=0,night=false){
 const people=age>28?3:2;
 const person=(x,y,color,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-7 0v-7h3v-3h8v3h3v7" fill="#483d38"/><path d="M-5-6h10v10H-5z" fill="#e8b997"/><path d="M-6 4h12v13H-6z" fill="${color}"/><path d="M-6 17h4v7h-4zm8 0h4v7H2z" fill="#4b4c49"/><path d="M-3-2h1v2h-1zm5 0h1v2H2z" fill="#362f31"/></g>`;
 return `<svg viewBox="0 0 640 220" class="scene" role="img" aria-label="像素风的房子、树木和一家人" shape-rendering="crispEdges"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${night?'#727f9b':'#c6dfdd'}"/><stop offset="1" stop-color="${night?'#e1c6bb':'#edf0dc'}"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h640v220H0z"/><circle cx="510" cy="45" r="22" fill="#f8e7b2"/><g fill="#ffffff" opacity=".75"><path d="M55 40h28v-6h37v7h21v10H55zm297-12h19v-6h25v5h23v10h-67z"/></g><path d="M0 152l65-28 68 12 73-25 71 28 62-15 101 25 70-18 130 15v74H0z" fill="#a6bd9c"/><path d="M0 172l130-12 140 10 163-8 207 7v51H0z" fill="#7e9c77"/><path d="M0 203h640v17H0z" fill="#688761"/><path d="M358 177h90v43h-90z" fill="#d8c9a9"/><path d="M339 91h122v87H339z" fill="#f2eee2"/><path d="M329 93l71-49 72 49z" fill="#a85d58"/><path d="M345 87l55-35 56 35z" fill="#ba7066"/><path d="M364 105h22v26h-22zm52 0h22v26h-22z" fill="#809fa0"/><path d="M374 105h2v26h-2zm-10 12h22v2h-22zm62-12h2v26h-2zm-10 12h22v2h-22z" fill="#e2deca"/><path d="M392 139h22v39h-22z" fill="#a28668"/><path d="M408 157h2v3h-2z" fill="#ecdbb1"/><path d="M438 49h12v32h-12z" fill="#a88677"/><path d="M96 120h10v76H96zm466 3h8v72h-8z" fill="#8b8164"/><path d="M70 110h14V94h37v16h14v35h-15v10H83v-10H70zm470 4h13V99h25v15h16v29h-14v13h-27v-13h-13z" fill="#71947b"/><path d="M77 111h12v-9h23v9h14v23H77zm470 8h12v-10h14v10h13v17h-39z" fill="#8ead89"/><g stroke="#dbe0c5" stroke-width="3"><path d="M145 174v27m28-27v27m28-27v27m28-27v27M140 183h96m-96 11h96"/></g>${person(277,171,'#a05462')}${person(305,171,'#647e94')}${people===3?person(326,185,'#d4a15c',.65):person(291,192,'#d4a15c',.45)}<g fill="#e6dca1"><path d="M32 191h3v4h-3zm122 17h3v3h-3zm317-16h3v3h-3zm126 11h3v3h-3z"/></g><path d="M0 217h640v3H0z" fill="#536e52"/></svg>`;
}

export function portrait(age=0,sex='男'){
 return `<svg viewBox="0 0 80 90" aria-hidden="true" class="portrait-svg"><rect width="80" height="90" rx="2" fill="#dde3d9"/><circle cx="40" cy="34" r="${age<5?15:17}" fill="#d7b394"/><path d="M23 31q-1-23 18-23 22 1 17 26l-8-16-26 13" fill="${age>65?'#a4a29b':'#49443e'}"/><path d="M15 90V71q0-23 25-23t25 23v19" fill="${sex==='女'?'#9d5f6e':'#6c8384'}"/><path d="M34 33h2v3h-2zm12 0h2v3h-2z" fill="#55443d"/><path d="M36 42q4 3 8 0" fill="none" stroke="#9c6b60" stroke-width="1.5"/>${age>65?'<path d="M27 32h12v9H27zm15 0h12v9H42zm-3 3h3" fill="none" stroke="#68655f"/>':''}</svg>`;
}

// —— 抽卡 & 专属像素小人 ————————————————————————————————
// 每国固定色板 [服饰主色, 肤色, 发色]，键对齐 engine.js 的 COUNTRIES.id（40 国）。
// 服饰主色取各国国旗/传统服饰的代表性色相：CN 红、IN 橙、US 蓝、NG 绿、JP 靛、DE 黑、
// BR 黄、KR 米白韩服、SE 金发蓝衫……同一国家永远得到同一位小人。
const AVATAR_PALETTE={
 CN:['#a63b45','#e8c39e','#2f2a26'],IN:['#d07a2f','#c98f5f','#241d19'],
 US:['#3d6d9e','#ecc39a','#7a4b2c'],ID:['#7c4a5e','#d8a06f','#1f1a17'],
 PK:['#2e6e4e','#cf9a66','#221b15'],NG:['#3a7d44','#7a4a28','#141010'],
 BR:['#d9b23f','#dcab7d','#33221a'],BD:['#2f5d50','#c08a58','#1d1713'],
 RU:['#8a4b42','#f0d2b2','#c7a45a'],MX:['#9e3b52','#d9a570','#241a12'],
 ET:['#a3402f','#8a5530','#131010'],JP:['#4a5878','#f0cba4','#26201c'],
 PH:['#d9a441','#d19a68','#1e1712'],EG:['#b9974a','#c89258','#1a1410'],
 CD:['#b8952f','#6d4325','#120e0d'],VN:['#c05a4d','#e6bd93','#221c17'],
 TR:['#c1454f','#e8bd92','#3a2415'],IR:['#3f7d5c','#e2b287','#241a12'],
 DE:['#3a3a3a','#f4d6b6','#b98e4e'],TH:['#7a5ba6','#e0af7f','#1f1914'],
 GB:['#5b6d77','#f0cfa8','#a86e34'],FR:['#46628c','#eecaa4','#6b4a2c'],
 ZA:['#3f7a4e','#6b4426','#131010'],IT:['#4e7a6a','#e6bd92','#3f2a18'],
 KE:['#9e3a32','#7c4c2a','#121010'],KR:['#dcd7cc','#f2d4ae','#26201b'],
 CO:['#cdb04e','#d8a878','#211812'],ES:['#c23a32','#e8bf94','#33231a'],
 AR:['#74a8c4','#e8c19c','#2b1d13'],DZ:['#37584a','#d3a06e','#1c1511'],
 UG:['#3c3f38','#714725','#131010'],CA:['#b5453c','#f2d2b0','#8a5a34'],
 AU:['#4c8577','#eec39c','#9a6b38'],SA:['#3f7f68','#c99560','#1d1611'],
 PE:['#b04a5a','#d3a172','#201812'],NP:['#b84a5f','#d5a06c','#201813'],
 MY:['#3d6f8e','#d8a271','#1e1712'],PL:['#b8555f','#f2d3b2','#a87c46'],
 SE:['#3f6f8e','#f4d8ba','#d2b06a'],NZ:['#46585c','#edc29b','#7a4f2a']
};

// 国家卡：revealed=false 显示卡背（暗色纹理+？+星星/地球 SVG）；flip(0..1) 驱动 CSS 3D 翻转角度。
export function gachaCard(country,{revealed=false,flip=0}={}){
 const c=country||{};
 const f=Number(c.life),g=Number(c.gdp);
 const stats=[
  [Number.isFinite(f)?f:'—','平均寿命 · 岁'],
  [Number.isFinite(g)?'$'+Math.round(g).toLocaleString('en-US'):'—','人均 GDP'],
 ];
 const star='<svg class="gacha-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.2 6.7.5-5.1 4.4 1.6 6.6L12 16l-5.8 3.7 1.6-6.6L2.7 8.7l6.7-.5z"/></svg>';
 const globe='<svg class="gacha-globe" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.2" ry="9"/><path d="M3 12h18M4.6 7h14.8M4.6 17h14.8"/></svg>';
 return `<div class="gacha-card${revealed?' flipped':''}" style="--flip:${revealed?1:Math.max(0,Math.min(1,Number(flip)||0))}" data-country="${escape(c.id||'')}">
  <div class="gacha-face gacha-back" aria-hidden="true"><span class="gacha-q">？</span>${star}${globe}</div>
  <div class="gacha-face gacha-front">
   <span class="gacha-flag">${c.flag||'🏳️'}</span>
   <h3 class="gacha-name">${escape(c.name||'未知之地')}</h3>
   <p class="gacha-city">${escape([c.city,c.region].filter(Boolean).join(' · '))}</p>
   <div class="gacha-stats">${stats.map(([v,l])=>`<div class="gacha-stat"><strong>${v}</strong><span>${l}</span></div>`).join('')}</div>
  </div>
 </div>`;
}

// 专属像素小人：16×16 逻辑网格 crispEdges 像素画，按 sex/年龄段/国家色板绘制。
// 0-2 婴儿襁褓巾 · 3-12 儿童矮一截 · 13-17 少年棒球帽 · 18-59 成人 · 60+ 白发驼背拄拐。
export function avatarSVG(life,{size=72}={}){
 const o=typeof life==='object'&&life?life:{};
 const age=Number(o.age)||0;
 const sex=o.sex==='女'?'女':'男';
 const cid=(o.country&&o.country.id)||'';
 const [cloth,skin,hair0]=AVATAR_PALETTE[cid]||['#7d8a84','#e8c39e','#2f2a26'];
 const hair=age>=60?'#e8e4da':hair0; // 老人白发
 const ink='#263a3b',pants='#43484a',shoe='#3a3f3d',mouth='#a3655f',wood='#8a6a48';
 const px=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
 const head=(hx,hy)=>px(hx,hy,6,5,skin)+px(hx+1,hy+2,1,1,ink)+px(hx+4,hy+2,1,1,ink)+px(hx+2,hy+4,2,1,mouth);
 let s='';
 if(age<3){ // 婴儿：襁褓巾裹身
  s=px(7,2,2,1,hair)+px(5,3,6,1,hair)+px(4,4,1,2,hair)+px(11,4,1,2,hair)
   +head(5,4)
   +px(4,9,8,3,cloth)+px(4,10,8,1,'#f0ead9')
   +px(5,12,6,1,cloth)+px(6,13,4,1,cloth);
 }else if(age<13){ // 儿童：整体矮一截
  s=px(5,4,6,1,hair)+px(4,5,1,sex==='女'?4:2,hair)+px(11,5,1,sex==='女'?4:2,hair)
   +head(5,5)
   +px(5,10,6,3,cloth)
   +px(4,10,1,3,cloth)+px(11,10,1,3,cloth)+px(4,13,1,1,skin)+px(11,13,1,1,skin)
   +px(6,13,2,2,pants)+px(9,13,2,2,pants)
   +px(6,15,2,1,shoe)+px(9,15,2,1,shoe);
 }else if(age<18){ // 少年：棒球帽
  s=px(5,2,6,1,cloth)+px(4,3,8,1,cloth)+px(12,3,2,1,cloth)
   +px(4,4,1,2,hair)+px(11,4,1,2,hair)
   +head(5,4)
   +px(7,9,2,1,skin)
   +px(4,10,8,3,cloth)
   +px(3,10,1,3,cloth)+px(12,10,1,3,cloth)+px(3,13,1,1,skin)+px(12,13,1,1,skin)
   +px(5,13,2,2,pants)+px(9,13,2,2,pants)
   +px(5,15,2,1,shoe)+px(9,15,2,1,shoe);
 }else if(age<60){ // 成人：女生长发+裙装
  s=px(5,3,6,1,hair)+px(4,4,1,sex==='女'?5:3,hair)+px(11,4,1,sex==='女'?5:3,hair)
   +head(5,4)
   +px(7,9,2,1,skin)
   +px(4,10,8,3,cloth)
   +px(3,10,1,3,cloth)+px(12,10,1,3,cloth)+px(3,13,1,1,skin)+px(12,13,1,1,skin)
   +(sex==='女'
    ?px(3,12,10,2,cloth)+px(5,14,2,1,skin)+px(9,14,2,1,skin)+px(5,15,2,1,shoe)+px(9,15,2,1,shoe)
    :px(5,13,2,2,pants)+px(9,13,2,2,pants)+px(5,15,2,1,shoe)+px(9,15,2,1,shoe));
 }else{ // 老人：白发、驼背、拄拐
  s=px(6,4,6,1,hair)+px(5,5,1,3,hair)+px(12,5,1,3,hair)
   +head(6,5)
   +px(4,9,3,1,cloth)
   +px(4,10,8,3,cloth)
   +px(3,10,1,3,cloth)+px(12,10,1,3,cloth)+px(3,13,1,1,skin)+px(12,13,1,1,skin)
   +px(13,9,1,7,wood)
   +px(5,13,2,2,pants)+px(9,13,2,2,pants)
   +px(5,15,2,1,shoe)+px(9,15,2,1,shoe);
 }
 const nm=escape(o.name||'无名');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" class="avatar-svg" shape-rendering="crispEdges" data-avatar="${nm}·${age}" role="img" aria-label="${nm}·${age}">${s}</svg>`;
}
