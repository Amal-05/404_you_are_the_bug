import { describe, expect, it } from 'vitest';
import { parseTerminalCommand, terminalHelp } from './terminal';

describe('fictional terminal',()=>{
  it('accepts documented game commands and blocks shell syntax',()=>{
    expect(parseTerminalCommand('OPEN root.local/administrator').ok).toBe(true);
    expect(parseTerminalCommand('STATUS').ok).toBe(true);
    expect(parseTerminalCommand('OPEN x; powershell').ok).toBe(false);
    expect(parseTerminalCommand('fetch https://example.com').ok).toBe(false);
  });
  it('documents the available commands',()=>expect(terminalHelp()).toContain('ACCESS <route>'));
});
