import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(path.join(tmpdir(),'training-purchase-'));
after(()=>rm(dir,{recursive:true,force:true}));
for(const name of ['data','trainingLogic']) {
 const source=await readFile(new URL('../src/'+name+'.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,s)=>q+s+'.mjs'+q);
 await writeFile(path.join(dir,name+'.mjs'),code);
}
const {purchaseBlockReason,TODAY,addDays}=await import(pathToFileURL(path.join(dir,'trainingLogic.mjs')));
const horse={id:'HOR-101',approvalStatus:'approved',clubId:'club',trainingStatus:'Active',healthStatus:'Monitor',lock:false};
const record={horseId:horse.id,date:TODAY,createdAt:1,status:'confirmed',decision:'conditional',trainingEligibility:'conditional'};
for(const type of ['BASIC','PERFORMANCE']) test(type+' accepts monitoring',()=>assert.equal(purchaseBlockReason(horse,[],[record],false,type),null));
test('RACING rejects monitoring',()=>assert.match(purchaseBlockReason(horse,[],[record],false,'RACING'),/confirm it as FIT/));
for(const type of ['BASIC','PERFORMANCE','RACING']) {
 test(type+' rejects NOT_FIT',()=>assert.match(purchaseBlockReason(horse,[],[{...record,decision:'not-eligible'}],false,type),/Not fit/));
 test(type+' rejects medical lock',()=>assert.match(purchaseBlockReason({...horse,lock:true},[],[record],false,type),/locked/));
 test(type+' accepts FIT when otherwise eligible',()=>assert.equal(purchaseBlockReason({...horse,healthStatus:'Eligible'},[],[{...record,decision:'eligible',trainingEligibility:'eligible'}],false,type),null));
 test(type+' retains active package restriction',()=>assert.match(purchaseBlockReason({...horse,healthStatus:'Eligible'},[{horseId:horse.id,status:'active',paymentStatus:'PAID',expiresAt:addDays(TODAY,10)}],[{...record,decision:'eligible',trainingEligibility:'eligible'}],false,type),/active package/));
}
test('RECOVERY retains its separate rule',()=>assert.equal(purchaseBlockReason({...horse,lock:true},[],[{...record,decision:'not-eligible'}],false,'RECOVERY'),null));
test('monitoring BASIC still rejects an existing package',()=>assert.match(purchaseBlockReason(horse,[{horseId:horse.id,status:'active',paymentStatus:'PAID',expiresAt:addDays(TODAY,10)}],[record],false,'BASIC'),/active package/));
test('unknown package selection does not globally reject monitoring',()=>assert.equal(purchaseBlockReason(horse,[],[record]),null));
