import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function actions(state,api){
 const source=ts.transpileModule(readFileSync(new URL('../src/app/remoteActions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(source,{exports,Error,require:name=>name.endsWith('/packagesApi')?api:name==='./remote'?{packageFromApi:r=>r,enrollmentFromApi:r=>r}:name.endsWith('/trainingLogic')?{validatePackage:()=>({})}:{}});
 return exports.makeRemoteActions({getState:()=>state,reload:async()=>{},success:()=>{},error:()=>{},info:()=>{},warning:()=>{},navigate:()=>{}});
}
test('explicit resume pays the exact registration instead of creating another',async()=>{
 let paid;const env={user:{id:'owner'},enrollments:[{id:'HPG-OLD',horseId:'HOR-001',packageId:'PKG-001',paymentStatus:'PENDING'},{id:'HPG-NEW',horseId:'HOR-001',packageId:'PKG-001',paymentStatus:'PENDING'}]};
 const a=actions(env,{registerHorsePackage:()=>{throw Error('Must not create');},createPackagePaymentLink:async id=>{paid=id;return{checkoutUrl:'https://example.test',orderCode:1};}});
 assert.equal((await a.startPayment('HOR-001','PKG-001','HPG-OLD')).ok,true);assert.equal(paid,'HPG-OLD');
});
test('edit consumes the new package ID returned by the backend',async()=>{
 let edited;const a=actions({packages:[]},{updateTrainingPackage:async(id,body)=>{edited=id;return{packageId:'PKG-002',versionNumber:2};},createTrainingPackage:()=>{throw Error('Must use update');}});
 const result=await a.savePackage({id:'PKG-001',name:'Basic',packageType:'BASIC',durationDays:30,price:5000});assert.equal(result.ok,true);assert.equal(edited,'PKG-001');assert.equal(result.data.packageId,'PKG-002');
});
test('paid but not activated is reported as reconciliation, not a successful receipt',async()=>{
 const a=actions({},{syncPackagePayment:async()=>({paymentState:'PAID',applied:false,reviewRequired:true,applicationError:'Training locked'})});
 const result=await a.syncPayment('HOR-001','HPG-001');assert.equal(result.ok,false);assert.match(result.message,/Payment received/);assert.match(result.message,/Training locked/);
});
