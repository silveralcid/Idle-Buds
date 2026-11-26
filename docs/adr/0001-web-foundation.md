# 0001: A small web development foundation

Status: accepted implementation choice within the owner's November 25, 2026 consolidation task. It implements existing approved technical direction and does not approve game design or release scope.

## Decision

Use a single root React/TypeScript/Vite application with npm and a committed lockfile. Node 24 is the development baseline already available for this mission. Use semantic DOM/CSS and a neutral non-game shell. Retain the existing Python 3.11+ universal tooling rather than build a replacement. Keep ordinary source/data/assets/tests/documentation boundaries and avoid workspace orchestration until real independent packages exist.

The owner-approved initial backend is Node/TypeScript/Fastify with PostgreSQL and one modular server. Document that boundary now; add its dependencies, schema and service only with the first authorized server feature. Tauri, Canvas/Pixi, Rust/WASM, databases, Docker, auth, observability vendors and deployment providers are unnecessary to verify this foundation. No provisioned infrastructure or game code is created.

Use the official current Vite React/TypeScript starter conventions, TypeScript and current starter lint checks, an actual production build and Playwright browser smoke. Do not install a test runner with an empty or meaningless suite just to claim testing: Vitest and database concurrency suites arrive with their real behaviors. The inherited 75 Python tests verify repository tooling only.

## Evidence and tradeoffs

Source approval: [Bible section 8](../design/bible/13-open-decisions.md), paragraph “Owner-approved technical direction”; backed by design-history section 12.22 and the Incubator promotion record. The current owner task authorizes these foundations despite the older repository-work gate; [authority](../design/AUTHORITY.md) preserves the limited exception.

Official references checked during setup: [Vite guide](https://vite.dev/guide/), [React's Vite setup](https://react.dev/learn/build-a-react-app-from-scratch#vite), and [Vitest guide](https://vitest.dev/guide/). Registry metadata and the lockfile establish actual installed versions. Keeping one small app reduces configuration today; separate reusable rules or backend modules only when their implemented ownership justifies it.

The shell establishes install/build/test capability. It proves no gameplay, live persistence, multiplayer, product quality, platform qualification or release readiness of an implemented game.
