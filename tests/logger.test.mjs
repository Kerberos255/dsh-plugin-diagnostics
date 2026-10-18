import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DiagnosticsWriter,makeRecord,pluginForTool } from '../logger.js';

test('metadata only; never write payloads, tokens, user data or exception messages',()=>{
 const event=makeRecord('dsh-channel-core','error','card.failed',{
  code:'50035',durationMs:3250,tool:'browser_click',
  text:'PRIVATE_TEXT',token:'PRIVATE_TOKEN',url:'https://example.invalid/private',
  error:new Error('PRIVATE_ERROR'),userId:'PRIVATE_USER',response:{secret:'PRIVATE_VALUE'},
  state:'failed'
 });
 const text=JSON.stringify(event);
 assert.equal(event.code,'50035');
 assert.equal(event.durationMs,3250);
 assert.equal(event.state,'failed');
 for(const secret of ['PRIVATE_TEXT','PRIVATE_TOKEN','PRIVATE_USER','PRIVATE_ERROR','PRIVATE_VALUE','example.invalid'])assert(!text.includes(secret));
 assert.equal(makeRecord('dsh-channel-core','error','card.failed',{code:'bad string with secret'}).code,undefined);
 assert.equal(makeRecord('../outside','info','bad'),null);
 assert.equal(makeRecord('dsh-channel-core','info','unsafe/path'),null);
});

test('tool attribution is deterministic and ignores unknown or sensitive tool names',()=>{
 assert.equal(pluginForTool('browser_snapshot'),'dsh-browser-tools');
 assert.equal(pluginForTool('desktop_click'),'dsh-desktop-tools');
 assert.equal(pluginForTool('memory_search'),'dsh-memory-dreaming');
 assert.equal(pluginForTool('skill_workshop'),'dsh-skill-workshop');
 assert.equal(pluginForTool('status_health_check'),null);
 assert.equal(pluginForTool('ask_secret_param_xxxxxxxxxxxx'),null);
});

test('write asynchronous bounded daily JSONL and expire stale days',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'dsh-diagnostics-test-'));
 let date=new Date('2026-10-12T10:00:00Z');
 const logger=new DiagnosticsWriter(tmp,{now:()=>date,limit:240,parts:2,days:14});
 try{
  logger.record('dsh-channel-core','info','plugin.started',{status:'unused'});
  logger.record('dsh-channel-core','warn','card.failed',{code:'50035'});
  logger.record('dsh-memory-dreaming','info','plugin.started');
  await logger.flush();
  const dir=path.join(tmp,'dsh-channel-core');
  const names=await fs.readdir(dir);
  assert(names.every(n=>/^2026-10-12\.[01]\.jsonl$/.test(n)));
  const log=(await Promise.all(names.map(n=>fs.readFile(path.join(dir,n),'utf8')))).join('');
  assert(log.includes('"event":"plugin.started"'));
  assert(log.includes('"code":"50035"'));
  assert(!log.includes('unused'));
  date=new Date('2026-11-13T10:00:00Z');
  await logger.cleanup();
  assert.deepEqual(await fs.readdir(dir),[]);
  await logger.close();
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});

test('logger failures never block user operations',async()=>{
 const logger=new DiagnosticsWriter(path.join(os.tmpdir(),'invalid-diagnostics-not-created'),{now:()=>new Date('2026-10-12T00:00:00Z')});
 logger.record('dsh-tavern','info','test.record');
 await logger.close();
 assert.equal(logger.closed,true);
});
