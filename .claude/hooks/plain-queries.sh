#!/usr/bin/env bash
# Inject the plain-code queries into context on every prompt. Reads QUERIES.md (one source
# of truth — no copy to drift). Stdout from a UserPromptSubmit hook is added to the agent's
# context. Kept short on purpose: it's the queries, nothing else.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ -f "$DIR/QUERIES.md" ] || exit 0   # no queries, nothing to say
echo "Before writing code, hold these (from QUERIES.md):"
echo
cat "$DIR/QUERIES.md"
