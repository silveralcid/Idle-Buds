> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/market-quote-exchange-results/RESULTS.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Results

## Summary

The implementation compares a fixed reference baseline, a bounded capacity/availability spread, and a deterministic sorted midpoint matcher. It uses only synthetic proposal records and canonical integer minor units. The matcher produces proposed matches but cannot execute or record a transfer.

## Hypothesis outcomes

- **H1 supported:** the capacity policy moved the quote by 20 minor units down at abundance and 21 up at scarcity (100-minor reference), within configured -20% / +30% policy bounds. The abrupt scenario used 80 then 121, a 41-minor spread; the fixed reference stayed at 100 throughout. The measured mean absolute move was 20.5 minor units.
- **H2 supported in the tested fixture and workload:** crossing requests and offers generated positive partial fills; the three matching workloads cleared 10,559, 10,788, and 10,721 canonical units. Deterministic replay, input-order reversal, per-proposal limits, and quote/match value consistency passed.
- **H3 supported:** final arithmetic error counts were zero in every benchmark row. The deliberate cyclic float-rounding path used rates whose product is 1, yet rounded 1 minor unit to 4; the canonical conservation assertion rejected it. This is a constructed defect demonstration, not an estimate of real-world incidence.
- **H4 supported in this environment:** matching had higher median CPU use than the two per-proposal quote policies. The five-run samples are noisy and too small to infer scaling behavior.

## Measured policy comparison

Each cell is from the first of five deterministic repetitions; all repetitions had the same proposal counts, acceptance, price and fairness outcomes. Acceptance is accepted/refused proposals. Quantity share is accepted proposal quantity divided by total proposal quantity; for midpoint matching, both sides of matched quantity are included. Matched units counts each canonical unit once.

| Workload | Policy | Accepted / refused | Quantity share | Matched canonical units | Spread (minor) | Mean absolute price move (minor) | Jain acceptance |
|---|---|---:|---:|---:|---:|---:|---:|
| Abundance | Fixed reference | 6,174 / 5,826 (51.45%) | 51.34% | 0 | 0 | 0.00 | 0.991919 |
| Abundance | Capacity spread | 5,941 / 6,059 (49.51%) | 49.26% | 0 | 0 | 20.00 | 0.993422 |
| Abundance | Batch midpoint | 6,012 / 5,988 (50.10%) | 50.03% | 10,559 | 1 | 0.55 | 0.991028 |
| Scarcity | Fixed reference | 6,187 / 5,813 (51.56%) | 51.51% | 0 | 0 | 0.00 | 0.993625 |
| Scarcity | Capacity spread | 5,919 / 6,081 (49.33%) | 49.62% | 0 | 0 | 21.00 | 0.992253 |
| Scarcity | Batch midpoint | 6,173 / 5,827 (51.44%) | 51.39% | 10,788 | 1 | 0.15 | 0.993615 |
| Abrupt change | Fixed reference | 6,249 / 5,751 (52.08%) | 51.83% | 0 | 0 | 0.00 | 0.993669 |
| Abrupt change | Capacity spread | 6,058 / 5,942 (50.48%) | 50.49% | 0 | 41 | 20.50 | 0.994554 |
| Abrupt change | Batch midpoint | 6,146 / 5,854 (51.22%) | 51.12% | 10,721 | 1 | 0.38 | 0.993265 |

Jain's index is computed over accepted synthetic proposal counts by participant. It is a narrow equality measure and does not establish fairness. Spread for quote policies is the min/max policy quote range; batch spread is the min/max realized matched price range. Price movement uses all generated policy quotes or realized matched prices, respectively.

## Latency and resource observations

Wall and CPU p50/p95 are per 12,000-proposal run (five measured runs per regime/policy). Percentiles use nearest rank; with five observations, p95 is the largest sample. This host is shared and timings show outliers. Proposal generation and compilation are outside the timed interval. Memory is the maximum positive process RSS difference before/after a measured run, not peak allocation.

| Workload | Policy | CPU p50 / p95 (ms) | Wall p50 / p95 (ms) | Max observed RSS delta (bytes) |
|---|---|---:|---:|---:|
| Abundance | Fixed reference | 7.466 / 8.543 | 7.458 / 7.982 | 6,815,744 |
| Abundance | Capacity spread | 8.454 / 23.001 | 8.423 / 12.897 | 3,219,456 |
| Abundance | Batch midpoint | 24.092 / 108.348 | 24.080 / 34.004 | 3,612,672 |
| Scarcity | Fixed reference | 8.602 / 17.025 | 7.655 / 8.817 | 1,421,312 |
| Scarcity | Capacity spread | 11.088 / 19.592 | 10.083 / 11.079 | 3,145,728 |
| Scarcity | Batch midpoint | 30.510 / 46.708 | 23.555 / 30.073 | 10,215,424 |
| Abrupt change | Fixed reference | 7.574 / 13.397 | 7.567 / 8.027 | 1,048,576 |
| Abrupt change | Capacity spread | 13.313 / 29.628 | 8.591 / 17.452 | 4,194,304 |
| Abrupt change | Batch midpoint | 26.393 / 68.655 | 20.938 / 23.661 | 21,348,352 |

The raw 45-row observation set is `results/benchmarks.csv`. The benchmark evaluated 540,000 measured proposal-policy cases and 108,000 warmup cases across the three seeded regimes. The audit rerun reproduced deterministic acceptance, quantity, price, and fairness outcomes and reported zero arithmetic errors. Negative results are retained: capacity spreads reduced accepted ratios slightly in all three scenarios, and batch matching had a higher measured cost without a clear acceptance-rate gain.

## Tests, commands, and failures

Final reproducible commands, run from this directory:

| Command | Exit | Result |
|---|---:|---|
| `npm ci` | 0 | Installed the two scoped development dependencies from lockfile. |
| `npm test` | 0 | Strict compile; 12 tests passed, 0 failed, 0 skipped. Includes 10,000 seeded property-generated proposals. |
| `npm run cli` | 0 | Executable synthetic quotes and matches emitted. |
| `npm run bench` | 0 | 45 rows written; five repeated measurements per policy/regime after warmup. |

These commands were rerun during the archive audit on 2026-10-20. The refreshed timing samples and raw rows are included in the ZIP.

During development, earlier `npm test` attempts exited 1 with 2/10 and then 1/10 failing tests because the first alleged float-defect examples did not diverge at the rounding boundary. Those examples were replaced with a confirmed cents truncation and a cyclic rounding exploit; the final suite passes. An initial strict compile also exposed a TypeScript module-resolution configuration mismatch; configuration was corrected before the final clean-install run.

## Source, assumptions, and limits

The ECMAScript safe-integer rule, RFC timestamp profile, and published frequent-batch-auction designs are source-backed and listed in `research/SOURCES.md`. They do not support claims about fairness or success in this synthetic exchange. Capacity interpolation, acceptance preferences, and the workload distributions are assumptions. Test and benchmark observations are specific to Node v24.19.0, npm 11.9.0, TypeScript 7.0.2, Linux x86_64 on a 5-vCPU Xeon Platinum 8370C virtual machine. The sample is not production scale and does not test strategic behavior, clock skew, concurrency, persistent state, or hostile distributed clients.

**Decision: CONDITIONAL.** Keep the fixed reference as default. Consider bounded capacity pricing only if its rules and data source are explicitly agreed. Keep midpoint matching optional because measured results did not show enough benefit to outweigh its runtime cost. Proceed only with further synthetic research and contract review; real-domain integration remains on hold. See `research/RECOMMENDATION.md` and `docs/DECISION.md`.
