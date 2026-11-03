import type { EndingChoice, StageId } from '../types';
import type { MusicScene } from './music';

const TITLES:Record<MusicScene,string>={title:'A Quiet System',boot:'First Instructions',mystery:'A Photograph from Tomorrow',archive:'Things the Browser Kept',tension:'The Missing Link',stealth:'Move Without a Shadow',terminal:'Root Access',loop:'The Infinite Loop',final:'The Administrator',secret:'The User Is Still Here',escape:'Beyond the Blank',become:'A New Administrator',truth:'The Archive Remembers'};

export function musicSceneFor(stageId:StageId,screen:'menu'|'desktop'|'ending',ending?:EndingChoice):MusicScene{
  if(screen==='menu')return'title';if(screen==='ending')return ending??'truth';
  switch(stageId){
    case'level-0':case'level-1':return'boot';case'level-2':return'mystery';case'level-3':case'level-4':return'archive';
    case'level-5':case'level-6':return'tension';case'level-7':return'stealth';case'level-8':return'terminal';case'level-9':return'loop';case'level-10':return'final';case'secret':return'secret';
  }
  return'mystery';
}

export function musicTitle(scene:MusicScene):string{return TITLES[scene]}
