#!/usr/bin/env bash
# Run after `wasm-pack build` has rebuilt scher-core-wasm/pkg in place: compares the
# fresh build against the committed pkg, writes a markdown report to $1, and emits a
# workflow warning on drift. Reports, never fails — see RELEASING.md for why.
set -euo pipefail
out=$1
pkg=scher-core-wasm/pkg

changed=$(git diff --name-only -- "$pkg")
added=$(git ls-files --others --ignored --exclude-standard -- "$pkg")

if [ -z "$changed$added" ]; then
  echo "Committed \`$pkg\` matches this build byte for byte." > "$out"
  exit 0
fi

{
  echo "Committed \`$pkg\` differs from this build:"
  echo
  for f in $changed; do echo "- changed: \`$f\`"; done
  for f in $added; do echo "- only in this build: \`$f\`"; done
  echo
  if printf '%s\n' "$changed" "$added" | grep . | grep -qv '_bg\.wasm$'; then
    echo "The JS glue, types or manifest differ: the committed pkg is stale against the source."
  else
    echo "Only the \`.wasm\` differs. rustc hashes the checkout path into symbol names, so any"
    echo "build outside CI's checkout path differs here; this cannot tell that apart from a logic"
    echo "change that left the exports alone."
  fi
} > "$out"
echo "::warning title=scher-core-wasm/pkg drift::committed pkg differs from the fresh build (see job summary)"
