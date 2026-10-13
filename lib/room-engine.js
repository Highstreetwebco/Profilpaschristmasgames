import {makeBattleships,pauseBattleships,battleshipsAction,battleshipsSnapshot} from './battleships.js';
import {makeMemory,upgradeMemory,settleMemory,pauseMemory,memoryAction,memorySnapshot} from './memory.js';
import {makeHangman,hangmanAction,hangmanSnapshot} from './hangman.js';
import {makePictionary,settlePictionary,pictionaryAction,pictionarySnapshot} from './pictionary.js';
import {games} from './game-data.js';
import {INTRO_DURATION,INTRO_LEAD_IN} from './intro-timeline.js';

export const roster=[
 {id:'richard',name:'Richard',avatar:3,title:'The Big Claus'},
 {id:'stu',name:'Stu',avatar:1,title:'The Detail Elf'},
 {id:'jack',name:'Jack',avatar:0,title:'The Ringmaster'},
 {id:'lauren',name:'Lauren',avatar:2,title:'The Festive Spark'}
];
export class RoomError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=(text,status=400)=>{throw new RoomError(text,status);};
export function newRoom(){return{stage:'lobby',intro:null,participants:[],players:roster.map(p=>({...p,owner:null,ready:false})),activeGame:null,rounds:{},ledger:[],commands:[]};}
const participants=room=>room.participants?.length?room.participants:roster.map(p=>p.id);
const stageAt=(room,now)=>room.stage==='intro'&&now>=room.intro?.endsAt||['briefing','playing','round_end'].includes(room.stage)&&!games.some(g=>g.id===room.activeGame)?'menu':room.stage;
export const gameById=id=>games.find(g=>g.id===id);
export const playerFor=(room,actor)=>room.players.find(p=>p.owner===actor.key);
export const hostFor=(room,actor)=>playerFor(room,actor)?.id==='jack';
const online=(player,presence,now)=>!!player.owner&&(presence[player.owner]||0)>now-20000;
const total=(room,id)=>room.ledger.filter(e=>e.player===id).reduce((n,e)=>n+e.points,0);
const normalise=s=>String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\b(the|a|an)\b/g,'').replace(/\s+/g,' ').trim();
const acceptedEmoji={0:['Home Alone'],1:['The Polar Express','Polar Express'],2:['Jingle Bells'],3:['Silent Night'],4:['Rudolph the Red Nosed Reindeer','Rudolph','Rudolph the Red Nose Reindeer'],5:['Frosty the Snowman','Frosty'],6:['The Grinch','How the Grinch Stole Christmas'],7:['Santa Claus Is Coming to Town','Santa Claus Is Coming to Town','Santa Claus Is Comin to Town','Santa Is Coming to Town']};
function score(room,player,points,key,source){const index=room.ledger.findIndex(e=>e.key===key&&e.player===player);const entry={key,player,points,source};if(index>=0)room.ledger[index]=entry;else room.ledger.push(entry);}
function current(room){const g=gameById(room.activeGame),r=room.rounds[room.activeGame];if(!g||!r||r.complete)fail('There is no active round.');return{g,r,c:g.cards[r.index]};}
export function transition(input,actor,command,presence={},now=Date.now()){
 const room=structuredClone(input);upgradeMemory(room);const type=command.type;
 room.stage=stageAt(room,now);
 settlePictionary(room.rounds.pictionary,now);
 settleMemory(room.rounds.memory,now);
 if(!actor.key)fail('Join the room first.',401);
 if(command.requestId&&room.commands.includes(command.requestId))return room;
 const me=playerFor(room,actor),isHost=hostFor(room,actor);
 if(type==='join'){
  if(room.stage!=='lobby')fail('The games have started. Jack can return everyone to the lobby.');
  const target=room.players.find(p=>p.id===command.player);if(!target)fail('Choose one of the four players.');
  if(me&&me.id!==target.id)fail('Leave your current player before choosing another name.');
  if(target.owner&&target.owner!==actor.key&&online(target,presence,now))fail(`${target.name} is already playing on another device.`,409);
  target.owner=actor.key;target.ready=true;
 }else if(type==='ready'){
  if(room.stage!=='lobby'||!me)fail('Choose your player in the lobby first.');me.ready=!!command.ready;
 }else if(type==='leave'){
  if(room.stage!=='lobby')fail('You can change players when Jack returns to the lobby.');if(me){me.owner=null;me.ready=false;}
 }else if(type.startsWith('battle_')){
  battleshipsAction(room,me,isHost,command,presence,now,fail,score);
 }else if(type.startsWith('memory_')){
  memoryAction(room,me,isHost,command,now,fail,score);
 }else if(type.startsWith('hangman_')){
  hangmanAction(room,me,isHost,command,now,fail,score);
 }else if(type.startsWith('pictionary_')){
  pictionaryAction(room,me,isHost,command,now,fail,score);
 }else if(type==='answer'){
  if(room.stage!=='playing'||!me||!participants(room).includes(me.id))fail('Join an active game first.');const{g,r,c}=current(room);
  if(command.game!==g.id||command.index!==r.index)fail('That question has moved on. Please try the current one.',409);
  if(['pictionary','hangman','memory','battleships'].includes(g.id)||g.maxPoints!==1||r.revealed||!r.deadline||now>=r.deadline)fail('Answers are closed for this question.');
  if(r.answers[me.id])fail('Your answer is already locked in.',409);
  const answer=g.id==='quiz'?Number(command.answer):String(command.answer||'').trim();
  if(g.id==='quiz'&&(!Number.isInteger(answer)||!c.options[answer]))fail('Choose a valid answer.');
  if(g.id==='emoji'&&(!answer||answer.length>120))fail('Enter an answer of 1–120 characters.');
  r.answers[me.id]={value:answer};
 }else{
  if(!isHost)fail('Only Jack can control the games.',403);
  if(room.stage==='intro'&&!['lobby','reset'].includes(type))fail('Lauren is fixing the logo. The games will open in a moment.');
  if(type==='start'){
   if(room.stage!=='lobby')fail('The games have already started.');
   if(!me.ready||!online(me,presence,now))fail('Ready up as Jack before starting.');
   room.participants=room.players.filter(p=>p.ready&&online(p,presence,now)).map(p=>p.id);
   room.intro={startsAt:now+INTRO_LEAD_IN,endsAt:now+INTRO_LEAD_IN+INTRO_DURATION};room.stage='intro';
  }else if(type==='release'){
   if(room.stage!=='lobby')fail('Return to the lobby before releasing a player.');const p=room.players.find(p=>p.id===command.player);if(!p||p.id==='jack')fail('Choose a guest player.');p.owner=null;p.ready=false;
  }else if(type==='restart_game'){
   if(!['menu','briefing','playing','round_end','podium'].includes(room.stage))fail('Open the game menu before restarting a game.');
   const g=gameById(command.game),old=room.rounds[command.game];
   if(!g||!old||!['pictionary','hangman','memory','battleships'].includes(g.id))fail('Choose a game that has already been started.');
   if(command.roundId!==old.id)fail('That game has already changed. Refresh before restarting.',409);
   if(command.confirmRestart!==true)fail('Confirm that you want to restart this game and remove its automatic points.');
   // Switching to a restarted game must also freeze whichever game is open.
   if(room.activeGame==='memory')pauseMemory(room.rounds.memory,now);
   if(room.activeGame==='battleships')pauseBattleships(room.rounds.battleships);
   const active=room.rounds[room.activeGame];
   if(active?.deadline){active.pausedMs=Math.max(0,active.deadline-now);active.deadline=null;}
   const create={pictionary:makePictionary,hangman:makeHangman,memory:makeMemory,battleships:makeBattleships}[g.id];
   room.rounds[g.id]={...create(participants(room)),briefingPending:true};
   room.ledger=room.ledger.filter(entry=>!entry.key.startsWith(`${g.id}:`));
   room.activeGame=g.id;room.stage='briefing';
  }else if(type==='choose'){
   if(!['menu','round_end'].includes(room.stage))fail('Return to the game menu first.');const g=gameById(command.game);if(!g)fail('Choose a game.');
   if(room.rounds[g.id]?.complete)fail('This round is complete. Reset the session to play it again.');
   // Only newly created rounds need the rules. Existing live rounds keep their
   // progress when this feature is deployed or a paused game is resumed.
   const fresh=!room.rounds[g.id];
   room.activeGame=g.id;room.rounds[g.id]??=g.id==='pictionary'?makePictionary(participants(room)):g.id==='hangman'?makeHangman(participants(room)):g.id==='memory'?makeMemory(participants(room)):g.id==='battleships'?makeBattleships(participants(room)):{index:0,revealed:false,deadline:null,pausedMs:null,answers:{},complete:false,performer:participants(room)[0]};
   if(fresh&&['pictionary','hangman','memory','battleships'].includes(g.id))room.rounds[g.id].briefingPending=true;
   if(['pictionary','hangman','memory','battleships'].includes(g.id)&&(room.rounds[g.id].turns.some(id=>!participants(room).includes(id))||new Set(room.rounds[g.id].turns).size!==participants(room).length))fail('This round has a different group. Reset the session to start a new round.');
   if(g.id!=='battleships'&&!participants(room).includes(room.rounds[g.id].performer))room.rounds[g.id].performer=participants(room)[room.rounds[g.id].index%participants(room).length];room.stage=room.rounds[g.id].briefingPending?'briefing':'playing';
  }else if(type==='begin_game'){
   const r=room.rounds[room.activeGame];
   if(command.game!==room.activeGame||!r||command.roundId!==r.id)fail('That game has changed. Use the current rules screen.',409);
   if(room.stage!=='briefing'||!r.briefingPending)fail('The rules have already finished.',409);
   r.briefingPending=false;room.stage='playing';
  }else if(type==='menu'){
   if(room.activeGame==='memory')pauseMemory(room.rounds.memory,now);
   if(room.activeGame==='battleships')pauseBattleships(room.rounds.battleships);
   if(room.stage==='lobby')fail('Start the games from the lobby first.');if(room.activeGame&&room.rounds[room.activeGame]?.deadline){const r=room.rounds[room.activeGame];r.pausedMs=Math.max(0,r.deadline-now);r.deadline=null;}room.stage='menu';
  }else if(type==='lobby'){
   if(room.activeGame==='memory')pauseMemory(room.rounds.memory,now);
   if(room.activeGame==='battleships')pauseBattleships(room.rounds.battleships);
   if(room.activeGame&&room.rounds[room.activeGame]?.deadline){const r=room.rounds[room.activeGame];r.pausedMs=Math.max(0,r.deadline-now);r.deadline=null;}room.stage='lobby';room.players.forEach(p=>p.ready=false);
  }else if(type==='podium'){
   if(room.activeGame==='memory')pauseMemory(room.rounds.memory,now);
   if(room.activeGame==='battleships')pauseBattleships(room.rounds.battleships);
   if(room.stage==='lobby')fail('Start the session first.');if(room.activeGame&&room.rounds[room.activeGame]?.deadline){const r=room.rounds[room.activeGame];r.pausedMs=Math.max(0,r.deadline-now);r.deadline=null;}room.stage='podium';
  }else if(type==='reset'){
   room.stage='lobby';room.intro=null;room.participants=[];room.activeGame=null;room.rounds={};room.ledger=[];room.players.forEach(p=>p.ready=false);
  }else if(type==='adjust'){
   if(!room.players.some(p=>p.id===command.player)||!Number.isInteger(command.points)||Math.abs(command.points)>100||command.points===0)fail('Choose a player and a whole score adjustment from -100 to 100.');
   const reason=String(command.reason||'').trim().slice(0,100);if(!reason)fail('Add a reason for the adjustment.');score(room,command.player,command.points,`adjust:${command.requestId}`,reason);
  }else{
   if(room.stage!=='playing')fail('Open a game first.');const{g,r,c}=current(room);
   if(command.game!==g.id||command.index!==r.index)fail('This card has moved on. Your screen is refreshing.',409);
   if(g.id==='battleships')fail('Use the Battleships controls for this fleet.');
   if(g.id==='memory')fail('Use the Memory Match controls for this board.');
   if(g.id==='hangman')fail('Use the Hangman controls for this word.');
   if(g.id==='pictionary'&&type!=='timer')fail('Use the Pictionary controls for this drawing.');
   if(g.id==='pictionary'&&command.roundId!==r.id)fail('That drawing has moved on. Your screen is refreshing.',409);
   if(type==='timer'){
    if(g.id==='pictionary'&&!r.deadline&&r.pausedMs===null)fail('The drawer must reveal their word to start the timer.');
    if(r.revealed)fail('This card is already revealed.');
    if(r.deadline){r.pausedMs=Math.max(0,r.deadline-now);r.deadline=null;}
    else{if(r.pausedMs===0)fail('Time is up. Reveal the result or move on.');r.deadline=now+(r.pausedMs??g.seconds*1000);r.pausedMs=null;}
   }else if(type==='reveal'){
    if(r.revealed)return room;r.revealed=true;r.deadline=null;r.pausedMs=null;
    if(g.maxPoints===1)for(const p of room.players.filter(p=>participants(room).includes(p.id))){const a=r.answers[p.id];const correct=!!a&&(g.id==='quiz'?a.value===c.answer:(acceptedEmoji[r.index]||[c.answer]).some(x=>normalise(x)===normalise(a.value)));score(room,p.id,correct?1:0,`${g.id}:${r.index}`,`${g.short} · card ${r.index+1}`);}
   }else if(type==='performer'){
    if(g.maxPoints===1||r.deadline||r.pausedMs!==null||r.revealed)fail('Choose the performer before starting the timer.');if(!participants(room).includes(command.player))fail('Choose a player taking part in this session.');r.performer=command.player;
   }else if(type==='award'){
    if(g.maxPoints===1||!Number.isInteger(command.points)||command.points<0||command.points>3)fail('Choose 0, 1, 2 or 3 points for this challenge.');
    r.revealed=true;r.deadline=null;r.pausedMs=null;score(room,r.performer,command.points,`${g.id}:${r.index}`,`${g.short} · card ${r.index+1}`);
   }else if(type==='next'){
    if(!r.revealed)fail(g.maxPoints===1?'Reveal the answer before moving on.':'Award points (including 0) before moving on.');
    if(r.index>=g.cards.length-1){r.complete=true;room.stage='round_end';}else{r.index++;r.revealed=false;r.deadline=null;r.pausedMs=null;r.answers={};r.performer=participants(room)[r.index%participants(room).length];}
   }else fail('Unknown room action.');
  }
 }
 if(command.requestId)room.commands=[...room.commands,command.requestId].slice(-150);
 return room;
}
export function snapshot(room,actor,presence={},now=Date.now(),version=0){
 if(room.rounds.memory&&room.rounds.memory.rulesVersion!==2){room=structuredClone(room);upgradeMemory(room);}
 const me=playerFor(room,actor);const isHost=hostFor(room,actor);
 const players=room.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,title:p.title,taken:online(p,presence,now),ready:p.ready,online:online(p,presence,now),score:total(room,p.id),me:p.id===me?.id}));
 const result={stage:stageAt(room,now),intro:room.intro||null,participants:participants(room),version,serverTime:now,me:me?.id||null,isHost,players,readyCount:players.filter(p=>p.ready&&p.online).length,allReady:players.every(p=>p.ready&&p.online),canStart:isHost&&room.stage==='lobby'&&!!me?.ready&&online(me,presence,now),activeGame:room.activeGame,games:games.map(g=>({id:g.id,name:g.name,short:g.short,description:g.description,icon:g.icon,instructions:g.instructions,roundId:room.rounds[g.id]?.id||null,seconds:g.seconds,cards:g.id==='pictionary'?(room.rounds.pictionary?.turns.length||participants(room).length*2):g.id==='hangman'?(room.rounds.hangman?.turns.length||participants(room).length):g.id==='memory'?24:g.id==='battleships'?Math.max(2,participants(room).length):g.cards.length,maxPoints:g.maxPoints,complete:!!room.rounds[g.id]?.complete,progress:g.id==='battleships'?(room.rounds.battleships?.phase==='battle'?1:0):g.id==='memory'?(room.rounds.memory?.phase!=='ready'&&!!room.rounds.memory?1:0):room.rounds[g.id]?.index||0})),round:null,recentScores:isHost?room.ledger.slice(-8):[]};
 const g=gameById(room.activeGame),r=room.rounds[room.activeGame];
 if(g?.id==='battleships'&&r){result.round=battleshipsSnapshot(r,me,now);}
 else if(g?.id==='memory'&&r){result.round=memorySnapshot(r,me,now);}
 else if(g?.id==='hangman'&&r){result.round=hangmanSnapshot(r,me,room.ledger);}
 else if(g?.id==='pictionary'&&r){result.round=pictionarySnapshot(r,me,now,room.ledger);}
 else if(g&&r){const c=g.cards[r.index];result.round={game:g.id,index:r.index,total:g.cards.length,revealed:r.revealed,deadline:r.deadline,pausedMs:r.pausedMs,seconds:g.seconds,complete:r.complete,performer:r.performer,question:c.q,options:c.options||null,category:c.category||null,note:g.id==='pitch'||r.revealed?c.note:null,answer:r.revealed?(g.id==='quiz'?c.options[c.answer]:c.answer||null):null,correctOption:r.revealed&&g.id==='quiz'?c.answer:null,myAnswer:me?r.answers[me.id]?.value??null:null,answered:Object.keys(r.answers),answers:r.revealed?r.answers:null,awards:r.revealed?room.ledger.filter(e=>e.key===`${g.id}:${r.index}`):[]};}
 return result;
}
