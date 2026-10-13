import {PAGES_URL} from '../../../lib/deployment.js';
import {cookieToken,validPlayerToken} from '../../../lib/room-session';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const origin=req.headers.get('origin'),mode=req.headers.get('sec-fetch-mode');
 // This route is a handoff to the fixed GitHub URL. It never
 // accepts a destination, exposes a token in JSON, or supports cross-origin fetch.
 const own=new URL(req.url).origin;
 if((origin&&origin!==own)||(mode&&mode!=='navigate'&&origin!==own))return new Response('Open this link in your browser.',{status:403,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
 const token=cookieToken(req),location=PAGES_URL+(validPlayerToken(token)?`#player=${token}`:'');
 return new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','Vary':'Cookie'}});
}
