// One clock for the server gate and every client's animation.
export const INTRO_DURATION = 14000;
export const INTRO_LEAD_IN = 2200;
export const LOGO_SWAP_AT = 7900;
export function introPhase(ms) {
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
