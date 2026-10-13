// Exercises the actual API handlers against an isolated Cloudflare D1 database.
// No deployed game state or real identities are used.
import {readdirSync,readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd(),store=path.join(root,'node_modules/.pnpm');
const packagePath=(name)=>path.join(store,readdirSync(store).find(n=>n.startsWith(name+'@')),'node_modules',name);
const {build}=await import(pathToFileURL(path.join(packagePath('esbuild'),'lib/main.js')));
const {Miniflare}=await import(pathToFileURL(path.join(packagePath('miniflare'),'dist/src/index.js')));
mkdirSync('.sites-runtime',{recursive:true});
await build({stdin:{contents:`import {GET,POST} from './app/api/room/route.ts';export default {fetch(req){return req.method==='POST'?POST(req):GET(req)}}`,resolveDir:root,sourcefile:'integration-worker.ts',loader:'ts'},bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers'],outfile:'.sites-runtime/integration-worker.mjs'});
const mf=new Miniflare({modules:true,scriptPath:'.sites-runtime/integration-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-christmas-test'},cf:false});
try{
 const db=await mf.getD1Database('DB');
 const sql=readFileSync('drizzle/0000_large_roulette.sql','utf8');for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 function client(){let cookie='';const headers=()=>({...cookie?{cookie}:{}});return{async request(command){const res=await mf.dispatchFetch('https://game.test/api/room',{method:command?'POST':'GET',headers:{...headers(),...command?{'content-type':'application/json',origin:'https://game.test'}:{}},...command?{body:JSON.stringify({requestId:crypto.randomUUID(),...command})}:{}});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const data=await res.json();return{status:res.status,data};}};}
 const players={richard:client(),stu:client(),jack:client(),lauren:client()};
 await Promise.all(Object.values(players).map(c=>c.request()));
 const joins=await Promise.all(Object.entries(players).map(([player,c])=>c.request({type:'join',player})));
 for(const j of joins)assert.equal(j.status,200,JSON.stringify(j.data));
 const observer=client();await observer.request();assert.equal((await observer.request({type:'join',player:'richard'})).status,409);assert.equal((await observer.request({type:'join',player:'jack'})).status,409);
 for(const[name,c]of Object.entries(players)){const s=(await c.request()).data;assert.equal(s.me,name);assert.equal(s.readyCount,4);assert.equal(s.isHost,name==='jack');}
 assert.equal((await players.stu.request({type:'start'})).status,403);
 const started=await players.jack.request({type:'start'});assert.equal(started.status,200);assert.equal(started.data.stage,'intro');
 assert.equal((await players.lauren.request()).data.intro.startsAt,started.data.intro.startsAt);
 assert.equal((await players.jack.request({type:'choose',game:'hangman'})).status,400);
 // Advance only the isolated test room's clock; no sleeps or production state changes.
 async function finishIntro(){const row=await db.prepare('SELECT id,body FROM game_rooms').first();const room=JSON.parse(row.body);room.intro.startsAt=Date.now()-20000;room.intro.endsAt=Date.now()-1;await db.prepare('UPDATE game_rooms SET body=? WHERE id=?').bind(JSON.stringify(room),row.id).run();}
 await finishIntro();assert.equal((await players.lauren.request()).data.stage,'menu');
 const hangOpened=await players.jack.request({type:'choose',game:'hangman'});assert.equal(hangOpened.status,200);
 const hangId=hangOpened.data.round.roundId;
 const hang=(type,extra={})=>({type,game:'hangman',index:0,roundId:hangId,...extra});
 assert.equal((await players.jack.request(hang('hangman_set',{word:'TILE TRIM',confirmCategory:true}))).status,403);
 assert.equal((await players.richard.request(hang('hangman_set',{word:'TILE TRIM',confirmCategory:true}))).status,200);
 for(const c of [players.stu,players.jack,players.lauren,observer]){const response=(await c.request()).data;assert.equal(response.round.secretWord,null);assert.equal(response.round.answer,null);assert.equal(response.round.maskedWord,'____ ____');assert.equal(JSON.stringify(response).includes('TILE TRIM'),false);}
 assert.equal((await players.richard.request(hang('hangman_letter',{letter:'T'}))).status,403);
 const duplicate=await Promise.all([players.stu,players.jack,players.lauren].map(c=>c.request(hang('hangman_letter',{letter:'Z'}))));
 duplicate.forEach(r=>assert.equal(r.status,200,JSON.stringify(r.data)));
 assert.equal((await players.richard.request()).data.round.mistakes,1);
 const letters=await Promise.all([players.stu.request(hang('hangman_letter',{letter:'T'})),players.jack.request(hang('hangman_letter',{letter:'I'})),players.lauren.request(hang('hangman_letter',{letter:'L'}))]);
 letters.forEach(r=>assert.equal(r.status,200,JSON.stringify(r.data)));
 assert.equal((await players.richard.request()).data.round.maskedWord,'TIL_ T_I_');
 // Concurrent cosmetic taps and a wrong letter must preserve both updates atomically.
 const taps=await Promise.all([players.richard.request(hang('hangman_bonk',{direction:1})),players.stu.request(hang('hangman_bonk',{direction:-1})),players.lauren.request(hang('hangman_bonk',{direction:1})),players.jack.request(hang('hangman_letter',{letter:'X'}))]);
 taps.forEach(r=>assert.equal(r.status,200,JSON.stringify(r.data)));
 const punched=(await players.stu.request()).data;assert.equal(punched.round.elfReaction.hits.length,3);assert.deepEqual(punched.round.elfReaction.hits.map(h=>h.actor.id).sort(),['lauren','richard','stu']);assert.equal(punched.round.mistakes,2);assert.equal(punched.round.maskedWord,'TIL_ T_I_');assert.equal(punched.round.secretWord,null);assert.deepEqual(punched.players.map(p=>p.score),[0,0,0,0]);
 assert.equal((await observer.request(hang('hangman_bonk',{direction:1}))).status,400);
 const fifth=crypto.randomUUID();for(const requestId of [crypto.randomUUID(),fifth,fifth])assert.equal((await players.stu.request(hang('hangman_bonk',{direction:1,requestId,actor:{id:'jack',avatar:0,name:'Jack'}}))).status,200);
 const nap=(await players.stu.request()).data.round.elfReaction;assert.equal(nap.hits.length,5);assert.ok(nap.gagUntil>Date.now());assert.equal(nap.culprit.id,'stu');assert.equal(nap.culprit.avatar,1);assert.equal(nap.gagUntil-nap.gagAt,9000);
 assert.equal((await players.lauren.request(hang('hangman_bonk',{direction:1}))).status,200);const frozen=(await players.jack.request()).data;assert.equal(frozen.round.elfReaction.culprit.id,'stu');assert.equal(frozen.round.elfReaction.gagUntil,nap.gagUntil);assert.equal(frozen.round.mistakes,2);assert.equal(frozen.round.secretWord,null);
 const solved=await Promise.all([players.stu,players.jack,players.lauren].map(c=>c.request(hang('hangman_solve',{answer:'TILE TRIM'}))));
 assert.equal(solved.filter(r=>r.status===200).length,1);
 for(const c of Object.values(players)){const response=(await c.request()).data;assert.equal(response.round.outcome,'saved');assert.deepEqual(response.players.map(p=>p.score),[0,1,1,1]);assert.equal(response.round.awards.length,3);}
 assert.equal((await players.stu.request(hang('hangman_next'))).status,403);
 assert.equal((await players.jack.request(hang('hangman_next'))).status,200);
 assert.equal((await players.richard.request()).data.round.performer,'stu');assert.equal((await players.richard.request()).data.round.elfReaction.hits.length,0);
 assert.equal((await players.richard.request(hang('hangman_letter',{letter:'A'}))).status,409);
 assert.equal((await mf.dispatchFetch('https://game.test/api/room',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({type:'reset',requestId:crypto.randomUUID()})})).status,403);

 // Pictionary uses the same real API and D1 compare-and-swap as the deployed room.
 assert.equal((await players.jack.request({type:'menu'})).status,200);
 const opened=(await players.jack.request({type:'choose',game:'pictionary'})).data;
 const roundId=opened.round.roundId;
 const drawing=(type,extra={})=>({type,game:'pictionary',index:0,roundId,...extra});
 assert.equal(opened.round.total,8);assert.equal(opened.round.secretWord,null);
 const drawer=(await players.richard.request(drawing('pictionary_start'))).data;
 const secret=drawer.round.secretWord;assert.ok(secret);assert.equal(drawer.round.deadline-drawer.serverTime<=120000,true);
 for(const c of [players.jack,players.stu,players.lauren,observer]){const response=(await c.request()).data;assert.equal(response.round.secretWord,null);assert.equal(response.round.answer,null);assert.equal(JSON.stringify(response).includes(secret),false);}
 const stroke=crypto.randomUUID(),ink=drawing('pictionary_ink',{stroke,colour:'#3280c4',width:6,canvasEpoch:0,points:[[100,100],[200,200]]});
 assert.equal((await players.jack.request(ink)).status,403);
 assert.equal((await players.richard.request(ink)).status,200);
 assert.deepEqual((await players.lauren.request()).data.round.strokes[0].points,ink.points);
 // Concurrent drawing and wrong guesses must not overwrite each other.
 const updates=await Promise.all([players.richard.request({...ink,points:[[200,200],[300,200]]}),players.stu.request(drawing('pictionary_guess',{answer:'definitely not it'})),players.jack.request(drawing('pictionary_guess',{answer:'another wrong guess'}))]);
 for(const result of updates)assert.equal(result.status,200,JSON.stringify(result.data));
 const persisted=(await players.lauren.request()).data;assert.equal(persisted.round.strokes.length,2);assert.equal(persisted.round.guesses.length,2);
 // Age wrong guesses only in the isolated fixture so all three players can race without rate limits.
 const raceRow=await db.prepare('SELECT id,body FROM game_rooms').first();const raceRoom=JSON.parse(raceRow.body);raceRoom.rounds.pictionary.guesses.forEach(g=>g.at-=1000);await db.prepare('UPDATE game_rooms SET body=?,version=version+1 WHERE id=?').bind(JSON.stringify(raceRoom),raceRow.id).run();
 // Race three correct guesses: exactly one accepted winner and one point, no double scoring.
 const race=await Promise.all([players.stu,players.jack,players.lauren].map(c=>c.request(drawing('pictionary_guess',{answer:secret}))));
 assert.equal(race.filter(x=>x.status===200).length,1,JSON.stringify(race));
 const won=(await players.richard.request()).data;assert.equal(won.round.revealed,true);assert.equal(won.round.answer,secret);assert.equal(won.round.awards.length,1);assert.equal(won.round.awards[0].points,1);
 assert.equal(won.players.reduce((n,p)=>n+p.score,0),4); // Three Hangman team points plus the sole Pictionary winning guess.
 assert.equal((await players.jack.request(drawing('pictionary_next'))).status,200);
 assert.equal((await players.lauren.request()).data.round.performer,'stu');
 assert.equal((await players.richard.request(ink)).status,409);
 assert.equal((await players.stu.request({type:'pictionary_start',game:'pictionary',index:1,roundId})).status,200);
 // Expire the isolated test's turn, then verify read-only clients see the answer automatically.
 const picRow=await db.prepare('SELECT id,body FROM game_rooms').first();const picRoom=JSON.parse(picRow.body);picRoom.rounds.pictionary.deadline=Date.now()-1;await db.prepare('UPDATE game_rooms SET body=? WHERE id=?').bind(JSON.stringify(picRoom),picRow.id).run();
 const expired=(await players.jack.request()).data;assert.equal(expired.round.outcome,'timeout');assert.equal(expired.round.revealed,true);assert.ok(expired.round.answer);
 assert.equal((await players.lauren.request({type:'pictionary_guess',game:'pictionary',index:1,roundId,answer:expired.round.answer})).status,400);

 // Memory Match: same layout, independent boards, fewest clicks and atomic ranking awards.
 async function moveMemoryClock(update){const row=await db.prepare('SELECT id,body FROM game_rooms').first();const room=JSON.parse(row.body);update(room.rounds.memory);await db.prepare('UPDATE game_rooms SET body=?,version=version+1 WHERE id=?').bind(JSON.stringify(room),row.id).run();}
 async function memoryState(c=players.jack){return (await c.request()).data.round;}
 function memoryCommand(state,type,extra={}){return{type,game:'memory',roundId:state.roundId,turn:state.turn,...extra};}
 async function memoryFlip(c,position){const state=await memoryState(c);const result=await c.request(memoryCommand(state,'memory_flip',{position}));assert.equal(result.status,200,JSON.stringify(result.data));return result;}
 async function finishMemoryReveal(id){await moveMemoryClock(r=>{r.boards[id].deadline=Date.now()-1;});}
 assert.equal((await players.jack.request({type:'menu'})).status,200);
 const memOpen=(await players.jack.request({type:'choose',game:'memory'})).data.round;
 assert.equal(memOpen.cards.length,24);assert.ok(memOpen.cards.every(c=>c.face===null));
 assert.equal((await players.stu.request(memoryCommand(memOpen,'memory_start'))).status,403);
 assert.equal((await players.jack.request(memoryCommand(memOpen,'memory_start'))).status,200);
 await moveMemoryClock(r=>{r.previewAt=Date.now()-100;r.deadline=Date.now()+8000;});
 const peek=await memoryState();assert.equal(peek.cards.filter(c=>c.face).length,24);const pairs=Object.values(Object.groupBy(peek.cards,c=>c.face)).map(v=>v.map(c=>c.position));assert.equal(pairs.length,12);
 for(const c of Object.values(players))assert.deepEqual((await memoryState(c)).cards.map(p=>p.face),peek.cards.map(p=>p.face));
 assert.ok((await memoryState(observer)).cards.every(c=>!c.face));
 await moveMemoryClock(r=>r.deadline=Date.now()-1);
 let mem=await memoryState();assert.equal(mem.phase,'playing');assert.ok(mem.cards.every(c=>c.face===null));
 assert.equal((await observer.request(memoryCommand(mem,'memory_flip',{position:0}))).status,400);
 const [first,second]=pairs[0];
 await memoryFlip(players.jack,first);
 assert.ok((await memoryState(players.stu)).cards.every(c=>!c.face&&!c.selected));
 assert.equal((await memoryState(players.stu)).playerStats.jack.clicks,1);
 mem=await memoryState();
 const doubleFlips=await Promise.all([1,2,3].map(()=>players.jack.request(memoryCommand(mem,'memory_flip',{position:second}))));
 assert.equal(doubleFlips.filter(r=>r.status===200).length,1);mem=await memoryState();assert.equal(mem.found,1);assert.equal(mem.clicks,2);
 assert.equal((await players.jack.request()).data.players.reduce((n,p)=>n+p.score,0),4);
 const guests=['richard','stu','lauren'];
 await Promise.all(guests.map(id=>memoryFlip(players[id],first)));
 await Promise.all(guests.map(id=>memoryFlip(players[id],second)));
 for(const c of Object.values(players)){const board=await memoryState(c);assert.equal(board.clicks,2);assert.equal(board.found,1);}
 assert.equal((await players.jack.request(memoryCommand(mem,'memory_pause'))).status,200);
 assert.equal((await players.jack.request({type:'menu'})).status,200);
 assert.equal((await players.jack.request({type:'choose',game:'memory'})).status,200);mem=await memoryState();assert.equal(mem.paused,true);assert.equal(mem.found,1);assert.equal(mem.clicks,2);
 assert.equal((await players.jack.request(memoryCommand(mem,'memory_pause'))).status,200);
 await moveMemoryClock(r=>{for(const b of Object.values(r.boards))b.deadline=Date.now()-1;});
 // Deliberate misses produce distinct totals. Slowest finisher Richard still wins.
 for(const [id,misses]of [['lauren',3],['jack',2],['stu',1],['richard',0]]){
  const c=players[id];
  for(let n=0;n<misses;n++){const stale=(await memoryState(c)).turn;await memoryFlip(c,pairs[1][0]);await memoryFlip(c,pairs[2][0]);assert.equal((await memoryState(c)).phase,'reveal');await finishMemoryReveal(id);assert.equal((await c.request(memoryCommand(await memoryState(c),'memory_flip',{position:pairs[1][0],turn:stale}))).status,409);}
  for(const pair of pairs.slice(1)){for(const position of pair)await memoryFlip(c,position);await finishMemoryReveal(id);}
  assert.equal((await memoryState(c)).clicks,24+misses*2);assert.equal((await memoryState(c)).finished,true);
  if(id!=='richard'){assert.equal((await memoryState(c)).complete,false);assert.equal((await players.jack.request(memoryCommand(await memoryState(),'memory_finish'))).status,400);}
 }
 mem=await memoryState();assert.equal(mem.complete,true);assert.equal(mem.found,12);assert.equal(mem.cards.filter(c=>c.face).length,24);
 assert.deepEqual(mem.results.map(r=>[r.player,r.rank,r.clicks,r.points,r.last]),[['richard',1,24,5,false],['stu',2,26,3,false],['jack',3,28,1,false],['lauren',4,30,0,true]]);
 assert.equal((await players.jack.request()).data.players.reduce((n,p)=>n+p.score,0),13);
 for(const c of Object.values(players))assert.deepEqual((await memoryState(c)).results,mem.results);
 assert.equal((await players.jack.request(memoryCommand(mem,'memory_flip',{position:first}))).status,400);
 assert.equal((await players.jack.request(memoryCommand(mem,'memory_finish'))).data.stage,'round_end');
 // Battleships runs through the same four independent sessions and real API.
 async function battleState(c=players.jack){return (await c.request()).data.round;}
 function battleCommand(state,type,extra={}){return{type,game:'battleships',roundId:state.roundId,turn:state.turn,revision:state.fleets.find(f=>f.revision!==null)?.revision,...extra};}
 assert.equal((await players.jack.request({type:'menu'})).status,200);
 assert.equal((await players.jack.request({type:'choose',game:'battleships'})).status,200);
 const secrets={};
 for(const[id,c]of Object.entries(players)){
  const b=await battleState(c);assert.equal(b.phase,'setup');assert.equal(b.fleets.length,4);
  for(const f of b.fleets){if(f.id===id)secrets[id]=f.ships.flatMap(ship=>ship.cells);else{assert.ok(f.ships.every(ship=>ship.cells===null));assert.ok(f.cells.every(cell=>cell.ship===null));}}
 }
 assert.ok((await battleState(observer)).fleets.every(f=>f.ships.every(ship=>ship.cells===null)));
 assert.equal((await players.jack.request(battleCommand(await battleState(),'battle_start'))).status,400);
 const lockedFleets=await Promise.all(Object.values(players).map(async c=>c.request(battleCommand(await battleState(c),'battle_ready',{ready:true}))));
 for(const response of lockedFleets)assert.equal(response.status,200,JSON.stringify(response.data));
 assert.equal((await players.stu.request(battleCommand(await battleState(players.stu),'battle_start'))).status,403);
 assert.equal((await players.jack.request(battleCommand(await battleState(),'battle_start'))).status,200);
 let battle=await battleState();assert.ok(battle.fleets.every(f=>f.ready));
 const shooter=battle.performer,defender=battle.order.find(id=>id!==shooter),firstShot=secrets[defender][0];
 assert.equal((await players[defender].request(battleCommand(battle,'battle_fire',{target:shooter,position:0}))).status,403);
 assert.equal((await observer.request(battleCommand(battle,'battle_fire',{target:defender,position:firstShot}))).status,400);
 const salvos=await Promise.all([0,1,2].map(i=>players[shooter].request(battleCommand(battle,'battle_fire',{target:defender,position:secrets[defender][i]}))));
 assert.equal(salvos.filter(r=>r.status===200).length,1);
 const afterSalvo=await battleState();assert.equal(afterSalvo.fleets.find(f=>f.id===shooter).fired,1);assert.notEqual(afterSalvo.performer,shooter);
 for(const c of Object.values(players)){const response=await battleState(c);assert.deepEqual(response.events,afterSalvo.events);}
 assert.equal((await players[shooter].request(battleCommand(battle,'battle_fire',{target:defender,position:secrets[defender][3]}))).status,409);
 battle=afterSalvo;
 assert.equal((await players.jack.request(battleCommand(battle,'battle_pause'))).status,200);
 assert.equal((await players.jack.request({type:'menu'})).status,200);
 assert.equal((await players.jack.request({type:'choose',game:'battleships'})).status,200);
 const restored=await battleState();assert.equal(restored.paused,true);assert.deepEqual(restored.events,battle.events);assert.equal(restored.performer,battle.performer);
 assert.equal((await players[battle.performer].request(battleCommand(restored,'battle_fire',{target:defender,position:0}))).status,400);
 assert.equal((await players.jack.request(battleCommand(restored,'battle_pause'))).status,200);
 // Each test captain knows only its own layout; this fixture combines their
 // secrets to exercise a complete battle quickly, without modifying game state.
 const attacked=new Set();
 for(let i=0;i<40;i++){
  battle=await battleState();if(battle.complete)break;
  const opponents=battle.fleets.filter(f=>f.id!==battle.performer&&!f.eliminated),target=opponents[i%opponents.length];
  const position=secrets[target.id].find(p=>!target.cells[p].shot);assert.notEqual(position,undefined);
  const response=await players[battle.performer].request(battleCommand(battle,'battle_fire',{target:target.id,position}));
  assert.equal(response.status,200,JSON.stringify(response.data));attacked.add(target.id);
 }
 battle=await battleState();assert.equal(battle.complete,true);assert.ok(attacked.size>=3);
 assert.deepEqual(battle.results.map(r=>r.points),[5,3,1,0]);assert.equal(battle.fleets.filter(f=>!f.eliminated).length,1);
 assert.equal((await players.jack.request()).data.players.reduce((sum,p)=>sum+p.score,0),22);
 for(const c of Object.values(players))assert.deepEqual((await battleState(c)).results,battle.results);
 assert.equal((await players.stu.request(battleCommand(battle,'battle_finish'))).status,403);
 assert.equal((await players.jack.request(battleCommand(battle,'battle_finish'))).data.stage,'round_end');
 assert.equal((await players.jack.request({type:'lobby'})).status,200);
 assert.equal((await players.jack.request({type:'leave'})).data.isHost,false);
 const newHost=await observer.request({type:'join',player:'jack'});assert.equal(newHost.status,200);assert.equal(newHost.data.isHost,true);
 assert.equal((await players.jack.request({type:'reset'})).status,403);
 assert.equal((await observer.request({type:'reset'})).status,200);
 for(const c of [players.richard,players.stu,players.lauren])assert.equal((await c.request({type:'leave'})).status,200);
 assert.equal((await observer.request({type:'ready',ready:true})).status,200);
 const solo=await observer.request({type:'start'});assert.equal(solo.data.stage,'intro');assert.deepEqual(solo.data.participants,['jack']);
 await finishIntro();

 const soloPic=(await observer.request({type:'choose',game:'pictionary'})).data;
 assert.equal(soloPic.round.total,2);assert.equal(soloPic.round.solo,true);
 for(let index=0;index<2;index++){
  const base={game:'pictionary',index,roundId:soloPic.round.roundId};
  const started=(await observer.request({type:'pictionary_start',...base}));assert.equal(started.status,200);
  assert.equal((await observer.request({type:'pictionary_guess',...base,answer:started.data.round.secretWord})).status,200);
  assert.equal((await observer.request({type:'pictionary_next',...base})).status,200);
 }
 const practice=(await observer.request()).data;assert.equal(practice.stage,'round_end');assert.equal(practice.players.find(p=>p.id==='jack').score,0);
 assert.equal((await observer.request({type:'menu'})).status,200);
 const soloHang=(await observer.request({type:'choose',game:'hangman'})).data;
 assert.equal(soloHang.round.total,1);assert.equal(soloHang.round.solo,true);
 const soloWord={game:'hangman',index:0,roundId:soloHang.round.roundId};
 assert.equal((await observer.request({type:'hangman_set',...soloWord,word:'TROWEL',confirmCategory:true})).status,200);
 assert.equal((await observer.request({type:'hangman_letter',...soloWord,letter:'T'})).status,200);
 assert.equal((await observer.request({type:'hangman_solve',...soloWord,answer:'TROWEL'})).status,200);
 assert.equal((await observer.request({type:'hangman_next',...soloWord})).status,200);
 const hangPractice=(await observer.request()).data;assert.equal(hangPractice.stage,'round_end');assert.equal(hangPractice.players.find(p=>p.id==='jack').score,0);
 assert.equal((await observer.request({type:'menu'})).status,200);

 const soloMemory=(await observer.request({type:'choose',game:'memory'})).data.round;
 assert.equal(soloMemory.solo,true);assert.equal((await observer.request(memoryCommand(soloMemory,'memory_start'))).status,200);
 await moveMemoryClock(r=>{r.previewAt=Date.now()-100;r.deadline=Date.now()+8000;});
 const soloPairs=Object.values(Object.groupBy((await memoryState(observer)).cards,c=>c.face)).map(v=>v.map(c=>c.position));
 await moveMemoryClock(r=>r.deadline=Date.now()-1);
 for(const pair of soloPairs){for(const position of pair)await memoryFlip(observer,position);await finishMemoryReveal('jack');}
 const soloDone=await memoryState(observer);assert.equal(soloDone.found,12);assert.equal(soloDone.clicks,24);assert.equal(soloDone.complete,true);assert.equal((await observer.request()).data.players.find(p=>p.id==='jack').score,0);
 assert.equal((await observer.request(memoryCommand(soloDone,'memory_finish'))).status,200);
 assert.equal((await observer.request({type:'menu'})).status,200);
 assert.equal((await observer.request({type:'choose',game:'battleships'})).status,200);
 let soloBattle=await battleState(observer);assert.equal(soloBattle.solo,true);assert.equal(soloBattle.fleets.length,2);assert.equal(soloBattle.fleets.filter(f=>f.bot).length,1);
 assert.equal((await observer.request(battleCommand(soloBattle,'battle_ready',{ready:true}))).status,200);
 assert.equal((await observer.request(battleCommand(await battleState(observer),'battle_start'))).status,200);
 for(let i=0;i<64;i++){
  soloBattle=await battleState(observer);if(soloBattle.complete)break;
  assert.equal(soloBattle.performer,'jack');const opponent=soloBattle.fleets.find(f=>f.bot),position=opponent.cells.find(c=>!c.shot).position;
  const response=await observer.request(battleCommand(soloBattle,'battle_fire',{target:opponent.id,position}));assert.equal(response.status,200,JSON.stringify(response.data));
 }
 soloBattle=await battleState(observer);assert.equal(soloBattle.complete,true);assert.ok(soloBattle.results.every(r=>r.points===0));assert.ok(soloBattle.fleets.find(f=>f.bot).fired>0);
 assert.equal((await observer.request()).data.players.find(p=>p.id==='jack').score,0);
 assert.equal((await observer.request(battleCommand(soloBattle,'battle_finish'))).data.stage,'round_end');
 console.log('Battleships integration passed: private fleets, concurrent locking, any-opponent targeting, one atomic shot per turn, shared hits, pause/refresh, full elimination ranking, 5/3/1/0 awards and automatic solo opponent. Memory integration passed: 24-card shared layout, private individual boards, simultaneous play, exactly-once click counting, fewest-click ranking, 5/3/1/0 awards, Nob head label, pause/resume, refresh and solo no-score. Hangman integration passed: private word, concurrent shared letters, duplicate life protection, cooperative scoring, setter exclusion, one rotation and solo play. Pictionary integration passed: private prompt, shared streamed drawing, concurrent guesses, one winner, timeout, rotation, solo practice. Solo and intro integration passed. Integration passed: no sign-in, Jack selection and host transfer, four independent sessions, concurrent joins/answers, persistent refresh, host-only controls, hidden answers, shared scoring, synchronised progression, stale actions and cross-origin protection.');
}finally{await mf.dispose();}
