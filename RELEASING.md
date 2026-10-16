# Releasing

## Cut a release

1. Bump `version` in `package.json` (and `scher-core-wasm/pkg/package.json` if the wasm changed). Merge to `main`.
2. If the Rust changed, rebuild and commit the pkg: `cd scher-core-wasm && wasm-pack build --target web --release`.
3. Tag and push:

   ```
   git tag v0.3.1 && git push origin v0.3.1
   ```

The Release workflow refuses a tag that disagrees with `package.json`, runs check/test/build, builds the wasm fresh (Rust 1.99.0, wasm-pack 0.15.0), compares it with the committed `scher-core-wasm/pkg`, and publishes a GitHub Release with `scher-<v>.tgz`, `scher-core-wasm-<v>.tgz`, `SHA256SUMS` and generated notes.

Drift between committed pkg and fresh build is a warning, not a failure: today a fresh build is not byte-identical to the committed one, so failing would block every release. The release ships the committed pkg; the fresh build is attached to the workflow run and the step summary shows both hashes. Set `STRICT_PKG_DRIFT: 'true'` in `release.yml` once builds reproduce.

## Pin a release (consumer)

```
npm install https://github.com/Unity-Environmental-University/scher/releases/download/v0.3.0/scher-core-wasm-0.0.1.tgz
```

Verify against `SHA256SUMS` on the same release page. The tarball name uses the package's own version, so check the release assets for the exact filename.
