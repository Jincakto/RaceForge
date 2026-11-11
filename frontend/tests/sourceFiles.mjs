import { readdirSync } from 'node:fs';
import { basename, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const src = new URL('../src/', import.meta.url);
const paths = new Map();
for (const entry of readdirSync(src, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !/\.(tsx?|json)$/.test(entry.name)) continue;
  if (paths.has(entry.name)) throw new Error(`Duplicate frontend test module: ${entry.name}`);
  paths.set(entry.name, pathToFileURL(entry.parentPath + sep + entry.name));
}

export function sourceNames() {
  return [...paths.keys()];
}

export function sourceUrl(name) {
  const url = paths.get(name);
  if (!url) throw new Error(`Frontend source file not found: ${name}`);
  return url;
}

// Unit tests transpile source modules into a temporary directory with flat filenames.
export function flattenModuleImports(code) {
  return code.replace(/(\bfrom\s*|\bimport\(\s*)(['"])(\.\.?\/[^'"]+)\2/g,
    (match, prefix, quote, specifier) => {
      const name = basename(specifier).replace(/\.tsx?$/, '');
      return paths.has(name + '.ts') || paths.has(name + '.tsx')
        ? prefix + quote + './' + name + '.mjs' + quote
        : match;
    });
}
