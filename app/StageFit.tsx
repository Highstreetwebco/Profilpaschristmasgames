'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {stageScale} from '../lib/stage-fit.js';
export default function StageFit({children,inert}:{children:ReactNode;inert?:boolean}){
 const frame=useRef<HTMLElement>(null),content=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const host=frame.current,inner=content.current;if(!host||!inner)return;
  let raf=0;
  const fit=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
   const w=host.clientWidth,h=host.clientHeight;
   const nextHeight=`${Math.floor(h)}px`;if(host.style.getPropertyValue('--stage-height')!==nextHeight)host.style.setProperty('--stage-height',nextHeight);
   const scale=stageScale(Math.max(1,w-4),Math.max(1,h-4),Math.max(inner.offsetWidth,inner.scrollWidth),Math.max(inner.offsetHeight,inner.scrollHeight));
   if(inner.style.getPropertyValue('--stage-scale')!==String(scale))inner.style.setProperty('--stage-scale',String(scale));inner.dataset.scale=scale.toFixed(3);
  });};
  const observer=new ResizeObserver(fit);observer.observe(host);observer.observe(inner);
  const changes=new MutationObserver(fit);changes.observe(inner,{childList:true,subtree:true,characterData:true});
  const viewport=()=>{const height=window.visualViewport?.height||window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);fit();};
  viewport();document.fonts?.ready.then(fit);window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();changes.disconnect();window.removeEventListener('resize',viewport);window.visualViewport?.removeEventListener('resize',viewport);};
 },[]);
 return <main ref={frame} className="game-main screen-frame" inert={inert||undefined}><div ref={content} className="screen-content">{children}</div></main>;
}
