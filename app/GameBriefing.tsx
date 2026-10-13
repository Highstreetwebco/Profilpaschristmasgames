'use client';
import {useEffect,useRef,useState} from 'react';

const briefings=[
 {id:'pictionary',name:'Pictionary',presenter:'Jack',sprite:'jack',role:'The Ringmaster',line:'Pens out. Artistic ability absolutely optional.',goal:'Draw it. Guess it. Grab the point.',facts:['120 seconds','2 drawings each','First correct guess wins'],steps:[
  ['Take the spotlight','Each player draws twice. When it’s your turn, reveal your random secret word to start the 120-second clock.'],
  ['Get guessing','Everyone else sees your drawing, but never the word. Type your guesses; the first correct answer wins 1 point.'],
  ['Keep it a drawing','No letters, numbers, talking or gestures. The drawer cannot guess their own word. Jack moves everyone to the next drawing.']
 ],score:'1 point to the first correct guesser.',keys:'Mouse or trackpad to draw · Enter to send a guess',button:'Let’s draw',practice:'Draw both prompts and try the guess controls yourself. Practice awards no points.'},
 {id:'hangman',name:'Team Hangman',presenter:'Lauren',sprite:'lauren',role:'The Festive Spark',line:'Save your colleague. Try not to make it weird.',goal:'Work together. Rescue the elf.',facts:['Work-related words','6 shared mistakes','1 word setter at a time'],steps:[
  ['Set the challenge','Everyone sets one word. Use your assigned work category: tiling, products, colleagues or something from the job. Keep it secret.'],
  ['Talk it through','The rest of the team works together in Teams. Guess letters or submit the whole answer. The word setter sits this one out.'],
  ['Save the elf','Wrong letters or whole answers build the wooden frame. Solve it before six shared mistakes to earn 1 point for every guesser.']
 ],score:'A rescue earns each guesser 1 point. The setter earns none.',keys:'Type A–Z for letters · Enter to submit the whole answer',button:'Let’s save an elf',practice:'Set a work-related word, then test the letter and answer controls yourself. Practice awards no points.'},
 {id:'memory',name:'Memory Match',presenter:'Stu',sprite:'stu',role:'The Detail Elf',line:'Use your head. Ideally before earning the title.',goal:'Find every pair. Use fewer clicks.',facts:['24 cards · 12 pairs','8-second preview','Clicks count, not speed'],steps:[
  ['Have a proper look','Everyone’s pictures load first. Jack starts an eight-second preview. Memorise the positions before the cards turn over.'],
  ['Match two at a time','You each play your own copy of the same board. Flip two cards: matches stay up; misses turn back over. Every card flip counts.'],
  ['Be careful, not quick','Finish all 12 pairs. Fewest clicks wins, regardless of who finishes first. Ties share a place; the unfortunate last place is “Nob head”.']
 ],score:'1st: 5 points · 2nd: 3 points · 3rd: 1 point.',keys:'Click a card · Or use arrows and Enter / Space',button:'Let’s find some pairs',practice:'Preview the cards and clear all 12 pairs. Your clicks still count, but practice awards no points.'},
 {id:'battleships',name:'Battleships',presenter:'Rich',sprite:'richard',role:'The Big Claus',line:'Protect your fleet. Richard’s small ship is counting on you.',goal:'Sink their ships. Stay afloat.',facts:['3 ships per player','Any opponent','1 missile per turn'],steps:[
  ['Position your fleet','Select a ship, move it with the arrows and rotate it with R or the rotate button. Confirm your positions. Battle begins once everyone is ready.'],
  ['Pick your victim','You see your own ships; enemy fleets stay hidden. On your turn, click an untried square on any surviving opponent’s board to launch a missile.'],
  ['Watch the fireworks','An explosion is a hit; a splash is a miss. Both leave a marker. The turn passes after each shot. Sink every enemy fleet to win.']
 ],score:'Last afloat: 5 points · 2nd: 3 points · 3rd: 1 point.',keys:'Setup: arrows + R · Battle: click a square to fire',button:'Let’s position the ships',practice:'You’re playing against Santa’s Navy. Position your fleet and test your aim. Practice awards no points.'}
];

export default function GameBriefing({game,isHost,locked,solo,onBegin}:{game:string;isHost:boolean;locked:boolean;solo:boolean;onBegin:()=>void}){
 const info=briefings.find(b=>b.id===game);
 const heading=useRef<HTMLHeadingElement>(null),speech=useRef<SpeechSynthesisUtterance|null>(null);
 const[audioAvailable,setAudioAvailable]=useState(false),[speaking,setSpeaking]=useState(false),[audioError,setAudioError]=useState('');
 useEffect(()=>{
  heading.current?.focus({preventScroll:true});setAudioAvailable('speechSynthesis' in window&&'SpeechSynthesisUtterance' in window);
  return()=>{if(speech.current){speech.current.onend=null;speech.current.onerror=null;window.speechSynthesis?.cancel();speech.current=null;}};
 },[]);
 if(!info)return null;
 function narrate(){
  if(!info||!audioAvailable)return;
  const synth=window.speechSynthesis;
  if(speech.current){speech.current.onend=null;speech.current.onerror=null;synth.cancel();speech.current=null;setSpeaking(false);return;}
  setAudioError('');
  const text=`${info.presenter} here. ${info.line} ${info.name}. ${info.goal} ${info.steps.map(([title,body])=>`${title}. ${body}`).join(' ')} ${solo?info.practice:info.score} When everyone is ready, Jack will open the game.`;
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=0.98;
  const voices=synth.getVoices(),voice=voices.find(v=>v.lang==='en-GB'&&v.localService)||voices.find(v=>v.lang==='en-GB');if(voice)utterance.voice=voice;
  utterance.onend=()=>{speech.current=null;setSpeaking(false);};utterance.onerror=()=>{speech.current=null;setSpeaking(false);setAudioError('Audio couldn’t play. All the rules are on screen.');};
  speech.current=utterance;setSpeaking(true);try{synth.speak(utterance);}catch{speech.current=null;setSpeaking(false);setAudioError('Audio couldn’t play. All the rules are on screen.');}
 }
 return <section className={`game-briefing ${speaking?'is-speaking':''}`} aria-labelledby="briefing-title" data-presenter={info.sprite}>
  <div className="briefing-character">
   <div className="briefing-spotlight" aria-hidden="true"/>
   <div className="briefing-character-art"><svg className="briefing-avatar" viewBox="0 0 1024 1536" overflow="hidden" role="img" aria-label={`${info.presenter}’s full-body Christmas avatar`}><image href={`/assets/${info.sprite}-full-elf.webp`} width="2048" height="1536" preserveAspectRatio="none"/></svg></div>
   <div className="briefing-presenter"><span>YOUR GAME GUIDE</span><strong>{info.presenter}</strong><small>{info.role}</small></div>
  </div>
  <div className="briefing-copy">
   <p className="eyebrow">GAME 0{briefings.indexOf(info)+1} OF 04 <span>✦</span> THE RULES</p>
   <h1 id="briefing-title" tabIndex={-1} ref={heading}>{info.name}</h1>
   <p className="briefing-quote">“{info.line}”</p>
   <h2>{info.goal}</h2>
   <div className="briefing-facts">{info.facts.map(f=><span key={f}>{f}</span>)}</div>
   <ol className="briefing-steps">{info.steps.map(([title,body],i)=><li key={title}><span aria-hidden="true">0{i+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
   <div className="briefing-score"><span>{solo?'SOLO PRACTICE':'POINTS UP FOR GRABS'}</span><p>{solo?info.practice:info.score}</p></div>
   <p className="briefing-keys">{info.keys}</p>
   <div className="briefing-actions">
    {isHost?<button className="button gold" disabled={locked} onClick={onBegin}>{locked?'Connecting…':info.button} <span>→</span></button>:<p className="briefing-wait" role="status"><span className="waiting-orbit"/>Waiting for Jack to open the game…</p>}
    {audioAvailable&&<button className="briefing-audio" onClick={narrate} aria-pressed={speaking}>{speaking?'Stop reading ■':'Hear the rules ♫'}<small>Device voice · this laptop only</small></button>}
   </div>
   <p className="briefing-footnote" role={audioError?'status':undefined}>{audioError|| (isHost?'Give everyone a moment to read. This button moves all players together.':'The game waits here until Jack continues. No timer is running.')}</p>
  </div>
 </section>;
}
