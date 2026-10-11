import path from 'node:path';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { DiagnosticsWriter,pluginForTool } from './logger.js';

export default class PluginDiagnostics extends TypertRemoteService{
  static inject=['dshHomePath'];
  constructor(ctx){
    super(ctx,'pluginDiagnostics');
    this.writer=new DiagnosticsWriter(ctx.dshHomePath('plugin-diagnostics','logs'));
    this.started=new Set();
    this.record('dsh-plugin-diagnostics','info','observer.started',{state:'active'});
    // Observe other service lifecycles from the root scope. Plugin-side
    // callbacks may not see this diagnostic service across isolated scopes.
    for(const [service,plugin] of [
      ['browserTools','dsh-browser-tools'],['channelCore','dsh-channel-core'],
      ['desktopTools','dsh-desktop-tools'],['instructionFilesSettings','dsh-instruction-files'],
      ['losslessContext','dsh-lossless-context'],['memoryDreaming','dsh-memory-dreaming'],
      ['skillWorkshop','dsh-skill-workshop'],['statusCardsSettings','dsh-status-cards'],
      ['tavernSettings','dsh-tavern'],['webSearchRouterSettings','dsh-web-search-router']
    ])ctx.inject([service],scope=>{
      this.start(plugin);
      if(plugin==='dsh-skill-workshop')try{
        const health=scope.get(service)?.health?.();
        const failures=health?.reviews?.failed;
        if(Number.isSafeInteger(failures))this.record(plugin,failures?'warn':'info','learning.previous-failures',{count:failures,state:failures?'failed':'ok'});
      }catch{}
      scope.effect(()=>()=>this.stop(plugin));
    });
    const flush=setInterval(()=>{void this.writer.flush();},1500);
    const cleanup=setInterval(()=>{void this.writer.cleanup();},6*3600000);
    flush.unref?.();cleanup.unref?.();
    void this.writer.cleanup();
    // Only metadata is recorded; args, results and identity are never read.
    ctx.on('tools/call',async(exec,next)=>{
      const plugin=pluginForTool(exec?.name);
      if(!plugin)return next();
      const start=performance.now(),tool=exec.name;
      try{
        const value=await next();
        this.record(plugin,'info','tool.completed',{tool,durationMs:performance.now()-start,state:'ok'});
        return value;
      }catch(error){
        this.record(plugin,'error','tool.failed',{tool,durationMs:performance.now()-start,
          code:error?.code,state:'failed'});
        throw error;
      }
    },{global:true});
    ctx.on('tools/result',(exec,result)=>{
      if(!result?.isError)return;
      const plugin=pluginForTool(exec?.name);
      if(plugin)this.record(plugin,'error','tool.result-error',{tool:exec.name,state:'failed'});
    },{global:true});
    ctx.on('schedule/changed',()=>{
      this.record('dsh-plugin-diagnostics','info','schedule.changed');
    },{global:true});
    ctx.effect(()=>async()=>{
      clearInterval(flush);clearInterval(cleanup);
      for(const name of this.started)this.record(name,'info','plugin.stopped',{state:'closed'});
      this.record('dsh-plugin-diagnostics','info','observer.stopped',{state:'closed'});
      await this.writer.close();
    });
  }
  record(plugin,level,event,details){this.writer.record(plugin,level,event,details);}
  start(plugin){
    if(this.started.has(plugin))return;
    this.started.add(plugin);
    this.record(plugin,'info','plugin.started',{state:'active'});
  }
  stop(plugin){
    if(!this.started.delete(plugin))return;
    this.record(plugin,'info','plugin.stopped',{state:'closed'});
  }
}
