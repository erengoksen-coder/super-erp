const fs = require('fs');
const path = require('path');
const base = path.join('app','api');

function walk(dir, rel=''){const entries=fs.readdirSync(dir,{withFileTypes:true});let files=[];for(const e of entries){const r=path.join(rel,e.name);const p=path.join(dir,e.name);if(e.isDirectory()) files=files.concat(walk(p,r)); else if(e.isFile()&&e.name==='route.ts') files.push(r);}return files;}

const files = walk(base);
let changed = 0;
for (const rel of files) {
  const filePath = path.join(base, rel);
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(/withAuth\(async \(([^)]*)\)\s*\{/g, 'withAuth(async ($1) => {');
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    changed++;
  }
}
console.log(`Fixed ${changed} files.`);
