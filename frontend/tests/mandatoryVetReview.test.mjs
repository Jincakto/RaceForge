import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../src/features/training/trainingAssessment.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require: () => ({ ApiError: class extends Error {} }) });
const answers = Object.fromEntries(exports.ASSESSMENT_CRITERIA.map(item => [item.code, true]));
test('concern reason survives the completion payload and is trimmed', () => {
  const assessment = exports.toAssessmentRequest({ ...answers, FOCUS: false }, undefined, { FOCUS: ' Distracted during assigned exercise ' });
  const payload = exports.completionPayload({ distance: 1, avgSpeed: 12, assessment });
  assert.equal(payload.assessment.failNotes.FOCUS, 'Distracted during assigned exercise');
  assert.equal(payload.assessment.checks.FOCUS, false);
});
test('a concern cannot be submitted without a reason or with an overlong reason', () => {
  for (const note of ['', '   ', 'x'.repeat(1001)]) assert.throws(() => exports.toAssessmentRequest({ ...answers, FOCUS: false }, undefined, { FOCUS: note }), /observation reason/);
});
test('all-pass checklist remains valid without concern notes', () => {
  assert.equal(exports.toAssessmentRequest(answers).checks.FOCUS, true);
});
