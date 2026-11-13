// NODE_PATH may point to a temporary Playwright installation; no production dependencies required.
// Start Vite on 127.0.0.1:5179 before running this isolated component-browser check.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const labels=['Task Completion','Speed Control','Movement Stability','Balance','Command Response','Focus','Stamina','Speed Transition','Cooperation','Performance Consistency'];
const codes=['TASK_COMPLETION','SPEED_CONTROL','MOVEMENT_STABILITY','BALANCE','COMMAND_RESPONSE','FOCUS','STAMINA','SPEED_TRANSITION','COOPERATION','PERFORMANCE_CONSISTENCY'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async scenario=>{await page.goto('http://127.0.0.1:5179/tests/visual/session-assessment.html?scenario='+scenario);await page.locator('.fixture-panel').waitFor();};
 const wait=async fn=>page.waitForFunction(fn);
 const choose=async(label,value)=>page.locator('fieldset').filter({has:page.locator('legend',{hasText:label})}).getByRole('radio',{name:value,exact:true}).check();
 try{
  await open('blank');await page.getByRole('radio',{name:'Pass',exact:true}).first().waitFor();
  await wait(()=>document.querySelectorAll('input[type=radio]:disabled').length===0);
  assert.equal(await page.getByRole('radio').count(),20);assert.equal(await page.locator('input[type=radio]:checked').count(),0);
  assert.equal(await page.locator('textarea').count(),1);
  for(const label of labels)assert.equal(await page.locator('legend').filter({hasText:new RegExp(label+'$')}).count(),1);
  await page.getByRole('button',{name:'Save and complete',exact:true}).isDisabled().then(v=>assert.equal(v,true));
  for(const label of labels)await choose(label,'Pass');
  for(const [label,expected]of [['Speed Control','Urgent Vet Check'],['Movement Stability','Urgent Vet Check'],
     ['Balance','Vet Check Recommended'],['Command Response','Vet Check Recommended'],['Performance Consistency','Vet Check Recommended']]){
    await choose(label,'Concern observed');assert.equal(await page.getByText(expected,{exact:true}).count(),1);assert.equal(await page.locator('textarea').count(),1);
    await choose(label,'Pass');
  }
  await page.getByLabel('Actual distance (km)').fill('1.25');
  await page.getByLabel('Average speed (km/h)').fill('12');
  await page.getByLabel('End-of-exercise heart rate (bpm)').fill('90');
  await page.getByLabel('Heart rate after two-minute recovery (bpm)').fill('60');
  await page.getByRole('button',{name:'Save and complete',exact:true}).click();
  await page.getByRole('heading',{name:'Recorded post-training performance assessment',exact:true}).waitFor();
  const payload=await page.evaluate(()=>window.__RACEFORGE_ASSESSMENT_HARNESS__.lastCompletion);
  assert.deepEqual(Object.keys(payload.assessment.checks),codes);
  assert.ok(Object.values(payload.assessment.checks).every(v=>v===true));
  assert.ok(!payload.assessment.failNotes);assert.ok(!payload.performanceNotes);
  console.log('PASS browser: ten new labels, no defaults, five unchanged overrides, no per-item notes, actual form submission with new wire codes.');

  await open('normal');await page.getByRole('button',{name:'Request a Vet Check',exact:true}).click();
  await page.getByLabel('Reason for the vet check').fill('Synthetic browser request to review recovery.');
  await page.getByRole('button',{name:'Send vet check request',exact:true}).click();
  await wait(()=>document.body.textContent.includes('Vet check request sent'));
  assert.ok(!(await page.locator('body').innerText()).includes('Training is paused for this horse'));
  assert.equal(await page.getByRole('button',{name:'Request a Vet Check',exact:true}).count(),0);
  for(const scenario of ['recommended','urgent','waiting']){
    await open(scenario);await page.getByText('Training is paused for this horse',{exact:true}).waitFor();
    const body=await page.locator('body').innerText();
    for(const code of codes)assert.ok(!body.includes(code));
    assert.equal(await page.getByRole('button',{name:'Request a Vet Check',exact:true}).count(),0);
  }
  await open('history');await page.getByText('No post-training assessment recorded',{exact:true}).waitFor();
  await open('template-error');await page.getByRole('button',{name:'Retry health check',exact:true}).click();
  await wait(()=>document.querySelectorAll('input[type=radio]:disabled').length===0);
  assert.equal(await page.getByRole('radio').count(),20);
  await page.setViewportSize({width:390,height:844});await open('normal');
  await page.getByRole('heading',{name:'Recorded post-training performance assessment',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  assert.deepEqual(errors,[]);
  const diagnostics=await page.evaluate(()=>window.__RACEFORGE_ASSESSMENT_HARNESS__);
  assert.deepEqual(diagnostics.rejectedRequests,[]);
  console.log('PASS browser: Normal manual request without hold, warning/urgent/waiting read-only views, history, retry, mobile layout and no JS errors. APIs are local fixtures, not SQL.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
