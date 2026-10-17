import { timeline, type PublicGiveaway } from './live';

export type ExperienceState = 'preview'|'ready'|'preparing'|'countdown'|'drawing'|'revealing'|'verifying'|'completed'|'disqualified'|'unavailable';
export function experienceState(state:PublicGiveaway,now:number):ExperienceState {
  if(!state.available)return 'unavailable';
  if(!state.round)return state.config.scheduledFor&&now>=Date.parse(state.config.scheduledFor)?'ready':'preview';
  const phase=timeline(state,now).phase;
  if(phase==='waiting')return 'preparing';
  if(phase==='countdown')return 'countdown';
  if(phase==='spinning')return 'drawing';
  if(phase==='revealing')return 'revealing';
  if(state.winnerStatus==='disqualified')return 'disqualified';
  return state.winnerStatus==='confirmed'?'completed':'verifying';
}
export function countdownParts(remaining:number){
  const seconds=Math.max(0,Math.ceil(remaining/1000));
  return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
}
// The trajectory represents the recorded selection. Only the server winner can occupy the final slot.
export function reelPosition(progress:number){return 72*(1-Math.pow(1-Math.max(0,Math.min(1,progress)),3));}
