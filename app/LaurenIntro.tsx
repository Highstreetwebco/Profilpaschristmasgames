'use client';
import {useEffect,useRef,useState} from 'react';
import {introPhase} from '../lib/intro-timeline.js';

type Geometry={width:number;height:number;sourceX:number;sourceY:number;size:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const ease=(t:number)=>t*t*(3-2*t);
const captions:Record<string,string>={ready:'Hold on. Lauren’s spotted something…','jump-out':'“Who signed off that logo?”','run-in':'One very important elf intervention.','throw-rope':'Just a tiny adjustment…',pull:'Come. On. DOWN.',drop:'That’s that sorted.','throw-logo':'Now we’re talking.',celebrate:'Correct logo. Christmas saved.','run-back':'Back in the box. Nothing to see here.','jump-back':'As you were, everyone.',done:'Right then. Let the games begin.'};

export default function LaurenIntro({intro,clockOffset}:{intro:{startsAt:number;endsAt:number};clockOffset:number}){
 const[elapsed,setElapsed]=useState(-1),[geo,setGeo]=useState<Geometry|null>(null),[reduced,setReduced]=useState(false);
 const clock=useRef(clockOffset),caption=useRef<HTMLDivElement>(null);
 clock.current=clockOffset;
 useEffect(()=>{
  const card=document.querySelector<HTMLElement>('[data-player="lauren"] .portrait-ring');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  setReduced(motion.matches);
  if(card&&!motion.matches){const rect=card.getBoundingClientRect();if(rect.top<70||rect.bottom>innerHeight-110)card.scrollIntoView({block:'center',behavior:'instant'});}
  const measure=()=>{const rect=card?.getBoundingClientRect();setGeo({width:innerWidth,height:innerHeight,sourceX:rect?rect.left+rect.width/2:innerWidth*.78,sourceY:rect?rect.top+rect.height*.8:innerHeight*.45,size:innerWidth<600?146:182});};
  measure();caption.current?.focus({preventScroll:true});
  let frame=0;
  const tick=()=>{const ms=Date.now()+clock.current-intro.startsAt;setElapsed(ms);if(card)card.dataset.away=String(!motion.matches&&ms>=0&&ms<13100);frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);
  const motionChange=()=>setReduced(motion.matches);
  window.addEventListener('resize',measure);motion.addEventListener('change',motionChange);
  return()=>{cancelAnimationFrame(frame);if(card)delete card.dataset.away;window.removeEventListener('resize',measure);motion.removeEventListener('change',motionChange);};
 },[intro.startsAt]);
 if(!geo)return null;
 const{width:w,height:h,sourceX:sx,sourceY:sy,size}=geo;
 const phase=introPhase(elapsed),floor=h-46,landX=Math.max(58,Math.min(w-58,sx)),targetX=w/2-(w<600?66:85);
 const logoX=w/2+22,logoY=h-size-87,logoWidth=w<600?218:274,logoHeight=logoWidth*.45;
 const progress=(a:number,b:number)=>clamp((elapsed-a)/(b-a));
 let x=sx,y=sy,scale=.64,pose=4,flip=1,angle=0,opacity=1;
 if(elapsed<1200){const t=ease(progress(0,1200));x=mix(sx,landX,t);y=mix(sy,floor,t)-Math.sin(Math.PI*t)*85;scale=mix(.64,1,t);opacity=elapsed<0?0:1;}
 else if(elapsed<3000){const t=progress(1200,3000);x=mix(landX,targetX,t);y=floor-Math.abs(Math.sin(t*Math.PI*8))*7;scale=1;pose=Math.floor(elapsed/115)%4;flip=targetX<landX?-1:1;}
 else if(elapsed<10000){x=targetX;y=floor;scale=1;pose=elapsed<3900?5:elapsed<6900?6:elapsed<8400?5:7;if(phase==='pull'){x-=Math.sin(progress(3900,5800)*Math.PI*5)*7;angle=-3;}}
 else if(elapsed<12000){const t=progress(10000,12000);x=mix(targetX,landX,t);y=floor-Math.abs(Math.sin(t*Math.PI*8))*7;scale=1;pose=Math.floor(elapsed/115)%4;flip=landX<targetX?-1:1;}
 else if(elapsed<13100){const t=ease(progress(12000,13100));x=mix(landX,sx,t);y=mix(floor,sy,t)-Math.sin(Math.PI*t)*100;scale=mix(1,.64,t);pose=4;opacity=1-clamp((t-.8)/.2);}
 else opacity=0;
 const handX=x+size*.2,handY=y-size*.57;
 const drop=progress(5800,6900),toss=ease(progress(6900,7900));
 const shake=phase==='pull'?Math.sin(elapsed/65)*4:0;
 const oldY=logoY+drop*drop*(size+160),oldRotation=shake+drop*75;
 const newX=mix(targetX+size*.18,logoX,toss),newY=mix(floor-size*.58,logoY,toss)-Math.sin(Math.PI*toss)*105;
 const hookX=logoX-logoWidth*.27,hookY=oldY+logoHeight*.3;
 const ropeProgress=ease(progress(3050,3750));
 const ropeEndX=mix(handX,hookX,ropeProgress),ropeEndY=mix(handY,hookY,ropeProgress)-Math.sin(Math.PI*ropeProgress)*90;
 const showRope=elapsed>=3050&&elapsed<6600;
 const showNew=elapsed>=6900;
 const burst=elapsed>=7900&&elapsed<9500;
 return <div className={`lauren-intro ${reduced?'reduced-intro':''}`} role="dialog" aria-modal="true" aria-label="Lauren’s Christmas logo rescue">
  <div className="intro-scrim"/>
  <div className="intro-caption" ref={caption} tabIndex={-1}><span className="eyebrow">A QUICK WORD FROM LAUREN</span><p role="status" aria-live="polite">{reduced?'Lauren’s swapping in the correct logo. The games are next.':captions[phase]}</p></div>
  <div className="intro-floor" style={{top:floor+1}} aria-hidden="true"/>
  {!reduced&&<svg className="intro-rope" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
   {showRope&&<g opacity={1-progress(6200,6600)}><path d={`M ${handX} ${handY} Q ${mix(handX,ropeEndX,.5)-12} ${mix(handY,ropeEndY,.5)+(phase==='drop'?45:8)} ${ropeEndX} ${ropeEndY}`} fill="none" stroke="#79501e" strokeWidth="6" strokeLinecap="round"/><path d={`M ${handX} ${handY} Q ${mix(handX,ropeEndX,.5)-12} ${mix(handY,ropeEndY,.5)+(phase==='drop'?45:8)} ${ropeEndX} ${ropeEndY}`} fill="none" stroke="#e7c37d" strokeWidth="3" strokeDasharray="4 3" strokeLinecap="round"/><ellipse cx={ropeEndX} cy={ropeEndY-6} rx={elapsed<3750?12:logoWidth*.16} ry={elapsed<3750?17:15} fill="none" stroke="#e7c37d" strokeWidth="3" transform={`rotate(${shake} ${ropeEndX} ${ropeEndY})`}/></g>}
  </svg>}
  {elapsed<6900&&<div className="intro-logo old-logo" style={{width:logoWidth,height:logoHeight,left:logoX,top:reduced?logoY:oldY,transform:`translate(-50%,-50%) rotate(${reduced?0:oldRotation}deg)`,opacity:1-drop}} aria-hidden="true"><img src="/assets/profilpas-logo.png" alt=""/></div>}
  {showNew&&<div className="intro-logo correct-logo" style={{width:logoWidth,height:logoHeight,left:reduced?logoX:newX,top:reduced?logoY:newY,transform:`translate(-50%,-50%) rotate(${reduced?0:(1-toss)*-35}deg) scale(${reduced?1:.2+.8*toss})`}}><img src="/assets/profilpas-correct-logo.png" alt="The correct Profilpas by Mapei logo"/></div>}
  {burst&&!reduced&&<div className="intro-sparkles" aria-hidden="true" style={{left:logoX,top:logoY}}>{Array.from({length:12},(_,i)=><span key={i} style={{transform:`translate(${Math.cos(i*Math.PI/6)*(logoWidth*.4+progress(7900,9500)*85)}px,${Math.sin(i*Math.PI/6)*(logoHeight*.5+progress(7900,9500)*60)}px) rotate(${i*30}deg)`,opacity:1-progress(8400,9500)}}>✦</span>)}</div>}
  {!reduced&&<div className="lauren-actor" aria-hidden="true" style={{width:size*.75,height:size,left:x,top:y,opacity,transform:`translate(-50%,-100%) scale(${scale}) rotate(${angle}deg)`}}><div className="lauren-sprite" style={{backgroundPosition:`${(pose%4)*100/3}% ${pose<4?0:100}%`,transform:`scaleX(${flip})`}}/></div>}
  <p className="intro-progress">{phase==='done'?'Opening the games…':'Lauren will be back in her box in a moment.'}</p>
 </div>;
}
