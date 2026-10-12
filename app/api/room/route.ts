import {env} from 'cloudflare:workers';
import {newRoom,RoomError,transition,snapshot} from '../../../lib/room-engine.js';

export const dynamic='force-dynamic';
const ROOM='profilpas-christmas-2026';
const COOKIE='profilpas_player';
type Actor={key:string};
type Row={version:number;body:string};
const json=(data:unknown,status=200,cookie?:string)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
function db(){if(!env.DB)throw new RoomError('The shared game room is not connected yet.',503);return env.DB;}
async function identity(req:Request){
 let token=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 let cookie:string|undefined;
 if(!token||!/^[a-f0-9]{64}$/.test(token)){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');cookie=`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 return{actor:{key:'session:'+hash} as Actor,cookie};
}
async function load(){const database=db();await database.prepare('INSERT OR IGNORE INTO game_rooms(id,version,body) VALUES(?,0,?)').bind(ROOM,JSON.stringify(newRoom())).run();return await database.prepare('SELECT version,body FROM game_rooms WHERE id=?').bind(ROOM).first<Row>();}
async function heartbeat(actor:Actor,now:number){await db().prepare('INSERT INTO game_presence(id,last_seen) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen').bind(actor.key,now).run();}
async function presence(){const rows=await db().prepare('SELECT id,last_seen FROM game_presence WHERE last_seen>?').bind(Date.now()-60000).all<{id:string;last_seen:number}>();return Object.fromEntries(rows.results.map(p=>[p.id,p.last_seen]));}
function responseError(e:unknown,cookie?:string){if(e instanceof RoomError)return json({error:e.message},e.status,cookie);console.error('Game room request failed',e instanceof Error?e.message:'Unknown error');return json({error:'The shared room could not be reached. Please retry in a moment.'},503,cookie);}
export async function GET(req:Request){let cookie;try{const identityResult=await identity(req);cookie=identityResult.cookie;const actor=identityResult.actor;const row=await load();if(!row)throw new RoomError('The room is starting. Please retry.',503);const room=JSON.parse(row.body);if(room.players.some((p:{owner:string})=>p.owner===actor.key))await heartbeat(actor,Date.now());return json(snapshot(room,actor,await presence(),Date.now(),row.version),200,cookie);}catch(e){return responseError(e,cookie);}}
export async function POST(req:Request){let cookie;try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new RoomError('This action must come from the game itself.',403);
 if(req.headers.get('sec-fetch-site')==='cross-site')throw new RoomError('Cross-site actions are not allowed.',403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new RoomError('Use a JSON game action.',415);
 const raw=await req.text();if(raw.length>8192)throw new RoomError('That request is too large.',413);let command;
 try{command=JSON.parse(raw);}catch{throw new RoomError('Invalid game action.');}
 if(!command||typeof command.type!=='string'||typeof command.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(command.requestId))throw new RoomError('A valid action ID is required.');
 const who=await identity(req);cookie=who.cookie;const actor=who.actor;
 await heartbeat(actor,Date.now());
 for(let attempt=0;attempt<6;attempt++){
  const row=await load();if(!row)throw new RoomError('The room is starting.',503);
  const seen=await presence();const next=transition(JSON.parse(row.body),actor,command,seen,Date.now());
  const updated=await db().prepare('UPDATE game_rooms SET body=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(next),ROOM,row.version).run();
  if(updated.meta.changes)return json(snapshot(next,actor,seen,Date.now(),row.version+1),200,cookie);
 }
 throw new RoomError('Another player updated the room. Please try again.',409);
 }catch(e){return responseError(e,cookie);}}
