# 404 — You Are the Bug

A complete browser based narrative puzzle game. The in-game desktop and browser are fictional: gameplay never reads real browser tabs, cookies, history, files, or operating system data. Campaign saves and settings stay in the browser's local storage on this device.

<p align="center">
  <a href="https://404-you-are-the-bug.vercel.app/">
    <img src="https://img.shields.io/badge/%E2%96%B6%20PLAY%20THE%20GAME-67f59b?style=for-the-badge&labelColor=101720" alt="Play the game" />
  </a>
</p>

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

## System Memory workspace

Open **System Memory** from the desktop shortcut, taskbar, or the home page quick actions. It contains the blueprint's connected optional systems:

- **Virtual Files** has authored files, search, preview, fictional timestamps, ownership, status, and checksums. Inspecting files records clues and exploration milestones.
- **Behavior** shows only in-game counters. Later home pages acknowledge route visits and recovered systems; these counters never gate the campaign.
- **Case Board** becomes available during Level 4. Inspect both `observer_backup.old` and `history_H-03.snap` before marking the Observer's claim as doubtful.
- **Mirror Mode** is available in Levels 6 and 9. Switch to the mirrored world and apply the reversed four-symbol sequence.
- **Future Mail** unlocks at Level 3, with later story messages at Levels 8 and 9. Messages use fictional game ticks, attachments, threads, replies, flags, and archive state.
- **Recovery** offers an authored simulated history-index failure in Level 5 and later. Restore it from the virtual backup; the real browser remains responsive.
- **Nested PC** unlocks at Level 3. Open the child desktop and send its explicit `PARENT_TOKEN` signal to the outer instance.
- **Diagnostics** lists saved typed events, feature flags, and current level prerequisites. Developer-only feature flags can be toggled here.
- Completing Level 8 triggers the checkpointed Reality Breaker update and changes the simulated desktop theme for the next sector. The Level 9 briefing summarizes the reveal and can be continued immediately.

Optional discoveries and all system state save with the versioned campaign. Hidden achievements stay concealed in the collection until earned. These systems use authored game content only; they do not use real browser history, files, mail, device time, or system data.

### Authoring guidance

Campaign routes, objectives, lessons, hints, and memory fragments are defined in `src/engine/campaign.ts`. Fictional hosts and route keys live in `src/engine/navigation.ts`; deterministic progression prerequisites and sequence rules live in `src/engine/puzzles.ts`. The shared persisted `FeatureState` and event recording actions are in `src/types.ts` and `src/store/gameStore.ts`. Add authored virtual-file, email, or presentation content in `src/components/windows/UtilityWindow.tsx`; give each progression-critical interaction an event and an explicit flag prerequisite. Use game ticks for fictional chronology, keep optional content outside required stage flags, and make every authored failure recoverable.

## Quality checks

```sh
npm run test
npm run build
```

The engine tests cover fictional URL normalization, protected routes, puzzle ordering, synchronized tabs, stealth routing, stage completion, terminal command safety, deterministic event persistence, evidence prerequisites, nested parent signals, simulated failure recovery, and fictional email state.

