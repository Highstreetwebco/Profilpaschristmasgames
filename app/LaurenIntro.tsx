'use client';
import {useEffect,useRef,useState} from 'react';
import {introScene} from '../lib/intro-scene.js';
import {RIG_VIEW} from '../lib/lauren-rig.js';
import LaurenPuppet from './LaurenPuppet';

type Geometry={width:number;height:number;sourceX:number;sourceY:number;size:number;logoX:number;logoY:number;logoWidth:number;logoHeight:number};
const captions:Record<string,string>={ready:'Hold on. Lauren’s spotted something…','jump-out':'“Who signed off that logo?”','run-in':'One very important elf intervention.','throw-rope':'Just a tiny adjustment…',pull:'Come. On. DOWN.',drop:'That’s that sorted.','throw-logo':'Now we’re talking.',celebrate:'Correct logo. Christmas saved.','run-back':'Back in the box. Nothing to see here.','jump-back':'As you were, everyone.',done:'Right then. Let the games begin.'};

export default function LaurenIntro({intro,clockOffset}:{intro:{startsAt:number;endsAt:number};clockOffset:number}){
 const[elapsed,setElapsed]=useState(-1),[geo,setGeo]=useState<Geometry|null>(null),[reduced,setReduced]=useState(false);
 const clock=useRef(clockOffset),caption=useRef<HTMLDivElement>(null);clock.current=clockOffset;
 useEffect(()=>{
  const card=document.querySelector<HTMLElement>('[data-player="lauren"] .portrait-ring');
  const brand=document.querySelector<HTMLElement>('[data-brand-logo]');
  if(!brand)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');setReduced(motion.matches);
  const originalStyle=brand.getAttribute('style'),rect=brand.getBoundingClientRect();
  // Pin the actual header mark before mobile scrolling. No duplicate logo.
  const logo={x:Math.max(10,rect.left),y:Math.max(15,rect.top),width:rect.width,height:rect.height};
  Object.assign(brand.style,{position:'fixed',left:`${logo.x}px`,top:`${logo.y}px`,width:`${logo.width}px`,height:`${logo.height}px`});
  if(card&&!motion.matches){const r=card.getBoundingClientRect();if(r.top<80||r.bottom>innerHeight-120)card.scrollIntoView({block:'center',behavior:'instant'});}
  const measure=()=>{
   const r=card?.getBoundingClientRect(),width=innerWidth,height=innerHeight;
   return{width,height,sourceX:r?r.left+r.width/2:width*.8,sourceY:r?r.top+r.height*.85:height*.5,size:width<600?157:190,logoX:logo.x+logo.width/2,logoY:logo.y+logo.height/2,logoWidth:logo.width,logoHeight:logo.height};
  };
  let geometry=measure();setGeo(geometry);
  const resize=()=>{geometry=measure();setGeo(geometry);};
  let frame=0,lastMs=-Infinity;
  const tick=()=>{
   const ms=Math.max(lastMs,Date.now()+clock.current-intro.startsAt);lastMs=ms;
   setElapsed(ms);const s=introScene(ms,geometry);
   brand.dataset.rescueLogo=s.correct?'correct':'old';
   brand.style.transform=motion.matches?'none':`translate3d(${s.logoX-geometry.logoX}px,${s.logoY-geometry.logoY}px,0) rotate(${s.logoAngle}deg) scale(${s.logoScale})`;
   brand.style.opacity=String(motion.matches?1:s.logoOpacity);
   if(card)card.dataset.away=String(!motion.matches&&s.motionTime>=0&&s.motionTime<13100);
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  const motionChange=()=>setReduced(motion.matches),preventScroll=(event:WheelEvent)=>event.preventDefault();
  window.addEventListener('resize',resize);window.addEventListener('wheel',preventScroll,{passive:false});motion.addEventListener('change',motionChange);
  return()=>{cancelAnimationFrame(frame);if(card)delete card.dataset.away;if(originalStyle===null)brand.removeAttribute('style');else brand.setAttribute('style',originalStyle);delete brand.dataset.rescueLogo;window.removeEventListener('resize',resize);window.removeEventListener('wheel',preventScroll);motion.removeEventListener('change',motionChange);};
 },[intro.startsAt]);
 useEffect(()=>{if(geo)caption.current?.focus({preventScroll:true});},[!!geo]);
 if(!geo)return null;
 const s=introScene(elapsed,geo),w=geo.width,h=geo.height;
 return <div className={`lauren-intro ${reduced?'reduced-intro':''}`} role="dialog" aria-modal="true" aria-label="Lauren’s Christmas logo rescue">
  <div className="intro-scrim"/>
  <div className="intro-caption" ref={caption} tabIndex={-1}><span className="eyebrow">A QUICK WORD FROM LAUREN</span><p role="status" aria-live="polite">{reduced?'Lauren’s swapping the header logo. The games are next.':captions[s.phase]}</p></div>
  {!reduced&&<svg className="intro-rope" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
   {s.ropeOpacity>0&&<g opacity={s.ropeOpacity}>
    <path d={`M ${s.handX} ${s.handY} Q ${(s.handX+s.ropeX)/2+s.ropeSag} ${(s.handY+s.ropeY)/2} ${s.ropeX} ${s.ropeY}`} fill="none" stroke="#775023" strokeWidth="5" strokeLinecap="round"/>
    <path d={`M ${s.handX} ${s.handY} Q ${(s.handX+s.ropeX)/2+s.ropeSag} ${(s.handY+s.ropeY)/2} ${s.ropeX} ${s.ropeY}`} fill="none" stroke="#f1d397" strokeWidth="2.7" strokeDasharray="5 3" strokeLinecap="round"/>
    <ellipse cx={s.ropeX} cy={s.ropeY-6} rx={10+s.ropeFlight*geo.logoWidth*.26} ry={12+s.ropeFlight*geo.logoHeight*.34} fill="none" stroke="#f1d397" strokeWidth="2.7" transform={`rotate(${s.logoAngle} ${s.ropeX} ${s.ropeY})`}/>
   </g>}
  </svg>}
  {s.showBurst&&!reduced&&<div className="intro-sparkles" aria-hidden="true" style={{left:geo.logoX,top:geo.logoY}}>{Array.from({length:10},(_,i)=><span key={i} style={{transform:`translate(${Math.cos(i*Math.PI/5)*(geo.logoWidth*.35+s.burst*50)}px,${Math.sin(i*Math.PI/5)*(geo.logoHeight*.35+s.burst*32)}px)`,opacity:1-s.burst}}>✦</span>)}</div>}
  {!reduced&&<div className="lauren-actor" aria-hidden="true" style={{width:geo.size*RIG_VIEW.width/RIG_VIEW.footY,height:geo.size*RIG_VIEW.height/RIG_VIEW.footY,left:s.x,top:s.y,opacity:s.opacity,transform:`translate(-50%,-${(RIG_VIEW.footY-RIG_VIEW.y)/RIG_VIEW.height*100}%) scale(${s.scale})`}}><div className="lauren-turn" style={{transform:`scaleX(${s.facing})`}}><LaurenPuppet elapsed={s.motionTime} gaitPhase={s.gaitPhase}/></div></div>}
  <p className="intro-progress">{s.phase==='done'?'Opening the games…':'A small correction. Then back to the Christmas chaos.'}</p>
 </div>;
}
