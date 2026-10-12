// Fit measured content as a whole, so controls cannot disappear below the viewport.
export function stageScale(availableWidth,availableHeight,contentWidth,contentHeight){
 if(![availableWidth,availableHeight,contentWidth,contentHeight].every(n=>Number.isFinite(n)&&n>0))return 1;
 return Math.min(1,availableWidth/contentWidth,availableHeight/contentHeight);
}
