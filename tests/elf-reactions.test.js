import test from 'node:test';
import assert from 'node:assert/strict';
import {bonkElf,newElfReaction,elfScene,punchPose,PUNCH_DURATION,PUNCH_IMPACT,RETALIATION_DURATION} from '../lib/elf-reactions.js';
import {puppetIds,puppetRigs,puppetMesh,puppetBones,skinPuppet,puppetWorld,puppetHand} from '../lib/punch-puppet.js';
const start=1800000000000,actor={id:'jack',name:'Jack',avatar:0};
const burst=()=>{let r=newElfReaction();for(let i=0;i<5;i++)r=bonkElf(r,String(i),-1,start+i*170,actor);return r;};
test('rapid clicks queue distinct real punchers, with impacts after arrival and no overlap',()=>{
 let r=newElfReaction();for(let i=0;i<4;i++)r=bonkElf(r,String(i),-1,start+i*170,{id:String(i),name:String(i),avatar:i});
 for(let i=0;i<4;i++){const h=r.hits[i];assert.equal(h.actor.avatar,i);assert.equal(h.at-h.startAt,PUNCH_IMPACT);if(i)assert.ok(h.startAt>=r.hits[i-1].endAt);assert.equal(elfScene(r,h.startAt+20).hit.actor.id,String(i));assert.equal(elfScene(r,h.at+20).impactId,h.id);}
 assert.equal(r.gagUntil,0);assert.deepEqual(bonkElf(r,'3',-1,start+1000,actor),r);
});
test('five rapid punches swap the victim with the authenticated fifth puncher, then reset',()=>{
 let r=newElfReaction();for(let i=0;i<5;i++)r=bonkElf(r,String(i),-1,start+i*170,{id:i===4?'stu':'jack',name:i===4?'Stu':'Jack',avatar:i===4?1:0});
 assert.equal(r.gagUntil-r.gagAt,RETALIATION_DURATION);assert.ok(r.gagAt>r.hits.at(-1).endAt);assert.equal(r.culprit.id,'stu');
 assert.deepEqual(bonkElf(r,'ignored',1,r.gagAt+1000,actor),r);
 const scene=t=>elfScene(r,r.gagAt+t,false,3);
 const line=scene(500);assert.equal(line.mode,'retort');assert.ok(line.quote>0);assert.equal(line.culprit.id,'stu');
 assert.equal(scene(2700).mode,'grab');assert.equal(scene(4000).mode,'throw');
 const hanging=scene(5500);assert.equal(hanging.mode,'dangle');assert.equal(hanging.rope,1);assert.equal(hanging.occupant.actor.id,'stu');assert.equal(hanging.occupant.y,-37);assert.equal(hanging.target.opacity,0);assert.equal(hanging.retaliator.opacity,1);
 assert.equal(scene(7700).mode,'reset');
 const reset=elfScene(r,r.gagUntil);assert.equal(reset.mode,'idle');assert.equal(reset.locked,false);assert.equal(reset.retaliator,null);assert.equal(reset.occupant,null);assert.equal(reset.attacker,null);assert.equal(reset.rope,0);assert.deepEqual(reset.target,{x:55,y:0,angle:0,squash:1,nap:0,opacity:1});
 const next=bonkElf(r,'new',-1,r.gagUntil+100,actor);assert.equal(next.hits.length,1);assert.equal(next.gagUntil,0);assert.equal(next.culprit,null);
 assert.deepEqual(elfScene(JSON.parse(JSON.stringify(r)),r.gagAt+5500,false,3),hanging);
});
test('the culprit stays on stage between the final punch and retaliation',()=>{const r=burst();for(const t of [r.hits.at(-1).endAt-1,r.hits.at(-1).endAt+1,r.gagAt-1,r.gagAt]){const s=elfScene(r,t);assert.equal(s.attackerActor.id,'jack');assert.equal(s.attacker.opacity,1);assert.ok(Math.abs(s.attacker.x-132)<1);}});
test('all avatar pairings keep the grab attached, flight continuous and final roles correct, including solo',()=>{
 for(let victim=0;victim<4;victim++)for(let culprit=0;culprit<4;culprit++){
  let r=newElfReaction();for(let i=0;i<5;i++)r=bonkElf(r,String(i),1,start+i*170,{id:puppetIds[culprit],name:puppetIds[culprit],avatar:culprit});
  const id=puppetIds[victim],side=puppetRigs[id].side;
  for(let t=2950;t<3650;t+=50){const s=elfScene(r,r.gagAt+t,false,victim),hand=puppetHand(id,s.retaliator);assert.ok(Math.abs(s.occupant.x+205-side*25-hand[0])<.001);assert.ok(Math.abs(s.occupant.y+163-hand[1])<.001);}
  let previous=null;for(let t=2950;t<=4550;t+=10){const s=elfScene(r,r.gagAt+t,false,victim),o=s.occupant;assert.equal(o.actor.avatar,culprit);assert.ok([o.x,o.y,o.angle,s.retaliator.x].every(Number.isFinite));if(previous)assert.ok(Math.hypot(o.x-previous.x,o.y-previous.y)<6);previous=o;}
  assert.equal(elfScene(r,r.gagAt+5500,false,victim).occupant.actor.avatar,culprit);
 }
});
test('legacy cosmetic sequences reset safely without changing game state',()=>{const legacy={version:2,hits:[],gagAt:start,gagUntil:start+6000};assert.equal(elfScene(legacy,start+100).mode,'idle');assert.equal(bonkElf(legacy,'new',1,start+100,actor).version,3);});
test('slow punches never trigger the finale and the history is bounded',()=>{let r=newElfReaction();for(let i=0;i<100;i++){r=bonkElf(r,String(i),-1,start+i*1600,actor);assert.equal(r.gagUntil,0);assert.ok(r.hits.length<=8);}});
test('all rigs keep finite geometry, normalised skinning weights and visible impact hands',()=>{
 for(const id of Object.keys(puppetRigs)){const mesh=puppetMesh(id,14,20);for(const v of mesh.vertices)assert.ok(Math.abs(v.weights.reduce((s,p)=>s+p[1],0)-1)<1e-8);
  const side=puppetRigs[id].side;for(let t=0;t<=PUNCH_DURATION;t+=40){const pose=punchPose(t,false,side),bones=puppetBones(id,pose);for(const v of mesh.vertices){const p=puppetWorld(id,skinPuppet(v,bones),pose);assert.ok(p.every(Number.isFinite));}}
  const hand=puppetHand(id,punchPose(PUNCH_IMPACT,false,side));assert.ok(hand[0]>150&&hand[0]<355,`${id} hand x ${hand[0]}`);assert.ok(hand[1]>75&&hand[1]<230,`${id} hand y ${hand[1]}`);
 }
});
test('reduced motion preserves the culprit and swap without swinging or walking',()=>{const r=burst(),s=elfScene(r,r.gagAt+5500,true,3);assert.equal(s.target.y,0);assert.equal(s.target.angle,0);assert.equal(s.retaliator.gait,0);assert.equal(s.retaliator.lean,0);assert.equal(s.occupant.angle,0);assert.equal(s.occupant.y,0);assert.equal(s.occupant.actor.id,'jack');assert.equal(s.mode,'dangle');assert.equal(elfScene(r,r.hits[0].at,true).hit.actor.id,'jack');});

test('the glove and hand keep their shape throughout the punch, without stretching into the body',()=>{for(const[id,c]of Object.entries(puppetRigs)){const mesh=puppetMesh(id),nearest=(x,y)=>mesh.vertices.reduce((best,v)=>Math.hypot(v.x-x,v.y-y)<Math.hypot(best.x-x,best.y-y)?v:best),a=nearest(c.hand[0]-80,c.hand[1]-80),b=nearest(c.hand[0]+70,c.hand[1]+80),rest=Math.hypot(a.x-b.x,a.y-b.y);for(const time of [0,400,590,750,1000]){const bones=puppetBones(id,punchPose(time,false,c.side)),p=skinPuppet(a,bones),q=skinPuppet(b,bones);assert.ok(Math.abs(Math.hypot(p[0]-q[0],p[1]-q[1])-rest)<.01,`${id} glove changed shape`);}}});
