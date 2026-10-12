export const characters = [
  {name:'The Trophy Hunter',tag:'Competitive? Me? Never.'},
  {name:'The Detail Elf',tag:'Just one more question…'},
  {name:'The Festive Spark',tag:'Bringing the Christmas energy.'},
  {name:'The Big Claus',tag:'Has a very important list.'},
  {name:'The Merry Maker',tag:'Here for the mince pies.'},
  {name:'The Cool Customer',tag:'Unbothered. Until the quiz.'}
];
export const games = [
  {id:'pictionary',name:'Pictionary',short:'Pictionary',label:'DRAW & GUESS',icon:'🎨',minutes:'Up to 16 min',meta:'2 drawings each · 120 seconds',description:'One secret word. One very questionable drawing. Be first to guess it and win a point.',seconds:120,maxPoints:1,instructions:'Everyone draws twice, one at a time. The drawer gets a random secret word and 120 seconds. Everyone else types guesses; the first correct guess wins 1 point. No letters, numbers, speaking or gestures.',cards:[]},
  {id:'hangman',name:'Hangman',short:'Hangman',label:'TEAM HANGMAN',icon:'🧩',minutes:'8–12 min',meta:'1 word each · 6 shared mistakes',description:'Tiling terms, products, customers and colleagues. Set a work-related word and let the team save your elf.',seconds:0,maxPoints:1,instructions:'Each player gets a work category and sets one correctly spelt tiling term, product, company or colleague name the team knows. The others work together with six shared mistakes. Solve it and each guesser earns 1 point. The setter sits out. No points for stumping the team.',cards:[]},
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
