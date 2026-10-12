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
function playing(id='quiz'){let r=readyRoom();r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);return change(r,'jack','choose',{game:id});}
test('all four actors see readiness and only Jack can start',()=>{let r=newRoom();r=change(r,'richard','join',{player:'richard'});assert.equal(snapshot(r,actors.lauren,seen,time).readyCount,1);assert.throws(()=>change(r,'richard','start'),/Only Jack/);r=change(r,'jack','join',{player:'jack'});assert.equal(snapshot(r,actors.jack,seen,time).canStart,true);r=change(r,'stu','join',{player:'stu'});r=change(r,'lauren','join',{player:'lauren'});r=change(r,'jack','start');for(const a of Object.values(actors)){assert.equal(snapshot(r,a,seen,time).stage,'intro');assert.equal(snapshot(r,a,seen,r.intro.endsAt).stage,'menu');}});
test('any anonymous browser can select Jack; authority follows the selected name',()=>{let r=newRoom();r=change(r,'stu','join',{player:'jack'});assert.equal(snapshot(r,actors.stu,seen,time).isHost,true);assert.equal(snapshot(r,actors.jack,seen,time).isHost,false);assert.throws(()=>change(r,'jack','join',{player:'jack'}),/already playing/);r=change(r,'stu','leave');assert.equal(snapshot(r,actors.stu,seen,time).isHost,false);r=change(r,'lauren','join',{player:'jack'});assert.equal(snapshot(r,actors.lauren,seen,time).isHost,true);});
test('players cannot steal an active name or control host operations',()=>{let r=newRoom();r=change(r,'richard','join',{player:'richard'});assert.throws(()=>change(r,'lauren','join',{player:'richard'}),/already playing/);const active=playing();for(const type of['choose','timer','next','reveal','award','menu','lobby','podium','reset','adjust','release'])assert.throws(()=>change(active,'stu',type,{game:'quiz',index:0}),/Only Jack/);});
test('an offline Jack slot can be reclaimed in the lobby without an account',()=>{let r=newRoom();r=change(r,'jack','join',{player:'jack'});const expired={...seen,'session:jack':time-21000};assert.equal(snapshot(r,actors.stu,expired,time).players.find(p=>p.id==='jack').taken,false);r=transition(r,actors.stu,command('join',{player:'jack'}),expired,time);assert.equal(snapshot(r,actors.stu,seen,time).isHost,true);assert.equal(snapshot(r,actors.jack,seen,time).isHost,false);assert.throws(()=>change(r,'jack','reset'),/Only Jack/);});
test('a disconnected guest is excluded without blocking Jack; reconnect restores identity',()=>{const r=readyRoom(),expired={...seen,'session:stu':time-21000};assert.equal(snapshot(r,actors.jack,expired,time).readyCount,3);const started=transition(r,actors.jack,command('start'),expired,time);assert.deepEqual(started.participants,['richard','jack','lauren']);assert.equal(snapshot(r,actors.stu,seen,time).me,'stu');assert.equal(snapshot(r,actors.stu,seen,time).allReady,true);});
test('server hides answer key and other responses until the host reveal',()=>{let r=playing();assert.throws(()=>change(r,'richard','answer',{game:'quiz',index:0,answer:0}),/closed/);r=change(r,'jack','timer',{game:'quiz',index:0});r=change(r,'richard','answer',{game:'quiz',index:0,answer:0});let s=snapshot(r,actors.stu,seen,time);assert.equal(s.round.answer,null);assert.equal(s.round.correctOption,null);assert.equal(s.round.answers,null);assert.deepEqual(s.round.answered,['richard']);assert.equal(s.round.myAnswer,null);s=snapshot(r,actors.richard,seen,time);assert.equal(s.round.myAnswer,0);assert.equal(JSON.stringify(s).includes('session:richard'),false);});
test('answer lock, expiry, reveal scoring and idempotent host commands',()=>{let r=playing();r=change(r,'jack','timer',{game:'quiz',index:0});r=change(r,'richard','answer',{game:'quiz',index:0,answer:0});r=change(r,'stu','answer',{game:'quiz',index:0,answer:1});assert.throws(()=>change(r,'richard','answer',{game:'quiz',index:0,answer:2}),/already locked/);assert.throws(()=>change(r,'lauren','answer',{game:'quiz',index:0,answer:0},time+30001),/closed/);const c=command('reveal',{game:'quiz',index:0});r=transition(r,actors.jack,c,seen,time);r=transition(r,actors.jack,c,seen,time);assert.equal(r.ledger.filter(e=>e.player==='richard')[0].points,1);assert.equal(r.ledger.filter(e=>e.player==='stu')[0].points,0);assert.equal(r.ledger.length,4);r=change(r,'jack','next',{game:'quiz',index:0});assert.equal(snapshot(r,actors.lauren,seen,time).round.index,1);assert.throws(()=>change(r,'jack','next',{game:'quiz',index:0}),/moved on/);});
test('paused timers close answers and resume with remaining time',()=>{let r=playing();r=change(r,'jack','timer',{game:'quiz',index:0});r=change(r,'jack','timer',{game:'quiz',index:0},time+10000);assert.equal(r.rounds.quiz.pausedMs,20000);assert.throws(()=>change(r,'stu','answer',{game:'quiz',index:0,answer:0}),/closed/);r=change(r,'jack','timer',{game:'quiz',index:0},time+20000);assert.equal(r.rounds.quiz.deadline,time+40000);});
test('emoji answers tolerate case and punctuation, score only on reveal',()=>{let r=playing('emoji');r=change(r,'jack','timer',{game:'emoji',index:0});r=change(r,'lauren','answer',{game:'emoji',index:0,answer:'HOME ALONE!'});assert.equal(r.ledger.length,0);r=change(r,'jack','reveal',{game:'emoji',index:0});assert.equal(r.ledger.find(e=>e.player==='lauren').points,1);});
test('manual games rotate performers and awards cannot stack for a card',()=>{let r=playing('pitch');assert.equal(r.rounds.pitch.performer,'richard');r=change(r,'jack','award',{game:'pitch',index:0,points:3});r=change(r,'jack','award',{game:'pitch',index:0,points:2});assert.equal(r.ledger.length,1);assert.equal(r.ledger[0].points,2);r=change(r,'jack','next',{game:'pitch',index:0});assert.equal(r.rounds.pitch.performer,'stu');});
test('leaving, host slot release, return to lobby and reset affect all clients',()=>{let r=readyRoom();r=change(r,'jack','release',{player:'stu'});assert.equal(snapshot(r,actors.stu,seen,time).me,null);r=change(r,'stu','join',{player:'stu'});r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);r=change(r,'jack','adjust',{player:'lauren',points:3,reason:'Bonus'});r=change(r,'jack','lobby');assert.equal(snapshot(r,actors.lauren,seen,time).players.find(p=>p.id==='lauren').score,3);assert.equal(snapshot(r,actors.stu,seen,time).readyCount,0);r=change(r,'jack','reset');assert.equal(r.ledger.length,0);assert.equal(r.players.filter(p=>p.owner).length,4);});
test('all rounds end at the correct card and cannot be restarted for extra points',()=>{for(const id of['quiz','emoji','list','pitch']){let r=playing(id),count=snapshot(r,actors.jack,seen,time).round.total;for(let i=0;i<count;i++){r=change(r,'jack',id==='quiz'||id==='emoji'?'reveal':'award',{game:id,index:i,points:0});r=change(r,'jack','next',{game:id,index:i});}assert.equal(r.stage,'round_end');assert.equal(r.rounds[id].complete,true);r=change(r,'jack','menu');assert.throws(()=>change(r,'jack','choose',{game:id}),/complete/);}});


test('solo host completes every game after a shared, refresh-safe intro',()=>{
 for(const id of ['quiz','emoji','list','pitch']){
  let r=change(newRoom(),'jack','join',{player:'jack'});
  assert.equal(snapshot(r,actors.jack,seen,time).canStart,true);
  r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);
  assert.deepEqual(r.participants,['jack']);
  const before=r.intro.endsAt-1;
  assert.equal(snapshot(r,actors.jack,seen,before).stage,'intro');
  assert.throws(()=>change(r,'jack','choose',{game:id},before),/Lauren is fixing/);
  assert.equal(snapshot(r,actors.jack,seen,time).stage,'menu');
  r=change(r,'jack','choose',{game:id});
  const count=snapshot(r,actors.jack,seen,time).round.total;
  for(let i=0;i<count;i++){
   assert.equal(r.rounds[id].performer,'jack');
   if(id==='quiz'||id==='emoji'){
    r=change(r,'jack','timer',{game:id,index:i});
    r=change(r,'jack','answer',{game:id,index:i,answer:id==='quiz'?0:'Home Alone'});
    r=change(r,'jack','reveal',{game:id,index:i});
   }else r=change(r,'jack','award',{game:id,index:i,points:3});
   r=change(r,'jack','next',{game:id,index:i});
  }
  assert.equal(r.stage,'round_end');
  assert.ok(r.ledger.every(e=>e.player==='jack'));
 }
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
 let r=playing('pitch');r=change(r,'jack','award',{game:'pitch',index:0,points:2});r=change(r,'jack','lobby');
 for(const p of roster)r=change(r,p.id,'ready',{ready:true});
 r=change(r,'jack','start',{},time+1000);
 assert.equal(r.stage,'intro');assert.equal(r.intro.startsAt,time+1000+INTRO_LEAD_IN);assert.equal(r.ledger[0].points,2);
});
test('entrance phases preserve the requested action order',()=>{
 assert.deepEqual([-1,0,1200,3000,3900,5800,6900,8400,10000,12000,13100].map(introPhase),['ready','jump-out','run-in','throw-rope','pull','drop','throw-logo','celebrate','run-back','jump-back','done']);
});
