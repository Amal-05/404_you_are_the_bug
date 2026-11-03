export type RouteKey =
  | 'home' | 'help' | 'archive' | 'system' | 'settings' | 'not-found' | 'external-blocked'
  | 'boot-404' | 'boot-welcome' | 'boot-finish' | 'boot-hidden' | 'lost-archive' | 'lost-system' | 'lost-hidden'
  | 'address-fragment-a' | 'address-fragment-b' | 'subject' | 'subject-memory'
  | 'deleted-index' | 'snapshot-1' | 'snapshot-2' | 'snapshot-3' | 'restored-conversation'
  | 'creator-profile' | 'identity-reconstruction' | 'identity-corrupt'
  | 'dead-index' | 'dead-404' | 'dead-403' | 'dead-410' | 'dead-archive'
  | 'sync-clue' | 'sync-left' | 'sync-right' | 'sync-hidden'
  | 'observer-brief' | 'observer-shadow' | 'observer-log' | 'observer-quiet' | 'observer-trap'
  | 'source-index' | 'source-fragments' | 'root'
  | 'loop-recall' | 'loop-route' | 'void'
  | 'final' | 'containment' | 'secret';

export type ParsedUrl = { url: string; host: string; path: string; query: string; route: RouteKey };

const ROUTES: Record<string, RouteKey> = {
  'home.local/':'home', 'home.local':'home', 'home.local/help':'help', 'help.local':'help',
  'archive.local':'archive', 'archive.local/':'archive', 'system.local':'system', 'system.local/':'system',
  'settings.local':'settings', 'settings.local/':'settings',
  'home.local/boot/404':'boot-404', 'help.local/boot/404':'boot-404',
  'home.local/boot/welcome':'boot-welcome', 'archive.local/boot/welcome':'boot-welcome',
  'home.local/404/welcome':'boot-finish', 'archive.local/404/welcome':'boot-finish',
  'home.local/welcome/404':'boot-finish', 'archive.local/welcome/404':'boot-finish',
  'home.local/boot/trace':'boot-hidden', 'system.local/boot/trace':'boot-hidden',
  'archive.local/mara':'lost-archive', 'archive.local/subject-01':'lost-archive',
  'system.local/tab-01':'lost-system', 'system.local/session':'lost-system',
  'archive.local/tear':'lost-hidden',
  'index.local/fragment-a':'address-fragment-a', 'help.local/address-a':'address-fragment-a',
  'cache.local/fragment-b':'address-fragment-b', 'archive.local/address-b':'address-fragment-b',
  'home.local/memory/subject-01':'subject', 'archive.local/memory/subject-01':'subject',
  'memory.local/subject-01':'subject', 'memory.local/subject-01/trace':'subject-memory',
  'archive.local/deleted':'deleted-index', 'history.local/snapshot-01':'snapshot-1',
  'history.local/snapshot-02':'snapshot-2', 'history.local/snapshot-03':'snapshot-3',
  'history.local/restored':'restored-conversation',
  'profile.local/creator':'creator-profile', 'identity.local/reconstruct':'identity-reconstruction',
  'identity.local/corrupt':'identity-corrupt',
  'dead.local/report':'dead-index', 'dead.local/404':'dead-404', 'dead.local/403':'dead-403', 'dead.local/410':'dead-410',
  'dead.local/archive':'dead-archive',
  'mirror.local/clue':'sync-clue', 'mirror.local/left':'sync-left', 'mirror.local/right':'sync-right',
  'mirror.local/trace':'sync-hidden',
  'observer.local/brief':'observer-brief', 'vault.local/shadow':'observer-shadow',
  'archive.local/quiet-log':'observer-log', 'observer.local/quiet':'observer-quiet',
  'observer.local/trap':'observer-trap',
  'source.local/index':'source-index', 'source.local/fragments':'source-fragments',
  'system.local/restricted':'root', 'root.local/administrator':'root',
  'loop.local/recall':'loop-recall', 'loop.local/route':'loop-route', 'home.local/void/unknown':'void',
  'final.local/confrontation':'final', 'containment.local/void/unknown':'containment',
};

export function normalizeSimUrl(raw: string): string {
  const input = raw.trim().replace(/^https?:\/\//i, '').replace(/^sim:\/\//i, '').replace(/\s/g, '');
  if (!input) return 'home.local';
  if (input.startsWith('/')) return `home.local${input}`;
  const [base, ...tail] = input.split('/');
  const host = base.includes('.') ? base.toLowerCase() : `${base.toLowerCase()}.local`;
  return [host, ...tail].join('/').replace(/\/$/, '') || host;
}

export function parseSimUrl(raw: string): ParsedUrl {
  const normalized = normalizeSimUrl(raw);
  if (/^([a-z]+):\/\//i.test(raw.trim()) && !/^(https?:|sim:)/i.test(raw.trim())) {
    return { url: normalized, host: '', path: '', query: '', route: 'external-blocked' };
  }
  if (/^(https?:\/\/)?(www\.)?(?![\w-]+\.local\b)[a-z0-9.-]+\.[a-z]{2,}(?=[:/]|$)/i.test(raw.trim())) {
    return { url: normalized, host: '', path: '', query: '', route: 'external-blocked' };
  }
  const [location, query = ''] = normalized.split('?');
  const [host, ...segments] = location.split('/');
  const path = segments.length ? `/${segments.join('/')}` : '/';
  return { url: normalized, host, path, query, route: ROUTES[location] ?? 'not-found' };
}

export function getRouteTitle(route: RouteKey): string {
  const names: Partial<Record<RouteKey, string>> = {
    home:'Start Page',help:'Help Center',archive:'Personal Archive',system:'System Status',settings:'Preferences',
    'boot-404':'Boot Fragment A','boot-welcome':'Boot Fragment B','boot-finish':'Welcome Back','boot-hidden':'Recovered Trace',
    'lost-archive':'Mara Venn // Archive','lost-system':'System Log // Tab 01','lost-hidden':'Torn Page',
    'address-fragment-a':'Address Fragment A','address-fragment-b':'Address Fragment B',subject:'Subject 01',
    'subject-memory':'A Desktop Photograph','deleted-index':'Deleted Conversation',
    'snapshot-1':'Conversation Snapshot 01','snapshot-2':'Conversation Snapshot 02','snapshot-3':'Conversation Snapshot 03',
    'restored-conversation':'Restored Conversation','creator-profile':'Creator Profile',
    'identity-reconstruction':'Identity Reconstruction','identity-corrupt':'Corrupted Identity Fragment',
    'dead-index':'Dead Link Report','dead-404':'404 // Missing','dead-403':'403 // Restricted','dead-410':'410 // Deleted','dead-archive':'Deleted Archive',
    'sync-clue':'Synchronization Note','sync-left':'Mirror Tab A','sync-right':'Mirror Tab B','sync-hidden':'Mirror Trace',
    'observer-brief':'Observer Brief','observer-shadow':'Shadow Protocol','observer-log':'Quiet Log',
    'observer-quiet':'Quiet Location','observer-trap':'Observer Watch','source-index':'Source Index',
    'source-fragments':'Command Fragments',root:'Restricted Root','loop-recall':'Loop Recall',
    'loop-route':'Loop Route','void':'The Void','final':'Final Confrontation',containment:'Containment Record',
    secret:'The User Is Still Here','not-found':'404 — Not Found','external-blocked':'External Route Blocked',
  };
  return names[route] ?? 'Unknown Page';
}

export function isHiddenRoute(route: RouteKey): boolean {
  return ['boot-hidden','lost-hidden','subject-memory','sync-hidden','observer-quiet','root','void','containment','secret'].includes(route);
}
