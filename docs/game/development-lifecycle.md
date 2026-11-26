# Game development lifecycle

**Owner:** the path from an approved Idle Buds milestone to a playable result. This adapts the [upstream game standards](../migration/game-standards.md); the Game Development Constitution and approved Idle Buds design remain authoritative. It does not approve features or release scope.

## Choose a bounded outcome

Before implementation, identify the existing approved milestone, player benefit, smallest connected loop and observable acceptance. Keep one current scope owner. Capture additional ideas in the Idea Incubator; research findings and an interesting prototype do not promote themselves into design or release scope.

For an explicitly authorized experiment, record the question, smallest useful version, exclusions and practical timebox in the existing plan or experiment record. Choose limits for that experiment; there is no inherited fixed scene count, mechanic count or universal timer. Preserve the original scope and failed evidence when resuming. Change acceptance only to correct a documented misunderstanding, never merely to make a failed implementation pass.

## Build, play, repair, finish

| Stage | Work | Evidence |
| --- | --- | --- |
| Inspect | Check live source, approved owners, reusable code and the affected entrypoint. | Current revision and scoped acceptance. |
| Implement | Deliver the smallest connected behavior using the approved web stack. Separate rules from presentation and platform access where it improves testability. | The intended player action reaches a meaningful result. |
| Exercise | Play the loop through actual input and inspect its feedback; run proportionate [game checks](testing.md). | Observed success and relevant failure behavior on the delivered source. |
| Repair | Reproduce the first concrete failure and fix its cause. Reuse failed cases as focused regression coverage when useful. | A result that would reject the original failure. |
| Finish | Update the owner, record limits and hand off the runnable result. | Acceptance, source identity, checks, known gaps and next approved task. |

Do not introduce a framework, service, generalized entity system or empty future subsystem simply because another genre might need it. Reuse the [universal engineering standards](../engineering/CODE-QUALITY.md) and native project commands. Keep rules testable with controlled inputs and clocks; add seeded randomness only where a real system uses randomness.

## Playtest and balance

Automated checks establish behavior, not enjoyment. For a playable milestone, ask a small, specific question and observe a real session. Record the build, relevant seed/save, player choices, friction and qualitative feedback. Separate observation from interpretation. Use balance experiments to compare approved changes against a named baseline, with controlled conditions and uncertainty; a desirable metric alone is not proof of fun.

## Agent work

Use the existing [implementation workflow](../../.agents/skills/implement-task/SKILL.md), [coordination rules](../agents/coordination.md) and [delivery policy](../agents/delivery.md). Give each writing lane clear ownership. Read current state before continuing; do not treat a prior completion claim as execution evidence. Report implemented, locally verified, CI verified, human playtested, released and deployed separately. This consolidation establishes development foundations only; it does not authorize gameplay implementation.
