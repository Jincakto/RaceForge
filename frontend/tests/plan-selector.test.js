import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('choose training plans by name and date range',async context=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},ssr:{optimizeDeps:{include:['react','react-dom','react-dom/server','react/jsx-runtime','react/jsx-dev-runtime','react-router','react-router-dom','recharts','use-sync-external-store','use-sync-external-store/shim','use-sync-external-store/shim/with-selector']}},appType:'custom'});
  context.after(()=>server.close());
  const {planScheduleIssue,chooseEligiblePlan}=await server.ssrLoadModule('/src/utils/trainingPlanChoice.js');
  const short={planId:1,planName:'Kế hoạch ngắn',status:'ACTIVE',horsePlanStatus:'ACTIVE',startDate:'2026-10-14',endDate:'2026-10-23'};
  const full={...short,planId:2,planName:'Tập sức bền',endDate:'2026-11-03'};
  const dates=['2026-10-14','2026-10-26','2026-11-02'];
  await context.test('a short plan is rejected before HTTP and a compatible plan selected automatically',()=>{
    assert.ok(planScheduleIssue(short,dates));assert.equal(planScheduleIssue(full,dates),'');
    assert.equal(chooseEligiblePlan([short,full],dates,1,null),'2');
    assert.equal(chooseEligiblePlan([short],dates,1,null),'');
    assert.equal(chooseEligiblePlan([full,{...full,planId:3}],dates,2,3),'3');
  });
  await context.test('inclusive date bounds, inactive assignment and unlimited dates follow backend rules',()=>{
    assert.equal(planScheduleIssue(short,['2026-10-14','2026-10-23']),'');
    assert.ok(planScheduleIssue(short,['2026-10-13']));
    assert.ok(planScheduleIssue({...full,horsePlanStatus:'COMPLETED'},dates));
    assert.equal(planScheduleIssue({...full,startDate:null,endDate:null},dates),'');
  });
  const {React,renderToStaticMarkup}=await server.ssrLoadModule('/tests/react-ssr-bridge.js');
  await context.test('selector displays names and dates and disables incompatible options',async()=>{
    const {TrainingPlanSelect}=await server.ssrLoadModule('/src/pages/live/TrainingPlanSelect.jsx');
    const html=renderToStaticMarkup(React.createElement(TrainingPlanSelect,{plans:[short,full],value:'2',onChange:()=>{},dates}));
    assert.ok(html.includes('Tập sức bền'));assert.ok(html.includes('14/10/2026'));assert.ok(html.includes('3/11/2026'));
    assert.match(html,/<option value="1" disabled=""/);assert.ok(!html.includes('type="number"'));
    const empty=renderToStaticMarkup(React.createElement(TrainingPlanSelect,{plans:[],value:'',onChange:()=>{}}));
    assert.ok(empty.includes('Ngựa chưa có kế hoạch'));
  });
  await context.test('both schedule forms render selectors, not numeric plan ID inputs',async()=>{
    const {SingleSessionSchedule}=await server.ssrLoadModule('/src/pages/live/SingleSessionSchedule.jsx');
    const {RecurringPackageSchedule}=await server.ssrLoadModule('/src/pages/live/RecurringPackageSchedule.jsx');
    for(const [component,props] of [[SingleSessionSchedule,{scheduledTime:'2026-10-14T07:00'}],[RecurringPackageSchedule,{onPackageChange:()=>{}}]]){
      const html=renderToStaticMarkup(React.createElement(component,{horseId:7,plans:[full],onCreated:()=>{},...props}));
      assert.ok(html.includes('aria-label="Kế hoạch huấn luyện"'));assert.ok(!html.includes('Mã kế hoạch'));assert.ok(!html.includes('type="number"'));
    }
  });
  await context.test('plan list comes from the real horse-specific API',async()=>{
    const {plansService}=await server.ssrLoadModule('/src/services/planService.ts');
    let called;const old=globalThis.fetch;context.after(()=>{globalThis.fetch=old;});
    globalThis.fetch=async url=>{called=url;return new Response(JSON.stringify({success:true,data:[full]}),{status:200,headers:{'Content-Type':'application/json'}});};
    const result=await plansService.byHorse(7);assert.ok(called.endsWith('/api/horses/7/training-plans'));assert.equal(result[0].planName,'Tập sức bền');
  });
});
