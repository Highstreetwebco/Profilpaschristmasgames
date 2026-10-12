# Profilpas 2026 Christmas Games

A shared four-player games centre for Richard, Stu, Jack and Lauren. Jack is the ringmaster and controls the whole room.

Live site: https://profilpas-christmas-games-2026.jackmoycetroth.chatgpt.site

GitHub Pages entry: https://highstreetwebco.github.io/Profilpaschristmasgames/ — the root `index.html` redirects to the live game because its shared backend runs on Sites. `.nojekyll` prevents Pages from rendering this README as the website.

Source: https://github.com/Highstreetwebco/Profilpaschristmasgames

## Player flow

1. Each person opens the same link on their device and chooses their own name. No account or sign-in is needed. Whoever selects Jack becomes the ringmaster.
2. Their card becomes ready on every screen. A name cannot be claimed twice.
3. Jack can start with the ready, connected players, including alone for testing. Lauren jumps out of her card, runs beneath the logo, throws a rope, pulls the old logo down, throws the supplied replacement into place, and returns to her card. The shared game menu opens automatically after the 14-second scene (plus a 2.2-second synchronisation lead-in).
4. Jack selects a round; all screens follow automatically.
5. Quiz and emoji answers are submitted individually, then Jack reveals the result. Points are calculated on the server. For timed listing and sales-pitch challenges, players perform aloud in Teams and Jack awards 0–3 points.
6. Listing and pitch turns rotate through the players who were ready when Jack started, so every solo turn belongs to Jack. Only Jack can pause the timer, choose games, move to the next card, adjust scores, return everyone to the lobby, reset the session or show the podium.

Refreshes restore the selected player. Presence expires after 20 seconds without a heartbeat. Jack can release a guest slot in the lobby if someone changes browser or device. A return to the lobby preserves scores but requires everyone to ready up again; Reset session clears scores and round progress.

## Shared state and authority

The site now runs a Vinext/Cloudflare Worker with its own D1 database. It polls shared state every 1.5 seconds. Ready status, active round, answers, timers, scores and stage changes are shared between devices. Polling failures pause controls rather than pretending the room is connected.

There was no dedicated Christmas project in the connected Supabase account, only an unrelated Barford golf project. That project was not changed. The game database is provisioned by Sites via the `DB` binding.

Anyone with the game link can enter without signing in. Selecting Jack gives that browser the ringmaster controls; the other three names are players. A random HttpOnly Secure SameSite cookie remembers each browser, and only a hash is stored in the room. Host authority is based solely on the selected Jack slot, with no email or platform account requirement. An active name cannot be claimed twice. In the lobby, a name becomes available to another browser after its previous device has been disconnected for 20 seconds.

Changes use a versioned compare-and-swap write with retry so concurrent answers and joins are not lost. Actions carry request IDs; stale card actions are rejected. Correct answers and other players' submissions are withheld from API responses until the reveal. Game source is public in GitHub, so the quiz is an informal team activity rather than a cheat-proof examination.

## Development

- `npm run check`: TypeScript plus game-engine tests.
- `npm run test:integration`: actual API handlers against an isolated Miniflare/D1 database, using four independent sessions. Covers concurrent joins/answers, reconnect, hidden answers, shared scoring, host-only actions, stale requests and cross-origin checks.
- Use the Sites skill's build and publication helpers. Static GitHub Pages alone cannot run this version's shared backend.
- Schema: `db/schema.ts`; generated migration: `drizzle/0000_large_roulette.sql`.

Browser visual QA was unavailable in the build environment. TypeScript, 16 game-engine tests and actual API integration checks cover solo play in all four games, shared intro timestamps, the server-enforced intro gate, refresh recovery, multiplayer scoring and host permissions. Review animation playback on the meeting devices before the event.

The intro clock is stored in the existing room JSON; no schema migration is needed. Polling clients resume at the current animation time after a refresh. Completion is determined by server time, not a browser animation event, so a slow or backgrounded device cannot trap the room. Reduced-motion visitors see the static logo swap while retaining the same shared progression. Return to lobby to replay the entrance; Reset session clears test scores and progress before the real meeting.

## Assets

Official Profilpas by Mapei logo, downloaded from the official Profilpas website on 12 October 2026:
https://cdnmedia.mapei.com/images/profilpaslibraries/logo/logo_profilpas-mapeib96bb4e2-2abe-4a13-9960-b38581f8e3b7.png?sfvrsn=c06a6088_6

The two festive WebP images in `public/assets` were generated with the built-in image generation tool: a clay elf party around a silver-profile Christmas tree, and a 3-by-2 character portrait sheet. Jack’s approved cartoon ringmaster portrait is `public/assets/jack-ringmaster.webp`, generated from his supplied photos with the cigarette and tile-trim baton. It appears in the lobby, player badge, scoreboard and podium. Richard’s approved cartoon elf portrait holding a BMW gift box is `public/assets/richard-bmw.webp`, generated from his supplied photos, and appears in the same locations. Stu’s approved cartoon elf portrait is `public/assets/stu-city-guinness.webp`, holding a Guinness and wearing a Manchester City shirt with a fictional League One badge for the team joke. It appears throughout the same avatar locations. Lauren’s approved cartoon elf portrait is `public/assets/lauren-vape.webp`, generated from her supplied photos with a purple vape and a curl of vapour. It appears throughout the same avatar locations, completing the four-player set.

Fonts: DM Sans and Playfair Display, with system fallbacks.


### Lauren entrance assets

- `public/assets/profilpas-correct-logo.png` is the exact logo supplied by Jack on 12 October 2026. It sits on a cream plaque to keep its black lettering legible; the previous logo remains in the lobby as the setup for the joke.
- `public/assets/lauren-intro-sprites.png` is a transparent 4 × 2 atlas generated with the built-in image tool from Lauren’s approved portrait. Prompt: preserve Lauren’s face, blonde hair, pointed ears, Santa hat, green festive outfit and forearm tattoo; extend to full body with striped tights and curled elf boots; create four run poses, a jump, an overhead throw, a braced rope pull, and a triumphant standing pose with her purple vape, each in an equal cell on a transparent background. A follow-up pass requested removal of all background while preserving poses and identity.
- The supplied logo is copied unchanged. Sprite movement, rope, falling sign, replacement sign and sparkles are rendered by `app/LaurenIntro.tsx`; shared duration and phase boundaries are in `lib/intro-timeline.js`.
