import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('owner package registration eligibility and screen',async context=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},ssr:{optimizeDeps:{include:['react','react-dom','react-dom/server','react/jsx-runtime','react/jsx-dev-runtime','react-router','react-router-dom','recharts','use-sync-external-store','use-sync-external-store/shim','use-sync-external-store/shim/with-selector']}},appType:'custom'});
  context.after(()=>server.close());
  const {packageRegistrationIssues}=await server.ssrLoadModule('/src/utils/packageRegistration.ts');
  const horse={horseId:2,ownerId:4,admissionStatus:'APPROVED',healthStatus:'READY',trainingLocked:false};
  const records=[{examType:'INITIAL',status:'CONFIRMED'}];
  await context.test('owner with confirmed initial and READY horse can register',()=>{
    assert.deepEqual(packageRegistrationIssues(horse,records,[],4),[]);
  });
  await context.test('missing admission, examination and READY status have visible reasons',()=>{
    const issues=packageRegistrationIssues({...horse,admissionStatus:'NOT_SUBMITTED',healthStatus:null},[],[],4);
    assert.equal(issues.length,3);assert.ok(issues.some(x=>x.includes('tiếp nhận')));assert.ok(issues.some(x=>x.includes('khám ban đầu')));
  });
  await context.test('other owner, training lock and ongoing packages block registration',()=>{
    assert.ok(packageRegistrationIssues(horse,records,[],9).some(x=>x.includes('của mình')));
    assert.ok(packageRegistrationIssues({...horse,trainingLocked:true},records,[],4).some(x=>x.includes('khóa tập')));
    for(const status of ['PENDING','ACTIVE','PAUSED'])assert.equal(packageRegistrationIssues(horse,records,[{status}],4).length,1);
    assert.deepEqual(packageRegistrationIssues(horse,records,[{status:'CANCELLED'},{status:'COMPLETED'}],4),[]);
  });
  await context.test('Owner gets registration screen while Manager retains package management',async()=>{
    const {React,renderToStaticMarkup}=await server.ssrLoadModule('/tests/react-ssr-bridge.js');
    const {LivePackages}=await server.ssrLoadModule('/src/pages/live/LivePackages.jsx');
    const owner=renderToStaticMarkup(React.createElement(LivePackages,{user:{id:4,role:'owner'}}));
    assert.ok(owner.includes('Đăng ký gói huấn luyện cho ngựa'));assert.ok(owner.includes('Ngựa đăng ký gói'));assert.ok(!owner.includes('Tạo gói tập'));
    const manager=renderToStaticMarkup(React.createElement(LivePackages,{user:{id:1,role:'manager'}}));
    assert.ok(manager.includes('Tạo gói tập'));
  });
});
