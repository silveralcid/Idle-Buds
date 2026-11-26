> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/3629e5eaec87049d38a0c0f4269135b90beea5d3/reverse-engineering/game-dev/legends-of-idleon/build-144/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Development lessons

## Adopt
| Idea | Evidence | Reuse |
|---|---|---|
| One shared bonus function with typed parameters | `ArbitraryCode5Inputs(type, x1, x2, level)`; talents, bubbles, vials, stamps, guild, family, arcade all store `x1, x2, type` | designers tune curves in data; every new system gets the same vocabulary (add, decay, decayMulti, intervalAdd …) |
| Analytic offline gains with server time | `AFKgains` uses hourly rates × AFK share × elapsed time; elapsed time from a game clock set from the server at each sync | constant-time offline for arbitrarily long absences; changing the local clock cannot fabricate a long absence (it is used only between syncs) |
| Staged soft caps instead of hard caps | damage Base/Pct/Multi compressed by exponents at several thresholds | numbers can grow for years without walls or overflow-driven redesigns |
| Characters as parallel workers | per-character AFK targets, family bonuses shared by the account | idle progress with real decisions (who does what) |
| Live configuration | 66 server variables (events, offers, `GameVERSION`, tuning such as `A_ResXP`) | tune and run events without shipping a client |
| Version gate with grace | client accepts `GameVERSION` 143 or 144, 9999 = maintenance | force updates without locking out the previous build immediately |

## Avoid
| Problem | Evidence | Better |
|---|---|---|
| Formulas as giant visual-script chains | `DamageDealed` reads ~150 sources in one function; values passed through scratch maps (`DNSM`) | small pure functions per stat, named and testable; a dependency graph (compare Melvor Idle 2) |
| A factor applied twice | hit chance in both expected damage and hit count (`HourlyKillRate`/`CalcAwayKills`) | derive expected attacks per kill once; unit-test the AFK formula against a simulation of the active loop |
| Batch randomness that changes the mean | `DropOdds`: one draw per batch, outcomes ≥ 3 collapse to 2 below an expected 2 | sample a Poisson/binomial count properly (or give the mean everywhere) so AFK and active yields agree |
| String-dispatched mega-functions | `ArbitraryCode` with 33 branches and 68 selector strings in use, `EtcBonuses` over 108 ids | separate functions or a table of named computations |
| Content compiled into the game script | 2 480 items and 260 tables as code in a 25 MB script | content in data files with a schema; smaller builds and diffable content |
| Client-written progression with premium currency in the save | `commitSave` writes the whole document; `GemsOwned` is a save key | keep currencies and purchases in server-owned documents; validate deltas |
| Paid multipliers inside core formulas | `bon_a` ×1.5 damage, `bun_u` +30 AFK, `bun_y` +250 % coins | if sold, keep paid effects visible and separate from the balance model so tuning does not silently depend on them |

## Principles
1. Give every bonus the same small grammar (type, x1, x2, level); it scales to hundreds of systems.
2. Compute offline from rates and trusted time, but validate the rate formula against the active loop it summarises.
3. Prefer staged soft caps to hard caps in games whose numbers grow without end.
4. Keep the formula layer reviewable: a calculation nobody can read is a calculation nobody can check (hit chance entering the AFK kill rate twice, intended or not, is the example).
