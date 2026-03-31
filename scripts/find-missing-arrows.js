const fs=require('fs');const path=require('path');
const base=path.join('app','api');
const methods=['map','reduce','filter','forEach','some','every','find','findIndex','flatMap','sort','transaction'];
function walk(dir){let files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory()) files=files.concat(walk(p));
  else if(e.isFile()&&p.endsWith('.ts')) files.push(p);
}
return files;}
const suspects=[];
for(const file of walk(base)){
  const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
  lines.forEach((line,idx)=>{
    for(const m of methods){
      if(line.includes(m+'(')||line.includes(m+'<')){
        const openIdx=line.indexOf(m);
        if(openIdx!==-1 && line.includes('{') && !line.includes('=>')){
          // likely missing arrow
          if(line.includes(m)) suspects.push({file, idx: idx+1, line: line.trim()});
        }
      }
    }
    if(line.includes('= (') && line.includes('{') && !line.includes('=>')){
      suspects.push({file, idx: idx+1, line: line.trim()});
    }
    if(line.includes('= async (') && line.includes('{') && !line.includes('=>')){
      suspects.push({file, idx: idx+1, line: line.trim()});
    }
  });
}
for(const s of suspects){
  console.log(s.file+':'+s.idx+' '+s.line);
}
