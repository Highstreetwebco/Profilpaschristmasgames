// Continuous skeletal skinning of a single RGBA texture, with no pose atlas.
export const RIG_VIEW={x:-400,y:-200,width:1824,height:1800,footY:1475,centreX:512};
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
function aimArm(shoulder,elbow,hand,target,side){
 const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
 const l1=Math.hypot(elbow[0]-shoulder[0],elbow[1]-shoulder[1]),l2=Math.hypot(hand[0]-elbow[0],hand[1]-elbow[1]);
 const dx=target[0]-shoulder[0],dy=target[1]-shoulder[1],d=Math.min(l1+l2-1,Math.max(Math.abs(l1-l2)+1,Math.hypot(dx,dy)));
 const bend=side*Math.acos(Math.max(-1,Math.min(1,(d*d-l1*l1-l2*l2)/(2*l1*l2))));
 const upper=Math.atan2(dy,dx)-Math.atan2(l2*Math.sin(bend),l1+l2*Math.cos(bend));
 return[(upper-angle(shoulder,elbow))*180/Math.PI,(bend-(angle(elbow,hand)-angle(shoulder,elbow)))*180/Math.PI];
}
const rest=[0,0,-28,-12,28,12,0,0,0,0,0,0];
const poses=[
 [0,rest],
 [250,[0,-4,-5,-30,5,30,-12,24,-10,12,-24,10]],
 [650,[-5,6,50,-30,-50,30,-27,55,-20,27,-55,20]],
 [1200,rest],
 [2800,rest],
 [3070,[-8,12,-30,-25,10,-60,-8,15,0,8,-15,0]],
 [3480,[-5,10,-25,-25,-140,-15,0,8,-5,0,-8,5]],
 [3850,[10,-14,65,35,-92,-90,-10,18,-8,10,-18,8]],
 [5650,[10,-14,65,35,-92,-90,-10,18,-8,10,-18,8]],
 [6150,[15,-5,30,30,-45,-45,-14,26,-10,14,-26,10]],
 [6750,rest],
 [7040,[-10,9,-20,-20,15,-70,-8,15,0,8,-15,0]],
 [7450,[-4,12,-25,-20,-145,-12,0,5,0,0,-5,0]],
 [8270,rest],
 [9200,[0,-7,-26,-15,-45,-25,0,0,0,0,0,0]],
 [9900,rest],
 [12000,rest],
 [12400,[-6,8,55,-30,-55,30,-28,55,-18,28,-55,18]],
 [13000,rest],
 [14000,rest]
];
export function rigPose(ms,gaitPhase=ms/110){
 const t=Math.max(0,Math.min(14000,ms));let i=1;while(i<poses.length-1&&t>poses[i][0])i++;
 const a=poses[i-1],b=poses[i],f=smooth(a[0],b[0],t),p=a[1].map((v,j)=>lerp(v,b[1][j],f));
 const run1=smooth(1200,1450,t)*(1-smooth(2600,3000,t));
 const run2=smooth(10000,10200,t)*(1-smooth(11650,12000,t));
 const run=run1+run2,wave=Math.sin(gaitPhase),other=Math.cos(gaitPhase);
 p[0]+=run*7;p[1]-=run*5;
 p[2]+=run*(wave*32);p[3]-=run*(45+other*15);
 p[4]-=run*(wave*32);p[5]-=run*(55-other*15);
 p[6]+=run*wave*30;p[7]+=run*Math.max(0,-wave)*62;p[8]-=run*Math.max(0,-wave)*25;
 p[9]-=run*wave*30;p[10]-=run*Math.max(0,wave)*62;p[11]+=run*Math.max(0,wave)*25;
 const pull=smooth(3900,4150,t)*(1-smooth(5450,5800,t));
 p[0]+=pull*Math.sin((t-3900)/155)*6;p[1]-=pull*Math.sin((t-3900)/155)*3;
 p[3]+=pull*Math.sin((t-3900)/155)*13;p[5]-=pull*Math.sin((t-3900)/155)*12;
 const grip=smooth(3550,3950,t)*(1-smooth(5600,6250,t)),tug=Math.sin((t-3900)/155)*9;
 const left=aimArm([378,426],[265,620],[119,797],[586+tug,570],-1),right=aimArm([652,426],[780,620],[907,796],[625+tug,545],1);
 p[2]=lerp(p[2],left[0],grip);p[3]=lerp(p[3],left[1],grip);p[4]=lerp(p[4],right[0],grip);p[5]=lerp(p[5],right[1],grip);
 // Subtle follow-through rather than a frozen standing cutout.
 p[1]+=Math.sin(t/270)*1.1;p[0]+=Math.sin(t/440)*.5;
 return p;
}
const identity=()=>[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const rotate=(x,y,degrees)=>{const r=degrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return[c,s,-s,c,x-c*x+s*y,y-s*x-c*y];};
export const transformPoint=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
export function rigMatrices(ms,gaitPhase){
 const p=rigPose(ms,gaitPhase),m=[];m[0]=rotate(512,875,p[0]);m[1]=multiply(m[0],rotate(512,395,p[1]));
 m[2]=multiply(m[0],rotate(378,426,p[2]));m[3]=multiply(m[2],rotate(265,620,p[3]));
 m[4]=multiply(m[0],rotate(652,426,p[4]));m[5]=multiply(m[4],rotate(780,620,p[5]));
 m[6]=rotate(411,860,p[6]);m[7]=multiply(m[6],rotate(392,1090,p[7]));m[8]=multiply(m[7],rotate(365,1320,p[8]));
 m[9]=rotate(608,860,p[9]);m[10]=multiply(m[9],rotate(624,1090,p[10]));m[11]=multiply(m[10],rotate(658,1320,p[11]));return m;
}
function weights(x,y){
 if(y<360)return[[1,1]];
 const leftEdge=378-Math.max(0,y-450)*.32,rightEdge=652+Math.max(0,y-450)*.32;
 const left=x<leftEdge+20,right=x>rightEdge-20;
 if(y<880&&(left||right)){
  const upper=left?2:4,fore=upper+1,sideBlend=left?1-smooth(leftEdge-20,leftEdge+20,x):smooth(rightEdge-20,rightEdge+20,x),shoulder=smooth(395,460,y)*sideBlend,elbow=smooth(575,660,y);
  return[[0,1-shoulder],[upper,shoulder*(1-elbow)],[fore,shoulder*elbow]];
 }
 if(y>850){const thigh=x<512?6:9,hip=smooth(850,935,y),knee=smooth(1035,1140,y),ankle=smooth(1270,1360,y);return[[0,1-hip],[thigh,hip*(1-knee)],[thigh+1,hip*knee*(1-ankle)],[thigh+2,hip*knee*ankle]];}
 const head=1-smooth(360,430,y);return[[0,1-head],[1,head]];
}
export function createRigMesh(columns=48,rows=72){
 const vertices=[],indices=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){const px=x/columns*1024,py=y/rows*1536;vertices.push({x:px,y:py,u:x/columns,v:y/rows,weights:weights(px,py)});}
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}
 return{vertices,indices:new Uint16Array(indices)};
}
export function skinVertex(vertex,matrices){let x=0,y=0;for(const[b,w]of vertex.weights){const p=transformPoint(matrices[b]||identity(),vertex.x,vertex.y);x+=p[0]*w;y+=p[1]*w;}return[x,y];}
export function rigHand(ms,gaitPhase){return transformPoint(rigMatrices(ms,gaitPhase)[5],907,796);}
