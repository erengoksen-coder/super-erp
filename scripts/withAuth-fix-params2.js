const fs = require('fs');
const path = require('path');
const base = path.join('app','api');

function walk(dir){
  const entries = fs.readdirSync(dir,{withFileTypes:true});
  let files=[];
  for(const e of entries){
    const p = path.join(dir,e.name);
    if(e.isDirectory()) files = files.concat(walk(p));
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

let changed = 0;
for (const file of walk(base)) {
  let content = fs.readFileSync(file,'utf8');
  let updated = content;
  // Fix stray ) before destructured type annotation
  updated = updated.replace(/\}\)\s*:\s*\{/g, '}: {');

  let idx = updated.indexOf('withAuth(async (');
  while (idx !== -1) {
    const startParams = idx + 'withAuth(async ('.length;
    const endParams = findMatchingParen(updated, startParams - 1);
    if (endParams === -1) break;
    let paramsText = updated.slice(startParams, endParams);

    if (/\{\s*params\b/.test(paramsText) && !/\buser\b/.test(paramsText)) {
      const parts = paramsText.split(',');
      if (parts.length >= 2) {
        const first = parts[0];
        const rest = parts.slice(1).join(',');
        paramsText = `${first}, user,${rest}`;
        updated = updated.slice(0, startParams) + paramsText + updated.slice(endParams);
      }
    }

    // insert arrow before block if missing
    const after = updated.slice(endParams + 1);
    const match = after.match(/^\s*\{/);
    if (match) {
      updated = updated.slice(0, endParams + 1) + ' => ' + updated.slice(endParams + 1).replace(/^\s*\{/, '{');
    }

    idx = updated.indexOf('withAuth(async (', endParams + 1);
  }

  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    changed++;
  }
}
console.log(`Fixed ${changed} route files.`);
