# Releasing

A `v*` tag push runs `.github/workflows/release.yml`. It builds and tests everything,
packs two npm tarballs, and creates a GitHub Release carrying them:

- `scher-<version>.tgz`: the TS library (`dist/` + `src/`)
- `scher-core-wasm-<cargo version>.tgz`: the compiled kernel (`scher-core-wasm/pkg`, built fresh)
- `SHA256SUMS`: checksums of both

The release notes list the checksums, report any drift between the fresh wasm build and the
committed `scher-core-wasm/pkg`, and end with GitHub's generated changelog.

`.github/workflows/ci.yml` runs the same build and tests (without packing or releasing) on
every push and pull request.

## Cutting a release

```sh
npm version patch          # or minor/major: bumps package.json, commits, tags vX.Y.Z
git push --follow-tags
gh run watch               # follow the Release run
```

The tag must equal `v` + the `package.json` version, or the run stops before building.
The wasm tarball takes its version from `scher-core-wasm/Cargo.toml`, which does not move
with the tag. Bump it when the kernel changes, so two releases don't ship different
kernels under the same package version.

If a run fails, fix it, then move the tag: `git tag -d vX.Y.Z && git push origin :vX.Y.Z`,
tag again and push. If the Release was already created, delete it first with
`gh release delete vX.Y.Z`.

## Pinning a release (consumers)

The repo is public, so release assets download without auth. Depend on the tarball URL:

```json
"scher-core-wasm": "https://github.com/Unity-Environmental-University/scher/releases/download/vX.Y.Z/scher-core-wasm-0.0.1.tgz"
```

npm records the tarball's sha512 in `package-lock.json` and checks it on every install, so
a re-uploaded asset fails the install instead of silently changing the kernel.

Or vendor the file (Docker builds, offline). Download it, check it against `SHA256SUMS`,
and depend on it with `file:`:

```sh
gh release download vX.Y.Z -R Unity-Environmental-University/scher -p 'scher-core-wasm-*.tgz' -p SHA256SUMS
shasum -a 256 --ignore-missing -c SHA256SUMS
npm install ./scher-core-wasm-0.0.1.tgz   # writes "file:scher-core-wasm-0.0.1.tgz"
```

## Reproducibility, and why the committed pkg is not the distribution

The release wasm is built with pinned tools: rustc 1.95.0 (the version that built the
committed pkg), wasm-pack 0.15.0 (which also pins wasm-opt), and `Cargo.lock` (which pins
wasm-bindgen 0.2.126). `--remap-path-prefix` keeps runner paths out of the binary.

That still does not make a laptop build match CI byte for byte. rustc hashes each path
dependency's location into symbol names, and that changes how code is laid out in the
`.wasm`. Tested on 2026-10-16 with identical toolchain, flags and wasm-bindgen: two builds
from the same directory came out identical, and builds from two different directories did
not. CI always checks out to the same path, so CI builds reproduce each other. A committed
pkg built elsewhere can only be compared on its JS glue, types and manifest, and those
matched the source at the time of writing.

Separately, wasm-pack installs wasm-bindgen with an unlocked `cargo install` when it finds
no prebuilt binary (as on Apple Silicon). That pulls whatever `walrus` is newest, which
changes the output. To reproduce locally, put a locked build on PATH first:
`cargo install wasm-bindgen-cli --version 0.2.126 --locked`.

So **the release tarball is the distribution**: it is built in a clean, pinned
environment, checksummed, and tied to a tag. It does not change under a consumer when
someone rebuilds `pkg/` in a working tree, which is what crashed penelope-course twice on
2026-10-15. The committed `pkg/` stays for now, because sibling-checkout `file:` deps and
`test/conformance.wasm.test.ts` use it without Rust. Once consumers pin releases it can be
untracked. Drift is reported, not enforced, because a wasm-only diff is expected and the
release ships the fresh build either way.

## GitHub Packages (not set up)

Publishing to npm.pkg.github.com would mean:

- renaming both packages under the org scope (`@unity-environmental-university/scher`;
  `wasm-pack build --scope unity-environmental-university`);
- adding `permissions: packages: write` and running `npm publish` with the workflow's
  `GITHUB_TOKEN` (no new secret needed to publish).

But every consumer would then need a token with `read:packages` to install, even though
the repo is public. The tarball URLs above need no token, so it was left out.
