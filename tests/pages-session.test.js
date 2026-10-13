import test from 'node:test';
import assert from 'node:assert/strict';
import {component} from './helpers/render-component.js';
import {PAGES_ORIGIN,PAGES_PATH,PAGES_URL} from '../lib/deployment.js';
const {roomIdentity,checkRoomOrigin,corsHeaders}=component('lib/room-session.ts');
const {GET:move}=component('app/api/move/route.ts');
const cookie='a'.repeat(64),bearer='b'.repeat(64);
function request(headers={},path='/api/room'){return new Request('https://game.test'+path,{headers});}
test('cookie and bearer transport resolve to the identical stored actor without revealing a credential',async()=>{
 const a=await roomIdentity(request({cookie:`profilpas_player=${cookie}`})),b=await roomIdentity(request({authorization:`Bearer ${cookie}`}));
 assert.deepEqual(a,b);assert.ok(!JSON.stringify(a).includes(cookie));assert.ok(!b.cookie);
 const explicit=await roomIdentity(request({cookie:`profilpas_player=${cookie}`,authorization:`Bearer ${bearer}`}));assert.notEqual(explicit.actor.key,a.actor.key);
 for(const authorization of ['','Basic x','Bearer bad','Bearer '+cookie+' bad'])await assert.rejects(()=>roomIdentity(request({authorization})),/invalid/);
});
test('only the GitHub origin gets CORS access and it must supply its own session',()=>{
 const req=request({origin:PAGES_ORIGIN,authorization:`Bearer ${bearer}`,'sec-fetch-site':'cross-site'});checkRoomOrigin(req);assert.deepEqual(corsHeaders(req),{'Access-Control-Allow-Origin':PAGES_ORIGIN});
 assert.throws(()=>checkRoomOrigin(request({origin:PAGES_ORIGIN,cookie:`profilpas_player=${cookie}`})),/missing/);
 for(const origin of ['https://evil.test',PAGES_ORIGIN+'.evil.test','null']){const req=request({origin,authorization:`Bearer ${bearer}`});assert.throws(()=>checkRoomOrigin(req),/game itself/);assert.deepEqual(corsHeaders(req),{});}
});
test('player handoff has a fixed destination, keeps tokens out of query strings and blocks fetch access',async()=>{
 const req=request({cookie:`profilpas_player=${cookie}`,'sec-fetch-mode':'navigate'},'/api/move?next=https://evil.test');
 const res=await move(req),url=new URL(res.headers.get('location'));assert.equal(res.status,303);assert.equal(url.origin+url.pathname,PAGES_URL);assert.equal(url.search,'');assert.equal(url.hash,'#player='+cookie);assert.equal(await res.text(),'');assert.equal(res.headers.get('referrer-policy'),'no-referrer');assert.ok(res.headers.get('cache-control').includes('no-store'));
 assert.equal((await move(request({'sec-fetch-mode':'cors',cookie:`profilpas_player=${cookie}`},'/api/move'))).status,403);
 assert.equal((await move(request({origin:'https://evil.test',cookie:`profilpas_player=${cookie}`},'/api/move'))).status,403);
 assert.equal((await move(request({},'/api/move'))).headers.get('location'),PAGES_URL);
});
test('Pages removes a transferred fragment before using the token and remembers players across reloads',async()=>{
 const storage=new Map(),order=[];
 const browser={location:{origin:PAGES_ORIGIN,pathname:PAGES_PATH,search:'',hash:'#player='+cookie},history:{replaceState(_,__,url){order.push('remove');assert.equal(url,PAGES_PATH);browser.location.hash='';}},localStorage:{getItem:key=>storage.get(key),setItem(key,value){order.push('store');storage.set(key,value);}},crypto};
 const first=await import('../lib/pages-session.js?first');assert.equal(first.pagesToken(browser),cookie);assert.deepEqual(order,['remove','store']);assert.equal(browser.location.hash,'');assert.equal(first.isPages(browser.location),true);
 const reload=await import('../lib/pages-session.js?reload');assert.equal(reload.pagesToken(browser),cookie);
 storage.clear();const fresh=await import('../lib/pages-session.js?fresh');const token=fresh.pagesToken(browser);assert.match(token,/^[a-f0-9]{64}$/);assert.notEqual(token,cookie);assert.equal(fresh.pagesToken(browser),token);
});
