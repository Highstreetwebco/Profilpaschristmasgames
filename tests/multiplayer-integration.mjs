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
const mf=new Miniflare({modules:true,scriptPath:'.sites-runtime/integration-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-christmas-test'},bindings:{HOST_EMAIL:'jack@example.test'},cf:false});
try{
 const db=await mf.getD1Database('DB');
 const sql=readFileSync('drizzle/0000_large_roulette.sql','utf8');for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 function client(host=false){let cookie='';const headers=()=>({...cookie?{cookie}:{},...host?{'oai-authenticated-user-id':'test-host-account','oai-authenticated-user-email':'jack@example.test'}:{}});return{async request(command){const res=await mf.dispatchFetch('https://game.test/api/room',{method:command?'POST':'GET',headers:{...headers(),...command?{'content-type':'application/json',origin:'https://game.test'}:{}},...command?{body:JSON.stringify({requestId:crypto.randomUUID(),...command})}:{}});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const data=await res.json();return{status:res.status,data};}};}
 const players={richard:client(),stu:client(),jack:client(true),lauren:client()};
 await Promise.all(Object.values(players).map(c=>c.request()));
 const joins=await Promise.all(Object.entries(players).map(([player,c])=>c.request({type:'join',player})));
 for(const j of joins)assert.equal(j.status,200,JSON.stringify(j.data));
 const observer=client();await observer.request();assert.equal((await observer.request({type:'join',player:'richard'})).status,409);assert.equal((await observer.request({type:'join',player:'jack'})).status,403);
 for(const[name,c]of Object.entries(players)){const s=(await c.request()).data;assert.equal(s.me,name);assert.equal(s.readyCount,4);assert.equal(s.isHost,name==='jack');}
 assert.equal((await players.stu.request({type:'start'})).status,403);
 assert.equal((await players.jack.request({type:'start'})).status,200);
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
 console.log('Integration passed: four independent sessions, concurrent joins/answers, persistent refresh, host-only controls, hidden answers, shared scoring, synchronised progression, stale actions and cross-origin protection.');
}finally{await mf.dispose();}
