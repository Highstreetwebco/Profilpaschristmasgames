'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {activeBomb,missileScene,battleCues} from '../lib/battle-show.js';
import type {BattleEvent} from './Battleships';
import type {createBattleAudio} from '../lib/battle-audio';
type Props={arena:RefObject<HTMLDivElement|null>;events:BattleEvent[];clockOffset:number;audio:RefObject<ReturnType<typeof createBattleAudio>|null>};
export default function BattleMissile(props:Props){
 const missile=useRef<HTMLDivElement>(null),impact=useRef<HTMLDivElement>(null),bubble=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const host=latest.current.arena.current;if(!host)return;const arena=host;
  let frame=0,dirty=true,lastEvent=-1,geometry:{source:{x:number;y:number};target:{x:number;y:number}}|null=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),seen=new Set<string>(),joinedAt=Date.now()+latest.current.clockOffset;
  const observer=new ResizeObserver(()=>{dirty=true;});observer.observe(arena);
  const local=(element:Element)=>{const a=arena.getBoundingClientRect(),b=element.getBoundingClientRect(),sx=arena.clientWidth/a.width,sy=arena.clientHeight/a.height;return {x:(b.left-a.left+b.width/2)*sx,y:(b.top-a.top+b.height/2)*sy};};
  function animate(){
   const now=Date.now()+latest.current.clockOffset,event=activeBomb(latest.current.events,now) as BattleEvent|null;
   for(const e of latest.current.events)if(e.startsAt)for(const cue of battleCues(e)){if(seen.has(cue.key)||now<cue.at)continue;seen.add(cue.key);if(cue.at>=joinedAt-100&&now-cue.at<700)latest.current.audio.current?.play(cue.kind,'line' in cue?cue.line:undefined);}
   if(event){
    if(dirty||lastEvent!==event.id){const source=arena.querySelector(`[data-fleet="${event.attacker}"] .sea-water`),target=arena.querySelector(`[data-fleet="${event.target}"] [data-position="${event.position}"]`);geometry=source&&target?{source:local(source),target:local(target)}:null;dirty=false;lastEvent=event.id;}
    if(geometry){const scene=missileScene(event,now,geometry,reduced.matches);
     if(missile.current){missile.current.style.opacity=scene.missile.visible?'1':'0';missile.current.style.transform=`translate(${scene.missile.x}px,${scene.missile.y}px) rotate(${scene.missile.angle}deg)`;}
     if(impact.current){impact.current.className=`naval-impact ${event.hit?'bomb-hit':'bomb-miss'}`;impact.current.style.opacity=scene.blast.visible?String(scene.blast.opacity):'0';impact.current.style.transform=`translate(${scene.blast.x+scene.shake}px,${scene.blast.y}px) scale(${scene.blast.scale})`;}
     if(bubble.current){const line=scene.line;textBubble(line?`${line.name}: “${line.text}”`:'');const width=Math.min(260,arena.clientWidth-16),anchor=line?.speaker===event.attacker?geometry.source:geometry.target;bubble.current.style.width=`${width}px`;bubble.current.style.left=`${Math.max(8,Math.min(arena.clientWidth-width-8,anchor.x-width/2))}px`;bubble.current.style.top=`${Math.max(5,Math.min(arena.clientHeight-85,anchor.y-90))}px`;}
    }
   }else{if(missile.current)missile.current.style.opacity='0';if(impact.current)impact.current.style.opacity='0';textBubble('');}
   frame=requestAnimationFrame(animate);
  }
  function textBubble(text:string){if(!bubble.current)return;if(bubble.current.textContent!==text)bubble.current.textContent=text;bubble.current.style.opacity=text?'1':'0';}
  frame=requestAnimationFrame(animate);return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[]);
 return <div className="naval-animation" aria-hidden="true"><div ref={missile} className="naval-missile"><svg viewBox="0 0 44 100"><defs><linearGradient id="missile-metal" x1="0" x2="1"><stop stopColor="#677f8b"/><stop offset=".48" stopColor="#f5f4dc"/><stop offset="1" stopColor="#78919b"/></linearGradient></defs><path className="missile-flame" d="M15 62 Q7 79 22 99 Q36 81 29 62Z" fill="#ff6528"/><path d="M18 63 Q17 76 22 87 Q29 76 26 63Z" fill="#fff28b"/><path d="M14 43 3 66 16 60M30 43 41 66 28 60" fill="#b4372d" stroke="#471d22" strokeWidth="2"/><path d="M14 57V24Q15 8 22 2Q29 8 30 24V57Q22 64 14 57Z" fill="url(#missile-metal)" stroke="#183b45" strokeWidth="2"/><path d="M15 20Q17 8 22 2Q27 8 29 20Z" fill="#bf4331"/><path d="M15 48H29" stroke="#a53f2f" strokeWidth="5"/></svg></div><div ref={impact} className="naval-impact"><span className="blast-fire">✹</span><span className="blast-core"/><span className="water-crown"/><span className="water-ring"/><i/><i/><i/><i/><i/><i/></div><div ref={bubble} className="naval-speech"/></div>;
}
