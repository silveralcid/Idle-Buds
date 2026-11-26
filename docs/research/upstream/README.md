# Imported research snapshot

**Research and reference only.** These materials do not approve game design, implementation, architecture or release scope. Use the [Idea Incubator](../../design/idea-incubator.md) and [authority rules](../../design/AUTHORITY.md) before adopting a new idea. Source headings such as “Adopt,” “GO,” and “integration contract” describe donor recommendations, not Idle Buds instructions.

Imported November 25, 2026 (America/New_York), from `silveralcid/research` main [`88163607cfd407230512650a5c6750e1b7a96f98`](https://github.com/silveralcid/research/commit/88163607cfd407230512650a5c6750e1b7a96f98). The two other branches were already merged and had no unique commits. The source remained unchanged. [Migration coverage](../../migration/research.md) and the [file manifest](../../migration/research-manifest.json) record every imported source path, original Git blob/hash, destination hash and excluded executable file.

## Start with the question

| Study | Useful reference for Idle Buds | Source review status |
|---|---|---|
| [Koltera 7.0.0](studies/koltera/7.0.0/FINAL_REPORT.md) | Collection goals, creature work, breeding probabilities and geometric progression walls | Completed review documented |
| [Koltera 2 5.4.0](studies/koltera-2/5.4.0/FINAL_REPORT.md) | Creature labor allocation, specialization, unlock gates and online/offline divergence | Completed review documented |
| [Melvor Idle 1.3.1](studies/melvor-idle/1.3.1/FINAL_REPORT.md) | Shared online/offline rules, resource depletion, mastery and save identity | Completed review documented |
| [Melvor Idle 2 0.11.7 alpha](studies/melvor-idle-2/0.11.7-alpha/FINAL_REPORT.md) | Pure stat dependencies, chance-or-progress rules and distinguishing wired from dormant content | Completed review documented; alpha findings |
| [Milky Way Idle](studies/milky-way-idle/steam-3224420/FINAL_REPORT.md) | Server authority, visible formulas, production inputs, markets and progression tails | Completed review documented |
| [Idle Clans 1.6800](studies/idle-clans/1.6800/FINAL_REPORT.md) | Shared skill curves, public data, social progression and information load | Program claims review; report still has an unfilled review section |
| [Super Auto Pets](studies/super-auto-pets/steam-2026-11-25/FINAL_REPORT.md) | Seeded battle structure, ability composition, trigger ordering and shop probability | Two review passes documented; later pass supersedes older assumptions |
| [Kadomon](studies/kadomon/steam-2026-11-25/FINAL_REPORT.md) | Creature identity, effect composition and simulation/presentation coupling | Completed review documented |
| [Palworld 1.0.5.102999](studies/palworld/1.0.5.102999/FINAL_REPORT.md) | Creature production roles, breeding graphs and data organization | Completed review documented; native formulas retain uncertainty |
| [Siralim Ultimate 2.0](studies/siralim-ultimate/2.0-gms-2024.14/FINAL_REPORT.md) | Trait combinations, stat identity and ability-system maintenance costs | Completed review documented; correction notes below |
| [Legends of Idleon build 144](studies/legends-of-idleon/build-144/FINAL_REPORT.md) | Parallel progression, account-wide production and long-term pacing | Draft; independent review pending |

Each study preserves its complete authored reports and topical notes. `architecture/`, `gameplay/`, `progression/`, `economy/`, `mathematics/`, `content/`, `user-experience/`, `development-lessons/` and `experiments/` provide the deeper reading. The [cross-game comparison](comparative-notes.md) is a historical overview with the corrections below. [Original program context](program-source.md) retains the research method and rights restriction.

[Earlier engineering research](engineering/README.md) adds seven focused topics: numbers, failed-operation isolation, save recovery, protocol compatibility, paired balance experiments, offline catch-up and economy conservation. It contains 18 authored documents, not their executable frameworks.

## Corrections and evidence limits

Preserve these precedence rules when using the copied material:

1. **Super Auto Pets:** [final report §17](studies/super-auto-pets/steam-2026-11-25/FINAL_REPORT.md#17-pass-2--native-decompilation-completed) and [decompiled rules analysis](studies/super-auto-pets/steam-2026-11-25/mathematics/DECOMPILED_RULES.md) supersede older wiki-based numbers. The later account describes independent draws with replacement, except Unique pets, and no duplicate penalty. The original `shop_odds.png` annotation is stale. [Chart notes](studies/super-auto-pets/steam-2026-11-25/mathematics/charts/README.md) explicitly mark it superseded. Older charts use a limited wiki sample, not the later full native roster.
2. **Siralim:** [final report §16](studies/siralim-ultimate/2.0-gms-2024.14/FINAL_REPORT.md#16-independent-review) corrects the decoder and level-cap claims. Ordinary creatures are described as capped at `50 + 10 × gene strength`; nether creatures and the specified special case are uncapped. Earlier “no cap” and “226 placeholder traits” wording remains in the comparative/development summaries for fidelity and must not override that correction.
3. **Idle Clans:** the program's completed-review label is not supported by a filled review record in the imported report. Treat it as an upstream claim. **Idleon** remains pending. **RimWorld** was not available in this source snapshot and is not represented as imported.
4. “VERIFIED,” “computed” and test-result tables describe the upstream researchers' evidence. This migration verified file identity, selection and navigation; it did not repeat reverse engineering, simulations or gameplay measurements. Server behavior inferred from clients or community tools remains uncertain where the authors say so.
5. These findings are version-specific historical observations. Prices, balance, formulas and service behavior may change. Revalidate the particular claim before an approved design or implementation depends on it. Negative findings and uncertainty are retained.

## Supporting artifacts and rights

The snapshot includes 16 original analytical plots, nine aggregate simulation-output text files and three small, self-contained HTML research toys with invented content: [collection](studies/koltera/7.0.0/prototypes/collection_idle_prototype.html), [shared predictor](studies/idle-clans/1.6800/prototypes/shared_sim_prototype.html), and [ability composition](studies/super-auto-pets/steam-2026-11-25/prototypes/autobattler_dsl_prototype.html). These are historical experiments, not Idle Buds gameplay. Their source was inspected for external requests and imported assets; they have no external dependencies. They were not executed as part of game acceptance.

Each study's original `MANIFEST.md` declares the authored reports/models/prototypes separate from private third-party `evidence/`. **No evidence directory, extracted game code, raw or derived bulk content table, game asset, installer, save, credential, extraction toolkit or VM backup was transferred.** All 16 Python models/helpers depend on excluded evidence and were excluded. Eight other HTML prototypes embed extracted tables and were excluded even though their interfaces were authored independently.

The source repository has no general license granting third-party production rights. These owner-held research outputs were copied under the owner's explicit migration instruction. Named games, formulas and observations are reference material; this is not permission to reuse their expression, names, art, code or data in the game. Existing notices travel with selected historical engineering prose. All imported content stays under documentation; the web build does not copy it.

## Updating this snapshot

Fetch the research repository read-only when an update is requested. Compare source path plus Git blob SHA in the manifest before copying. Review changed findings, evidence status and rights; update the existing copy instead of adding duplicate authoritative files. Preserve meaningful corrections in these notes, update hashes and run the migration/documentation checks. Keep prior snapshots recoverable through Git history. New findings enter the Incubator; no automatic synchronization, execution or promotion is configured.
