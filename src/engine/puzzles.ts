import type { BrowserTab, StageId, StageProgress } from '../types';

export const SYNC_ORDER = ['mirror', 'bell', 'key'];
export const LOOP_SYNC_ORDER = ['LOOP', 'RETURN', 'ORIGIN'];
export const COOKIE_IDENTITY = ['creator_name', 'creator_role', 'creator_signature'];
export const CONVERSATION_ORDER = ['snapshot-1', 'snapshot-2', 'snapshot-3'];
export const ERROR_ORDER = ['404', '403', '410'];

export function newStageProgress(): StageProgress {
  return { flags: {}, visited: [], events: [], selected: [], sequence: [] };
}

export function stageProgressFor(progress: Partial<Record<StageId, StageProgress>>, id: StageId): StageProgress {
  return progress[id] ?? newStageProgress();
}

export function canEnterStage(id: StageId, unlocked: StageId[]): boolean {
  return unlocked.includes(id);
}

export function canEnterRoute(route: string, stageId: StageId, flags: Record<string, boolean | number | string>, bookmarks: string[], cookies: { name: string; inspected: boolean }[]): boolean {
  if (route === 'boot-finish') return stageId === 'level-0' && Boolean(flags.boot404) && Boolean(flags.bootWelcome);
  if (route === 'root') return stageId === 'level-8' && Boolean(flags.commandFragments);
  if (route === 'void') return stageId === 'level-9' && Boolean(flags.loopReady);
  if (route === 'containment' || route === 'secret') return stageId === 'secret';
  if (route === 'observer-quiet') return stageId === 'level-7';
  if (route === 'dead-archive') return stageId === 'level-5' && Boolean(flags.deadSequence);
  if (route === 'subject') return stageId !== 'level-2' || Boolean(flags.addressFragments);
  if (route === 'subject-memory') return stageId === 'level-2' || stageId === 'level-9';
  if (route === 'restored-conversation') return stageId === 'level-3' && Boolean(flags.conversationRestored);
  if (route === 'identity-reconstruction') return stageId === 'level-4';
  if (route === 'sync-left' || route === 'sync-right') return stageId === 'level-6' || stageId === 'level-9';
  if (route === 'loop-route') return stageId === 'level-9' && bookmarks.some((item) => /(?:^|\/)subject-01(?:$|[?#])/i.test(item));
  if (route === 'final') return stageId === 'level-10';
  if (stageId === 'level-4' && route === 'creator-profile') return cookies.some((cookie) => cookie.inspected && cookie.name.startsWith('creator_'));
  return true;
}

export function validCookieIdentity(selection: string[]): boolean {
  const chosen = [...new Set(selection)].sort();
  return chosen.length === COOKIE_IDENTITY.length && [...COOKIE_IDENTITY].sort().every((name, index) => name === chosen[index]);
}

export function validConversationOrder(sequence: string[]): boolean {
  return sequence.length === CONVERSATION_ORDER.length && CONVERSATION_ORDER.every((item, index) => sequence[index] === item);
}

export function validSyncPair(tabs: BrowserTab[], expected: string[], now: number): boolean {
  const activeSyncTabs = tabs.filter((tab) => (tab.url.includes('/left') || tab.url.includes('/right')) && tab.submittedAt !== undefined);
  if (activeSyncTabs.length < 2) return false;
  const lastTwo = activeSyncTabs.slice(-2);
  const [first, second] = lastTwo;
  return Boolean(first && second && first.id !== second.id && now - first.submittedAt! <= 60_000 && now - second.submittedAt! <= 60_000
    && expected.every((part, index) => first.arrangement[index] === part && second.arrangement[index] === part));
}

export function observerStep(path: string[], route: string): { path: string[]; safe: boolean; complete: boolean } {
  const expected = ['observer-shadow', 'observer-log', 'observer-quiet'];
  const nextPath = [...path, route].slice(-3);
  const index = path.length;
  const safe = route === expected[index] && !path.includes(route);
  return { path: safe ? nextPath : [], safe, complete: safe && route === 'observer-quiet' };
}

export function isReverseBootAddress(url: string): boolean {
  return /\/welcome\/404(?:$|[?#])/i.test(url);
}

export function stageSequenceComplete(stageId: StageId, progress: StageProgress): boolean {
  switch (stageId) {
    case 'level-0': return Boolean(progress.flags.bootRoute);
    case 'level-1': return Boolean(progress.flags.lostTabFound);
    case 'level-2': return Boolean(progress.flags.subjectFound);
    case 'level-3': return Boolean(progress.flags.conversationRestored);
    case 'level-4': return Boolean(progress.flags.identityReconstructed);
    case 'level-5': return Boolean(progress.flags.hiddenArchiveOpened);
    case 'level-6': return Boolean(progress.flags.syncCompleted);
    case 'level-7': return Boolean(progress.flags.observerSafe);
    case 'level-8': return Boolean(progress.flags.rootAccess);
    case 'level-9': return Boolean(progress.flags.loopEscaped);
    case 'level-10': return Boolean(progress.flags.endingChosen);
    case 'secret': return Boolean(progress.flags.secretTruthSeen);
    default: return false;
  }
}
