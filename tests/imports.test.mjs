// Every named import from our own files must exist as an export. A missing one is
// `undefined` at runtime and crashes only when that line runs (2.9.0: PLACES on the end card).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const cache = new Map();
function exportsOf(file) {
  if (cache.has(file)) return cache.get(file);
  const s = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of s.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const p = part.trim();
      if (p) names.add(p.split(/\s+as\s+/).pop().trim());
    }
  }
  if (/export\s+\*\s+from/.test(s)) names.add('*');
  cache.set(file, names);
  return names;
}

test('named imports from our own files all exist', () => {
  const files = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.js')];
  const missing = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/import\s+(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*'(\.[^']+)'/g)) {
      const base = path.resolve(path.dirname(f), m[2]);
      const target = [`${base}.js`, path.join(base, 'index.js'), base].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!target) {
        missing.push(`${path.relative(ROOT, f)}: file ${m[2]}`);
        continue;
      }
      const ex = exportsOf(target);
      if (ex.has('*')) continue;
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (name && !ex.has(name)) missing.push(`${path.relative(ROOT, f)}: ${name} from ${m[2]}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('the end card names the place without the stages PLACES list', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/game/PlayTab.js'), 'utf8');
  assert.equal(/PLACES\[/.test(src), false);
  assert.ok((src.match(/placeName\(t, screen\.stage\?\.theme\)/g) || []).length >= 3);
});
