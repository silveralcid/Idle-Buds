# Current release specification: local/private Experience MVP

## Authority and endpoint

Silver explicitly authorized implementation and immediate merge of MVP Execution Blueprint v2 on November 26, 2026. This accepts the supplied bounded scope for a playable experiment candidate. [Authority](../design/AUTHORITY.md) records the exception to historical preimplementation restrictions without claiming the BEAT BAES demo shipped. Public deployment, paid infrastructure and commercial release remain outside this task.

Later that day, after owner playtesting and design clarification, Silver authorized the agreed Experience MVP in **one PR**, with **no issue creation**, and merge after verification. The [Experience execution plan](../plans/active/experience-mvp.md) owns implementation order and disjoint lanes. This is an explicit scope update: usability, responsive/controller interaction, and the selected H visual execution are now required for this pass.

## Must ship

The [execution plan](../plans/active/mvp-execution-plan.md#proposed-release-boundary) and its [25 packets](../plans/active/mvp-execution-playbook.md#ordered-implementation-packets-one-pass-gate-per-packet-do-not-start-until-authorized) own detailed scope: earned first catch; seven production and four combat skills; 15 species, three zones, four affinities, three resource tiers; shared authoritative online/offline progression; production and Bud labor; deterministic combat/catching/collection; breeding; real player trading and funded orders; chat/friends/clan contribution; blind async ranked PvP; reproducible local setup, fixtures and experiments; desktop/mobile browser play.

Required engineering acceptance is real cross-system gameplay, persistent account isolation, atomic ownership/economy mutations, server-owned time/randomness, safe retries, no known critical duplication or data loss, real database and browser checks, and documented installation/recovery. Passing a subset means an implemented increment, not a completed MVP. Human enjoyment and retention are subsequent experiments, not prerequisites to starting playtesting.

## Nice to have and excluded

The accepted Experience behaviors below are required. Final commissioned creature art, audio and further balance polish remain later work. The original exclusion list remains binding: no extra species/zones/tiers, live PvP, raids/wars, microservices, Redis, ECS, generic engine, custom scripting/content editor, native shell, monetization or public launch. Original procedural portraits are permitted; reference-game code, data and artwork remain outside runtime.

## Experience acceptance

| Area | Required result |
| --- | --- |
| Activities | Direct start without travel or manual unlock, eligible access automatic, gather/combat repeat, craft finite or continuous, valid activity replaces unfinished previous work immediately. |
| Bud work | One independent Bud per production skill; Tender and Bud may share a resource. Species aptitude and Tender access determine eligibility; existing individual level/traits/genetics affect efficiency. No duplicate Bud skill tracks. |
| Storage | Shared item-type slots with unlimited stacks, individual unequipped gear slots, equipped gear exempt, Buds/eggs separate. Preserve pending completed rewards exactly once; blocked jobs recover automatically and explicit pause/stop persists. |
| Shell | Idle Clans functional sidebar/topbar arrangement; reorder categories and entries, icon-grid activities and icon-rail sidebar; compact activity glance; bottom chat; hamburger menu with working current items and disabled future items; accurate acknowledged server save time. |
| Screens | Compact shared production layout with simple item names/visible requirements, Bud assignment from skills and collection, searchable item grid/inspection/current equipment functionality. |
| Combat | Visible authoritative event playback for PvE and ranked, HP/frontlines/abilities/defeats, pause/step/speed/skip/replay, continuing background progression. Watching must not affect rewards. |
| Qualification | Current source lint/types/build, deterministic integrity/migration tests, real database and browser scenarios, inspected desktop/mobile layouts and controller event paths; report actual physical-device coverage separately. |

Retain existing accounts and earned upgrades. Migrate earlier saves instead of resetting them. Refund removed Remote Relay purchases once, retain excess holdings, and reserve market return space. Starting slot counts and the economic effect of unlimited stacks are explicitly provisional; prioritize convenient play in this pass.

## Implementation choices and reporting

Use established libraries and small original data-driven rules. Resolve reversible numerical baselines during implementation, label them provisional and test them. Material design changes still need owner decision. Preserve the M1 play-first checkpoint before breadth integration. Actual delivery evidence and unfinished gates must be committed alongside code. Miyu continuation must name exact remaining work and request Sol Extra High on Cloud Work or the server rig; do not claim a remote agent started without a supported dispatch receipt.
