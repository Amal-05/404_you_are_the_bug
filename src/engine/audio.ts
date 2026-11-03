import type { SettingsState } from '../types';

type SoundName='startup'|'tab-open'|'tab-close'|'type'|'error'|'load'|'complete'|'ending'|'whisper'|'notification'|'click';
const NOTES:Record<SoundName,number[]>={startup:[392,523,659],'tab-open':[620,820],'tab-close':[540,350],type:[470],error:[210,145],load:[440,554],complete:[440,554,659,880],ending:[330,247,196],whisper:[117,132,110],notification:[660,880],click:[510]};
let context:AudioContext|undefined;
let sfxBus:GainNode|undefined;

function getContext(settings:SettingsState):AudioContext|undefined{
  if(typeof window==='undefined'||!('AudioContext'in window))return;
  try{
    context??=new AudioContext();
    if(context.state==='suspended')void context.resume().catch(()=>{});
    if(!sfxBus){sfxBus=context.createGain();sfxBus.connect(context.destination)}
    sfxBus.gain.setTargetAtTime(settings.muted?0:Math.max(0,Math.min(1,settings.volume)),context.currentTime,.035);
    return context;
  }catch{return}
}

export function playSound(name:SoundName,settings:SettingsState):void{
  if(settings.muted||settings.volume<=0||typeof window==='undefined')return;
  try{
    const ctx=getContext(settings);if(!ctx||!sfxBus)return;
    NOTES[name].forEach((frequency,index)=>{
      const oscillator=ctx.createOscillator();const gain=ctx.createGain();const now=ctx.currentTime+index*.075;
      oscillator.type=name==='whisper'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,now);
      if(name==='whisper')oscillator.frequency.exponentialRampToValueAtTime(frequency*1.23,now+.16);
      const level=name==='whisper'?.07:.12;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(level,now+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+(name==='whisper'?.23:.19));
      oscillator.connect(gain).connect(sfxBus!);oscillator.start(now);oscillator.stop(now+(name==='whisper'?.24:.2));
    });
  }catch{/* Audio is an enhancement and must never interrupt play. */}
}
