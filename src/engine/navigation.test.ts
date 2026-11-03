import { describe, expect, it } from 'vitest';
import { normalizeSimUrl, parseSimUrl } from './navigation';

describe('fictional address bar',()=>{
  it('normalizes host shortcuts and never treats a real URL as a network request',()=>{
    expect(normalizeSimUrl(' HOME /help ')).toBe('home.local/help');
    expect(parseSimUrl('https://example.com/private').route).toBe('external-blocked');
  });
  it('accepts the level zero route in either discovered fragment order',()=>{
    expect(parseSimUrl('home.local/404/welcome').route).toBe('boot-finish');
    expect(parseSimUrl('home.local/welcome/404').route).toBe('boot-finish');
  });
});
