// Guards against a hook placed after an early `return` in a component. That
// renders fine until the component first returns early, then React throws
// "Rendered more hooks than during the previous render" (2.6.0 crashed right
// after the welcome screen because of this in PlayTab).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : [];
  });
}

const START = /^(export\s+)?(default\s+)?function\s+[A-Z]\w*\s*\(|^(export\s+)?const\s+[A-Z]\w*\s*=\s*(\([^)]*\)|\w+)\s*=>/;
const HOOK = /^  (?:const|let)\s+[^=]+=\s*use[A-Z]\w*\(|^  use[A-Z]\w*\(/;
const EARLY_RETURN_INLINE = /^  if\s*\(.*\)\s*return\b/;
const IF_BLOCK = /^  if\s*\(/;
const NESTED_RETURN = /^    return\b/;

export function hooksAfterEarlyReturn(src) {
  const lines = src.split('\n');
  const bad = [];
  let inComponent = false;
  let returned = false;
  let inIf = false;
  lines.forEach((line, i) => {
    if (START.test(line)) { inComponent = true; returned = false; inIf = false; return; }
    if (!inComponent) return;
    if (/^}/.test(line)) { inComponent = false; return; }
    if (EARLY_RETURN_INLINE.test(line)) returned = true;
    if (IF_BLOCK.test(line)) inIf = true;
    else if (/^  \S/.test(line)) inIf = false;
    if (inIf && NESTED_RETURN.test(line)) returned = true;
    if (returned && HOOK.test(line)) bad.push(`${i + 1}: ${line.trim().slice(0, 80)}`);
  });
  return bad;
}

test('the checker spots a hook after an early return', () => {
  const src = 'export default function A() {\n  const [a] = useState(1);\n  if (!a) return null;\n  const f = useCallback(() => {}, []);\n  return null;\n}\n';
  assert.equal(hooksAfterEarlyReturn(src).length, 1);
});

test('no component calls a hook after an early return', () => {
  const found = [...files('src'), 'App.js'].flatMap((f) =>
    hooksAfterEarlyReturn(readFileSync(f, 'utf8')).map((l) => `${f}:${l}`)
  );
  assert.deepEqual(found, []);
});
