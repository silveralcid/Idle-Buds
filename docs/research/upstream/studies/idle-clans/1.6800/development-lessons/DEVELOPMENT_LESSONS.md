> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/reverse-engineering/game-dev/idle-clans/1.6800/development-lessons/DEVELOPMENT_LESSONS.md); [scope, corrections and rights](../../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Idle Clans — Development Lessons

| System | What it does | Mechanism | Effective? | Complexity | Simplest viable | Adopt? |
|---|---|---|---|---|---|---|
| Server-delivered content DB | all balance in Mongo docs, client holds schema | `FullReadonlyDatabase` + versioned config, public mirror API | Excellent (hot-fix balance, tooling ecosystem, wiki generation) | Medium (needs backend) | JSON files fetched at startup with a version number | **Yes** for any online game |
| Shared simulation assembly | client predicts exactly what server computes | one C# project compiled into both | Excellent; also makes the wiki trustworthy | Medium | same language both sides (TS/C#) | **Yes** |
| Single XP table, ×2 per 7 levels | universal progression, cape prestige | stepwise doubling | Good early/mid, brutal past 99 | Trivial | same table; consider softer tail | Yes, tune the tail |
| Flat rates + percentage boosts | every upgrade stays relevant | multiplicative/additive boost stack | Very effective; opaque stacking | Low | document the stacking rule in-game | **Yes**, with transparency |
| Weighted loot with level-locked removal | long-tail drops, early simplicity | weights + `RemoveFromDropTableAtLevel` | Good | Low | same | Yes |
| Offline cap + premium extension | retention rhythm and monetization | 12 h + 6 h + upgrade tiers | Effective; mild obligation | Low | cap + purchasable tiers | Yes |
| Clans with shared sinks and generated weekly quests | social retention | credits, houses, `ClanQuestGenerator` with effort model (exp 2.5) | Strong differentiator | High (multiplayer backend) | async "guild bank + weekly goal" in a single-player game | Partially |
| Player market with public price API | economy and community tooling | 1 % tax, slots, buy limits, history endpoints | Strong; needs anti-RMT work | High | NPC-only shop until MMO | Only for online games |
| Gold-buyable premium (bonds) | F2P fairness narrative | 1 M gold unlock, tradeable token | Strong trust effect | Low once a market exists | sell convenience, make it earnable | **Yes** |
| Pets as second idle lane | parallel progression | pet tasks with `CustomPetTime/Exp` | Good | Medium | one helper slot | Yes |
| Enum scrambling | deter casual memory hacks | linear remap | Weak (reversible in minutes), harmless | Trivial | skip; rely on server authority | No |
| Shipped debug consoles | dev velocity | QuantumConsole/SRDebugger behind server gates | Fine with authority | Low | strip from release or gate | Case by case |
| Public API with rate buckets | community tools, wiki, bots | Swagger, buckets, trusted keys | Excellent community multiplier | Medium | read-only JSON of config + leaderboards | **Yes** |

## Principles extracted
1. If the game has an economy, make the server the simulation and the client a predictor — then publish the predictor (shared code, API, wiki) instead of hiding it.
2. Keep output rates flat and sell percentages; obsolescence-free upgrades are what make a 1 000-hour idler feel fair.
3. Append-only integer IDs + flags (`Discontinued`, `Hidden`, `ExcludedGameModes`) beat deleting content.
4. Give social systems their own currency and sinks (credits, clan house) so cooperation has a scoreboard.
5. Appointment mechanics should be forgiving (caps, not decay) — Idle Clans never takes progress away.
6. Provide the data ecosystem (API, loc keys, weights) and the community will build the calculators, hubs and wiki for you.
