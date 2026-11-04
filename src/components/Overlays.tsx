import { motion } from 'motion/react';
import { ArrowRight, Check, CircleHelp, Keyboard, Layers3, LockKeyhole, Play, RotateCcw, X } from 'lucide-react';
import { CAMPAIGN, STAGE_BY_ID } from '../engine/campaign';
import { useGameStore } from '../store/gameStore';
import type { StageId } from '../types';
import type { ReactNode } from 'react';

function ModalShell({children,onClose,label='Dialog',wide=false}:{children:ReactNode;onClose?:()=>void;label?:string;wide?:boolean}){
  return <motion.div className="modal-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose?.()}}>
    <motion.section role="dialog" aria-modal="true" aria-label={label} className={`modal-card ${wide?'modal-wide':''}`} initial={{opacity:0,y:14,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.99}} transition={{duration:.18}}>{children}</motion.section>
  </motion.div>;
}

export function StageIntro({stageId,onBegin,onShowLevels}:{stageId:StageId;onBegin:()=>void;onShowLevels:()=>void}){
  const stage=STAGE_BY_ID[stageId];const completed=useGameStore((state)=>state.completedStages.includes(stageId));
  const realityBreakSeen=useGameStore((state)=>state.featureState.realityBreakSeen);
  return <ModalShell label={`Level ${stage.number} introduction`}>
    <div className="modal-topline"><span className="eyebrow">SECTOR {String(stage.number).padStart(2,'0')} // BRIEFING</span><span className="modal-mark">404</span></div>
    <h2>{stage.title}</h2><p className="modal-subtitle">{stage.subtitle}</p>
    <div className="briefing-objective"><span className="section-label">OBJECTIVE</span><p>{stage.objective}</p></div>
    <div className="briefing-details"><div><span className="section-label">NEW MECHANIC</span><p>{stage.lesson}</p></div><div><span className="section-label">RECOVERY</span><p>Progress saves automatically. You can revisit unlocked sectors from Level Select.</p></div></div>
    {stageId==='level-0'&&<div className="address-example"><span className="section-label">FIRST ROUTE · TYPE IN THE GAME ADDRESS BAR</span><code>home.local/404/welcome</code><p>Find <b>404</b> in Help Center and <b>welcome</b> in Personal Archive. Either fragment order works.</p></div>}
    {stageId==='level-9'&&realityBreakSeen&&<div className="reality-break-briefing"><span className="section-label">FICTIONAL SYSTEM UPDATE · CHECKPOINT SAVED</span><p>The opening desktop was inside a nested containment system. Your discoveries carry forward. Continue to skip the transition text; reduced motion remains active in Settings.</p></div>}
    <div className="modal-footer"><button className="button button-quiet" onClick={onShowLevels}><Layers3 size={15}/>Level Select</button><button className="button button-primary" onClick={onBegin}><Play size={15} fill="currentColor"/>{completed?'Replay Sector':'Enter Sector'}<ArrowRight size={15}/></button></div>
  </ModalShell>;
}

export function CompletionDialog({onContinue,onMenu}:{onContinue:()=>void;onMenu:()=>void}){
  const stage=useGameStore((state)=>STAGE_BY_ID[state.activeStageId]);const nextId=useGameStore((state)=>CAMPAIGN.findIndex((item)=>item.id===state.activeStageId)<CAMPAIGN.length-1?CAMPAIGN[CAMPAIGN.findIndex((item)=>item.id===state.activeStageId)+1]?.id:undefined);
  const next=nextId?STAGE_BY_ID[nextId as StageId]:undefined;const memories=useGameStore((state)=>state.memoryFragments.length);
  return <ModalShell label="Sector complete"><div className="success-emblem"><Check size={26}/></div><div className="eyebrow">SECTOR {String(stage.number).padStart(2,'0')} COMPLETE</div><h2>{stage.endingLine}</h2><p className="modal-copy">Your progress is saved. {memories} memory fragments recovered.</p>
    <div className="modal-footer"><button className="button button-quiet" onClick={onMenu}>Main Menu</button>{next&&<button className="button button-primary" onClick={onContinue}>Continue to {next.title}<ArrowRight size={15}/></button>}</div>
  </ModalShell>;
}

export function StageSelectDialog({onClose,onSelect}:{onClose:()=>void;onSelect:(id:StageId)=>void}){
  const unlocked=useGameStore((state)=>state.unlockedStages);const completed=useGameStore((state)=>state.completedStages);const active=useGameStore((state)=>state.activeStageId);const memoryCount=useGameStore((state)=>state.memoryFragments.length);
  return <ModalShell onClose={onClose} label="Level Select" wide><div className="modal-topline"><span className="eyebrow">CAMPAIGN MAP</span><span className="mono-small">{completed.length} / 11 COMPLETE</span></div><h2>Level Select</h2><p className="modal-copy">Choose an unlocked sector. Your clue journal, fragments, and best progress stay saved.</p>
    <div className="stage-grid">{CAMPAIGN.map((stage)=>{const canEnter=unlocked.includes(stage.id);const isComplete=completed.includes(stage.id);const current=active===stage.id;return <button key={stage.id} className={`stage-card ${canEnter?'':'stage-locked'} ${current?'stage-current':''}`} disabled={!canEnter} onClick={()=>onSelect(stage.id)}>
      <span className="stage-number">{stage.number==='S'?'S':String(stage.number).padStart(2,'0')}</span><span className="stage-card-content"><b>{stage.title}</b><small>{stage.subtitle}</small><em>{isComplete?'COMPLETE':canEnter?current?'CURRENT SECTOR':'UNLOCKED':'LOCKED'}</em></span>{canEnter?<ArrowRight size={15}/>:<LockKeyhole size={15}/>}
    </button>})}</div>
    <div className="selector-footer"><span><i className="status-dot"/>{memoryCount} / 11 hidden memories</span><button className="button button-secondary" onClick={onClose}>Close <X size={14}/></button></div>
  </ModalShell>;
}

export function HowToPlayDialog({onClose,onStart}:{onClose:()=>void;onStart:()=>void}){
  return <ModalShell onClose={onClose} label="How to Play" wide><div className="modal-topline"><span className="eyebrow">QUICK GUIDE</span><CircleHelp size={18} className="muted-icon"/></div><h2>How to Play</h2><p className="modal-copy">The desktop is the world. Every URL, tab, cookie, and history entry is simulated inside the game.</p>
    <div className="guide-grid"><article><span className="guide-index">01</span><div><b>Read the page</b><p>Every puzzle gives clues on more than one page. Use the Journal to review what you found.</p></div></article><article><span className="guide-index">02</span><div><b>Use fictional addresses</b><p>Type a discovered route in the game address bar and press Enter. Real websites are never loaded.</p></div></article><article><span className="guide-index">03</span><div><b>Keep track of browser state</b><p>Tabs have separate pages. History, bookmarks, and simulated cookies can all matter.</p></div></article><article><span className="guide-index">04</span><div><b>Ask for a hint</b><p>Use the lightbulb icon for three progressive hints. It never removes progress.</p></div></article></div>
    <div className="shortcut-strip"><Keyboard size={15}/><span>Ctrl/Cmd+L address</span><span>Ctrl/Cmd+T new tab</span><span>Ctrl/Cmd+W close tab</span><span>Esc pause</span><span>F11 fullscreen</span></div>
    <div className="modal-footer"><button className="button button-quiet" onClick={onClose}>Close</button><button className="button button-primary" onClick={onStart}><Play size={15} fill="currentColor"/>Start a New Game</button></div>
  </ModalShell>;
}

export function PauseDialog({onResume,onMenu,onRestart,onLevels}:{onResume:()=>void;onMenu:()=>void;onRestart:()=>void;onLevels:()=>void}){
  return <ModalShell label="Paused"><div className="eyebrow">SESSION PAUSED</div><h2>Take a breath.</h2><p className="modal-copy">Your current pages and puzzle progress are saved locally.</p><div className="pause-actions"><button className="button button-primary" onClick={onResume}><Play size={15} fill="currentColor"/>Resume Session</button><button className="button button-secondary" onClick={onLevels}><Layers3 size={15}/>Level Select</button><button className="button button-secondary" onClick={onRestart}><RotateCcw size={15}/>Restart Run</button><button className="button button-quiet" onClick={onMenu}>Main Menu</button></div></ModalShell>;
}

export function RestartDialog({onCancel,onConfirm}:{onCancel:()=>void;onConfirm:()=>void}){
  return <ModalShell label="Restart run"><div className="modal-topline"><span className="eyebrow">RESTART RUN</span><RotateCcw size={17} className="muted-icon"/></div><h2>Begin again?</h2><p className="modal-copy">This resets the current sector’s progress, open tabs, and fictional browser state. Your achievements, endings, and recovered memory fragments remain in your archive.</p><div className="modal-footer"><button className="button button-quiet" onClick={onCancel}>Cancel</button><button className="button button-danger" onClick={onConfirm}>Restart at Level 0</button></div></ModalShell>;
}
