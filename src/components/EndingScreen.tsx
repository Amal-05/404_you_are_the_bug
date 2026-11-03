import { motion } from 'motion/react';
import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { STAGE_BY_ID } from '../engine/campaign';
import { useGameStore } from '../store/gameStore';

export function EndingScreen({onReturn,onRestart,onOpenLevels}:{onReturn:()=>void;onRestart:()=>void;onOpenLevels:()=>void}){
  const ending=useGameStore((state)=>state.chosenEnding);
  const stage=STAGE_BY_ID['level-10'];
  return <main className="ending-screen"><div className="ending-noise"/><motion.section className="ending-card" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}>
    <div className="ending-mark"><Trophy size={23}/></div><span className="eyebrow">CAMPAIGN COMPLETE · {ending?.toUpperCase()??'THE TRUTH'}</span>
    <h1>{ending==='truth'?'The Archive Remembers':ending==='escape'?'A Clean Restart':'404: You Are the Bug'}</h1>
    <p>{ending==='truth'?'You preserved the memories. The system can finally tell its own story.':ending==='escape'?'You chose a quiet ending. The archive is empty, and the loop can begin again.':stage.endingLine}</p>
    <div className="ending-actions"><button className="button-primary" onClick={onReturn}>Return to desktop <ArrowRight size={16}/></button><button className="button-secondary" onClick={onOpenLevels}>Level select</button><button className="button-quiet" onClick={onRestart}><RotateCcw size={15}/> New run</button></div>
  </motion.section></main>;
}
