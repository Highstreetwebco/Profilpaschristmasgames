import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,transition,snapshot,roster} from '../lib/room-engine.js';
import {drawingWords} from '../lib/pictionary.js';
import {INTRO_DURATION,INTRO_LEAD_IN} from '../lib/intro-timeline.js';
const time=1800000000000;
const actors=Object.fromEntries(roster.map(p=>[p.id,{key:'session:'+p.id}]));
const seen=Object.fromEntries(Object.values(actors).map(a=>[a.key,time]));
function change(r,who,type,extra={},now=time){return transition(r,actors[who],{type,game:'pictionary',index:r.rounds.pictionary?.index,roundId:r.rounds.pictionary?.id,requestId:crypto.randomUUID(),...extra},seen,now);}
function ready(ids=roster.map(p=>p.id)){let r=newRoom();for(const id of ids)r=change(r,id,'join',{player:id});r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);return change(r,'jack','choose');}
const view=(r,who='jack',now=time)=>snapshot(r,actors[who],seen,now);
const word=r=>drawingWords[r.rounds.pictionary.deck[r.rounds.pictionary.index]][0];
const stroke=()=>({stroke:crypto.randomUUID(),colour:'#20352d',width:6,points:[[10,20],[200,80]],canvasEpoch:0});
test('Pictionary is game one: two random non-repeating prompts per player, word only sent to drawer after start',()=>{
 let r=ready();assert.equal(view(r).games[0].id,'pictionary');assert.equal(view(r).round.total,8);assert.equal(new Set(r.rounds.pictionary.deck).size,8);assert.deepEqual(r.rounds.pictionary.turns,['richard','stu','jack','lauren','richard','stu','jack','lauren']);
 assert.equal(view(r,'richard').round.secretWord,null);assert.throws(()=>change(r,'jack','pictionary_start'),/Only the drawer/);
 r=change(r,'richard','pictionary_start');assert.equal(r.rounds.pictionary.deadline,time+120000);assert.equal(view(r,'richard').round.secretWord,word(r));
 for(const who of ['stu','jack','lauren']){const s=view(r,who);assert.equal(s.round.secretWord,null);assert.equal(s.round.answer,null);assert.equal('deck' in s.round,false);assert.equal(JSON.stringify(s.round).includes(word(r)),false);}
 assert.equal(snapshot(r,{key:'observer'},seen,time).round.secretWord,null);
 assert.throws(()=>change(r,'jack','reveal'),/Pictionary controls/);assert.throws(()=>change(r,'jack','performer',{player:'jack'}),/Pictionary controls/);
});
test('drawer alone can stream ink, refresh recovers it, undo removes a whole stroke and stale packets cannot restore it',()=>{
 let r=change(ready(),'richard','pictionary_start');const ink=stroke(),id=crypto.randomUUID();r=change(r,'richard','pictionary_ink',{...ink,requestId:id});r=change(r,'richard','pictionary_ink',{...ink,requestId:id});assert.equal(r.rounds.pictionary.strokes.length,1);
 r=change(r,'richard','pictionary_ink',{...ink,points:[[200,80],[250,120]]});assert.equal(view(r,'lauren').round.strokes.length,2);assert.throws(()=>change(r,'jack','pictionary_ink',stroke()),/Only the current drawer/);
 assert.throws(()=>change(r,'richard','pictionary_ink',{...stroke(),points:[[1001,20]]}),/Invalid/);
 r=change(r,'richard','pictionary_undo',{canvasEpoch:0});assert.equal(view(r).round.strokes.length,0);assert.equal(r.rounds.pictionary.canvasEpoch,1);
 assert.throws(()=>change(r,'richard','pictionary_ink',stroke()),/canvas has changed/);
 r=change(r,'richard','pictionary_ink',{...stroke(),canvasEpoch:1});r=change(r,'richard','pictionary_clear',{canvasEpoch:1});assert.equal(view(r).round.strokes.length,0);
});
test('unlimited wrong guesses, first correct gets exactly one point, drawer and late guesses rejected',()=>{
 let r=change(ready(),'richard','pictionary_start');r=change(r,'stu','pictionary_guess',{answer:'wrong'},time+100);assert.equal(view(r).players.find(p=>p.id==='stu').score,0);
 r=change(r,'stu','pictionary_guess',{answer:'wrong again'},time+500);assert.throws(()=>change(r,'richard','pictionary_guess',{answer:word(r)}),/drawer cannot/);
 const answer=word(r),id=crypto.randomUUID();r=change(r,'lauren','pictionary_guess',{answer:`THE ${answer.toUpperCase()}!`,requestId:id},time+1000);assert.equal(view(r).round.winner,'lauren');assert.equal(view(r).round.answer,answer);assert.equal(view(r).players.find(p=>p.id==='lauren').score,1);
 r=change(r,'lauren','pictionary_guess',{answer,requestId:id},time+1001);assert.equal(r.ledger.length,1);assert.throws(()=>change(r,'stu','pictionary_guess',{answer},time+1002),/closed/);assert.throws(()=>change(r,'richard','pictionary_ink',stroke()),/closed/);
});
test('shared 120-second deadline automatically reveals for every client and closes guesses exactly at expiry',()=>{
 let r=change(ready(),'richard','pictionary_start');assert.equal(view(r,'stu',time+119999).round.revealed,false);for(const who of roster.map(p=>p.id)){const s=view(r,who,time+120000);assert.equal(s.round.revealed,true);assert.equal(s.round.answer,word(r));assert.equal(s.round.outcome,'timeout');}
 assert.throws(()=>change(r,'stu','pictionary_guess',{answer:word(r)},time+120000),/closed/);r=change(r,'jack','pictionary_next',{},time+120000);assert.equal(r.rounds.pictionary.index,1);assert.equal(r.rounds.pictionary.performer,'stu');assert.equal(r.ledger.length,0);
});
test('pause/menu/resume preserves ink, secret and remaining time without reopening an expired drawing',()=>{
 let r=change(ready(),'richard','pictionary_start');r=change(r,'richard','pictionary_ink',stroke());const secret=word(r);r=change(r,'jack','menu',{},time+30000);assert.equal(r.rounds.pictionary.pausedMs,90000);r=change(r,'jack','choose',{},time+60000);assert.equal(view(r,'richard').round.secretWord,secret);assert.equal(view(r).round.strokes.length,1);assert.throws(()=>change(r,'stu','pictionary_guess',{answer:secret}),/closed/);r=change(r,'jack','timer',{},time+60000);assert.equal(r.rounds.pictionary.deadline,time+150000);
 r=change(r,'jack','menu',{},time+150001);assert.equal(r.rounds.pictionary.revealed,true);assert.equal(r.rounds.pictionary.outcome,'timeout');
});
test('eight drawings rotate fairly, stale turns are blocked and no manual award can bypass first-correct scoring',()=>{
 let r=ready();for(let i=0;i<8;i++){assert.equal(view(r).round.performer,roster[i%4].id);assert.throws(()=>change(r,'jack','award',{points:3}),/Pictionary controls/);r=change(r,roster[i%4].id,'pictionary_start');r=change(r,'jack','pictionary_finish');assert.throws(()=>change(r,'lauren','pictionary_next'),/Only Jack/);r=change(r,'jack','pictionary_next');if(i<7)assert.throws(()=>change(r,roster[i%4].id,'pictionary_ink',{...stroke(),index:i}),/moved on/);}
 assert.equal(r.stage,'round_end');assert.equal(r.rounds.pictionary.complete,true);assert.equal(r.ledger.length,0);r=change(r,'jack','menu');assert.throws(()=>change(r,'jack','choose'),/complete/);
});
test('solo practice has exactly two drawings, supports guessing but awards no points, and old instance requests fail after reset',()=>{
 let r=ready(['jack']),oldId=r.rounds.pictionary.id;assert.equal(view(r).round.solo,true);assert.equal(view(r).round.total,2);
 for(let i=0;i<2;i++){r=change(r,'jack','pictionary_start');r=change(r,'jack','pictionary_ink',stroke());r=change(r,'jack','pictionary_guess',{answer:word(r)});assert.equal(view(r).round.outcome,'practice');r=change(r,'jack','pictionary_next');}
 assert.equal(r.stage,'round_end');assert.equal(r.ledger.length,0);r=change(r,'jack','reset');r=change(r,'jack','ready',{ready:true});r=change(r,'jack','start',{},time-INTRO_DURATION-INTRO_LEAD_IN);r=change(r,'jack','choose');assert.throws(()=>change(r,'jack','pictionary_start',{roundId:oldId}),/moved on/);
});
test('players excluded at the session start cannot draw or guess',()=>{
 let r=ready(['jack']);r=change(r,'jack','pictionary_start');assert.throws(()=>change(r,'stu','pictionary_guess',{answer:word(r)}),/join as a player/);
});
