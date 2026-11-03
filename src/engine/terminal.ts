export type TerminalResult = { ok: true; command: string; args: string[] } | { ok: false; message: string };

const ALLOWED = new Set(['HELP','STATUS','LIST','OPEN','INSPECT','RESTORE','DECRYPT','SYNC','ACCESS']);

export function parseTerminalCommand(input: string): TerminalResult {
  const source = input.trim();
  if (!source) return { ok: false, message: 'Enter a fictional command. Type HELP to list supported commands.' };
  if (/[;|&`$<>\\]|\b(eval|exec|spawn|powershell|cmd\.exe|node|fetch|import)\b/i.test(source)) {
    return { ok: false, message: 'Rejected. This terminal accepts only the fictional command language; shell syntax and scripts are disabled.' };
  }
  const [head, ...args] = source.split(/\s+/);
  const command = head.toUpperCase();
  if (!ALLOWED.has(command)) return { ok: false, message: `Unknown command: ${head}. Type HELP for the fictional command list.` };
  return { ok: true, command, args };
}

export function terminalHelp(): string {
  return ['HELP — list commands','STATUS — inspect simulated system state','LIST — list fictional routes',
    'OPEN <route> — navigate the simulated browser','INSPECT <item> — inspect a clue or cookie',
    'RESTORE <snapshot> — restore an indexed history snapshot','DECRYPT <key> — inspect encrypted simulated data',
    'SYNC — inspect open simulated tabs','ACCESS <route> --proof=<fragment> — request simulated permission'].join('\n');
}
