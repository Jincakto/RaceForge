import { sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import ts from 'typescript';
const dir=await mkdtemp(path.join(tmpdir(),'training-suggestions-'));after(()=>rm(dir,{recursive:true,force:true}));
await writeFile(path.join(dir,'react.mjs'),`
let states=[],index=0,effects=[],effectIndex=0;
export function render(fn){index=0;effectIndex=0;return fn();}
export function reset(){for(const e of effects)e?.cleanup?.();states=[];effects=[];}
export function useState(initial){const i=index++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];}
export function useEffect(fn,deps){const i=effectIndex++;const old=effects[i];if(!old||deps.some((d,k)=>d!==old.deps[k])){old?.cleanup?.();effects[i]={deps,cleanup:fn()};}}
`);
await writeFile(path.join(dir,'api.mjs'),`export const pending=[];export function request(path){return new Promise((resolve,reject)=>pending.push({path,resolve,reject}));}`);
const source=await readFile(sourceUrl('trainingSuggestions.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace("from 'react'","from './react.mjs'").replace(/[\s\S]*/, flattenModuleImports);
await writeFile(path.join(dir,'suggestions.mjs'),js);
const {sortSuggestions,suggestionReason,usePackageSuggestions}=await import(pathToFileURL(path.join(dir,'suggestions.mjs')));
const harness=await import(pathToFileURL(path.join(dir,'react.mjs')));const {pending}=await import(pathToFileURL(path.join(dir,'api.mjs')));
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
const row=(id,status,type='BASIC',days=30)=>({packageId:id,packageName:id,packageType:type,durationDays:days,canRegister:status!=='NOT_ELIGIBLE',recommendationStatus:status});
test('goal only reorders inside same status without changing eligibility',()=>{const rows=[row('r','REVIEW_REQUIRED','RACING'),row('b','RECOMMENDED'),row('p','RECOMMENDED','PERFORMANCE'),row('n','NOT_ELIGIBLE','RACING')];const original=structuredClone(rows);assert.deepEqual(sortSuggestions(rows,'PREPARE_FOR_RACING').map(p=>p.packageId),['b','p','r','n']);assert.deepEqual(rows,original);});
test('same status sorts by goal then duration then name',()=>{assert.deepEqual(sortSuggestions([row('z','RECOMMENDED','BASIC',90),row('p','RECOMMENDED','PERFORMANCE',60),row('a','RECOMMENDED')],'IMPROVE_PERFORMANCE').map(p=>p.packageId),['p','a','z']);});
test('review does not implicitly block registration',()=>assert.equal(row('r','REVIEW_REQUIRED').canRegister,true));
test('reasons distinguish history from fitness certification',()=>{assert.match(suggestionReason('ACTUAL_DURATION_MISSING'),/not substituted/);assert.match(suggestionReason('NO_TRAINING_HISTORY'),/recorded/);assert.ok(!suggestionReason('HISTORY_AND_WORKLOAD_MATCH').includes('certified'));});
test('horse change ignores delayed response from previous horse',async()=>{harness.reset();pending.length=0;harness.render(()=>usePackageSuggestions('A',true));const first=pending[0];harness.render(()=>usePackageSuggestions('B',true));const second=pending[1];second.resolve({horseId:'B',packages:[]});await flush();first.resolve({horseId:'A',packages:[]});await flush();assert.equal(harness.render(()=>usePackageSuggestions('B',true)).data.horseId,'B');harness.reset();});
test('API failure remains error and retry fetches again',async()=>{harness.reset();pending.length=0;harness.render(()=>usePackageSuggestions('A',true));pending[0].reject(new Error('Server unavailable'));await flush();let result=harness.render(()=>usePackageSuggestions('A',true));assert.equal(result.data,null);assert.equal(result.error,'Server unavailable');result.retry();harness.render(()=>usePackageSuggestions('A',true));assert.equal(pending.length,2);pending[1].resolve({horseId:'A',packages:[]});await flush();assert.equal(harness.render(()=>usePackageSuggestions('A',true)).data.horseId,'A');harness.reset();});
test('closed wizard does not fetch',()=>{harness.reset();pending.length=0;harness.render(()=>usePackageSuggestions('A',false));assert.equal(pending.length,0);harness.reset();});