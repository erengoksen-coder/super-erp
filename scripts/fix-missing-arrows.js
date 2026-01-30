const fs = require('fs');
const path = require('path');
const base = path.join('app','api');
const methods = ['map','reduce','filter','forEach','some','every','find','findIndex','flatMap','sort'];

function walk(dir){
  let files = [];
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(p));
    else if (e.isFile() && p.endsWith('.ts')) files.push(p);
  }
  return files;
}

function fixContent(content){
  let updated = content;
  for (const m of methods) {
    const re = new RegExp('\\.' + m + '\\(\\s*\\([^)]*\\)\\s*\\{','g');
    updated = updated.replace(re, (match) => {
      if (match.includes('=>')) return match;
      return match.replace('{','=> {');
    });
  }
  updated = updated.replace(/transaction\(\s*\([^)]*\)\s*\{/g, (match) => {
    if (match.includes('=>')) return match;
    return match.replace('{','=> {');
  });
  return updated;
}

let changed = 0;
for (const file of walk(base)) {
  const c = fs.readFileSync(file,'utf8');
  const u = fixContent(c);
  if (u !== c) { fs.writeFileSync(file,u,'utf8'); changed++; }
}
console.log('fixed files:', changed);
