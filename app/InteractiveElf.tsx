'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {bonkElf,elfPose,newElfReaction} from '../lib/elf-reactions.js';
export type ElfReaction={hits:{id:string;at:number;direction:number}[];sleepAt:number;sleepUntil:number};
const sprites=['jack','stu','lauren','richard'];
type Props={avatar:number;name:string;reaction:ElfReaction;roundId:string;index:number;clockOffset:number;connected:boolean;saved:boolean;send:(command:Record<string,unknown>)=>Promise<unknown>};
// Both expressions belong to the same complete, transparent full-body character.
export function ElfArtwork({avatar,asleep=false}:{avatar:number;asleep?:boolean}){
 return <svg x="115" y="52" width="180" height="270" viewBox={`${asleep?1024:0} 0 1024 1536`} overflow="hidden"><image href={`/assets/${sprites[avatar]||'jack'}-full-elf.webp`} width="2048" height="1536" preserveAspectRatio="none"/></svg>;
}
export default function InteractiveElf(props:Props){
 const clip=useId().replace(/:/g,''),body=useRef<SVGGElement>(null),awake=useRef<SVGGElement>(null),asleep=useRef<SVGGElement>(null),stars=useRef<SVGGElement>(null),ouch=useRef<SVGGElement>(null),zzz=useRef<SVGGElement>(null);
 const latest=useRef(props);latest.current=props;
 const pending=useRef<ElfReaction['hits']>([]),queue=useRef<ElfReaction['hits']>([]),sending=useRef(false),mounted=useRef(true),lastTap=useRef(0),lastVoice=useRef(0),modeRef=useRef('idle');
 const [mode,setMode]=useState('idle'),[sound,setSound]=useState(true),[error,setError]=useState('');
 const combine=()=>{let r:ElfReaction=latest.current.reaction||newElfReaction();for(const h of pending.current)if(!r.hits.some(v=>v.id===h.id))r=bonkElf(r,h.id,h.direction,h.at);return r;};
 useEffect(()=>{pending.current=pending.current.filter(h=>!props.reaction?.hits.some(v=>v.id===h.id));},[props.reaction]);
 useEffect(()=>{try{setSound(localStorage.getItem('elf-sound')!=='off');}catch{}},[]);
 useEffect(()=>{
  mounted.current=true;let frame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const animate=()=>{const p=elfPose(combine(),Date.now()+latest.current.clockOffset,reduced.matches);
   body.current?.setAttribute('transform',`translate(0 ${p.drop.toFixed(2)}) rotate(${p.angle.toFixed(2)} 205 48) translate(205 48) scale(${(2-p.squash).toFixed(3)} ${p.squash.toFixed(3)}) translate(-205 -48)`);
   awake.current?.setAttribute('opacity',String(1-p.nap));asleep.current?.setAttribute('opacity',String(p.nap));
   stars.current?.setAttribute('opacity',String(p.stars));stars.current?.setAttribute('transform',`translate(205 85) scale(1 .36) rotate(${p.orbit.toFixed(1)})`);
   ouch.current?.setAttribute('opacity',p.mode==='ouch'?'1':'0');zzz.current?.setAttribute('opacity',String(p.nap));zzz.current?.setAttribute('transform',`translate(0 ${reduced.matches?0:Math.sin(Date.now()/450)*4})`);
   if(modeRef.current!==p.mode){modeRef.current=p.mode;setMode(p.mode);}frame=requestAnimationFrame(animate);
  };frame=requestAnimationFrame(animate);return()=>{mounted.current=false;cancelAnimationFrame(frame);queue.current=[];};
 },[]);
 function speak(){if(!sound||!('speechSynthesis' in window)||Date.now()-lastVoice.current<150)return;lastVoice.current=Date.now();const line=new SpeechSynthesisUtterance('Ouch!');line.lang='en-GB';line.rate=1.35;line.pitch=[1.1,.9,1.5,1.2][props.avatar]||1;line.volume=.7;const voice=window.speechSynthesis.getVoices().find(v=>v.lang==='en-GB');if(voice)line.voice=voice;window.speechSynthesis.cancel();window.speechSynthesis.speak(line);}
 async function drain(){if(sending.current)return;sending.current=true;try{while(queue.current.length&&mounted.current){const h=queue.current.shift()!,p=latest.current;const command={type:'hangman_bonk',game:'hangman',roundId:p.roundId,index:p.index,requestId:h.id,direction:h.direction};try{try{const response=await p.send(command) as {round?:{elfReaction?:ElfReaction}};if(!response.round?.elfReaction?.hits.some(v=>v.id===h.id))pending.current=pending.current.filter(v=>v.id!==h.id);}catch(e){const status=(e as Error&{status?:number}).status;if(status&&status<500)throw e;const response=await p.send(command) as {round?:{elfReaction?:ElfReaction}};if(!response.round?.elfReaction?.hits.some(v=>v.id===h.id))pending.current=pending.current.filter(v=>v.id!==h.id);}}catch(e){pending.current=pending.current.filter(v=>v.id!==h.id);if(mounted.current)setError('Tap didn’t reach the room. Try again.');}}}finally{sending.current=false;}}
 function hit(event:React.MouseEvent<HTMLButtonElement>){const now=Date.now()+props.clockOffset;if(!props.connected||now-lastTap.current<140||elfPose(combine(),now).mode==='sleep'||pending.current.length>=5)return;lastTap.current=now;setError('');const box=event.currentTarget.getBoundingClientRect();const direction=event.detail===0?(pending.current.length%2?-1:1):event.clientX<box.left+box.width/2?1:-1;const h={id:crypto.randomUUID(),at:now,direction};pending.current.push(h);queue.current.push(h);speak();void drain();}
 return <div className="interactive-elf">
  <button type="button" className={`elf-punch-target ${props.saved?'elf-rescued':''}`} onClick={hit} disabled={!props.connected} aria-disabled={mode==='sleep'||!props.connected} aria-label={mode==='sleep'?`${props.name} is having a nap and will wake up shortly`:`Give ${props.name}’s elf a playful punch`} title="Tap the elf. Five quick hits = nap time!">
   <svg className="hangman-elf" viewBox="0 0 360 355" aria-hidden="true">
    <defs><linearGradient id={clip} x2="0" y2="1"><stop stopColor="#eed19a" stopOpacity=".35"/><stop offset="1" stopColor="#eed19a" stopOpacity="0"/></linearGradient></defs>
    <ellipse cx="205" cy="332" rx="78" ry="9" fill="#031b16" opacity=".5"/>
    <g className="elf-gallows" fill="none" stroke="#bfa87d" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><path d="M33 338H320M66 336V27H205M66 73L112 27"/><path d="M205 30V51" strokeWidth="3"/></g>
    <g ref={body}><g ref={awake}><ElfArtwork avatar={props.avatar}/></g><g ref={asleep} opacity="0"><ElfArtwork avatar={props.avatar} asleep/></g>
     <g ref={stars} opacity="0" fill="#ffe094" stroke="#ad7830" strokeWidth=".4">{[0,120,240].map(a=><g key={a} transform={`rotate(${a}) translate(68 0)`}><path d="M0-15 4-4 15-4 6 3 9 14 0 7-9 14-6 3-15-4-4-4Z" transform={`rotate(${-a}) scale(1 2.6)`}/></g>)}</g>
    </g>
    <g ref={ouch} opacity="0"><path d="M270 72Q252 70 252 54V36Q253 20 271 20H329Q345 20 345 37V54Q345 71 329 71H286L271 87Z" fill="#f9e5b7"/><text x="297" y="53" textAnchor="middle" fill="#663f25" fontSize="21" fontWeight="800">Ouch!</text></g>
    <g ref={zzz} opacity="0" fill="#efdaac" fontFamily="Georgia,serif" fontWeight="bold"><text x="275" y="116" fontSize="23">z</text><text x="297" y="89" fontSize="29">z</text><text x="318" y="59" fontSize="35">Z</text></g>
   </svg>
  </button>
  <div className="elf-play-controls"><span role="status" aria-live="polite">{error|| (mode==='sleep'?'Out cold… back in a moment.':mode==='ouch'?'Ouch!':mode==='dizzy'?'Seeing stars…':'Tap the elf · 5 quick hits = a nap')}</span><button type="button" className="elf-sound" aria-pressed={sound} onClick={()=>{const next=!sound;setSound(next);try{localStorage.setItem('elf-sound',next?'on':'off');}catch{}if(!next&&'speechSynthesis' in window)window.speechSynthesis.cancel();}} aria-label={`Turn elf voice ${sound?'off':'on'}`}>{sound?'♪ On':'♪ Off'}</button></div>
 </div>;
}
