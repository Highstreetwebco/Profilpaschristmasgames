import {bonkElf,newElfReaction} from './elf-reactions.js';
// The secret word is stored only in the server room and filtered in snapshots.
export const hangmanCategories=[
 {name:'Colleagues',guidance:'A first name or full name of a colleague the team knows. No private nicknames.'},
 {name:'Customers & suppliers',guidance:'A customer, merchant or supplier your team works with and will recognise.'},
 {name:'Tiling tools',guidance:'A tool or piece of equipment used for tiling or on site.'},
 {name:'Products & profiles',guidance:'A product you sell or work with: trims, profiles, pedestals, joints and more.'},
 {name:'Materials & finishes',guidance:'A tile material, grout, adhesive, metal, colour or finish used in your work.'},
 {name:'Installation & site work',guidance:'A tiling technique, site task or installation term the team knows.'},
 {name:'Sales & the office',guidance:'Something from your working day: sales, orders, pricing, deliveries or the warehouse.'},
 {name:'Brands & ranges',guidance:'A brand, product range or trade name familiar to the team.'}
];
export const normaliseHangman=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/\s+/g,' ');
const compact=value=>normaliseHangman(value).replace(/[^A-Z]/g,'');
export function makeHangman(players){
 const categories=hangmanCategories.map((_,i)=>i);
 for(let i=categories.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[categories[i],categories[j]]=[categories[j],categories[i]];}
 return {id:crypto.randomUUID(),turns:[...players],categories:categories.slice(0,players.length),index:0,performer:players[0],elfReaction:newElfReaction(),word:null,letters:[],guesses:[],mistakes:0,revealed:false,outcome:null,complete:false,paused:false,deadline:null,pausedMs:null,answers:{}};
}
function finish(room,r,outcome,score){
 r.revealed=true;r.outcome=outcome;r.paused=false;
 if(outcome==='saved'&&r.turns.length>1)for(const player of r.turns.filter(id=>id!==r.performer))score(room,player,1,`hangman:${r.id}:${r.index}`,`Hangman · team rescue ${r.index+1}`);
}
export function hangmanAction(room,me,isHost,command,now,fail,score){
 const r=room.rounds.hangman,type=command.type;
 if(room.stage!=='playing'||room.activeGame!=='hangman'||!r||r.complete||!me)fail('Open Hangman and join as a player first.');
 if(command.game!=='hangman'||command.index!==r.index||command.roundId!==r.id)fail('That word has moved on. Your screen is refreshing.',409);
 if(!r.turns.includes(me.id))fail('You are not playing in this round.',403);
 const setter=me.id===r.performer,solo=r.turns.length===1;
 if(type==='hangman_bonk'){
  if(command.direction!==-1&&command.direction!==1)fail('Choose a valid tap direction.');
  r.elfReaction=bonkElf(r.elfReaction,command.requestId,command.direction,now);
 }else if(type==='hangman_set'){
  if(!setter)fail('Only the word setter can enter the secret word.',403);
  if(r.word||r.revealed)fail('The word is already locked in.');
  if(typeof command.word!=='string')fail('Enter a word or short phrase.');
  const word=normaliseHangman(command.word),letters=compact(word);
  if(!/^[A-Z]+(?:[ '-][A-Z]+)*$/.test(word)||word.length>32||letters.length<2||letters.length>24)fail('Use 2–24 letters, with optional spaces, apostrophes or hyphens (32 characters maximum).');
  if(command.confirmCategory!==true)fail('Confirm that your work-related word fits the category, is known to the team and is correctly spelt.');
  r.word=word;
 }else if(type==='hangman_letter'||type==='hangman_solve'){
  if(setter&&!solo)fail('The word setter sits this one out. Let the team guess.',403);
  if(!r.word||r.revealed||r.paused)fail('Guessing is not open for this word.');
  let value,correct;
  if(type==='hangman_letter'){
   value=normaliseHangman(command.letter||'');if(!/^[A-Z]$/.test(value))fail('Choose one letter from A to Z.');
   if(r.letters.includes(value))return; // Concurrent duplicate letters never cost two lives.
   r.letters.push(value);correct=r.word.includes(value);
  }else{
   if(typeof command.answer!=='string'||command.answer.length>40)fail('Enter your answer in 40 characters or fewer.');
   value=normaliseHangman(command.answer);if(!/^[A-Z]+(?:[ '-][A-Z]+)*$/.test(value))fail('Use letters with optional spaces, apostrophes or hyphens.');
   if(r.guesses.some(g=>g.type==='word'&&compact(g.value)===compact(value)))return;
   correct=compact(value)===compact(r.word);
  }
  r.guesses.push({id:command.requestId,player:me.id,type:type==='hangman_letter'?'letter':'word',value,correct,at:now});
  if(!correct)r.mistakes++;
  if(type==='hangman_solve'&&correct||[...compact(r.word)].every(letter=>r.letters.includes(letter)))finish(room,r,'saved',score);
  else if(r.mistakes>=6)finish(room,r,'lost',score);
 }else if(type==='hangman_pause'){
  if(!isHost)fail('Only Jack can pause the team.',403);
  if(!r.word||r.revealed)fail('Start a word first.');r.paused=!r.paused;
 }else if(type==='hangman_finish'){
  if(!isHost)fail('Only Jack can end a word early.',403);
  if(!r.revealed)finish(room,r,'ended',score);
 }else if(type==='hangman_next'){
  if(!isHost)fail('Only Jack can move to the next word.',403);
  if(!r.revealed)fail('Finish this word first.');
  if(r.index===r.turns.length-1){r.complete=true;room.stage='round_end';}
  else{r.index++;Object.assign(r,{performer:r.turns[r.index],elfReaction:newElfReaction(),word:null,letters:[],guesses:[],mistakes:0,revealed:false,outcome:null,paused:false});}
 }else fail('Unknown Hangman action.');
}
export function hangmanSnapshot(r,me,ledger){
 const category=hangmanCategories[r.categories[r.index]];
 const mask=r.word?[...r.word].map(char=>/[A-Z]/.test(char)&&!r.letters.includes(char)&&!r.revealed?'_':char).join(''):null;
 return {game:'hangman',roundId:r.id,index:r.index,total:r.turns.length,performer:r.performer,turns:r.turns,elfReaction:r.elfReaction||newElfReaction(),category:category.name,guidance:category.guidance,started:!!r.word,maskedWord:mask,secretWord:me?.id===r.performer?r.word:null,answer:r.revealed?r.word:null,letters:r.letters,guesses:r.guesses,mistakes:r.mistakes,maxMistakes:6,remaining:6-r.mistakes,revealed:r.revealed,outcome:r.outcome,paused:r.paused,complete:r.complete,solo:r.turns.length===1,awards:r.revealed?ledger.filter(e=>e.key===`hangman:${r.id}:${r.index}`):[]};
}
