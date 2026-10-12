// Cosmetic choreography only. Every puncher is recorded by the authenticated server.
import {clamp,smooth} from './elf-math.js';
import {puppetHand,puppetIds,puppetRigs} from './punch-puppet.js';
export {clamp,smooth} from './elf-math.js';
export const BONK_WINDOW=5000,BONKS_TO_GAG=5,PUNCH_DURATION=1200,PUNCH_IMPACT=590,RETALIATION_DURATION=9000;
export const RETALIATION_LINE='Right, you little fuck, come here';
export const newElfReaction=()=>({version:3,hits:[],gagAt:0,gagUntil:0,culprit:null});
export function bonkElf(previous,id,direction,now,actor={id:'',avatar:0,name:''}){
 const r=previous?.version===3?previous:newElfReaction();
 if(now<r.gagUntil||r.hits.some(h=>h.id===id))return r;
 const history=r.gagUntil?[]:r.hits.filter(h=>now-h.endAt<4000);
 if(history.filter(h=>h.endAt>now).length>=5)return r;
 const startAt=Math.max(now,history.at(-1)?.endAt||0),endAt=startAt+PUNCH_DURATION;
 const hit={id,requestedAt:now,startAt,at:startAt+PUNCH_IMPACT,endAt,direction,actor:{id:actor.id,avatar:actor.avatar,name:actor.name}};
 const hits=[...history,hit].slice(-8),enough=hits.filter(h=>now-h.requestedAt<BONK_WINDOW).length>=BONKS_TO_GAG;
 const gagAt=enough?endAt+120:0;
 return {version:3,hits,gagAt,gagUntil:enough?gagAt+RETALIATION_DURATION:0,culprit:enough?hit.actor:null};
}
const mix=(a,b,t)=>a+(b-a)*t;
const sideFor=avatar=>[1,3].includes(avatar)?-1:1;
export function punchPose(age,reduced=false,side=1){
 const enter=smooth(0,390,age),leave=smooth(880,PUNCH_DURATION,age),strike=smooth(465,PUNCH_IMPACT,age)*(1-smooth(625,795,age));
 const stride=Math.sin(age/47)*(1-enter+leave);
 return {x:side===1?(reduced?145:mix(-110,132,enter)-242*leave+strike*13):(reduced?400:mix(590,413,enter)+177*leave-strike*13),y:reduced?336:336-Math.abs(stride)*6,opacity:smooth(0,100,age)*(1-smooth(1100,1200,age)),lean:reduced?0:stride*2+strike*9,upper:reduced?-48:mix(-105,-48,strike),fore:reduced?0:mix(115,0,strike),gait:reduced?0:stride*15,scale:.19};
}
// The victim uses their own rig. The fifth puncher stays on stage and becomes the rope occupant.
function retaliation(r,t,reduced,avatar){
 const id=puppetIds[avatar]||'jack',side=puppetRigs[id].side,culprit=r.culprit;
 const walk=smooth(700,2200,t),returning=smooth(7400,8450,t),blend=smooth(650,1100,t)*(1-smooth(8100,8750,t));
 const grab=smooth(2150,2850,t),wind=smooth(3000,3650,t),release=smooth(3650,4250,t),relax=smooth(4500,5100,t);
 const moving=(1-smooth(1800,2200,t))*smooth(700,950,t)+smooth(7400,7600,t)*(1-smooth(8250,8450,t));
 const retaliator={x:reduced?260-side*110:260-side*110*walk*(1-returning),y:336-(reduced?0:Math.abs(Math.sin(t/73))*4*moving),opacity:blend,lean:reduced?0:grab*5*(1-relax),upper:mix(-12,-48,grab)-24*wind+47*release-15*relax,fore:mix(10,0,grab),gait:reduced?0:Math.sin(t/73)*14*moving,scale:.19};
 const hand=puppetHand(id,retaliator),held=punchPose(850,reduced,sideFor(culprit.avatar));
 const switchBody=smooth(2500,2950,t),fly=smooth(3650,4550,t),lower=smooth(6500,7100,t),leave=smooth(7100,8200,t);
 // A fixed release point makes the flight independent of the follow-through arm.
 const releasePose={...retaliator,x:260-side*110,y:336,lean:reduced?0:5,upper:-72,fore:0,gait:0};
 const releaseHand=puppetHand(id,releasePose);
 let x=t<3650?hand[0]+side*25:mix(releaseHand[0]+side*25,260,fly);
 let y=t<3650?hand[1]-163:mix(releaseHand[1]-163,-37,fly)-(reduced?0:Math.sin(fly*Math.PI)*12);
 if(t>=4550){x=260;y=mix(-37,0,lower);}
 if(t>=7100)x=mix(260,sideFor(culprit.avatar)===1?-110:590,leave);
 const swing=reduced?0:t<4550?-side*Math.sin(fly*Math.PI)*55:Math.sin((t-4550)/180)*10*Math.exp(-(t-4550)/1700)*(1-lower);
 const attacker={...held,x:reduced?260:mix(held.x,hand[0]+side*25,smooth(900,2500,t)),upper:mix(held.upper,-12,smooth(0,800,t)),fore:mix(held.fore,10,smooth(0,800,t)),gait:reduced?0:Math.sin(t/70)*12*smooth(900,1150,t)*(1-smooth(2250,2500,t)),opacity:1-switchBody};
 const occupant={actor:culprit,x:(reduced?260:x)-205,y:reduced?0:y,angle:swing,nap:smooth(4750,5200,t)*(1-smooth(6650,7200,t)),opacity:switchBody*(1-smooth(7800,8300,t))};
 return {mode:t<2150?'retort':t<3650?'grab':t<4550?'throw':t<6500?'dangle':'reset',retaliator,attacker,occupant,culprit,
  targetOpacity:1-blend,targetY:reduced?0:10*smooth(0,450,t)*(1-returning),
  rope:smooth(4200,4550,t)*(1-smooth(6800,7100,t)),ropeY:reduced?163:126+37*lower,
  quote:smooth(0,120,t)*(1-smooth(1950,2200,t)),quoteId:t<2200?`${r.gagAt}:${culprit.id}`:null};
}
export function elfScene(reaction,now,reduced=false,avatar=0){
 const r=reaction?.version===3?reaction:newElfReaction(),finalHit=r.hits.at(-1);
 const gag=!!r.culprit&&now>=r.gagAt&&now<r.gagUntil;
 const held=!!r.culprit&&finalHit&&now>=finalHit.startAt&&now<r.gagAt;
 const hit=r.hits.find(h=>now>=h.startAt&&now<h.endAt)||(held?finalHit:null);
 const latest=[...r.hits].reverse().find(h=>now>=h.at),age=latest?now-latest.at:Infinity;
 let angle=0,impact=0;
 for(const h of r.hits){const dt=(now-h.at)/1000;if(dt<0||dt>3.5)continue;angle+=h.direction*24*Math.sin(dt*10)*Math.exp(-dt*1.7);impact+=Math.sin(Math.min(1,dt/.18)*Math.PI)*Math.exp(-dt*7);}
 angle=clamp(angle,-24,24);
 const p=gag?retaliation(r,now-r.gagAt,reduced,avatar):null;
 return {mode:p?.mode||(hit?age<400?'ouch':'punch':age<2000?'dizzy':'idle'),locked:now<r.gagUntil,hit,impactId:!gag&&latest&&age<500?latest.id:null,
  attackerActor:p?.culprit||hit?.actor||null,
  attacker:p?.attacker||(hit?punchPose(held?Math.min(850,now-hit.startAt):now-hit.startAt,reduced,sideFor(hit.actor.avatar)):null),
  target:{x:55,y:p?.targetY||0,angle:reduced?0:gag?angle*(1-smooth(0,400,now-r.gagAt)):angle,squash:reduced?1:1-clamp(impact)*.04,nap:0,opacity:p?.targetOpacity??1},
  retaliator:p?.retaliator||null,occupant:p?.occupant||null,culprit:p?.culprit||null,quote:p?.quote||0,quoteId:p?.quoteId||null,
  rope:p?.rope||0,ropeY:p?.ropeY||163,stars:age<2400&&!gag?1-age/2400:0,orbit:reduced?0:(now/11)%360,
  ouch:!gag&&age<520?1:0,flash:!gag&&age<200?1-age/200:0};
}
