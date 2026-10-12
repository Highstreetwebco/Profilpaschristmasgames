export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
