// Grid navigation never wraps an arrow across the edge of a row.
export function gridDestination(position,key,columns,count){
 const row=Math.floor(position/columns),column=position%columns;
 if(key==='ArrowLeft')return column>0?position-1:position;
 if(key==='ArrowRight')return column<columns-1&&position+1<count?position+1:position;
 if(key==='ArrowUp')return Math.max(column,position-columns);
 if(key==='ArrowDown')return position+columns<count?position+columns:position;
 if(key==='Home')return row*columns;
 if(key==='End')return Math.min(count-1,(row+1)*columns-1);
 return null;
}
export const normaliseWorkWord=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/\s+/g,' ');
export function workWordStatus(value){
 const word=normaliseWorkWord(value),letters=word.replace(/[^A-Z]/g,'').length;
 return {word,letters,valid:/^[A-Z]+(?:[ '-][A-Z]+)*$/.test(word)&&word.length<=32&&letters>=2&&letters<=24};
}
