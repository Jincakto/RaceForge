import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(new URL('../package.json', import.meta.url));
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-assessment-ui-'));
after(() => rm(dir, { recursive: true, force: true }));
for (const name of await readdir(new URL('../src/', import.meta.url))) {
  if (!/\.tsx?$/.test(name)) continue;
  const source = await readFile(new URL('../src/' + name, import.meta.url), 'utf8');
  const output = ts.transpileModule(source.replace('import.meta.env', '({})'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
    .replace(/(['"])(\.\/[^'"]+)\1/g, (_, quote, module) => quote + module + '.mjs' + quote)
    .replace(/(['"])(react(?:\/jsx-runtime)?|react-dom(?:\/client)?|recharts|qrcode\.react)\1/g,
      (_, quote, module) => quote + pathToFileURL(require.resolve(module)).href + quote);
  await writeFile(path.join(dir, name.replace(/\.tsx?$/, '.mjs')), output);
}
const { createElement: h } = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const pure = await import(pathToFileURL(path.join(dir, 'trainingAssessment.mjs')));
const { TrainingAssessmentForm, TrainingAssessmentPreview, TrainingAssessmentReadOnly,
  TrainingAssessmentDetails, TrainingAssessmentEmpty, TrainingPendingReviewBanner } =
  await import(pathToFileURL(path.join(dir, 'TrainingAssessmentView.mjs')));
const { ResultForm } = await import(pathToFileURL(path.join(dir, 'trainingPlans.mjs')));
const template = { version: pure.ASSESSMENT_VERSION, criteria: [...pure.ASSESSMENT_CRITERIA],
  labels: Object.fromEntries(Object.entries(pure.assessmentLabels).map(([level, value]) => [level, value.label])) };
const allPass = Object.fromEntries(template.criteria.map(item => [item.code, true]));
const assessment = (changes = {}) => ({
  sessionId: 'SES-001', horseId: 'HOR-001', assessorUserId: 'HTR-001', assessorName: 'Assigned trainer',
  assessedAt: '2026-11-10T10:00:00', checklistVersion: pure.ASSESSMENT_VERSION,
  items: template.criteria.map(item => ({ code: item.code, label: item.label, passed: true, failNote: null })),
  passedCount: 10, failedCount: 0, alertLevel: 'NO_ALERT_DETECTED', triggerCodes: [], failedCriteria: [],
  reviewStatus: 'NOT_REQUIRED', notificationStatus: 'NOT_REQUESTED', linkedMedicalRecordId: null,
  reviewedMedicalRecordId: null, pendingPostTrainingReview: false, ...changes,
});
const visible = html => html.replace(/<[^>]+>/g, ' ');

test('blank checklist has exactly ten groups, twenty radios and no default answers or item notes', () => {
  const html = render(h(TrainingAssessmentForm, { answers: {}, onChange() {}, template }));
  assert.equal((html.match(/<fieldset/g) || []).length, 10);
  assert.equal((html.match(/type="radio"/g) || []).length, 20);
  assert.equal((html.match(/ checked(?:=|\s|>)/g) || []).length, 0);
  assert.equal((html.match(/<textarea/g) || []).length, 0);
  assert.ok(html.includes('0 of 10 checks completed'));
  assert.ok(html.includes('Assessment incomplete'));
  assert.ok(!html.includes('Pass all'));
});

test('nine answers remain incomplete and do not show a severity preview', () => {
  const answers = { ...allPass };
  delete answers.GAIT;
  const html = render(h(TrainingAssessmentForm, { answers, onChange() {}, template }));
  assert.ok(html.includes('9 of 10 checks completed'));
  assert.ok(html.includes('Assessment incomplete'));
  assert.ok(!html.includes('Vet Check Recommended'));
  assert.ok(!html.includes('Urgent Vet Check'));
});

test('radio groups provide native names, labels, required markers and descriptions', () => {
  const html = render(h(TrainingAssessmentForm, { answers: {}, onChange() {}, template }));
  assert.equal((html.match(/<legend/g) || []).length, 10);
  assert.equal((html.match(/ required=""/g) || []).length, 20);
  assert.equal((html.match(/<label for=/g) || []).length, 20);
  assert.equal((html.match(/aria-describedby=/g) || []).length, 10);
  assert.ok(html.includes('min-h-11'));
});

test('template loading keeps controls disabled and template failure exposes a retry', () => {
  const loading = render(h(TrainingAssessmentForm, { answers: {}, onChange() {}, template: null, loading: true }));
  assert.ok(loading.includes('Loading the health check template'));
  assert.equal((loading.match(/type="radio"[^>]*disabled=""/g) || []).length, 20);
  const failed = render(h(TrainingAssessmentForm, { answers: {}, onChange() {}, template: null,
    error: 'The template could not be loaded.', onRetry() {} }));
  assert.ok(failed.includes('role="alert"'));
  assert.ok(failed.includes('Retry health check'));
});

test('preview labels are friendly and priority observations override the count', () => {
  for (const [answers, label] of [
    [allPass, 'Normal'],
    [{ ...allPass, GAIT: false }, 'Vet Check Recommended'],
    [{ ...allPass, COORDINATION: false }, 'Urgent Vet Check'],
  ]) {
    const text = visible(render(h(TrainingAssessmentPreview, { answers })));
    assert.ok(text.includes(label));
    assert.ok(text.includes('Preview'));
    for (const level of Object.keys(pure.assessmentLabels)) assert.ok(!text.includes(level));
  }
});

test('full completion form starts unanswered, blocks saving and has exactly one optional overall note', () => {
  const html = render(h(ResultForm, { onSubmit: async () => null, onCancel() {} }));
  assert.ok(html.includes('0 of 10 checks completed'));
  assert.equal((html.match(/<textarea/g) || []).length, 1);
  assert.ok(html.includes('Overall notes'));
  assert.ok(html.includes('(optional)'));
  assert.ok(!html.includes('Comments'));
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""[^>]*>Save and complete/);
  for (const label of ['Actual distance (km)', 'Average speed (km/h)',
    'End-of-exercise heart rate (bpm)', 'Heart rate after two-minute recovery (bpm)']) {
    assert.ok(html.includes(label), label);
  }
});

test('recorded Normal offers a manual request only to the current trainer', () => {
  const allowed = render(h(TrainingAssessmentReadOnly, { assessment: assessment(), canRequest: true,
    onRequestVetCheck: async () => ({ ok: false, message: 'Not sent' }) }));
  assert.ok(allowed.includes('Request a Vet Check'));
  assert.ok(allowed.includes('A manual request does not create a training pause.'));
  assert.ok(!allowed.includes('Training is paused for this horse'));
  const historical = render(h(TrainingAssessmentReadOnly, { assessment: assessment(), canRequest: false }));
  assert.ok(!historical.includes('Request a Vet Check'));
  assert.ok(historical.includes('read only for your account'));
});

test('already sent and waiting manual requests never offer a duplicate request button', () => {
  for (const status of ['SENT', 'WAITING_FOR_VET_ASSIGNMENT']) {
    const html = render(h(TrainingAssessmentReadOnly, { assessment: assessment({ notificationStatus: status }),
      canRequest: true, onRequestVetCheck: async () => ({ ok: false, message: 'Not sent' }) }));
    assert.ok(!html.includes('Request a Vet Check'));
    assert.ok(!html.includes('Training is paused for this horse'));
    assert.ok(html.includes(status === 'SENT' ? 'Vet check request sent' : 'Waiting for vet assignment'));
  }
});

test('alert view renders the persisted server level without recalculation or raw enums', () => {
  const html = render(h(TrainingAssessmentReadOnly, { assessment: assessment({
    alertLevel: 'URGENT_VET_REVIEW', reviewStatus: 'PENDING', notificationStatus: 'WAITING_FOR_VET_ASSIGNMENT',
    pendingPostTrainingReview: true, triggerCodes: ['COORDINATION'],
  }), canRequest: true }));
  const text = visible(html);
  assert.ok(text.includes('Urgent Vet Check'));
  assert.ok(text.includes('Training is paused for this horse'));
  assert.ok(text.includes('Waiting for vet assignment'));
  assert.ok(text.includes('Balance and coordination'));
  assert.ok(!text.includes('Request a Vet Check'));
  for (const code of ['URGENT_VET_REVIEW', 'PENDING', 'WAITING_FOR_VET_ASSIGNMENT', 'COORDINATION']) {
    assert.ok(!text.includes(code), code);
  }
});

test('saved checks render exactly ten observations, escape overall notes and ignore legacy item notes', () => {
  const value = assessment();
  value.items[0].failNote = 'A legacy note that should not create an individual notes field';
  const html = render(h(TrainingAssessmentReadOnly, { assessment: value, overallNotes: '<script>unsafe</script>' }));
  assert.equal((html.match(/<li /g) || []).length, 10);
  assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
  assert.ok(!html.includes('<script>unsafe'));
  assert.ok(!html.includes('A legacy note'));
  assert.ok(html.includes('Assigned trainer'));
  assert.ok(html.includes('(Bangkok)'));
  assert.ok(!html.includes('<textarea'));
});

test('history absence is stated honestly and an unopened detail does not pretend loading succeeded', () => {
  const empty = render(h(TrainingAssessmentEmpty));
  assert.ok(empty.includes('No post-training assessment recorded'));
  assert.ok(!empty.includes('10/10'));
  const loading = render(h(TrainingAssessmentDetails, { sessionId: 'SES-OLD' }));
  assert.ok(loading.includes('Loading the saved post-training check'));
  assert.ok(!loading.includes('No post-training assessment recorded'));
});

test('pending banner describes a review hold without claiming to open medical locks or change packages', () => {
  const html = render(h(TrainingPendingReviewBanner));
  assert.ok(html.includes('Training is paused for this horse'));
  assert.ok(html.includes('Other requirements will still apply'));
  assert.ok(!html.includes('package paused'));
  assert.ok(!html.includes('Medical Lock'));
});
