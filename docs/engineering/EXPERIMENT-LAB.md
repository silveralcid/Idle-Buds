# Experiment lab: CLI, API and MCP

**Owner:** local experiment entrypoints, replay evidence and agent access. [Game testing](../game/testing.md) owns which evidence supports a gameplay claim; [experiment policy](../experiments/README.md) owns hypotheses and adoption decisions.

The lab reuses `src/game/` and the existing authenticated player API. It runs synthetic fixtures without resetting normal accounts or exposing HTTP fixture/time controls. It needs the repository's pinned Node runtime and `npm ci`. MCP uses the official TypeScript SDK; no model subscription, API key, hosted service or paid model call is needed to run the CLI or qualify the protocol.

## Quick start

From the repository root:

```bash
npm run lab -- list
npm run lab -- smoke
npm run lab -- run production-recovery --seeds baseline --variant daily
npm run lab -- run production-recovery --seeds baseline --variant frequent
npm run lab -- report <run-id>
npm run lab -- compare <daily-run-id> <frequent-run-id>
npm run lab -- replay <run-id>
npm run lab -- content
```

`list` prints actual registered scenarios, variants, limits and seed sets. Use `smoke` for a small qualification. `baseline` and `holdout` are separate fixed seed sets. Changing policies can change the number/order of RNG draws, so common starting seeds do not guarantee corresponding random events.

Run output is concise JSON with artifact references. The default root is `.repo-local/lab/runs/`; `IDLE_BUDS_LAB_ARTIFACT_ROOT` changes the local destination. Each run is retained separately with its inputs, observations and outcomes. These files contain private synthetic starting states and RNG information; they are researcher evidence, not player observations. Keep raw files ignored by Git and record short findings under `docs/evidence/`.

Run limits can only be tightened:

```bash
npm run lab -- run action-sequences --max-actions 10
```

A stopped or incomplete run is not a pass. CLI exit codes are `0` for a passed run or matched replay, `1` for failed/incomplete results or a comparison with incompatible inputs, and `2` for an invalid invocation. Comparison displays evidence and does not automatically adopt a variant. `npm run lab -- help` documents the complete CLI.

## Scenarios

| Scenario | Question |
|---|---|
| `production-recovery` | Do independent Bud production chains recover from input blocks without management, and does manual pause persist? |
| `inventory-recovery` | Does completed pending output retain its identity and arrive exactly once when capacity returns? |
| `activity-replacement` | Do valid and invalid replacements preserve the accepted activity and reward contracts? |
| `offline-return` | Does an absent player's allowance remain bounded, including background reconciliation and passive observations? |
| `first-bud-working` | Can normal resource acquisition, crafting and combat lead to an independently working first Bud? |
| `policy-progression` | What do casual, generalist, producer and battler policies accomplish under explicit schedules and budgets? |
| `action-sequences` | Do bounded seeded combinations preserve core activity and ownership invariants? |

Prepared fixtures are synthetic capabilities, not proof that a fresh player can afford the same roster or upgrades. Policies receive public state only. Scenario assertions can inspect the full synthetic state. Reported simulation time excludes human navigation, reading and decision time.

The initial production/policy horizon is bounded. Use observed runtime and a concrete remaining question before extending to long simulated periods. A higher raw output count does not establish a better experience, economy or balance.

## Local MCP setup

An MCP client should launch this command with the repository root as its working directory:

```bash
node --env-file-if-exists=.env tools/mcp.ts
```

Use `node` directly in the client configuration. An npm wrapper may print banners to stdout, which must contain only MCP protocol messages. Diagnostic output goes to stderr. The server uses local stdio; this does not publish an endpoint a remote chat service can reach.

Restart a persistent MCP process after changing runtime source or installing different dependencies. The runner records the source loaded at startup and refuses to attribute cached old modules to changed files. For long lab requests, configure the host's tool timeout above the scenario's wall-time cap plus startup/report overhead (90 seconds covers the current 60-second cap). Cancellation is cooperative between synchronous cases; wall-time checks also occur between engine steps.

| Environment variable | Purpose |
|---|---|
| `IDLE_BUDS_MCP_PROFILE` | `all` (default), `lab`, or `player` |
| `IDLE_BUDS_API_URL` | Explicit existing game origin, for example `http://127.0.0.1:3000` |
| `IDLE_BUDS_USERNAME` / `IDLE_BUDS_PASSWORD` | Normal account credentials used by player tools |
| `IDLE_BUDS_SESSION` | Existing session credential as an alternative to username/password |
| `IDLE_BUDS_LAB_ARTIFACT_ROOT` | Optional local report directory |

Keep credentials in the ignored `.env` file or the MCP client's private environment settings. An unconfigured player connection is reported as unavailable; it does not prevent local lab operations. Point the client at an existing test world with a test account. `npm run playtest` provides the documented synthetic accounts in the isolated playtest database; normal `play`/`play:lan` preserve your persistent world.

Use the `player` profile for an agent being evaluated as a player. Use `lab` or `all` for a researcher. Profiles determine exposed tools and are not an operating-system sandbox for an agent that independently has shell access.

| Tool | Contract |
|---|---|
| `player_observe` | Normal public player/world observations. Reading player state is an actual foreground check-in. |
| `player_act` | Existing typed commands through the authoritative HTTP API, with a stable command UUID. |
| `lab_run` | Registered synthetic scenario, registered seed set, optional supported variant and stricter limits. |
| `lab_report` | Structured summary, metrics, failures or manifest for a retained run. |
| `lab_replay` | Reproduce a retained run and identify divergence or incompatible source. |

The catalog resource advertises actual scenarios. There is no arbitrary URL, SQL, shell or player-state editor tool. Player commands continue through the normal origin/authentication/validation/transaction path. The MCP transport request ID is not the command UUID: retry the same command UUID and payload when completion is uncertain. A fresh UUID means a new action.

## Timing, comparison and replay

Passive lab inspection reads a cloned snapshot. It must not call `/api/state`, grant progress or renew an offline allowance. Scheduled player check-ins and explicit actions are separate from background reconciliation. This matches the distinction in `server/db.ts` between foreground activity and remote settlement.

Only the game clock is simulated. SQL session expiry, rate limits and network clocks retain their own behavior in integration checks. The lab does not make authentication randomness deterministic. Real database and HTTP tests qualify those boundaries separately.

Reports record source/content identity, fixture/policy/scenario versions, initial state, seed, ordered actions and clock changes. Replay checks compatible source and reports divergence rather than presenting changed rules as an identical reproduction. Incidental run IDs and wall-clock duration do not belong to normalized gameplay comparisons.

Material-graph validation checks references, numeric definitions, obtainable ingredients and prerequisite chains. Its scope explicitly excludes combat feasibility, actual progression costs, inventory management, fun and economic equilibrium. Cycles with an obtainable external input are valid. The retired Remote Relay remains excluded from active upgrade validation.

## Evidence and next experiments

The legacy `npm run experiments` and `npm run experiments:world` entrypoints remain available. Their reports describe their specific synthetic policies. The world experiment uses real Fastify injection and PostgreSQL with prescribed trades; it is not a live network or endogenous market-demand model.

Use the lab for one question at a time: baseline, one meaningful alternative, declared measures and a stop condition. Keep per-seed failures and incomplete milestones visible. A successful automated run establishes the checked mechanics, not human enjoyment or retention.

Human phone/controller tasks and combat-comprehension sessions run alongside automation. Use the actual interface, give a goal without coaching, record assistance and accidental actions, and retain the most consequential examples. Narrow viewport and synthetic gamepad checks do not qualify physical hardware.

There is no automatic balance change, model-driven merge, scheduled run or remote deployment. Deterministic regressions can gate changes; policy comparisons and AI interpretations provide evidence for a decision.
