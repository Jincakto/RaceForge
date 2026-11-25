import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/features/horses/intake.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require: () => ({}) });
const { intakeStage } = exports;
const request = { status: 'pending' };

test('existing vet or exam never bypasses pending documentary screening', () => {
  assert.equal(intakeStage({ screeningStatus: 'PENDING', intakeExamId: 'old-exam', vetId: 'vet' }, request), 0);
});
test('returned profile remains a correction request rather than a rejected admission', () => {
  assert.equal(intakeStage({ screeningStatus: 'NEEDS_CORRECTION', intakeExamId: 'old-exam' }, request), -2);
});
test('passed screening unlocks the correct veterinary stage', () => {
  assert.equal(intakeStage({ screeningStatus: 'PASSED' }, request), 1);
  assert.equal(intakeStage({ screeningStatus: 'PASSED', vetId: 'vet', vetAssign: { status: 'pending' } }, request), 2);
  assert.equal(intakeStage({ screeningStatus: 'PASSED', vetId: 'vet', vetAssign: { status: 'accepted' } }, request), 3);
  assert.equal(intakeStage({ screeningStatus: 'PASSED', intakeExamId: 'new-exam' }, request), 4);
});
test('approved legacy horse is complete without fabricated screening history', () => {
  assert.equal(intakeStage({ screeningStatus: 'PENDING' }, { status: 'approved' }), 5);
  assert.equal(intakeStage({ screeningStatus: 'REJECTED' }, { status: 'rejected' }), -1);
});
