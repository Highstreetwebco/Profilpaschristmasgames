import {clamp} from './elf-math.js';
export const BOMB_LEAD=350,BOMB_RELEASE=150,BOMB_IMPACT=1800;
const names={jack:'Jack',stu:'Stu',lauren:'Lauren',richard:'Richard','practice-navy':'Santa'};
export const hitLines=[
 "Fuck you!","Take that, nerd!","Eat shit, motherfucker!","Lick and split, bitch!","Suck on that one, big boy!","Missile up the arse!","Suck on it!","Take that one, you bitch!","Get fucked!","Got ya, bitch!","Ohh, it's a big one, boys!","Nerd!","Slippery when wet, like your mum!","Ohh, come on! Let's ride it down to pound town!","Right in the fanny!","Suck a big one, captain cock-up!","Absolute bellend behaviour right there!",
 "Direct hit, you absolute weapons-grade bellend!","Special delivery, you cheeky fucker!","Have some of that, you soggy bastard!","Boom! Right in the fucking biscuits!","That's your no-claims bonus fucked!","Oh, get absolutely shafted!","Consider your shit thoroughly wrecked!","Knock knock. It's a fucking missile!","That's a spicy fucking meatball!","You ordered a trim. I delivered a fucking torpedo!","Straight through your shitbox!","Bang! You nautical knob jockey!","Your boat's got a new arsehole!","Nice ship. Be a shame if someone fucked it!","That's not a leak. That's a fucking entrance!","Get that down your chimney, you bastard!","Merry fucking Christmas, captain!","Ho ho holy shit, what a hit!","Signed, sealed, fucking detonated!","Bollocks firmly obliterated!","Boom, you bargain-bin bastard!","You can shove that warranty up your arse!","Direct hit. Send the invoice, dickhead!","Another hole for you to fucking explain!","How's that for customer fucking service?","That'll buff out. Will it fuck!","Absolute fucking scenes!","Chew on that, you cocky little shit!","That's your afternoon properly fucked!","Bang on target, you massive helmet!","Quality finish. Shit day for you!","That's a five-star fucking demolition!","No returns, no refunds, get fucked!","Tell your insurance I said bollocks!","Consider that a strongly worded fucking missile!","You brought a boat to a bastard fight!","Boom! Promotion to chief shit magnet!","That ship's looking a bit fucking ventilated!","You're leaking like a fucked shower tray!","Waterproofing? You've absolutely fucked it!","Right up the exhaust, sunshine!","That's what I call a fucking movement joint!","Precision delivery, you useless deck ornament!","Your hull's got more gaps than your fucking grout!","Have that, you festive little gobshite!","A lovely big parcel of fuck off!","Deck the hulls with bits of bollocks!"
];
export const missLines=[
 "Well, that was fucking useless.","Lovely shot. If you were aiming at absolutely fuck all.","You couldn't hit water from a bloody boat.","Another fish traumatised. Well done.","Straight into the sea. Top work, captain cock-up.",
 "You couldn't hit a fucking barn from inside it!","All that build-up for absolutely fuck all!","Did you aim that with your arse?","A million quid to scare a fucking cod!","The fish would like you to fuck off!","Shit shot, Sherlock!","You're about as accurate as a fucking weather forecast!","Try opening your eyes, you massive bellend!","That missile needs a fucking satnav!","Even the sea's embarrassed for you!","Your aim's gone to shit, hasn't it?","That was a warning shot. To your fucking dignity!","Some poor prawn's had his bollocks blown off!","Nothing but wet disappointment. Again!","You couldn't set out a fucking bathroom!","Wrong postcode, you absolute knob!","Have you tried aiming at the fucking boat?","That shot came with free disappointment!","Not even close, you soggy shit trumpet!","You've just tiled the wrong fucking ocean!","More splash than a pissed-up bath time!","A beautiful demonstration of fuck-all accuracy!","The only thing you hit was rock fucking bottom!"
];
export const retortLines=[
 "Oi! You absolute bastard.","That was my fucking ship!","Right. You're getting it next turn.","You cheeky little shit!","I hope your next pint's fucking warm!","Keep laughing, you smug bastard!","I'm putting that on your fucking invoice!","That's coming out of your Christmas bonus!","You owe me a fucking boat!","I've just had that bastard serviced!","Oh, you can properly fuck off now!","That's my deposit fucked!","Who taught you to be such a little shit?","I've seen better manners in a fucking skip!","I'm billing you for the fucking hole!","You vindictive little deck goblin!","I'm not angry. I'm fucking furious!","Right, your name's on the bastard list!","I'm telling Santa you're a right little fucker!","I hope you step in wet grout!"
];
export const generalSinkLines=[
 "Tickle me pink, made you sink!","Your ship's fucked. Properly fucked!","Congratulations. You're a fucking submarine!","Rest in piss, you rusty bastard!","Captain Bellend has left the fucking vessel!","That's not a fleet. That's a fucking scrap pile!","One boat down. All dignity fucking gone!","Merry Christmas, you sunken little shit!","Your boat's now a fucking fish toilet!","Abandon ship, you magnificent bastards!","That's the Titanic from fucking Temu!","You've been promoted to underwater twat!","Another satisfied customer at Fuck Off Ferries!","You wanted a cruise. You got a fucking bath!","Ship happens, you unlucky bastard!","Bollocks. The sea's repossessed it!","That's your fucking company boat written off!","The fish have got a new fucking clubhouse!"
];
export const captainSinkLines={
 jack:["Jack's ship has gone down quicker than his discount margin.","That's one less ship for Jack to try and sell you.","Jack's quoted for a ship and delivered a fucking submarine!","Jack, your margin and your boat are both fucked!","Put that on the monthly report, Jack. Absolute bollocks!","Jack's boat is back-ordered to the fucking seabed!"],
 stu:["Stu's ship has been relegated to the sea bed.","Save the Guinness! Fuck the ship, save the Guinness!","Stu's boat has more holes than City's fucking accounts!","League One called, Stu. Even they don't want that shit!","Guinness overboard! Now it's a proper fucking emergency!","Stu's ship has failed financial fucking fair play!"],
 lauren:["Lauren's ship is underwater. Her vape is still going.","That's not sea mist. Lauren's having a bloody vape.","Lauren's boat is fucked. Someone rescue the vape!","Lauren's now vaping at twenty fucking fathoms!","The ship's gone. The vape's still got fucking battery!","Lauren's brought a vape to a fucking torpedo fight!"],
 richard:["Richard, that ship's fucked. Does BMW do submarines?","Richard's gone for the optional underwater parking.","Richard's paid extra for fucking submarine mode!","Even a BMW badge can't save that shit, Richard!","Richard's boat sank without using its fucking indicators!","Richard, your warranty doesn't cover being a bellend!"],
 'practice-navy':["Santa's sunk. Christmas is now collection only.","Santa's fleet is fucked. Tell the elves to walk!","Ho ho holy fuck, Santa's gone down!","Rudolph, fetch the fucking recovery truck!"]
};
// Per-room shuffle bags: every line in a category plays before any repeats.
// Only the selected, persisted captions go to clients, so everyone hears the same joke.
export function drawBattleLine(state,key,pool,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/0x100000000){
 let bag=state[key];if(!bag||bag.size!==pool.length)bag=state[key]={size:pool.length,remaining:[],last:-1};
 if(!bag.remaining.length)bag.remaining=pool.map((_,i)=>i);
 const options=bag.remaining.length>1?bag.remaining.filter(i=>i!==bag.last):bag.remaining;
 const selected=options[Math.min(options.length-1,Math.floor(random()*options.length))];
 bag.remaining.splice(bag.remaining.indexOf(selected),1);bag.last=selected;return pool[selected];
}
export function battleLines(event,draw){
 const pick=(key,pool)=>draw?draw(key,pool):pool[event.id%pool.length],lines=[];
 if(event.hit)lines.push({at:BOMB_IMPACT,speaker:event.attacker,text:pick('hit',hitLines)});
 const replyAt=BOMB_IMPACT+Math.max(1450,(lines[0]?.text.length||0)*60+500);
 if(event.sunkShip){
  const special=event.target==='richard'&&event.sunkShip==='Patrol boat';
  const text=special?"You sunk Richard's small willy. I mean ship! Ship! Sorry!":event.id%3===0?pick('sink',generalSinkLines):pick(`sink:${event.target}`,captainSinkLines[event.target]||generalSinkLines);
  lines.push({at:replyAt,speaker:event.attacker,text});
 }else if(!event.hit)lines.push({at:BOMB_IMPACT+250,speaker:event.target,text:pick('miss',missLines)});
 else if(event.id%4===0)lines.push({at:replyAt,speaker:event.target,text:pick('retort',retortLines)});
 return lines.map(line=>({...line,name:names[line.speaker]||'Captain',until:line.at+Math.max(1400,line.text.length*60+450)}));
}
export function scheduleBomb(event,now,previousEnd=0,draw){const startsAt=Math.max(now+BOMB_LEAD,previousEnd+150),lines=battleLines(event,draw),duration=Math.max(3300,...lines.map(line=>line.until+250));return {...event,startsAt,impactAt:startsAt+BOMB_IMPACT,endsAt:startsAt+duration,lines};}
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
