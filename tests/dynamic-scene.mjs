import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
try{
 await page.goto(base,{waitUntil:'networkidle'});
 const data=await page.evaluate(async()=>{const e=await import('./src/engine.js');const s=await import('./src/life-systems.js');const l=e.createLife({seed:'dynamic-family',country:'CN',name:'林远'});l.age=29;l.money=2000000;l.debt=0;l.income=50000;l.partner={name:'陈夏',sex:'女',age:28,bond:75,alive:true};l.systems.residence.with='family';return {current:l,history:[],prefs:{pace:'slow'}};});
 await page.addInitScript(()=>{const raw=sessionStorage.getItem('scene-save');if(raw){localStorage.setItem('one-in-eight-demo:v1',raw);sessionStorage.removeItem('scene-save');}});
 await page.evaluate(d=>sessionStorage.setItem('scene-save',JSON.stringify(d)),data);
 const resume=async()=>{await page.reload({waitUntil:'networkidle'});await page.locator('[data-action="resume"]').click();await page.locator('[data-action="pause"]').click();};
 await resume();
 const bump=async()=>{await page.evaluate(()=>{const key='one-in-eight-demo:v1';const store=JSON.parse(localStorage.getItem(key));const life=store.current;life.age+=1;life.pending=null;life.money=Math.max(life.money||0,2000000);life.stats||={};life.stats.knowledge=Math.max(life.stats.knowledge||0,80);life.school||={};life.school.credential='university';if(life.systems){life.systems.lastConceptionAge=null;life.systems.visaUntil=0;}sessionStorage.setItem('scene-save',JSON.stringify(store));});await resume();};
 const action=async id=>{await page.locator('.controls [data-action="systems"]').click();await page.locator(`[data-system="${id}"]`).click();};
 assert.equal(await page.locator('[data-role="child"]').count(),0);
 let cared=false;
 for(let i=0;i<12&&!cared;i++){
  await action('plan-child');await page.locator('[data-choice="0"]').click();
  const open=await page.locator('#dialog-title').count();
  const title=open?await page.locator('#dialog-title').innerText():'';
  if(/由谁照顾/.test(title))cared=true;else await bump();
 }
 assert.equal(cared,true);
 await page.locator('[data-choice="0"]').click();assert.equal(await page.locator('[data-role="child"]').count(),1);
 await action('adopt-dog');assert.equal(await page.locator('[data-pet="dog"]').count(),1);
 await page.screenshot({path:'docs/screenshots/dynamic-family.png'});
 await action('start-business');await page.locator('[data-choice="0"]').click();assert.equal(await page.locator('[data-scene="business"]').count(),1);await page.screenshot({path:'docs/screenshots/dynamic-business.png'});
 await action('checkup');assert.match(await page.locator('#dialog-title').innerText(),/治疗/);await page.locator('[data-choice="0"]').click();assert.equal(await page.locator('[data-scene="hospital"]').count(),1);await page.screenshot({path:'docs/screenshots/dynamic-hospital.png'});
 let moved=false;
 for(let i=0;i<30&&!moved;i++){
  await action('move-abroad');await page.locator('[data-choice="1"]').click();await page.locator('[data-choice="0"]').click();
  moved=await page.locator('.moving-truck').count()===1;
  if(!moved)await bump();
 }
 assert.equal(moved,true);
 assert.equal(await page.locator('.scene-cast [data-resident-id]').count(),1);await page.screenshot({path:'docs/screenshots/dynamic-moving.png'});
 await action('reunite-family');assert.equal(await page.locator('[data-role="child"]').count(),1);assert.equal(await page.locator('[data-role="partner"]').count(),1);
 await action('return-home');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('one-in-eight-demo:v1')).current);assert.equal(saved.country.id,'CN');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'docs/screenshots/mobile-dynamic-family.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks:['birth to childcare chain','actual child SVG','named pet SVG','business scene','treatment choice and hospital','solo migration only self','moving animation','family reunion','return home','mobile fit','no page errors']},null,2));
}finally{await browser.close();}
