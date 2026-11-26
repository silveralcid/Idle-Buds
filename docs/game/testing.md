# Game testing and performance

**Owner:** game-specific evidence selection. Use the [risk-based testing SOP](../engineering/TESTING.md), [verification workflow](../engineering/VERIFICATION.md) and [definition of done](../agents/definition-of-done.md) for execution and status meanings. [Upstream provenance](../migration/game-standards.md) records this adaptation.

## Choose evidence for the claim

| Layer | Establishes | Does not establish |
| --- | --- | --- |
| Repository checks | Documentation, configuration and helper integrity | A working game |
| Type, lint and build checks | Valid source and a package produced by the selected toolchain | Correct gameplay or successful deployment |
| Pure rules tests | Expected outcomes for controlled input, state, time and randomness | Browser integration |
| Integration checks | Real connections between rules, presentation and persistence where implemented | Untested external services or platforms |
| Browser scenarios | Actual input, visible feedback and important state changes in the tested browser | Human enjoyment or physical touch-device compatibility |
| Human playtest | Observed comprehension, friction and experience for the exercised session | Universal market appeal or statistically established balance |

Register actual native commands in `.repo/project.json` as they exist. Do not add placeholder game tests or relabel tooling tests as gameplay coverage. Choose the smallest meaningful checks for the change and inspect discovery counts, unexpected skips and native output.

## Reproducible rules and scenarios

For systems using randomness, record seed, algorithm/content version and scenario inputs. Test both repeatability and required constraints; matching one golden fixture is insufficient. Check invalid or empty inputs and probability-table boundaries when relevant. Review fixture changes against approved intent rather than regenerating them blindly. Preserve exact seeds across JSON/browser boundaries using a representation that avoids numeric precision loss.

Keep rules independent of wall-clock timing where practical. Browser scenarios use real input and robust outcomes rather than exact frame timing. Read-only diagnostic state can support assertions, but should not replace rendered inspection or become a way to set the answer directly. Exercise the distinguishing behavior of the milestone; a startup screenshot or constant title assertion cannot prove it works.

Once save/offline behavior exists, cover schema validation, migration, interrupted or denied persistence, clock boundaries and repeat application. If active and offline progression should be equivalent under approved rules, test that equivalence with controlled time and state. The [save guidance](assets-and-saves.md) does not define earnings caps or progression policy.

## Performance and visual evidence

Measure a representative workload against a named source, build mode, browser/device and baseline. Useful measurements include startup, transferred asset size, interaction latency, long tasks and memory growth during repeated play. Set budgets from the milestone and target devices; none are inherited by default. Distinguish JavaScript heap from total browser/GPU memory and software rendering from hardware performance.

Inspect relevant phone/tablet/desktop layouts, keyboard/pointer access, focus, readable text, loading/failure states and reduced-motion behavior. Browser viewport emulation is not physical-device qualification. Expand browser/device coverage only for supported targets or a concrete risk.

Keep raw screenshots/logs in ignored artifacts and concise sanitized findings in [evidence](../evidence/README.md). Record source and built artifact identity when stale output could invalidate a result. Rebuild and rerun affected checks after source changes; report missing coverage honestly and stop when the accepted claim is supported.
