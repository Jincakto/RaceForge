import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Compile the production module without adding a test runtime dependency.
const source = readFileSync(new URL('../src/englishUi.ts', import.meta.url), 'utf8');
const dictionary = JSON.parse(readFileSync(new URL('../src/translations.json', import.meta.url), 'utf8'));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let callback;
let observed;
let disconnected = false;
class Element {
  constructor(tag = 'div', attrs = {}) { this.tag = tag; this.attrs = attrs; this.childNodes = []; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = value; }
  closest(selector) {
    if (selector.includes(this.tag) || this.attrs['data-ui-translate'] === 'off') return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  querySelectorAll() { return this.childNodes.filter(node => node instanceof Element); }
}
const body = new Element('body');
const context = {
  exports: {}, require: () => ({ default: dictionary }), Element, Node: { TEXT_NODE: 3 },
  document: { body, documentElement: {} },
  MutationObserver: class {
    constructor(handler) { callback = handler; }
    observe(target, options) { observed = { target, options }; }
    disconnect() { disconnected = true; }
  },
};
vm.runInNewContext(compiled, context);
const { translateUiText: translate, installEnglishUi } = context.exports;
const text = (value, parent = body) => ({ nodeType: 3, nodeValue: value, parentElement: parent });

test('translates accented boundaries and chooses the longest phrase', () => {
  assert.equal(translate('Đực thiến'), 'Gelding');
  assert.equal(translate('Đến ngày'), 'To date');
  assert.equal(translate('Xác nhận mật khẩu mới'), 'Confirm new password');
  assert.equal(translate('Đăng nhập nhanh (demo)'), 'Quick sign-in (demo)');
});

test('preserves unknown names, clinical notes, whitespace and identifiers', () => {
  for (const value of ['  Nguyễn Văn An  ', 'HRS-001', 'Sưng vùng gân trái — tái kiểm tra sau 48h', 'My inventory']) {
    assert.equal(translate(value), value);
  }
  assert.equal(translate('abcĐựcxyz'), 'abcĐựcxyz');
});

test('retains existing date and price presentation without rolling invalid dates', () => {
  assert.equal(translate('25/09/2026'), 'Sep 25, 2026');
  assert.equal(translate('31/02/2026'), '31/02/2026');
  assert.equal(translate('2.500.000 VND'), '$100');
});

test('translations are stable on a second observer pass', () => {
  for (const phrase of Object.keys(dictionary)) {
    const translated = translate(phrase);
    assert.equal(translate(translated), translated, phrase);
  }
});

test('observes dynamic text nodes, attribute updates, and supports cleanup', () => {
  const cleanup = installEnglishUi();
  assert.equal(context.document.documentElement.lang, 'en');
  assert.equal(observed.options.attributes, true);
  assert.deepEqual([...observed.options.attributeFilter], ['placeholder', 'title', 'aria-label']);
  const added = text('Đăng nhập');
  callback([{ type: 'childList', addedNodes: [added] }]);
  assert.equal(added.nodeValue, 'Sign in');
  added.nodeValue = 'Đăng ký';
  callback([{ type: 'characterData', target: added }]);
  assert.equal(added.nodeValue, 'Register');
  const input = new Element('input', { placeholder: 'Mật khẩu mới' });
  callback([{ type: 'attributes', target: input }]);
  assert.equal(input.attrs.placeholder, 'New password');
  cleanup();
  assert.equal(disconnected, true);
});

test('keeps editable content intact while translating textarea placeholders', () => {
  const textarea = new Element('textarea', { placeholder: 'Mật khẩu mới' });
  const value = text('Đăng nhập', textarea);
  textarea.childNodes.push(value);
  callback([{ type: 'childList', addedNodes: [textarea] }]);
  assert.equal(value.nodeValue, 'Đăng nhập');
  assert.equal(textarea.attrs.placeholder, 'New password');
  const excluded = new Element('span', { 'data-ui-translate': 'off' });
  const name = text('Đực', excluded);
  callback([{ type: 'characterData', target: name }]);
  assert.equal(name.nodeValue, 'Đực');
});

