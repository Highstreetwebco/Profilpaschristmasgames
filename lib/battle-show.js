import {clamp} from './elf-math.js';
export const BOMB_LEAD=350,BOMB_RELEASE=150,BOMB_IMPACT=1800;
const names={jack:'Jack',stu:'Stu',lauren:'Lauren',richard:'Richard','practice-navy':'Santa'};
export const hitLines=["Fuck you!","Take that, nerd!","Eat shit, motherfucker!","Lick and split, bitch!","Suck on that one, big boy!","Missile up the arse!","Suck on it!","Take that one, you bitch!","Get fucked!","Got ya, bitch!","Ohh, it's a big one, boys!","Nerd!","Slippery when wet, like your mum!","Ohh, come on! Let's ride it down to pound town!","Right in the fanny!","Suck a big one, captain cock-up!","Absolute bellend behaviour right there!"];
const misses=["Well, that was fucking useless.","Lovely shot. If you were aiming at absolutely fuck all.","You couldn't hit water from a bloody boat.","Another fish traumatised. Well done.","Straight into the sea. Top work, captain cock-up."];
const sinkLines={jack:["Jack's ship has gone down quicker than his discount margin.","That's one less ship for Jack to try and sell you."],stu:["Stu's ship has been relegated to the sea bed.","Save the Guinness! Fuck the ship, save the Guinness!"],lauren:["Lauren's ship is underwater. Her vape is still going.","That's not sea mist. Lauren's having a bloody vape."],richard:["Richard, that ship's fucked. Does BMW do submarines?","Richard's gone for the optional underwater parking."],'practice-navy':["Santa's sunk. Christmas is now collection only."]};
export function battleLines(event){
 const lines=[];
 if(event.hit)lines.push({at:BOMB_IMPACT,speaker:event.attacker,text:hitLines[event.id%hitLines.length]});
 // Give the first line enough time to finish before the reply starts.
 const replyAt=BOMB_IMPACT+Math.max(1450,(lines[0]?.text.length||0)*60+500);
 if(event.sunkShip){
  const choices=sinkLines[event.target]||["You sunk my bloody ship!"];
  const special=event.target==='richard'&&event.sunkShip==='Patrol boat';
  const text=special?"You sunk Richard's small willy. I mean ship! Ship! Sorry!":event.id%3===0?'Tickle me pink, made you sink!':choices[event.id%choices.length];
  lines.push({at:replyAt,speaker:special||event.id%3===0?event.attacker:event.target,text});
 }else if(!event.hit)lines.push({at:BOMB_IMPACT+250,speaker:event.attacker,text:misses[event.id%misses.length]});
 else if(event.id%4===0)lines.push({at:replyAt,speaker:event.target,text:["Oi! You absolute bastard.","That was my fucking ship!","Right. You're getting it next turn."][Math.floor(event.id/4)%3]});
 return lines.map(line=>({...line,name:names[line.speaker]||'Captain',until:line.at+Math.max(1400,line.text.length*60+450)}));
}
export function scheduleBomb(event,now,previousEnd=0){const startsAt=Math.max(now+BOMB_LEAD,previousEnd+150),lines=battleLines(event),duration=Math.max(3300,...lines.map(line=>line.until+250));return {...event,startsAt,impactAt:startsAt+BOMB_IMPACT,endsAt:startsAt+duration,lines};}
export function activeBomb(events,now){return events.find(e=>Number.isFinite(e.startsAt)&&now>=e.startsAt&&now<e.endsAt)||null;}
// A quadratic flight path and its tangent keep the missile pointing forwards.
export function missileScene(event,now,geometry,reduced=false){
 const t=now-event.startsAt,{source,target}=geometry;
 const impact=event.impactAt-event.startsAt,release=Math.min(BOMB_RELEASE,impact),flight=clamp((t-release)/(impact-release));
 const distance=Math.hypot(target.x-source.x,target.y-source.y),control={x:(source.x+target.x)/2,y:Math.min(source.y,target.y)-Math.min(90,distance*.3)};
 const inv=1-flight,x=inv*inv*source.x+2*inv*flight*control.x+flight*flight*target.x,y=inv*inv*source.y+2*inv*flight*control.y+flight*flight*target.y;
 const dx=2*inv*(control.x-source.x)+2*flight*(target.x-control.x),dy=2*inv*(control.y-source.y)+2*flight*(target.y-control.y);
 const blast=clamp((t-impact)/1200),line=event.lines?.find(l=>t>=l.at&&t<l.until)||null;
 return {missile:{x,y,angle:Math.atan2(dy,dx)*180/Math.PI+90,visible:!reduced&&t>=release&&t<impact,progress:flight},blast:{x:target.x,y:target.y,visible:t>=impact&&t<impact+1200,progress:blast,scale:reduced?1:event.hit?.35+Math.sin(Math.min(1,blast*2)*Math.PI/2)*2.1:.4+blast*1.7,opacity:1-blast},line,shake:!reduced&&event.hit&&blast>0&&blast<.4?Math.sin(blast*160)*(1-blast/.4)*4:0};
}
export function battleCues(event){return [{key:`${event.id}:launch`,at:event.startsAt+BOMB_RELEASE,kind:'launch'},{key:`${event.id}:impact`,at:event.impactAt,kind:event.hit?'explosion':'splash'},...(event.lines||[]).map((line,i)=>({key:`${event.id}:voice:${i}`,at:event.startsAt+line.at,kind:'voice',line}))];}
