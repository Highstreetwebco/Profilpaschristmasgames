import {memoryPictures} from './memory-pictures.js';
export const MEMORY_PREVIEW_MS=8000,MEMORY_LEAD_MS=1500,MEMORY_REVEAL_MS=1600,MEMORY_MATCH_MS=400;
function shuffled(values){const a=[...values];for(let i=a.length-1;i>0;i--){const range=i+1,limit=Math.floor(0x100000000/range)*range;let v;do{v=crypto.getRandomValues(new Uint32Array(1))[0];}while(v>=limit);const j=v%range;[a[i],a[j]]=[a[j],a[i]];}return a;}
const playerBoard=()=>({turn:0,selected:[],matched:Array(24).fill(false),clicks:0,phase:'playing',deadline:null,remaining:null,lastResult:null,finished:false});
function board(players,id,deck){return {rulesVersion:2,id,index:0,deck,turns:[...players],performer:players[0],boards:Object.fromEntries(players.map(id=>[id,playerBoard()])),phase:'ready',loaded:[],previewAt:null,deadline:null,paused:false,remaining:null,previewWait:null,complete:false,results:null};}
export function makeMemory(players){return board(players,crypto.randomUUID(),shuffled(memoryPictures.flatMap(p=>[p.id,p.id])));}
// Old shared boards cannot provide comparable individual click counts. Restart only
// Memory, retaining its layout and the rest of the session, with a stable new ID.
export function upgradeMemory(room){const old=room.rounds.memory;if(!old||old.rulesVersion===2)return;room.rounds.memory=board(old.turns,`${old.id}-clicks`,old.deck);room.rounds.memory.updatedRules=true;room.ledger=room.ledger.filter(e=>!e.key.startsWith(`memory:${old.id}:`));if(room.activeGame==='memory'&&room.stage==='round_end')room.stage='playing';}
export function settleMemory(r,now){
 if(!r||r.paused||r.rulesVersion!==2)return;
 if(r.phase==='preview'&&r.deadline!==null&&now>=r.deadline){r.phase='playing';r.previewAt=null;r.deadline=null;for(const b of Object.values(r.boards))b.turn++;}
 for(const b of Object.values(r.boards))if(b.phase==='reveal'&&b.deadline!==null&&now>=b.deadline){b.phase=b.finished?'complete':'playing';b.deadline=null;b.selected=[];b.turn++;}
}
export function pauseMemory(r,now){
 if(!r||r.paused||['ready','complete'].includes(r.phase))return;
 settleMemory(r,now);r.paused=true;r.remaining=r.deadline===null?null:Math.max(0,r.deadline-now);r.previewWait=r.previewAt===null?null:Math.max(0,r.previewAt-now);r.deadline=null;r.previewAt=null;
 for(const b of Object.values(r.boards)){b.remaining=b.deadline===null?null:Math.max(0,b.deadline-now);b.deadline=null;b.turn++;}
}
function resumeMemory(r,now){r.paused=false;r.deadline=r.remaining===null?null:now+r.remaining;r.previewAt=r.previewWait===null?null:now+r.previewWait;r.remaining=null;r.previewWait=null;for(const b of Object.values(r.boards)){b.deadline=b.remaining===null?null:now+b.remaining;b.remaining=null;b.turn++;}}
function finishRanking(room,r,score){
 if(r.results||!r.turns.every(id=>r.boards[id].finished))return;
 const counts=r.turns.map(id=>r.boards[id].clicks),best=Math.min(...counts),worst=Math.max(...counts),solo=r.turns.length===1;
 r.results=r.turns.map(player=>{const clicks=r.boards[player].clicks,rank=1+counts.filter(n=>n<clicks).length;return{player,rank,clicks,points:solo?0:({1:5,2:3,3:1}[rank]||0),last:!solo&&clicks===worst&&worst>best};}).sort((a,b)=>a.rank-b.rank);
 r.phase='complete';r.complete=true;
 if(!solo)for(const result of r.results)score(room,result.player,result.points,`memory:${r.id}:ranking`,`Memory Match · ${result.clicks} clicks · place ${result.rank}${result.last?' · Nob head':''}`);
}
export function memoryAction(room,me,isHost,command,now,fail,score){
 const r=room.rounds.memory;
 if(room.stage!=='playing'||room.activeGame!=='memory'||!r||!me||!r.turns.includes(me.id))fail('Join the active memory game first.');
 if(command.game!=='memory'||command.roundId!==r.id)fail('That board has moved on. Refresh and try again.',409);
 settleMemory(r,now);
 const type=command.type;
 if(type==='memory_loaded'){
  if(r.phase==='ready'){r.loaded=[...new Set([...(r.loaded||[]),me.id])];}
 }else if(type==='memory_start'){
  if(!isHost)fail('Only Jack can start the preview.',403);
  if(r.phase!=='ready')fail('This board has already started.');
  if(!r.turns.every(id=>r.loaded?.includes(id)))fail('Wait for everyone’s pictures to finish loading.');
  r.phase='preview';r.previewAt=now+MEMORY_LEAD_MS;r.deadline=r.previewAt+MEMORY_PREVIEW_MS;
 }else if(type==='memory_pause'){
  if(!isHost)fail('Only Jack can pause or resume the board.',403);
  if(['ready','complete'].includes(r.phase))fail('Start the board before pausing it.');
  if(r.paused)resumeMemory(r,now);else pauseMemory(r,now);
 }else if(type==='memory_finish'){
  if(!isHost)fail('Only Jack can finish the round.',403);
  if(!r.complete)fail('Everyone needs to find all 12 pairs first.');
  room.stage='round_end';
 }else if(type==='memory_flip'){
  const b=r.boards[me.id];
  if(r.phase!=='playing'||r.paused||b.phase!=='playing'||b.finished)fail(r.paused?'The board is paused.':b.finished?'You have found all your pairs.':'Wait until the cards are ready.');
  if(command.turn!==b.turn)fail('That selection has moved on.',409);
  const i=command.position;
  if(!Number.isInteger(i)||i<0||i>=r.deck.length)fail('Choose a card on the board.');
  if(b.matched[i]||b.selected.includes(i))fail('Choose a different face-down card.',409);
  b.selected.push(i);b.clicks++;b.turn++;
  if(b.selected.length===2){
   const [a,c]=b.selected,match=r.deck[a]===r.deck[c];
   b.lastResult={outcome:match?'match':'miss'};b.phase='reveal';b.deadline=now+(match?MEMORY_MATCH_MS:MEMORY_REVEAL_MS);
   if(match){b.matched[a]=b.matched[c]=true;b.finished=b.matched.every(Boolean);}
   finishRanking(room,r,score);
  }
 }else fail('Unknown memory action.');
}
export function memorySnapshot(original,me,now){
 const r=structuredClone(original);settleMemory(r,now);
 const b=r.boards[me?.id],preview=!!b&&r.phase==='preview'&&!r.paused&&now>=r.previewAt;
 return {game:'memory',roundId:r.id,index:0,total:24,phase:['ready','preview','complete'].includes(r.phase)?r.phase:b?.phase||'playing',turn:b?.turn??null,turns:r.turns,loaded:r.loaded||[],previewAt:r.previewAt,deadline:r.phase==='preview'?r.deadline:b?.deadline??null,paused:r.paused,remaining:r.phase==='preview'?r.remaining:b?.remaining??null,complete:r.complete,finished:b?.finished||false,solo:r.turns.length===1,updatedRules:!!r.updatedRules,clicks:b?.clicks||0,lastResult:b?.lastResult||null,found:b?b.matched.filter(Boolean).length/2:0,results:r.results,
  playerStats:Object.fromEntries(r.turns.map(id=>{const p=r.boards[id];return[id,{clicks:p.clicks,found:p.matched.filter(Boolean).length/2,finished:p.finished}];})),
  cards:r.deck.map((face,position)=>({position,face:preview||b&&(b.matched[position]||!r.paused&&b.selected.includes(position))?face:null,matchedBy:b?.matched[position]?me.id:null,selected:b?.selected.includes(position)||false}))};
}
