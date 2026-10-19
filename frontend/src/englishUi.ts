import translations from './translations.json';

const phrases = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
const vietnamese = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-ỹ]/;
const datePattern = /\b([0-3]\d)\/([01]\d)\/(20\d{2})\b/g;
const moneyPattern = /\b([\d.,]+)\s*VND\b/g;

const fallback: Array<[RegExp, string]> = [
  [/\bVui lòng\b/gi, 'Please'],
  [/\bKhông tìm thấy\b/gi, 'Could not find'],
  [/\bChưa có\b/gi, 'No'],
  [/\bĐã\b/gi, ''],
  [/\bđang\b/gi, 'currently'],
  [/\bđược\b/gi, ''],
  [/\bcủa\b/gi, 'of'],
  [/\bcho\b/gi, 'for'],
  [/\bvà\b/gi, 'and'],
  [/\bhoặc\b/gi, 'or'],
  [/\bvới\b/gi, 'with'],
  [/\btrong\b/gi, 'in'],
  [/\btrước\b/gi, 'before'],
  [/\bsau\b/gi, 'after'],
  [/\bngựa\b/gi, 'horse'],
  [/\bhồ sơ\b/gi, 'record'],
  [/\bkhám\b/gi, 'examination'],
  [/\btập luyện\b/gi, 'training'],
  [/\bhuấn luyện\b/gi, 'training'],
  [/\bphân công\b/gi, 'assignment'],
  [/\blý do\b/gi, 'reason'],
  [/\bthông tin\b/gi, 'information'],
  [/\btài khoản\b/gi, 'account'],
  [/\bmật khẩu\b/gi, 'password'],
  [/\btối đa\b/gi, 'maximum'],
  [/\btối thiểu\b/gi, 'minimum'],
  [/\bký tự\b/gi, 'characters'],
  [/\bsố\b/gi, 'number'],
  [/\btên\b/gi, 'name'],
  [/\bchọn\b/gi, 'select'],
  [/\bnhập\b/gi, 'enter'],
  [/\btạo\b/gi, 'create'],
  [/\bcập nhật\b/gi, 'update'],
  [/\btheo dõi\b/gi, 'monitoring'],
  [/\bsức khỏe\b/gi, 'health'],
  [/\bthành tích\b/gi, 'achievement'],
  [/\bgiải đua\b/gi, 'race'],
  [/\blịch sử\b/gi, 'history'],
  [/\bthời gian\b/gi, 'time'],
  [/\btốc độ\b/gi, 'speed'],
  [/\btrạng thái\b/gi, 'status'],
  [/\bghi chú\b/gi, 'notes'],
  [/\bmô tả\b/gi, 'description'],
  [/\bhiện tại\b/gi, 'current'],
  [/\bhệ thống\b/gi, 'system'],
  [/\bcâu lạc bộ\b/gi, 'club'],
  [/\btrung tâm\b/gi, 'club'],
  [/\btháng\b/gi, 'month'],
  [/\bgiờ\b/gi, 'hours'],
  [/\bphút\b/gi, 'minutes']
];

function formatDate(_: string, day: string, month: string, year: string) {
  const value = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

function formatMoney(_: string, raw: string) {
  const amount = Number(raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(amount)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount / 25000);
}

export function translateUiText(source: string): string {
  if (!source.trim()) return source;
  const leading = source.match(/^\s*/)?.[0] || '';
  const trailing = source.match(/\s*$/)?.[0] || '';
  let text = source.trim()
    .replace(datePattern, formatDate)
    .replace(moneyPattern, formatMoney);
  for (const [from, to] of phrases) text = text.replaceAll(from, to);
  if (vietnamese.test(text)) {
    for (const [pattern, replacement] of fallback) text = text.replace(pattern, replacement);
  }
  // Legacy seed records contain free-form Vietnamese descriptions. Exact UI
  // terminology is translated above; this final pass prevents old accents from
  // leaking into the English prototype while preserving names, IDs and values.
  if (vietnamese.test(text)) {
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('Đ', 'D').replaceAll('đ', 'd');
  }
  return `${leading}${text.replace(/\s{2,}/g, ' ').trim()}${trailing}`;
}

function translateElement(element: Element) {
  for (const attribute of ['placeholder', 'title', 'aria-label']) {
    const value = element.getAttribute(attribute);
    if (value) {
      const translated = translateUiText(value);
      if (translated !== value) element.setAttribute(attribute, translated);
    }
  }
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const translated = translateUiText(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
    }
  }
}

export function installEnglishUi() {
  document.documentElement.lang = 'en';
  const translateTree = (root: Node) => {
    if (root instanceof Element) {
      translateElement(root);
      root.querySelectorAll('*').forEach(translateElement);
    }
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(translateTree);
      if (record.type === 'characterData' && record.target.nodeValue) {
        const translated = translateUiText(record.target.nodeValue);
        if (translated !== record.target.nodeValue) record.target.nodeValue = translated;
      }
    }
  });
  translateTree(document.body);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
