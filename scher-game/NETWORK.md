# Network propagation

> **MUSLIN — seams showing on purpose. Tear this apart before trusting it.**

Hallie, 2026-07-30:

> "it occurs to me we already have an invariant game state that's done by
>  mutation with a shared data substrate and serialization steps — which means
>  network prop is not off the table"

She is right, and the claim is stronger than "possible." **The expensive parts
of multiplayer are already solved here, as side effects of decisions made for
other reasons.** This file is the honest accounting of which — and of the one
part that genuinely is not solved.

---

## What is already done

### 1. You send MOVES, not state

A swap is 3 beats: a node, an edge, a quality marker. Cascades are *derived*
(`settle()`), so a 200-move session is ~600 tiny rows rather than a board
snapshot per frame.

Measured on the match-3 board: **3.00 beats/move, flat, whatever the chain
length.** Sending a move is sending `"12,13"` and a slug.

### 2. Determinism removes the need for a board authority

Refills come from a seeded hash of `(seed, move, cell, player)` — never a
stateful RNG. Two clients replaying the same log get **byte-identical boards**.

That is the property most multiplayer games buy with a server tick and state
reconciliation, and it fell out of a decision made to keep replay honest.

### 3. Conflict resolution is the append-only law

Two players moving at once is not a race. Both beats land, order is *witnessing
order*, and reads over a settled society are order-independent (property-tested
in scher: "reads depend on the SET of beats, not the order they arrived").

No locks, no rollback, no last-write-wins — the substrate's own law is the merge
strategy.

### 4. Late join and reconnect are the same operation

Send the log; the client folds it. There is no separate "catch-up" path,
because catching up *is* the ordinary read. A player who joins at move 80 runs
exactly the code a player who was there from move 0 runs.

### 5. The wire format already exists

`scher-pages/src/ingress.ts` was built for editor JSON and is, unmodified, what
a sync needs: `egress()` serialises, `ingress()` lands it, and `laid_by`
survives the hop so provenance is preserved rather than reconstructed. Its
deliberate asymmetry (a rehydrated society KNOWS it was imported) is *correct*
for networking too — a peer's log arriving is an event.

### 6. Rewind, spectate, and replay come free

`asOf` already reads any past standpoint, so spectating, instant replay, and
"show me what they did last turn" are the reads that already exist.

---

## What is NOT solved: trust

**A client can lay any beat it likes.** Nothing in the substrate stops a
peer from laying `cleared: 40 rockets` or a swap that matches nothing.

The append-only law protects *consistency*, not *honesty* — it guarantees
everyone agrees on what was said, not that what was said was legitimate.

The fix is cheap but real, and it is a server:

- **Validating a move IS the same read.** `swap()` already refuses a
  non-adjacent swap and one that matches nothing; a server runs that identical
  check before accepting a beat. No separate validation model to write and keep
  in sync with the client's.
- The server needs the fold, which is why the compiled kernel matters here —
  one implementation, validated against the conformance corpus.
- Scores are *derived*, never sent. A client cannot claim a score because there
  is no score field to claim; there is only a log and a fold over it.

So: peer-to-peer is fine for co-op with people you trust (which is most of
what this game is about — colleagues on a job). Competitive play needs a
validating server, and that server is small.

---

## What would actually have to be built

Roughly, in order:

1. **A transport.** WebSocket or WebRTC. Sends beats, receives beats.
2. **A lay hook.** `soc.lay` fans out to peers. Probably a `Society` wrapper
   rather than a change to the kernel.
3. **Idempotent landing.** Already free: derived slugs mean re-receiving a beat
   is inert under the append-only law. Duplicate delivery costs nothing.
4. **Turn order over the wire.** `playerAt(match, n)` is already a read over
   move count; the open question is what happens when two peers both think it
   is their turn. Probably: let both land, let the fold sort it, and show the
   loser what happened. Untested.
5. **A validating server** for anything competitive.

None of that is small, but none of it is the hard part — and the hard part is
already done.

---

## Seams

- **Clock skew.** `witnessed` is the local society's clock. Two peers stamping
  concurrently is exactly the case scher's order-independence covers for
  *settled* reads — but `asOf` reads at a specific stamp, and two peers may not
  agree on what "as of 41" means. Unexamined.
- **A cascade's cost is on the receiver.** Sending a move is 3 beats, but
  folding it costs whatever the cascade costs. Fine at 0.1ms for 200 moves;
  unmeasured for a long session with many peers.
- **Splice over the wire.** Inserting a beat mid-chain (the retroactive-history
  mechanic) is a much harder sync problem than appending. Nothing here has
  thought about it.
