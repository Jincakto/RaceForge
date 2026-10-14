import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('calendar dates, schedule rendering and readable medical details',async context=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},ssr:{optimizeDeps:{include:['react','react-dom','react-dom/server','react/jsx-runtime','react/jsx-dev-runtime','react-router','react-router-dom','recharts','use-sync-external-store','use-sync-external-store/shim','use-sync-external-store/shim/with-selector']}},appType:'custom'});
  context.after(()=>server.close());
  const dates=await server.ssrLoadModule('/src/utils/trainingCalendar.js');
  const {React,renderToStaticMarkup}=await server.ssrLoadModule('/tests/react-ssr-bridge.js');
  await context.test('week starts Monday across year boundaries and month navigation clamps days',()=>{
    assert.deepEqual(dates.weekDates('2026-01-01'),['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
    assert.equal(dates.moveCalendarMonth('2026-01-31',1),'2026-02-28');
    assert.equal(dates.moveCalendarMonth('2024-01-31',1),'2024-02-29');
    const grid=dates.monthDates('2026-10-14');assert.equal(grid.length,42);assert.equal(grid[0],'2026-09-28');assert.equal(grid[41],'2026-11-08');
    assert.throws(()=>dates.parseCalendarDate('2026-02-30'));
    assert.equal(dates.localDateKey(new Date(2026,9,14,0,1)),'2026-10-14');
  });
  const sessions=[{sessionId:1,scheduledStart:'2026-10-14T07:00:00',status:'COMPLETED',notes:'Tập sức bền'},{sessionId:2,scheduledStart:'2026-10-14T23:30:00',status:'SCHEDULED',actualStart:'2026-10-14T23:31:00'}];
  await context.test('multiple sessions on one day remain visible and invalid dates are skipped',()=>{
    const grouped=dates.groupSessionsByDay([...sessions].reverse().concat({sessionId:3,scheduledStart:'invalid'}));
    assert.deepEqual(grouped.get('2026-10-14').map(item=>item.sessionId),[1,2]);assert.equal(grouped.size,1);
    assert.equal(dates.sessionLabel(sessions[1]),'Đang tập');
  });
  await context.test('month and week show events, including times outside the normal timetable',async()=>{
    const {TrainingCalendar}=await server.ssrLoadModule('/src/pages/live/TrainingCalendar.jsx');
    for(const initialView of ['month','week']){
      const html=renderToStaticMarkup(React.createElement(TrainingCalendar,{sessions,selectedDate:'2026-10-14',today:'2026-10-14',initialView}));
      assert.ok(html.includes('Tập sức bền'));assert.ok(html.includes('Buổi #1'));assert.ok(html.includes('Buổi #2'));assert.ok(html.includes('23:30'));assert.ok(html.includes('Hôm nay'));assert.ok(html.includes('aria-current="date"'));
      if(initialView==='month')assert.equal((html.match(/role="gridcell"/g)||[]).length,42);
      else assert.ok(html.includes('23:00'));
    }
  });
  await context.test('user role shows a name instead of raw object and role ID',async()=>{
    const {ReadableDetails}=await server.ssrLoadModule('/src/pages/live/LiveApiForms.jsx');
    const html=renderToStaticMarkup(React.createElement(ReadableDetails,{data:{fullName:'Test',emailVerified:true,role:{roleId:3,roleName:'VETERINARIAN'}}}));
    assert.ok(html.includes('Họ tên'));assert.ok(html.includes('Bác sĩ thú y'));assert.ok(!html.includes('roleId'));assert.ok(!html.includes('roleName'));assert.ok(!html.includes('{&quot;'));
  });
  await context.test('medical details have vital units and clinical table while notes remain unchanged',async()=>{
    const {MedicalRecordDetails}=await server.ssrLoadModule('/src/pages/live/MedicalRecordDetails.jsx');
    const html=renderToStaticMarkup(React.createElement(MedicalRecordDetails,{data:{medicalRecordId:7,status:'CONFIRMED',examType:'INITIAL',healthStatus:'INJURED',diagnosis:'READY',vitalSign:{bodyTemperature:38.5,restingHeartRate:40,restingRespiratoryRate:16,vitalSignId:99},clinicalExams:[{clinicalExamId:10,examinationArea:'LEGS',conditionStatus:'NORMAL',notes:'Giữ nguyên ghi chú'}]}}));
    assert.ok(html.includes('38.5 °C'));assert.ok(html.includes('40 bpm'));assert.ok(html.includes('16 lần/phút'));assert.ok(html.includes('<table'));assert.ok(html.includes('Bình thường'));assert.ok(html.includes('Giữ nguyên ghi chú'));assert.ok(html.includes('READY'));assert.ok(!html.includes('clinicalExamId'));assert.ok(!html.includes('vitalSignId'));
  });
});
