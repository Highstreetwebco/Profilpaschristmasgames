import {env} from 'cloudflare:workers';
import {roomIdentity,checkRoomOrigin,corsHeaders} from '../../../lib/room-session';
import {newRoom,RoomError,transition,snapshot} from '../../../lib/room-engine.js';

export const dynamic='force-dynamic';
const ROOM='profilpas-christmas-2026';
type Actor={key:string};
type Row={version:number;body:string};
const json=(req:Request,data:unknown,status=200,cookie?:string)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin, Cookie',...corsHeaders(req),'X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
function db(){if(!env.DB)throw new RoomError('The shared game room is not connected yet.',503);return env.DB;}
async function load(){const database=db();await database.prepare('INSERT OR IGNORE INTO game_rooms(id,version,body) VALUES(?,0,?)').bind(ROOM,JSON.stringify(newRoom())).run();return await database.prepare('SELECT version,body FROM game_rooms WHERE id=?').bind(ROOM).first<Row>();}
async function heartbeat(actor:Actor,now:number){await db().prepare('INSERT INTO game_presence(id,last_seen) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen').bind(actor.key,now).run();}
async function presence(){const rows=await db().prepare('SELECT id,last_seen FROM game_presence WHERE last_seen>?').bind(Date.now()-60000).all<{id:string;last_seen:number}>();return Object.fromEntries(rows.results.map(p=>[p.id,p.last_seen]));}
function responseError(req:Request,e:unknown,cookie?:string){if(e instanceof RoomError)return json(req,{error:e.message},e.status,cookie);console.error('Game room request failed',e instanceof Error?e.message:'Unknown error');return json(req,{error:'The shared room could not be reached. Please retry in a moment.'},503,cookie);}
export async function GET(req:Request){let cookie;try{checkRoomOrigin(req);const identityResult=await roomIdentity(req);cookie=identityResult.cookie;const actor=identityResult.actor;const row=await load();if(!row)throw new RoomError('The room is starting. Please retry.',503);const room=JSON.parse(row.body);if(room.players.some((p:{owner:string})=>p.owner===actor.key))await heartbeat(actor,Date.now());return json(req,snapshot(room,actor,await presence(),Date.now(),row.version),200,cookie);}catch(e){return responseError(req,e,cookie);}}
export async function POST(req:Request){let cookie;try{
 checkRoomOrigin(req);
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new RoomError('Use a JSON game action.',415);
 const raw=await req.text();if(raw.length>8192)throw new RoomError('That request is too large.',413);let command;
 try{command=JSON.parse(raw);}catch{throw new RoomError('Invalid game action.');}
 if(!command||typeof command.type!=='string'||typeof command.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(command.requestId))throw new RoomError('A valid action ID is required.');
 const who=await roomIdentity(req);cookie=who.cookie;const actor=who.actor;
 await heartbeat(actor,Date.now());
 for(let attempt=0;attempt<6;attempt++){
  const row=await load();if(!row)throw new RoomError('The room is starting.',503);
  const seen=await presence();const next=transition(JSON.parse(row.body),actor,command,seen,Date.now());
  const updated=await db().prepare('UPDATE game_rooms SET body=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(next),ROOM,row.version).run();
  if(updated.meta.changes)return json(req,snapshot(next,actor,seen,Date.now(),row.version+1),200,cookie);
 }
 throw new RoomError('Another player updated the room. Please try again.',409);
 }catch(e){return responseError(req,e,cookie);}}

export async function OPTIONS(req:Request){try{checkRoomOrigin(req);return new Response(null,{status:204,headers:{...corsHeaders(req),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});}catch(e){return responseError(req,e);}}
