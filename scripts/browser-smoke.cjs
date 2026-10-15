#!/usr/bin/env node
/* One-time actual Chromium + Three.js render smoke. No secrets and no deployment. */
const {chromium}=require('playwright');
const {mkdirSync}=require('node:fs');
(async()=>{
  const errors=[];
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.on('pageerror',err=>errors.push('PAGE: '+err.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE: '+msg.text().slice(0,500));});
    const response=await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:45000});
    if(!response?.ok())throw Error('Static server did not serve editor');
    await page.waitForFunction(()=>document.querySelector('#questObjective')?.textContent==='Barter with 4 robots',{timeout:45000});
    await page.waitForFunction(()=>{const canvas=document.querySelector('#viewport canvas');return canvas&&canvas.width>100&&canvas.height>100&&document.querySelector('#fps')?.textContent.includes('FPS')},{timeout:25000});
    const info=await page.evaluate(()=>({
      title:document.querySelector('#sceneName').textContent,
      objective:document.querySelector('#questObjective').textContent,
      robots:document.querySelector('#robotCount').textContent,
      buildings:document.querySelector('#buildingCount').textContent,
      canvas:!!document.querySelector('#viewport canvas'),
      error:document.querySelector('#webglError')?.hidden===false?document.querySelector('#webglError')?.textContent:null,
    }));
    if(info.error||info.robots!=='4'||info.buildings!=='10')throw Error('Invalid rendered scene: '+JSON.stringify(info));
    if(errors.length)throw Error(errors.join(' | '));
    mkdirSync('artifacts',{recursive:true});
    await page.screenshot({path:'artifacts/blank-engine-alpha05-webgl.png'});
    console.log('ACTUAL WEBGL SMOKE PASS '+JSON.stringify(info));
  }finally{await browser.close();}
})().catch(err=>{console.error('BROWSER_SMOKE_FAILED: '+err.message);process.exitCode=1;});
