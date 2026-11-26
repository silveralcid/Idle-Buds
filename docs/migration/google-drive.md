# Google Drive migration

Source: [Idle Buds - Planning](https://drive.google.com/drive/folders/1w4zPtxCDCE8KrqCmZIxu98A7DT3LO9kQ). All five direct children were retrieved. The paginated folder API returned no continuation token and no subfolders, so the recursive traversal has one folder and one page. No source file, folder, sharing setting or permission was modified.

| Source | Repository home | Treatment |
|---|---|---|
| Game Development Constitution | [Constitution](../project/CONSTITUTION.md) | Full adopted wording plus an explicit pointer to the current scoped owner exception |
| Game Design Bible v0.1 | [Bible index](../design/design-bible.md) and its 14 topical sections | Complete source text partitioned at coherent existing section boundaries; no design promoted by migration |
| Idea Incubator | [Incubator](../design/idea-incubator.md) | Full ideas, holds, qualification process and promotion history retained |
| Living Game Design & Research Log | [Design history](../research/design-history.md) | Full chronological decisions, research, resource links, alternatives and owned-asset notes retained; explicitly historical/evidentiary |
| Art Direction Rounds 1–2 HTML | [Art reference](../reference/art/README.md) | Original self-contained visual file retained byte-for-byte, including notices |

## Fidelity and navigation

All four native documents were exported using Google's Markdown format and read through the native Docs API to inspect tabs and embedded structures. Their original Markdown export bytes are retained in [the source snapshot ZIP](../archive/drive/2026-11-25-native-markdown-exports.zip). The active copies add status/navigation notes and replace links among the five migrated sources with repository-relative links. External research/resource URLs remain attributed sources.

The [machine-readable inventory](drive-manifest.json) records source IDs, titles, MIME types, modification/revision metadata, source SHA-256 values, destinations and Bible segment character ranges/hashes. The segments cover the entire Bible export in order without gaps or dropped content. Plain-text native structure and visual-reference checks are recorded in the final verification evidence.

The Bible was divided by subject to keep ordinary agent context small. The complete Incubator and historical log remain coherent registries, with explicit per-file context-budget exceptions of 16,000 and 42,000 estimated tokens. They are searchable references, never mandatory whole-file startup context. No source text was discarded to satisfy a token budget.

See [authority and scope](../design/AUTHORITY.md) for overlapping checkpoints, retained historical alternatives and the owner's current foundation-only authorization. The repository owns future edits; the source Drive folder is a historical backup.

## Content integrity result

All four native Docs have one tab and no embedded images, tables, footnotes, dropdowns or suggestion markers. After normalizing Markdown formatting, the ordered word tokens match native document text exactly: Constitution 999, Incubator 8,324, research log 21,805 and Bible 16,761. All 19 native hyperlink targets remain represented. These checks establish text/link coverage, not approval of every statement.

The visual file contains 33 nested art boards and 88 unique bundled resources. Its full original bytes and font notices are retained. One board references an optional external Google Fonts stylesheet; the source snapshot is not altered to remove it. No Drive access is required to read the migrated content.

The separate Drive comment surface was checked for every file, including deleted threads: all five returned zero comments and no continuation page.
