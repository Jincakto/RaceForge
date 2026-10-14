import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

test('package-based weekly scheduling',async context=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},ssr:{optimizeDeps:{include:['react','react-dom','react-dom/server','react/jsx-runtime','react/jsx-dev-runtime','react-router','react-router-dom','recharts','use-sync-external-store','use-sync-external-store/shim','use-sync-external-store/shim/with-selector']}},appType:'custom'});
  context.after(()=>server.close());
  const {packageScheduleDates,packageCalendarDays}=await server.ssrLoadModule('/src/utils/packageSchedule.js');
  await context.test('30 calendar days produces 13 selected-weekday sessions including the final partial week',()=>{
    const pack={startDate:'2026-10-14',endDate:'2026-11-12'};
    const dates=packageScheduleDates(pack,['MONDAY','WEDNESDAY','FRIDAY']);
    assert.equal(packageCalendarDays(pack),30);assert.equal(dates.length,13);
    assert.equal(dates[0],'2026-10-14');assert.equal(dates.at(-1),'2026-11-11');
    assert.ok(dates.every(day=>day>=pack.startDate&&day<=pack.endDate));
  });
  await context.test('inclusive endpoints, leap day, empty selection and no matching weekday',()=>{
    const pack={startDate:'2024-02-28',endDate:'2024-03-01'};
    assert.equal(packageCalendarDays(pack),3);
    assert.deepEqual(packageScheduleDates(pack,['WEDNESDAY','THURSDAY','FRIDAY']),['2024-02-28','2024-02-29','2024-03-01']);
    assert.deepEqual(packageScheduleDates(pack,[]),[]);
    assert.deepEqual(packageScheduleDates(pack,['SUNDAY']),[]);
  });
  await context.test('running and nearest upcoming sessions precede overdue and completed history',async()=>{
    const {sortSessionsForDisplay}=await server.ssrLoadModule('/src/utils/trainingCalendar.js');
    const sessions=[
      {sessionId:1,status:'COMPLETED',scheduledStart:'2026-10-14T07:00:00'},
      {sessionId:2,status:'SCHEDULED',scheduledStart:'2026-10-21T07:00:00'},
      {sessionId:3,status:'SCHEDULED',scheduledStart:'2026-10-15T07:00:00'},
      {sessionId:4,status:'SCHEDULED',scheduledStart:'2026-10-13T07:00:00'},
      {sessionId:5,status:'SCHEDULED',actualStart:'2026-10-14T08:00:00',scheduledStart:'2026-10-14T07:00:00'},
      {sessionId:6,status:'MISSED',scheduledStart:'2026-10-15T08:00:00'},
      {sessionId:7,status:'SCHEDULED',scheduledStart:'2026-10-12T07:00:00'},
    ];
    const copy=sessions.map(item=>({...item}));
    assert.deepEqual(sortSessionsForDisplay(sessions,new Date(2026,9,14,9)).map(item=>item.sessionId),[5,3,2,4,7,6,1]);
    assert.deepEqual(sessions,copy,'display sorting must not mutate original calendar data');
    assert.doesNotThrow(()=>sortSessionsForDisplay([{status:'SCHEDULED',scheduledStart:'invalid'},sessions[2]]));
  });
  const {React,renderToStaticMarkup}=await server.ssrLoadModule('/tests/react-ssr-bridge.js');
  await context.test('trainer screen renders new package workflow without invalid hooks',async()=>{
    const {LiveTraining}=await server.ssrLoadModule('/src/pages/live/LiveTraining.jsx');
    const html=renderToStaticMarkup(React.createElement(LiveTraining,{user:{role:'head_trainer'}}));
    assert.ok(html.includes('Kế hoạch, lịch và kết quả tập'));
    const {RecurringPackageSchedule}=await server.ssrLoadModule('/src/pages/live/RecurringPackageSchedule.jsx');
    const form=renderToStaticMarkup(React.createElement(RecurringPackageSchedule,{horseId:7,planId:3,onPackageChange:()=>{},onCreated:()=>{}}));
    assert.ok(form.includes('Xếp lịch theo tuần của gói đã đăng ký'));
    assert.ok(form.includes('Thứ Hai'));assert.ok(form.includes('Chủ nhật'));
    assert.ok(!form.includes('durationWeeks'));assert.ok(!form.includes('MONDAY,WEDNESDAY'));
  });
  await context.test('API contract sends registered package and weekdays without client week/date overrides',async()=>{
    const {trainingService}=await server.ssrLoadModule('/src/services/trainingService.ts');
    const calls=[];const previous=globalThis.fetch;
    context.after(()=>{globalThis.fetch=previous;});
    globalThis.fetch=async(url,options={})=>{calls.push({url,options});return new Response(JSON.stringify({success:true,data:[]} ),{status:200,headers:{'Content-Type':'application/json'}});};
    await trainingService.schedulingPackages(7);
    assert.ok(calls[0].url.endsWith('/api/training-sessions/horse/7/scheduling-packages'));
    const body={planId:3,horseId:7,horsePackageId:9,activityName:'Endurance',daysOfWeek:['MONDAY'],sessionTime:'07:00'};
    await trainingService.createRecurringSchedule(body);
    assert.ok(calls[1].url.endsWith('/api/training-sessions/recurring'));
    assert.deepEqual(JSON.parse(calls[1].options.body),body);
  });
});
