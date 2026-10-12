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
 assert.equal((await players.jack.request({type:'choose',game:'quiz'})).status,400);
 // Advance only the isolated test room's clock; no sleeps or production state changes.
 async function finishIntro(){const row=await db.prepare('SELECT id,body FROM game_rooms').first();const room=JSON.parse(row.body);room.intro.startsAt=Date.now()-20000;room.intro.endsAt=Date.now()-1;await db.prepare('UPDATE game_rooms SET body=? WHERE id=?').bind(JSON.stringify(room),row.id).run();}
 await finishIntro();assert.equal((await players.lauren.request()).data.stage,'menu');
 assert.equal((await players.jack.request({type:'choose',game:'quiz'})).status,200);
 assert.equal((await players.jack.request({type:'timer',game:'quiz',index:0})).status,200);
 const answers=await Promise.all(Object.values(players).map(c=>c.request({type:'answer',game:'quiz',index:0,answer:0})));
 for(const a of answers)assert.equal(a.status,200,JSON.stringify(a.data));
 const before=(await players.lauren.request()).data;assert.equal(before.round.answered.length,4);assert.equal(before.round.answer,null);assert.equal(before.round.answers,null);
 const revealed=await players.jack.request({type:'reveal',game:'quiz',index:0});assert.equal(revealed.status,200);
 for(const c of Object.values(players)){const s=(await c.request()).data;assert.equal(s.round.answer,'Kevin');assert.ok(s.players.every(p=>p.score===1));}
 assert.equal((await players.stu.request({type:'next',game:'quiz',index:0})).status,403);
 assert.equal((await players.jack.request({type:'next',game:'quiz',index:0})).status,200);
 assert.equal((await players.richard.request()).data.round.index,1);
 assert.equal((await players.richard.request({type:'answer',game:'quiz',index:0,answer:0})).status,409);
 assert.equal((await mf.dispatchFetch('https://game.test/api/room',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({type:'reset',requestId:crypto.randomUUID()})})).status,403);
 assert.equal((await players.jack.request({type:'lobby'})).status,200);
 assert.equal((await players.jack.request({type:'leave'})).data.isHost,false);
 const newHost=await observer.request({type:'join',player:'jack'});assert.equal(newHost.status,200);assert.equal(newHost.data.isHost,true);
 assert.equal((await players.jack.request({type:'reset'})).status,403);
 assert.equal((await observer.request({type:'reset'})).status,200);
 for(const c of [players.richard,players.stu,players.lauren])assert.equal((await c.request({type:'leave'})).status,200);
 assert.equal((await observer.request({type:'ready',ready:true})).status,200);
 const solo=await observer.request({type:'start'});assert.equal(solo.data.stage,'intro');assert.deepEqual(solo.data.participants,['jack']);
 await finishIntro();
 for(const game of ['quiz','emoji','list','pitch']){
  assert.equal((await observer.request({type:'choose',game})).status,200);
  assert.equal((await observer.request()).data.round.performer,'jack');
  if(game==='quiz'||game==='emoji'){
   assert.equal((await observer.request({type:'timer',game,index:0})).status,200);
   assert.equal((await observer.request({type:'answer',game,index:0,answer:game==='quiz'?0:'Home Alone'})).status,200);
   assert.equal((await observer.request({type:'reveal',game,index:0})).status,200);
  }else assert.equal((await observer.request({type:'award',game,index:0,points:3})).status,200);
  assert.equal((await observer.request({type:'next',game,index:0})).status,200);
  assert.equal((await observer.request()).data.round.performer,'jack');
  assert.equal((await observer.request({type:'menu'})).status,200);
 }
 console.log('Solo and intro integration passed. Integration passed: no sign-in, Jack selection and host transfer, four independent sessions, concurrent joins/answers, persistent refresh, host-only controls, hidden answers, shared scoring, synchronised progression, stale actions and cross-origin protection.');
}finally{await mf.dispose();}
