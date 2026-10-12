import test from 'node:test';
import assert from 'node:assert/strict';
import {bonkElf,newElfReaction,elfScene,punchPose,PUNCH_DURATION,PUNCH_IMPACT,HANGMAN_DURATION} from '../lib/elf-reactions.js';
import {puppetRigs,puppetMesh,puppetBones,skinPuppet,puppetWorld,puppetHand} from '../lib/punch-puppet.js';
const start=1800000000000,actor={id:'jack',name:'Jack',avatar:0};
const burst=()=>{let r=newElfReaction();for(let i=0;i<5;i++)r=bonkElf(r,String(i),-1,start+i*170,actor);return r;};
test('rapid clicks queue distinct real punchers, with impacts after arrival and no overlap',()=>{
 let r=newElfReaction();for(let i=0;i<4;i++)r=bonkElf(r,String(i),-1,start+i*170,{id:String(i),name:String(i),avatar:i});
 for(let i=0;i<4;i++){const h=r.hits[i];assert.equal(h.actor.avatar,i);assert.equal(h.at-h.startAt,PUNCH_IMPACT);if(i)assert.ok(h.startAt>=r.hits[i-1].endAt);assert.equal(elfScene(r,h.startAt+20).hit.actor.id,String(i));assert.equal(elfScene(r,h.at+20).impactId,h.id);}
 assert.equal(r.gagUntil,0);assert.deepEqual(bonkElf(r,'3',-1,start+1000,actor),r);
});
test('five rapid punches trigger one full hangman sequence, then restore the exact idle scene',()=>{
 const r=burst();assert.equal(r.gagUntil-r.gagAt,HANGMAN_DURATION);assert.ok(r.gagAt>r.hits.at(-1).endAt);
 assert.deepEqual(bonkElf(r,'ignored',1,r.gagAt+1000,actor),r);
 assert.equal(elfScene(r,r.gagAt+500).mode,'hangman-enter');assert.equal(elfScene(r,r.gagAt+1700).mode,'grab');
 const hanging=elfScene(r,r.gagAt+3700);assert.equal(hanging.mode,'dangle');assert.ok(hanging.rope>0);assert.ok(hanging.target.y<-40);
 assert.equal(elfScene(r,r.gagAt+5700).mode,'reset');
 const reset=elfScene(r,r.gagUntil);assert.equal(reset.mode,'idle');assert.equal(reset.locked,false);assert.equal(reset.hangman,null);assert.equal(reset.attacker,null);assert.equal(reset.rope,0);assert.deepEqual(reset.target,{x:55,y:0,angle:0,squash:1,nap:0});
 const next=bonkElf(r,'new',-1,r.gagUntil+100,actor);assert.equal(next.hits.length,1);assert.equal(next.gagUntil,0);
 // Refresh joins the same point on the shared server clock, not the beginning.
 assert.deepEqual(elfScene(JSON.parse(JSON.stringify(r)),r.gagAt+3700),hanging);
});
test('slow punches never trigger the finale and the history is bounded',()=>{let r=newElfReaction();for(let i=0;i<100;i++){r=bonkElf(r,String(i),-1,start+i*1600,actor);assert.equal(r.gagUntil,0);assert.ok(r.hits.length<=8);}});
test('all rigs keep finite geometry, normalised skinning weights and visible impact hands',()=>{
 for(const id of Object.keys(puppetRigs)){const mesh=puppetMesh(id,14,20);for(const v of mesh.vertices)assert.ok(Math.abs(v.weights.reduce((s,p)=>s+p[1],0)-1)<1e-8);
  const side=puppetRigs[id].side;for(let t=0;t<=PUNCH_DURATION;t+=40){const pose=punchPose(t,false,side),bones=puppetBones(id,pose);for(const v of mesh.vertices){const p=puppetWorld(id,skinPuppet(v,bones),pose);assert.ok(p.every(Number.isFinite));}}
  const hand=puppetHand(id,punchPose(PUNCH_IMPACT,false,side));assert.ok(hand[0]>150&&hand[0]<355,`${id} hand x ${hand[0]}`);assert.ok(hand[1]>75&&hand[1]<230,`${id} hand y ${hand[1]}`);
 }
});
test('reduced motion preserves identity and sequence while removing swinging and walking',()=>{const r=burst(),s=elfScene(r,r.gagAt+3700,true);assert.equal(s.target.y,0);assert.equal(s.target.angle,0);assert.equal(s.hangman.gait,0);assert.equal(s.hangman.lean,0);assert.equal(s.mode,'dangle');assert.equal(elfScene(r,r.hits[0].at,true).hit.actor.id,'jack');});

test('the glove and hand keep their shape throughout the punch, without stretching into the body',()=>{for(const[id,c]of Object.entries(puppetRigs)){const mesh=puppetMesh(id),nearest=(x,y)=>mesh.vertices.reduce((best,v)=>Math.hypot(v.x-x,v.y-y)<Math.hypot(best.x-x,best.y-y)?v:best),a=nearest(c.hand[0]-80,c.hand[1]-80),b=nearest(c.hand[0]+70,c.hand[1]+80),rest=Math.hypot(a.x-b.x,a.y-b.y);for(const time of [0,400,590,750,1000]){const bones=puppetBones(id,punchPose(time,false,c.side)),p=skinPuppet(a,bones),q=skinPuppet(b,bones);assert.ok(Math.abs(Math.hypot(p[0]-q[0],p[1]-q[1])-rest)<.01,`${id} glove changed shape`);}}});
