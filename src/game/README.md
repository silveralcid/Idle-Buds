# Game rules

Reserved for approved pure TypeScript game rules. No gameplay is implemented.

Keep rules independent of React, browser storage, network and wall-clock APIs.
Pass controlled inputs, time and randomness when the approved behavior needs
them. Add meaningful rules tests with the first implemented behavior, following
the [game testing guidance](../../docs/game/testing.md).

Do not import research snapshots, reverse-engineered code or the legacy runtime.
