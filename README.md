# Profilpas 2026 Christmas Games

A shared four-player games centre for Richard, Stu, Jack and Lauren. Jack is the ringmaster and controls the whole room.

Live site: https://profilpas-christmas-games-2026.jackmoycetroth.chatgpt.site

GitHub Pages entry: https://highstreetwebco.github.io/Profilpaschristmasgames/ — the root `index.html` redirects to the live game because its shared backend runs on Sites. `.nojekyll` prevents Pages from rendering this README as the website.

Source: https://github.com/Highstreetwebco/Profilpaschristmasgames

## Player flow

1. Each person opens the same link on their device and chooses their own name. No account or sign-in is needed. Whoever selects Jack becomes the ringmaster.
2. Their card becomes ready on every screen. A name cannot be claimed twice.
3. Jack can start with the ready, connected players, including alone for testing. Lauren jumps out of her card, runs beneath the existing top-left header logo, throws a rope, pulls the old logo down, throws the supplied replacement into place, and returns to her card. The shared game menu opens automatically after the 18-second scene (plus a 2.2-second synchronisation lead-in).
4. Jack selects a round; all screens follow automatically.
5. Game one is Pictionary: each participating player draws twice in roster order (eight drawings with all four players). The drawer clicks “Reveal my word & start” for a random secret word and 120 seconds. Everyone else sees the shared pad and can keep typing guesses. The first correct guess automatically ends the turn and wins exactly one point. Time expiring reveals the word without awarding points. Jack advances to the next drawing.
6. The pad supports mouse, touch and stylus, seven colours, an eraser, four brush sizes, undo and clear. No letters, numbers, speaking or gestures while drawing. Solo practice gives Jack two drawings and a guessing-box test, without awarding points.
7. Game two is cooperative Hangman (“Save the Elf”). Each player sets one secret word in an assigned work category: colleagues, customers/suppliers, tiling tools, products/profiles, materials/finishes, installation/site work, sales/office or brands/ranges. Names, short words such as Stu, and hyphenated phrases are supported (2–24 letters, 32 characters overall). The setter confirms relevance, team familiarity and spelling before locking it. Everyone else shares six mistakes and can submit a letter or a whole answer. A wrong answer costs one chance; duplicate guesses never cost an extra chance. Saving the setter’s avatar awards each guesser 1 point, with no reward for stumping the team. Each wrong guess adds a head, body, arm or leg to the elf; its head is the setter’s actual avatar. Solo practice supports both roles without scoring. Jack can pause, end a disputed word, or move to the next setter.
8. For timed listing and sales-pitch challenges, players perform aloud in Teams and Jack awards 0–3 points.
9. Listing and pitch turns rotate through the players who were ready when Jack started, so every solo turn belongs to Jack. Only Jack can pause the timer, choose games, move to the next card, adjust scores, return everyone to the lobby, reset the session or show the podium.

Refreshes restore the selected player. Presence expires after 20 seconds without a heartbeat. Jack can release a guest slot in the lobby if someone changes browser or device. A return to the lobby preserves scores but requires everyone to ready up again; Reset session clears scores and round progress.

## Shared state and authority

The site now runs a Vinext/Cloudflare Worker with its own D1 database. It polls shared state every 1.5 seconds, increasing to every 500 ms during Pictionary and Hangman. Drawing points are streamed in small batches about every 180 ms; local ink appears immediately. Ready status, active round, answers, timers, scores and stage changes are shared between devices. Polling failures pause controls rather than pretending the room is connected.

There was no dedicated Christmas project in the connected Supabase account, only an unrelated Barford golf project. That project was not changed. The game database is provisioned by Sites via the `DB` binding.

Anyone with the game link can enter without signing in. Selecting Jack gives that browser the ringmaster controls; the other three names are players. A random HttpOnly Secure SameSite cookie remembers each browser, and only a hash is stored in the room. Host authority is based solely on the selected Jack slot, with no email or platform account requirement. An active name cannot be claimed twice. In the lobby, a name becomes available to another browser after its previous device has been disconnected for 20 seconds.

Changes use a versioned compare-and-swap write with retry so concurrent answers and joins are not lost. Actions carry request IDs; stale card actions are rejected. The Pictionary deck and randomly chosen prompt IDs stay on the server; only the active drawer receives their word after starting. Even Jack receives no secret when guessing. Draw, undo and clear commands require the current drawer, round instance, turn and canvas revision. A compare-and-swap retry resolves concurrent correct guesses to one winner. The 120-second deadline is enforced by the server and appears finished on polling clients even without a browser completion command. Common word aliases, case, punctuation, spaces and leading articles are accepted. Drawings and guesses are bounded and reset between turns; the current pad survives refresh and pauses. Hangman likewise filters its submitted secret out of all other players’ API responses, including Jack and observers, until the result. Letter reveals, shared mistakes and cooperative points use the same atomic room writes. Category relevance is confirmed by the setter; there is no dictionary or semantic validation of custom colleague/customer names. No database migration is required.

## Development

- `npm run check`: TypeScript plus game-engine tests.
- `npm run test:integration`: actual API handlers against an isolated Miniflare/D1 database, using four independent sessions. Covers concurrent joins/answers, reconnect, hidden answers, shared scoring, host-only actions, stale requests and cross-origin checks, plus streamed Pictionary ink, private prompts, three simultaneous correct guesses, timeouts, Hangman private words, concurrent shared letters, duplicate-life protection, team scoring and solo play in all games.
- Use the Sites skill's build and publication helpers. Static GitHub Pages alone cannot run this version's shared backend.
- Schema: `db/schema.ts`; generated migration: `drizzle/0000_large_roulette.sql`.

Browser visual QA was unavailable in the build environment. TypeScript, game-engine and animation geometry tests and actual API integration checks cover solo play in all four games, shared intro timestamps, the server-enforced intro gate, refresh recovery, multiplayer scoring and host permissions. Full pointer/touch playback and layout remain unverified in a browser in this environment. Review the pad on the meeting devices before the event.

The intro clock is stored in the existing room JSON; no schema migration is needed. Polling clients resume at the current animation time after a refresh. Completion is determined by server time, not a browser animation event, so a slow or backgrounded device cannot trap the room. Reduced-motion visitors see the static logo swap while retaining the same shared progression. Return to lobby to replay the entrance; Reset session clears test scores and progress before the real meeting.


## Screen fit

The header, score strip and host dock use compact layouts. Every game is fitted into the remaining viewport by `StageFit`, using actual element measurements and ResizeObserver/MutationObserver. It responds to window changes, loaded fonts and the mobile visual viewport, including the on-screen keyboard. Any residual oversized stage is scaled as a complete unit so controls remain visible. The Pictionary pad has a height limit and maps pointer input through the SVG screen transform so resize and scaling do not move the ink away from the pointer. Small screens display the latest guess rather than requiring history scrolling. Help/score dialogs retain their own scrolling if required.

The sizing calculation has automated coverage for laptop, desktop, tablet, phone, landscape and keyboard-reduced dimensions. This verifies the fit calculation, not browser layout. Browser rendering remains unverified because managed browser QA is unavailable in this environment.

## Assets

Official Profilpas by Mapei logo, downloaded from the official Profilpas website on 12 October 2026:
https://cdnmedia.mapei.com/images/profilpaslibraries/logo/logo_profilpas-mapeib96bb4e2-2abe-4a13-9960-b38581f8e3b7.png?sfvrsn=c06a6088_6

The two festive WebP images in `public/assets` were generated with the built-in image generation tool: a clay elf party around a silver-profile Christmas tree, and a 3-by-2 character portrait sheet. Jack’s approved cartoon ringmaster portrait is `public/assets/jack-ringmaster.webp`, generated from his supplied photos with the cigarette and tile-trim baton. It appears in the lobby, player badge, scoreboard and podium. Richard’s approved cartoon elf portrait holding a BMW gift box is `public/assets/richard-bmw.webp`, generated from his supplied photos, and appears in the same locations. Stu’s approved cartoon elf portrait is `public/assets/stu-city-guinness.webp`, holding a Guinness and wearing a Manchester City shirt with a fictional League One badge for the team joke. It appears throughout the same avatar locations. Lauren’s approved cartoon elf portrait is `public/assets/lauren-vape.webp`, generated from her supplied photos with a purple vape and a curl of vapour. It appears throughout the same avatar locations, completing the four-player set.

Fonts: DM Sans and Playfair Display, with system fallbacks.


### Lauren entrance assets

- `public/assets/profilpas-correct-logo.png` is the exact logo supplied by Jack on 12 October 2026. It retains its transparent background. An SVG colour filter renders the lettering white and preserves the green symbol for contrast against the site. The actual header element is pulled down and returned to the same position; there is no separate bottom logo.
- `public/assets/lauren-intro-sprites.png` is a transparent 4 × 2 atlas generated with the built-in image tool from Lauren’s approved portrait. Prompt: preserve Lauren’s face, blonde hair, pointed ears, Santa hat, green festive outfit and forearm tattoo; extend to full body with striped tights and curled elf boots; create four run poses, a jump, an overhead throw, a braced rope pull, and a triumphant standing pose with her purple vape, each in an equal cell on a transparent background. A follow-up pass requested removal of all background while preserving poses and identity.
- The supplied logo is copied unchanged. The original pose atlas is retained as a source asset but is no longer used for playback. `public/assets/lauren-rig.png` is a single transparent full-body A-pose generated from the same approved portrait using the built-in image tool. Prompt: preserve Lauren’s identity, green festive outfit, tattoo, blonde hair and Santa hat; full-body front-facing neutral A-pose with arms separated from hips, striped tights, curled elf boots and the vape tucked into her belt; genuine transparency and no scenery. `lib/lauren-rig.js` continuously bends and interpolates twelve bones; a textured mesh is drawn by WebGL with a Canvas fallback. There are no discrete pose-image changes. Run cadence follows distance travelled, with longer run sections, eased acceleration, knee bends, arm swings and head follow-through. `lib/intro-scene.js` calculates the hand, rope and real-header-logo trajectories from measured screen coordinates. The real logo stays pinned while a narrow-screen device scrolls Lauren’s card into view. Shared timing remains in `lib/intro-timeline.js`.

### Full-body Hangman elves

Each setter now appears as a complete transparent character, with an awake and an eyes-closed sleeping version. Artwork references and the exact generation prompts are in `docs/full-elf-artwork.md`. The four atlases preserve the approved outfits and signature accessories.

Click/tap the elf (or focus it and press Enter/Space) to send your selected avatar into the scene. The server records the authenticated puncher, queues each 1.2-second entrance/punch/exit, and synchronises the impact, “Ouch!” and stars. Five requests within five seconds summon a masked hangman after the queued punches: entrance, grab, rope, short cartoon dangle, lowering and exit. The 6.4-second finale resets automatically from server time. Extra taps cannot restart or extend it. The decorative rope does not change the six-piece frame built by wrong guesses. Reduced-motion visitors retain identity, feedback and the sequence with stationary characters. The device voice toggle persists; generic browser speech speaks at impact after a user interaction. The bubble remains visible without audio.

Punches never affect letters, mistakes, the secret word, pauses or scores. They are participant-only, bounded, idempotent and reset for each setter. Multiplayer integration checks simultaneous taps and guesses against the real route with isolated D1. Live browser pointer/audio verification remains unavailable in this environment.

The Hangman frame starts empty. Each incorrect letter or whole-word guess builds one of six pieces: base, upright, top beam, top brace, foot brace and rope. New pieces draw into place; correct guesses and playful punches do not build the frame. It resets with the next word, while the complete avatar remains visible throughout.

Punching puppet assets and prompts are documented in `docs/punch-artwork.md`. `lib/punch-puppet.js` animates shoulders, elbows, body lean and walking legs continuously, with two WebGL canvas layers and a Canvas 2D fallback. The original four portraits, idle/sleeping full bodies and Lauren’s entrance remain intact.
