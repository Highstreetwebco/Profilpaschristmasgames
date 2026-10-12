import {introPhase,introAnimationTime} from './intro-timeline.js';
import {rigHand,RIG_VIEW} from './lauren-rig.js';
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
export function introScene(realTime,g){
 const elapsed=introAnimationTime(realTime);
 const progress=(a,b)=>clamp((elapsed-a)/(b-a)),eased=(a,b)=>smooth(progress(a,b));
 const phase=introPhase(realTime),floor=g.height-43,landX=Math.max(60,Math.min(g.width-60,g.sourceX));
 const targetX=Math.max(g.size*.37,Math.min(g.width-g.size*.37,g.logoX+28));
 let x=g.sourceX,y=g.sourceY,scale=.48,opacity=elapsed<0?0:1,facing=1;
 if(elapsed<1200){const p=eased(0,1200);x=mix(g.sourceX,landX,p);y=mix(g.sourceY,floor,p)-Math.sin(Math.PI*p)*75;scale=mix(.48,1,p);}
 else if(elapsed<3000){const p=eased(1200,3000),stride=Math.sin((elapsed-1200)/110);x=mix(landX,targetX,p);y=floor-Math.abs(stride)*7*Math.sin(Math.PI*p);scale=1;}
 else if(elapsed<10000){x=targetX;y=floor;scale=1;const tug=eased(3900,4150)*(1-eased(5450,5800));x+=Math.sin((elapsed-3900)/155)*5*tug;y-=Math.sin(elapsed/350)*.7;}
 else if(elapsed<12000){const p=eased(10000,12000);x=mix(targetX,landX,p);y=floor-Math.abs(Math.sin((elapsed-10000)/110))*7*Math.sin(Math.PI*p);scale=1;}
 else if(elapsed<13100){const p=eased(12000,13100);x=mix(landX,g.sourceX,p);y=mix(floor,g.sourceY,p)-Math.sin(Math.PI*p)*90;scale=mix(1,.48,p);opacity=1-progress(12900,13100);}
 else{opacity=0;x=g.sourceX;y=g.sourceY;}
 if(targetX<landX)facing=Math.cos(Math.PI*eased(850,1350)*(1-eased(2700,3200)));
 const travelled=elapsed<10000?Math.abs(x-landX):Math.abs(x-targetX);
 const gaitPhase=travelled/(g.size*.65)*Math.PI*2;
 if(elapsed>=1200&&elapsed<3000)y=floor-Math.abs(Math.sin(gaitPhase))*5*Math.sin(Math.PI*eased(1200,3000));
 if(elapsed>=10000&&elapsed<12000)y=floor-Math.abs(Math.sin(gaitPhase))*5*Math.sin(Math.PI*eased(10000,12000));
 const hand=rigHand(elapsed,gaitPhase),handX=x+(hand[0]-RIG_VIEW.centreX)*g.size/RIG_VIEW.footY*scale*facing,handY=y+(hand[1]-RIG_VIEW.footY)*g.size/RIG_VIEW.footY*scale;
 const drop=progress(5800,6900),toss=progress(6900,7900),shake=phase==='pull'?Math.sin((elapsed-3900)/155)*3.5:0;
 const correct=elapsed>=6900;
 let logoX=g.logoX+Math.sin(drop*Math.PI/2)*32,logoY=g.logoY+drop*drop*(g.height-g.logoY+70),logoAngle=shake+drop*73,logoScale=1,logoOpacity=1-progress(6600,6900);
 if(correct){logoX=mix(handX,g.logoX,toss);logoY=mix(handY,g.logoY,toss)-Math.sin(Math.PI*toss)*70;logoAngle=(1-toss)*-20;logoScale=.36+.64*toss;logoOpacity=1;}
 if(toss===1){logoX=g.logoX;logoY=g.logoY;logoAngle=0;logoScale=1;}
 const ropeFlight=eased(3150,3800),hookX=logoX,hookY=logoY+g.logoHeight*.35;
 const ropeX=mix(handX,hookX,ropeFlight),ropeY=mix(handY,hookY,ropeFlight)-Math.sin(Math.PI*ropeFlight)*80;
 return{phase,motionTime:elapsed,gaitPhase,x,y,scale,opacity,facing,handX,handY,logoX,logoY,logoAngle,logoScale,logoOpacity,correct,ropeX,ropeY,ropeFlight,ropeOpacity:elapsed>=3150&&elapsed<6500?1-progress(6100,6500):0,ropeSag:elapsed<3900?18*(1-ropeFlight):phase==='drop'?60:4+Math.sin(elapsed/95)*3,burst:progress(7900,9400),showBurst:elapsed>=7900&&elapsed<9400};
}
