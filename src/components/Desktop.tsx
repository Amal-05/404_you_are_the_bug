import { useEffect, useState } from 'react';
import { Bell, BookOpen, Cookie, FolderOpen, Globe2, Layers3, Maximize2, Pause, Settings2, Shield, SquareTerminal, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { BrowserWindow } from './browser/BrowserWindow';
import { UtilityWindow } from './windows/UtilityWindow';
import type { AppId } from '../types';

const DESKTOP_APPS:{id:AppId;label:string;icon:typeof Globe2;shortcut:string}[]=[
  {id:'browser',label:'Northstar',icon:Globe2,shortcut:'01'},
  {id:'files',label:'Files',icon:FolderOpen,shortcut:'02'},
  {id:'terminal',label:'Terminal',icon:SquareTerminal,shortcut:'03'},
  {id:'cookies',label:'Cookies',icon:Cookie,shortcut:'04'},
  {id:'journal',label:'Journal',icon:BookOpen,shortcut:'05'},
];

export function Desktop({onOpenLevels,onPause,onHowToPlay}:{onOpenLevels:()=>void;onPause:()=>void;onHowToPlay:()=>void}){
  const [clock,setClock]=useState(()=>new Date());const [trayOpen,setTrayOpen]=useState(false);
  const [focusedUtility,setFocusedUtility]=useState<AppId>('achievements');
  const windowState=useGameStore((state)=>state.windowState);const openWindow=useGameStore((state)=>state.openWindow);const closeWindow=useGameStore((state)=>state.closeWindow);
  const notifications=useGameStore((state)=>state.notifications);const activeStage=useGameStore((state)=>state.activeStageId);const stage=activeStage;
  const crtEffects=useGameStore((state)=>state.settings.crtEffects);
  const muted=useGameStore((state)=>state.settings.muted);const updateSettings=useGameStore((state)=>state.updateSettings);const toggleFullscreen=useGameStore((state)=>state.toggleFullscreen);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(new Date()),1000);return()=>window.clearInterval(timer)},[]);
  const openApp=(id:AppId)=>{openWindow(id);setFocusedUtility(id)};
  return <main className={`desktop-shell ${crtEffects?'crt-on':''}`}>
    <header className="system-bar"><div className="system-brand"><span className="system-glyph">◈</span><b>LATTICE OS</b><span className="system-division">/ PERSONAL INSTANCE</span><span className="system-divider"/><span className="system-live"><i/>SIMULATION LIVE</span></div>
      <div className="system-tools"><span className="session-label"><Shield size={12}/> {stage.toUpperCase().replace('-',' ')}</span><button className="system-tool" title={muted?'Unmute':'Mute'} onClick={()=>updateSettings({muted:!muted})}>{muted?<VolumeX size={15}/>:<Volume2 size={15}/>}</button><button className="system-tool notification-trigger" title="Notification center" onClick={()=>setTrayOpen((open)=>!open)}><Bell size={15}/>{notifications.some((item)=>!item.read)&&<i/>}</button><span className="system-clock"><b>{clock.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</b><small>{clock.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</small></span><button className="system-tool" title="Fullscreen (F11)" onClick={()=>void toggleFullscreen()}><Maximize2 size={14}/></button><button className="system-tool" title="Pause (Esc)" onClick={onPause}><Pause size={14}/></button></div>
    </header>
    <div className="desktop-workspace">
      <div className="wallpaper-glow"/><div className="wallpaper-grid"/><div className="wallpaper-orb orb-a"/><div className="wallpaper-orb orb-b"/>
      <div className="desktop-shortcuts" aria-label="Desktop applications">{DESKTOP_APPS.map(({id,label,icon:Icon,shortcut})=><button key={id} className={`desktop-shortcut ${windowState[id]?'shortcut-open':''}`} onDoubleClick={()=>openApp(id)} onClick={()=>openApp(id)}><span className="shortcut-icon"><Icon size={19}/><small>{shortcut}</small></span><span>{label}</span></button>)}<button className="desktop-shortcut" onClick={()=>openApp('achievements')}><span className="shortcut-icon shortcut-purple"><Trophy size={19}/><small>06</small></span><span>Achievements</span></button><button className="desktop-shortcut" onClick={()=>openApp('settings')}><span className="shortcut-icon shortcut-muted"><Settings2 size={19}/><small>07</small></span><span>Settings</span></button></div>
      <div className="workspace-watermark"><span>USER SESSION</span><b>001</b><small>UNKNOWN PROCESS<br/>ACTIVE</small></div>
      <div className="open-windows">
        <AnimatePresence>{windowState.browser&&!useGameStore.getState().minimizedWindows.includes('browser')&&<motion.div key="browser" className="app-window browser-app-window" initial={{opacity:0,y:12,scale:.99}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.99}}><BrowserWindow onMinimize={()=>useGameStore.getState().minimizeWindow('browser')} onClose={()=>closeWindow('browser')} onHowToPlay={onHowToPlay}/></motion.div>}</AnimatePresence>
        {(['files','terminal','settings','cookies','journal','achievements'] as AppId[]).map((id)=>windowState[id]&&!useGameStore.getState().minimizedWindows.includes(id)&&<UtilityWindow key={id} appId={id} zIndex={id===focusedUtility?12:6} onFocus={()=>setFocusedUtility(id)} onClose={()=>closeWindow(id)} onMinimize={()=>useGameStore.getState().minimizeWindow(id)} />)}
      </div>
      <AnimatePresence>{trayOpen&&<motion.aside className="notification-center" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:12}}><div className="notification-head"><div><span className="eyebrow">SYSTEM MESSAGES</span><h3>Notifications</h3></div><button className="icon-button" onClick={()=>setTrayOpen(false)} aria-label="Close notification center"><X size={15}/></button></div>{notifications.length?notifications.map((item)=><article key={item.id} className={`notification-item tone-${item.tone}`}><span className="notification-mark">◈</span><div><b>{item.title}</b><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div></article>):<p className="empty-copy">No new notifications.</p>}</motion.aside>}</AnimatePresence>
    </div>
    <footer className="taskbar"><div className="taskbar-start"><button className="start-button" title="Open menu" onClick={()=>useGameStore.setState({screen:'menu'})}><span>◈</span></button><button className="taskbar-app active" title="Northstar Browser" onClick={()=>openApp('browser')}><Globe2 size={17}/></button>{DESKTOP_APPS.filter((app)=>['files','terminal'].includes(app.id)).map(({id,label,icon:Icon})=><button key={id} className="taskbar-app" title={label} onClick={()=>openApp(id)}><Icon size={16}/></button>)}<span className="taskbar-separator"/><button className="taskbar-link" onClick={onOpenLevels}><Layers3 size={15}/><span>Level Select</span></button><button className="taskbar-link" onClick={()=>openApp('journal')}><BookOpen size={15}/><span>Clue Journal</span></button><button className="taskbar-link" onClick={()=>openApp('cookies')}><Cookie size={15}/><span>Cookies</span></button><button className="taskbar-link" onClick={()=>openApp('achievements')}><Trophy size={15}/><span>Achievements</span></button></div><div className="taskbar-right"><span className="taskbar-sector">SECTOR {String(STAGE_NUMBER(activeStage)).padStart(2,'0')} / 11</span><button className="taskbar-app" title="Settings" onClick={()=>openApp('settings')}><Settings2 size={16}/></button></div></footer>
  </main>;
}

function STAGE_NUMBER(stage:string){return stage==='secret'?'S':stage.replace('level-','')}
