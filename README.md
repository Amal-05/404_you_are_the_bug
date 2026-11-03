# 404 — You Are the Bug

A complete browser based narrative puzzle game. The in-game desktop and browser are fictional: gameplay never reads real browser tabs, cookies, history, files, or operating system data. Campaign saves and settings stay in the browser's local storage on this device.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```sh
npm install
npm start
```

Open <http://127.0.0.1:4173> in Chrome, Firefox, or Edge. Use `npm run build` to create the production bundle in `dist/`; use `npm run preview` to serve that bundle locally at <http://127.0.0.1:4174>.

## Controls and play

- Select **How to Play** from the title screen or the `?` control in the simulated browser.
- Level 0: find `404` on the Help Center and `welcome` in Personal Archive. Enter `home.local/404/welcome` or `home.local/welcome/404` in the game address bar to continue.
- From the title screen, use **Continue Session** to resume or **Level Select** to replay any unlocked sector.
- In a sector, use **Level Select** in the bottom taskbar to switch to an unlocked sector. Completed sectors remain replayable.
- Progress saves automatically. The pause menu, clue journal, settings, hint system, and level picker stay available during play.
- `Ctrl/Cmd+L` focuses the fictional address bar, `Ctrl/Cmd+T` opens a simulated tab, `Ctrl/Cmd+W` closes a simulated tab, `Ctrl/Cmd+R` reloads the simulated page, `Esc` pauses, and `F11` toggles fullscreen.
- The game address bar only routes fictional story pages. Real website addresses display a blocked page and are never fetched.

## Campaign

The campaign has eleven main sectors (0–10) and one hidden sector. Its puzzles use route fragments, tab timestamps, reconstructed URLs, browser history, simulated cookies, ordered error responses, synchronized tabs, an Observer stealth sequence, a fictional command interpreter, and combined browser systems. Level Select becomes available from the title screen and the taskbar. Recover all eleven hidden memory fragments to unlock the secret sector.

## Quality checks

```sh
npm run test
npm run build
```

The engine tests cover fictional URL normalization, protected routes, puzzle ordering, synchronized tabs, stealth routing, stage completion, and terminal command safety.

The original adaptive ambient soundtrack changes across campaign sectors. Background music, master volume, and mute controls are available in Settings; audio unlocks after your first interaction to respect browser playback rules.
