// Local synthesised cartoon effects; voices are the device's generic English
// speech voices, with captions provided independently of audio support.
export function createBattleAudio(){
 let context:AudioContext|null=null,enabled=true,unlocked=false,disposed=false;
 const active=new Set<AudioScheduledSourceNode>();
 function stop(){for(const node of active){try{node.stop();}catch{}}active.clear();if('speechSynthesis' in window)window.speechSynthesis.cancel();}
 function tone(from:number,to:number,duration:number,volume:number,delay=0,type:OscillatorType='sine'){
  if(!context)return;const osc=context.createOscillator(),gain=context.createGain(),at=context.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+duration);gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.001,at+duration);osc.connect(gain).connect(context.destination);active.add(osc);osc.onended=()=>{active.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.02);
 }
 function noise(duration:number,volume:number,low:boolean){
  if(!context)return;const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type=low?'lowpass':'bandpass';filter.frequency.value=low?850:1600;filter.Q.value=low?.6:1.5;gain.gain.setValueAtTime(volume,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);source.connect(filter).connect(gain).connect(context.destination);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();
 }
 return {
  unlock(){if(disposed||!enabled)return false;try{context??=new AudioContext();void context.resume();if(!unlocked&&'speechSynthesis' in window){const prime=new SpeechSynthesisUtterance('');window.speechSynthesis.speak(prime);}unlocked=true;return true;}catch{return false;}},
  setEnabled(value:boolean){enabled=value;if(!value)stop();},
  play(kind:string,line?:{text:string;speaker:string}){if(disposed||!enabled||!unlocked)return;
   if(kind==='launch'){noise(.9,.1,false);tone(200,1400,.65,.055,0,'sawtooth');tone(1400,210,.9,.06,.65);}
   else if(kind==='explosion'){noise(1.1,.3,true);tone(110,24,.85,.18,0,'triangle');tone(65,22,1,.1,.08);}
   else if(kind==='splash'){noise(.55,.14,false);tone(530,110,.28,.065);}
   else if(kind==='voice'&&line&&'speechSynthesis' in window){const voice=new SpeechSynthesisUtterance(line.text),voices=window.speechSynthesis.getVoices().filter(v=>/^en[-_]GB$/i.test(v.lang));const profile:{[key:string]:number}={jack:0,stu:1,lauren:2,richard:3,'practice-navy':3};const index=profile[line.speaker]||0;if(voices.length)voice.voice=voices[index%voices.length];voice.lang='en-GB';voice.rate=1.17;voice.pitch=[1.05,.85,1.2,.92][index];voice.volume=.8;window.speechSynthesis.cancel();window.speechSynthesis.speak(voice);}
  },
  dispose(){disposed=true;stop();void context?.close();}
 };
}
