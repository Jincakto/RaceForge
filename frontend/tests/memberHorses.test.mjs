import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const dir = await mkdtemp(path.join(tmpdir(), 'member-horses-'));
const source = await readFile(new URL('../src/memberHorses.ts', import.meta.url), 'utf8');
await writeFile(path.join(dir, 'memberHorses.mjs'), ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText);
const { memberHorses } = await import(pathToFileURL(path.join(dir, 'memberHorses.mjs')));
after(() => rm(dir, {recursive:true, force:true}));
const member = role => ({id:'USER-1', role, clubId:'club'});
const horse = (id, extra={}) => ({id, clubId:'club', ...extra});

test('ownership uses IDs and excludes other clubs', () => {
  const rows = memberHorses(member('owner'), [horse('H1',{ownerId:'USER-1'}),horse('H2',{ownerId:'OTHER'}),horse('H3',{ownerId:'USER-1',clubId:'other'})],[],[]);
  assert.deepEqual(rows.map(row=>row.horse.id),['H1']);
});
test('vet distinguishes current, pending, and previously examined horses without duplicate counts', () => {
  const horses = [horse('H1',{vetId:'USER-1',vetAssign:{status:'accepted'}}),horse('H2',{vetId:'USER-1',vetAssign:{status:'declined'}}),horse('H3',{vetId:'USER-1',vetAssign:{status:'pending'}}),horse('H4')];
  const records = [{horseId:'H1',vetId:'USER-1',status:'confirmed'},{horseId:'H1',vetId:'USER-1',status:'confirmed'},{horseId:'H4',vetId:'USER-1',status:'confirmed'},{horseId:'H2',vetId:'USER-1',status:'draft'}];
  const rows = memberHorses(member('veterinarian'),horses,records,[]);
  assert.deepEqual(rows.map(row=>row.horse.id),['H1','H3','H4']);
  assert.deepEqual(rows[0].labels,['Currently assigned','Examined']);
  assert.deepEqual(rows[1].labels,['Awaiting acceptance']);
  assert.equal(rows.filter(row=>row.labels.includes('Examined')).length,2);
});
test('trainer counts unique horses and excludes ended and unpaid packages', () => {
  const enrollment = (horseId, extra={}) => ({horseId,trainerId:'USER-1',status:'active',trainerStatus:'confirmed',apiStatus:'ACTIVE',paymentStatus:'PAID',...extra});
  const rows=memberHorses(member('head_trainer'),[horse('H1'),horse('H2'),horse('H3'),horse('H4'),horse('H5',{trainerIds:['USER-1']})],[],[enrollment('H1'),enrollment('H1'),enrollment('H2',{trainerStatus:'pending'}),enrollment('H3',{status:'completed'}),enrollment('H4',{paymentStatus:'UNPAID'})]);
  assert.deepEqual(rows.map(row=>row.horse.id),['H1','H2','H5']);
  assert.deepEqual(rows[1].labels,['Awaiting acceptance']);
});
