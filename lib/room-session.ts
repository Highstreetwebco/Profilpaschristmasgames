import {RoomError} from './room-engine.js';
import {PAGES_ORIGIN} from './deployment.js';
export const PLAYER_COOKIE='profilpas_player';
export const validPlayerToken=(token:unknown):token is string=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
export function cookieToken(req:Request){return req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(PLAYER_COOKIE+'='))?.slice(PLAYER_COOKIE.length+1);}
export function checkRoomOrigin(req:Request){
 const origin=req.headers.get('origin'),own=new URL(req.url).origin;
 if(origin&&origin!==own&&origin!==PAGES_ORIGIN)throw new RoomError('This action must come from the game itself.',403);
 if(req.headers.get('sec-fetch-site')==='cross-site'&&origin!==PAGES_ORIGIN)throw new RoomError('Cross-site actions are not allowed.',403);
 // Pages uses an explicit per-browser credential, never a third-party cookie.
 if(origin===PAGES_ORIGIN&&req.method!=='OPTIONS'&&!req.headers.get('authorization'))throw new RoomError('Your player session is missing. Refresh the game.',401);
}
export function corsHeaders(req:Request):Record<string,string>{return req.headers.get('origin')===PAGES_ORIGIN?{'Access-Control-Allow-Origin':PAGES_ORIGIN}:{};}
export async function roomIdentity(req:Request){
 const auth=req.headers.get('authorization');let token:string|undefined,cookie:string|undefined;
 if(auth!==null){const candidate=auth.startsWith('Bearer ')?auth.slice(7):null;if(!validPlayerToken(candidate))throw new RoomError('Your player session is invalid. Refresh the game.',401);token=candidate;}
 else{
  const candidate=cookieToken(req);token=validPlayerToken(candidate)?candidate:undefined;
  if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');cookie=`${PLAYER_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;}
 }
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 return{actor:{key:'session:'+hash},cookie};
}
