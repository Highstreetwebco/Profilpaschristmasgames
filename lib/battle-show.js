import {clamp,smooth} from './elf-math.js';
import {puppetHand} from './punch-puppet.js';
export const BOMB_LEAD=350,BOMB_RELEASE=1350,BOMB_IMPACT=2050;
const names={jack:'Jack',stu:'Stu',lauren:'Lauren',richard:'Richard','practice-navy':'Santa'};
const misses=["Well, that was fucking useless.","Lovely shot. If you were aiming at absolutely fuck all.","You couldn't hit water from a bloody boat.","Another fish traumatised. Well done.","Straight into the sea. Top work, captain cock-up."];
const sinkLines={jack:["Jack's ship has gone down quicker than his discount margin.","That's one less ship for Jack to try and sell you."],stu:["Stu's ship has been relegated to the sea bed.","Save the Guinness! Fuck the ship, save the Guinness!"],lauren:["Lauren's ship is underwater. Her vape is still going.","That's not sea mist. Lauren's having a bloody vape."],richard:["Richard, that ship's fucked. Does BMW do submarines?","Richard's gone for the optional underwater parking."],'practice-navy':["Santa's sunk. Christmas is now collection only."]};
export function battleLines(event){
 const lines=[];
 if(event.hit)lines.push({at:BOMB_IMPACT,speaker:event.attacker,text:'Fuck you!'});
 if(event.sunkShip){
  const choices=sinkLines[event.target]||["You sunk my bloody ship!"];
  const text=event.target==='richard'&&event.sunkShip==='Patrol boat'?"You sunk Richard's small willy. I mean ship! Ship! Sorry!":choices[event.id%choices.length];
  lines.push({at:BOMB_IMPACT+1350,speaker:event.target==='richard'&&event.sunkShip==='Patrol boat'?event.attacker:event.target,text});
 }else if(event.eliminated)lines.push({at:BOMB_IMPACT+1350,speaker:event.target,text:'No ships. No dignity. Merry Christmas.'});
 else if(!event.hit)lines.push({at:BOMB_IMPACT+250,speaker:event.attacker,text:misses[event.id%misses.length]});
 else if(event.id%3===0)lines.push({at:BOMB_IMPACT+1250,speaker:event.target,text:["Oi! You absolute bastard.","That was my fucking ship!","Right. You're getting it next turn."][Math.floor(event.id/3)%3]});
 return lines.map(line=>({...line,name:names[line.speaker]||'Captain',until:line.at+Math.max(1400,line.text.length*48+500)}));
}
export function scheduleBomb(event,now,previousEnd=0){const startsAt=Math.max(now+BOMB_LEAD,previousEnd+150),lines=battleLines(event),duration=Math.max(4350,...lines.map(line=>line.until+250));return {...event,startsAt,impactAt:startsAt+BOMB_IMPACT,endsAt:startsAt+duration,lines};}
export function activeBomb(events,now){return events.find(e=>Number.isFinite(e.startsAt)&&now>=e.startsAt&&now<e.endsAt)||null;}
const mix=(a,b,t)=>a+(b-a)*t;
export function bombScene(event,now,geometry,id='jack',reduced=false){
 const t=now-event.startsAt,{source,target,stand,height}=geometry,scale=height/1400;
 const approach=smooth(0,1150,t),retreat=smooth(2850,4050,t),walk=t<1150?Math.sin(t/80)*22:t>=2850&&t<4050?Math.sin((t-2850)/80)*22:0;
 const location=reduced?stand:{x:mix(mix(source.x,stand.x,approach),source.x,retreat),y:mix(mix(source.y,stand.y,approach),source.y,retreat)};
 const arm=-34+smooth(1100,BOMB_RELEASE,t)*28-smooth(BOMB_RELEASE,2400,t)*8;
 const pose={x:location.x,y:location.y-(reduced?0:Math.abs(walk)*.09),scale,opacity:reduced?1:(smooth(0,180,t)*(1-smooth(4050,4250,t))),lean:reduced?0:t<1150?5:0,upper:arm,fore:-45,gait:reduced?0:walk};
 const releasePose={...pose,x:stand.x,y:stand.y,upper:-6,fore:-45,gait:0,lean:0},hand=puppetHand(id,pose),release=puppetHand(id,releasePose),flight=clamp((t-BOMB_RELEASE)/(BOMB_IMPACT-BOMB_RELEASE));
 const bomb=t<BOMB_RELEASE?{x:hand[0],y:hand[1]}:{x:mix(release[0],target.x,flight),y:mix(release[1],target.y,flight)-Math.sin(flight*Math.PI)*Math.min(80,height*.8)};
 const blast=clamp((t-BOMB_IMPACT)/850),line=event.lines?.find(l=>t>=l.at&&t<l.until)||null;
 return {pose: t>=0&&t<4250?pose:null,bomb:{...bomb,visible:!reduced&&t>=0&&t<BOMB_IMPACT,angle:flight*280},blast:{x:target.x,y:target.y,visible:t>=BOMB_IMPACT&&t<BOMB_IMPACT+850,progress:blast,scale:reduced?1:.4+blast*1.8,opacity:1-blast},line,phase:t<BOMB_RELEASE?'running':t<BOMB_IMPACT?'dropping':t<2850?'impact':'returning'};
}
export function battleCues(event){return [{key:`${event.id}:run`,at:event.startsAt,kind:'run'},{key:`${event.id}:fall`,at:event.startsAt+BOMB_RELEASE,kind:'fall'},{key:`${event.id}:impact`,at:event.impactAt,kind:event.hit?'explosion':'splash'},...(event.lines||[]).map((line,i)=>({key:`${event.id}:voice:${i}`,at:event.startsAt+line.at,kind:'voice',line}))];}
