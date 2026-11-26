> **Imported research, not approved Idle Buds design.** [Source snapshot](https://github.com/silveralcid/research/blob/88163607cfd407230512650a5c6750e1b7a96f98/projects/game-dev/cross-game-research-handoffs/dump/01-numeric-reproducibility-results/LICENSES.md); [scope, corrections and rights](../../README.md). Upstream evidence labels and reported test results are preserved, not newly reproduced. Counts and commands may refer to excluded upstream artifacts.

# Licenses, dependencies and source provenance

## This package

All source code, scripts, fixtures, documentation and results in this
package were written or generated for this study and are offered under the
MIT License:

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Algorithms ported (not copied verbatim) into this package

| component | files | origin | license / notice |
|---|---|---|---|
| `log2` algorithm, constants `TWO54`, `IVLN2HI`, `IVLN2LO`, `LG1..LG7`, operation order | `src/ts/portable.ts`, `src/rust/src/portable.rs` | FreeBSD `lib/msun/src/e_log2.c` and `k_log.h` (fdlibm lineage) | Sun Microsystems fdlibm notice (below) |
| `exp` core polynomial `P1..P5` and the `1 - ((lo - x*c/(2-c)) - hi)` reconstruction | same | fdlibm `e_exp.c` | Sun Microsystems fdlibm notice (below) |
| `exp2` argument reduction and Dekker/Veltkamp two-product | same | textbook techniques (Dekker 1971; Veltkamp) | no license required |
| exact bucket / exact exp2 (integer arithmetic), interval squaring, Ziv-style rounding test | `src/ts/exact*.ts`, `src/rust/src/exact.rs`, `src/rust/src/bignum.rs` | written for this study (Ziv's strategy: A. Ziv, ACM TOMS 1991) | MIT (this package) |
| SplitMix64 | `src/ts/prng.ts`, `src/rust/src/prng.rs` | Steele, Lea & Flood, OOPSLA 2014; reference implementation by S. Vigna | reference code dedicated to the public domain |

fdlibm notice (preserved as its terms require):

```
Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.

Developed at SunSoft, a Sun Microsystems, Inc. business.
Permission to use, copy, modify, and distribute this
software is freely granted, provided that this notice
is preserved.
```

Every constant was cross-checked: the hex bit patterns and the published
decimal values agree, and `ln2`/`ln2_lo` were re-derived with 80-digit
decimal arithmetic.

## Third-party dependencies

None of these are redistributed in the ZIP; they are fetched by the package
managers from the lockfiles.

| dependency | version | used for | license | pinned in |
|---|---|---|---|---|
| `typescript` | 5.9.3 | compile/type-check TS (dev only) | Apache-2.0 | `package-lock.json` (integrity hash) |
| `@types/node` | 22.18.6 | Node type declarations (dev only) | MIT | `package-lock.json` (integrity hash) |
| `wasmtime` (Python) | 49.0.0 | optional second WebAssembly host | Apache-2.0 WITH LLVM-exception | `scripts/requirements-wasmtime.txt` (sha256) |
| Rust crates | — | the crate has **zero** dependencies | — | `src/rust/Cargo.lock` |
| Python standard library (`decimal`) | 3.13 | independent 60-digit accuracy reference | PSF License | — |

## Toolchains used (not redistributed)

Node.js 20.20.0 / 21.7.3 / 22.22.0 (preinstalled) and 23.11.1 / 24.21.0 / 25.9.0 / 26.10.0 (official linux-x64 tarballs fetched into `build/node-dist`, SHA-256 pinned in `scripts/fetch-node.sh`) (MIT; bundled V8 BSD-3-Clause), rustc /
cargo 1.97.0 with LLVM 22.1.6 (MIT OR Apache-2.0; Rust `std` on
wasm32-unknown-unknown includes the `libm` port in `compiler-builtins`,
MIT OR Apache-2.0, derived from musl, MIT), glibc 2.39 (LGPL-2.1+, dynamic
system library), musl 1.2.5 as shipped self-contained by the Rust
`x86_64-unknown-linux-musl` target (MIT).
