import fs from 'node:fs/promises';
import path from 'node:path';

const LIMIT=1024*1024;
const PARTS=2;
const DAYS=14;
const LEVELS=new Set(['info','warn','error']);
const EVENT=/^[a-z][a-z0-9._-]{0,63}$/;
const ID=/^dsh-[a-z0-9-]{2,60}$/;
const TOOL=/^[a-z][a-z0-9_-]{0,60}$/;
const VERSION=/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SAFE_CODE=/^(?:[0-9]{3,6}|[A-Z][A-Z0-9_]{1,31}|[a-z]+(?:-[a-z]+){0,2})$/;
const values=new Set(['ok','failed','cancelled','disabled','active','closed','timeout','running','completed','unknown','interrupted','pending','skipped']);
const safeNumber=x=>typeof x==='number'&&Number.isFinite(x)?Math.max(0,Math.min(86400000,Math.round(x))):undefined;

const OWNED_TOOLS=new Map([
 ...['browser_navigate','browser_snapshot','browser_click','browser_type','browser_screenshot'].map(x=>[x,'dsh-browser-tools']),
 ...['desktop_windows','desktop_snapshot','desktop_screenshot','desktop_click','desktop_type'].map(x=>[x,'dsh-desktop-tools']),
 ...['memory_dream','memory_search','memory_topics'].map(x=>[x,'dsh-memory-dreaming']),
 ['skill_workshop','dsh-skill-workshop']
]);
export function pluginForTool(value){
  return typeof value==='string'?OWNED_TOOLS.get(value)??null:null;
}

export function makeRecord(plugin,level,event,details={},now=new Date()){
  if(!ID.test(plugin)||!LEVELS.has(level)||!EVENT.test(event))return null;
  const record={at:now.toISOString(),plugin,level,event};
  // Explicit metadata allowlist: never stringify arbitrary errors, requests,
  // response bodies, user text, identifiers, stack traces or objects.
  for(const name of ['durationMs','count','sizeBytes']){
    const n=safeNumber(details[name]);if(n!==undefined)record[name]=n;
  }
  if(SAFE_CODE.test(details.code??''))record.code=details.code;
  for(const name of ['runtimeVersion','testedRuntime'])if(VERSION.test(details[name]??''))record[name]=details[name];
  if(pluginForTool(details.tool)===plugin)record.tool=details.tool;
  if(values.has(details.state))record.state=details.state;
  if(details.provider==='discord'||details.provider==='feishu')record.provider=details.provider;
  return record;
}

export class DiagnosticsWriter{
  constructor(root,{now=()=>new Date(),limit=LIMIT,parts=PARTS,days=DAYS}={}){
    this.root=root;this.now=now;this.limit=limit;this.parts=parts;this.days=days;
    this.queue=[];this.serial=Promise.resolve();this.closed=false;this.dropped=0;
  }
  record(plugin,level,event,details={}){
    if(this.closed)return;
    const row=makeRecord(plugin,level,event,details,this.now());
    if(!row)return;
    if(this.queue.length>=2000){this.dropped++;return;}
    this.queue.push(row);
  }
  async appendBatch(rows){
    const grouped=new Map();
    for(const row of rows){
      const day=row.at.slice(0,10),key=row.plugin+'/'+day;
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(JSON.stringify(row)+'\n');
    }
    for(const [group,lines] of grouped){
      const [name,day]=group.split('/'),folder=path.join(this.root,name);
      try{
        await fs.mkdir(folder,{recursive:true});
        for(const line of lines){
          const size=Buffer.byteLength(line);
          if(size>this.limit)continue;
          for(let part=0;part<this.parts;part++){
            const target=path.join(folder,day+'.'+part+'.jsonl');
            const existing=await fs.stat(target).then(stat=>stat.size).catch(error=>error.code==='ENOENT'?0:Infinity);
            if(existing+size<=this.limit){await fs.appendFile(target,line,{encoding:'utf8',flag:'a'});break;}
          }
        }
      }catch{/* Diagnostic failures must never interrupt user tasks. */}
    }
  }
  flush(){
    const batch=this.queue.splice(0);
    if(!batch.length)return this.serial;
    this.serial=this.serial.then(()=>this.appendBatch(batch)).catch(()=>{});
    return this.serial;
  }
  async cleanup(){
    try{
      const cutoff=new Date(this.now().getTime()-this.days*86400000).toISOString().slice(0,10);
      for(const entry of await fs.readdir(this.root,{withFileTypes:true})){
        if(!entry.isDirectory()||!ID.test(entry.name))continue;
        const dir=path.join(this.root,entry.name);
        for(const file of await fs.readdir(dir)){
          const day=/^(\d{4}-\d\d-\d\d)\.(\d+)\.jsonl$/.exec(file);
          if(day&&day[1]<cutoff)await fs.unlink(path.join(dir,file)).catch(()=>{});
        }
      }
    }catch{/* Missing directory or transient locks are safe to ignore. */}
  }
  async close(){
    if(this.closed)return this.serial;
    this.closed=true;return this.flush();
  }
}
