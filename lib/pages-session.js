import {PAGES_ORIGIN,PAGES_PATH,ROOM_ORIGIN} from './deployment.js';
export const PLAYER_STORAGE='profilpas-christmas-2026:player';
const valid=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
let cachedToken;
export function isPages(location=globalThis.location){return location?.origin===PAGES_ORIGIN&&location.pathname.startsWith(PAGES_PATH);}
// A transferred credential arrives only in the fragment, which is not sent to
// GitHub, then is removed before rendering or making any API requests.
export function pagesToken(browser=window){
 const incoming=new URLSearchParams(browser.location.hash.slice(1)).get('player');
 if(incoming!==null){
  browser.history.replaceState(null,'',browser.location.pathname+browser.location.search);
  if(valid(incoming)){browser.localStorage.setItem(PLAYER_STORAGE,incoming);cachedToken=incoming;}
 }
 if(cachedToken)return cachedToken;
 const stored=browser.localStorage.getItem(PLAYER_STORAGE);
 if(valid(stored)){cachedToken=stored;return cachedToken;}
 const token=Array.from(browser.crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 browser.localStorage.setItem(PLAYER_STORAGE,token);cachedToken=token;return token;
}
export function roomFetch(init={}){
 if(!isPages())return fetch('/api/room',init);
 const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${pagesToken()}`);
 return fetch(`${ROOM_ORIGIN}/api/room`,{...init,headers,mode:'cors',credentials:'omit'});
}
