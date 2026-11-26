# Miyu continuation: Idle Buds MVP

## Owner instruction and model

Silver authorized building and merging MVP Execution Blueprint v2 on November 26, 2026 and explicitly requested Miyu continue unfinished work in **Cloud Work or the server rig using Sol at Extra High effort**. The implementing chat used GPT-6.2 Sol / `xhigh` for the bounded coding lanes. Use that available Sol tier on continuation; do not silently substitute a different requested model.

This file is a durable handoff, not a dispatch receipt. The originating chat cannot establish that a separate Miyu session or machine task has started. The original implementation is recorded in [PR #5](https://github.com/silveralcid/Idle-Buds/pull/5) and [issue #6](https://github.com/silveralcid/Idle-Buds/issues/6). A later owner instruction explicitly authorized the Experience MVP in one PR with no new issues and merge after verification. Read its [evidence report](../evidence/experience-mvp-2026-11-26.md) and live Git state before taking work. Cross-machine coordination remains in the existing [shared record](https://github.com/silveralcid/jasmine-dragon-cloud/issues/1); verify ownership before starting a second writer.

## Resume from actual current main

Repository: [silveralcid/Idle-Buds](https://github.com/silveralcid/Idle-Buds). Read `AGENTS.md`, [Current Release Specification](CURRENT-RELEASE.md), the [implementation report](../evidence/mvp-implementation-2026-11-26.md), and only the relevant Blueprint packet. Inspect live Git/PR/CI state and preserve any newer work. The old planning-only restriction is superseded for this specific owner-authorized MVP implementation; do not claim BEAT BAES shipped. Do not restart the plan, foundation, database, rules engine or UI.

Create an isolated continuation branch from fresh main only if work remains. Keep one integration owner; delegate disjoint paths after checking interfaces. Do not force push, reset another workspace, deploy publicly, purchase services or expand content.

## Run and play

```sh
npm ci
npm run play
```

Open `http://127.0.0.1:3000`. Normal mode registers empty accounts. Starter loop: Mining / Scrap until you have three; Crafting / Capture Kit; Combat / Patrol Earth; assign the caught Bud to an eligible production skill. Starting the next activity replaces the Tender's previous one automatically. Gathering repeats until stopped; Bud work runs independently of the Tender, with one Bud per skill. If capture fails, craft another kit and repeat. Close the browser, return and inspect saved work/XP. No gifted first Bud, no browser-authoritative rewards. Use `npm run play:lan` for the same persistent world on a trusted home-network phone.

For a separate progressed multiplayer fixture:

```sh
npm run playtest
```

Use `alpha` and `beta` in separate browser sessions; `fresh` is empty. Test-only password: `Local-playtest-only-2026`. This database stays loopback-only. Existing fixture progress is retained. `npm run playtest:reset` explicitly resets only this local `idle_buds_test` fixture, never normal accounts. Node 24 and a nonroot execution account are required by the default local database launcher. An existing PostgreSQL service can be supplied through `DATABASE_URL` without creating a new infrastructure platform.

## Verification and next bounded work

```sh
npm run lint
npm run typecheck
npm run setup:browser
npm test
npm run test:restore
npm run experiments
npm run experiments:world
python3 tools/repo.py check --tests
python3 tools/repo.py docs budget --strict
python3 tools/validate_migration.py
npm audit --audit-level=high
```

The report names exact completed checks and open gates. Reproduce only outstanding or host-dependent failures; do not repeat broad audits. Playwright's normal browser download is the default. The originating environment's official CDN access failed; isolated packaged Chromium 158 was qualified as a local test fallback. That temporary testing package is not a runtime dependency. If using an existing browser, set `PLAYWRIGHT_EXECUTABLE_PATH` and record its version.

Priority order: resolve any remaining engineering blocker recorded on the current PR; run an observed fresh/progressed/multiplayer owner session through the new interface; qualify physical phone/controller use; observe the provisional stack/slot economics; then address measured combat-style dominance with one bounded tuning/retest cycle. Browser viewport and synthetic Gamepad API tests establish interface behavior, not physical-device acceptance. Preserve baseline plus at most two variants, one tuning/retest cycle, explicit pass/fail and a stopping decision. New feature ideas go to the existing Incubator. Do not treat missing human feedback as a reason to rewrite working systems.

## Completion contract

Commit any necessary fixes and update the same implementation report with exact source, tests, remaining limits and next action. Existing user authorization covers scoped implementation and merge; respect protections and meaningful verification. A merge is not deployment. Report whether the game is engineering-ready, whether humans have actually played it, and whether any server has actually been enabled as three separate facts.
