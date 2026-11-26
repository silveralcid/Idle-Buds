# Start here

Idle Buds now has a consolidated knowledge base and a minimal web development foundation. It is not a playable game yet.

1. Read [AGENTS](AGENTS.md) and [authority/scope](docs/design/AUTHORITY.md). The owner's consolidation exception does not lift the gameplay gate.
2. Find your topic in [the ownership index](docs/INDEX.md). Approved intent lives in [the Bible](docs/design/design-bible.md); speculative ideas live in [the Incubator](docs/design/idea-incubator.md).
3. Inspect the actual branch, working tree and current task. Reuse [development setup](docs/engineering/DEVELOPMENT.md) and the real commands in `.repo/project.json`.
4. Implement only the authorized scope on an isolated branch. Do not stop after planning when execution is authorized. Test the changed behavior and update its owning document. Do not make a new framework or spec to fill an empty directory.
5. Report source identity, actual checks and limitations. A successful foundation check is not gameplay acceptance, release or deployment.

## Local setup

Use Node.js 24 and npm, Python 3.11+ for inherited repository tooling, and Git. Exact JS dependency versions are in `package-lock.json`.

```sh
npm ci
npm run dev
```

The local page is a non-game development shell. See [development setup](docs/engineering/DEVELOPMENT.md) for browser tests and complete verification.

## Next work

[Next milestone](docs/project/NEXT-MILESTONE.md) records the remaining approval boundary and the recommended first integrated slice. It is a proposal, not an implementation assignment. No additional granular design interview is required merely to orient a new agent.

Use one applicable [task prompt](docs/prompts/README.md) rather than loading all inherited workflows. Full Drive exports and historical code remain recoverable, but current work belongs in this repository.
