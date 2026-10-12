# Profilpas 2026 Christmas Games

A shared four-player games centre for Richard, Stu, Jack and Lauren. Jack is the ringmaster and controls the whole room.

Live site: https://profilpas-christmas-games-2026.jackmoycetroth.chatgpt.site

Source: https://github.com/Highstreetwebco/Profilpaschristmasgames

## Player flow

1. Each person opens the same link on their device and chooses their own name.
2. Their card becomes ready on every screen. A name cannot be claimed twice.
3. When all four players are ready and connected, Jack starts the session.
4. Jack selects a round; all screens follow automatically.
5. Quiz and emoji answers are submitted individually, then Jack reveals the result. Points are calculated on the server. For timed listing and sales-pitch challenges, players perform aloud in Teams and Jack awards 0–3 points.
6. Only Jack can pause the timer, choose games, move to the next card, adjust scores, return everyone to the lobby, reset the session or show the podium.

Refreshes restore the selected player. Presence expires after 20 seconds without a heartbeat. Jack can release a guest slot in the lobby if someone changes browser or device. A return to the lobby preserves scores but requires everyone to ready up again; Reset session clears scores and round progress.

## Shared state and authority

The site now runs a Vinext/Cloudflare Worker with its own D1 database. It polls shared state every 1.5 seconds. Ready status, active round, answers, timers, scores and stage changes are shared between devices. Polling failures pause controls rather than pretending the room is connected.

There was no dedicated Christmas project in the connected Supabase account, only an unrelated Barford golf project. That project was not changed. The game database is provisioned by Sites via the `DB` binding.

Jack signs in using the site's owner account. `HOST_EMAIL` is stored as a protected runtime variable; the server binds the Jack role to that authenticated site's user ID on first join. Guest selection never confers host authority. Platform identity headers are consumed only server-side. Anonymous-compatible guest sessions use random HttpOnly Secure SameSite cookies, hashed before storage. Guest readiness depends on the hosting audience permitting entry. The site currently retains its owner-private audience: Richard, Stu and Lauren need access grants, or an explicitly approved switch to public link access, before they can enter from their own accounts/devices.

Changes use a versioned compare-and-swap write with retry so concurrent answers and joins are not lost. Actions carry request IDs; stale card actions are rejected. Correct answers and other players' submissions are withheld from API responses until the reveal. Game source is public in GitHub, so the quiz is an informal team activity rather than a cheat-proof examination.

## Development

- `npm run check`: TypeScript plus game-engine tests.
- `npm run test:integration`: actual API handlers against an isolated Miniflare/D1 database, using four independent sessions. Covers concurrent joins/answers, reconnect, hidden answers, shared scoring, host-only actions, stale requests and cross-origin checks.
- Use the Sites skill's build and publication helpers. Static GitHub Pages alone cannot run this version's shared backend.
- Schema: `db/schema.ts`; generated migration: `drizzle/0000_large_roulette.sql`.
- Set the protected production `HOST_EMAIL` runtime value to the intended host account before deployment. Do not put its value or any credential in the repository.

Browser visual QA was unavailable in the build environment. Core state-machine and actual API integration checks passed. Review on the meeting devices before the event.

## Assets

Official Profilpas by Mapei logo, downloaded from the official Profilpas website on 12 October 2026:
https://cdnmedia.mapei.com/images/profilpaslibraries/logo/logo_profilpas-mapeib96bb4e2-2abe-4a13-9960-b38581f8e3b7.png?sfvrsn=c06a6088_6

The two festive WebP images in `public/assets` were generated with the built-in image generation tool: a clay elf party around a silver-profile Christmas tree, and a 3-by-2 character portrait sheet. The four current portraits are festive stand-ins, not likenesses of the team. Personal caricatures still require reference photos.

Fonts: DM Sans and Playfair Display, with system fallbacks.
