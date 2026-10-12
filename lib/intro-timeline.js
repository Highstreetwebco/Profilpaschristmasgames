// One clock for the server gate and every client's animation.
export const INTRO_DURATION = 18000;
export const INTRO_LEAD_IN = 2200;
export const LOGO_SWAP_AT = 9900;
// Give the two journeys time to read as a run, without stretching the gag.
export function introAnimationTime(ms){
 if(ms<1200)return ms;
 if(ms<5000)return 1200+(ms-1200)*1800/3800;
 if(ms<12000)return ms-2000;
 if(ms<16000)return 10000+(ms-12000)/2;
 return ms-4000;
}
export function introPhase(elapsed) {
 const ms=introAnimationTime(elapsed);
 if (ms < 0) return 'ready';
 if (ms < 1200) return 'jump-out';
 if (ms < 3000) return 'run-in';
 if (ms < 3900) return 'throw-rope';
 if (ms < 5800) return 'pull';
 if (ms < 6900) return 'drop';
 if (ms < 8400) return 'throw-logo';
 if (ms < 10000) return 'celebrate';
 if (ms < 12000) return 'run-back';
 if (ms < 13100) return 'jump-back';
 return 'done';
}
