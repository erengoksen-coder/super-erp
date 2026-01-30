const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const base = path.join('app', 'api');
const skip = new Set([
  path.join('auth', 'login', 'route.ts'),
  path.join('auth', 'register', 'route.ts'),
  path.join('auth', 'refresh', 'route.ts')
]);
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

function walk(dir, rel = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const nextRel = path.join(rel, entry.name);
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(nextPath, nextRel));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(nextRel);
    }
  }
  return files;
}

function hasExportModifier(node) {
  return node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function hasAsyncModifier(node) {
  return node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
}

function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && methods.has(node.name.text)) {
      if (!hasExportModifier(node) || !hasAsyncModifier(node)) return;
      const start = node.getStart(source);
      const end = node.end;
      const text = content.slice(start, end);
      const method = node.name.text;
      const replaced = text.replace(`export async function ${method}(`, `export const ${method} = withAuth(async (`) + ')';
      edits.push({ start, end, text: replaced });
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  if (!edits.length) return false;

  edits.sort((a, b) => b.start - a.start);
  let updated = content;
  for (const edit of edits) {
    updated = updated.slice(0, edit.start) + edit.text + updated.slice(edit.end);
  }

  if (!updated.includes("from '@/lib/api/withAuth'")) {
    const lines = updated.split(/\r?\n/);
    const firstImportIdx = lines.findIndex((line) => line.startsWith('import '));
    const insertIdx = firstImportIdx >= 0 ? firstImportIdx + 1 : 0;
    lines.splice(insertIdx, 0, "import { withAuth } from '@/lib/api/withAuth'");
    updated = lines.join('\n');
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
}

const files = walk(base);
let changed = 0;
for (const rel of files) {
  if (skip.has(rel)) continue;
  const filePath = path.join(base, rel);
  if (updateFile(filePath)) changed++;
}
console.log(`AST wrapped ${changed} route files.`);
