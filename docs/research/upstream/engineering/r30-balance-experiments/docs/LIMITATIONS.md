> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/causal-scenario-sensitivity-results/docs/LIMITATIONS.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Limitations

- The process is a compact synthetic model; queue/failure equations and parameter ranges are assumptions, not calibrated empirical facts.
- A seed creates common random numbers, but the seed mapping is not a faithful model of a real system's correlated exogenous environment.
- Only one score definition and one adverse threshold are implemented. Score aggregation may hide stage-specific harms; inspect `stageScores` and failure counts.
- Twenty seeds in the default CLI fixture are demonstrative. The comparative study uses 120 per arm and regime, still small for tail behavior and robustness claims.
- Percentile bootstrap intervals are approximate. Calibration covers a simple toy paired distribution only, not heavy tails, correlated blocks, rare catastrophic events or all sample sizes.
- Multiple exploratory treatments and environments create multiplicity. No adjusted p-values or confirmatory ranking guarantee is provided.
- The parameter sweep is bounded to listed arms and three volatility settings. It does not prove global robustness or find an optimum.
- Timing and RSS measurements are noisy VM measurements and should be treated as descriptive; no external performance claim is made.
- There is no adaptive stopping, but future users could cherry-pick seeds or report only favorable arms. Manifest and complete raw seed outputs must accompany conclusions.
- Tests cover deterministic replay, input validation, selected effect signs, checkpoint resume, randomized order and a deliberately biased comparator. They do not prove correctness for all manifests or production systems.
