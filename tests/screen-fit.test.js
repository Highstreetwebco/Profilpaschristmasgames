import test from 'node:test';
import assert from 'node:assert/strict';
import {stageScale} from '../lib/stage-fit.js';
test('the full measured stage, including its controls, fits laptop, tablet, phone, landscape and keyboard-reduced windows',()=>{
 const screens=[[1366,768],[1440,900],[1920,1080],[1024,768],[768,1024],[390,844],[360,640],[320,568],[844,390],[390,430]];
 const contents=[[1100,640],[1100,720],[700,850],[368,600],[298,690]];
 for(const [vw,vh] of screens)for(const [cw,ch] of contents){const availableWidth=vw-24,availableHeight=vh-160,scale=stageScale(availableWidth,availableHeight,cw,ch);assert.ok(scale>0&&scale<=1);assert.ok(cw*scale<=availableWidth+1e-8);assert.ok(ch*scale<=availableHeight+1e-8);}
 assert.equal(stageScale(1200,800,1100,650),1);
});
