import { describe, expect, it } from 'vitest';
import { formatGameTick, nextGameTick, recordedGameTick } from './gameTime';

describe('fictional session clock',()=>{
  it('advances deterministically without reading device time',()=>{
    expect(nextGameTick(12)).toBe(13);
    expect(recordedGameTick(12)).toBe('T+0013');
    expect(formatGameTick('T+0042')).toBe('T+0042');
  });

  it('labels legacy real-time save stamps as archived instead of displaying device time',()=>{
    expect(formatGameTick('2026-11-04T08:30:00.000Z')).toBe('ARCHIVED SESSION');
  });
});
