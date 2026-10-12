import test from 'node:test';
import assert from 'node:assert/strict';
import {createRigMesh,rigMatrices,skinVertex,rigPose} from '../lib/lauren-rig.js';
import {introScene} from '../lib/intro-scene.js';
import {INTRO_DURATION,introAnimationTime} from '../lib/intro-timeline.js';
const desktop={width:1506,height:806,sourceX:1320,sourceY:600,size:190,logoX:114,logoY:55,logoWidth:159,logoHeight:66};
const mobile={width:390,height:844,sourceX:290,sourceY:520,size:157,logoX:85,logoY:42,logoWidth:130,logoHeight:54};
test('logo departs from and returns to the measured header position on desktop and mobile',()=>{
 for(const g of[desktop,mobile]){
  for(const ms of[-100,0,4000]){const s=introScene(ms,g);assert.equal(s.logoX,g.logoX);assert.equal(s.logoY,g.logoY);assert.equal(s.correct,false);}
  assert.ok(introScene(8500,g).logoY>g.logoY+100);
  for(const ms of[9900,11500,INTRO_DURATION]){const s=introScene(ms,g);assert.equal(s.logoX,g.logoX);assert.equal(s.logoY,g.logoY);assert.equal(s.logoScale,1);assert.equal(s.correct,true);}
  const done=introScene(INTRO_DURATION,g);assert.equal(done.opacity,0);assert.equal(done.x,g.sourceX);assert.equal(done.y,g.sourceY);
 }
});
test('joint motion interpolates continuously without pose-image switches',()=>{
 for(const boundary of[250,650,1200,2800,3070,3480,3850,5650,6150,6750,7040,7450,8270,9200,9900,12000,12400,13000]){
  const a=rigPose(boundary-.1,1),b=rigPose(boundary+.1,1);
  for(let j=0;j<a.length;j++)assert.ok(Math.abs(a[j]-b[j])<.2,`joint ${j} jumps at ${boundary}`);
 }
 const a=rigPose(1800,0),b=rigPose(1800,Math.PI/2);assert.notEqual(a[6],b[6]);assert.notEqual(a[4],b[4]);
});
test('skin weights sum to one and geometry remains finite for the whole scene',()=>{
 const mesh=createRigMesh(24,36);
 for(const v of mesh.vertices)assert.ok(Math.abs(v.weights.reduce((s,[,w])=>s+w,0)-1)<1e-9);
 for(let t=0;t<=INTRO_DURATION;t+=100){const s=introScene(t,desktop),bones=rigMatrices(s.motionTime,s.gaitPhase);for(const v of mesh.vertices){const p=skinVertex(v,bones);assert.ok(p.every(Number.isFinite));}}
});
test('journey timing is continuous and the intro always finishes on schedule',()=>{
 for(const t of[1200,5000,12000,16000])assert.ok(Math.abs(introAnimationTime(t-.1)-introAnimationTime(t+.1))<.21);
 assert.equal(introAnimationTime(INTRO_DURATION),14000);
});
