# Research migration

Status: complete for the available, relevant and permitted snapshot, refreshed after upstream PR #3. Research is not approved design or implementation scope.

Phase 6 retrieved `silveralcid/research` after the legacy, universal/game standards, Drive migration and web foundation work. Initial branch identity check: `2026-11-26T04:36:16Z` (November 25 in America/New_York). Refresh selected the next merged snapshot, `3629e5eaec87049d38a0c0f4269135b90beea5d3`, after the initial repository consolidation merged. No research-source files, refs or pull requests were modified.

| Branch | Commit | Decision |
|---|---|---|
| `main` | `3629e5eaec87049d38a0c0f4269135b90beea5d3` | Selected, includes merged PRs 1–3 |
| `backup/idle-game-re-2026-11-26-pass2` | `5986d2f1570abb0e39a0878687fe4746e6a2b003` | Merged in PR #3; new RimWorld and corrected Idleon |
| Initial `main` | `88163607cfd407230512650a5c6750e1b7a96f98` | Original consolidation snapshot; preserved in PR #1 history |
| `backup/idle-game-re-2026-11-26` | `bd413b3107778aa532c62404a4e45ad92aadf7cf` | Already merged; zero unique commits |
| `docs/game-research-handoffs-20261021` | `4e3ef1550be6ad32879370b51202b954267dd78c` | Already merged; zero unique commits |

## Coverage

[The imported library](../research/upstream/README.md) contains **200 copied files**: 171 Markdown documents, 16 analytical PNGs, ten aggregate-result text files and three original research-only HTML toys. This covers authored knowledge from all twelve available game studies and seven selected earlier engineering topics. The refresh updates 14 existing files and adds 15 RimWorld narrative/aggregate-output files. Three additional repository-authored navigation/qualification documents explain scope and source contradictions.

The original program, eleven study roots and every non-evidence/non-tool study subtree were inventoried. The refresh compares all four branch tips and confirms that the ten other study directories and the earlier engineering handoff subtree entries are unchanged; RimWorld's available non-evidence study subtrees were inventoried. The earlier catalog/evidence audit covering 35 packages was reviewed before selecting 18 useful documents. The full repository recursive-tree endpoint was too large for the connector; scoped immutable subtree inventories completed without truncation. Content retrieval used pinned file paths and each original file's Git blob was checked.

The [manifest](research-manifest.json) records source paths, Git blob IDs, SHA-256 hashes, byte counts, destination hashes, classifications and exclusions. Markdown changes are limited to a visible research-status/provenance prefix and link localization. Other artifacts retain exact bytes. The [offline migration validator](../../tools/validate_migration.py) checks destination integrity and complete local accounting.

## Deliberate exclusions and limits

All proprietary `evidence/` subtrees, including extracted/derived content tables, remain upstream. No extraction VM/toolkits, binaries, installers, saves or third-party game assets were copied. Seventeen Python models/helpers require excluded evidence; eight HTML prototypes embed bulk extracted data. The new RimWorld workbench and its three research-only test/project artifacts are also excluded individually, preserving its analysis and aggregate output. No donor code is executed or required. Other-project handoffs, issue mappings, unrelated frameworks and incomplete R27 were excluded.

Ten game studies document a completed independent review, including the corrected Legends of Idleon report. Idle Clans is labelled reviewed by its program but has no completed review record in its report. RimWorld is now included as a draft; its independent review is pending and no live colony profiling was performed. Known Super Auto Pets and Siralim contradictions are explicitly reconciled in the imported index, without rewriting historical source claims. No donor simulation, reverse-engineering pass or gameplay result was reproduced in this migration.

The source's private status and third-party-material restrictions were checked before selection. Every game-study manifest identifies material outside `evidence/` as independently written research, but embedded datasets in otherwise original prototypes were still excluded. Owner authorization covers the authored research migration; it creates no third-party production license. Research has no application imports or runtime dependency, and Vite's public-copy directory is disabled.

Future research can be incorporated by comparing source path and blob SHA, updating selected existing copies after review, and rerunning integrity/navigation checks. Do not automatically promote research into the Bible or release scope.
