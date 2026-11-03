import type { SettingsState } from '../types';
import { getMusicAudio, setAudioSettings } from './audio';

export type MusicScene='title'|'boot'|'mystery'|'archive'|'tension'|'stealth'|'terminal'|'loop'|'final'|'secret'|'escape'|'become'|'truth';
type SceneSpec={bpm:number;pad:number[];root:number;melody:number[];pattern:number[];brightness:number};
const SCENES:Record<MusicScene,SceneSpec>={
  title:{bpm:68,pad:[50,53,57,64],root:38,melody:[0,7,10,14,7,3,10,5],pattern:[0,4,7,11,14,9,5,12],brightness:.48},
  boot:{bpm:70,pad:[50,53,57,62],root:38,melody:[0,7,10,14,12,10,7,3],pattern:[0,4,8,12,15,10,6,3],brightness:.55},
  mystery:{bpm:72,pad:[50,53,57,64],root:38,melody:[0,7,12,10,14,12,7,3],pattern:[0,3,7,10,13,8,5,11],brightness:.5},
  archive:{bpm:74,pad:[50,53,57,62],root:38,melody:[0,5,10,14,12,7,3,8],pattern:[0,4,7,10,14,11,6,3],brightness:.42},
  tension:{bpm:82,pad:[50,53,56,62],root:38,melody:[0,3,10,13,12,7,3,5],pattern:[0,3,6,9,12,15,10,5],brightness:.68},
  stealth:{bpm:62,pad:[50,53,57,64],root:38,melody:[0,10,7,14,12,3,7,5],pattern:[0,7,12,5,14,9,3,11],brightness:.35},
  terminal:{bpm:76,pad:[50,54,57,62],root:38,melody:[0,7,11,14,7,4,10,3],pattern:[0,4,8,11,14,8,5,12],brightness:.6},
  loop:{bpm:88,pad:[50,53,56,62],root:38,melody:[0,3,7,10,0,3,7,14],pattern:[0,1,8,9,0,1,8,9],brightness:.72},
  final:{bpm:66,pad:[50,53,57,64],root:38,melody:[0,7,12,14,10,7,3,0],pattern:[0,5,8,12,15,10,6,3],brightness:.58},
  secret:{bpm:58,pad:[50,55,57,65],root:38,melody:[0,7,12,19,14,10,7,3],pattern:[0,7,12,15,5,10,14,3],brightness:.46},
  escape:{bpm:72,pad:[50,57,62,69],root:38,melody:[0,7,12,19,14,12,7,0],pattern:[0,5,8,12,15,12,7,3],brightness:.62},
  become:{bpm:78,pad:[50,53,57,62],root:38,melody:[0,7,10,14,17,14,10,7],pattern:[0,4,7,10,12,15,10,5],brightness:.66},
  truth:{bpm:64,pad:[50,53,57,64],root:38,melody:[0,7,12,14,19,14,12,7],pattern:[0,5,9,12,15,12,7,3],brightness:.5},
};

type Session={gain:GainNode;timer:number;step:number;nextTime:number;stopped:boolean;nodes:OscillatorNode[];effects:AudioNode[];padOscillators:OscillatorNode[];delay:DelayNode};
let activeScene:MusicScene|undefined;
let activeSession:Session|undefined;
const frequency=(note:number)=>440*Math.pow(2,(note-69)/12);

function pluck(ctx:AudioContext,session:Session,scene:SceneSpec,note:number,when:number,accent=1){
  const oscillator=ctx.createOscillator();const envelope=ctx.createGain();const filter=ctx.createBiquadFilter();
  oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency(note),when);filter.type='lowpass';filter.frequency.setValueAtTime(900+scene.brightness*1900,when);filter.Q.value=.6;
  const peak=.085*accent;envelope.gain.setValueAtTime(.0001,when);envelope.gain.exponentialRampToValueAtTime(peak,when+.018);envelope.gain.exponentialRampToValueAtTime(.0001,when+.52);
  oscillator.connect(filter).connect(envelope);envelope.connect(session.gain);envelope.connect(session.delay);oscillator.start(when);oscillator.stop(when+.54);
}

function bass(ctx:AudioContext,session:Session,root:number,when:number){
  const oscillator=ctx.createOscillator();const envelope=ctx.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency(root),when);
  envelope.gain.setValueAtTime(.0001,when);envelope.gain.exponentialRampToValueAtTime(.11,when+.06);envelope.gain.exponentialRampToValueAtTime(.0001,when+.72);
  oscillator.connect(envelope).connect(session.gain);oscillator.start(when);oscillator.stop(when+.75);
}

function stopSession(session:Session){
  if(session.stopped)return;session.stopped=true;window.clearInterval(session.timer);
  try{session.nodes.forEach((node)=>node.stop());session.effects.forEach((node)=>node.disconnect());session.gain.disconnect()}catch{}
  if(activeSession===session)activeSession=undefined;
}

function playScene(name:MusicScene,settings:SettingsState){
  const audio=getMusicAudio(settings);if(!audio||!settings.musicEnabled)return;
  const {context:ctx,bus}=audio;const scene=SCENES[name];const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.connect(bus);
  const session:Session={gain,timer:0,step:0,nextTime:ctx.currentTime+.12,stopped:false,nodes:[],effects:[],padOscillators:[],delay:ctx.createDelay(1)};
  session.delay.delayTime.value=.28;const feedback=ctx.createGain();feedback.gain.value=.13;const echo=ctx.createGain();echo.gain.value=.16;
  session.delay.connect(feedback).connect(session.delay);session.delay.connect(echo).connect(gain);session.effects.push(session.delay,feedback,echo);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=620+scene.brightness*1200;filter.Q.value=.25;filter.connect(gain);
  scene.pad.forEach((note,index)=>{
    const oscillator=ctx.createOscillator();const voice=ctx.createGain();oscillator.type=index===0?'sine':'triangle';oscillator.frequency.value=frequency(note);oscillator.detune.value=index%2===0?-4:4;
    voice.gain.value=index===0?.095:.035;oscillator.connect(voice).connect(filter);oscillator.start();session.nodes.push(oscillator);session.padOscillators.push(oscillator);
  });
  gain.gain.setTargetAtTime(.78,ctx.currentTime,.9);
  if(activeSession){const previous=activeSession;previous.gain.gain.setTargetAtTime(.0001,ctx.currentTime,.55);window.setTimeout(()=>stopSession(previous),2400)}
  const stepDuration=60/scene.bpm/2;const tonic=scene.pad[0]!;const progression=[[0,3,7,14],[5,8,12,17],[3,7,10,14],[-2,2,5,12]].map((shape)=>shape.map((interval)=>tonic+interval));
  const schedule=()=>{
    if(session.stopped||ctx.state!=='running')return;
    if(session.nextTime<ctx.currentTime-.2){const skipped=Math.ceil((ctx.currentTime-.12-session.nextTime)/stepDuration);session.step+=skipped;session.nextTime+=skipped*stepDuration}
    const horizon=ctx.currentTime+.22;
    while(session.nextTime<horizon){
      const at=session.nextTime;const slot=session.step%16;const chord=progression[Math.floor(session.step/16)%progression.length]!;
      if(slot===0)session.padOscillators.forEach((oscillator,index)=>oscillator.frequency.setTargetAtTime(frequency(chord[index]??tonic),at,.85));
      if(slot===0||slot===8)bass(ctx,session,chord[0]!-12,at);
      if(scene.pattern.includes(slot))pluck(ctx,session,scene,chord[0]!+scene.melody[session.step%scene.melody.length]!,at,slot===0?1:.66);
      if(slot===12&&scene.brightness>.55)pluck(ctx,session,scene,chord[2]!+12,at,.28);
      session.step++;session.nextTime+=stepDuration;
    }
  };
  session.timer=window.setInterval(schedule,100);activeScene=name;activeSession=session;
}

export function startMusic(scene:MusicScene,settings:SettingsState){
  if(!settings.musicEnabled){setAudioSettings(settings);if(activeSession){const session=activeSession;session.gain.gain.setTargetAtTime(.0001,session.gain.context.currentTime,.2);window.setTimeout(()=>stopSession(session),1200)}activeScene=undefined;return}
  if(activeScene===scene&&activeSession&&!activeSession.stopped){setAudioSettings(settings);return}
  playScene(scene,settings);
}
