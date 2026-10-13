import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,transition,snapshot,roster} from '../lib/room-engine.js';
import {INTRO_DURATION,INTRO_LEAD_IN,introPhase} from '../lib/intro-timeline.js';
const time=1800000000000;
const actors=Object.fromEntries(roster.map(p=>[p.id,{key:'session:'+p.id}]));
const seen=Object.fromEntries(Object.values(actors).map(a=>[a.key,time]));
const command=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
function change(r,who,type,extra={},now=time){return transition(r,actors[who],command(type,extra),seen,now);}
function readyRoom(){let r=newRoom();for(const p of roster)r=change(r,p.id,'join',{player:p.id});return r;}
function playing(id='memory'){let r=readyRoom();r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);return change(r,'jack','choose',{game:id});}
test('all four actors see readiness and only Jack can start',()=>{let r=newRoom();r=change(r,'richard','join',{player:'richard'});assert.equal(snapshot(r,actors.lauren,seen,time).readyCount,1);assert.throws(()=>change(r,'richard','start'),/Only Jack/);r=change(r,'jack','join',{player:'jack'});assert.equal(snapshot(r,actors.jack,seen,time).canStart,true);r=change(r,'stu','join',{player:'stu'});r=change(r,'lauren','join',{player:'lauren'});r=change(r,'jack','start');for(const a of Object.values(actors)){assert.equal(snapshot(r,a,seen,time).stage,'intro');assert.equal(snapshot(r,a,seen,r.intro.endsAt).stage,'menu');}});
test('any anonymous browser can select Jack; authority follows the selected name',()=>{let r=newRoom();r=change(r,'stu','join',{player:'jack'});assert.equal(snapshot(r,actors.stu,seen,time).isHost,true);assert.equal(snapshot(r,actors.jack,seen,time).isHost,false);assert.throws(()=>change(r,'jack','join',{player:'jack'}),/already playing/);r=change(r,'stu','leave');assert.equal(snapshot(r,actors.stu,seen,time).isHost,false);r=change(r,'lauren','join',{player:'jack'});assert.equal(snapshot(r,actors.lauren,seen,time).isHost,true);});
test('players cannot steal an active name or control host operations',()=>{let r=newRoom();r=change(r,'richard','join',{player:'richard'});assert.throws(()=>change(r,'lauren','join',{player:'richard'}),/already playing/);const active=playing();for(const type of['choose','timer','next','reveal','award','menu','lobby','podium','reset','adjust','release'])assert.throws(()=>change(active,'stu',type,{game:'memory',index:0}),/Only Jack/);});
test('an offline Jack slot can be reclaimed in the lobby without an account',()=>{let r=newRoom();r=change(r,'jack','join',{player:'jack'});const expired={...seen,'session:jack':time-21000};assert.equal(snapshot(r,actors.stu,expired,time).players.find(p=>p.id==='jack').taken,false);r=transition(r,actors.stu,command('join',{player:'jack'}),expired,time);assert.equal(snapshot(r,actors.stu,seen,time).isHost,true);assert.equal(snapshot(r,actors.jack,seen,time).isHost,false);assert.throws(()=>change(r,'jack','reset'),/Only Jack/);});
test('a disconnected guest is excluded without blocking Jack; reconnect restores identity',()=>{const r=readyRoom(),expired={...seen,'session:stu':time-21000};assert.equal(snapshot(r,actors.jack,expired,time).readyCount,3);const started=transition(r,actors.jack,command('start'),expired,time);assert.deepEqual(started.participants,['richard','jack','lauren']);assert.equal(snapshot(r,actors.stu,seen,time).me,'stu');assert.equal(snapshot(r,actors.stu,seen,time).allReady,true);});
test('leaving, host slot release, return to lobby and reset affect all clients',()=>{let r=readyRoom();r=change(r,'jack','release',{player:'stu'});assert.equal(snapshot(r,actors.stu,seen,time).me,null);r=change(r,'stu','join',{player:'stu'});r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);r=change(r,'jack','adjust',{player:'lauren',points:3,reason:'Bonus'});r=change(r,'jack','lobby');assert.equal(snapshot(r,actors.lauren,seen,time).players.find(p=>p.id==='lauren').score,3);assert.equal(snapshot(r,actors.stu,seen,time).readyCount,0);r=change(r,'jack','reset');assert.equal(r.ledger.length,0);assert.equal(r.players.filter(p=>p.owner).length,4);});


test('solo host enters Battleships after a shared, refresh-safe intro',()=>{
 let r=change(newRoom(),'jack','join',{player:'jack'});
 assert.equal(snapshot(r,actors.jack,seen,time).canStart,true);
 r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);
 assert.deepEqual(r.participants,['jack']);
 assert.equal(snapshot(r,actors.jack,seen,r.intro.endsAt-1).stage,'intro');
 assert.throws(()=>change(r,'jack','choose',{game:'battleships'},r.intro.endsAt-1),/Lauren is fixing/);
 r=change(r,'jack','choose',{game:'battleships'});
 assert.equal(r.rounds.battleships.solo,true);
 assert.equal(r.rounds.battleships.phase,'setup');
});
test('start requires Jack to be ready; duplicate start keeps the same intro clock',()=>{
 let r=change(newRoom(),'jack','join',{player:'jack'});
 r=change(r,'jack','ready',{ready:false});
 assert.equal(snapshot(r,actors.jack,seen,time).canStart,false);
 assert.throws(()=>change(r,'jack','start'),/Ready up/);
 r=change(r,'jack','ready',{ready:true});
 const start=command('start');r=transition(r,actors.jack,start,seen,time);
 const again=transition(r,actors.jack,start,seen,time+1000);
 assert.deepEqual(again.intro,r.intro);
 assert.throws(()=>change(r,'jack','menu'),/Lauren is fixing/);
 const stopped=change(r,'jack','reset');assert.equal(stopped.stage,'lobby');assert.equal(stopped.intro,null);
});
test('returning to the lobby replays the entrance and preserves scores',()=>{
 let r=playing();r=change(r,'jack','adjust',{player:'jack',points:2,reason:'Bonus'});r=change(r,'jack','lobby');
 for(const p of roster)r=change(r,p.id,'ready',{ready:true});
 r=change(r,'jack','start',{},time+1000);
 assert.equal(r.stage,'intro');assert.equal(r.intro.startsAt,time+1000+INTRO_LEAD_IN);assert.equal(r.ledger[0].points,2);
});
test('entrance phases preserve the requested action order',()=>{
 assert.deepEqual([-1,0,1200,5000,5900,7800,8900,10400,12000,16000,17100].map(introPhase),['ready','jump-out','run-in','throw-rope','pull','drop','throw-logo','celebrate','run-back','jump-back','done']);
});


test('restarting a single game replaces only its automatic points and rejects stale or unauthorised requests',()=>{
 for(const game of ['pictionary','hangman','memory','battleships']){
  let r=playing(game),old=r.rounds[game];
  r.rounds.other={marker:'keep me'};
  r.ledger=[{key:`${game}:${old.id}:ranking`,player:'jack',points:5,source:game},{key:'other:score',player:'stu',points:3,source:'other'},{key:'adjust:manual',player:'jack',points:2,source:'manual'}];
  const details={game,roundId:old.id,confirmRestart:true};
  assert.throws(()=>change(r,'stu','restart_game',details),/Only Jack/);
  assert.throws(()=>change(r,'jack','restart_game',{...details,confirmRestart:false}),/Confirm/);
  assert.throws(()=>change(r,'jack','restart_game',{...details,roundId:'old'}),/already changed/);
  const action=command('restart_game',details);r=transition(r,actors.jack,action,seen,time);
  assert.notEqual(r.rounds[game].id,old.id);assert.equal(r.stage,'playing');assert.equal(r.activeGame,game);
  assert.deepEqual(r.ledger.map(e=>e.key),['other:score','adjust:manual']);assert.deepEqual(r.rounds.other,{marker:'keep me'});
  assert.equal(snapshot(r,actors.jack,seen,time).games.find(g=>g.id===game).roundId,r.rounds[game].id);
  assert.deepEqual(transition(r,actors.jack,action,seen,time),r);
  assert.throws(()=>change(r,'jack','restart_game',details),/already changed/);
 }
});
test('replaying a completed game pauses the current game and preserves its progress',()=>{
 let r=playing('memory');r.rounds.memory.complete=true;r.rounds.memory.phase='complete';const memoryId=r.rounds.memory.id;
 r=change(r,'jack','menu');r=change(r,'jack','choose',{game:'pictionary'});
 r.rounds.pictionary.deadline=time+70000;r.rounds.pictionary.strokes=[{id:'saved-drawing'}];
 r=change(r,'jack','restart_game',{game:'memory',roundId:memoryId,confirmRestart:true});
 assert.equal(r.rounds.pictionary.deadline,null);assert.equal(r.rounds.pictionary.pausedMs,70000);
 assert.deepEqual(r.rounds.pictionary.strokes,[{id:'saved-drawing'}]);assert.equal(r.rounds.memory.phase,'ready');
 assert.equal(r.ledger.length,0);
});
