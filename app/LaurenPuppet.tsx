'use client';
import {useEffect,useRef} from 'react';
import {createLaurenRenderer} from '../lib/lauren-renderer';

export default function LaurenPuppet({elapsed,gaitPhase}:{elapsed:number;gaitPhase:number}){
 const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<ReturnType<typeof createLaurenRenderer>|null>(null),time=useRef({elapsed,gaitPhase});time.current={elapsed,gaitPhase};
 useEffect(()=>{
  const node=canvas.current;if(!node)return;
  const setup=()=>{renderer.current?.dispose();renderer.current=createLaurenRenderer(node);renderer.current.draw(time.current.elapsed,time.current.gaitPhase);};
  const lost=(event:Event)=>event.preventDefault();setup();node.addEventListener('webglcontextlost',lost);node.addEventListener('webglcontextrestored',setup);
  return()=>{renderer.current?.dispose();renderer.current=null;node.removeEventListener('webglcontextlost',lost);node.removeEventListener('webglcontextrestored',setup);};
 },[]);
 useEffect(()=>{renderer.current?.draw(elapsed,gaitPhase);},[elapsed,gaitPhase]);
 return <canvas ref={canvas} width={608} height={600} className="lauren-puppet" aria-hidden="true"/>;
}
