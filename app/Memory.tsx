'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {memoryPictures} from '../lib/memory-pictures.js';
type Player={id:string;name:string;avatar:number;online:boolean};
type MemoryCard={position:number;face:string|null;matchedBy:string|null;selected:boolean};
export type MemoryRound={game:'memory';roundId:string;index:number;total:number;phase:'ready'|'preview'|'playing'|'reveal'|'complete';turn:number;turns:string[];performer:string;previewAt:number|null;deadline:number|null;paused:boolean;remaining:number|null;complete:boolean;solo:boolean;attempts:number;lastResult:{outcome:'match'|'miss'|'skipped';player:string}|null;found:number;pairCounts:Record<string,number>;cards:MemoryCard[]};
type Props={round:MemoryRound;players:Player[];me:string;isHost:boolean;connected:boolean;serverNow:number;send:(command:Record<string,unknown>)=>Promise<unknown>};
const catalogue=Object.fromEntries(memoryPictures.map(p=>[p.id,p]));
function Picture({id}:{id:string}){
 const clip=useId(),p=catalogue[id];if(!p)return null;
 return <><span className="memory-picture">{'src' in p?<img src={p.src} alt="" draggable={false}/>:<svg viewBox="0 0 384 512" aria-hidden="true"><defs><clipPath id={clip} clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="384" height="512"/></clipPath></defs><g clipPath={`url(#${clip})`}><image href="/assets/memory-objects.webp" x={-(p.cell!%4)*384} y={-Math.floor(p.cell!/4)*512} width="1536" height="1024" preserveAspectRatio="none"/></g></svg>}</span><span className="memory-picture-label">{p.name}</span></>;
}
function Card({card,face,disabled,owner,onClick}:{card:MemoryCard;face:string|null;disabled:boolean;owner?:Player;onClick:()=>void}){
 const [painted,setPainted]=useState(face);
 useEffect(()=>{if(face){setPainted(face);return;}const timeout=setTimeout(()=>setPainted(null),190);return()=>clearTimeout(timeout);},[face]);
 const shown=face||painted,label=face?catalogue[face]?.name:'';
 return <button type="button" className={`memory-card ${face?'is-up':''} ${card.matchedBy?'is-matched':''}`} disabled={disabled} onClick={onClick} aria-label={`Card ${card.position+1}: ${card.matchedBy?`${label}, matched by ${owner?.name}`:face?label:'face down'}`} aria-pressed={!!face}>
  <span className="memory-card-turn"><span className="memory-card-back" aria-hidden="true"><span className="memory-card-number">{String(card.position+1).padStart(2,'0')}</span><span className="memory-card-star">✦</span><span className="memory-card-monogram">P</span><span className="memory-card-small">CHRISTMAS ’26</span></span><span className="memory-card-front" aria-hidden="true">{shown&&<Picture id={shown}/>}<span className="memory-match-mark">✓ {owner?.name}</span></span></span>
 </button>;
}
export default function Memory({round:r,players,me,isHost,connected,serverNow,send}:Props){
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[artReady,setArtReady]=useState(false),[artError,setArtError]=useState(false),[artAttempt,setArtAttempt]=useState(0);
 const gate=useRef(false),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{let cancelled=false;setArtReady(false);setArtError(false);const images=[...memoryPictures.flatMap(p=>'src' in p?[p.src!]:[]),'/assets/memory-objects.webp'];Promise.all(images.map(src=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject();img.src=src;}))).then(()=>{if(!cancelled)setArtReady(true);}).catch(()=>{if(!cancelled)setArtError(true);});return()=>{cancelled=true;};},[artAttempt]);
 async function act(type:string,extra:Record<string,unknown>={}){if(gate.current)return;gate.current=true;setPending(true);setError('');const command={type,game:'memory',roundId:r.roundId,turn:r.turn,requestId:crypto.randomUUID(),...extra};try{try{await send(command);}catch(e){const status=(e as Error&{status?:number}).status;if(status&&status<500)throw e;await send(command);}}catch(e){if(live.current)setError(e instanceof Error?e.message:'The card didn’t reach the room. Try again.');}finally{gate.current=false;if(live.current)setPending(false);}}
 const current=players.find(p=>p.id===r.performer),mine=r.performer===me;
 const lead=r.phase==='preview'&&r.previewAt!==null&&serverNow<r.previewAt;
 const expired=r.deadline!==null&&serverNow>=r.deadline;
 const canPick=r.phase==='playing'&&!r.paused&&mine&&connected&&artReady&&!pending;
 const countdown=Math.max(0,Math.ceil(((r.paused?r.remaining:r.deadline!==null?r.deadline-serverNow:0)||0)/1000));
 const lastPlayer=players.find(p=>p.id===r.lastResult?.player)?.name;
 const status=r.paused?'Board paused. The pictures and turn are saved.':r.phase==='ready'?'24 cards. 12 pairs. You get eight seconds to study them.':lead?'Eyes on the board. Your preview is about to begin…':r.phase==='preview'?(expired?'Cards down. Get ready to match.':'Look carefully. Remember where the pairs are.'):r.phase==='complete'?`All 12 pairs found in ${r.attempts} attempts!`:r.phase==='reveal'?r.lastResult?.outcome==='match'?`${lastPlayer} found a pair${r.solo?'':' — +1 point'}! Another go.`:'No match. Remember those pictures for your next turn.':mine?r.cards.some(c=>c.selected&&!c.matchedBy)?'Your turn — find the matching card.':'Your turn — choose two cards.':`${current?.name} is choosing. Watch and remember.`;
 const footer=r.solo?'SOLO PRACTICE · competition scores stay unchanged':'MATCH = 1 POINT + ANOTHER GO · MISS = NEXT PLAYER';
 return <section className="memory-stage stage-enter" aria-labelledby="memory-title">
  <div className="memory-heading"><div><p className="eyebrow">ROUND 03 · LOOK. REMEMBER. MATCH.</p><h1 id="memory-title">Memory <em>Match</em></h1></div><div className={`memory-counter ${r.phase==='preview'&&!r.paused?'is-counting':''}`}><strong>{r.phase==='preview'?lead?'READY':`${Math.min(8,countdown)}s`:`${r.found} / 12`}</strong><span>{r.phase==='preview'?'STUDY THE CARDS':'PAIRS FOUND'}</span></div></div>
  <div className="memory-players" aria-label="Pairs found by each player">{r.turns.map(id=>{const p=players.find(p=>p.id===id)!;return <div className={r.performer===id&&!['ready','preview','complete'].includes(r.phase)?'is-current':''} key={id}><span className={`avatar face-${p.avatar}`} aria-hidden="true"/><span>{p.name}{id===me?' (you)':''}<small>{r.performer===id&&r.phase==='playing'?'PICKING NOW':!p.online?'RECONNECTING':'PAIRS FOUND'}</small></span><b>{r.pairCounts[id]||0}</b></div>;})}</div>
  <div className={`memory-status ${mine&&r.phase==='playing'&&!r.paused?'your-turn':''}`} role="status" aria-live="polite">{status}</div>
  <div className="memory-board" role="group" aria-label="24 memory cards">{r.cards.map(card=>{
   const conceal=!card.matchedBy&&(r.paused||r.phase==='preview'&&expired||r.phase==='reveal'&&expired&&r.lastResult?.outcome==='miss');
   const face=conceal?null:card.face;
   return <Card key={card.position} card={card} face={face} disabled={!canPick||!!card.matchedBy||card.selected} owner={players.find(p=>p.id===card.matchedBy)} onClick={()=>act('memory_flip',{position:card.position})}/>;
  })}</div>
  <div className="memory-controls"><span>{footer}</span><div>
   {artError?<button className="button outline" onClick={()=>setArtAttempt(n=>n+1)}>Retry pictures</button>:!artReady?<span className="memory-wait">Loading pictures…</span>:isHost?r.phase==='ready'?<button className="button gold" disabled={pending||!connected} onClick={()=>act('memory_start')}>Show cards for 8 seconds →</button>:r.phase==='complete'?<button className="button gold" disabled={pending||!connected} onClick={()=>act('memory_finish')}>Finish round →</button>:<><button className="button outline" disabled={pending||!connected} onClick={()=>act('memory_pause')}>{r.paused?'Resume game':'Pause'}</button>{r.phase==='playing'&&!r.paused&&!r.solo&&<button className="text-button" disabled={pending||!connected} onClick={()=>act('memory_skip')}>{current?.online?'Skip turn':`Skip ${current?.name}`}</button>}</>:<span className="memory-wait">{r.phase==='ready'?'Jack will start the eight-second preview.':r.phase==='complete'?'Waiting for Jack to finish the round.':!current?.online?'Jack can skip the disconnected player.':'Same board. Everyone is watching.'}</span>}
  </div></div>
  {(error||artError)&&<p className="memory-error" role="alert">{error||'Some pictures could not load. Retry before playing.'}</p>}
 </section>;
}
