import {createRoot} from 'react-dom/client';
import GameCentre from '../app/GameCentre';
import {pagesToken} from '../lib/pages-session.js';
import '../app/game.css';
import '../app/screen.css';
import '../app/laptop.css';
import '../app/briefing.css';

const root=document.getElementById('root')!;
try{pagesToken();createRoot(root).render(<GameCentre/>);}catch{
 root.textContent='Please allow browser storage for this website, then refresh to join the Christmas games.';
 root.style.cssText='padding:40px;max-width:700px;margin:auto;line-height:1.7;text-align:center';
}
