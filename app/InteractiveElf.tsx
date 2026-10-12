'use client';
import {useEffect,useRef,useState} from 'react';
import {bonkElf,elfScene,newElfReaction} from '../lib/elf-reactions.js';
import {createPunchRenderer} from '../lib/punch-renderer';
import {puppetIds,puppetHand} from '../lib/punch-puppet.js';
type Actor={id:string;name:string;avatar:number};
export type ElfReaction={version:number;hits:{id:string;requestedAt:number;startAt:number;at:number;endAt:number;direction:number;actor:Actor}[];gagAt:number;gagUntil:number};
const sprites=['jack','stu','lauren','richard'];
type Props={avatar:number;name:string;actor:Actor;mistakes:number;reaction:ElfReaction;roundId:string;index:number;clockOffset:number;connected:boolean;saved:boolean;send:(command:Record<string,unknown>)=>Promise<unknown>};
const frameParts=[
 {name:'base',path:'M33 338H320'},
 {name:'upright',path:'M66 336V27'},
 {name:'top beam',path:'M66 27H205'},
 {name:'top brace',path:'M66 73L112 27'},
 {name:'foot brace',path:'M66 290L112 338'},
 {name:'rope',path:'M205 30V51'}
];
export function Gallows({mistakes}:{mistakes:number}){
 return <g className="elf-gallows" fill="none" stroke="#bfa87d" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">{frameParts.slice(0,Math.max(0,Math.min(6,mistakes))).map((part,index)=><path key={part.name} className="gallows-piece" data-frame-step={index+1} d={part.path} pathLength="1" strokeWidth={part.name==='rope'?3:8}/>)}</g>;
}
// Both expressions belong to the same complete, transparent full-body character.
export function ElfArtwork({avatar,asleep=false}:{avatar:number;asleep?:boolean}){
 return <svg x="115" y="52" width="180" height="270" viewBox={`${asleep?1024:0} 0 1024 1536`} overflow="hidden"><image href={`/assets/${sprites[avatar]||'jack'}-full-elf.webp`} width="2048" height="1536" preserveAspectRatio="none"/></svg>;
}
export default function InteractiveElf(props:Props){
 const body=useRef<SVGGElement>(null),awake=useRef<SVGGElement>(null),asleep=useRef<SVGGElement>(null),stars=useRef<SVGGElement>(null),ouch=useRef<SVGGElement>(null),rope=useRef<SVGGElement>(null),ropeLine=useRef<SVGPathElement>(null),ropeLoop=useRef<SVGEllipseElement>(null),flash=useRef<SVGGElement>(null),attackerCanvas=useRef<HTMLCanvasElement>(null),hangmanCanvas=useRef<HTMLCanvasElement>(null);
 const latest=useRef(props);latest.current=props;
 type Tap={id:string;at:number;direction:number;actor:Actor};
 const pending=useRef<Tap[]>([]),queue=useRef<Tap[]>([]),sending=useRef(false),mounted=useRef(true),lastTap=useRef(0),spoken=useRef(''),audioUnlocked=useRef(false),labelRef=useRef('');
 const [status,setStatus]=useState('Tap the elf · 5 quick hits summon the hangman'),[locked,setLocked]=useState(false),[sound,setSound]=useState(true),[error,setError]=useState('');
 const soundRef=useRef(sound);soundRef.current=sound;
 const combine=()=>{let r:ElfReaction=latest.current.reaction||newElfReaction();for(const h of pending.current)if(!r.hits.some(v=>v.id===h.id))r=bonkElf(r,h.id,h.direction,h.at,h.actor);return r;};
 useEffect(()=>{pending.current=pending.current.filter(h=>!props.reaction?.hits.some(v=>v.id===h.id));},[props.reaction]);
 useEffect(()=>{try{setSound(localStorage.getItem('elf-sound')!=='off');}catch{}},[]);
 useEffect(()=>{
  mounted.current=true;let frame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const attacker=createPunchRenderer(attackerCanvas.current!),hangman=createPunchRenderer(hangmanCanvas.current!);
  puppetIds.forEach(id=>attacker.preload(id));hangman.preload('hangman');
  function animate(){const p=elfScene(combine(),Date.now()+latest.current.clockOffset,reduced.matches),t=p.target;
   body.current?.setAttribute('transform',`translate(${t.x} ${t.y.toFixed(2)}) rotate(${t.angle.toFixed(2)} 205 163) translate(205 163) scale(${(2-t.squash).toFixed(3)} ${t.squash.toFixed(3)}) translate(-205 -163)`);
   awake.current?.setAttribute('opacity',String(1-t.nap));asleep.current?.setAttribute('opacity',String(t.nap));
   stars.current?.setAttribute('opacity',String(p.stars));stars.current?.setAttribute('transform',`translate(205 85) scale(1 .36) rotate(${p.orbit.toFixed(1)})`);
   ouch.current?.setAttribute('opacity',String(p.ouch));rope.current?.setAttribute('opacity',String(p.rope));ropeLine.current?.setAttribute('d',`M260 -5V${p.ropeY-12}`);ropeLoop.current?.setAttribute('cy',String(p.ropeY));
   const id=p.hit?puppetIds[p.hit.actor.avatar]||'jack':'jack';attacker.draw(id,p.attacker);hangman.draw('hangman',p.hangman);
   if(p.attacker){const hand=puppetHand(id,p.attacker);flash.current?.setAttribute('transform',`translate(${hand[0]} ${hand[1]})`);}flash.current?.setAttribute('opacity',String(p.flash));
   if(p.impactId&&spoken.current!==p.impactId){spoken.current=p.impactId;if(audioUnlocked.current&&soundRef.current&&'speechSynthesis' in window){const line=new SpeechSynthesisUtterance('Ouch!');line.lang='en-GB';line.rate=1.35;line.pitch=[1.1,.9,1.5,1.2][latest.current.avatar]||1;line.volume=.7;window.speechSynthesis.cancel();window.speechSynthesis.speak(line);}}
   const label=p.mode==='hangman-enter'?'Uh-oh… here comes the hangman!':p.mode==='grab'?`The hangman’s got ${latest.current.name}!`:p.mode==='dangle'?'Up you go…':p.mode==='reset'?'Back where you belong.':p.hit?`${p.hit.actor.name} → ${latest.current.name}${p.mode==='ouch'?' · Ouch!':''}`:p.mode==='dizzy'?'Seeing stars…':'Tap the elf · 5 quick hits summon the hangman';
   const signature=label+String(p.locked);if(labelRef.current!==signature){labelRef.current=signature;setStatus(label);setLocked(p.locked);}frame=requestAnimationFrame(animate);
  }
  frame=requestAnimationFrame(animate);return()=>{mounted.current=false;cancelAnimationFrame(frame);attacker.dispose();hangman.dispose();queue.current=[];};
 },[]);
 async function drain(){if(sending.current)return;sending.current=true;try{while(queue.current.length&&mounted.current){const h=queue.current.shift()!,p=latest.current,command={type:'hangman_bonk',game:'hangman',roundId:p.roundId,index:p.index,requestId:h.id,direction:h.direction};try{let response;try{response=await p.send(command);}catch(e){const status=(e as Error&{status?:number}).status;if(status&&status<500)throw e;response=await p.send(command);}const result=response as {round?:{elfReaction?:ElfReaction}};if(!result.round?.elfReaction?.hits.some(v=>v.id===h.id))pending.current=pending.current.filter(v=>v.id!==h.id);}catch(e){pending.current=pending.current.filter(v=>v.id!==h.id);if(mounted.current)setError('Punch didn’t reach the room. Try again.');}}}finally{sending.current=false;}}
 function hit(){const now=Date.now()+props.clockOffset;if(!props.connected||now-lastTap.current<150||elfScene(combine(),now).locked||pending.current.length>=5)return;lastTap.current=now;setError('');audioUnlocked.current=true;const h={id:crypto.randomUUID(),at:now,direction:[1,3].includes(props.actor.avatar)?1:-1,actor:props.actor};pending.current.push(h);queue.current.push(h);void drain();}
 return <div className="interactive-elf">
  <button type="button" className={`elf-punch-target ${props.saved?'elf-rescued':''}`} onClick={hit} disabled={!props.connected} aria-disabled={locked||!props.connected} aria-label={locked?'The hangman animation is playing. The elves will reset shortly.':`Send ${props.actor.name}’s avatar to punch ${props.name}’s elf`} title="Your avatar throws the punch. Five quick hits summon the hangman!">
   <svg className="hangman-elf" viewBox="0 0 480 355" aria-hidden="true">
    <ellipse cx="260" cy="332" rx="78" ry="9" fill="#031b16" opacity=".5"/>
    <g transform="translate(55 0)"><Gallows mistakes={props.mistakes}/></g>
    <g ref={body} transform="translate(55 0)"><g ref={awake}><ElfArtwork avatar={props.avatar}/></g><g ref={asleep} opacity="0"><ElfArtwork avatar={props.avatar} asleep/></g>
     <g ref={stars} opacity="0" fill="#ffe094" stroke="#ad7830" strokeWidth=".4">{[0,120,240].map(a=><g key={a} transform={`rotate(${a}) translate(68 0)`}><path d="M0-15 4-4 15-4 6 3 9 14 0 7-9 14-6 3-15-4-4-4Z" transform={`rotate(${-a}) scale(1 2.6)`}/></g>)}</g>
    </g>
    <foreignObject x="0" y="0" width="480" height="355" className="elf-puppet-layer"><canvas ref={attackerCanvas} width={960} height={710}/></foreignObject>
    <foreignObject x="0" y="0" width="480" height="355" className="elf-puppet-layer"><canvas ref={hangmanCanvas} width={960} height={710}/></foreignObject>
    <g ref={rope} opacity="0" fill="none" stroke="#d0b384" strokeWidth="4" strokeLinecap="round"><path ref={ropeLine} d="M260 -5V151"/><ellipse ref={ropeLoop} cx="260" cy="163" rx="24" ry="11"/></g>
    <g ref={flash} opacity="0" fill="#ffe094"><path d="M0-30 6-12 24-21 14-4 31 3 12 9 21 28 3 17-9 30-12 12-31 10-18-4-27-20-8-14Z"/></g>
    <g ref={ouch} opacity="0"><path d="M328 65Q316 65 316 52V34Q316 20 331 20H395Q410 20 410 34V52Q410 65 395 65H349L330 82Z" fill="#f9e5b7"/><text x="363" y="51" textAnchor="middle" fill="#663f25" fontSize="21" fontWeight="800">Ouch!</text></g>
   </svg>
  </button>
  <div className="elf-play-controls"><span role="status" aria-live="polite">{error||status}</span><button type="button" className="elf-sound" aria-pressed={sound} onClick={()=>{const next=!sound;setSound(next);try{localStorage.setItem('elf-sound',next?'on':'off');}catch{}if(!next&&'speechSynthesis' in window)window.speechSynthesis.cancel();}} aria-label={`Turn elf voice ${sound?'off':'on'}`}>{sound?'♪ On':'♪ Off'}</button></div>
 </div>;
}
