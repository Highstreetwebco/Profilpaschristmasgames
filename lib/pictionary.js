// Server-only prompts. Never include this deck in client snapshots.
export const drawingWords = [
 ['Christmas tree','xmas tree'],['Snowman'],['Reindeer'],['Santa Claus','Santa','Father Christmas'],
 ['Sleigh','Sledge'],['Christmas stocking','Stocking'],['Gingerbread man','Gingerbread person'],['Snowflake'],
 ['Christmas cracker','Cracker'],['Candy cane'],['Present','Gift','Christmas present'],['Christmas pudding'],
 ['Mistletoe'],['Wreath','Christmas wreath'],['Chimney'],['Elf','Christmas elf'],['Snow globe'],['Igloo'],
 ['Penguin'],['Polar bear'],['Hot chocolate','Hot cocoa'],['Mince pie'],['Turkey'],['Fireplace'],
 ['Ice skates','Ice skating'],['Scarf'],['Mittens','Mitten'],['Candle'],['Angel'],['Fairy lights','Christmas lights'],
 ['Bicycle','Bike'],['Helicopter'],['Aeroplane','Airplane','Plane'],['Rocket','Spaceship'],['Hot air balloon'],
 ['Fire engine','Fire truck'],['Tractor'],['Train'],['Sailboat','Sailing boat'],['Submarine'],['Castle'],
 ['Lighthouse'],['Windmill'],['Tent'],['Umbrella'],['Rainbow'],['Volcano'],['Palm tree'],['Cactus'],
 ['Sunflower'],['Butterfly'],['Ladybird','Ladybug'],['Spider'],['Octopus'],['Jellyfish'],['Dinosaur'],
 ['Elephant'],['Giraffe'],['Crocodile','Alligator'],['Turtle','Tortoise'],['Unicorn'],['Snail'],['Bee','Bumblebee'],
 ['Pizza'],['Ice cream'],['Birthday cake','Cake'],['Pineapple'],['Banana'],['Watermelon'],['Burger','Hamburger'],
 ['Guitar'],['Drum','Drums'],['Piano'],['Microphone'],['Headphones'],['Camera'],['Television','TV'],
 ['Toothbrush'],['Hair dryer','Hairdryer'],['Alarm clock'],['Key'],['Scissors'],['Ladder'],['Wheelbarrow'],
 ['Football','Soccer ball'],['Trophy'],['Tennis racket','Tennis racquet'],['Bowling'],['Skateboard'],['Roller skates'],
 ['Pirate'],['Robot'],['Astronaut'],['Mermaid'],['Wizard'],['Superhero'],['Crown'],['Treasure chest'],['Dragon']
];
export const INK_COLOURS=['#20352d','#dc4c4c','#e89925','#e8cc3e','#33845c','#3280c4','#9563bc','#ffffff'];
export const INK_LIMIT=24000;
const normalise=value=>String(value).toLowerCase().replace(/^(a|an|the)\s+/, '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const wordFor=r=>drawingWords[r.deck[r.index]];
export function makePictionary(players){
 const deck=drawingWords.map((_,i)=>i);
 for(let i=deck.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
 return {id:crypto.randomUUID(),turns:[...players,...players],deck:deck.slice(0,players.length*2),index:0,performer:players[0],revealed:false,deadline:null,pausedMs:null,answers:{},complete:false,strokes:[],ink:0,canvasEpoch:0,guesses:[],winner:null,outcome:null};
}
export function settlePictionary(r,now){if(r&&!r.revealed&&r.deadline&&now>=r.deadline){r.revealed=true;r.deadline=null;r.pausedMs=null;r.outcome='timeout';}}
export function pictionaryAction(room,me,isHost,command,now,fail,score){
 const r=room.rounds.pictionary,type=command.type;
 if(room.stage!=='playing'||room.activeGame!=='pictionary'||!r||r.complete||!me)fail('Open Pictionary and join as a player first.');
 if(command.game!=='pictionary'||command.index!==r.index||command.roundId!==r.id)fail('That drawing has moved on. Your screen is refreshing.',409);
 const drawer=me.id===r.performer,solo=r.turns.length===2;
 if(!r.turns.includes(me.id))fail('You are not playing in this round.',403);
 if(type==='pictionary_start'){
  if(!drawer)fail('Only the drawer can reveal their word and start.',403);
  if(r.revealed||r.deadline||r.pausedMs!==null)fail('This drawing has already started.');
  r.deadline=now+120000;
 }else if(type==='pictionary_next'){
  if(!isHost)fail('Only Jack can move to the next drawing.',403);
  if(!r.revealed)fail('Finish this drawing before moving on.');
  if(r.index===r.turns.length-1){r.complete=true;room.stage='round_end';}
  else {r.index++;Object.assign(r,{performer:r.turns[r.index],revealed:false,deadline:null,pausedMs:null,answers:{},strokes:[],ink:0,canvasEpoch:0,guesses:[],winner:null,outcome:null});}
 }else if(type==='pictionary_finish'){
  if(!isHost)fail('Only Jack can end a drawing early.',403);
  if(!r.revealed){r.revealed=true;r.deadline=null;r.pausedMs=null;r.outcome=solo?'practice':'ended';}
 }else if(type==='pictionary_guess'){
  if(drawer&&!solo)fail('The drawer cannot guess their own word.',403);
  if(r.revealed||!r.deadline||now>=r.deadline)fail('Guessing is closed for this drawing.');
  const value=typeof command.answer==='string'?command.answer.trim():'';
  if(!value||value.length>80)fail('Enter a guess of 1–80 characters.');
  const previous=r.guesses.findLast(g=>g.player===me.id);
  if(previous&&now-previous.at<350)fail('Give that guess a moment before trying again.',429);
  const correct=wordFor(r).some(word=>normalise(word)===normalise(value));
  r.guesses=[...r.guesses,{id:command.requestId,player:me.id,value,correct,at:now}].slice(-60);
  if(correct){r.revealed=true;r.deadline=null;r.pausedMs=null;r.winner=solo?null:me.id;r.outcome=solo?'practice':'guessed';if(!solo)score(room,me.id,1,`pictionary:${r.id}:${r.index}`,`Pictionary · drawing ${r.index+1}`);}
 }else if(['pictionary_ink','pictionary_clear','pictionary_undo'].includes(type)){
  if(!drawer)fail('Only the current drawer can change the drawing.',403);
  if(r.revealed||!r.deadline||now>=r.deadline)fail('Drawing is closed for this turn.');
  if(command.canvasEpoch!==r.canvasEpoch)fail('The canvas has changed. Try again.',409);
  if(type==='pictionary_clear'){r.strokes=[];r.ink=0;r.canvasEpoch++;}
  else if(type==='pictionary_undo'){
   const stroke=r.strokes.at(-1)?.stroke;
   r.strokes=r.strokes.filter(s=>s.stroke!==stroke);r.ink=r.strokes.reduce((n,s)=>n+s.points.length,0);r.canvasEpoch++;
  }else{
   const {points,colour,width,stroke}=command;
   if(!Array.isArray(points)||points.length<1||points.length>64||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)||p[0]<0||p[0]>1000||p[1]<0||p[1]>650)||!INK_COLOURS.includes(colour)||![3,6,10,18].includes(width)||typeof stroke!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(stroke))fail('Invalid drawing stroke.');
   if(r.ink+points.length>INK_LIMIT||r.strokes.length>=1600)fail('The pad is full. Clear it or undo a stroke to keep drawing.');
   r.strokes.push({id:command.requestId,stroke,points,colour,width});r.ink+=points.length;
  }
 }else fail('Unknown Pictionary action.');
}
export function pictionarySnapshot(r,me,now,ledger){
 const expired=!r.revealed&&!!r.deadline&&now>=r.deadline,revealed=r.revealed||expired;
 const started=!!r.deadline||r.pausedMs!==null||revealed;
 return {game:'pictionary',roundId:r.id,index:r.index,total:r.turns.length,seconds:120,performer:r.performer,turns:r.turns,complete:r.complete,revealed,deadline:revealed?null:r.deadline,pausedMs:revealed?null:r.pausedMs,question:'Draw it. Guess it. Beat the clock.',options:null,category:null,note:null,answer:revealed?wordFor(r)[0]:null,secretWord:me?.id===r.performer&&started?wordFor(r)[0]:null,correctOption:null,myAnswer:null,answered:[],answers:null,awards:revealed?ledger.filter(e=>e.key===`pictionary:${r.id}:${r.index}`):[],strokes:r.strokes,canvasEpoch:r.canvasEpoch,guesses:r.guesses,winner:r.winner,outcome:expired?'timeout':r.outcome,solo:r.turns.length===2};
}
