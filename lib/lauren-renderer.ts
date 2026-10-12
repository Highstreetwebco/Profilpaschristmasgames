import {createRigMesh,rigMatrices,skinVertex,RIG_VIEW} from './lauren-rig.js';

export function createLaurenRenderer(canvas:HTMLCanvasElement){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 const image=new Image();let disposed=false,lastTime=0,lastGait=0,loaded=false;
 if(!gl){
  const ctx=canvas.getContext('2d'),mesh=createRigMesh(20,30);
  const draw=(ms:number,gaitPhase=ms/110)=>{
   lastTime=ms;lastGait=gaitPhase;if(!ctx||!loaded||disposed)return;
   ctx.clearRect(0,0,canvas.width,canvas.height);const bones=rigMatrices(ms,gaitPhase);
   const points=mesh.vertices.map(v=>{const p=skinVertex(v,bones);return{x:(p[0]-RIG_VIEW.x)/RIG_VIEW.width*canvas.width,y:(p[1]-RIG_VIEW.y)/RIG_VIEW.height*canvas.height,u:v.u*image.width,v:v.v*image.height};});
   for(let k=0;k<mesh.indices.length;k+=3){
    const a=points[mesh.indices[k]],b=points[mesh.indices[k+1]],c=points[mesh.indices[k+2]];
    const d=a.u*(b.v-c.v)+b.u*(c.v-a.v)+c.u*(a.v-b.v);if(!d)continue;
    const m11=(a.x*(b.v-c.v)+b.x*(c.v-a.v)+c.x*(a.v-b.v))/d;
    const m12=(a.y*(b.v-c.v)+b.y*(c.v-a.v)+c.y*(a.v-b.v))/d;
    const m21=(a.x*(c.u-b.u)+b.x*(a.u-c.u)+c.x*(b.u-a.u))/d;
    const m22=(a.y*(c.u-b.u)+b.y*(a.u-c.u)+c.y*(b.u-a.u))/d;
    const dx=(a.x*(b.u*c.v-c.u*b.v)+b.x*(c.u*a.v-a.u*c.v)+c.x*(a.u*b.v-b.u*a.v))/d;
    const dy=(a.y*(b.u*c.v-c.u*b.v)+b.y*(c.u*a.v-a.u*c.v)+c.y*(a.u*b.v-b.u*a.v))/d;
    ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();ctx.transform(m11,m12,m21,m22,dx,dy);ctx.drawImage(image,0,0);ctx.restore();
   }
  };
  image.onload=()=>{loaded=true;draw(lastTime,lastGait);};image.src='/assets/lauren-rig.png';
  return{draw,dispose(){disposed=true;image.onload=null;}};
 }
 const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Character shader could not compile');return s;};
 const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 textureUV;void main(){textureUV=uv;gl_Position=vec4(position,0.,1.);}');
 const fragment=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 textureUV;uniform sampler2D character;void main(){gl_FragColor=texture2D(character,textureUV);}');
 const program=gl.createProgram()!;gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.useProgram(program);
 const mesh=createRigMesh(),data=new Float32Array(mesh.vertices.length*4),buffer=gl.createBuffer(),indices=gl.createBuffer(),texture=gl.createTexture();
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
 for(const[name,offset]of [['position',0],['uv',8]] as const){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,16,offset);}
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
 gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 const draw=(ms:number,gaitPhase=ms/110)=>{
  lastTime=ms;lastGait=gaitPhase;if(!loaded||disposed||gl.isContextLost())return;
  const bones=rigMatrices(ms,gaitPhase);
  mesh.vertices.forEach((v,i)=>{const p=skinVertex(v,bones),j=i*4;data[j]=(p[0]-RIG_VIEW.x)/RIG_VIEW.width*2-1;data[j+1]=1-(p[1]-RIG_VIEW.y)/RIG_VIEW.height*2;data[j+2]=v.u;data[j+3]=v.v;});
  gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
 };
 image.onload=()=>{if(disposed)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);loaded=true;draw(lastTime,lastGait);};image.src='/assets/lauren-rig.png';
 return{draw,dispose(){disposed=true;image.onload=null;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteBuffer(indices);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);}};
}
