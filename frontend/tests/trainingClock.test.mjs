import { sourceUrl } from './sourceFiles.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

test('Training clock refreshes on timer, focus and tab visibility across Bangkok midnight, then cleans listeners',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'training-clock-'));
 const realDate=globalThis.Date,realWindow=globalThis.window,realDocument=globalThis.document;
 let instant=realDate.parse('2026-11-04T16:59:59Z'),tick,cleared=false;
 class FixedDate extends realDate {constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}}
 class FakeWindow extends EventTarget {setInterval(fn,delay){tick=fn;assert.equal(delay,1000);return 7;}clearInterval(id){assert.equal(id,7);cleared=true;}}
 try {
  globalThis.Date=FixedDate;globalThis.window=new FakeWindow();globalThis.document=new EventTarget();
  await writeFile(path.join(dir,'reactStub.mjs'),"export const updates=[];export let cleanup;export function useState(init){return [init(),value=>updates.push(value)];}export function useEffect(effect){cleanup=effect();}");
  const source=await readFile(sourceUrl('useTrainingNow.ts'),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/(['"])react\1/g,"'./reactStub.mjs'");
  await writeFile(path.join(dir,'clock.mjs'),output);
  const hook=await import(pathToFileURL(path.join(dir,'clock.mjs')));
  const stub=await import(pathToFileURL(path.join(dir,'reactStub.mjs')));
  assert.equal(hook.useTrainingNow().toISOString(),'2026-11-04T16:59:59.000Z');
  instant=realDate.parse('2026-11-04T17:00:00Z');tick();
  instant+=1000;globalThis.window.dispatchEvent(new Event('focus'));
  instant+=1000;globalThis.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(stub.updates.length,3);
  assert.equal(stub.updates[0].toISOString(),'2026-11-04T17:00:00.000Z');
  assert.equal(stub.updates[2].toISOString(),'2026-11-04T17:00:02.000Z');
  stub.cleanup();assert.equal(cleared,true);
  globalThis.window.dispatchEvent(new Event('focus'));globalThis.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(stub.updates.length,3);
 } finally {globalThis.Date=realDate;globalThis.window=realWindow;globalThis.document=realDocument;await rm(dir,{recursive:true,force:true});}
});