const guides=[
 {id:'pictionary',name:'Pictionary',goal:'First correct guess wins 1 point.',steps:'The drawer reveals a secret word and has 120 seconds. Everyone else types guesses. Each person draws twice; no letters, numbers or spoken clues.',keys:'Mouse or trackpad to draw · Ctrl/⌘ Z undo · B pen · E eraser · [ ] brush size · Enter sends a guess'},
 {id:'hangman',name:'Team Hangman',goal:'Save the elf: every guesser earns 1 point.',steps:'The setter chooses a word in the work category. Discuss it together in Teams. Wrong letters or whole answers build the frame; you share six mistakes. The setter sits this one out.',keys:'Type A–Z to choose a letter · Enter submits a whole answer · Click the elf for trouble'},
 {id:'memory',name:'Memory Match',goal:'Fewest card flips wins. Take your time.',steps:'Wait for everyone’s pictures to load. Jack starts the eight-second preview. Match all 12 pairs on your own board. Every card flip counts; speed does not. Places earn 5 / 3 / 1 points, with shared places for ties. Last place: Nob head.',keys:'Click a card · Or Tab into the board, arrows to move, Enter/Space to flip'},
 {id:'battleships',name:'Battleships',goal:'Last fleet afloat wins 5 points. Second: 3. Third: 1.',steps:'Position three ships privately and confirm. Once everyone is ready, click any untried enemy square. One shot per turn, hit or miss. Red pegs are hits; blue pegs are misses. Only your own ships are visible.',keys:'Setup: select a ship, arrows to move, R to rotate · Battle: Tab to a board, arrows to aim, Enter/Space to fire'}
];
export default function GameHelp({game}:{game?:string|null}){
 const active=guides.find(g=>g.id===game);
 return <><p className="eyebrow">LAPTOP PLAY GUIDE</p><h2 id="dialog-title">{active?active.name:<>Ready, steady, <em>festive.</em></>}</h2>
  {!active&&<p>Choose your own name, ready up and let Jack start. Keep this tab open on your own laptop; use Teams to chat. Fullscreen gives your game more room.</p>}
  <div className={`help-games ${active?'single-guide':''}`}>{(active?[active]:guides).map(g=><article key={g.id}>{!active&&<h3>{g.name}</h3>}<strong>{g.goal}</strong><p>{g.steps}</p><p className="help-shortcuts">{g.keys}</p></article>)}</div>
  <p className="dialog-note">Jack pauses games and moves everyone on. Refreshing keeps your player and progress. Solo mode is practice, with no competition points. Close this guide with Escape.</p>
 </>;
}
