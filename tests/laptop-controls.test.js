import test from 'node:test';
import assert from 'node:assert/strict';
import {gridDestination,workWordStatus} from '../lib/laptop-controls.js';
test('laptop arrows move in visual rows and columns, never to another row at an edge',()=>{
 for(const [columns,count] of [[6,24],[4,24],[8,64]])for(let p=0;p<count;p++){
  for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']){
   const next=gridDestination(p,key,columns,count);assert.ok(next>=0&&next<count);
   if(['ArrowLeft','ArrowRight','Home','End'].includes(key))assert.equal(Math.floor(next/columns),Math.floor(p/columns));
   if(['ArrowUp','ArrowDown'].includes(key))assert.equal(next%columns,p%columns);
  }
  assert.equal(gridDestination(p,'Enter',columns,count),null);
 }
 assert.equal(gridDestination(7,'ArrowRight',8,64),7);
 assert.equal(gridDestination(7,'ArrowDown',8,64),15);
 assert.equal(gridDestination(10,'Home',6,24),6);
 assert.equal(gridDestination(10,'End',6,24),11);
});
test('work word feedback accepts real names and trade phrases, rejecting impossible inputs',()=>{
 for(const value of ['Stu','Tile Trim',"O'NEILL",'self-levelling','  café  tiles '])assert.equal(workWordStatus(value).valid,true,value);
 for(const value of ['', 'A','Tiles 123','a'.repeat(25),'two--words','tiles!'])assert.equal(workWordStatus(value).valid,false,value);
 assert.deepEqual(workWordStatus('  café  tiles '),{word:'CAFE TILES',letters:9,valid:true});
});
