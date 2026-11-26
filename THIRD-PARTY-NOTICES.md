# Third-party and source notices

This document records the scope of retained source material. It does not apply one upstream license to the whole game or grant production rights to archived references.

| Material | Origin / applicable notice | Scope |
|---|---|---|
| Universal repository guidance and helpers | Same-owner `silveralcid/universal-repo-template`; source commit and file hashes in `docs/migration/universal-source.json` | Adopted/adapted engineering foundation; preserve provenance |
| Adapted game development guidance | Same-owner `silveralcid/template-bevy-starter`, MIT option; [full notice](docs/reference/licenses/bevy-starter-MIT.txt) | Documentation adaptations only; no engine or game implementation imported |
| Current Vite React/TypeScript template conventions | Published `create-vite` distribution, CC0; [full notice](docs/reference/licenses/create-vite-CC0.txt) | Minimal frontend setup, adapted for this project |
| React/ReactDOM embedded in the original art reference | React 18.3.1, MIT; [full notice](docs/reference/licenses/react-18.3.1-MIT.txt) | Embedded historical visual artifact only |
| Fonts, illustrative PNG/SVG assets and generated renderer in art boards | Original notices retained inside the complete HTML; other provenance is not production-cleared | User-supplied nonfunctional design reference, excluded from runtime/build inputs |
| Installed npm packages | Exact versions/integrity in `package-lock.json`; package license files remain in their distributions | Review notices for any future distributed application artifact |
| Authored game/engineering research and selected analytical artifacts | Same-owner `silveralcid/research`; [selection, rights and corrections](docs/research/upstream/README.md), [file provenance](docs/migration/research-manifest.json) | Research only; private evidence, extracted data/code/assets and dependent executables excluded; no third-party production rights granted |

The art reference includes a generated `dc-runtime` renderer without a separately visible license in its header. Its inclusion is the owner's requested preservation of their design artifact; no standalone runtime or production reuse is authorized. Old extracted game code and unverified sprites remain in recoverable legacy history, not the active tree.

The imported research retains its source notices and authorship/restriction statements. Research, public availability and repository inclusion do not imply permission to copy third-party code, creatures or assets into the production game. Future imports must preserve the same distinction.
