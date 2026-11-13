import { sourceNames, sourceUrl, flattenModuleImports } from './sourceFiles.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const vietnamese = /[ĂăÂâĐđÊêÔôƠơƯư\u1EA0-\u1EF9]|[ÀÁÃÈÉÌÍÒÓÕÙÚÝàáãèéìíòóõùúý]/u;
const compatibilityGenderKeys = new Set(['Đực', 'Cái', 'Đực thiến']);
test('all application labels, templates, validation messages and defaults are English at source', async () => {
  const failures = [];
  for (const name of sourceNames()) {
    if (!/\.tsx?$/.test(name) || name === 'englishUi.ts') continue;
    const text = await readFile(sourceUrl(name), 'utf8');
    const ast = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        // Legacy Vietnamese gender aliases are accepted as INPUT keys, never UI labels.
        const isLegacyInputKey = ts.isPropertyAssignment(node.parent) && node.parent.name === node && compatibilityGenderKeys.has(node.text);
        const isImportHeaderAlias = name === 'raceImport.ts' && ts.isStringLiteral(node)
          && ts.isArrayLiteralExpression(node.parent) && ts.isPropertyAssignment(node.parent.parent)
          && ts.isObjectLiteralExpression(node.parent.parent.parent)
          && ts.isVariableDeclaration(node.parent.parent.parent.parent)
          && node.parent.parent.parent.parent.name.getText(ast) === 'ALIASES';
        if (!isLegacyInputKey && !isImportHeaderAlias && vietnamese.test(node.text)) failures.push(`${name}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: ${node.text.trim()}`);
        if (/^(Cao|TB-Cao|CN|T[1-9]|T1[0-2]|cho|theo|trong|xong)$/.test(node.text)) failures.push(`${name}: untranslated word ${node.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert.deepEqual(failures, []);
});
test('the app uses native English text without rewriting user content through a DOM translator', async () => {
  const main = await readFile(sourceUrl('main.tsx'), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /installEnglishUi/);
  assert.match(html, /<html lang="en">/);
});

const localRequire = createRequire(new URL('../package.json', import.meta.url));
const dir = await mkdtemp(path.join(tmpdir(), 'raceforge-english-components-'));
after(async () => { if (path.dirname(dir) === tmpdir()) await rm(dir, { recursive: true }); });
for (const name of ['api.ts', 'trainersApi.ts', 'trainingApi.ts', 'trainerProfile.ts', 'trainerProfileForm.tsx', 'trainingProtocols.ts', 'trainingProtocolsPage.tsx', 'ui.tsx']) {
  const source = await readFile(sourceUrl(name), 'utf8');
  const output = ts.transpileModule(source.replace('import.meta.env', '({})'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/[\s\S]*/, flattenModuleImports)
    .replace(/(['"])(react(?:\/jsx-runtime)?)\1/g, (_, q, spec) => `${q}${pathToFileURL(localRequire.resolve(spec)).href}${q}`);
  await writeFile(path.join(dir, name.replace(/\.tsx?$/, '.mjs')), output);
}
const { createElement } = localRequire('react');
const { renderToStaticMarkup } = localRequire('react-dom/server');
const { TrainerProfileForm } = await import(pathToFileURL(path.join(dir, 'trainerProfileForm.mjs')));
const { TrainingProtocolsPage } = await import(pathToFileURL(path.join(dir, 'trainingProtocolsPage.mjs')));
test('trainer profile and veterinary protocol screens render native English controls', () => {
  const trainer = renderToStaticMarkup(createElement(TrainerProfileForm, { user: { id: 'HTR-001', name: 'Nguyễn Văn An' } }));
  assert.match(trainer, /Trainer professional profile/);
  assert.match(trainer, /Loading your professional profile/);
  assert.doesNotMatch(trainer, /Load profile|Trainer profile ID|Create professional profile/);
  const protocols = renderToStaticMarkup(createElement(TrainingProtocolsPage));
  assert.match(protocols, /Training protocols/);
  assert.match(protocols, /Create protocol/);
  assert.match(protocols, /Refresh list/);
  assert.doesNotMatch(trainer + protocols, vietnamese);
});
