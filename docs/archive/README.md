# Legacy archive

Status: historical reference only. No legacy design or code is approved for the new implementation by this archive.

The original active tree was archived on November 25, 2026. Git history was preserved without rewriting or force pushes. All 50 original branch tips remain reachable from the eight remote archive branches listed in [the branch inventory](legacy-branches.json); the original branches were also retained.

- Main snapshot: `archive/legacy-2026-11-25`, commit `665a7c267894e4d67f6a575a157e7e452e128356`.
- Latest implementation: `archive/2026-11-25-combat-foundations-equipment-setup`, commit `0c6593af21ca064c929dd32f2bb3a4e3dca78c9b` (22 commits ahead of old main).
- Six divergent tips have individual `archive/2026-11-25-*` branches.

## Read the old project

```sh
git fetch origin
git worktree add ../idle-buds-legacy origin/archive/legacy-2026-11-25
# Latest unmerged combat reference:
git show origin/archive/2026-11-25-combat-foundations-equipment-setup:README.md
```

Inspect historical code in a separate worktree. It is excluded from active builds, tests, dependencies, assets, and AI instructions. Nothing has been deleted from its recoverable Git history.

## Reuse assessment

Reusable knowledge includes the data-driven separation of definitions and instances, offline progression pitfalls, save import/export lessons, and small feature-oriented modules. Reimplement only against current approved design and focused tests. Old code is not a required foundation.

Legacy `README.md`, `.windsurfrules`, and `ib-docs/` contain obsolete mechanics and technology assumptions. Older art prompts and three sprite PNGs lack a production provenance record. `inspo/code/` holds third-party reference JavaScript without a verified redistribution license. These remain solely in recoverable historical refs, outside the active tree and game bundle.
