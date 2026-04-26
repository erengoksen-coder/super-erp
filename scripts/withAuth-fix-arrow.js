const fs = require('fs');
const path = require('path');
const base = path.join('app','api');
function walk(dir){let files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory()) files=files.concat(walk(p)); else if(e.isFile()&&e.name==='route.ts') files.push(p);
}return files;}

function fixFile(file){
  let c = fs.readFileSync(file,'utf8');
  // fix broken destructuring type
  c = c.replace(/\}\)\s*:\s*\{/g, '}: {');
  // ensure arrow after withAuth(async (...)
  c = c.replace(/withAuth\(async\s*\(([\s\S]*?)\)\s*\{/g, 'withAuth(async ($1) => {');
  fs.writeFileSync(file, c, 'utf8');
}

for(const file of walk(base)){
  fixFile(file);
}
console.log('done');
