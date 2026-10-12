// Cosmetic choreography only. Identity comes from the authenticated room player.
export const BONK_WINDOW=5000,BONKS_TO_GAG=5,PUNCH_DURATION=1200,PUNCH_IMPACT=590,HANGMAN_DURATION=6400;
export const newElfReaction=()=>({version:2,hits:[],gagAt:0,gagUntil:0});
export function bonkElf(previous,id,direction,now,actor={id:'',avatar:0,name:''}){
 const r=previous?.version===2?previous:newElfReaction();
 if(now<r.gagUntil||r.hits.some(h=>h.id===id))return r;
 const history=r.gagUntil?[]:r.hits.filter(h=>now-h.endAt<4000);
 if(history.filter(h=>h.endAt>now).length>=5)return r;
 const startAt=Math.max(now,history.at(-1)?.endAt||0),endAt=startAt+PUNCH_DURATION;
 const hit={id,requestedAt:now,startAt,at:startAt+PUNCH_IMPACT,endAt,direction,actor:{id:actor.id,avatar:actor.avatar,name:actor.name}};
 const hits=[...history,hit].slice(-8),enough=hits.filter(h=>now-h.requestedAt<BONK_WINDOW).length>=BONKS_TO_GAG;
 const gagAt=enough?endAt+120:0;
 return {version:2,hits,gagAt,gagUntil:enough?gagAt+HANGMAN_DURATION:0};
}
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function punchPose(age,reduced=false,side=1){
 const enter=smooth(0,390,age),leave=smooth(880,PUNCH_DURATION,age),strike=smooth(465,PUNCH_IMPACT,age)*(1-smooth(625,795,age));
 const stride=Math.sin(age/47)*(1-enter+leave);
 return {x:side===1?(reduced?145:mix(-110,132,enter)-242*leave+strike*13):(reduced?400:mix(590,413,enter)+177*leave-strike*13),y:reduced?336:336-Math.abs(stride)*6,opacity:smooth(0,100,age)*(1-smooth(1100,1200,age)),lean:reduced?0:stride*2+strike*9,upper:reduced?-48:mix(-105,-48,strike),fore:reduced?0:mix(115,0,strike),gait:reduced?0:stride*15,scale:.19};
}
export function elfScene(reaction,now,reduced=false){
 const r=reaction?.version===2?reaction:newElfReaction();
 const hit=r.hits.find(h=>now>=h.startAt&&now<h.endAt)||null;
 const latest=[...r.hits].reverse().find(h=>now>=h.at),age=latest?now-latest.at:Infinity;
 const gag=now>=r.gagAt&&now<r.gagUntil,t=gag?now-r.gagAt:0;
 const enter=smooth(0,1200,t),exit=smooth(5250,6400,t),grab=smooth(1250,1900,t)*(1-smooth(3400,3900,t));
 const lift=smooth(2150,3150,t)*(1-smooth(4500,5250,t));
 const rope=gag?smooth(1750,2150,t)*(1-smooth(5100,5500,t)):0;
 let angle=0,impact=0;
 for(const h of r.hits){const dt=(now-h.at)/1000;if(dt<0||dt>3.5)continue;angle+=h.direction*24*Math.sin(dt*10)*Math.exp(-dt*1.7);impact+=Math.sin(Math.min(1,dt/.18)*Math.PI)*Math.exp(-dt*7);}
 angle=clamp(angle,-24,24);
 const nap=gag?smooth(2400,3000,t)*(1-smooth(4600,5300,t)):0;
 const mode=gag?t<1250?'hangman-enter':t<2150?'grab':t<4500?'dangle':'reset':hit?age<400?'ouch':'punch':age<2000?'dizzy':'idle';
 return {mode,locked:now<r.gagUntil,hit,impactId:latest&&age<500?latest.id:null,attacker:hit?punchPose(now-hit.startAt,reduced,[1,3].includes(hit.actor.avatar)?-1:1):null,
  target:{x:55,y:reduced||!lift?0:-48*lift,angle:reduced?0:gag?angle*(1-smooth(0,300,t))+Math.sin((t-3150)/210)*7*lift*smooth(3150,3500,t):angle,squash:reduced?1:1-clamp(impact)*.04,nap},
  hangman:gag?{x:reduced?137:mix(-110,137,enter)-247*exit,y:reduced?336:336-Math.abs(Math.sin(t/78))*(1-enter+exit)*5,opacity:smooth(0,150,t)*(1-smooth(6120,6400,t)),lean:reduced?0:grab*6,upper:mix(-10,-53-20*lift,grab),fore:mix(0,13,grab),gait:reduced?0:Math.sin(t/80)*(1-enter+exit)*13,scale:.205}:null,
  rope,ropeY:163-(reduced?0:48*lift),stars:age<2400&&!gag?1-age/2400:0,orbit:reduced?0:(now/11)%360,
  ouch:!gag&&age<520?1:0,flash:!gag&&age<200?1-age/200:0};
}
