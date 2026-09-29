const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const EXE=require('os').homedir()+'/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const BASE='http://localhost:8765/'; const OUT=process.argv[2]||'/home/user/workspace/stemmate-a3/tests/out'; fs.mkdirSync(OUT,{recursive:true});
const results={axe:[],steps:[],reflow:[],tabOrder:[]};
function log(m){results.steps.push(m);console.log('STEP',m)}
(async()=>{
 const b=await chromium.launch({executablePath:EXE}); const ctx=await b.newContext({viewport:{width:1280,height:900}}); const pg=await ctx.newPage();
 pg.on('pageerror',e=>{results.steps.push('PAGE ERROR '+e.message);console.log('PAGEERR',e.message)}); pg.on('dialog',d=>d.accept());
 async function axe(name){ await pg.addScriptTag({content:AXE}); const r=await pg.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}}));
   results.axe.push({screen:name,violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.length,targets:v.nodes.slice(0,3).map(n=>n.target.join(' '))})),passes:r.passes.length});
   console.log('AXE',name,r.violations.map(v=>v.id+'('+v.nodes.length+')').join(', ')||'none'); }
 async function shot(n){ await pg.screenshot({path:path.join(OUT,n+'.png'),fullPage:true}); }
 await pg.goto(BASE+'#/signin'); await pg.evaluate(()=>{localStorage.clear();sessionStorage.clear()}); await pg.goto(BASE+'#/signin'); await pg.reload(); await pg.waitForSelector('h1');
 // tab order
 for(let i=0;i<9;i++){ await pg.keyboard.press('Tab'); results.tabOrder.push(await pg.evaluate(()=>{const e=document.activeElement;return (e.tagName+' '+(e.innerText||e.value||e.getAttribute('aria-label')||e.id||'').trim()).slice(0,70)}));}
 await axe('S01 Sign in'); await shot('S01-signin');
 await pg.fill('#pin','9999'); await pg.click('button[type=submit]'); await pg.waitForSelector('#pin-err'); log('Wrong PIN error: '+await pg.textContent('#pin-err')); await axe('S01b Sign in error'); await shot('S01b-signin-error');
 await pg.fill('#pin','1234'); await pg.keyboard.press('Enter'); await pg.waitForURL(/home/); await pg.waitForSelector('h1'); log('Signed in; focus on: '+await pg.evaluate(()=>document.activeElement.tagName+' '+document.activeElement.textContent));
 await axe('S02 Home'); await shot('S02-home');
 await pg.goto(BASE+'#/find'); await pg.waitForSelector('#res-list .results'); await axe('S03 Find'); await shot('S03-find');
 await pg.selectOption('#f-topic','Chemistry'); await pg.selectOption('#f-level','Junior secondary (Gr 8-9)'); await pg.waitForTimeout(200);
 log('No-results text: '+await pg.textContent('#res-count')+' | result links present: '+await pg.locator('#res-list a[href^="#/activity"]').count()); await axe('S03b Find no results'); await shot('S03b-find-noresults');
 await pg.click('#nr-clear'); log('After clear: '+await pg.textContent('#res-count'));
 await pg.goto(BASE+'#/activity/ACT-01'); await pg.waitForSelector('#dl-start'); await axe('S04 Activity detail'); await shot('S04-activity');
 await pg.click('.harness summary'); await pg.check('#h-full'); await pg.click('#dl-start'); await pg.waitForSelector('#dl-retry'); log('Storage full error: '+(await pg.textContent('#save-area')).replace(/\s+/g,' ').slice(0,200)); log('Focus after error: '+await pg.evaluate(()=>document.activeElement.textContent)); await axe('S04b Save failed storage'); await shot('S04b-save-storage-full');
 await pg.uncheck('#h-full'); await pg.click('#dl-retry'); await pg.waitForSelector('progress'); await shot('S04c-save-progress'); await pg.waitForSelector('#save-area .notice.ok',{timeout:5000}); log('Retry save -> '+(await pg.textContent('#save-area .notice.ok')).replace(/\s+/g,' ').slice(0,90)); await axe('S04d Saved'); 
 // unstable download on ACT-03
 await pg.goto(BASE+'#/activity/ACT-03'); await pg.check('input[name=h-net][value=unstable]'); await pg.click('#dl-start'); await pg.waitForSelector('#dl-retry',{timeout:5000}); log('Unstable: '+(await pg.textContent('#save-error h2'))); await shot('S04e-download-interrupted');
 await pg.check('input[name=h-net][value=online]'); await pg.click('#dl-retry'); await pg.waitForSelector('#save-area .notice.ok',{timeout:5000}); log('ACT-03 saved after retry');
 // offline activity not saved
 await pg.check('input[name=h-net][value=offline]'); await pg.goto(BASE+'#/activity/ACT-05'); await pg.waitForSelector('h1'); log('Offline unsaved guide: '+(await pg.locator('.notice.warn h2').textContent())); await shot('S04f-offline-unsaved');
 await pg.goto(BASE+'#/saved'); await pg.waitForSelector('table'); await axe('S05 Saved'); await shot('S05-saved');
 // WF2 plan offline
 await pg.goto(BASE+'#/plan/new?act=ACT-01'); await pg.waitForSelector('#p-title'); await pg.fill('#p-title',''); await pg.fill('#s-text-1',''); await pg.waitForTimeout(900); log('Autosave: '+await pg.textContent('#autosave'));
 await axe('S06 Plan editor'); await shot('S06-plan-editor');
 await pg.click('button[type=submit]'); await pg.waitForSelector('#err-box'); log('Error summary: '+(await pg.textContent('#err-box h2'))+' | focus='+await pg.evaluate(()=>document.activeElement.id)); await axe('S06b Plan validation errors'); await shot('S06b-plan-errors');
 await pg.click('#err-box a >> nth=0'); log('Error link focus -> '+await pg.evaluate(()=>document.activeElement.id));
 await pg.fill('#p-title','Grade 8 pressure lesson'); await pg.fill('#p-date','2026-10-08'); await pg.fill('#s-text-1','Join caps with a straw and seal.'); await pg.fill('#p-size','32');
 await pg.click('[data-mv=down][data-i="0"]'); log('Move down focus -> '+await pg.evaluate(()=>document.activeElement.getAttribute('aria-label')));
 await pg.check('#h-full'); await pg.fill('#p-incl','Pair learners; swap roles.'); await pg.waitForTimeout(900); log('Autosave storage full: '+(await pg.textContent('#autosave')).trim()); await shot('S06c-draft-storage-full');
 await pg.uncheck('#h-full'); await pg.click('#retry-draft'); log('Retry draft: '+(await pg.textContent('#autosave')).trim());
 await pg.click('button[type=submit]'); await pg.waitForURL(/outbox/); await pg.waitForSelector('h1'); log('Queued offline: '+(await pg.textContent('main .results .pill'))); await axe('S07 Outbox queued offline'); await shot('S07-outbox-queued');
 // WF3: conflict then failure after merge
 await pg.check('#h-conflict'); await pg.check('input[name=h-net][value=online]'); await pg.waitForSelector('text=Conflict: review needed',{timeout:6000}); log('Reconnect -> conflict'); await shot('S07b-outbox-conflict'); await axe('S07b Outbox conflict');
 await pg.click('text=Review and resolve'); await pg.waitForSelector('#merge-form'); await axe('S08 Conflict review'); await shot('S08-conflict');
 await pg.click('#merge-form button[type=submit]'); await pg.waitForSelector('#merge-box'); log('Merge validation: '+(await pg.textContent('#merge-box h2'))); await axe('S08b Conflict validation');
 await pg.check('input[name=m-step][value=server]'); await pg.check('input[name=m-safety][value=mine]'); await pg.check('#h-failnext');
 await pg.click('#merge-form button[type=submit]'); await pg.waitForSelector('text=Upload failed: safe on this device',{timeout:6000}); log('Failure after merged upload shown: '+(await pg.textContent('main .results li')).replace(/\s+/g,' ').slice(0,220)); await shot('S07c-outbox-merged-failed'); await axe('S07c Outbox failed');
 await pg.click('[data-retry]'); await pg.waitForSelector('text=Synced at',{timeout:6000}); log('Retry now -> '+(await pg.textContent('main .results .pill'))); await shot('S07d-outbox-synced');
 await pg.goto(BASE+'#/plans'); await pg.waitForSelector('table'); await axe('S09 Plans list'); await shot('S09-plans');
 await pg.goto(BASE+'#/device'); await pg.waitForSelector('h1'); await axe('S10 Device'); await shot('S10-device');
 await pg.goto(BASE+'#/help'); await pg.waitForSelector('h1'); await axe('S11 Help');
 // shared-device separation
 await pg.click('#signout'); await pg.waitForURL(/signin/); await pg.check('input[value=vol-b]'); await pg.fill('#pin','2468'); await pg.click('button[type=submit]'); await pg.waitForURL(/home/); await pg.goto(BASE+'#/plans'); await pg.waitForSelector('h1'); log('Volunteer B sees plans: '+(await pg.textContent('main')).includes('Grade 8 pressure lesson')); 
 await pg.goto(BASE+'#/outbox'); await pg.waitForSelector('h1');
 // reflow at 320 css px and 200% text
 for (const [w,scale] of [[320,1],[1280,1.5]]){ await pg.setViewportSize({width:w,height:800}); await pg.evaluate(s=>{document.documentElement.style.setProperty('--text-scale',s)},scale);
   for (const r of ['home','find','activity/ACT-01','plan/new?act=ACT-01','outbox','device']){ await pg.goto(BASE+'#/'+r); await pg.waitForSelector('h1'); await pg.evaluate(s=>{document.documentElement.style.setProperty('--text-scale',s)},scale); await pg.waitForTimeout(100);
     const o=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})); results.reflow.push({route:r,width:w,textScale:scale,horizontalScroll:o.sw>o.cw,sw:o.sw,cw:o.cw}); if(w===320) await shot('R320-'+r.replace(/[\/?=]/g,'_')); } }
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,1)); console.log('REFLOW',JSON.stringify(results.reflow.filter(x=>x.horizontalScroll))); console.log('TAB',results.tabOrder.join(' | '));
 await b.close();
})().catch(e=>{console.log('FAIL',e.message);fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,1));process.exit(1)});
