import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('medical loading follows admission, independently from activation',async context=>{
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
  const previousFetch=globalThis.fetch;
  context.after(async()=>{globalThis.fetch=previousFetch;await server.close();});
  const {loadHorseWorkflow}=await server.ssrLoadModule('/src/services/loadHorseWorkflow.ts');
  const calls=[];
  function mock(admissionStatus,medicalError=false){
    calls.length=0;
    globalThis.fetch=async url=>{
      const path=new URL(url,'http://test').pathname;calls.push(path);
      if(medicalError&&path.endsWith('/records'))return new Response(JSON.stringify({success:false,message:'Health profile not found'}),{status:404});
      const data=path==='/api/horses/2'?{horseId:2,status:'ACTIVE',admissionStatus}:path.endsWith('/health-profile')?2:[];
      return new Response(JSON.stringify({success:true,data}),{status:200});
    };
  }
  await context.test('active but not submitted horse does not request nonexistent medical data',async()=>{
    mock('NOT_SUBMITTED');const [horse,records,locks,,,profileId]=await loadHorseWorkflow(2,'veterinarian');
    assert.equal(horse.status,'ACTIVE');assert.deepEqual(records,[]);assert.deepEqual(locks,[]);assert.equal(profileId,0);
    assert.ok(!calls.some(path=>path.includes('/medical/')||path.endsWith('/health-profile')));
  });
  await context.test('approval enables medical and loads the selected horse profile',async()=>{
    mock('APPROVED');const result=await loadHorseWorkflow(2,'veterinarian');assert.equal(result[5],2);
    assert.ok(calls.includes('/api/medical/horses/2/records'));assert.ok(calls.includes('/api/horses/2/health-profile'));
  });
  await context.test('errors after approval are reported, not silently treated as empty records',async()=>{
    mock('APPROVED',true);await assert.rejects(()=>loadHorseWorkflow(2,'veterinarian'),/Health profile not found/);
  });
});
