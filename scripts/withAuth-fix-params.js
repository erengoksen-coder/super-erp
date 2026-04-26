const fs = require('fs');
const path = require('path');

const base = path.join('app','api');

function walk(dir, rel=''){
  const entries = fs.readdirSync(dir,{withFileTypes:true});
  let files=[];
  for(const e of entries){
    const r = path.join(rel,e.name);
    const p = path.join(dir,e.name);
    if(e.isDirectory()) files = files.concat(walk(p,r));
    else if(e.isFile() && e.name === 'route.ts') files.push(p);
  }
  return files;
}

function findMatchingParen(text, startIdx){
  let depth=0;
  for(let i=startIdx;i<text.length;i++){
    const ch=text[i];
    if(ch==='(') depth++;
    else if(ch===')'){
      depth--;
      if(depth===0) return i;
    }
  }
  return -1;
}

function normalizeParams(paramText){
  let updated = paramText;
  // Fix broken destructured type: "}) : {" -> "}: {" (remove early ')')
  updated = updated.replace(/\}\)\s*:\s*\{/g, '}: {');

  // If has context destructure and missing user param, insert user after first param
  if (/\{\s*params\b/.test(updated) && !/\buser\b/.test(updated)) {
    const parts = updated.split(',');
    if (parts.length >= 2) {
      const first = parts[0];
      const rest = parts.slice(1).join(',');
      updated = `${first}, user,${rest}`;
    }
  }
  return updated;
}

let changed = 0;
const files = walk(base);
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;
  let idx = updated.indexOf('withAuth(async (');
  let fileChanged = false;
  while (idx !== -1) {
    const startParams = idx + 'withAuth(async ('.length;
    const endParams = findMatchingParen(updated, startParams - 1);
    if (endParams === -1) break;
    const paramsText = updated.slice(startParams, endParams);
    const fixedParams = normalizeParams(paramsText);
    if (fixedParams !== paramsText) {
      updated = updated.slice(0, startParams) + fixedParams + updated.slice(endParams);
      fileChanged = true;
    }
    // ensure arrow before next '{'
    let after = updated.slice(endParams + 1);
    const match = after.match(/^\s*\{/);
    if (match) {
      // insert => before {
      const insertPos = endParams + 1;
      updated = updated.slice(0, insertPos) + ' => ' + updated.slice(insertPos).replace(/^\s*\{/, '{');
      fileChanged = true;
    }
    idx = updated.indexOf('withAuth(async (', endParams + 1);
  }

  if (fileChanged) {
    fs.writeFileSync(file, updated, 'utf8');
    changed++;
  }
}
console.log(`Fixed ${changed} route files.`);
