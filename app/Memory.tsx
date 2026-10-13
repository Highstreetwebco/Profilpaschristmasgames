'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {gridDestination} from '../lib/laptop-controls.js';
import {memoryPictures} from '../lib/memory-pictures.js';
type Player={id:string;name:string;avatar:number;online:boolean};
type MemoryCard={position:number;face:string|null;matchedBy:string|null;selected:boolean};
type MemoryResult={player:string;rank:number;clicks:number;points:number;last:boolean};
export type MemoryRound={game:'memory';roundId:string;index:number;total:number;phase:'ready'|'preview'|'playing'|'reveal'|'complete';turn:number;turns:string[];loaded:string[];previewAt:number|null;deadline:number|null;paused:boolean;remaining:number|null;complete:boolean;finished:boolean;solo:boolean;updatedRules:boolean;clicks:number;lastResult:{outcome:'match'|'miss'}|null;found:number;playerStats:Record<string,{clicks:number;found:number;finished:boolean}>;results:MemoryResult[]|null;cards:MemoryCard[]};
const place=(rank:number)=>({1:'1st',2:'2nd',3:'3rd'}[rank]||`${rank}th`);
type Props={round:MemoryRound;players:Player[];me:string;isHost:boolean;connected:boolean;serverNow:number;send:(command:Record<string,unknown>)=>Promise<unknown>};
const catalogue=Object.fromEntries(memoryPictures.map(p=>[p.id,p]));
function Picture({id}:{id:string}){
 const clip=useId(),p=catalogue[id];if(!p)return null;
 return <><span className="memory-picture">{'src' in p?<img src={p.src} alt="" draggable={false}/>:<svg viewBox="0 0 384 512" aria-hidden="true"><defs><clipPath id={clip} clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="384" height="512"/></clipPath></defs><g clipPath={`url(#${clip})`}><image href="/assets/memory-objects.webp" x={-(p.cell!%4)*384} y={-Math.floor(p.cell!/4)*512} width="1536" height="1024" preserveAspectRatio="none"/></g></svg>}</span><span className="memory-picture-label">{p.name}</span></>;
}
function Card({card,face,disabled,owner,onClick,tabIndex,onFocus}:{card:MemoryCard;face:string|null;disabled:boolean;owner?:Player;onClick:()=>void;tabIndex:number;onFocus:()=>void}){
 const [painted,setPainted]=useState(face);
 useEffect(()=>{if(face){setPainted(face);return;}const timeout=setTimeout(()=>setPainted(null),190);return()=>clearTimeout(timeout);},[face]);
 const shown=face||painted,label=face?catalogue[face]?.name:'';
 return <button type="button" className={`memory-card ${face?'is-up':''} ${card.matchedBy?'is-matched':''}`} data-card={card.position} aria-disabled={disabled} tabIndex={tabIndex} onFocus={onFocus} onClick={()=>{if(!disabled)onClick();}} aria-label={`Card ${card.position+1}: ${card.matchedBy?`${label}, matched by ${owner?.name}`:face?label:'face down'}`} aria-pressed={!!face}>
  <span className="memory-card-turn"><span className="memory-card-back" aria-hidden="true"><span className="memory-card-number">{String(card.position+1).padStart(2,'0')}</span><span className="memory-card-star">✦</span><span className="memory-card-monogram">P</span><span className="memory-card-small">CHRISTMAS ’26</span></span><span className="memory-card-front" aria-hidden="true">{shown&&<Picture id={shown}/>}<span className="memory-match-mark">✓ {owner?.name}</span></span></span>
 </button>;
}
export default function Memory({round:r,players,me,isHost,connected,serverNow,send}:Props){
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[artReady,setArtReady]=useState(false),[artError,setArtError]=useState(false),[artAttempt,setArtAttempt]=useState(0),[focusCard,setFocusCard]=useState(0);
 const board=useRef<HTMLDivElement>(null),[loadAttempt,setLoadAttempt]=useState(0);
 const gate=useRef(false),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{let cancelled=false;setArtReady(false);setArtError(false);const images=[...memoryPictures.flatMap(p=>'src' in p?[p.src!]:[]),'/assets/memory-objects.webp'];Promise.all(images.map(src=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject();img.src=src;}))).then(()=>{if(!cancelled)setArtReady(true);}).catch(()=>{if(!cancelled)setArtError(true);});return()=>{cancelled=true;};},[artAttempt]);
 async function act(type:string,extra:Record<string,unknown>={}){if(gate.current)return;gate.current=true;setPending(true);setError('');const command={type,game:'memory',roundId:r.roundId,turn:r.turn,requestId:crypto.randomUUID(),...extra};try{try{await send(command);}catch(e){const status=(e as Error&{status?:number}).status;if(status&&status<500)throw e;await send(command);}}catch(e){if(live.current)setError(e instanceof Error?e.message:'The card didn’t reach the room. Try again.');}finally{gate.current=false;if(live.current)setPending(false);}}
 const loaded=r.loaded||[],allLoaded=r.turns.every(id=>loaded.includes(id));
 useEffect(()=>{
  if(!artReady||!connected||r.phase!=='ready'||loaded.includes(me))return;
  let cancelled=false,retry:ReturnType<typeof setTimeout>|undefined;
  void send({type:'memory_loaded',game:'memory',roundId:r.roundId,requestId:crypto.randomUUID()}).catch(()=>{if(!cancelled)retry=setTimeout(()=>setLoadAttempt(n=>n+1),2000);});
  return()=>{cancelled=true;if(retry)clearTimeout(retry);};
 },[artReady,connected,r.phase,r.roundId,me,loaded.includes(me),loadAttempt,send]);
 const lead=r.phase==='preview'&&r.previewAt!==null&&serverNow<r.previewAt;
 const expired=r.deadline!==null&&serverNow>=r.deadline;
 const canPick=r.phase==='playing'&&!r.finished&&!r.paused&&r.turns.includes(me)&&connected&&artReady&&!pending;
 const countdown=Math.max(0,Math.ceil(((r.paused?r.remaining:r.deadline!==null?r.deadline-serverNow:0)||0)/1000));
 const waiting=r.turns.filter(id=>!r.playerStats[id].finished).map(id=>players.find(p=>p.id===id)?.name).join(', ');
 const status=!connected?'Reconnecting — your clicks and pairs are saved.':r.paused?'Board paused. Your clicks and pairs are saved.':r.phase==='ready'?`${r.updatedRules?'New scoring! ':''}Clear your own 12 pairs. Fewest card flips wins.`:lead?'Eyes on the board. Your preview is about to begin…':r.phase==='preview'?(expired?'Cards down. Get ready to match.':'Look carefully. Everyone has the same eight-second preview.'):r.complete?r.solo?`Practice complete in ${r.clicks} clicks!`:'Everyone has finished. Fewest clicks takes the crown.':r.finished?`You finished in ${r.clicks} clicks. Waiting for ${waiting}.`:r.phase==='reveal'?r.lastResult?.outcome==='match'?'Pair found! Keep going — every card flip counts.':'No match. Remember those pictures and try again.':r.cards.some(c=>c.selected&&!c.matchedBy)?'Find the matching card.':'Find all 12 pairs in as few clicks as possible.';
 const footer=r.solo?'SOLO PRACTICE · no competition points':'1ST: 5 POINTS · 2ND: 3 · 3RD: 1 · LAST: NOB HEAD';
 return <section className="memory-stage stage-enter" aria-labelledby="memory-title">
  <div className="memory-heading"><div><p className="eyebrow">ROUND 03 · FEWEST CLICKS WINS</p><h1 id="memory-title">Memory <em>Match</em></h1></div><div className={`memory-counter ${r.phase==='preview'&&!r.paused?'is-counting':''}`}><strong>{r.phase==='preview'?lead?'READY':`${Math.min(8,countdown)}s`:r.clicks}</strong><span>{r.phase==='preview'?'STUDY THE CARDS':`YOUR CLICKS · ${r.found}/12 PAIRS`}</span></div></div>
  <div className="memory-players" aria-label="Player click counts and progress">{r.turns.map(id=>{const p=players.find(p=>p.id===id)!,stats=r.playerStats[id];return <div className={id===me?'is-current':''} key={id}><span className={`avatar face-${p.avatar}`} aria-hidden="true"/><span>{p.name}{id===me?' (you)':''}<small>{stats.finished?'FINISHED':!p.online?'RECONNECTING':r.phase==='ready'?loaded.includes(id)?'PICTURES READY ✓':'LOADING PICTURES…':`${stats.found}/12 PAIRS`}</small></span><b aria-label={`${stats.clicks} clicks`}>{stats.clicks}</b></div>;})}</div>
  <div className={`memory-status ${canPick?'your-turn':''}`} role="status" aria-live="polite">{status}</div>
  {r.complete&&r.results?<div className="memory-results">
   <table><caption>{r.solo?'Your practice result':'The fewer, the merrier.'}</caption><thead><tr><th scope="col">Place</th><th scope="col">Player</th><th scope="col">Clicks</th><th scope="col">Points</th></tr></thead><tbody>{r.results.map(result=>{const p=players.find(p=>p.id===result.player)!;return <tr key={p.id} className={`${result.rank===1?'memory-winner':''} ${result.last?'memory-last':''}`}><td>{r.solo?'—':place(result.rank)}</td><th scope="row"><span className={`avatar face-${p.avatar}`} aria-hidden="true"/><span>{p.name}{p.id===me?' (you)':''}{result.last&&<small>Nob head</small>}</span></th><td>{result.clicks}</td><td>+{result.points}</td></tr>;})}</tbody></table>
   <p>{r.solo?'24 clicks is a perfect board. Ready for the real thing?':'Equal clicks share the place and points. Finishing faster does not break a tie.'}</p>
  </div>:<div className="memory-board" ref={board} role="group" aria-label="Your 24 memory cards. Use arrow keys to move and Enter or Space to flip." onKeyDown={e=>{const target=(e.target as HTMLElement).closest<HTMLElement>('[data-card]');if(!target)return;const columns=getComputedStyle(e.currentTarget).gridTemplateColumns.split(' ').length;const next=gridDestination(Number(target.dataset.card),e.key,columns,24);if(next===null)return;e.preventDefault();setFocusCard(next);board.current?.querySelector<HTMLButtonElement>(`[data-card="${next}"]`)?.focus({preventScroll:true});}}>{r.cards.map(card=>{
   const conceal=!card.matchedBy&&(r.paused||r.phase==='preview'&&expired||r.phase==='reveal'&&expired&&r.lastResult?.outcome==='miss');
   const face=conceal?null:card.face;
   return <Card key={card.position} tabIndex={focusCard===card.position?0:-1} onFocus={()=>setFocusCard(card.position)} card={card} face={face} disabled={!canPick||!!card.matchedBy||card.selected} owner={players.find(p=>p.id===card.matchedBy)} onClick={()=>act('memory_flip',{position:card.position})}/>;
  })}</div>}
  <div className="memory-controls"><span>{footer}</span><div>
   {artError?<button className="button outline" onClick={()=>setArtAttempt(n=>n+1)}>Retry pictures</button>:!artReady?<span className="memory-wait">Loading pictures…</span>:isHost?r.phase==='ready'?<button className="button gold" disabled={pending||!connected||!allLoaded} onClick={()=>act('memory_start')}>{allLoaded?'Show cards for 8 seconds →':'Waiting for pictures…'}</button>:r.complete?<button className="button gold" disabled={pending||!connected} onClick={()=>act('memory_finish')}>Finish round →</button>:<button className="button outline" disabled={pending||!connected} onClick={()=>act('memory_pause')}>{r.paused?'Resume game':'Pause'}</button>:<span className="memory-wait">{r.phase==='ready'?'Jack will start the eight-second preview.':r.complete?'Waiting for Jack to finish the round.':'Arrows to move · Enter to flip · No rush.'}</span>}
  </div></div>
  {(error||artError)&&<p className="memory-error" role="alert">{error||'Some pictures could not load. Retry before playing.'}</p>}
 </section>;
}
