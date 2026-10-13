import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {component} from './helpers/render-component.js';
import {makePictionary,pictionarySnapshot} from '../lib/pictionary.js';
import {makeHangman,hangmanSnapshot} from '../lib/hangman.js';
import {makeMemory,memorySnapshot} from '../lib/memory.js';
import {roster} from '../lib/room-engine.js';
const Pictionary=component('app/Pictionary.tsx').default,Hangman=component('app/Hangman.tsx').default,Memory=component('app/Memory.tsx').default,Help=component('app/GameHelp.tsx').default;
const time=1800000000000,players=roster.map(p=>({...p,online:true})),ids=roster.map(p=>p.id);
function render(Game,round,me='jack',extra={}){return renderToStaticMarkup(React.createElement(Game,{round,players,me,isHost:me==='jack',connected:true,serverNow:time,clockOffset:0,send:async()=>{},...extra}));}
test('Pictionary keeps the word in the drawer sidebar and reconnecting blocks the drawing pad',()=>{
 const r=makePictionary(ids);r.deadline=time+120000;
 const own=pictionarySnapshot(r,{id:'richard'},time,[]),guest=pictionarySnapshot(r,{id:'jack'},time,[]);
 const a=render(Pictionary,own,'richard'),b=render(Pictionary,guest);
 assert.ok(a.indexOf('YOUR SECRET WORD')>a.indexOf('class="guess-column"'));
 assert.ok(!b.includes(own.secretWord));assert.ok(b.includes('id="drawing-guess"'));
 assert.ok(a.includes('Ctrl/⌘ Z undo'));assert.ok(render(Pictionary,own,'richard',{connected:false}).includes('Reconnecting…'));
});
test('Hangman gives guessers keyboard guidance without exposing the secret to them',()=>{
 const r=makeHangman(ids);r.word='TILE TRIM';
 const guest=render(Hangman,hangmanSnapshot(r,{id:'jack'},[]));
 assert.ok(guest.includes('Type A–Z'));assert.ok(!guest.includes('TILE TRIM'));
 const setter=render(Hangman,hangmanSnapshot(r,{id:'richard'},[]),'richard');
 assert.ok(!setter.includes('Type A–Z'));assert.ok(setter.includes('Remind me of my word'));
});
test('Memory keeps one keyboard entry and all 24 cards through selection, pause and preview',()=>{
 const r=makeMemory(ids);r.loaded=['jack'];
 const ready=render(Memory,memorySnapshot(r,{id:'jack'},time));
 assert.equal((ready.match(/PICTURES READY/g)||[]).length,1);
 assert.equal((ready.match(/LOADING PICTURES/g)||[]).length,3);
 for(const phase of ['ready','preview','playing']){
  r.phase=phase;r.previewAt=time-100;r.deadline=time+8000;
  const html=render(Memory,memorySnapshot(r,{id:'jack'},time));
  assert.equal((html.match(/data-card=/g)||[]).length,24);
  assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
  assert.equal((html.match(/tabindex="-1"/g)||[]).length,23);
 }
});
test('in-game help is concise and specific; the lobby guide explains all four games',()=>{
 for(const game of ['pictionary','hangman','memory','battleships']){
  const html=renderToStaticMarkup(React.createElement(Help,{game}));assert.equal((html.match(/<article/g)||[]).length,1);
  assert.ok(html.includes('Escape'));
 }
 assert.equal((renderToStaticMarkup(React.createElement(Help)).match(/<article/g)||[]).length,4);
});
