const {chromium}=require('playwright');const EXE=require('os').homedir()+'/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
(async()=>{const b=await chromium.launch({executablePath:EXE});const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(process.argv[2]);await p.waitForSelector('h1');console.log(await p.textContent('h1'));await p.fill('#pin','1234');await p.click('button[type=submit]');await p.waitForTimeout(800);console.log(await p.textContent('h1'));await b.close();})();
