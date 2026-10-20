import translations from './translations.json';

const phrases = new Map(Object.entries(translations));
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Unicode boundaries also match Vietnamese words beginning or ending in accents.
// A single pass prevents a shorter phrase from rewriting an earlier translation.
const phrasePattern = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:${[...phrases.keys()].sort((a, b) => b.length - a.length).map(escapePattern).join('|')})(?![\\p{L}\\p{N}_])`,
  'gu',
);
const datePattern = /\b([0-3]\d)\/([01]\d)\/(20\d{2})\b/g;
const moneyPattern = /\b([\d.,]+)\s*VND\b/g;

function formatDate(original: string, day: string, month: string, year: string) {
  const value = new Date(Number(year), Number(month) - 1, Number(day));
  if (value.getDate() !== Number(day) || value.getMonth() !== Number(month) - 1) return original;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

function formatMoney(original: string, raw: string) {
  const amount = Number(raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(amount)) return original;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount / 25000);
}

export function translateUiText(source: string): string {
  // Unknown content keeps its meaning, accents, IDs and whitespace. Never replace
  // a clinical note or validation error with a generic success message.
  return source
    .replace(phrasePattern, phrase => phrases.get(phrase) ?? phrase)
    .replace(datePattern, formatDate)
    .replace(moneyPattern, formatMoney);
}

const attributes = ['placeholder', 'title', 'aria-label'] as const;
const ignored = 'script, style, [contenteditable], [data-ui-translate="off"]';

function translateText(node: Node) {
  if (!node.nodeValue || node.parentElement?.closest(`${ignored}, textarea`)) return;
  const translated = translateUiText(node.nodeValue);
  if (translated !== node.nodeValue) node.nodeValue = translated;
}

function translateElement(element: Element) {
  if (element.closest(ignored)) return;
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;
    const translated = translateUiText(value);
    if (translated !== value) element.setAttribute(attribute, translated);
  }
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node);
  }
}

export function installEnglishUi() {
  document.documentElement.lang = 'en';
  const translateTree = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) translateText(root);
    if (root instanceof Element) {
      translateElement(root);
      root.querySelectorAll('*').forEach(translateElement);
    }
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(translateTree);
      if (record.type === 'characterData') translateText(record.target);
      if (record.type === 'attributes' && record.target instanceof Element) translateElement(record.target);
    }
  });
  translateTree(document.body);
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: [...attributes],
  });
  return () => observer.disconnect();
}
