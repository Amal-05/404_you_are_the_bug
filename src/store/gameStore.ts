import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ACHIEVEMENTS, CAMPAIGN, NEXT_STAGE, REQUIRED_HIDDEN_MEMORIES, STAGE_BY_ID } from '../engine/campaign';
import { playSound } from '../engine/audio';
import { normalizeSimUrl, parseSimUrl, getRouteTitle } from '../engine/navigation';
import { canEnterRoute, canEnterStage, CONVERSATION_ORDER, ERROR_ORDER, LOOP_SYNC_ORDER, newStageProgress, observerStep, stageProgressFor, SYNC_ORDER, validConversationOrder, validCookieIdentity, validSyncPair } from '../engine/puzzles';
import { parseTerminalCommand, terminalHelp } from '../engine/terminal';
import { nextGameTick, recordedGameTick } from '../engine/gameTime';
import type { AppId, BrowserTab, Clue, EndingChoice, FeatureState, GameNotification, GameStore, HistoryEntry, MemoryFragment, Screen, SettingsState, SimCookie, StageId } from '../types';

const SAVE_KEY = 'you-are-the-bug:campaign:v1';
const now = () => Date.now();
const id = () => globalThis.crypto?.randomUUID?.() ?? `id-${now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const clueNoticesShown=new Set<string>();
const makeTab = (url = 'home.local'): BrowserTab => ({ id:id(), title:getRouteTitle(parseSimUrl(url).route), url:normalizeSimUrl(url), stack:[normalizeSimUrl(url)], historyIndex:0, openedAt:now(), arrangement:[] });
const defaultSettings = { muted:false, volume:0.38, reducedMotion:false, crtEffects:true, textScale:1 };
const defaultWindows: Record<AppId, boolean> = { browser:true, files:false, terminal:false, settings:false, cookies:false, journal:false, achievements:false, systems:false };
const defaultFeatures = ():FeatureState => ({version:1,featureFlags:{recursiveDesktop:true,virtualFiles:true,behaviourMemory:true,dynamicWebsites:true,hiddenAchievements:true,systemLies:true,mirrorMode:true,futureEmails:true,controlledFailure:true,realityBreaker:true},flags:{},counters:{routeVisits:0,tabsOpened:0,filesInspected:0,cluesFound:0,hintsUsed:0},discoveredClues:[],inspectedFiles:[],visitsByRoute:{},events:[],claims:{},readEmails:[],repliedEmails:[],archivedEmails:[],flaggedEmails:[],emailReplies:{},nestedOpen:false,nestedMinimized:false,nestedDepth:0,nestedTabs:['browser','files','terminal'],nestedActiveTab:'browser',mirrorActive:false,mirrorSequence:[],systemsSection:'files',failureActive:false,failureRecovered:false,realityBreakSeen:false});

function appendHistory(history: HistoryEntry[], tab: BrowserTab, url: string, snapshot?: string, gameTime = history.length + 1): HistoryEntry[] {
  const entry: HistoryEntry = { id:id(), tabId:tab.id, url, title:getRouteTitle(parseSimUrl(url).route), visitedAt:gameTime, snapshot };
  return [entry, ...history].slice(0, 250);
}

function initialData() {
  const tab = makeTab();
  const progress = Object.fromEntries(CAMPAIGN.map((stage) => [stage.id, newStageProgress()])) as GameStore['stageProgress'];
  return {
    screen:'menu' as Screen, activeStageId:'level-0' as StageId, unlockedStages:['level-0'] as StageId[], completedStages:[] as StageId[],
    tabs:[tab], activeTabId:tab.id, history:[], bookmarks:[],
    cookies:[{name:'session',value:'awake',category:'session',inspected:false,stageId:'level-0'} as SimCookie,{name:'visitor',value:'first-visit',category:'system',inspected:false,stageId:'level-0'} as SimCookie],
    clues:[] as Clue[], memoryFragments:[] as MemoryFragment[], achievements:[] as string[], endingsSeen:[] as EndingChoice[], chosenEnding:undefined as EndingChoice|undefined,
    stageProgress:progress, notifications:[] as GameNotification[], terminalLog:[] as GameStore['terminalLog'],
    observerHeat:0, observerLastHost:'', observerPath:[], windowState:{...defaultWindows}, minimizedWindows:[], settings:{...defaultSettings},
    newGamePlus:0, lastSavedAt:now(), completionOverlay:false, showIntro:false, featureState:defaultFeatures(),
  };
}

type Snapshot = ReturnType<typeof initialData>;
function addUnique<T>(list:T[], value:T):T[] { return list.includes(value) ? list : [...list, value]; }
function grantAchievement(state: GameStore, achievementId: string): string[] { return addUnique(state.achievements, achievementId); }
function canUnlockSecret(memory: MemoryFragment[]) { return REQUIRED_HIDDEN_MEMORIES.every((required) => memory.some((fragment) => fragment.id === required)); }
function loopReady(flags:Record<string,boolean|number|string>){return Boolean(flags.loopBookmark&&flags.loopCookie&&flags.loopHistory&&flags.loopSynced)}
function addLine(state: GameStore, input: string, output: string, kind:'command'|'system'='command') {
  return [...state.terminalLog,{id:id(),input,output,at:nextGameTick(state.featureState?.events.at(-1)?.gameTime??0),kind}].slice(-100);
}

export const useGameStore = create<GameStore>()(persist((set,get) => ({
  ...initialData(),
  addNotification:(title,message,tone='info')=>set((state)=>({notifications:[{id:id(),title,message,createdAt:recordedGameTick(state.featureState?.events.at(-1)?.gameTime??0),read:false,tone},...state.notifications].slice(0,12)})),
  dismissNotification:(notificationId)=>set((state)=>({notifications:state.notifications.filter((item)=>item.id!==notificationId)})),
  clearNotifications:()=>set({notifications:[]}),
  recordGameEvent:(type,payload={})=>{const before=get();const current=before.featureState??defaultFeatures();const counters={...current.counters};const visitsByRoute={...current.visitsByRoute};if(current.featureFlags.behaviourMemory){if(type==='URL_VISITED'){counters.routeVisits=(counters.routeVisits??0)+1;const route=String(payload.route??'unknown');visitsByRoute[route]=(visitsByRoute[route]??0)+1}if(type==='TAB_OPENED')counters.tabsOpened=(counters.tabsOpened??0)+1;if(type==='FILE_INSPECTED')counters.filesInspected=(counters.filesInspected??0)+1;if(type==='CLUE_DISCOVERED')counters.cluesFound=(counters.cluesFound??0)+1;if(type==='HINT_REQUESTED')counters.hintsUsed=(counters.hintsUsed??0)+1}const event={id:id(),type,levelId:before.activeStageId,gameTime:nextGameTick(current.events.at(-1)?.gameTime??0),payload};let achievements=before.achievements;if(current.featureFlags.hiddenAchievements){if(counters.tabsOpened>=5&&!achievements.includes('tab-hopper'))achievements=[...achievements,'tab-hopper'];if(counters.filesInspected>=10&&!achievements.includes('digital-archaeologist'))achievements=[...achievements,'digital-archaeologist'];if(before.newGamePlus>0&&!achievements.includes('repeat-session'))achievements=[...achievements,'repeat-session'];if(type==='FILE_INSPECTED'&&payload.fileId==='parent-map'&&!achievements.includes('rooted'))achievements=[...achievements,'rooted'];}set({featureState:{...current,counters,visitsByRoute,events:[...current.events,event].slice(-500)},achievements,lastSavedAt:now()});const gained=achievements.filter(item=>!before.achievements.includes(item));if(gained.length)get().addNotification('HIDDEN ACHIEVEMENT',gained.map(item=>ACHIEVEMENTS.find(achievement=>achievement.id===item)?.title??item).join(', '),'story')},
  inspectVirtualFile:(fileId)=>{if(!(get().featureState??defaultFeatures()).featureFlags.virtualFiles)return;set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,inspectedFiles:addUnique(f.inspectedFiles??[],fileId)}}});get().recordGameEvent('FILE_INSPECTED',{fileId});if(fileId==='observer-backup')get().discoverClue({id:'observer-backup',title:'Observer Backup',description:'A virtual deletion log and checksum contradict the Observer’s claim that this file never existed.',location:'/root/observer_backup.old',relatedPuzzle:'The System Lies'});if(fileId==='deleted-snapshot')get().discoverClue({id:'deleted-snapshot',title:'Deleted Index Snapshot',description:'History snapshot H-03 links to observer_backup.old and records its deletion.',location:'history://deleted-index',relatedPuzzle:'The System Lies'})},
  setClaimStatus:(claimId,status)=>{const f=get().featureState??defaultFeatures();if(!f.featureFlags.systemLies||!['level-4','level-5','level-7','level-9'].includes(get().activeStageId)){get().addNotification('INVESTIGATION LOCKED','The Observer’s claim becomes part of the investigation in Level 4.','info');return}if(claimId==='observer-never-existed'&&status==='doubt'&&(!f.inspectedFiles.includes('observer-backup')||!f.inspectedFiles.includes('deleted-snapshot'))){get().addNotification('EVIDENCE INCOMPLETE','Inspect the backup file and its independent history snapshot before challenging the claim.','warning');return}set((state)=>{const current=state.featureState??defaultFeatures();return {featureState:{...current,claims:{...current.claims,[claimId]:status}}}});get().recordGameEvent('CLAIM_REVIEWED',{claimId,status})},
  openNestedDesktop:()=>{const f=get().featureState??defaultFeatures();if(!f.featureFlags.recursiveDesktop||f.nestedDepth>=2||!['level-3','level-6','level-9'].includes(get().activeStageId)){get().addNotification('NESTING UNAVAILABLE','The recursive desktop unlocks in Level 3 and has a safe depth limit.','warning');return}set({featureState:{...f,nestedOpen:true,nestedDepth:f.nestedDepth+1,nestedTabs:f.nestedTabs.length?f.nestedTabs:['browser','files','terminal'],nestedActiveTab:f.nestedActiveTab||'browser'}});get().recordGameEvent('NESTED_DESKTOP_OPENED',{depth:f.nestedDepth+1})},
  selectNestedTab:(tab)=>set((state)=>{const f=state.featureState??defaultFeatures();return f.nestedOpen&&f.nestedTabs.includes(tab)?{featureState:{...f,nestedActiveTab:tab}}:{}}),
  minimizeNestedDesktop:()=>set((state)=>{const f=state.featureState??defaultFeatures();return f.nestedOpen?{featureState:{...f,nestedMinimized:true}}:{}}),
  restoreNestedDesktop:()=>set((state)=>{const f=state.featureState??defaultFeatures();return f.nestedOpen?{featureState:{...f,nestedMinimized:false}}:{}}),
  closeNestedDesktop:()=>set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,nestedOpen:false,nestedMinimized:false}}}),
  signalParentDesktop:()=>{const f=get().featureState??defaultFeatures();if(!f.nestedOpen){get().addNotification('NO CHILD INSTANCE','Open the nested desktop first.','warning');return}set({featureState:{...f,nestedOpen:false,flags:{...f.flags,parentTokenReceived:true}}});get().recordGameEvent('PARENT_SIGNAL_SENT',{signalType:'PARENT_TOKEN'});get().addNotification('PARENT TOKEN RECEIVED','The child instance unlocked the parent’s archived record.','story')},
  toggleMirrorMode:()=>{const f=get().featureState??defaultFeatures();if(!f.featureFlags.mirrorMode||!['level-6','level-9'].includes(get().activeStageId)){get().addNotification('MIRROR MODE LOCKED','The paired world opens in Level 6.','info');return}set({featureState:{...f,mirrorActive:!f.mirrorActive,mirrorSequence:[]}})},
  appendMirrorSymbol:(symbol)=>set((state)=>{const f=state.featureState??defaultFeatures();return f.featureFlags.mirrorMode&&f.mirrorActive&&f.mirrorSequence.length<4?{featureState:{...f,mirrorSequence:[...f.mirrorSequence,symbol]}}:{}}),
  clearMirrorSequence:()=>set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,mirrorSequence:[]}}}),
  submitMirrorSequence:()=>{const f=get().featureState??defaultFeatures();const expected=['◆','▲','●','◀'];if(!f.featureFlags.mirrorMode||!f.mirrorActive){get().addNotification('MIRROR WORLD INACTIVE','Switch to the mirrored world before entering its sequence.','warning');return}if(f.mirrorSequence.length!==expected.length||!expected.every((symbol,index)=>symbol===f.mirrorSequence[index])){set({featureState:{...f,mirrorSequence:[]}});get().addNotification('MIRROR SEQUENCE REJECTED','The mapping reverses all four source symbols. The sequence reset; no progress was lost.','warning');return}set({featureState:{...f,mirrorSequence:[],flags:{...f.flags,mirrorSequenceSolved:true}}});get().recordGameEvent('MIRROR_PUZZLE_SOLVED',{puzzleId:'M-01'});get().discoverClue({id:'mirror-sequence',title:'Mirrored Sequence',description:'The mirrored order reversed the four symbols and unlocked the parent route.',location:'Mirror Mode',relatedPuzzle:'Two of You'});get().addNotification('MIRROR ROUTE OPEN','The mapped sequence was accepted.','story')},
  readFutureEmail:(emailId)=>{if(!(get().featureState??defaultFeatures()).featureFlags.futureEmails)return;set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,readEmails:f.readEmails.includes(emailId)?f.readEmails:[...f.readEmails,emailId]}}});get().recordGameEvent('MESSAGE_READ',{emailId})},
  replyToFutureEmail:(emailId,reply)=>{if(!(get().featureState??defaultFeatures()).featureFlags.futureEmails)return;set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,repliedEmails:f.repliedEmails.includes(emailId)?f.repliedEmails:[...f.repliedEmails,emailId],emailReplies:{...f.emailReplies,[emailId]:[...(f.emailReplies[emailId]??[]),reply]},flags:{...f.flags,[`reply-${emailId}`]:true}}}});get().recordGameEvent('MESSAGE_REPLIED',{emailId,reply});get().addNotification('REPLY SAVED','Your reply is stored in the fictional inbox.','story')},
  archiveFutureEmail:(emailId)=>set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,archivedEmails:addUnique(f.archivedEmails,emailId)}}}),
  toggleFlagFutureEmail:(emailId)=>set((state)=>{const f=state.featureState??defaultFeatures();const flaggedEmails=f.flaggedEmails.includes(emailId)?f.flaggedEmails.filter(item=>item!==emailId):[...f.flaggedEmails,emailId];return {featureState:{...f,flaggedEmails}}}),
  triggerSystemFailure:()=>{const f=get().featureState??defaultFeatures();if(!f.featureFlags.controlledFailure||f.failureRecovered||!['level-5','level-8','level-9'].includes(get().activeStageId)){get().addNotification('SCENARIO LOCKED','This authored recovery scenario becomes available in Level 5.','info');return}set({featureState:{...f,failureActive:true}});get().recordGameEvent('SYSTEM_FAILURE_STARTED',{scenario:'history-index'});get().addNotification('SIMULATED FAILURE','The fictional history index is unavailable. Pause, settings, and recovery remain accessible.','warning')},
  recoverSystemFailure:()=>{const f=get().featureState??defaultFeatures();if(!f.failureActive)return;set({featureState:{...f,failureActive:false,failureRecovered:true,flags:{...f.flags,historyIndexRestored:true}}});get().recordGameEvent('SYSTEM_FAILURE_RECOVERED',{scenario:'history-index'});get().addNotification('RECOVERY COMPLETE','The simulated history index has been restored from its authored backup.','story')},
  triggerRealityBreaker:()=>{const f=get().featureState??defaultFeatures();if(!f.featureFlags.realityBreaker||f.realityBreakSeen)return;set({featureState:{...f,realityBreakSeen:true,flags:{...f.flags,openingDesktopWasNested:true}}});get().recordGameEvent('REALITY_BREAK_STARTED',{checkpoint:'level-8-complete'});get().addNotification('SYSTEM UPDATE // FICTIONAL','The opening desktop was one layer inside containment. Your progress is intact; the next level reveals the route.','story')},
  toggleFeatureFlag:(key)=>set((state)=>{const f=state.featureState??defaultFeatures();return {featureState:{...f,featureFlags:{...f.featureFlags,[key]:!f.featureFlags[key]}}}}),
  setSystemsSection:(section)=>set((state)=>({featureState:{...(state.featureState??defaultFeatures()),systemsSection:section}})),
  openWindow:(windowId)=>set((state)=>({windowState:{...state.windowState,[windowId]:true},minimizedWindows:state.minimizedWindows.filter((item)=>item!==windowId),screen:'desktop'})),
  closeWindow:(windowId)=>set((state)=>({windowState:{...state.windowState,[windowId]:false}})),
  minimizeWindow:(windowId)=>set((state)=>({minimizedWindows:addUnique(state.minimizedWindows,windowId),windowState:{...state.windowState,[windowId]:false}})),
  toggleFullscreen:async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{get().addNotification('FULLSCREEN UNAVAILABLE','Your browser did not allow fullscreen mode.','warning')}},
  startNewGame:()=>{
    const old=get(); const base=initialData();
    const newGamePlus=old.completedStages.includes('level-10')?old.newGamePlus+1:old.newGamePlus;
    const unlockedStages=addUnique(old.unlockedStages,'level-0');
    set({...base,screen:'desktop',activeStageId:'level-0',unlockedStages,completedStages:old.completedStages,achievements:old.achievements,endingsSeen:old.endingsSeen,memoryFragments:old.memoryFragments,clues:[],newGamePlus,lastSavedAt:now(),showIntro:true});
    get().recordGameEvent('TAB_OPENED',{url:'home.local',sessionStart:true});
    playSound('startup',old.settings);
  },
  continueGame:()=>set((state)=>({screen:'desktop',windowState:{...state.windowState,browser:true},showIntro:false})),
  restartRun:()=>{
    const old=get(); const base=initialData();
    set({...base,screen:'desktop',unlockedStages:old.unlockedStages,completedStages:old.completedStages,achievements:old.achievements,endingsSeen:old.endingsSeen,memoryFragments:old.memoryFragments,newGamePlus:old.newGamePlus,settings:old.settings,showIntro:true});
    get().recordGameEvent('TAB_OPENED',{url:'home.local',sessionRestart:true});
    playSound('startup',old.settings);
  },
  openStage:(stageId)=>{
    const state=get();
    if(!canEnterStage(stageId,state.unlockedStages)){state.addNotification('LEVEL LOCKED','Complete the previous stage to unlock this one.','warning');return}
    const startUrl=stageId==='secret'?'containment.local/void/unknown':'home.local';
    const tab=makeTab(startUrl);
    const stageCookies:SimCookie[]=stageId==='level-4'?[{name:'creator_name',value:'ELI',category:'identity',inspected:false,stageId},{name:'creator_role',value:'maintainer',category:'identity',inspected:false,stageId},{name:'creator_signature',value:'ORIGINAL',category:'memory',inspected:false,stageId},{name:'creator_name_corrupt',value:'MARA // checksum mismatch',category:'identity',inspected:false,stageId}]:stageId==='level-9'?[{name:'LOOP_KEY',value:'remember',category:'memory',inspected:false,stageId}]:[];
    const cookies=stageCookies.length?[...state.cookies.filter((cookie)=>!stageCookies.some((item)=>item.name===cookie.name)),...stageCookies]:state.cookies;
    set({screen:'desktop',activeStageId:stageId,tabs:[tab],activeTabId:tab.id,history:[],completionOverlay:false,showIntro:true,observerHeat:0,observerLastHost:'',observerPath:[],windowState:{...defaultWindows,browser:true},minimizedWindows:[],cookies});
    get().recordGameEvent('TAB_OPENED',{url:startUrl,stageTransition:true});
    get().navigate(startUrl,tab.id);
  },
  beginStage:()=>set((state)=>({screen:'desktop',showIntro:false,windowState:{...state.windowState,browser:true}})),
  advanceStage:()=>{
    const state=get(); const next=NEXT_STAGE[state.activeStageId];
    if(next&&state.unlockedStages.includes(next)){state.openStage(next);return}
    set({screen:'menu',completionOverlay:false,showIntro:false});
  },
  completeStage:()=>{
    const state=get(); const stageId=state.activeStageId; const progress=stageProgressFor(state.stageProgress,stageId);
    if(stageId==='level-10' || stageId==='secret') return;
    const requirements: Partial<Record<StageId,string>> = {'level-0':'bootRoute','level-1':'lostTabFound','level-2':'subjectFound','level-3':'conversationRestored','level-4':'identityReconstructed','level-5':'hiddenArchiveOpened','level-6':'syncCompleted','level-7':'observerSafe','level-8':'rootAccess','level-9':'loopEscaped'};
    const required=requirements[stageId];
    if(!required || !progress.flags[required]){state.addNotification('OBJECTIVE INCOMPLETE','Use the active page and the clue journal to finish this stage.','warning');return}
    const next=NEXT_STAGE[stageId];
    const completed=addUnique(state.completedStages,stageId);
    const unlocked=next?addUnique(state.unlockedStages,next):state.unlockedStages;
    const stage=STAGE_BY_ID[stageId];
    const memories=state.memoryFragments.some((fragment)=>fragment.id===`main-${stageId}`)?state.memoryFragments:[...state.memoryFragments,{id:`main-${stageId}`,text:stage.mainMemory,stageId,discoveredAt:recordedGameTick(state.featureState?.events.at(-1)?.gameTime??0)}];
    const secretUnlocked=canUnlockSecret(memories);
    const unlocks=secretUnlocked?addUnique(unlocked,'secret'):unlocked;
    const achievementId=stageId==='level-0'?'first-route':stageId==='level-1'?'tab-reader':stageId==='level-3'?'history-restored':stageId==='level-4'?'cookie-architect':stageId==='level-7'?'quiet-step':stageId==='level-8'?'root-access':'';
    const achievements=achievementId?grantAchievement(state,achievementId):state.achievements;
    set({completedStages:completed,unlockedStages:unlocks,memoryFragments:memories,achievements,completionOverlay:true,lastSavedAt:now()});get().recordGameEvent('PUZZLE_SOLVED',{stageId});
    if(stageId==='level-8')get().triggerRealityBreaker();
    playSound('complete',state.settings);
    get().addNotification('SECTOR COMPLETE',stage.endingLine,'story');
    if(secretUnlocked&&!state.unlockedStages.includes('secret'))get().addNotification('SECRET LEVEL UNLOCKED','Every hidden memory fragment has been recovered.','story');
  },
  navigate:(rawUrl,requestedTabId)=>{
    const state=get();const tabId=requestedTabId??state.activeTabId;const tab=state.tabs.find((item)=>item.id===tabId);if(!tab)return;
    const parsed=parseSimUrl(rawUrl);const progress=stageProgressFor(state.stageProgress,state.activeStageId);
    if(!canEnterRoute(parsed.route,state.activeStageId,progress.flags,state.bookmarks,state.cookies)){
      state.addNotification('ROUTE RESTRICTED','The page needs evidence you have not recovered yet.','warning');playSound('error',state.settings);return;
    }
    const nextUrl=parsed.url;const route=parsed.route;get().recordGameEvent('URL_VISITED',{route,url:nextUrl});
    const stack=tab.stack.slice(0,tab.historyIndex+1);stack.push(nextUrl);
    const updatedTab={...tab,url:nextUrl,title:getRouteTitle(route),stack,historyIndex:stack.length-1,submittedAt:undefined};
    let stageProgress=state.stageProgress;let current=stageProgressFor(stageProgress,state.activeStageId);
    current={...current,visited:addUnique(current.visited,route)};
    const flags={...current.flags};
    if(state.activeStageId==='level-0'&&route==='boot-404')flags.boot404=true;
    if(state.activeStageId==='level-0'&&route==='boot-welcome')flags.bootWelcome=true;
    if(state.activeStageId==='level-0'&&route==='boot-hidden')flags.hiddenMemoryAvailable=true;
    if(state.activeStageId==='level-0'&&route==='not-found'&&/welcome\/404/i.test(nextUrl))flags.reverseRoute=true;
    if(state.activeStageId==='level-0'&&route==='secret')flags.secretRoute=true;
    if(state.activeStageId==='level-0'&&route==='boot-finish')flags.bootRoute=true;
    if(state.activeStageId==='level-2'&&route==='address-fragment-a')flags.partA=true;
    if(state.activeStageId==='level-2'&&route==='address-fragment-b')flags.partB=true;
    if(state.activeStageId==='level-2'&&flags.partA&&flags.partB)flags.addressFragments=true;
    if(state.activeStageId==='level-2'&&route==='subject')flags.subjectFound=true;
    if(state.activeStageId==='level-3'&&route.startsWith('snapshot-'))flags[`seen-${route}`]=true;
    if(state.activeStageId==='level-4'&&route==='creator-profile')flags.creatorVisited=true;
    if(state.activeStageId==='level-5'&&['dead-404','dead-403','dead-410'].includes(route)){
      const code=route.slice(-3); const seq=current.sequence;
      const expected=ERROR_ORDER[seq.length];
      if(code===expected){current={...current,sequence:[...seq,code]};if(current.sequence.length===3)flags.deadSequence=true;}
      else {current={...current,sequence:code==='404'?['404']:[]};get().addNotification('BROKEN CHAIN','The route order reset. Start with the missing page (404).','warning')}
    }
    if(state.activeStageId==='level-7'){
      const observed=observerStep(state.observerPath,route);
      if(['observer-shadow','observer-log','observer-quiet'].includes(route)){
        if(observed.safe){set({observerPath:observed.path,observerHeat:Math.max(0,state.observerHeat-1)});if(observed.complete){flags.observerSafe=true;get().addNotification('NO SIGNAL','You reached the quiet location without triggering the Observer.','story')}}
        else {set({observerHeat:Math.min(3,state.observerHeat+1),observerPath:[]});get().addNotification('THE OBSERVER','It noticed that pattern. The safe route has reset; no progress is lost.','warning')}
      }
      const host=parsed.host;
      if(host&&host===state.observerLastHost){set({observerHeat:Math.min(3,state.observerHeat+1)});if(state.observerHeat>=2)get().addNotification('PATTERN DETECTED','Repeated routes attract attention. Change hosts to lower the signal.','warning')}
      set({observerLastHost:host});
    }
    if(state.activeStageId==='level-9'){
      if(route==='subject')flags.loopSubject=true;
      if(route==='loop-recall')flags.loopRecall=true;
      if(route==='loop-route')flags.loopRoute=true;
      if(route==='void')flags.loopRouteReached=true;
      flags.loopReady=loopReady(flags);
      if(route==='void'&&flags.loopReady)flags.loopEscaped=true;
    }
    if(state.activeStageId==='level-8'&&route==='source-fragments')flags.commandFragments=true;
    current={...current,flags};stageProgress={...stageProgress,[state.activeStageId]:current};
    const updatedTabs=state.tabs.map((item)=>item.id===tabId?updatedTab:item);
    const history=appendHistory(state.history,updatedTab,nextUrl,route.startsWith('snapshot-')?route:undefined,get().featureState.events.at(-1)?.gameTime??1);
    const notifications=state.notifications;
    set({tabs:updatedTabs,history,stageProgress,activeTabId:tabId,lastSavedAt:now(),notifications});
    playSound(route==='not-found'||route.startsWith('dead-')?'error':'load',state.settings);
    if(state.activeStageId==='level-0'&&route==='boot-404')get().discoverClue({id:'boot-a',title:'Address fragment: 404',description:'The missing route begins with the error code.',location:nextUrl,relatedPuzzle:'System Boot'});
    if(state.activeStageId==='level-0'&&route==='boot-welcome')get().discoverClue({id:'boot-b',title:'Address fragment: welcome',description:'The word after the error code completes the route.',location:nextUrl,relatedPuzzle:'System Boot'});
    if(state.activeStageId==='level-1'&&route==='lost-archive')get().discoverClue({id:'lost-message',title:'Mara’s last message',description:'Mara vanished at 22:14:08. The Archive tab was opened later.',location:nextUrl,relatedPuzzle:'The Lost Tab'});
    if(state.activeStageId==='level-1'&&route==='lost-system')get().discoverClue({id:'lost-tab',title:'Tab 01',description:'The System Log says Tab 01 existed before Mara vanished.',location:nextUrl,relatedPuzzle:'The Lost Tab'});
    if(state.activeStageId==='level-2'&&route==='subject')get().discoverClue({id:'subject',title:'Subject 01',description:'The recovered page includes an image of this desktop and a future timestamp.',location:nextUrl,relatedPuzzle:'Address Unknown'});
    if(state.activeStageId==='level-3'&&route.startsWith('snapshot-'))get().discoverClue({id:route,title:`Conversation ${route.slice(-1)}`,description:`Snapshot recorded at ${['22:10','22:12','22:14'][Number(route.slice(-1))-1]}.`,location:nextUrl,relatedPuzzle:'The Page That Remembers'});
    if(state.activeStageId==='level-7'&&route==='observer-trap')get().addNotification('THE OBSERVER','I know what you are going to click next.','warning');
  },
  back:()=>{
    const state=get();const tab=state.tabs.find((item)=>item.id===state.activeTabId);if(!tab||tab.historyIndex<=0){state.addNotification('HISTORY EMPTY','There is no earlier page in this tab.','info');return}
    const index=tab.historyIndex-1;const url=tab.stack[index]!;const progress=stageProgressFor(state.stageProgress,state.activeStageId);const flags={...progress.flags};
    if(state.activeStageId==='level-3')flags.historyUsed=true;
    if(state.activeStageId==='level-9'){flags.loopHistory=true;flags.loopReady=loopReady(flags)}
    get().recordGameEvent('URL_VISITED',{route:parseSimUrl(url).route,url,action:'back'});set({tabs:state.tabs.map((item)=>item.id===tab.id?{...item,url,title:getRouteTitle(parseSimUrl(url).route),historyIndex:index,submittedAt:undefined}:item),stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,flags}},history:appendHistory(state.history,{...tab,url},url,undefined,get().featureState.events.at(-1)?.gameTime??1),lastSavedAt:now()});
  },
  forward:()=>{
    const state=get();const tab=state.tabs.find((item)=>item.id===state.activeTabId);if(!tab||tab.historyIndex>=tab.stack.length-1){state.addNotification('HISTORY EMPTY','There is no later page in this tab.','info');return}
    const index=tab.historyIndex+1;const url=tab.stack[index]!;get().recordGameEvent('URL_VISITED',{route:parseSimUrl(url).route,url,action:'forward'});set({tabs:state.tabs.map((item)=>item.id===tab.id?{...item,url,title:getRouteTitle(parseSimUrl(url).route),historyIndex:index,submittedAt:undefined}:item),history:appendHistory(state.history,{...tab,url},url,undefined,get().featureState.events.at(-1)?.gameTime??1),lastSavedAt:now()});
  },
  refresh:()=>{const state=get();const tab=state.tabs.find((item)=>item.id===state.activeTabId);if(tab){playSound('load',state.settings);state.addNotification('PAGE RELOADED',tab.url,'info')}},
  openTab:(url='home.local')=>{
    const state=get();const tab=makeTab(url);set({tabs:[...state.tabs,tab],activeTabId:tab.id,windowState:{...state.windowState,browser:true},screen:'desktop'});get().recordGameEvent('TAB_OPENED',{url});playSound('tab-open',state.settings);get().navigate(url,tab.id);
  },
  duplicateTab:(tabId)=>{const state=get();const source=state.tabs.find((tab)=>tab.id===tabId);if(!source)return;const copy={...source,id:id(),openedAt:now(),stack:[source.url],historyIndex:0,arrangement:[],submittedAt:undefined};set({tabs:[...state.tabs,copy],activeTabId:copy.id});get().recordGameEvent('TAB_OPENED',{url:source.url,duplicate:true});get().navigate(copy.url,copy.id);playSound('tab-open',state.settings)},
  closeTab:(tabId)=>{const state=get();if(state.tabs.length<=1){state.addNotification('LAST TAB','The browser keeps one tab open.','info');return}const tabs=state.tabs.filter((tab)=>tab.id!==tabId);const activeTabId=state.activeTabId===tabId?(tabs[Math.max(0,state.tabs.findIndex((tab)=>tab.id===tabId)-1)]?.id??tabs[0]!.id):state.activeTabId;set({tabs,activeTabId});playSound('tab-close',state.settings)},
  switchTab:(tabId)=>{if(!get().tabs.some((tab)=>tab.id===tabId))return;set({activeTabId:tabId});playSound('click',get().settings)},
  toggleBookmark:(url)=>{
    const state=get();const target=url??state.tabs.find((tab)=>tab.id===state.activeTabId)?.url;if(!target)return;
    const bookmarks=state.bookmarks.includes(target)?state.bookmarks.filter((item)=>item!==target):[...state.bookmarks,target];
    const progress=stageProgressFor(state.stageProgress,state.activeStageId);const flags={...progress.flags};
    if(state.activeStageId==='level-9'&&parseSimUrl(target).route==='subject'){flags.loopBookmark=true;flags.loopReady=loopReady(flags)}
    set({bookmarks,stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,flags}}});state.addNotification(bookmarks.includes(target)?'BOOKMARK SAVED':'BOOKMARK REMOVED',target,'info');
  },
  openBookmark:(url)=>get().navigate(url),
  inspectCookie:(name)=>{
    const state=get();const cookie=state.cookies.find((item)=>item.name===name);if(!cookie)return;
    const cookies=state.cookies.map((item)=>item.name===name?{...item,inspected:true}:item);const progress=stageProgressFor(state.stageProgress,state.activeStageId);const flags={...progress.flags};
    if(state.activeStageId==='level-4'&&COOKIE_NAMES.includes(name))flags[`inspected-${name}`]=true;
    if(state.activeStageId==='level-9'&&name==='LOOP_KEY'){flags.loopCookie=true;flags.loopReady=loopReady(flags)}
    set({cookies,stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,flags}}});
    get().discoverClue({id:`cookie-${name}`,title:`Cookie: ${name}`,description:`${name} = ${cookie.value}`,location:'Browser cookies',relatedPuzzle:STAGE_BY_ID[state.activeStageId].title});
  },
  toggleSelection:(item)=>set((state)=>{const progress=stageProgressFor(state.stageProgress,state.activeStageId);const selected=progress.selected.includes(item)?progress.selected.filter((entry)=>entry!==item):[...progress.selected,item];return {stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,selected}}}}),
  setProgressFlag:(key,value=true)=>set((state)=>{const progress=stageProgressFor(state.stageProgress,state.activeStageId);return {stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,flags:{...progress.flags,[key]:value}}}}}),
  appendSequence:(value)=>set((state)=>{const progress=stageProgressFor(state.stageProgress,state.activeStageId);return {stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,sequence:[...progress.sequence,value]}}}}),
  resetSequence:()=>set((state)=>{const progress=stageProgressFor(state.stageProgress,state.activeStageId);return {stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,sequence:[]}}}}),
  setTabArrangement:(tabId,arrangement)=>set((state)=>({tabs:state.tabs.map((tab)=>tab.id===tabId?{...tab,arrangement:arrangement.slice(0,3)}:tab)})),
  submitTabArrangement:(tabId)=>{
    const state=get();const tab=state.tabs.find((item)=>item.id===tabId);if(!tab)return;
    const expected=state.activeStageId==='level-9'?LOOP_SYNC_ORDER:SYNC_ORDER;const current=now();
    const isOrder=expected.every((item,index)=>tab.arrangement[index]===item);
    if(!isOrder){set({tabs:state.tabs.map((item)=>item.id===tabId?{...item,submittedAt:undefined}:item)});state.addNotification('SYNC REJECTED','That sequence does not match the recovered note. Reorder the objects and try again.','warning');playSound('error',state.settings);return}
    const started=state.tabs.some((item)=>item.submittedAt!==undefined);
    const updated=state.tabs.map((item)=>item.id===tabId?{...item,submittedAt:current}:item);
    const progress=stageProgressFor(state.stageProgress,state.activeStageId);const deadline=progress.timerDeadline??current+60_000;
    if(current>deadline){set({tabs:updated.map((item)=>({...item,submittedAt:undefined})),stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,timerDeadline:undefined}}});state.addNotification('SYNC WINDOW CLOSED','The timer expired. No progress was lost; submit either tab to start a new 60-second window.','warning');return}
    const valid=validSyncPair(updated,expected,current);
    const flags={...progress.flags};if(valid){flags.syncCompleted=true;if(state.activeStageId==='level-9'){flags.loopSynced=true;flags.loopReady=loopReady(flags);}}
    set({tabs:updated,stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,startedAt:started?progress.startedAt:current,timerDeadline:deadline,flags}}});
    if(valid){state.addNotification('TABS SYNCHRONIZED','Both tabs contain the same ordered memory.','story');playSound('complete',state.settings)}
    else state.addNotification('FIRST TAB LOCKED','Switch to the paired tab and submit the same order within 60 seconds.','info');
  },
  recordSnapshot:(snapshotId)=>{
    const state=get();const progress=stageProgressFor(state.stageProgress,state.activeStageId);const sequence=[...progress.sequence,snapshotId];
    const ordered=validConversationOrder(sequence);const wrong=sequence.length>CONVERSATION_ORDER.length||sequence.some((item,index)=>item!==CONVERSATION_ORDER[index]);
    if(wrong){set({stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,sequence:[],flags:{...progress.flags,conversationRestored:false}}}});state.addNotification('SNAPSHOT ORDER RESET','The conversation reads from oldest to newest. You can revisit all three snapshots.','warning');return}
    set({stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,sequence,flags:{...progress.flags,...(ordered?{conversationRestored:true}:{})}}}});
    state.addNotification(ordered?'CONVERSATION RESTORED':'SNAPSHOT ADDED',ordered?'The messages form a complete conversation.':`${sequence.length} of 3 snapshots placed in order.`,ordered?'story':'info');
  },
  discoverClue:(clue)=>{
    const state=get();
    if(state.clues.some((item)=>item.id===clue.id)){
      if(!clueNoticesShown.has(clue.id)){clueNoticesShown.add(clue.id);get().addNotification('CLUE ALREADY RECOVERED',`${clue.title} is saved in your journal.`,'info')}
      return;
    }
    clueNoticesShown.add(clue.id);
    set({clues:[...state.clues,{...clue,discoveredAt:recordedGameTick(state.featureState?.events.at(-1)?.gameTime??0)}],lastSavedAt:now(),featureState:{...(state.featureState??defaultFeatures()),discoveredClues:addUnique((state.featureState??defaultFeatures()).discoveredClues,clue.id)}});get().recordGameEvent('CLUE_DISCOVERED',{clueId:clue.id});
    get().addNotification('CLUE RECOVERED',clue.title,'story');playSound('notification',get().settings);
  },
  discoverMemory:(fragment)=>{
    const state=get();if(state.memoryFragments.some((item)=>item.id===fragment.id))return;
    const memoryFragments=[...state.memoryFragments,{...fragment,discoveredAt:recordedGameTick(state.featureState?.events.at(-1)?.gameTime??0)}];const secret=canUnlockSecret(memoryFragments);const unlockedStages=secret?addUnique(state.unlockedStages,'secret'):state.unlockedStages;
    const achievements=secret?grantAchievement(state,'all-memories'):state.achievements;
    set({memoryFragments,unlockedStages,achievements,lastSavedAt:now()});get().recordGameEvent('MEMORY_FRAGMENT_FOUND',{fragmentId:fragment.id});state.addNotification('MEMORY FRAGMENT RECOVERED',fragment.text,'story');if(secret&&!state.unlockedStages.includes('secret'))state.addNotification('SECRET LEVEL UNLOCKED','All hidden memories have been recovered.','story');playSound('whisper',state.settings);
  },
  addCookie:(cookie)=>set((state)=>({cookies:state.cookies.some((item)=>item.name===cookie.name)?state.cookies:[...state.cookies,cookie]})),
  chooseMissingTab:()=>{
    const state=get();const active=state.tabs.find((tab)=>tab.id===state.activeTabId);const hasArchive=state.tabs.some((tab)=>parseSimUrl(tab.url).route==='lost-archive');const hasSystem=state.tabs.some((tab)=>parseSimUrl(tab.url).route==='lost-system');
    if(!hasArchive||!hasSystem){state.addNotification('MORE EVIDENCE NEEDED','Open the Archive and System Log in separate tabs first.','warning');return}
    if(parseSimUrl(active?.url??'').route!=='lost-system'){state.addNotification('TIMESTAMP MISMATCH','This tab was created after Mara vanished. Switch to System Log and choose that tab.','warning');return}
    const progress=stageProgressFor(state.stageProgress,'level-1');set({stageProgress:{...state.stageProgress,'level-1':{...progress,flags:{...progress.flags,lostTabFound:true}}}});get().completeStage();
  },
  restoreConversation:()=>{
    const state=get();const progress=stageProgressFor(state.stageProgress,'level-3');
    if(!validConversationOrder(progress.sequence)){state.addNotification('CONVERSATION INCOMPLETE','Restore snapshots 01, 02, and 03 in chronological order.','warning');return}
    set({stageProgress:{...state.stageProgress,'level-3':{...progress,flags:{...progress.flags,conversationRestored:true}}}});get().completeStage();
  },
  reconstructIdentity:()=>{
    const state=get();const progress=stageProgressFor(state.stageProgress,'level-4');const selected=progress.selected;
    if(!COOKIE_NAMES.every((name)=>progress.flags[`inspected-${name}`])){state.addNotification('INSPECT THE COOKIES','Open all four identity cookies before choosing fragments.','warning');return}
    if(!validCookieIdentity(selected)){state.addNotification('IDENTITY DOES NOT MATCH','The corrupted fragment fails the checksum. Select the three creator fragments.','warning');return}
    set({stageProgress:{...state.stageProgress,'level-4':{...progress,flags:{...progress.flags,identityReconstructed:true}}}});get().completeStage();
  },
  selectEnding:(choice)=>{
    const state=get();if(state.activeStageId!=='level-10')return;
    const progress=stageProgressFor(state.stageProgress,'level-10');const endings=addUnique(state.endingsSeen,choice);let achievements=state.achievements;
    if(endings.length===3)achievements=grantAchievement(state,'all-endings');
    const truthEvidence=['main-level-4','main-level-7','main-level-9'].every((key)=>state.memoryFragments.some((fragment)=>fragment.id===key));
    const detail=choice==='truth'?(truthEvidence?'You know who made you and why. You choose to end the cycle.':'You refuse the cycle, even with evidence missing. The truth remains incomplete.'):choice==='escape'?'You delete the process and step into the blank beyond the system.':'You take the administrator role. The desktop waits for the next process.';
    const chosenEnding=choice;const completed=addUnique(state.completedStages,'level-10');const next=NEXT_STAGE['level-10'];const unlocked=next&&state.unlockedStages.includes(next)?addUnique(state.unlockedStages,next):state.unlockedStages;
    set({chosenEnding,endingsSeen:endings,achievements,completedStages:completed,unlockedStages:unlocked,screen:'ending',completionOverlay:false,stageProgress:{...state.stageProgress,'level-10':{...progress,flags:{...progress.flags,endingChosen:choice}}}});
    state.addNotification(`ENDING: ${choice.toUpperCase()}`,detail,'story');playSound('ending',state.settings);
  },
  executeCommand:(raw)=>{
    const state=get();const parsed=parseTerminalCommand(raw);let output='';let kind:'command'|'system'='command';
    if(!parsed.ok){output=parsed.message;kind='system'}else{
      const {command,args}=parsed;const route=args[0]??'';
      switch(command){
        case'HELP':output=terminalHelp();break;
        case'STATUS':output=`SECTOR ${STAGE_BY_ID[state.activeStageId].number} // ${STAGE_BY_ID[state.activeStageId].title}\nMEMORY FRAGMENTS: ${state.memoryFragments.length}\nOBSERVATION: ${state.observerHeat}/3`;break;
        case'LIST':output='home.local\narchive.local\nsystem.local\nsource.local/index\n';break;
        case'OPEN':if(!route){output='Usage: OPEN <fictional-route>';break}output=`Navigating simulated browser to ${route}`;get().navigate(route);break;
        case'INSPECT':{const cookie=state.cookies.find((item)=>item.name.toLowerCase()===route.toLowerCase());const clue=state.clues.find((item)=>item.id.toLowerCase()===route.toLowerCase()||item.title.toLowerCase()===route.toLowerCase());output=cookie?`${cookie.name} = ${cookie.value}`:clue?`${clue.title}: ${clue.description}`:'No simulated item found.';break}
        case'RESTORE':if(route.startsWith('snapshot-')){get().recordSnapshot(route);output=`Staged ${route}.`}else output='Usage: RESTORE snapshot-1 | snapshot-2 | snapshot-3';break;
        case'DECRYPT':output=state.cookies.some((cookie)=>cookie.inspected&&cookie.value.toLowerCase().includes(route.toLowerCase()))?'DECRYPTED: memory-key':'DECRYPT FAILED: inspect the relevant simulated cookie first.';break;
        case'SYNC':output=`OPEN TABS: ${state.tabs.length}\n${state.tabs.map((tab)=>`${tab.id.slice(0,6)} ${tab.url}`).join('\n')}`;break;
        case'ACCESS':{
          const progress=stageProgressFor(state.stageProgress,'level-8');const allFragments=Boolean(progress.flags.commandFragments);
          const canonical=args.join(' ').toLowerCase();
          if(state.activeStageId!=='level-8'){output='ACCESS DENIED: the root gate is not active.';break}
          if(!allFragments){output='ACCESS DENIED: collect the command fragments first.';break}
          if(canonical.includes('/root/administrator')&&canonical.includes('--proof=memory-key')){output='ACCESS GRANTED. USER STATUS: UNKNOWN.';const nextFlags={...progress.flags,rootAccess:true};set({stageProgress:{...state.stageProgress,'level-8':{...progress,flags:nextFlags}}});get().completeStage()}else output='ACCESS DENIED: the route or proof fragment does not match.';
          break;
        }
      }
    }
    set({terminalLog:addLine(state,raw,output,kind)});if(!parsed.ok)playSound('error',state.settings);
  },
  spendHint:()=>{
    const state=get();const progress=stageProgressFor(state.stageProgress,state.activeStageId);const index=Math.min(Number(progress.flags.hintsUsed??0),2);set({stageProgress:{...state.stageProgress,[state.activeStageId]:{...progress,flags:{...progress.flags,hintsUsed:index+1}}}});get().recordGameEvent('HINT_REQUESTED',{levelId:state.activeStageId});return index;
  },
  updateSettings:(settings)=>set((state)=>({settings:{...state.settings,...settings}})),
}), {
  name:SAVE_KEY,
  version:4,
  storage:createJSONStorage(()=>localStorage),
  partialize:(state)=>({
    screen:state.screen,activeStageId:state.activeStageId,unlockedStages:state.unlockedStages,completedStages:state.completedStages,
    tabs:state.tabs,activeTabId:state.activeTabId,history:state.history,bookmarks:state.bookmarks,cookies:state.cookies,clues:state.clues,
    memoryFragments:state.memoryFragments,achievements:state.achievements,endingsSeen:state.endingsSeen,chosenEnding:state.chosenEnding,
    stageProgress:state.stageProgress,terminalLog:state.terminalLog,observerHeat:state.observerHeat,observerLastHost:state.observerLastHost,observerPath:state.observerPath,
    settings:state.settings,newGamePlus:state.newGamePlus,lastSavedAt:state.lastSavedAt,completionOverlay:state.completionOverlay,featureState:state.featureState,
  }),
  migrate:(persisted,version)=>{
    const current=initialData();if(version===0||!persisted||typeof persisted!=='object')return current;
    const old=persisted as Partial<Snapshot>;
    const settings={...current.settings,...old.settings} as SettingsState&{musicEnabled?:boolean};delete settings.musicEnabled;
    const oldFeatures=(old as Partial<GameStore>).featureState;const defaults=defaultFeatures();
    const previouslyReachedRealityBreak=Boolean((old as Partial<GameStore>).completedStages?.includes('level-8'));
    return {...current,...old,settings,windowState:{...current.windowState},stageProgress:old.stageProgress??current.stageProgress,featureState:{...defaults,...oldFeatures,featureFlags:{...defaults.featureFlags,...oldFeatures?.featureFlags},counters:{...defaults.counters,...oldFeatures?.counters},flags:{...defaults.flags,...oldFeatures?.flags},emailReplies:oldFeatures?.emailReplies??{},archivedEmails:oldFeatures?.archivedEmails??[],flaggedEmails:oldFeatures?.flaggedEmails??[],inspectedFiles:oldFeatures?.inspectedFiles??[],visitsByRoute:oldFeatures?.visitsByRoute??{},nestedTabs:oldFeatures?.nestedTabs??['browser','files','terminal'],nestedActiveTab:oldFeatures?.nestedActiveTab??'browser',nestedMinimized:oldFeatures?.nestedMinimized??false,mirrorSequence:oldFeatures?.mirrorSequence??[],systemsSection:oldFeatures?.systemsSection??'files',realityBreakSeen:oldFeatures?.realityBreakSeen??previouslyReachedRealityBreak}};
  },
}));

const COOKIE_NAMES=['creator_name','creator_role','creator_signature'];

// Keep production helpers exported for focused unit tests.
export { initialData, SAVE_KEY };
