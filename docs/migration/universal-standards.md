# Universal standards adoption

Source: [universal-repo-template](https://github.com/silveralcid/universal-repo-template), `main` at `239d08996fa8f23e4f35f423521538afadd222f5`. All seven source branches were compared; latest merged PRs #4, #5, #6 and #7 supply source hygiene, build philosophies, UI/UX guidance and risk-based engineering/testing. Squash-merged branch tips can differ from main without representing missing work.

## Authority and selection

| Branch | Source tip | Decision |
|---|---|---|
| main | 239d08996fa8f23e4f35f423521538afadd222f5 | Authoritative merged baseline |
| feat/engineering-quality-testing-20261123 | 765f0ad75a7ea06a113b48946f7497d2f011e5fe | Incorporated through merged PR #7 |
| feat/ui-ux-standards-bundle-2026-11-17 | d65ea5dcdbebbd0f5d9a228502f3c6a10b1c1518 | Guidance incorporated through PR #6; optional runtime theme omitted |
| docs/core-build-philosophies-2026-11-17 | cf2d49da539c8bc28fb0f799537123e2c0aaa673 | Incorporated through PR #5 |
| chore/source-independence-checks-20261116 | c34f9c4795e7a51629950cc41ae2bc53f92484c9 | Hygiene considered; template export gate not applicable |
| feature/agent-efficiency-v4-1 | 3084a53fcc432163c2ab03e99aac1bc8f3ca87a2 | Applicable instructions/helpers already in main |
| docs/repo-attached-agent-launch-standard-20261023 | 6639631ca18fc9afc19adb488fe7054774236759 | Open PR #3; unapproved launch-pack proposal not imported |

## Adaptations

Retained provider-neutral agent instructions, thin provider adapters, task-triggered skills, selective context routing, repository helper and tests, documentation ownership, QA/evidence conventions, issue/PR templates, security guidance, editor/Git conventions and repository-health workflow. These are existing upstream tools, not a new administrative system. No model, MCP, approval or global environment overrides were introduced.

Omitted upstream completed-task/evidence records because they do not verify Idle Buds. Omitted the optional Mantine theme/package and its CI; project UI follows approved game identity. Omitted the template exporter and source-independence CI because they reject same-owner upstream provenance links and living-project files, conflicting with the explicit migration requirement. Standard secret handling and security review remain.

The original template manifest is retained as an upstream fingerprint for three-way upgrades, not as a list of active product requirements or a claim of byte-identical adoption. [Per-file source inventory](universal-source.json) records imported/excluded paths and source hashes.
