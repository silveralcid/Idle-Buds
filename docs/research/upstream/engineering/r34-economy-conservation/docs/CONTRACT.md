> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/market-quote-exchange-results/docs/CONTRACT.md); [scope, corrections and rights](../../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Contract v1.0

All quantities and prices are non-negative safe integer `Number`s. `limitPriceMinor` and reference prices use integer minor units of the one canonical accounting unit. `quantity` is a positive count of canonical units. The engine uses BigInt for intermediate products and rejects results outside the safe-integer range.

```ts
interface Proposal {
  schemaVersion: "1.0";
  id: string; participantId: string;
  side: "offer" | "request";
  quantity: number; canonicalUnit: string;
  limitPriceMinor: number;
  minPriceMinor?: number; maxPriceMinor?: number;
  acceptedUnit?: { unit: string; canonicalPerAltNumerator: number; canonicalPerAltDenominator: number };
  constraints?: string[];
  revision: number; availabilityRevision: number; availableQuantity: number;
  submittedAt: number; validUntil: number;
}
```

The optional rational conversion means `canonical units per alternative unit = numerator / denominator`. An alternative settlement amount is exact only where `canonical quantity * denominator` is divisible by `numerator`; otherwise the proposal is refused as `non-integral-settlement-conversion`. The canonical total remains `quantity * unitPriceMinor`. No float conversion or tolerance is used.

`Quote` records `policy`, accepted/refused status and reason, canonical and settlement quantities/units, integer conversion ratio, input and availability revisions, policy decision, valid-until epoch second, reference input, current availability revision, and calculation time. Proposal IDs and participant IDs use a limited ASCII character set. IDs must be unique inside a batch. Expiry uses half-open validity: a quote is expired when `now >= validUntil`.

Policies: `fixed-reference-v1` quotes the reference; `capacity-spread-v1` applies the bounded availability rule; `batch-midpoint-v1` sorts offers by ascending limit then ID and requests by descending limit then ID, fills partial quantities, and clears crossing limits at `floor((ask + bid)/2)`. IDs use locale-independent ASCII ordering for stable tie breaks. A constraint-tagged offer/request pair must share a tag; empty tags impose no additional constraint. This is a research contract, not an execution instruction.
