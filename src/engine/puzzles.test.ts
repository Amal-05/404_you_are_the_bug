import { describe, expect, it } from 'vitest';
import { canEnterRoute, newStageProgress, observerStep, stageSequenceComplete, validCookieIdentity, validConversationOrder, validSyncPair } from './puzzles';

describe('campaign puzzle rules',()=>{
  it('keeps the level zero final route locked until both fragments are visited',()=>{
    expect(canEnterRoute('boot-finish','level-0',{},[],[])).toBe(false);
    expect(canEnterRoute('boot-finish','level-0',{boot404:true,bootWelcome:true},[],[])).toBe(true);
  });
  it('accepts cookie selection and restored conversation only in the intended order',()=>{
    expect(validCookieIdentity(['creator_role','creator_name','creator_signature'])).toBe(true);
    expect(validCookieIdentity(['creator_name','creator_role','creator_name_corrupt'])).toBe(false);
    expect(validConversationOrder(['snapshot-1','snapshot-2','snapshot-3'])).toBe(true);
    expect(validConversationOrder(['snapshot-2','snapshot-1','snapshot-3'])).toBe(false);
  });
  it('allows the quiet observer route so the stealth sequence can finish',()=>{
    expect(canEnterRoute('observer-quiet','level-7',{},[],[])).toBe(true);
    const a=observerStep([],'observer-shadow');const b=observerStep(a.path,'observer-log');const c=observerStep(b.path,'observer-quiet');
    expect(c.complete).toBe(true);
  });
  it('recognizes the level nine Subject bookmark across fictional host formats',()=>{
    expect(canEnterRoute('loop-route','level-9',{},['memory.local/subject-01'],[])).toBe(true);
    expect(canEnterRoute('loop-route','level-9',{},[],[])).toBe(false);
  });
  it('checks both synchronized tabs and stage completion flags',()=>{
    const tabs=[
      {id:'a',title:'A',url:'mirror.local/left',stack:['mirror.local/left'],historyIndex:0,openedAt:0,arrangement:['mirror','bell','key'],submittedAt:1000},
      {id:'b',title:'B',url:'mirror.local/right',stack:['mirror.local/right'],historyIndex:0,openedAt:0,arrangement:['mirror','bell','key'],submittedAt:2000},
    ];
    expect(validSyncPair(tabs,['mirror','bell','key'],2100)).toBe(true);
    expect(validSyncPair(tabs,['key','bell','mirror'],2100)).toBe(false);
    const progress=newStageProgress();progress.flags.subjectFound=true;
    expect(stageSequenceComplete('level-2',progress)).toBe(true);
  });
});
