import test from 'node:test';
import assert from 'node:assert/strict';
import {bonkElf,newElfReaction,elfPose,ELF_SLEEP_MS} from '../lib/elf-reactions.js';
const start=1800000000000;
test('five rapid hits cause a short nap; replays and more clicks cannot extend it',()=>{
 let r=newElfReaction();for(let i=0;i<4;i++)r=bonkElf(r,String(i),i%2?1:-1,start+i*220);
 assert.equal(elfPose(r,start+900).mode,'ouch');assert.equal(r.sleepUntil,0);
 const replay=bonkElf(r,'3',1,start+950);assert.deepEqual(replay,r);
 r=bonkElf(r,'4',1,start+1000);assert.equal(r.sleepUntil,start+1000+ELF_SLEEP_MS);
 assert.equal(elfPose(r,start+1600).nap,1);assert.equal(elfPose(r,start+3000).mode,'sleep');
 assert.deepEqual(bonkElf(r,'ignored',-1,start+2000),r);
 assert.equal(elfPose(r,r.sleepUntil+701).mode,'idle');assert.equal(elfPose(r,r.sleepUntil+701).nap,0);
 const awake=bonkElf(r,'awake',1,r.sleepUntil+800);assert.equal(awake.hits.length,1);assert.equal(awake.sleepUntil,0);
});
test('slow clicks never knock out an elf and retained history remains bounded',()=>{
 let r=newElfReaction();for(let i=0;i<80;i++){r=bonkElf(r,String(i),1,start+i*1600);assert.equal(r.sleepUntil,0);assert.ok(r.hits.length<=3);}
});
test('swing is continuous and bounded, settles, and respects reduced motion',()=>{
 let r=newElfReaction();for(let i=0;i<4;i++)r=bonkElf(r,String(i),1,start+i*150);
 let previous=elfPose(r,start+500);for(let t=501;t<5000;t++){const p=elfPose(r,start+t);assert.ok(Math.abs(p.angle)<=27);assert.ok(Math.abs(p.angle-previous.angle)<.4);assert.ok(p.squash>=.955);previous=p;}
 assert.equal(elfPose(r,start+6000).angle,0);assert.equal(elfPose(r,start+6000).stars,0);
 const reduced=elfPose(r,start+600,true);assert.equal(reduced.angle,0);assert.equal(reduced.squash,1);assert.equal(reduced.orbit,0);assert.equal(reduced.mode,'ouch');
});
