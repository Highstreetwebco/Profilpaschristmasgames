# Profilpas 2026 Christmas Games

A festive, responsive host-led games room for the Profilpas end-of-year Teams meeting. Built with HTML, CSS and JavaScript; no installation or build step is required to serve `dist/`.

## What works

- Four playable rounds: 10-question Festive Quiz, 8 Emoji Cracker clues, 8 timed listing challenges and 8 “Sell It to Santa” pitches.
- Editable player/team line-up, six generated festive characters, nicknames and optional personal avatar uploads.
- Host-controlled timers, answer reveals, manual scoring, duplicate-award prevention, score correction, undo and tied-winner celebrations.
- Browser-local saved progress, backup export/import and round replay.
- Responsive layout, keyboard-accessible native dialogs and reduced-motion support.

## Running the meeting

1. Add players or teams, choose characters and nicknames.
2. Download a backup; rehearse a round, then use Reset scores.
3. Share the site window in Teams. Keep one host and one active browser tab.
4. Players answer aloud or in Teams chat. The host reveals answers and awards points.
5. Rotate participants fairly in the dash and sales pitches. Finish on the leaderboard.

Scores and photos are local to the host browser. They are **not** synchronised between devices. Backups include uploaded photos. This first version does not have a Supabase backend: the only connected project during setup belonged to a separate Barford golf site and was left untouched. A dedicated project and confirmed organisation are required before adding shared multiplayer state.

The six generated characters are generic starter avatars, not likenesses of employees. Personal caricatures require a confirmed team roster and photos; finished caricatures can be uploaded on player cards.

## Development

Run `npm run check` to check JavaScript syntax and run the scoring/persistence tests. Serve the `dist` directory using any static HTTP server. No runtime packages or package installation are required. The root `index.html` is a convenience redirect for GitHub Pages branch hosting; `.nojekyll` disables Jekyll processing.

Private hosted site: https://profilpas-christmas-games-2026.jackmoycetroth.chatgpt.site

Source: https://github.com/Highstreetwebco/Profilpaschristmasgames

GitHub Pages was not enabled at creation. The working private deployment uses Sites. To use GitHub Pages later, select the `main` branch and root folder in the repository’s Pages settings.

## Assets and verification

The Profilpas by Mapei logo is the original transparent logo from the official Profilpas website, downloaded 12 October 2026:
https://cdnmedia.mapei.com/images/profilpaslibraries/logo/logo_profilpas-mapeib96bb4e2-2abe-4a13-9960-b38581f8e3b7.png?sfvrsn=c06a6088_6

`dist/assets/christmas-workshop.webp` and `dist/assets/festive-avatars.webp` were created using the built-in image generation tool. Briefs: a tactile clay Christmas party with elves, a gold trophy, a silver-profile Christmas tree and presents against forest green; and six coordinated festive character portraits in an equal 3-by-2 grid for the avatar picker. The app crops the sheet in CSS, retaining the original asset.

Fonts: DM Sans and Playfair Display from Google Fonts, with Arial/Georgia fallbacks.

Automated checks cover scoring, duplicate awards, undo, ties, backup validation and round progress. Browser visual QA was unavailable in the build environment; test the site on the host’s meeting device before the event.
