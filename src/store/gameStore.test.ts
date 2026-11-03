import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';

describe('saved campaign progression',()=>{
  beforeEach(()=>{
    localStorage.clear();
    useGameStore.getState().startNewGame();
    useGameStore.getState().beginStage();
  });
  it('unlocks level 1 from the alternate level zero route and keeps both levels replayable',()=>{
    const game=useGameStore.getState();
    game.navigate('help.local/boot/404');
    useGameStore.getState().navigate('archive.local/boot/welcome');
    useGameStore.getState().navigate('home.local/welcome/404');
    useGameStore.getState().completeStage();
    expect(useGameStore.getState().completedStages).toContain('level-0');
    expect(useGameStore.getState().unlockedStages).toContain('level-1');
    expect(JSON.parse(localStorage.getItem('you-are-the-bug:campaign:v1')??'{}').state.unlockedStages).toContain('level-1');
    useGameStore.getState().openStage('level-1');
    expect(useGameStore.getState().activeStageId).toBe('level-1');
    useGameStore.getState().openStage('level-0');
    expect(useGameStore.getState().activeStageId).toBe('level-0');
  });
});
