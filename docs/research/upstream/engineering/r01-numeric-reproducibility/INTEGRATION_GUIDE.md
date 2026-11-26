> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/01-numeric-reproducibility-results/INTEGRATION_GUIDE.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Integration guide (generic)

This guide describes how an application team could adopt the `b2q/1.0.0`
contract, or adapt the pattern to its own base-two transform, without any
proprietary code. Everything referenced lives in this package. Status of the
package: **draft research, not production-approved** (see the decision gate
at the end).

## 1. Choose a profile

| need | profile | why |
|---|---|---|
| identical integers on every platform, independent of engines/libms | `exact` (or `exact-fast`, same results) | mathematically defined; verified in 15 runtime configurations (plus repeat runs) and against an independent 60-digit reference |
| identical float intermediates everywhere (e.g. you persist or hash the `log2` value itself) | `portable` | bit-pinned operation sequence; reproduced in every runtime tested |
| you must keep matching numbers previously produced by a native JS `Math.log2` pipeline | `portable` is a *candidate* (it reproduced V8 11.3–14.6 `Math.log2` on every non-NaN case tested) — validate against the real frozen baseline first, see `research/HISTORICAL_ORACLE_REQUIREMENTS.md`; native `Math.pow`/`**` results changed between Node 22 and Node 24 |
| quick prototyping only | `native` | no guarantee of any kind; never persist |

Never mix profiles for values that are compared with each other. Persist the
tag with the value: `b2q/1.0.0+exact-v1`.

## 2. TypeScript / JavaScript API

```ts
import { createB2Q } from './src/ts/b2q.js';

const b2q = createB2Q('exact-fast');      // 'native' | 'portable' | 'exact' | 'exact-fast'
const r = b2q.bucket(x);                   // { ok: true, value: number } | { ok: false, err: 'E_NAN' | 'E_ZERO' | 'E_NEG' | 'E_INF' }
const v = b2q.value(n);                    // { ok: true, value: number } | { ok: false, err: 'E_NOT_INT' | 'E_RANGE' }
b2q.contract;                              // 'b2q/1.0.0'
b2q.profileId;                             // 'b2q-exact-v1'
```

* Pure ESM, no runtime dependencies, Node >= 20 (uses `BigInt`; the exact
  path also needs `BigInt` exponentiation).
* `exact` uses BigInt for every call (≈ 60 µs/call measured); `exact-fast` gives
  identical results at float speed and falls back to BigInt only within
  `2^-20` of a rounding threshold.
* Results never throw for numeric input; errors are values.

## 3. Rust API

```rust
use b2q::{bucket, value, Profile, DomainError};

let n: Result<i32, DomainError> = bucket(Profile::ExactFast, x);
let v: Result<f64, DomainError> = value(Profile::Exact, n?);
// or the modules directly: b2q::exact::bucket_exact, b2q::portable::p_log2, ...
```

* Zero dependencies; `edition = 2021`; MSRV 1.83.
* `cargo build --release` (native) and
  `cargo build --release --target wasm32-unknown-unknown --lib` (WASM).
* Do not compile the portable code with flags that allow value-changing
  optimisation. Rust has no such flag on stable today; if the algorithm is
  ever ported to C/C++, compile it with `-ffp-contract=off -fno-fast-math`
  and SSE2 (not x87) arithmetic.

## 4. WebAssembly ABI (shared kernel)

The wasm32 module (`build/b2q.wasm`, ~43 KB) has **no imports** and exports
a plain C ABI; no `wasm-bindgen` is required. All binary64 values cross the
boundary as u64 bit patterns in linear memory.

| export | signature (wasm types) | semantics |
|---|---|---|
| `memory` | memory | linear memory |
| `b2q_abi_version` | `() -> i32` | `1` |
| `b2q_contract_version` | `() -> i32` | `1000000` = 1.0.0 |
| `b2q_alloc` / `b2q_free` | `(bytes) -> ptr` / `(ptr, bytes)` | 8-byte aligned scratch buffers |
| `b2q_bucket_batch` | `(strategy, xs_u64*, out_i64*, len) -> i32` | `out = n`, or `2^40 + code` for an error (codes: 1 NAN, 2 ZERO, 3 NEG, 4 INF, 5 RANGE) |
| `b2q_value_batch` | `(strategy, ns_i32*, out_u64*, out_err_u8*, len) -> i32` | bits + error code (0 = ok) |
| `b2q_log2_batch` | `(strategy, xs_u64*, out_u64*, len) -> i32` | log2 bits (strategies 0 native, 1 portable) |
| `b2q_exp2_batch` | `(kind, ts_u64*, out_u64*, len) -> i32` | 0 exp2, 1 powf(2,t), 2 powf(opaque 2,t), 3 portable |
| `b2q_pow_batch` | `(xs_u64*, ys_u64*, out_u64*, len) -> i32` | native powf |
| `b2q_bucket_scalar` | `(strategy, f64) -> i64` | single call (measures boundary cost) |

Strategy codes: `0` native, `1` portable, `2` exact, `3` exact-fast,
`4` portable with forced FMA (deliberately incompatible, tests only),
`5` exact via bignum only. Every function returns `-1` for an unknown code.

The TypeScript adapter `src/ts/wasm-adapter.ts` (`WasmB2QModule`) checks the
ABI and contract versions and that the module has no imports, and offers
both batch calls and a `B2Q`-compatible facade (`asB2Q(profile)`). Any host
with a WebAssembly runtime can use the same ABI; `scripts/run_wasm_wasmtime.py`
shows a second host.

Hosting rules for bit-exact results: do not enable `relaxed-simd` (its
results are implementation-defined); keep the module's float code scalar or
deterministic SIMD; treat NaN payloads as non-normative (WebAssembly
arithmetic NaN results are nondeterministic by specification).

## 5. Wiring the conformance gate into CI

1. Vendor `fixtures/b2q-v1/` unchanged; verify `manifest.json` SHA-256 values.
2. Run your implementation over `bucket.tsv` / `value.tsv` and compare the
   encoded cells exactly with the columns of your claimed profile.
   `src/ts/conformance.ts` (`checkBucket`, `checkValue`, `checkLog2Bits`,
   `checkExp2Bits`, `checkEncoded`, `classifyCells`) does this and classifies
   differences (`value`, `domain`, `nan_payload_only`, `signed_zero_only`).
3. Fail the build on **any** mismatch in a normative column. No epsilon.
4. Add a negative control: run the deliberately incompatible candidate
   (`src/ts/candidate.ts`, or strategy 4 in WASM) and require that the gate
   FAILS. A gate that cannot fail is not a gate.
5. Re-run on every runtime you ship (Node versions, browsers, OS/CPU
   families, WASM hosts). Record `process.versions`, `rustc -vV`, CPU flags.

## 6. Adapting the pattern to another transform

* Different resolution: change `RESOLUTION_BITS` in both `contract.ts` and
  `contract.rs`, regenerate `exp2-table` (`scripts/gen-exp2-table.ts`) and
  the fixtures (`scripts/gen-fixtures.ts`), and bump the contract MAJOR
  version. The exact method generalises: `round(2^R * log2 x)` needs
  `bitlen(m^(2^(R+1)))`.
* Other transcendentals: prefer an exact/integer definition of the
  *integer* output; if a float intermediate must be persisted, pin a single
  operation-by-operation implementation in every language and gate it on
  bit patterns.
* Keep the domain policy explicit and ordered (NaN, zero, negative,
  infinity) and encode errors as values.

## 7. Windows

The code is portable; only the driver script is bash. From PowerShell:

```powershell
npm ci
npx tsc -p tsconfig.json
node build/js/scripts/gen-fixtures.js build/fixtures-regen          # optional stability check
node --test (Get-ChildItem build/js/tests/ts/*.test.js).FullName
cd src/rust; cargo test --release --locked; cd ../..
cd src/rust; cargo build --release --locked --lib --target wasm32-unknown-unknown; cd ../..
Copy-Item src/rust/target/wasm32-unknown-unknown/release/b2q.wasm build/b2q.wasm
node build/js/scripts/run-ts.js fixtures/b2q-v1 build/raw/node-windows
node build/js/scripts/run-wasm.js build/b2q.wasm fixtures/b2q-v1 build/raw/wasm32-node-windows
src/rust/target/release/b2q-run.exe fixtures/b2q-v1 build/raw/rust-msvc-release
node build/js/scripts/compare.js fixtures/b2q-v1 build/raw build/compare-windows
```

Windows was **not tested** in this study; the commands are provided so a
team can extend the matrix (MSVC UCRT libm is expected to differ in the
native profile).

## 8. Decision gate (summary; full criteria in `research/REPORT.md`)

* **GO** for `exact`/`exact-fast` as the integer contract on a platform once
  that platform passes the fixture gate with zero mismatches, the negative
  control fails as required, and repeat runs are byte-identical.
* **HOLD** any claim of compatibility with previously persisted numbers until
  a frozen historical baseline is supplied and reproduced bit-exactly.
* **REJECT** `native` for any persisted or compared output.
