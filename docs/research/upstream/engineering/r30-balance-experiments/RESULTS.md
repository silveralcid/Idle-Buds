> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/causal-scenario-sensitivity-results/RESULTS.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Results and decision

**Decision: CONDITIONAL for synthetic experiments; NO-GO for production adoption or transfer of these effect magnitudes.** Treatments are interventions inside the stated synthetic simulator, not observational correlations or evidence about another system.

## Main comparative measurements

Each cell is mean score difference (candidate minus baseline) with paired percentile 95% bootstrap interval; 120 seed pairs per treatment and environment. `zero` is the exact no-op. Higher volatility is a different model regime, not a prediction of actual environmental probability.

| Volatility | Zero | Capacity only | Retry only | Harmful quality/retry | Capacity + retry |
|---:|---:|---:|---:|---:|---:|
| .05 | 0.000 [0.000, 0.000] | +.100 [.084, .118] | +.004 [-.009, .017] | -.123 [-.139, -.107] | +.078 [.061, .096] |
| .25 | 0.000 [0.000, 0.000] | +.143 [.124, .164] | +.027 [.011, .043] | -.094 [-.111, -.076] | +.120 [.099, .141] |
| .55 | 0.000 [0.000, 0.000] | +.219 [.191, .247] | +.079 [.060, .100] | -.029 [-.051, -.006] | +.204 [.174, .234] |

The combined capacity-plus-retry interaction contrast, `combined - capacity - retry + baseline`, was -.027 [-.038, -.017], -.051 [-.065, -.037], and -.094 [-.112, -.076] as volatility rose. Thus isolated effects do not add: the interaction is unfavorable and grows in magnitude in these regimes. The harmful policy's adverse-run count (at least 4 failures of 12 stages) was 47, 55 and 66 of 120 versus baseline counts of 5, 7 and 19; its paired score harm shrank from -.123 to -.029. This is a concrete reason to retain regime-specific and tail diagnostics.

An independently seeded comparison produced wider intervals. At volatility .55 the harmful intervention's independent-seed estimate was -.009 [-.054, +.034], while paired was -.029 [-.051, -.006]. At the no-op, the independent-seed point estimate was +.049 [-.011, +.101], while paired results were exactly zero. Independent seeds can make a true no-op look favorable by chance and can obscure the harmful sign at this sample size. This is a fixed synthetic cohort comparison, not a universal variance reduction guarantee.

## Uncertainty calibration and costs

On 200 repeated toy samples of 100 pairs each with known effects 0, +.2, and -.2, the paired percentile interval covered the true effect in 93.0%, 96.5%, and 93.0% of samples. Under the null, the empirical false-positive rate was 7.0% (14/200). This is a coarse Monte Carlo calibration, not evidence of nominal coverage under skew, rare tails, or other distributions. The finite known effects were generated with centered bounded treatment-specific noise; the exact seed formula and bootstrap settings are stored in `results/calibration.json`.

Benchmark measured 120 paired runs per arm across 3 volatility levels, 5 arms (1,800 pairs, 3,600 total paired and independent observation rows), with one warmup per arm in alternating order and alternating timed arm order by seed parity. In the final audit rerun, per-condition p50 paired evaluation latency ranged from 0.00103 to 0.02092 ms; p95 ranged from 0.00113 to 0.08036 ms. Timed wall duration ranged from 0.153 to 5.325 ms per 120-pair arm; the first condition includes JIT and scheduling noise. CPU user/system and RSS deltas (0 to 2,228,224 bytes) are in raw `results/benchmarks.csv`; tiny workloads and the virtual machine make these costs descriptive only. No comparative speedup is claimed.

## Hypotheses and alternatives

- H1 (capacity helps) passed in the three measured regimes; its paired effect rose with volatility in this simulator.
- H2 (no-op is null) passed exactly in paired outcomes; the independent-seed estimate illustrates why seed blocking matters.
- H3 (low quality/high retry harms) passed in mean direction and adverse-run counts, but effect size diminished under high volatility.
- H4 (capacity and retry effects do not add) passed: the interaction contrast was negative with intervals below zero at all three regimes.

Matched-seed counterfactuals are the main estimator because exogenous random draws are shared. Unpaired/bootstrap independent-arm estimates are reported as sensitivity analyses. A randomized blocked design would be appropriate where predeclared environment blocks differ. A factorial design is represented by four arms for capacity/retry interaction. A bounded sweep is used instead of a high-dimensional search. No adaptive interim stopping or seed search is used. A deliberately biased comparator that adds .2 to a true zero contrast is rejected by the test suite.

## Reliability, execution, and failures

Final audit test execution: 12 tests passed, 0 failed, 0 skipped, exit 0. Strict `npx tsc --noEmit`, design, validation, run, report and benchmark commands completed successfully. The audit added checks for corrupted checkpoints, complete-matrix reporting, known-effect interval directions, and post-hoc seed-subset rejection; checkpoint writes are atomic. During development, tests exposed a non-harmful fixture, a fuzzer bound that ignored multi-stage counts, and a floating-point equality assumption; each was corrected and rerun. History and exact command outcomes are retained in `results/manifest.json`. No inaccessible external dataset or account was used. Source tests and synthetic fixtures remain within this workstream.

Limitations include the deliberately simple model, small regime set, exploratory multiple comparisons, bootstrap approximation, and absence of external model validation. Adoption is justified only for controlled synthetic work with predeclared seed sets and complete outputs. Production policy use remains NO-GO.
