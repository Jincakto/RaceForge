import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { sourceNames, sourceUrl } from './sourceFiles.mjs';

const read = name => readFileSync(sourceUrl(name), 'utf8');

test('retired race-history and evidence gallery have no active frontend references', () => {
  assert.ok(!sourceNames().includes('raceImport.ts'));
  for (const name of sourceNames().filter(n => /\.tsx?$/.test(n))) {
    assert.doesNotMatch(read(name), /raceHistory|race-history|totalRaces|PhotosTab|computeTrainingSuggestion/, name);
  }
  const details = read('HorseDetailPage.tsx');
  assert.doesNotMatch(details, /\["updates", "Updates"\]|tab === "updates"/);
  assert.match(details, /identityEvidence/);
  for (const tab of ['overview', 'health', 'training', 'packages']) assert.ok(details.includes(`tab === "${tab}"`), tab);
  assert.match(read('HorseCreatePage.tsx'), /checkUeln/);
  assert.match(read('HorseCreatePage.tsx'), /documentFile/);
});

test('admission retry reuses created horse and does not make a race-history request', async () => {
  const output = ts.transpileModule(read('remoteActions.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {}, calls = [];
  let first = true;
  vm.runInNewContext(output, { exports, Error, require: name => {
    if (name.endsWith('/horsesApi')) return {
      createHorse: async () => { calls.push('create'); return { horseId: 'HOR-001' }; },
      submitAdmission: async id => { calls.push(`submit:${id}`); if (first) { first = false; throw Error('Temporary failure'); } },
    };
    if (name === './remote') return { horseCreateForm: horse => horse };
    return {};
  }});
  const actions = exports.makeRemoteActions({ getState: () => ({ user: { id: 'owner' } }), reload: async () => {}, success: () => {}, error: () => {}, navigate: () => {} });
  const horse = { microchip: '036001123456789' };
  await assert.rejects(actions.createHorse(horse), /Temporary failure/);
  await actions.createHorse({ microchip: horse.microchip });
  assert.deepEqual(calls, ['create', 'submit:HOR-001', 'submit:HOR-001']);
});
