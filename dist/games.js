export const characters = [
  {name:'The Trophy Hunter',tag:'Competitive? Me? Never.'},
  {name:'The Detail Elf',tag:'Just one more question…'},
  {name:'The Festive Spark',tag:'Bringing the Christmas energy.'},
  {name:'The Big Claus',tag:'Has a very important list.'},
  {name:'The Merry Maker',tag:'Here for the mince pies.'},
  {name:'The Cool Customer',tag:'Unbothered. Until the quiz.'}
];
export const games = [
  {id:'quiz',name:'The Big Festive Quiz',short:'Festive Quiz',label:'THE CLASSIC',icon:'🎄',minutes:'8–10 min',meta:'10 questions · 1 point each',description:'Christmas knowledge, festive films and a little friendly “I knew that!”',seconds:30,maxPoints:1,instructions:'Read the question. Everyone gives their answer aloud or in Teams chat before the host reveals it. Award 1 point to each correct player or team.',cards:[
    {q:'In Home Alone, what is the first name of the boy left behind?',options:['Kevin','Charlie','Max','Harry'],answer:0,note:'Kevin McCallister is the boy left home alone.'},
    {q:'Which reindeer has a famously glowing red nose?',options:['Dasher','Rudolph','Comet','Blitzen'],answer:1,note:'Rudolph — a very useful member of the night shift.'},
    {q:'What is traditionally hidden inside a Christmas pudding in the UK?',options:['A key','A button','A coin','A bell'],answer:2,note:'A coin, traditionally a silver sixpence, for good luck.'},
    {q:'In The Twelve Days of Christmas, how many gold rings are there?',options:['Three','Four','Five','Six'],answer:2,note:'Five gold rings! Singing the answer is entirely optional.'},
    {q:'Which plant is traditionally associated with a Christmas kiss?',options:['Holly','Ivy','Mistletoe','Poinsettia'],answer:2,note:'Mistletoe. No practical demonstration required.'},
    {q:'What is the name of the Grinch’s dog?',options:['Max','Buddy','Toby','Fred'],answer:0,note:'Max is the long-suffering dog helping the Grinch.'},
    {q:'Which country is widely associated with the origin of the decorated Christmas tree tradition?',options:['Spain','Germany','Canada','Italy'],answer:1,note:'Germany is associated with the decorated Christmas tree tradition.'},
    {q:'What date is Boxing Day?',options:['24 December','25 December','26 December','27 December'],answer:2,note:'26 December. An excellent day for leftovers.'},
    {q:'In the film Elf, what is the name of Will Ferrell’s character?',options:['Billy','Benny','Bobby','Buddy'],answer:3,note:'Buddy the elf — enthusiastic is an understatement.'},
    {q:'Which of these is NOT one of the gifts in The Twelve Days of Christmas?',options:['Lords a-leaping','Ladies dancing','Bells a-ringing','Swans a-swimming'],answer:2,note:'Bells a-ringing is not one of the twelve gifts.'}
  ]},
  {id:'emoji',name:'Crack the Christmas Code',short:'Emoji Cracker',label:'BRAIN TEASER',icon:'🎁🔍',minutes:'6–8 min',meta:'8 clues · 1 point each',description:'A few emojis. One festive answer. Much harder after a mince pie.',seconds:30,maxPoints:1,instructions:'Guess the Christmas film or song from the emojis. Lock in answers aloud or in Teams chat, then reveal. Accept equivalent titles. Award 1 point for each correct answer.',cards:[
    {q:'🏠 👦 😱',category:'Film',answer:'Home Alone',note:'A house, a boy and a very surprised face.'},
    {q:'🚂 ❄️ 🎅',category:'Film',answer:'The Polar Express',note:'A magical train journey to the North Pole.'},
    {q:'🔔 🔔 🔔',category:'Song',answer:'Jingle Bells',note:'Bells, bells and more bells.'},
    {q:'🤫 🌙 ✨',category:'Song',answer:'Silent Night',note:'A quiet, starry night.'},
    {q:'🦌 🔴 👃',category:'Song',answer:'Rudolph the Red-Nosed Reindeer',note:'A reindeer with a very distinctive nose.'},
    {q:'☃️ 🎩 🥕',category:'Song',answer:'Frosty the Snowman',note:'A snowman brought to life with a magical hat.'},
    {q:'💚 😠 🎄',category:'Film',answer:'The Grinch',note:'Accept How the Grinch Stole Christmas.'},
    {q:'🎅 ➡️ 🏙️',category:'Song',answer:'Santa Claus Is Coming to Town',note:'He’s on his way. Hopefully the traffic is kind.'}
  ]},
  {id:'list',name:'The 30-Second Dash',short:'30-Second Dash',label:'QUICK THINKING',icon:'⏱️',minutes:'5–8 min',meta:'8 challenges · up to 3 points',description:'Beat the clock. Name five things. Try not to say “erm” for 29 seconds.',seconds:30,maxPoints:3,instructions:'Choose one player or team for each card and rotate fairly. Start the 30-second timer. Five valid, different answers = 3 points; three or four = 2; one or two = 1. The host judges.',cards:[
    {q:'Name five things you would find on a Christmas dinner table.'},
    {q:'Name five Christmas films.'},
    {q:'Name five things you might decorate a Christmas tree with.'},
    {q:'Name five words beginning with “S” that feel Christmassy.'},
    {q:'Name five things you would pack for a trip to the North Pole.'},
    {q:'Name five Christmas songs or carols.'},
    {q:'Name five excuses an elf might give for being late to work.'},
    {q:'Name five things you definitely should NOT put in a Christmas cracker.'}
  ]},
  {id:'pitch',name:'Sell It to Santa',short:'Sell It to Santa',label:'PROFILPAS SPECIAL',icon:'🎅',minutes:'8–12 min',meta:'8 pitches · up to 3 points',description:'Your most ridiculous sales pitch. Santa’s toughest objections. Go.',seconds:45,maxPoints:3,instructions:'Choose one player or team for each card and rotate fairly. Give them 45 seconds to make their pitch. Award 1 point for completing it, 1 for creativity and 1 for making the room laugh. Maximum 3.',cards:[
    {q:'Sell Santa a gold tile trim for his sleigh.',note:'His objection: “The reindeer say it’s a bit much.”'},
    {q:'Pitch a pedestal system for the North Pole’s new rooftop terrace.',note:'His objection: “The elves want a hot tub up there.”'},
    {q:'Persuade an elf that matching colour trims are the perfect Christmas gift.',note:'Their objection: “I asked for a games console.”'},
    {q:'Sell a magnetic access panel to Santa for his secret mince-pie cupboard.',note:'His objection: “Mrs Claus always finds the snacks.”'},
    {q:'Pitch new skirting boards for the gingerbread house.',note:'The customer keeps eating your samples.'},
    {q:'Sell stair nosings to a reindeer who refuses to use stairs.',note:'Their objection: “I can literally fly.”'},
    {q:'Convince Santa to put tile trims in every stocking.',note:'His objection: “They’re rather long, aren’t they?”'},
    {q:'Pitch a complete Profilpas makeover for Santa’s workshop.',note:'You must include the words “mince pie”, “sleigh” and “absolutely essential”.'}
  ]}
];
export const STORAGE_KEY='profilpas-christmas-2026-v1';
export function blankState(){return {version:1,players:[],ledger:[],progress:{}}}
export function pointsFor(state,id){return state.ledger.filter(e=>e.playerId===id).reduce((n,e)=>n+e.points,0)}
export function leaderboard(state){return state.players.map(p=>({...p,points:pointsFor(state,p.id)})).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name))}
export function award(state,{playerId,points,source,key=null}){
  if(!state.players.some(p=>p.id===playerId))throw new Error('Choose a player first.');
  if(!Number.isInteger(points)||points===0||Math.abs(points)>100)throw new Error('Use whole points between -100 and 100.');
  if(key&&state.ledger.some(e=>e.key===key&&e.playerId===playerId))throw new Error('Points already awarded for this card.');
  const entry={id:globalThis.crypto.randomUUID(),playerId,points,source,key,at:new Date().toISOString()};state.ledger.push(entry);return entry;
}
export function validateBackup(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.players)||raw.players.length>60||!Array.isArray(raw.ledger)||raw.ledger.length>20000)throw new Error('This is not a valid Christmas Games backup.');
  const players=raw.players.map(p=>{
    if(!p||typeof p.id!=='string'||p.id.length>100||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!Number.isInteger(p.avatar)||p.avatar<0||p.avatar>5)throw new Error('Invalid player in backup.');
    const photo=typeof p.photo==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.photo)&&p.photo.length<850000?p.photo:null;
    return{id:p.id,name:p.name.trim(),nickname:typeof p.nickname==='string'?p.nickname.slice(0,60):'',avatar:p.avatar,photo};
  });
  const ids=new Set(players.map(p=>p.id));if(ids.size!==players.length)throw new Error('Backup contains duplicate players.');
  const ledger=raw.ledger.map(e=>{
    if(!e||!ids.has(e.playerId)||!Number.isInteger(e.points)||e.points===0||Math.abs(e.points)>100||typeof e.id!=='string'||e.id.length>100)throw new Error('Invalid score in backup.');
    return{id:e.id,playerId:e.playerId,points:e.points,source:String(e.source||'Score').slice(0,120),key:typeof e.key==='string'?e.key.slice(0,120):null,at:typeof e.at==='string'?e.at.slice(0,40):''};
  });
  const progress={};for(const g of games){const p=raw.progress?.[g.id];if(p&&Number.isInteger(p.index)&&p.index>=0&&p.index<=g.cards.length)progress[g.id]={index:p.index,revealed:!!p.revealed};}
  return{version:1,players,ledger,progress};
}
