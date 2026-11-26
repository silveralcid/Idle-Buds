# Research migration

Status: complete for the available, relevant and permitted snapshot. Research is not approved design or implementation scope.

Phase 6 retrieved `silveralcid/research` after the legacy, universal/game standards, Drive migration and web foundation work. Final branch identity check: `2026-11-26T04:36:16Z` (November 25 in America/New_York). No research-source files, refs or pull requests were modified.

| Branch | Commit | Decision |
|---|---|---|
| `main` | `88163607cfd407230512650a5c6750e1b7a96f98` | Selected, includes merged PRs 1 and 2 |
| `backup/idle-game-re-2026-11-26` | `bd413b3107778aa532c62404a4e45ad92aadf7cf` | Already merged; zero unique commits, one behind main |
| `docs/game-research-handoffs-20261021` | `4e3ef1550be6ad32879370b51202b954267dd78c` | Already merged; zero unique commits, twelve behind main |

## Coverage

[The imported library](../research/upstream/README.md) contains **185 copied files**: 157 Markdown documents, 16 analytical PNGs, nine aggregate-result text files and three original research-only HTML toys. This covers authored knowledge from all eleven available idle/incremental/creature-game studies and seven selected earlier engineering topics. Three additional repository-authored navigation/qualification documents explain scope and source contradictions.

The program, all eleven study roots and every non-evidence/non-tool study subtree were inventoried. The earlier catalog/evidence audit covering 35 packages was reviewed before selecting 18 useful documents. The full repository recursive-tree endpoint was too large for the connector; scoped immutable subtree inventories completed without truncation. Content retrieval used pinned file paths and each original file's Git blob was checked.

The [manifest](research-manifest.json) records source paths, Git blob IDs, SHA-256 hashes, byte counts, destination hashes, classifications and exclusions. Markdown changes are limited to a visible research-status/provenance prefix and link localization. Other artifacts retain exact bytes. The [offline migration validator](../../tools/validate_migration.py) checks destination integrity and complete local accounting.

## Deliberate exclusions and limits

All proprietary `evidence/` subtrees, including extracted/derived content tables, remain upstream. No extraction VM/toolkits, binaries, installers, saves or third-party game assets were copied. Sixteen Python models/helpers require excluded evidence; eight HTML prototypes embed bulk extracted data. Their authored analysis and aggregate outputs were retained, but these 24 executables were excluded individually in the manifest. Other-project handoffs, issue mappings, unrelated frameworks and incomplete R27 were excluded.

Nine game studies document a completed independent review. Idle Clans is labelled reviewed by its program but has no completed review record in its report; Legends of Idleon is pending. RimWorld was not backed up at the selected commit. Known Super Auto Pets and Siralim contradictions are explicitly reconciled in the imported index, without rewriting historical source claims. No donor simulation, reverse-engineering pass or gameplay result was reproduced in this migration.

The source's private status and third-party-material restrictions were checked before selection. Every game-study manifest identifies material outside `evidence/` as independently written research, but embedded datasets in otherwise original prototypes were still excluded. Owner authorization covers the authored research migration; it creates no third-party production license. Research has no application imports or runtime dependency, and Vite's public-copy directory is disabled.

Future research can be incorporated by comparing source path and blob SHA, updating selected existing copies after review, and rerunning integrity/navigation checks. Do not automatically promote research into the Bible or release scope.
