import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {component} from './helpers/render-component.js';
import {newRoom,transition,snapshot,roster} from '../lib/room-engine.js';
import {INTRO_DURATION,INTRO_LEAD_IN} from '../lib/intro-timeline.js';
const Briefing=component('app/GameBriefing.tsx').default;
const now=1800000000000,ids=roster.map(p=>p.id),seen=Object.fromEntries(ids.map(id=>[id,now]));
const actor=id=>({key:id});
function act(room,type,details={},who='jack',at=now){return transition(room,actor(who),{type,game:room.activeGame,roundId:room.rounds[room.activeGame]?.id,requestId:crypto.randomUUID(),...details},seen,at);}
function menu(solo=false){let room=newRoom();for(const id of solo?['jack']:ids)room=act(room,'join',{player:id},id);return act(room,'start',{},'jack',now-INTRO_DURATION-INTRO_LEAD_IN);}
const blocked={pictionary:'pictionary_start',hangman:'hangman_set',memory:'memory_start',battleships:'battle_ready'};

test('every fresh game shares a persistent briefing with no running clock or permitted game actions',()=>{
 for(const game of Object.keys(blocked)){
  const room=act(menu(),'choose',{game}),roundId=room.rounds[game].id;
  for(const who of ids){const s=snapshot(JSON.parse(JSON.stringify(room)),actor(who),seen,now+600000);assert.equal(s.stage,'briefing');assert.equal(s.activeGame,game);assert.equal(s.round.roundId,roundId);assert.equal(s.players.reduce((n,p)=>n+p.score,0),0);assert.ok(!s.round.deadline);}
  assert.throws(()=>act(room,blocked[game],{index:0,ready:true,word:'TROWEL',confirmCategory:true},'richard'),/active|Open/);
  assert.throws(()=>act(room,'begin_game',{},'stu'),/Only Jack/);
  assert.throws(()=>act(room,'begin_game',{roundId:'outdated'}),/changed/);
  assert.throws(()=>act(room,'begin_game',{game:'wrong-game'}),/changed/);
  assert.throws(()=>act(room,'choose',{game}),/menu/);
  const begin={type:'begin_game',game,roundId,requestId:crypto.randomUUID()};
  const playing=transition(room,actor('jack'),begin,seen,now);
  assert.equal(playing.stage,'playing');assert.equal(playing.rounds[game].briefingPending,false);
  assert.deepEqual(transition(playing,actor('jack'),begin,seen,now),playing);
  assert.throws(()=>act(playing,'begin_game'),/already finished/);
 }
});
test('leaving an unread briefing retains it; resuming gameplay preserves progress without another briefing',()=>{
 for(const game of Object.keys(blocked)){
  let room=act(menu(),'choose',{game}),roundId=room.rounds[game].id;
  room=act(room,'menu');room=act(room,'choose',{game});assert.equal(room.stage,'briefing');assert.equal(room.rounds[game].id,roundId);
  room=act(room,'begin_game');room=act(room,'menu');room=act(room,'choose',{game});assert.equal(room.stage,'playing');assert.equal(room.rounds[game].id,roundId);
  // Persisted rooms from earlier releases never acquire an unexpected gate.
  delete room.rounds[game].briefingPending;room=act(room,'menu');room=act(room,'choose',{game});assert.equal(room.stage,'playing');
  room=act(room,'restart_game',{confirmRestart:true});assert.equal(room.stage,'briefing');assert.notEqual(room.rounds[game].id,roundId);
  assert.throws(()=>act(room,'begin_game',{roundId}),/changed/);room=act(room,'begin_game');assert.equal(room.stage,'playing');
 }
});
test('solo host can finish every briefing without waiting for absent presenters',()=>{
 for(const game of Object.keys(blocked)){let room=act(menu(true),'choose',{game});assert.equal(room.stage,'briefing');room=act(room,'begin_game');assert.equal(room.stage,'playing');assert.deepEqual(room.participants,['jack']);assert.equal(room.ledger.length,0);}
});
test('rules render the assigned full-body sprite and all goals, with host-only continuation and solo guidance',()=>{
 for(const [game,presenter] of Object.entries({pictionary:'jack',hangman:'lauren',memory:'stu',battleships:'richard'})){
  const render=extra=>renderToStaticMarkup(React.createElement(Briefing,{game,isHost:true,locked:false,solo:false,onBegin:()=>{},...extra}));
  const host=render({}),guest=render({isHost:false}),solo=render({solo:true});
  assert.ok(host.includes(`data-presenter="${presenter}"`));assert.ok(host.includes(`/assets/${presenter}-full-elf.webp`));
  assert.ok(host.includes('viewBox="0 0 1024 1536"'));assert.ok(host.includes('full-body Christmas avatar'));assert.equal((host.match(/<li>/g)||[]).length,3);
  assert.ok(host.includes('POINTS UP FOR GRABS'));assert.ok(host.includes('moves all players together'));
  assert.ok(guest.includes('Waiting for Jack'));assert.ok(!guest.includes('<button'));assert.ok(solo.includes('Practice awards no points')||solo.includes('practice awards no points'));
  assert.ok(render({locked:true}).includes('disabled=""'));
 }
});
