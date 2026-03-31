const fs = require('fs');
const path = require('path');
const base = path.join('app', 'api');
const skip = new Set([
  path.join('auth', 'login', 'route.ts'),
  path.join('auth', 'register', 'route.ts'),
  path.join('auth', 'refresh', 'route.ts')
]);
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

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

function findFunctionEnd(src, startIdx) {
  let depth = 0;
  let state = 'normal';
  let templateExprDepth = 0;
  const stateStack = [];
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (state === 'lineComment') {
      if (ch === '\n') state = 'normal';
      continue;
    }
    if (state === 'blockComment') {
      if (ch === '*' && next === '/') {
        state = 'normal';
        i++;
      }
      continue;
    }
    if (state === 'single') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '\'') state = 'normal';
      continue;
    }
    if (state === 'double') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '"') state = 'normal';
      continue;
    }
    if (state === 'template') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '`') {
        state = 'normal';
        continue;
      }
      if (ch === '$' && next === '{') {
        stateStack.push('template');
        state = 'templateExpr';
        templateExprDepth = 1;
        i++;
        depth++;
        continue;
      }
      continue;
    }
    if (state === 'templateExpr') {
      if (ch === '/' && next === '/') {
        state = 'lineComment';
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'blockComment';
        i++;
        continue;
      }
      if (ch === '\'') {
        state = 'single';
        continue;
      }
      if (ch === '"') {
        state = 'double';
        continue;
      }
      if (ch === '`') {
        state = 'template';
        continue;
      }
      if (ch === '{') {
        templateExprDepth++;
        depth++;
        continue;
      }
      if (ch === '}') {
        templateExprDepth--;
        depth--;
        if (templateExprDepth === 0) {
          state = stateStack.pop() || 'template';
        }
        if (depth === 0) return i;
        continue;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      state = 'lineComment';
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      state = 'blockComment';
      i++;
      continue;
    }
    if (ch === '\'') {
      state = 'single';
      continue;
    }
    if (ch === '"') {
      state = 'double';
      continue;
    }
    if (ch === '`') {
      state = 'template';
      continue;
    }
    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
      continue;
    }
  }
  return -1;
}

function transform(content) {
  let updated = content;
  let changed = false;
  for (const method of methods) {
    const search = `export async function ${method}(`;
    let idx = updated.indexOf(search);
    while (idx !== -1) {
      const braceStart = updated.indexOf('{', idx);
      if (braceStart === -1) break;
      const endIdx = findFunctionEnd(updated, braceStart);
      if (endIdx === -1) break;
      updated =
        updated.slice(0, idx) +
        `export const ${method} = withAuth(async (` +
        updated.slice(idx + search.length, endIdx + 1) +
        `)` +
        updated.slice(endIdx + 1);
      changed = true;
      idx = updated.indexOf(search, idx + 1);
    }
  }
  if (!changed) return { content: updated, changed: false };
  if (!updated.includes("from '@/lib/api/withAuth'")) {
    const lines = updated.split(/\r?\n/);
    const firstImportIdx = lines.findIndex((line) => line.startsWith('import '));
    const insertIdx = firstImportIdx >= 0 ? firstImportIdx + 1 : 0;
    lines.splice(insertIdx, 0, "import { withAuth } from '@/lib/api/withAuth'");
    updated = lines.join('\n');
  }
  return { content: updated, changed: true };
}

const files = walk(base);
let changedCount = 0;
for (const rel of files) {
  if (skip.has(rel)) continue;
  const filePath = path.join(base, rel);
  const content = fs.readFileSync(filePath, 'utf8');
  const result = transform(content);
  if (result.changed) {
    fs.writeFileSync(filePath, result.content, 'utf8');
    changedCount++;
  }
}
console.log(`Updated ${changedCount} route files.`);
