// Cosmetic only: never reads or changes a word, a life or a score.
export const BONK_WINDOW=4000, BONKS_TO_SLEEP=5, ELF_SLEEP_MS=7500;
export const newElfReaction=()=>({hits:[],sleepAt:0,sleepUntil:0});
export function bonkElf(previous,id,direction,now){
 const r=previous||newElfReaction();
 if((r.sleepUntil&&now<r.sleepUntil+700)||r.hits.some(h=>h.id===id))return r;
 const hits=[...r.hits.filter(h=>now-h.at<BONK_WINDOW),{id,at:now,direction}].slice(-BONKS_TO_SLEEP);
 return {hits,sleepAt:hits.length>=BONKS_TO_SLEEP?now:0,sleepUntil:hits.length>=BONKS_TO_SLEEP?now+ELF_SLEEP_MS:0};
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
export function elfPose(r,now,reduced=false){
 const last=r.hits.at(-1),age=last?Math.max(0,now-last.at):Infinity;
 const sleeping=!!r.sleepUntil&&now<r.sleepUntil+700;
 const nap=r.sleepAt?smooth((now-r.sleepAt)/550)*(1-smooth((now-r.sleepUntil)/700)):0;
 let angle=0,impact=0;
 for(const h of r.hits){const t=(now-h.at)/1000;if(t<0||t>4)continue;angle+=h.direction*29*Math.sin(t*10)*Math.exp(-t*1.35);impact+=Math.sin(Math.min(1,t/.18)*Math.PI)*Math.exp(-t*7);}
 angle=clamp(angle,-27,27)*(1-nap)+nap*15;
 const mode=sleeping?'sleep':age<650?'ouch':age<3000&&r.hits.length>1?'dizzy':'idle';
 return {angle:reduced?0:angle,drop:reduced?0:nap*(12+Math.sin(now/420)*1.6),squash:reduced?1:1-clamp(impact,0,1)*.045,nap,mode,age,stars:!sleeping&&age<2800?clamp(1-age/3200,0,1):0,orbit:reduced?0:(now/11)%360};
}
