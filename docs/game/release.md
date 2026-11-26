# Game release preparation

**Owner:** preparing an approved game build for eventual distribution. The [delivery policy](../agents/delivery.md) owns authorization and Git conventions; [verification](../engineering/VERIFICATION.md) owns execution evidence. These [adapted standards](../migration/game-standards.md) do not authorize deployment or publication.

## Prepare the candidate

Identify the approved release scope, exact source revision, release version and relevant save/content versions. Keep dependency lockfiles committed and use reproducible installation/build commands. Review meaningful dependency changes, applicable security findings and required license notices. A passing vulnerability scan is not a complete rights review.

Build using the documented production command. Verify the actual output through a local HTTP server or authorized preview using the same asset/base-path assumptions as the intended target. Inspect loading and failure behavior, entrypoint navigation and at least one meaningful approved player loop when gameplay exists. A development server working does not prove the built artifact works.

## Acceptance and evidence

| Boundary | Required evidence when applicable |
| --- | --- |
| Source and package | Exact commit, lockfile/toolchain identity and the package that was exercised |
| Gameplay | Relevant rules checks plus actual input and outcome from the candidate |
| Presentation | Supported viewport/input checks and inspection of visible feedback and errors |
| Durable state | Supported save compatibility, failure recovery and relevant migration checks |
| Rights and security | Runtime-only contents, required notices, no secrets or study-only artifacts |
| Performance | Representative measurements against the release's actual targets and budgets |
| Recovery | A concrete previous package/source and any save compatibility limitations |

Record what was actually exercised and what remains unverified. Test results become stale when their relevant source, package, dependencies or environment change. Human playtest, hosted CI, distribution and deployment are separate outcomes; do not infer any from a package build.

## Package and hand off

Deliver the complete generated application package with its required assets and notices. Exclude research archives, raw evidence, development credentials and unrelated source from deployable output. Secrets belong in the chosen platform's protected configuration if a later approved service needs them; browser-delivered values are public.

Keep release notes focused on player-visible behavior, compatibility and known limits. Choose rollback and rollout details only when the deployment target and durable-state behavior exist. Do not provision a service, desktop wrapper, app-store workflow or deployment automation for hypothetical requirements.

Use bounded existing CI checks where configured and inspect results for the actual candidate head. Add an expensive platform matrix only when supported targets or observed failures justify it. Publication follows the user's applicable authorization and repository protections. During this consolidation, package/build validation establishes foundations only; there is no gameplay release or empty-app deployment.
