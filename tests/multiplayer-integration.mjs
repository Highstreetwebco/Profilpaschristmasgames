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
 const solved=await Promise.all([players.stu,players.jack,players.lauren].map(c=>c.request(hang('hangman_solve',{answer:'TILE TRIM'}))));
 assert.equal(solved.filter(r=>r.status===200).length,1);
 for(const c of Object.values(players)){const response=(await c.request()).data;assert.equal(response.round.outcome,'saved');assert.deepEqual(response.players.map(p=>p.score),[0,1,1,1]);assert.equal(response.round.awards.length,3);}
 assert.equal((await players.stu.request(hang('hangman_next'))).status,403);
 assert.equal((await players.jack.request(hang('hangman_next'))).status,200);
 assert.equal((await players.richard.request()).data.round.performer,'stu');
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
 for(const game of ['list','pitch']){
  assert.equal((await observer.request({type:'choose',game})).status,200);
  assert.equal((await observer.request()).data.round.performer,'jack');
  assert.equal((await observer.request({type:'award',game,index:0,points:3})).status,200);
  assert.equal((await observer.request({type:'next',game,index:0})).status,200);
  assert.equal((await observer.request()).data.round.performer,'jack');
  assert.equal((await observer.request({type:'menu'})).status,200);
 }
 console.log('Hangman integration passed: private word, concurrent shared letters, duplicate life protection, cooperative scoring, setter exclusion, one rotation and solo play. Pictionary integration passed: private prompt, shared streamed drawing, concurrent guesses, one winner, timeout, rotation, solo practice. Solo and intro integration passed. Integration passed: no sign-in, Jack selection and host transfer, four independent sessions, concurrent joins/answers, persistent refresh, host-only controls, hidden answers, shared scoring, synchronised progression, stale actions and cross-origin protection.');
}finally{await mf.dispose();}
