import { motion } from 'motion/react';
import { BookOpen, CircleHelp, Layers3, Play, Settings2, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

type Props={onOpenLevels:()=>void;onHowToPlay:()=>void};

export function TitleScreen({onOpenLevels,onHowToPlay}:Props){
  const start=useGameStore((state)=>state.startNewGame);const resume=useGameStore((state)=>state.continueGame);
  const openWindow=useGameStore((state)=>state.openWindow);const completed=useGameStore((state)=>state.completedStages.length);
  const newGamePlus=useGameStore((state)=>state.newGamePlus);
  return <main className="title-screen noise-layer">
    <div className="title-orbit title-orbit-one"/><div className="title-orbit title-orbit-two"/>
    <motion.section className="title-card" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.55,ease:[.2,.75,.25,1]}}>
      <div className="title-mark"><span>404</span><i/></div>
      <div className="eyebrow">An interactive browser mystery</div>
      <h1>YOU ARE<br/><span>THE BUG</span></h1>
      <p className="title-tagline">You were never supposed to exist.</p>
      <p className="title-description">A familiar desktop. A browser with a memory.<br/>Something in the system has noticed you.</p>
      <div className="title-actions">
        <button className="button button-primary button-large" onClick={start}><Play size={17} fill="currentColor"/>New Game{newGamePlus>0&&<span className="ng-plus">+{newGamePlus}</span>}</button>
        <button className="button button-secondary button-large" onClick={resume}><span className="button-key">↵</span>Continue Session</button>
      </div>
      <div className="title-utility-row">
        <button className="text-button" onClick={onOpenLevels}><Layers3 size={15}/>Level Select</button>
        <button className="text-button" onClick={onHowToPlay}><CircleHelp size={15}/>How to Play</button>
        <button className="text-button" onClick={()=>openWindow('achievements')}><Trophy size={15}/>Achievements</button>
        <button className="text-button" onClick={()=>openWindow('settings')}><Settings2 size={15}/>Settings</button>
      </div>
      <div className="title-meta"><span><i className="status-dot"/>SIMULATION READY</span><span>{completed} SECTORS CLEARED</span></div>
      <div className="title-caption"><BookOpen size={12}/> Progress saves locally. The simulated browser is separate from your real browser data.</div>
    </motion.section>
    <div className="title-version">LATTICE OS // PERSONAL INSTANCE <span>BUILD 1.0.0</span></div>
  </main>;
}
