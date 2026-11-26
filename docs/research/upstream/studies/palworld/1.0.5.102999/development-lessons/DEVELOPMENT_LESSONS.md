> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/palworld/1.0.5.102999/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Palworld — Development Lessons
| Pattern | Why it works | Adopt? |
|---|---|---|
| All tuning in DataTables with `_Common` + composite overrides | Localization/platform layering without touching code; modders and tools can read it | Yes |
| Enemy variants = species row + rate multipliers (`EnemyMaxHPRate`, …) | One stat line per species, bosses by scalars | Yes |
| Hidden breeding rank with a nearest-neighbour rule + explicit unique overrides | Deterministic, explainable, and the override table gives designers escape hatches | Yes |
| Exposed world-rate settings (presets + ini) | Community servers tune difficulty without patches | Yes |
| Stats = fixed base + species term × level × (1+IV), multiplicative bonuses on top | Simple to reason about; IVs matter only on the scaling part | Yes |
| Capture formula unpublished and only in C++ | Players reverse it from the displayed percentage anyway; opaque math breeds calculator sites | Publish or tabulate it |
| Breeding ties resolved by a priority field that mirrors rank (rank×100) | Fine until two species share a rank; then only the priority separates them | Keep but document |
| Unversioned UE5 serialization without shipped mappings | Blocks third-party tools until someone dumps mappings | Ship a usmap for modders (they did for 1.0 via UE4SS community) |
