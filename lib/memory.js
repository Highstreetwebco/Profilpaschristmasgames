import {memoryPictures} from './memory-pictures.js';
export const MEMORY_PREVIEW_MS=8000,MEMORY_LEAD_MS=1500,MEMORY_REVEAL_MS=1600;
function shuffled(values){const a=[...values];for(let i=a.length-1;i>0;i--){const range=i+1,limit=Math.floor(0x100000000/range)*range;let v;do{v=crypto.getRandomValues(new Uint32Array(1))[0];}while(v>=limit);const j=v%range;[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeMemory(players){
 const turns=shuffled(players);
 return {id:crypto.randomUUID(),index:0,deck:shuffled(memoryPictures.flatMap(p=>[p.id,p.id])),turns,turnIndex:0,performer:turns[0],turn:0,phase:'ready',previewAt:null,deadline:null,paused:false,remaining:null,previewWait:null,selected:[],matched:Array(24).fill(null),attempts:0,lastResult:null,complete:false};
}
const nextPlayer=r=>{r.turnIndex=(r.turnIndex+1)%r.turns.length;r.performer=r.turns[r.turnIndex];};
export function settleMemory(r,now){
 if(!r||r.paused||!r.deadline||now<r.deadline)return;
 if(r.phase==='preview'){r.phase='playing';r.previewAt=null;r.turn++;}
 else if(r.phase==='reveal'){
  if(r.lastResult?.outcome==='miss')nextPlayer(r);
  r.selected=[];r.turn++;
  if(r.matched.every(Boolean)){r.phase='complete';r.complete=true;}
  else r.phase='playing';
 }
 r.deadline=null;
}
export function pauseMemory(r,now){
 if(!r||r.paused||['ready','complete'].includes(r.phase))return;
 settleMemory(r,now);if(r.complete)return;
 r.paused=true;r.remaining=r.deadline===null?null:Math.max(0,r.deadline-now);r.previewWait=r.previewAt===null?null:Math.max(0,r.previewAt-now);r.deadline=null;r.previewAt=null;
}
function resumeMemory(r,now){r.paused=false;r.deadline=r.remaining===null?null:now+r.remaining;r.previewAt=r.previewWait===null?null:now+r.previewWait;r.remaining=null;r.previewWait=null;}
export function memoryAction(room,me,isHost,command,now,fail,score){
 const r=room.rounds.memory;
 if(room.stage!=='playing'||room.activeGame!=='memory'||!r||!me||!r.turns.includes(me.id))fail('Join the active memory game first.');
 if(command.game!=='memory'||command.roundId!==r.id)fail('That board has moved on. Refresh and try again.',409);
 settleMemory(r,now);
 const type=command.type;
 if(type==='memory_start'){
  if(!isHost)fail('Only Jack can start the preview.',403);
  if(r.phase!=='ready')fail('This board has already started.');
  r.phase='preview';r.previewAt=now+MEMORY_LEAD_MS;r.deadline=r.previewAt+MEMORY_PREVIEW_MS;
 }else if(type==='memory_pause'){
  if(!isHost)fail('Only Jack can pause or resume the board.',403);
  if(['ready','complete'].includes(r.phase))fail('Start the board before pausing it.');
  if(r.paused)resumeMemory(r,now);else pauseMemory(r,now);
 }else if(type==='memory_finish'){
  if(!isHost)fail('Only Jack can finish the round.',403);
  if(!r.complete)fail('Find all 12 pairs first.');
  room.stage='round_end';
 }else if(type==='memory_skip'){
  if(!isHost)fail('Only Jack can skip a turn.',403);
  if(r.phase!=='playing'||r.paused)fail('Wait for the current pair to finish.');
  if(command.turn!==r.turn)fail('That turn has moved on.',409);
  r.selected=[];r.lastResult={outcome:'skipped',player:r.performer};nextPlayer(r);r.turn++;
 }else if(type==='memory_flip'){
  if(r.phase!=='playing'||r.paused)fail(r.paused?'The board is paused.':'Wait until the cards are ready.');
  if(command.turn!==r.turn)fail('That turn has moved on.',409);
  if(me.id!==r.performer)fail('It is another player’s turn.',403);
  const i=command.position;
  if(!Number.isInteger(i)||i<0||i>=r.deck.length)fail('Choose a card on the board.');
  if(r.matched[i]||r.selected.includes(i))fail('Choose a different face-down card.',409);
  r.selected.push(i);
  if(r.selected.length===2){
   r.attempts++;const [a,b]=r.selected,match=r.deck[a]===r.deck[b];
   r.lastResult={outcome:match?'match':'miss',player:me.id};r.phase='reveal';r.deadline=now+MEMORY_REVEAL_MS;
   if(match){r.matched[a]=r.matched[b]=me.id;if(r.turns.length>1)score(room,me.id,1,`memory:${r.id}:${r.deck[a]}`,'Memory Match · matching pair');}
  }
 }else fail('Unknown memory action.');
}
export function memorySnapshot(original,now){
 const r=structuredClone(original);settleMemory(r,now);
 const preview=r.phase==='preview'&&!r.paused&&now>=r.previewAt;
 return {game:'memory',roundId:r.id,index:0,total:24,phase:r.phase,turn:r.turn,turns:r.turns,performer:r.performer,previewAt:r.previewAt,deadline:r.deadline,paused:r.paused,remaining:r.remaining,complete:r.complete,solo:r.turns.length===1,attempts:r.attempts,lastResult:r.lastResult,found:r.matched.filter(Boolean).length/2,
  pairCounts:Object.fromEntries(r.turns.map(id=>[id,r.matched.filter(p=>p===id).length/2])),
  cards:r.deck.map((face,position)=>({position,face:preview||r.matched[position]||!r.paused&&r.selected.includes(position)?face:null,matchedBy:r.matched[position],selected:r.selected.includes(position)}))};
}
