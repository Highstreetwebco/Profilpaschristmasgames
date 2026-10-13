import {component} from './helpers/render-component.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBattleships,battleshipsSnapshot} from '../lib/battleships.js';
import {roster} from '../lib/room-engine.js';
// Render the real TSX without a browser; catches missing fleet/board branches.
const Battleships=component('app/Battleships.tsx').default;
const players=roster.map(p=>({...p,online:true})),time=1800000000000;
function markup(round,id,overrides={}){return renderToStaticMarkup(React.createElement(Battleships,{round:battleshipsSnapshot(round,{id},time),players,me:id,isHost:id==='jack',connected:true,serverNow:time,clockOffset:0,send:async()=>{},...overrides}));}
function articles(html){return [...html.matchAll(/<article\b[^>]*data-fleet="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];}
test('each captain sees only their own setup board with arrows, rotate and confirmation',()=>{const round=makeBattleships(roster.map(p=>p.id));for(const {id} of roster){const html=markup(round,id),boards=articles(html);assert.equal(boards.length,1);assert.equal(boards[0][1],id);assert.equal((boards[0][2].match(/data-position=/g)||[]).length,64);for(const direction of ['up','down','left','right'])assert.ok(html.includes(`Move Cruiser ${direction}`));assert.ok(html.includes('Rotate'));assert.ok(html.includes('Confirm positions'));assert.ok(!html.includes('Launch battle'));for(const p of roster)assert.ok(html.includes(`${p.name} positioning`));}});
test('all four captains receive four complete battle boards, with exactly one visible fleet each',()=>{const round=makeBattleships(roster.map(p=>p.id));round.phase='battle';round.performer='jack';for(const f of Object.values(round.fleets))f.ready=true;for(const {id} of roster){const html=markup(round,id),boards=articles(html);assert.equal(boards.length,4);assert.deepEqual(boards.map(b=>b[1]),roster.map(p=>p.id));for(const [,owner,body] of boards){assert.equal((body.match(/data-position=/g)||[]).length,64);assert.equal((body.match(/class="ship-detail"/g)||[]).length,owner===id?3:0);const enabled=[...body.matchAll(/<button\b[^>]*data-position[^>]*>/g)].filter(m=>!m[0].includes('disabled'));assert.equal(enabled.length,id==='jack'&&owner!==id?64:0);}assert.ok(!html.includes('Choose a square</button>'));assert.ok(html.includes('naval-missile'));}});
test('solo switches from one private setup board to both human and computer boards',()=>{const round=makeBattleships(['jack']);assert.equal(articles(markup(round,'jack')).length,1);round.phase='battle';round.performer='jack';assert.equal(articles(markup(round,'jack')).length,2);});

test('named turn banners and board highlights agree, without inviting a shot during playback or pause',()=>{const round=makeBattleships(roster.map(p=>p.id));round.phase='battle';round.performer='richard';for(const viewer of roster){const html=markup(round,viewer.id);assert.ok(html.includes(viewer.id==='richard'?'Your turn, Richard!':'Richard’s turn'));const active=articles(html).filter(a=>a[0].includes('captain-turn'));assert.equal(active.length,1);assert.equal(active[0][1],'richard');assert.ok(active[0][2].includes('TAKING SHOT'));}round.performer='jack';round.events=[{id:1,attacker:'richard',target:'jack',position:3,hit:false,sunkShip:null,eliminated:false,startsAt:time+100,impactAt:time+1900,endsAt:time+4300}];round.animationUntil=time+4300;const incoming=markup(round,'jack');assert.ok(incoming.includes('Missile incoming!'));assert.ok(incoming.includes('Richard → Jack'));assert.ok(!incoming.includes('Your turn, Jack!'));assert.equal(articles(incoming).filter(a=>a[0].includes('captain-turn')).length,0);const next=markup(round,'jack',{serverNow:time+4400});assert.ok(next.includes('Your turn, Jack!'));assert.equal(articles(next).filter(a=>a[0].includes('captain-turn'))[0][1],'jack');round.animationUntil=0;round.paused=true;assert.ok(markup(round,'jack').includes('Battle paused'));assert.equal(articles(markup(round,'jack')).filter(a=>a[0].includes('captain-turn')).length,0);round.paused=false;assert.ok(markup(round,'jack',{connected:false}).includes('Reconnecting'));assert.equal(articles(markup(round,'jack',{connected:false})).filter(a=>a[0].includes('captain-turn')).length,0);});

test('battle grids offer one keyboard entry per target, including after A1 is already hit',()=>{
 const round=makeBattleships(roster.map(p=>p.id));round.phase='battle';round.performer='jack';
 round.fleets.stu.shots[0]={by:'richard',hit:false};
 const html=markup(round,'jack');
 for(const [,id,body] of articles(html)){
  const buttons=[...body.matchAll(/<button\b[^>]*data-position[^>]*>/g)].map(m=>m[0]);
  const entries=buttons.filter(b=>b.includes('tabindex="0"')&&!b.includes('disabled'));
  assert.equal(entries.length,id==='jack'?0:1);
  if(id==='stu')assert.ok(entries[0].includes('data-position="1"'));
 }
});
