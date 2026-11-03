import type { SettingsState } from '../types';

type SoundName = 'startup' | 'tab-open' | 'tab-close' | 'type' | 'error' | 'load' | 'complete' | 'ending' | 'whisper' | 'notification' | 'click';
let context: AudioContext | undefined;

const NOTES: Record<SoundName, number[]> = {
  startup:[392,523,659], 'tab-open':[620,820], 'tab-close':[540,350], type:[470], error:[210,145], load:[440,554], complete:[440,554,659,880], ending:[330,247,196], whisper:[117,132,110], notification:[660,880], click:[510],
};

export function playSound(name: SoundName, settings: SettingsState): void {
  if (settings.muted || settings.volume <= 0 || typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const notes = NOTES[name];
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const now = context!.currentTime + index * 0.075;
      oscillator.type = name === 'whisper' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      if (name === 'whisper') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.23, now + 0.16);
      const level = settings.volume * (name === 'whisper' ? 0.025 : 0.035);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (name === 'whisper' ? 0.23 : 0.13));
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(now);
      oscillator.stop(now + (name === 'whisper' ? 0.24 : 0.14));
    });
  } catch {
    // Audio is an enhancement. Unsupported or blocked audio never interrupts play.
  }
}
