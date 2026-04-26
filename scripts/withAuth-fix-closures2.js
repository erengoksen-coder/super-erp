const fs=require('fs');
const path=require('path');
const base=path.join('app','api');
function walk(dir){let files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory()) files=files.concat(walk(p)); else if(e.isFile()&&e.name==='route.ts') files.push(p);
}return files;}
function findMatchingBrace(src,startIdx){
  let depth=0;let state='normal';
  for(let i=startIdx;i<src.length;i++){
    const ch=src[i], next=src[i+1];
    if(state==='line'){ if(ch==='\n') state='normal'; continue; }
    if(state==='block'){ if(ch==='*'&&next=== '/') {state='normal'; i++;} continue; }
    if(state==='single'){ if(ch==='\\'){i++; continue;} if(ch==="'") state='normal'; continue; }
    if(state==='double'){ if(ch==='\\'){i++; continue;} if(ch==='"') state='normal'; continue; }
    if(state==='template'){ if(ch==='\\'){i++; continue;} if(ch==='`') state='normal'; continue; }
    if(ch==='/'&&next==='/' ){state='line'; i++; continue;}
    if(ch==='/'&&next==='*' ){state='block'; i++; continue;}
    if(ch==="'"){state='single'; continue;}
    if(ch==='"'){state='double'; continue;}
    if(ch==='`'){state='template'; continue;}
    if(ch==='{'){depth++; continue;}
    if(ch==='}'){depth--; if(depth===0) return i; continue;}
  }
  return -1;
}
let changed=0;
for(const file of walk(base)){
  let c=fs.readFileSync(file,'utf8');
  let updated=c;
  let idx=updated.indexOf('withAuth(async');
  const inserts=[];
  while(idx!==-1){
    const bodyStart=updated.indexOf('{', idx);
    if(bodyStart===-1) break;
    const bodyEnd=findMatchingBrace(updated, bodyStart);
    if(bodyEnd===-1) break;
    let j=bodyEnd+1; while(j<updated.length && /\s/.test(updated[j])) j++;
    const next=updated[j];
    if(next!==')' && next!==',') inserts.push(bodyEnd+1);
    idx=updated.indexOf('withAuth(async', bodyEnd+1);
  }
  if(inserts.length){
    inserts.sort((a,b)=>b-a);
    for(const pos of inserts){
      updated = updated.slice(0,pos) + ')' + updated.slice(pos);
    }
    fs.writeFileSync(file, updated, 'utf8');
    changed++;
  }
}
console.log(`Fixed ${changed} files.`);
