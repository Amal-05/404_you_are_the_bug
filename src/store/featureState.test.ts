import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';

describe('blueprint feature systems',()=>{
  beforeEach(()=>{
    localStorage.clear();
    useGameStore.getState().startNewGame();
    useGameStore.getState().beginStage();
  });

  it('records persisted typed events in deterministic game ticks',()=>{
    const game=useGameStore.getState();
    game.navigate('help.local/boot/404');
    useGameStore.getState().navigate('archive.local/boot/welcome');
    const events=useGameStore.getState().featureState.events;
    expect(events.map(event=>event.type)).toContain('URL_VISITED');
    expect(events.every((event,index)=>index===0||event.gameTime>events[index-1]!.gameTime)).toBe(true);
    expect(JSON.parse(localStorage.getItem('you-are-the-bug:campaign:v1')??'{}').state.featureState.events.length).toBeGreaterThan(0);
  });

  it('requires two inspected sources before the player can challenge a claim',()=>{
    useGameStore.setState({activeStageId:'level-4'});
    useGameStore.getState().setClaimStatus('observer-never-existed','doubt');
    expect(useGameStore.getState().featureState.claims['observer-never-existed']).toBeUndefined();
    useGameStore.getState().inspectVirtualFile('observer-backup');
    useGameStore.getState().inspectVirtualFile('deleted-snapshot');
    useGameStore.getState().setClaimStatus('observer-never-existed','doubt');
    expect(useGameStore.getState().featureState.claims['observer-never-existed']).toBe('doubt');
  });

  it('limits nested desktop depth and sends only the authored parent signal',()=>{
    useGameStore.setState({activeStageId:'level-3'});
    useGameStore.getState().openNestedDesktop();
    expect(useGameStore.getState().featureState.nestedOpen).toBe(true);
    useGameStore.getState().signalParentDesktop();
    expect(useGameStore.getState().featureState.flags.parentTokenReceived).toBe(true);
    expect(useGameStore.getState().featureState.nestedOpen).toBe(false);
  });

  it('recovers the simulated failure without changing real browser state',()=>{
    useGameStore.setState({activeStageId:'level-5'});
    useGameStore.getState().triggerSystemFailure();
    expect(useGameStore.getState().featureState.failureActive).toBe(true);
    useGameStore.getState().recoverSystemFailure();
    expect(useGameStore.getState().featureState.failureRecovered).toBe(true);
    expect(useGameStore.getState().featureState.events.map(event=>event.type)).toContain('SYSTEM_FAILURE_RECOVERED');
  });

  it('persists read state, replies, flags, and archive state for fictional email',()=>{
    const game=useGameStore.getState();
    game.readFutureEmail('future-03');
    game.replyToFutureEmail('future-03','Compare the history first.');
    game.toggleFlagFutureEmail('future-03');
    game.archiveFutureEmail('future-03');
    const saved=useGameStore.getState().featureState;
    expect(saved.readEmails).toContain('future-03');
    expect(saved.emailReplies['future-03']).toEqual(['Compare the history first.']);
    expect(saved.flaggedEmails).toContain('future-03');
    expect(saved.archivedEmails).toContain('future-03');
  });
});
