import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
test('live screens and training clients use the backend contract',async context=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const server=await createServer({root,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},ssr:{optimizeDeps:{include:['react','react-dom','react-dom/server','react/jsx-runtime','react/jsx-dev-runtime','react-router','react-router-dom','recharts','use-sync-external-store','use-sync-external-store/shim','use-sync-external-store/shim/with-selector']}},appType:'custom'});
  const previousFetch=globalThis.fetch, calls=[];
  context.after(async()=>{globalThis.fetch=previousFetch;await server.close();});
  globalThis.fetch=async(url,options={})=>{calls.push({url,options});return new Response(JSON.stringify({success:true,data:[]}),{status:200,headers:{'Content-Type':'application/json'}});};
  const {plansService}=await server.ssrLoadModule('/src/services/planService.ts');
  const {sessionService}=await server.ssrLoadModule('/src/services/sessionService.ts');
  const {trainingService}=await server.ssrLoadModule('/src/services/trainingService.ts');
  const {raceService}=await server.ssrLoadModule('/src/services/raceService.ts');
  const {horseService}=await server.ssrLoadModule('/src/services/horseService.ts');
  const {healthService}=await server.ssrLoadModule('/src/services/healthService.ts');
  const {api}=await server.ssrLoadModule('/src/services/apiClient.js');
  const last=()=>calls.at(-1),body=()=>JSON.parse(last().options.body);
  await context.test('plan and session transitions retain correct paths and methods',async()=>{
    await plansService.createPlan(7,{planName:'Endurance'});assert.match(last().url,/\/api\/horses\/7\/training-plans$/);assert.equal(body().planName,'Endurance');
    await trainingService.createSingleSchedule({planId:9,horseId:7,scheduledTime:'2026-10-14T07:00:00'});assert.match(last().url,/\/api\/training-sessions$/);assert.equal(last().options.method,'POST');
    await sessionService.startSession(12);assert.match(last().url,/\/12\/start$/);assert.equal(last().options.method,'PATCH');
    const metrics={heartRate:100,avgSpeed:25,maxSpeed:30};await sessionService.completeSession(12,metrics);assert.equal(last().options.method,'PATCH');assert.deepEqual(body(),metrics);
    await sessionService.checkIn(12,{status:'MISSED',absenceReason:'BAD_WEATHER'});assert.match(last().url,/\/12\/attendance$/);assert.equal(last().options.method,'PUT');
    await sessionService.byHorse(7);assert.match(last().url,/\/api\/training-sessions\/horse\/7$/);
  });
  await context.test('catalog, horse actions and medical details target real APIs',async()=>{
    await trainingService.allPackages();assert.match(last().url,/\/training-packages\/all$/);
    await trainingService.togglePackageStatus(3,false);assert.deepEqual(body(),{status:'INACTIVE'});
    await horseService.activate(7);assert.equal(last().options.method,'PATCH');assert.match(last().url,/\/horses\/7\/activate$/);
    await healthService.get(4);assert.match(last().url,/\/medical\/records\/4$/);
    await raceService.byHorse(7);assert.match(last().url,/\/horses\/7\/race-history$/);
    await raceService.deleteResult(5);assert.match(last().url,/\/horses\/race-history\/5$/);assert.equal(last().options.method,'DELETE');
    await api.get('/trainers',{params:{page:2,search:'a b'}});assert.match(last().url,/\/api\/trainers\?page=2&search=a\+b$/);
  });
  await context.test('network failures have a readable message',async()=>{
    globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
    const {request}=await server.ssrLoadModule('/src/services/api.ts');
    await assert.rejects(()=>request('/api/auth/register'),/Không kết nối được/);
  });
  await context.test('new screens render and business roles can reach them',async()=>{
    const {React,renderToStaticMarkup}=await server.ssrLoadModule('/tests/react-ssr-bridge.js');
    const {liveNavigation}=await server.ssrLoadModule('/src/pages/live/LiveContent.jsx');
    for(const role of ['owner','manager','head_trainer','veterinarian'])assert.ok(liveNavigation(role).some(x=>x.page==='training-hub'));
    for(const [file,component,label] of [['LiveTraining.jsx','LiveTraining','Kế hoạch'],['LivePackages.jsx','LivePackages','Danh mục gói'],['LiveRaces.jsx','LiveRaces','Lịch sử thi đấu']]){
      const module=await server.ssrLoadModule('/src/pages/live/'+file);
      const html=renderToStaticMarkup(React.createElement(module[component],{user:{role:'head_trainer'}}));assert.ok(html.includes(label));
    }
  });
});
