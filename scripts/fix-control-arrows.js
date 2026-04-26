const fs = require('fs');
const path = require('path');
const base = path.join('app','api');
function walk(dir){let files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory()) files=files.concat(walk(p)); else if(e.isFile()&&e.name==='route.ts') files.push(p);
}return files;}
const files=walk(base);
let changed=0;
for(const file of files){
  let c=fs.readFileSync(file,'utf8');
  const updated=c.replace(/\b(for|if|while|switch|catch)\s*\(([\s\S]*?)\)\s*=>\s*\{/g, '$1 ($2) {');
  if(updated!==c){fs.writeFileSync(file,updated,'utf8');changed++;}
}
console.log('Fixed '+changed+' files.');
