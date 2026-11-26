# Game rules

The game rules are pure TypeScript and take server time and seeded randomness as inputs. The server commits the resulting state and command receipt together. The player view removes the private seed, counters and unhatched genetics.

Activity completion uses one chronological scheduler for online and offline progress. Simultaneous breeding completion precedes work, then activity worker IDs are sorted. A reconcile simulates at most 24 hours and shifts unfinished deadlines by discarded time, preserving visible remainder. Jobs consume inputs and award output at completion. Paused jobs hold their Bud work slot, while only running jobs occupy nodes. Formation, work and breeding commitments are mutually exclusive. Ranked defense uses a separate immutable snapshot.

Combat is provisional Protected Commander with bounded simultaneous frontline hits and three typed effects. Both PvE and PvP use the same resolver. Account-tailored balance, effect viability and real playtest outcomes still require measurement.
