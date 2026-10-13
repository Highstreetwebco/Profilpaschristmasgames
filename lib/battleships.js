export const SEA_SIZE=8;
export const SHIPS=[{id:'cruiser',name:'Cruiser',size:4},{id:'frigate',name:'Frigate',size:3},{id:'patrol',name:'Patrol boat',size:2}];
export const PRACTICE_NAVY='practice-navy';
function randomIndex(length){const limit=Math.floor(0x100000000/length)*length;let value;do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=limit);return value%length;}
function shuffle(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=randomIndex(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function shipCells(position,vertical,size){
 if(!Number.isInteger(position)||position<0||position>=SEA_SIZE**2||typeof vertical!=='boolean')return null;
 const x=position%SEA_SIZE,y=Math.floor(position/SEA_SIZE);
 if(vertical?y+size>SEA_SIZE:x+size>SEA_SIZE)return null;
 return Array.from({length:size},(_,i)=>position+i*(vertical?SEA_SIZE:1));
}
export function randomFleet(){
 const occupied=new Set();return SHIPS.map(ship=>{
  const options=[];for(let p=0;p<SEA_SIZE**2;p++)for(const v of [false,true]){const cells=shipCells(p,v,ship.size);if(cells&&cells.every(c=>!occupied.has(c)))options.push(cells);}
  const cells=options[randomIndex(options.length)];cells.forEach(c=>occupied.add(c));return {id:ship.id,cells};
 });
}
export function makeBattleships(players){
 const solo=players.length===1,ids=[...players,...solo?[PRACTICE_NAVY]:[]];
 return {id:crypto.randomUUID(),index:0,turns:[...players],order:shuffle(ids),performer:null,turn:0,phase:'setup',paused:false,solo,complete:false,eliminated:[],results:null,events:[],
  fleets:Object.fromEntries(ids.map(id=>[id,{ships:randomFleet(),ready:id===PRACTICE_NAVY,revision:0,shots:Array(SEA_SIZE**2).fill(null),eliminated:false,fired:0,hits:0}]))};
}
const sunk=(fleet,ship)=>ship.cells.every(c=>fleet.shots[c]?.hit);
const survivors=r=>r.order.filter(id=>!r.fleets[id].eliminated);
function nextTurn(r){const at=r.order.indexOf(r.performer);for(let n=1;n<=r.order.length;n++){const id=r.order[(at+n)%r.order.length];if(!r.fleets[id].eliminated){r.performer=id;r.turn++;return;}}}
export function pauseBattleships(r){if(r?.phase==='battle'&&!r.paused){r.paused=true;r.turn++;}}
function finish(room,r,score){
 const alive=survivors(r);if(alive.length!==1)return;
 const placements=[alive[0],...r.eliminated.toReversed()];
 r.results=placements.map((player,i)=>({player,rank:i+1,points:r.solo?0:({1:5,2:3,3:1}[i+1]||0),hits:r.fleets[player].hits,shots:r.fleets[player].fired}));
 r.complete=true;r.phase='complete';r.performer=null;
 if(!r.solo)for(const result of r.results)score(room,result.player,result.points,`battleships:${r.id}:ranking`,`Battleships · place ${result.rank}`);
}
function fire(room,r,attacker,target,position,score){
 const fleet=r.fleets[target],ship=fleet.ships.find(s=>s.cells.includes(position)),hit=!!ship;
 fleet.shots[position]={by:attacker,hit};r.fleets[attacker].fired++;if(hit)r.fleets[attacker].hits++;
 const sunkShip=ship&&sunk(fleet,ship)?SHIPS.find(s=>s.id===ship.id).name:null;
 if(fleet.ships.every(s=>sunk(fleet,s))){fleet.eliminated=true;r.eliminated.push(target);}
 r.events=[...r.events,{id:r.turn,attacker,target,position,hit,sunkShip,eliminated:fleet.eliminated}].slice(-6);
 finish(room,r,score);if(!r.complete)nextTurn(r);else r.turn++;
}
// The practice captain chooses from public hit/miss information only, never
// from an unhit ship position. It follows up adjacent to exposed, unsunk hits.
function practiceShot(room,r,score){
 if(r.performer!==PRACTICE_NAVY||r.complete)return;
 const target=r.turns[0],fleet=r.fleets[target],knownSunk=new Set(fleet.ships.filter(s=>sunk(fleet,s)).flatMap(s=>s.cells));
 const unknown=fleet.shots.flatMap((shot,p)=>shot?[]:[p]),adjacent=[];
 fleet.shots.forEach((shot,p)=>{if(!shot?.hit||knownSunk.has(p))return;for(const q of [p-SEA_SIZE,p+SEA_SIZE,...p%SEA_SIZE>0?[p-1]:[],...p%SEA_SIZE<SEA_SIZE-1?[p+1]:[]])if(q>=0&&q<SEA_SIZE**2&&!fleet.shots[q])adjacent.push(q);});
 const options=adjacent.length?[...new Set(adjacent)]:unknown;
 fire(room,r,PRACTICE_NAVY,target,options[randomIndex(options.length)],score);
}
export function battleshipsAction(room,me,isHost,command,presence,now,fail,score){
 const r=room.rounds.battleships;
 if(room.stage!=='playing'||room.activeGame!=='battleships'||!r||!me||!r.turns.includes(me.id))fail('Join the active Battleships game first.');
 if(command.game!=='battleships'||command.roundId!==r.id)fail('That battle has moved on. Refresh and try again.',409);
 const type=command.type,fleet=r.fleets[me.id];
 if(['battle_shuffle','battle_place','battle_ready'].includes(type)){
  if(r.phase!=='setup')fail('Fleets are locked for this battle.');
  if(command.revision!==fleet.revision)fail('Your fleet has changed. Refresh and try again.',409);
  if(type==='battle_ready'){
   if(typeof command.ready!=='boolean')fail('Choose whether your fleet is ready.');fleet.ready=command.ready;
  }else{
   if(fleet.ready)fail('Unlock your fleet before moving ships.');
   if(type==='battle_shuffle')fleet.ships=randomFleet();
   else{
    const specification=SHIPS.find(s=>s.id===command.ship),ship=fleet.ships.find(s=>s.id===command.ship);
    if(!specification||!ship)fail('Choose one of your ships.');
    const cells=shipCells(command.position,command.vertical,specification.size);
    if(!cells)fail('That ship would leave the grid.');
    if(fleet.ships.some(s=>s.id!==ship.id&&s.cells.some(c=>cells.includes(c))))fail('Ships cannot overlap. Choose a clear space.');
    ship.cells=cells;
   }
  }
  fleet.revision++;
 }else if(type==='battle_start'){
  if(!isHost)fail('Only Jack can start the battle.',403);
  if(r.phase!=='setup')fail('The battle has already started.');
  if(!r.order.every(id=>r.fleets[id].ready))fail('Everyone must lock their fleet first.');
  r.phase='battle';r.performer=r.order[0];r.turn++;practiceShot(room,r,score);
 }else if(type==='battle_pause'){
  if(!isHost)fail('Only Jack can pause the battle.',403);
  if(r.phase!=='battle')fail('There is no active battle to pause.');
  if(r.paused){r.paused=false;r.turn++;}else pauseBattleships(r);
 }else if(type==='battle_finish'){
  if(!isHost)fail('Only Jack can finish the round.',403);
  if(!r.complete)fail('Keep playing until only one fleet remains.');room.stage='round_end';
 }else if(type==='battle_fire'||type==='battle_skip'){
  if(r.phase!=='battle'||r.paused)fail(r.paused?'The battle is paused.':'There is no active battle.');
  if(command.turn!==r.turn)fail('That turn has moved on.',409);
  if(type==='battle_skip'){
   if(!isHost)fail('Only Jack can skip a disconnected player.',403);
   const current=room.players.find(p=>p.id===r.performer);
   if(!current||(current.owner&&(presence[current.owner]||0)>now-20000))fail('Only a disconnected player can be skipped.');
   nextTurn(r);
  }else{
   if(fleet.eliminated)fail('Your fleet is out. You can watch the remaining battle.',403);
   if(r.performer!==me.id)fail('Wait for your turn to fire.',403);
   const target=r.fleets[command.target],position=command.position;
   if(!r.order.includes(command.target)||!target||command.target===me.id)fail('Choose another player’s fleet.');
   if(target.eliminated)fail('That fleet has already been sunk.');
   if(!Number.isInteger(position)||position<0||position>=SEA_SIZE**2)fail('Choose a square on the target grid.');
   if(target.shots[position])fail('That square has already been fired on. Choose another.',409);
   fire(room,r,me.id,command.target,position,score);
  }
  practiceShot(room,r,score);
 }else fail('Unknown Battleships action.');
}
export function battleshipsSnapshot(r,me){
 return {game:'battleships',roundId:r.id,index:0,total:r.order.length,size:SEA_SIZE,phase:r.phase,turn:r.turn,turns:r.turns,order:r.order,performer:r.performer,paused:r.paused,solo:r.solo,complete:r.complete,results:r.results,events:r.events,
  fleets:r.order.map(id=>{const f=r.fleets[id],mine=id===me?.id,publicSunk=f.ships.filter(s=>sunk(f,s)),revealed=mine||r.complete;
   return {id,bot:id===PRACTICE_NAVY,ready:f.ready,revision:mine?f.revision:null,eliminated:f.eliminated,remaining:SHIPS.length-publicSunk.length,fired:f.fired,hits:f.hits,
    ships:SHIPS.map(s=>{const actual=f.ships.find(p=>p.id===s.id);return {...s,sunk:sunk(f,actual),cells:revealed||sunk(f,actual)?actual.cells:null};}),
    cells:f.shots.map((shot,position)=>({position,shot,ship:revealed?f.ships.find(s=>s.cells.includes(position))?.id||null:publicSunk.find(s=>s.cells.includes(position))?.id||null,sunk:publicSunk.some(s=>s.cells.includes(position))}))};})};
}
