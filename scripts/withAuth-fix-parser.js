const fs = require('fs');
const path = require('path');
const base = path.join('app','api');
function walk(dir){let files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory()) files=files.concat(walk(p)); else if(e.isFile()&&e.name==='route.ts') files.push(p);
}return files;}

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
for(const file of walk(base)){
  let c = fs.readFileSync(file,'utf8');
  let updated = c;
  // fix broken destructuring type
  updated = updated.replace(/\}\)\s*:\s*\{/g, '}: {');

  let idx = updated.indexOf('withAuth(async (');
  while(idx !== -1){
    const start = idx + 'withAuth(async ('.length;
    const end = findMatchingParen(updated, start-1);
    if(end === -1) break;
    // find next non-space
    let j = end + 1;
    while(j < updated.length && /\s/.test(updated[j])) j++;
    if(updated[j] === '{'){
      // insert arrow if missing
      updated = updated.slice(0, end+1) + ' => ' + updated.slice(end+1).replace(/^\s*\{/, '{');
    }
    idx = updated.indexOf('withAuth(async (', end+1);
  }

  if(updated !== c){
    fs.writeFileSync(file, updated, 'utf8');
    changed++;
  }
}
console.log('Fixed '+changed+' files.');
