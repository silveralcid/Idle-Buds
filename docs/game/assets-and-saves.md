# Assets, data and save integrity

**Owner:** game-specific handling of production assets, content and durable player state. This is engineering guidance, not approval of a save format, asset style, retention policy or gameplay system. See [source adaptation](../migration/game-standards.md) and [general security](../engineering/SECURITY.md).

## Asset and content ownership

Keep approved production assets separate from research, reverse-engineered material and historical prototypes. The application build must consume only intended runtime files. A copied research file, public repository or possessed archive is not evidence of distribution rights.

Before introducing an asset into a shipping path, record its source, creator when known, license/permission, required notice, modifications and production-use status in the existing asset inventory. Preserve applicable notices with the distributed package. For generated work, retain sufficient generation/source information to review rights and avoid misrepresenting provenance. Unknown rights mean reference-only until resolved; do not copy reference-game art or code into runtime to fill a placeholder.

Use stable content IDs and simple project-relative asset paths. Keep editable source material distinguishable from optimized runtime exports when both exist. Validate missing references and load failures in the real packaged application. Measure bundle impact before adding compression, atlases or a more elaborate loading pipeline. No external asset service or generator is required merely to establish these conventions.

## Save boundaries when implemented

Define one owning save contract when the first approved persistent behavior is built. Use an explicit schema version, stable IDs and a data-only payload. Validate untrusted saved data before changing live state: shape, supported versions, identifiers, finite values and relevant bounds. Choose actual limits from the contract, not copied starter constants.

Version migrations deliberately. Test supported older saves and explicit handling of future/unsupported versions. Preserve recoverable data during migration; do not overwrite a user's only copy before a new payload is validated and persistence succeeds. Where transactions or atomic replacement are available, use them proportionally. Keep corrupt-save recovery and reset scope clear to the player.

Browser storage may fail, be denied or reach its quota. Expose the actual persistence result and a useful recovery path. Never report a save as successful because serialization alone succeeded. Whether session-only continuation, export/import, cloud sync or multiple save slots exist is an approved product decision, not a requirement created here.

## Time, lifecycle and deterministic data

When implementing approved idle/offline behavior, define how saved timestamps, elapsed time, pause, visibility changes and repeated resumes interact. Guard against invalid/future timestamps and applying the same interval twice. Preserve intended progress on refresh and after failures. Offline earnings limits and progression formulas belong in approved design.

Keep generator/content versioning explicit where a seed is intended to recreate content. A seed alone cannot reproduce an earlier algorithm or changed content table. Record enough version information for the promised compatibility, without creating an unused migration framework. Use the [game testing guidance](testing.md) for meaningful success, boundary and failure cases.
