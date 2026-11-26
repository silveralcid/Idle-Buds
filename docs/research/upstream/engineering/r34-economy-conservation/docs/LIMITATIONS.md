> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/market-quote-exchange-results/docs/LIMITATIONS.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Limitations

- Capacity spread is a transparent toy rule: used capacity is `max(0, capacity - availableQuantity)`, premiums are linearly interpolated and capped, and abundance discount is applied only above capacity. It does not estimate demand elasticity or equilibrium value.
- The matcher is a sorted greedy crossing algorithm with midpoint prices, not a full market mechanism. Constraint mismatches and queue interaction are not strategically analyzed. It has no cancellation race model or distributed snapshot protocol.
- Price-level midpoint truncates odd sums by one minor unit. No fee, tie-randomization, or surplus-balancing policy is modeled.
- The source research concerns financial auctions and JavaScript arithmetic. Transfer to general multi-party exchange settings is uncertain.
- Synthetic participant identifiers and seeded preferences do not represent real people or assets. Jain's index measures only equality of accepted proposal counts in this constructed sample; it does not establish procedural or outcome fairness.
- CPU and RSS are measurements of one Node process in a shared virtualized environment. RSS delta is not peak allocation, and no extrapolation to production is justified.
- This library has no JSON parser/schema validator, persistence, authentication, external clock validation, concurrency control, or execution path.
