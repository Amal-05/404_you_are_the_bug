import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from './store/gameStore';
import { StageIntro, CompletionDialog, PauseDialog, StageSelectDialog, HowToPlayDialog, RestartDialog } from './components/Overlays';
import { Desktop } from './components/Desktop';
import { TitleScreen } from './components/TitleScreen';
import { EndingScreen } from './components/EndingScreen';
import type { StageId } from './types';

type DialogType = 'levels' | 'how-to-play' | 'pause' | 'restart' | null;

export default function App() {
  const screen=useGameStore((state)=>state.screen);
  const showIntro=useGameStore((state)=>state.showIntro);
  const completionOverlay=useGameStore((state)=>state.completionOverlay);
  const openStage=useGameStore((state)=>state.openStage);
  const beginStage=useGameStore((state)=>state.beginStage);
  const continueGame=useGameStore((state)=>state.continueGame);
  const restartRun=useGameStore((state)=>state.restartRun);
  const [dialog,setDialog]=useState<DialogType>(null);
  const activeStage=useGameStore((state)=>state.activeStageId);
  const settings=useGameStore((state)=>state.settings);
  const screenForDialog=screen;

  useEffect(()=>{
    document.documentElement.style.setProperty('--user-scale',String(settings.textScale));
    document.documentElement.classList.toggle('reduced-motion',settings.reducedMotion);
  },[settings.textScale,settings.reducedMotion]);

  useEffect(()=>{
    const onKeyDown=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      const typing=target?.matches('input,textarea,[contenteditable="true"]');
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='l'){
        event.preventDefault();document.querySelector<HTMLInputElement>('#fictional-address')?.focus();document.querySelector<HTMLInputElement>('#fictional-address')?.select();return;
      }
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='t'&&screen==='desktop'){
        event.preventDefault();useGameStore.getState().openTab('home.local');return;
      }
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='w'&&screen==='desktop'){
        event.preventDefault();useGameStore.getState().closeTab(useGameStore.getState().activeTabId);return;
      }
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='r'&&screen==='desktop'){
        event.preventDefault();useGameStore.getState().refresh();return;
      }
      if(event.key==='Escape'&&!typing&&screen==='desktop'&&!showIntro&&!completionOverlay){setDialog((current)=>current==='pause'?null:'pause')}
      if(event.key==='F11'){event.preventDefault();void useGameStore.getState().toggleFullscreen()}
    };
    window.addEventListener('keydown',onKeyDown);return()=>window.removeEventListener('keydown',onKeyDown);
  },[screen,showIntro,completionOverlay]);

  const startStage=(stageId:StageId)=>{openStage(stageId);setDialog(null)};
  return <>
    <AnimatePresence mode="wait">
      {screen==='menu'&&<motion.div key="menu" className="screen-transition" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><TitleScreen onOpenLevels={()=>setDialog('levels')} onHowToPlay={()=>setDialog('how-to-play')} /></motion.div>}
      {screen==='desktop'&&<motion.div key="desktop" className="screen-transition" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Desktop onOpenLevels={()=>setDialog('levels')} onPause={()=>setDialog('pause')} onHowToPlay={()=>setDialog('how-to-play')} /></motion.div>}
      {screen==='ending'&&<motion.div key="ending" className="screen-transition" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><EndingScreen onReturn={()=>continueGame()} onRestart={()=>{restartRun();setDialog(null)}} onOpenLevels={()=>setDialog('levels')} /></motion.div>}
    </AnimatePresence>
    {screenForDialog==='desktop'&&showIntro&&<StageIntro stageId={activeStage} onBegin={beginStage} onShowLevels={()=>setDialog('levels')} />}
    {screenForDialog==='desktop'&&completionOverlay&&<CompletionDialog onContinue={()=>useGameStore.getState().advanceStage()} onMenu={()=>{useGameStore.setState({screen:'menu',completionOverlay:false});}} />}
    {screenForDialog==='desktop'&&dialog==='pause'&&<PauseDialog onResume={()=>setDialog(null)} onMenu={()=>{setDialog(null);useGameStore.setState({screen:'menu'})}} onRestart={()=>setDialog('restart')} onLevels={()=>setDialog('levels')} />}
    {dialog==='levels'&&<StageSelectDialog onClose={()=>setDialog(null)} onSelect={startStage} />}
    {dialog==='how-to-play'&&<HowToPlayDialog onClose={()=>setDialog(null)} onStart={()=>{useGameStore.getState().startNewGame();setDialog(null)}} />}
    {dialog==='restart'&&<RestartDialog onCancel={()=>setDialog(null)} onConfirm={()=>{restartRun();setDialog(null)}} />}
  </>;
}
