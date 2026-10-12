import {smooth} from './elf-reactions.js';
export const puppetRigs={
 jack:{side:1,centre:500,hip:1000,shoulder:[655,626],elbow:[755,759],hand:[895,879],handBox:[710,1024,720,1010],handTaper:[830,950,90]},
 stu:{side:-1,centre:607,hip:1010,shoulder:[471,579],elbow:[335,733],hand:[169,900],handBox:[0,350,680,1070]},
 lauren:{side:1,centre:480,hip:960,shoulder:[601,515],elbow:[724,652],hand:[886,773],handBox:[700,1024,590,930],handTaper:[750,860,80]},
 richard:{side:-1,centre:576,hip:1030,shoulder:[458,627],elbow:[340,723],hand:[177,918],handBox:[0,345,710,1070]},
 hangman:{side:1,centre:430,hip:1070,shoulder:[668,633],elbow:[783,798],hand:[910,913],handBox:[720,1024,750,1080]}
};
export const puppetIds=['jack','stu','lauren','richard'];
const rotation=(x,y,degrees)=>{const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[c,s,-s,c,x-c*x+s*y,y-s*x-c*y];};
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
export function puppetBones(id,pose){
 const c=puppetRigs[id],body=rotation(c.centre,c.hip,pose.lean*c.side),arm=mul(body,rotation(...c.shoulder,pose.upper*c.side));
 return[body,arm,mul(arm,rotation(...c.elbow,pose.fore*c.side)),rotation(c.centre-100,c.hip,pose.gait),rotation(c.centre+100,c.hip,-pose.gait)];
}
function weights(c,x,y){
 const [sx,sy]=c.shoulder,[ex,ey]=c.elbow,[hx,hy]=c.hand;
 const f=Math.max(0,Math.min(1,y<ey?(y-sy)/(ey-sy):(y-ey)/(hy-ey))),axis=y<ey?sx+(ex-sx)*f:ex+(hx-ex)*f;
 const [baseLeft,right,top,bottom]=c.handBox;
 const left=baseLeft+(c.handTaper?smooth(c.handTaper[0],c.handTaper[1],y)*c.handTaper[2]:0);
 const hand=smooth(left-20,left,x)*(1-smooth(right,right+20,x))*smooth(top-20,top,y)*(1-smooth(bottom,bottom+20,y));
 const arm=Math.max(hand,smooth(-110,-55,c.side*(x-axis))*smooth(sy-30,sy+90,y)*(1-smooth(hy+160,hy+220,y)));
 const elbow=Math.max(hand,smooth(ey-60,ey+60,y));
 const leg=smooth(c.hip,c.hip+130,y);
 return[[0,(1-arm)*(1-leg)],[x<c.centre?3:4,(1-arm)*leg],[1,arm*(1-elbow)],[2,arm*elbow]];
}
export function puppetMesh(id,columns=32,rows=48){const c=puppetRigs[id],vertices=[],indices=[];for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){const px=x/columns*1024,py=y/rows*1536;vertices.push({x:px,y:py,u:x/columns,v:y/rows,weights:weights(c,px,py)});}for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}return{vertices,indices:new Uint16Array(indices)};}
export function skinPuppet(v,bones){let x=0,y=0;for(const[i,w]of v.weights){const p=point(bones[i],v.x,v.y);x+=p[0]*w;y+=p[1]*w;}return[x,y];}
export function puppetWorld(id,p,pose){const c=puppetRigs[id];return [pose.x+(p[0]-c.centre)*pose.scale,pose.y+(p[1]-1475)*pose.scale];}
export function puppetHand(id,pose){return puppetWorld(id,point(puppetBones(id,pose)[2],...puppetRigs[id].hand),pose);}
