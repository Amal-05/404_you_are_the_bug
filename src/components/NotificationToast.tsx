import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Bell, Check, CircleAlert, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { GameNotification } from '../types';

export function NotificationToast(){
  const notifications=useGameStore((state)=>state.notifications);
  const [queue,setQueue]=useState<GameNotification[]>([]);
  const seen=useRef(new Set<string>());
  useEffect(()=>{
    const fresh=notifications.filter((item)=>!seen.current.has(item.id));
    notifications.forEach((item)=>seen.current.add(item.id));
    if(fresh.length)setQueue((current)=>[...current,...fresh.reverse()].slice(-4));
  },[notifications]);
  useEffect(()=>{
    if(!queue.length)return;
    const timer=window.setTimeout(()=>setQueue((current)=>current.slice(1)),4200);
    return()=>window.clearTimeout(timer);
  },[queue]);
  const current=queue[0];
  return <div className="toast-stack" aria-live="polite" aria-atomic="true">
    <AnimatePresence initial={false}>{current&&<motion.aside key={current.id} className={`game-toast toast-${current.tone}`} initial={{opacity:0,x:18,y:-4}} animate={{opacity:1,x:0,y:0}} exit={{opacity:0,x:16}} transition={{duration:.2}}>
      <span className="toast-icon">{current.tone==='story'?<Check size={17}/>:current.tone==='warning'?<CircleAlert size={17}/>:<Bell size={16}/>}</span>
      <div className="toast-copy"><b>{current.title}</b><p>{current.message}</p><small><ArrowRight size={10}/> JOURNAL UPDATED</small></div>
      <button className="toast-dismiss" aria-label="Dismiss notification" onClick={()=>setQueue((items)=>items.slice(1))}><X size={14}/></button>
    </motion.aside>}</AnimatePresence>
  </div>;
}
