'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';

type Point=[number,number];
type Ink={id:string;stroke:string;points:Point[];colour:string;width:number};
type Person={id:string;name:string;avatar:number;online:boolean};
export type PictionaryRound={roundId:string;index:number;total:number;seconds:number;performer:string;turns:string[];revealed:boolean;deadline:number|null;pausedMs:number|null;secretWord:string|null;answer:string|null;strokes:Ink[];canvasEpoch:number;guesses:{id:string;player:string;value:string;correct:boolean}[];winner:string|null;outcome:string|null;solo:boolean};
type Props={round:PictionaryRound;players:Person[];me:string;isHost:boolean;connected:boolean;serverNow:number;send:(command:Record<string,unknown>)=>Promise<unknown>};
const colours=[['Ink','#20352d'],['Red','#dc4c4c'],['Orange','#e89925'],['Yellow','#e8cc3e'],['Green','#33845c'],['Blue','#3280c4'],['Purple','#9563bc'],['Eraser','#ffffff']];
function Mark({ink}:{ink:Ink}){return ink.points.length===1?<circle cx={ink.points[0][0]} cy={ink.points[0][1]} r={ink.width/2} fill={ink.colour}/>:<polyline points={ink.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={ink.colour} strokeWidth={ink.width} strokeLinecap="round" strokeLinejoin="round"/>;}
export default function Pictionary({round:r,players,me,isHost,connected,serverNow,send}:Props){
 const[colour,setColour]=useState(colours[0][1]),[width,setWidth]=useState(6),[local,setLocal]=useState<Ink[]>([]),[liveInk,setLiveInk]=useState<Ink|null>(null),[queued,setQueued]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[guess,setGuess]=useState(''),[guessBusy,setGuessBusy]=useState(false),[testGuess,setTestGuess]=useState(false);
 const pad=useRef<SVGSVGElement>(null),active=useRef<Ink|null>(null),pointer=useRef<number|null>(null),tail=useRef<Promise<unknown>>(Promise.resolve()),queueCount=useRef(0),mounted=useRef(true),history=useRef<HTMLDivElement>(null);
 const drawer=me===r.performer,name=(id:string)=>players.find(p=>p.id===id)?.name||id;
 const seconds=r.revealed?0:Math.max(0,Math.ceil((r.deadline?r.deadline-serverNow:r.pausedMs??120000)/1000));
 const running=!!r.deadline&&seconds>0&&!r.revealed,started=!!r.deadline||r.pausedMs!==null||r.revealed;
 const canDraw=drawer&&running&&connected&&!busy&&!testGuess&&queued<8;
 const canGuess=running&&connected&&(!drawer||r.solo&&testGuess);
 const roundKey=`${r.roundId}:${r.index}`;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current=null;};},[]);
 useEffect(()=>{const ids=new Set(r.strokes.map(s=>s.id));setLocal(prev=>prev.filter(s=>!ids.has(s.id)));},[r.strokes]);
 useEffect(()=>{setLocal([]);setLiveInk(null);active.current=null;pointer.current=null;},[r.canvasEpoch]);
 useEffect(()=>{history.current?.scrollTo({top:history.current.scrollHeight,behavior:'smooth'});},[r.guesses.length,r.revealed]);
 async function request(command:Record<string,unknown>){
  const full={game:'pictionary',index:r.index,roundId:r.roundId,requestId:crypto.randomUUID(),...command};
  queueCount.current++;setQueued(queueCount.current);
  const task=tail.current.catch(()=>undefined).then(async()=>{
   // Reuse the ID after a network failure: the server will not score or draw twice.
   try{return await send(full);}catch(e){if((e as Error & {status?:number}).status&&((e as Error & {status?:number}).status||0)<500)throw e;return await send(full);}
  });
  tail.current=task;
  try{return await task;}finally{queueCount.current--;if(mounted.current)setQueued(queueCount.current);}
 }
 function flush(final=false){
  const ink=active.current;if(!ink||!ink.points.length)return;
  // A carried endpoint only connects the next batch; it is not new ink.
  if(ink.points.length===1&&ink.id==='carry'){if(final){active.current=null;setLiveInk(null);}return;}
  const chunk={...ink,id:crypto.randomUUID(),points:[...ink.points]};
  setLocal(prev=>[...prev,chunk]);
  active.current=final?null:{...ink,id:'carry',points:[ink.points.at(-1)!]};setLiveInk(active.current);
  void request({type:'pictionary_ink',requestId:chunk.id,stroke:chunk.stroke,points:chunk.points,colour:chunk.colour,width:chunk.width,canvasEpoch:r.canvasEpoch}).catch(e=>{
   if(mounted.current){setLocal(prev=>prev.filter(s=>s.id!==chunk.id));setError(e instanceof Error?e.message:'That stroke could not be saved. Please draw it again.');}
  });
 }
 const flushRef=useRef(flush);flushRef.current=flush;
 useEffect(()=>{const timer=setInterval(()=>flushRef.current(),180);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(!running){active.current=null;setLiveInk(null);pointer.current=null;}},[running]);
 function point(e:PointerEvent<SVGSVGElement>):Point{const b=e.currentTarget.getBoundingClientRect();return[Math.round(Math.max(0,Math.min(1000,(e.clientX-b.left)/b.width*1000))),Math.round(Math.max(0,Math.min(650,(e.clientY-b.top)/b.height*650)))];}
 function down(e:PointerEvent<SVGSVGElement>){if(!canDraw||pointer.current!==null||e.button!==0)return;e.preventDefault();setError('');pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);active.current={id:'live',stroke:crypto.randomUUID(),points:[point(e)],colour,width};setLiveInk({...active.current});}
 function move(e:PointerEvent<SVGSVGElement>){if(pointer.current!==e.pointerId||!active.current)return;if(!canDraw){flush(true);pointer.current=null;return;}const p=point(e),last=active.current.points.at(-1)!;if(Math.hypot(p[0]-last[0],p[1]-last[1])<1.5)return;active.current.points.push(p);setLiveInk({...active.current,points:[...active.current.points]});if(active.current.points.length>=64)flush();}
 function up(e:PointerEvent<SVGSVGElement>){if(pointer.current!==e.pointerId)return;flush(true);pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 async function control(type:string){if(busy)return;flush(true);setBusy(true);setError('');try{await request({type,canvasEpoch:r.canvasEpoch});}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{if(mounted.current)setBusy(false);}}
 async function submitGuess(){if(!canGuess||guessBusy||!guess.trim())return;setGuessBusy(true);setError('');try{await request({type:'pictionary_guess',answer:guess.trim()});setGuess('');}catch(e){setError(e instanceof Error?e.message:'Please try your guess again.');}finally{if(mounted.current)setGuessBusy(false);}}
 const serverIds=new Set(r.strokes.map(s=>s.id)),marks=[...r.strokes,...local.filter(s=>!serverIds.has(s.id))];
 return <section className="pictionary-stage stage-enter" aria-labelledby="pictionary-title" data-round={roundKey}>
  <div className="round-titlebar"><div><p className="eyebrow">GAME 01 <span>/</span> DRAWING {r.index+1} OF {r.total}</p><h1 id="pictionary-title">Pictionary <span className="pictionary-pencil" aria-hidden="true">✎</span></h1></div><div className={`timer-disc ${seconds<=15&&running?'hurry':''} ${r.revealed?'expired':''}`} aria-label={`${seconds} seconds remaining`}><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong><span>{r.revealed?'FINISHED':r.pausedMs!==null?'PAUSED':'REMAINING'}</span></div></div>
  <div className="pictionary-turns" aria-label="Drawing turns">{players.filter(p=>r.turns.includes(p.id)).map(p=>{const indices=r.turns.flatMap((id,i)=>id===p.id?[i]:[]);return <div key={p.id} className={r.performer===p.id?'is-drawer':''}><span className={`avatar face-${p.avatar}`} aria-hidden="true"/><span><strong>{p.name}{p.id===me?' (you)':''}</strong><small>{p.id===r.performer?'Drawing now':!p.online?'Reconnecting':'Two drawings each'}</small></span><span className="drawing-pips">{indices.map((i,n)=><i key={i} className={i<r.index||i===r.index&&r.revealed?'done':i===r.index?'current':''} aria-label={`Drawing ${n+1}: ${i<r.index||i===r.index&&r.revealed?'done':i===r.index?'current':'up next'}`}>{i<r.index||i===r.index&&r.revealed?'✓':n+1}</i>)}</span></div>;})}</div>
  <div className="pictionary-layout"><div className="drawing-column">
   <div className={`secret-word ${drawer&&!testGuess?'for-drawer':''}`}><span>{r.revealed?'THE WORD WAS':drawer&&!testGuess?'YOUR SECRET WORD · ONLY YOU CAN SEE THIS':`${name(r.performer).toUpperCase()} IS THE DRAWER`}</span><strong>{r.revealed?r.answer:drawer&&!testGuess?r.secretWord||'Ready for your mystery word?':running?'Watch the drawing. Take a guess.':started?'Pens down. The timer is paused.':'A masterpiece is on its way…'}</strong>{!r.revealed&&<small>{drawer&&!testGuess?'No letters, numbers, talking or gestures.':'First correct typed guess wins 1 point.'}</small>}</div>
   {drawer&&!r.revealed&&<div className="drawing-toolbar" aria-label="Drawing tools"><div className="ink-colours">{colours.map(([label,value])=><button key={value} className={`ink-colour ${colour===value?'selected':''}`} style={{background:value}} aria-label={label} aria-pressed={colour===value} title={label} disabled={!canDraw} onClick={()=>setColour(value)}>{label==='Eraser'?'⌫':''}</button>)}</div><label className="brush-picker">Brush<select value={width} disabled={!canDraw} onChange={e=>setWidth(Number(e.target.value))}><option value={3}>Fine</option><option value={6}>Medium</option><option value={10}>Bold</option><option value={18}>Thick</option></select></label><div className="canvas-actions"><button disabled={!canDraw||!marks.length} onClick={()=>control('pictionary_undo')}>↶ Undo</button><button disabled={!canDraw||!marks.length} onClick={()=>{if(confirm('Clear this drawing and start with a fresh pad?'))void control('pictionary_clear');}}>Clear pad</button></div></div>}
   <div className={`drawing-pad ${canDraw?'can-draw':''}`}><svg ref={pad} viewBox="0 0 1000 650" role="img" aria-label={`${name(r.performer)}’s shared drawing pad${canDraw?'. Draw with your mouse, finger or stylus.':''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} style={{touchAction:drawer?'none':'auto'}}>{marks.map(ink=><Mark key={ink.id} ink={ink}/>)}{liveInk&&(liveInk.id!=='carry'||liveInk.points.length>1)&&<Mark ink={liveInk}/>}</svg>
    {!started&&<div className="pad-overlay"><span className="pad-doodle" aria-hidden="true">✎</span><h2>{drawer?'Your time to shine.':`${name(r.performer)}’s turn to draw.`}</h2><p>{drawer?'A random word. A blank pad. 120 seconds.':'Get your guessing fingers ready.'}</p>{drawer?<button className="button gold" disabled={!connected||busy} onClick={()=>control('pictionary_start')}>Reveal my word & start →</button>:<small>Waiting for {name(r.performer)} to start…</small>}</div>}
    {started&&!running&&!r.revealed&&<div className="pad-paused"><span>Ⅱ</span> Timer paused</div>}
   </div>
   <div className="pad-caption"><span>{drawer?queued?'Syncing your drawing…':running?'Draw with your mouse, finger or stylus.':'Your drawing is saved.':'The drawing updates as they sketch.'}</span><span>2 drawings each · 120 seconds</span></div>
  </div><aside className="guess-column">
   <div className="guess-heading"><span className="eyebrow">{r.solo?'SOLO PRACTICE':'THE GUESSING GALLERY'}</span><h2>{r.revealed?r.winner?'We have a winner!':r.outcome==='timeout'?'Time’s up!':'Pens down.':drawer&&!testGuess?'Make it a masterpiece.':'What could it be?'}</h2><p>{r.solo?'Try the drawing tools and guessing. Practice does not award points.':drawer?'Everyone else sees your drawing, never your secret word.':'Keep guessing. Only the first correct guess scores.'}</p></div>
   {r.revealed&&<div className="drawing-result" role="status"><span aria-hidden="true">{r.winner?'✦':'✎'}</span><strong>{r.winner?`${name(r.winner)} guessed it!`:r.outcome==='practice'?'Practice complete':r.outcome==='timeout'?'Nobody guessed in time':'Drawing ended'}</strong><b>{r.winner?'+1 point':r.answer}</b></div>}
   <div className="guess-history" ref={history} aria-label="Players’ guesses" role="log" aria-live="polite">{!r.guesses.length?<p className="empty-guesses">{drawer?'The guesses will appear here.':'Your first guess could be the winner.'}</p>:r.guesses.map(g=><div key={g.id} className={g.correct?'correct-guess':''}><strong>{name(g.player)}</strong><span>{g.value}</span>{g.correct&&<b>✓</b>}</div>)}</div>
   {!r.revealed&&(!drawer||r.solo&&testGuess)&&<form className="pictionary-guess" onSubmit={e=>{e.preventDefault();void submitGuess();}}><label htmlFor="drawing-guess">Your guess</label><input id="drawing-guess" value={guess} onChange={e=>setGuess(e.target.value)} disabled={!canGuess} maxLength={80} autoComplete="off" placeholder={running?'Type what you see…':'Waiting for the drawing…'}/><button className="button gold" type="submit" disabled={!canGuess||guessBusy||!guess.trim()}>{guessBusy?'Checking…':'Send guess →'}</button></form>}
   {drawer&&!r.revealed&&!testGuess&&<p className="drawing-rules">✦ Pictures only. Keep your word secret and let your drawing do the talking.</p>}
   {r.solo&&running&&<button className="button outline practice-toggle" disabled={busy} onClick={()=>{flush(true);setTestGuess(!testGuess);}}>{testGuess?'Back to drawing':'Try the guessing box'}</button>}
  </aside></div>
  {error&&<p className="pictionary-error" role="alert">{error}</p>}
  {isHost?<div className="host-round-controls"><span className="host-control-label">♛ JACK’S CONTROL DESK</span><div className="control-buttons">{r.revealed?<button className="button gold" disabled={busy||!connected} onClick={()=>control('pictionary_next')}>{r.index===r.total-1?'Finish Pictionary':'Next drawing'} →</button>:<>{started&&<button className="button outline" disabled={busy||!connected} onClick={()=>control('timer')}>{r.deadline?'Pause timer':'Resume timer'}</button>}<button className="button outline" disabled={busy||!connected} onClick={()=>{if(r.solo||confirm('End this drawing now? Nobody will receive a point.'))void control('pictionary_finish');}}>{r.solo?'Finish practice drawing':'End drawing early'}</button></>}</div></div>:r.revealed&&<p className="waiting-for-host">Waiting for Jack to open the next drawing…</p>}
 </section>;
}
