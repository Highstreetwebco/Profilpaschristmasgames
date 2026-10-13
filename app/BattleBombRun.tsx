'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {activeBomb,bombScene,battleCues} from '../lib/battle-show.js';
import {createPunchRenderer} from '../lib/punch-renderer';
import {puppetIds} from '../lib/punch-puppet.js';
import type {BattleEvent} from './Battleships';
import type {createBattleAudio} from '../lib/battle-audio';
type Props={arena:RefObject<HTMLDivElement|null>;events:BattleEvent[];clockOffset:number;audio:RefObject<ReturnType<typeof createBattleAudio>|null>};
export default function BattleBombRun(props:Props){
 const canvas=useRef<HTMLCanvasElement>(null),bomb=useRef<HTMLDivElement>(null),impact=useRef<HTMLDivElement>(null),bubble=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const host=latest.current.arena.current,node=canvas.current;if(!host||!node)return;const arena=host;
  let frame=0,dirty=true,lastEvent=-1,geometry:{source:{x:number;y:number};target:{x:number;y:number};stand:{x:number;y:number};height:number}|null=null;
  const renderer=createPunchRenderer(node),reduced=matchMedia('(prefers-reduced-motion: reduce)'),seen=new Set<string>(),joinedAt=Date.now()+latest.current.clockOffset;
  puppetIds.forEach(renderer.preload);
  const resize=()=>{dirty=true;const ratio=Math.min(window.devicePixelRatio||1,2);node.width=Math.max(1,Math.round(arena.clientWidth*ratio));node.height=Math.max(1,Math.round(arena.clientHeight*ratio));renderer.setView(arena.clientWidth,arena.clientHeight);};
  const observer=new ResizeObserver(resize);observer.observe(arena);resize();
  const local=(element:Element)=>{const a=arena.getBoundingClientRect(),b=element.getBoundingClientRect(),sx=arena.clientWidth/a.width,sy=arena.clientHeight/a.height;return {x:(b.left-a.left+b.width/2)*sx,y:(b.top-a.top+b.height/2)*sy};};
  function animate(){
   const now=Date.now()+latest.current.clockOffset,event=activeBomb(latest.current.events,now) as BattleEvent|null;
   for(const e of latest.current.events)if(e.startsAt)for(const cue of battleCues(e)){if(seen.has(cue.key)||now<cue.at)continue;seen.add(cue.key);if(cue.at>=joinedAt-100&&now-cue.at<700)latest.current.audio.current?.play(cue.kind,'line' in cue?cue.line:undefined);}
   if(event){
    if(dirty||lastEvent!==event.id){const source=arena.querySelector(`[data-fleet="${event.attacker}"] [data-avatar-dock]`),target=arena.querySelector(`[data-fleet="${event.target}"] [data-position="${event.position}"]`);if(source&&target){const from=local(source),to=local(target),height=Math.min(105,Math.max(64,arena.clientWidth*.17));const foot=(p:{x:number;y:number})=>({x:Math.max(height*.45,Math.min(arena.clientWidth-height*.45,p.x)),y:Math.max(height+8,Math.min(arena.clientHeight-9,p.y))});geometry={source:foot({x:from.x,y:from.y+height*.62}),target:to,stand:foot({x:to.x+(to.x>arena.clientWidth/2?-height*.28:height*.28),y:to.y+height*.5}),height};}dirty=false;lastEvent=event.id;}
    if(geometry){const id=puppetIds.includes(event.attacker)?event.attacker:'richard',scene=bombScene(event,now,geometry,id,reduced.matches);renderer.draw(id,scene.pose);
     if(bomb.current){bomb.current.style.opacity=scene.bomb.visible?'1':'0';bomb.current.style.transform=`translate(${scene.bomb.x}px,${scene.bomb.y}px) rotate(${scene.bomb.angle}deg)`;}
     if(impact.current){impact.current.className=`naval-impact ${event.hit?'bomb-hit':'bomb-miss'}`;impact.current.style.opacity=scene.blast.visible?String(scene.blast.opacity):'0';impact.current.style.transform=`translate(${scene.blast.x}px,${scene.blast.y}px) scale(${scene.blast.scale})`;}
     if(bubble.current){const line=scene.line;textBubble(line?`${line.name}: “${line.text}”`:'');const width=Math.min(245,arena.clientWidth-16),anchor=line?.speaker===event.attacker?scene.pose||geometry.stand:geometry.target;bubble.current.style.width=`${width}px`;bubble.current.style.left=`${Math.max(8,Math.min(arena.clientWidth-width-8,anchor.x-width/2))}px`;bubble.current.style.top=`${Math.max(5,Math.min(arena.clientHeight-74,anchor.y-geometry.height-40))}px`;}
    }
   }else{renderer.draw('jack',null);if(bomb.current)bomb.current.style.opacity='0';if(impact.current)impact.current.style.opacity='0';textBubble('');}
   frame=requestAnimationFrame(animate);
  }
  function textBubble(text:string){if(!bubble.current)return;if(bubble.current.textContent!==text)bubble.current.textContent=text;bubble.current.style.opacity=text?'1':'0';}
  frame=requestAnimationFrame(animate);return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();};
 },[]);
 return <div className="naval-animation" aria-hidden="true"><canvas ref={canvas}/><div ref={bomb} className="naval-bomb"><i/><b>✦</b></div><div ref={impact} className="naval-impact"><span>✹</span><i/><i/><i/></div><div ref={bubble} className="naval-speech"/></div>;
}
