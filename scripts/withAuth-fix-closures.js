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

function findMatchingBrace(src, startIdx){
  let depth = 0;
  let state = 'normal';
  for(let i=startIdx;i<src.length;i++){
    const ch = src[i];
    const next = src[i+1];
    if(state==='lineComment'){ if(ch==='\n') state='normal'; continue; }
    if(state==='blockComment'){ if(ch==='*' && next=== '/') {state='normal'; i++;} continue; }
    if(state==='single'){ if(ch==='\\'){i++; continue;} if(ch==="'") state='normal'; continue; }
    if(state==='double'){ if(ch==='\\'){i++; continue;} if(ch==='"') state='normal'; continue; }
    if(state==='template'){ if(ch==='\\'){i++; continue;} if(ch==='`') state='normal'; continue; continue; }
    if(ch==='/' && next==='/' ){ state='lineComment'; i++; continue; }
    if(ch==='/' && next==='*' ){ state='blockComment'; i++; continue; }
    if(ch==="'"){ state='single'; continue; }
    if(ch==='"'){ state='double'; continue; }
    if(ch==='`'){ state='template'; continue; }
    if(ch==='{'){ depth++; continue; }
    if(ch==='}'){ depth--; if(depth===0) return i; continue; }
  }
  return -1;
}

let changed = 0;
for(const file of walk(base)){
  let content = fs.readFileSync(file,'utf8');
  let updated = content;

  // Ensure arrow after withAuth async params if missing
  updated = updated.replace(/withAuth\(async \(([^)]*)\)\s*\{/g, 'withAuth(async ($1) => {');

  // Ensure closing parenthesis after handler body
  let idx = updated.indexOf('withAuth(async');
  if(idx !== -1){
    const edits = [];
    while(idx !== -1){
      const bodyStart = updated.indexOf('{', idx);
      if(bodyStart === -1) break;
      const bodyEnd = findMatchingBrace(updated, bodyStart);
      if(bodyEnd === -1) break;
      // find next non-space char
      let j = bodyEnd + 1;
      while(j < updated.length && /\s/.test(updated[j])) j++;
      const nextChar = updated[j];
      if(nextChar !== ')' && nextChar !== ','){
        edits.push({ pos: bodyEnd + 1, text: ')' });
      }
      idx = updated.indexOf('withAuth(async', bodyEnd + 1);
    }
    if(edits.length){
      edits.sort((a,b)=>b.pos-a.pos);
      for(const e of edits){
        updated = updated.slice(0,e.pos) + e.text + updated.slice(e.pos);
      }
    }
  }

  if(updated !== content){
    fs.writeFileSync(file, updated, 'utf8');
    changed++;
  }
}
console.log(`Fixed ${changed} files.`);
