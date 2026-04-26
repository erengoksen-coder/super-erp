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
const bad=[];
for(const file of walk(base)){
  const c=fs.readFileSync(file,'utf8');
  let idx=c.indexOf('withAuth(async');
  while(idx!==-1){
    const bodyStart=c.indexOf('{', idx);
    if(bodyStart===-1) break;
    const bodyEnd=findMatchingBrace(c, bodyStart);
    if(bodyEnd===-1) break;
    let j=bodyEnd+1; while(j<c.length && /\s/.test(c[j])) j++;
    const next=c[j];
    if(next!==')' && next!==',') { bad.push(file); break; }
    idx=c.indexOf('withAuth(async', bodyEnd+1);
  }
}
console.log(bad.join('\n'));
