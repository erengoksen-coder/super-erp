const fs=require('fs');
const path=require('path');
const base=path.join('app','api');
function walk(dir){let files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory()) files=files.concat(walk(p)); else if(e.isFile()&&e.name==='route.ts') files.push(p);
}return files;}
let changed=0;
for(const file of walk(base)){
  let c=fs.readFileSync(file,'utf8');
  const updated=c.replace(/\}\)\s*:\s*\{\s*params/g, '}: { params');
  if(updated!==c){fs.writeFileSync(file, updated, 'utf8'); changed++;}
}
console.log(`Fixed ${changed} files.`);
