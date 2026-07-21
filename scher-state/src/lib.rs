//! ╔══════════════════════════════════════════════════════════════════════════╗
//! ║  MUSLIN — seams showing on purpose. Tear this apart before trusting it.  ║
//! ╚══════════════════════════════════════════════════════════════════════════╝
//!
//! TYPED KEY/VALUE STATE ON A SUCCESSION CHAIN (Hallie, 2026-07-21, spoken spec):
//!
//!   State events sit serially in a q-succeeds succession chain. The current
//!   state of the society is NOT stored anywhere — it RASTERIZES: a FOLD over
//!   the chain, oldest → newest, last-write-wins per key. The raster is a READ;
//!   mutation is storying (a new event on the chain), never an overwrite.
//!   Same law as scher-time's lazy `read_result`, data-shaped.
//!
//!   One table, `(event_id, key, value)` — the `value` column is declared with
//!   NO type, so SQLite's dynamic typing stores INTEGER/REAL/TEXT/BLOB natively
//!   per row and `typeof(value)` reads the type back. The muslin's experiment
//!   (test `typed_values_round_trip_natively`) PROVES or REFUTES that this
//!   dissolves the everything-as-strings problem without per-type tables.
//!
//!   TWO change shapes, both in the one table (the fold handles both):
//!     • plain STATE event  — a row with a key: "key is now value".
//!     • mutation/ACTION event — a row with key=NULL whose value SAYS what it
//!       changes (toy grammar: "incr:<key>:<n>", key-to-key "add:<dst>:<src>"
//!       and "set:<dst>:<src>", ";"-joined seq bodies), applied to the state
//!       folded so far. SEAM: whether actions survive, and in what grammar —
//!       the ops grew exactly as far as computing fib IN the events required
//!       (see fibonacci_in_the_events_doll) and must not grow further by drift.
//!
//! SEAMS (open, for Hallie's eye):
//!   • mutation vs plain state event — both sketched below; is the action event
//!     an event with content, a different quality, or dead on arrival?
//!   • scher-stacks landing — extra row/table there vs this standalone table;
//!     this muslin squats standalone in sqlite on purpose.
//!   • typed-value fallback if affinity proves insufficient (blobs? json?) —
//!     the round-trip test below is the evidence either way.
//!   • ORDERING (Hallie, mid-build, two beats): first cut was lay-order (a
//!     bare Vec) — which, as she caught, means NEW EVENTS CAN NEVER LAND
//!     BETWEEN EXISTING ONES. Her fix, now built: a LINKED LIST FROM THE
//!     END. The store holds only the End (the newest event); every event
//!     carries a `succeeds` pointer to its predecessor; oldest→newest is
//!     DERIVED by walking End→genesis and reversing. Order is topology, not
//!     insertion time — splicing an event mid-chain is re-pointing one link
//!     (see `splice_state`). This is the q-succeeds chain for real, if
//!     table-shaped: the edge relation is `chain(event_id, succeeds)`.
//!     SEAM: the splice RE-POINTS a link with an UPDATE — an overwrite,
//!     which the law says should itself be storying (the re-linking as its
//!     own event). Muslined as overwrite, confessed loudly.
//!   • RECURSION (Hallie, mid-build: "test recursion now that we have
//!     conditionals; looping would be self-prehension?") — the ladder as
//!     built: LOOPING = the sublime prehending itself, flat (loop:until).
//!     RECURSION = self-prehension THROUGH THE STORE: the definition is an
//!     ordinary TEXT value in the state, "call:<key>" applies whatever the
//!     fold sees under that key AT THAT MOMENT, and "unless:" (negated guard)
//!     carries the base case. Code and data share the one dynamic column —
//!     redefinition is just another state event, folded last-write-wins.
//!     SEAMS: the unwinding stack is BORROWED from the host fold's own
//!     recursion, not reified in the chain (CALL_FENCE=512, refused loudly,
//!     poisoned key — never an overflow); and code-as-state means a splice
//!     can retroactively change what a later call ran — power and hazard,
//!     unruled.
//!   • PARAMETERS (Hallie, mid-build: "expect events with state values and
//!     break if not?") — YES, as law here: a parameter IS a state event laid
//!     before the call (bind-then-prehend, chain-shaped; scher-time's shape).
//!     The call reads its arguments from the fold at its own moment — so a
//!     binding SPLICED in later reaches an existing call (late binding for
//!     free, tested). "need:<key>:<body>" declares a param; declared-but-
//!     absent breaks LOUDLY (poisoned key), never runs on a silent default.
//!     SEAM: UNDECLARED keys still fold from 0 (accumulators want this) —
//!     silent-defaulting survives for them, confessed, unruled.
//!     Hallie's naming, on seeing it: "now THAT'S a lure" — an unsatisfied
//!     need is a proposition awaiting satisfaction; the call doesn't HAVE
//!     arguments, it is lured toward what the fold offers at its moment.
//!   • STANDPOINT RASTER (Hallie pointed at the backwards-code experiments,
//!     gen4-policy/tests/doll_standpoint_ancestors_only.rs) — because the
//!     pointers run newer→older, `rasterize_at(standpoint)` folds only the
//!     standpoint's ancestors; the future that succeeds it is STRUCTURALLY
//!     unreachable, no filter needed. as_of where the clock is succession
//!     position. The plain rasterize() is just rasterize_at(End).
//!   • key=NULL as the action marker is a muslin trick, not law — a real
//!     landing wants a quality on the event, not a null in a column.
//!   • CONDITIONAL events (Hallie, mid-build: "do we have conditional events?")
//!     — we didn't; now sketched as a guard PREFIX on an action:
//!     "when:<key>=<n>:<action>" applies the inner action only if the state
//!     folded SO FAR satisfies the guard. The condition reads the raster at
//!     its own moment in the chain — late binding again, scher-time's law.
//!     SEAM: is a guard a prefix on an action, its own event shape, or a
//!     prehension the event holds? Only the first is muslined.
//!   • LOOPS (Hallie, mid-build: "looping is easy, event just needs to prehend
//!     itself") — sketched as "loop:until:<key>=<n>:<action>": the fold,
//!     reaching a self-prehending event, re-applies it until the guard
//!     releases it. With conditionals this is while — the chain grammar goes
//!     Turing-shaped. Hallie's follow-up ruling: it's the SUBLIME that
//!     prehends itself — an actual event never closes on itself; the loop's
//!     circular PATTERN lives sublime-side (never actual), and each pass
//!     ingresses as an ordinary event only when the read forces it. Exactly
//!     scher-time's script/read split, bent into a circle. The fold-side
//!     re-application below is the muslin's stand-in for that ingression.
//!     Runaway fence at LOOP_FENCE iterations, refused loudly by poisoning
//!     the key — a sublime that never releases is FINE sublime-side (it's
//!     never actual there) but its read must not hang; an unbounded read is
//!     a miss, not a wait.

use rusqlite::types::Value;
use rusqlite::Connection;
use std::collections::BTreeMap;

/// The store: the values table + the chain as a LINKED LIST FROM THE END.
/// `end` is the only position the store holds; everything else is pointers.
/// The chain table IS the q-succeeds relation, table-shaped:
/// `chain(event_id, succeeds)` — subject succeeds object, End has no successor.
pub struct StateStore {
    pub conn: Connection,
    /// The newest event — the End the list hangs from. None = empty chain.
    pub end: Option<String>,
}

impl StateStore {
    pub fn open_in_memory() -> rusqlite::Result<Self> {
        let conn = Connection::open_in_memory()?;
        // `value` deliberately has NO declared type → column affinity NONE →
        // each row keeps the storage class it was inserted with. That is the
        // whole experiment.
        conn.execute(
            "CREATE TABLE state_events (event_id TEXT NOT NULL, key TEXT, value)",
            [],
        )?;
        // the succession chain: each event names the event it succeeds.
        // Genesis succeeds NULL. Order lives HERE, nowhere else.
        conn.execute(
            "CREATE TABLE chain (event_id TEXT PRIMARY KEY, succeeds TEXT)",
            [],
        )?;
        Ok(Self { conn, end: None })
    }

    /// Hang `event_id` on the chain at the End: it succeeds the old End and
    /// becomes the new one.
    fn link_at_end(&mut self, event_id: &str) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO chain (event_id, succeeds) VALUES (?1, ?2)",
            rusqlite::params![event_id, self.end],
        )?;
        self.end = Some(event_id.to_string());
        Ok(())
    }

    /// Lay a plain STATE event at the End: "key is now value".
    /// Mutation is storying — this appends, it never overwrites a prior row.
    pub fn lay_state(&mut self, event_id: &str, key: &str, value: Value) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO state_events (event_id, key, value) VALUES (?1, ?2, ?3)",
            rusqlite::params![event_id, key, value],
        )?;
        self.link_at_end(event_id)
    }

    /// Lay a mutation/ACTION event: an event whose content SAYS what it changes.
    /// key=NULL marks it (SEAM — a real landing wants a quality, not a null).
    /// Toy grammar: "incr:<key>:<n>".
    pub fn lay_action(&mut self, event_id: &str, action: &str) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO state_events (event_id, key, value) VALUES (?1, NULL, ?2)",
            rusqlite::params![event_id, action],
        )?;
        self.link_at_end(event_id)
    }

    /// SPLICE — the move the Vec could never make: land a NEW event BETWEEN
    /// existing ones. The new event succeeds `after`; whoever used to succeed
    /// `after` now succeeds the new event. Order is topology, so this is one
    /// re-pointed link. SEAM (confessed in the banner): the re-pointing is an
    /// UPDATE — an overwrite — where the law wants the re-linking storied as
    /// its own event.
    pub fn splice_state(
        &mut self,
        event_id: &str,
        key: &str,
        value: Value,
        after: &str,
    ) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO state_events (event_id, key, value) VALUES (?1, ?2, ?3)",
            rusqlite::params![event_id, key, value],
        )?;
        let repointed = self.conn.execute(
            "UPDATE chain SET succeeds = ?1 WHERE succeeds = ?2",
            rusqlite::params![event_id, after],
        )?;
        self.conn.execute(
            "INSERT INTO chain (event_id, succeeds) VALUES (?1, ?2)",
            rusqlite::params![event_id, after],
        )?;
        if repointed == 0 {
            // `after` was the End itself — the splice lands at the End
            self.end = Some(event_id.to_string());
        }
        Ok(())
    }

    /// Derive oldest→newest: walk the succeeds pointers from the End back to
    /// genesis, then reverse. The ONLY source of order in the store.
    pub fn chain_oldest_to_newest(&self) -> rusqlite::Result<Vec<String>> {
        self.ancestors_oldest_first(self.end.clone())
    }

    /// The backward read from ANY standpoint (after gen4-policy's
    /// doll_standpoint_ancestors_only): the succeeds pointers run newer→older,
    /// so walking from where you stand reaches only ancestors — the future
    /// that succeeds the standpoint is structurally unreachable, no filter.
    fn ancestors_oldest_first(&self, from: Option<String>) -> rusqlite::Result<Vec<String>> {
        let mut newest_first = Vec::new();
        let mut cursor = from;
        while let Some(id) = cursor {
            newest_first.push(id.clone());
            cursor = self.conn.query_row(
                "SELECT succeeds FROM chain WHERE event_id = ?1",
                [&id],
                |r| r.get::<_, Option<String>>(0),
            )?;
            if newest_first.len() as i64 > LOOP_FENCE {
                panic!("chain_oldest_to_newest: cycle or runaway chain past {LOOP_FENCE} — a chain that loops is a miss, refused loudly");
            }
        }
        newest_first.reverse();
        Ok(newest_first)
    }

    /// What sqlite says it stored for (event_id, key): "integer" | "real" |
    /// "text" | "blob" | "null" — the experiment's read-back instrument.
    pub fn stored_typeof(&self, event_id: &str, key: &str) -> rusqlite::Result<String> {
        self.conn.query_row(
            "SELECT typeof(value) FROM state_events WHERE event_id = ?1 AND key = ?2",
            rusqlite::params![event_id, key],
            |r| r.get(0),
        )
    }

    /// THE RASTER — the current state as a READ: fold the chain oldest→newest,
    /// last-write-wins per key. Nothing is cached, nothing is overwritten;
    /// every call re-reads the whole story. (Rhymes with scher-time's
    /// read_result: the state is forced by the read, it does not sit anywhere.)
    pub fn rasterize(&self) -> rusqlite::Result<BTreeMap<String, Value>> {
        self.rasterize_at(self.end.as_deref().unwrap_or_default())
    }

    /// The raster FROM A STANDPOINT — as_of, where the clock is succession
    /// position, not wall-time. Stand at any event and fold its ancestors
    /// only; events that succeed the standpoint cannot leak in, because the
    /// backward walk can never arrive at them. (The doll's rule, data-shaped:
    /// "just don't see the future things that succeed this.")
    pub fn rasterize_at(&self, standpoint: &str) -> rusqlite::Result<BTreeMap<String, Value>> {
        let mut state: BTreeMap<String, Value> = BTreeMap::new();
        if standpoint.is_empty() {
            return Ok(state);
        }
        let mut stmt = self
            .conn
            .prepare("SELECT key, value FROM state_events WHERE event_id = ?1")?;
        for event_id in &self.ancestors_oldest_first(Some(standpoint.to_string()))? {
            let rows: Vec<(Option<String>, Value)> = stmt
                .query_map([event_id], |r| Ok((r.get(0)?, r.get(1)?)))?
                .collect::<Result<_, _>>()?;
            for (key, value) in rows {
                match key {
                    // plain state event: last write wins, by chain order
                    Some(k) => {
                        state.insert(k, value);
                    }
                    // action event: its content says what it changes,
                    // applied to the state folded SO FAR (chain order matters)
                    None => apply_action(&mut state, &value),
                }
            }
        }
        Ok(state)
    }
}

/// The toy action grammar: "incr:<key>:<n>" increments an integer key
/// (missing key folds from 0). SEAM: grammar is a placeholder — the real
/// question is whether action events exist at all, not what they say.
/// Runaway fence for loop reads: the sublime may hold a pattern that never
/// releases (fine — it's never actual), but a READ of it must not hang.
pub const LOOP_FENCE: i64 = 10_000;

/// Recursion fence — depth is host-stack-borrowed (confessed seam), so it is
/// fenced tighter than the loop fence and refused loudly, never overflowed.
pub const CALL_FENCE: usize = 512;

fn apply_action(state: &mut BTreeMap<String, Value>, action: &Value) {
    apply_action_d(state, action, 0)
}

fn apply_action_d(state: &mut BTreeMap<String, Value>, action: &Value, depth: usize) {
    let Value::Text(s) = action else { return };
    // RECURSION: "call:<key>" — self-prehension THROUGH THE STORE. The
    // definition is an ordinary TEXT value in the state (laid as a state
    // event, folded like any other); call applies whatever definition the
    // fold sees AT THIS MOMENT. A definition that calls its own key, guarded
    // by a conditional base case, is recursion. SEAM: the unwinding stack is
    // the host fold's own recursion, not reified in the chain.
    if let Some(def_key) = s.strip_prefix("call:") {
        if depth >= CALL_FENCE {
            state.insert(
                def_key.to_string(),
                Value::Text(format!("REFUSED: call fence hit at depth {CALL_FENCE} — this recursion never reaches its base case; an unbounded call is a miss, not a wait")),
            );
            return;
        }
        match state.get(def_key).cloned() {
            Some(def @ Value::Text(_)) => apply_action_d(state, &def, depth + 1),
            _ => {
                // nothing-silent: calling an undefined key poisons it loudly
                state.insert(
                    def_key.to_string(),
                    Value::Text(format!("REFUSED: call:{def_key} — no definition in the state at this moment")),
                );
            }
        }
        return;
    }
    // PARAMETERS: "need:<key>:<action>" — Hallie's ruling, sharpened: params
    // ARE state events laid before the call (bind-then-prehend, chain-shaped;
    // the call reads them from the fold at its own moment, so late/spliced
    // binding works for free). A definition DECLARES what it needs; a declared
    // param absent at the call moment breaks LOUDLY (poisoned key), it never
    // runs against a silent default. Undeclared keys still fold from 0 —
    // that's for accumulators, and it's a confessed seam, not a blessing.
    if let Some(rest) = s.strip_prefix("need:") {
        let Some((key, inner)) = rest.split_once(':') else { return };
        if !state.contains_key(key) {
            state.insert(
                key.to_string(),
                Value::Text(format!("REFUSED: needed parameter '{key}' has no state value at this moment — bind it (lay a state event before the call), don't default it")),
            );
            return;
        }
        apply_action_d(state, &Value::Text(inner.to_string()), depth + 1);
        return;
    }
    // UNLESS: "unless:<key>=<n>:<action>" — the negated guard recursion wants:
    // recurse UNLESS the base case holds. Same moment-reading as `when`.
    if let Some(rest) = s.strip_prefix("unless:") {
        let Some((guard, inner)) = rest.split_once(':') else { return };
        let Some((key, n)) = guard.split_once('=') else { return };
        let holds = matches!(
            (state.get(key), n.parse::<i64>()),
            (Some(Value::Integer(have)), Ok(want)) if *have == want
        );
        if !holds {
            apply_action_d(state, &Value::Text(inner.to_string()), depth + 1);
        }
        return;
    }
    // LOOP: "loop:until:<key>=<n>:<action>" — the sublime prehending itself.
    // Sublime-side this is one circular pattern; the read ingresses passes
    // until the guard releases. Fold-side stand-in: re-apply until <key>=<n>.
    if let Some(rest) = s.strip_prefix("loop:until:") {
        let Some((guard, inner)) = rest.split_once(':') else { return };
        let Some((key, n)) = guard.split_once('=') else { return };
        let Ok(want) = n.parse::<i64>() else { return };
        let mut passes = 0i64;
        while !matches!(state.get(key), Some(Value::Integer(have)) if *have == want) {
            if passes >= LOOP_FENCE {
                // nothing-silent: a read that would never return poisons the
                // key LOUDLY instead of hanging or quietly stopping.
                state.insert(
                    key.to_string(),
                    Value::Text(format!("REFUSED: loop fence hit at {LOOP_FENCE} passes — this sublime never releases; an unbounded read is a miss, not a wait")),
                );
                return;
            }
            let before = state.get(key).cloned();
            apply_action(state, &Value::Text(inner.to_string()));
            if state.get(key).cloned() == before {
                // inner action can't move the guarded key: same refusal, sooner
                passes = LOOP_FENCE;
                continue;
            }
            passes += 1;
        }
        return;
    }
    // CONDITIONAL: "when:<key>=<n>:<action>" — the guard reads the state
    // folded SO FAR (its own moment in the chain), then defers to the inner
    // action. SEAM: guard-as-prefix is the muslin's cheapest sketch; equality
    // on integers is the only predicate. A failed guard is a laid event that
    // changed nothing — the chain remembers the attempt either way.
    if let Some(rest) = s.strip_prefix("when:") {
        let Some((guard, inner)) = rest.split_once(':') else { return };
        let Some((key, n)) = guard.split_once('=') else { return };
        let holds = matches!(
            (state.get(key), n.parse::<i64>()),
            (Some(Value::Integer(have)), Ok(want)) if *have == want
        );
        if holds {
            apply_action(state, &Value::Text(inner.to_string()));
        }
        return;
    }
    // SEQ: "op;op;…" — a body of several ops, applied in order. Only split at
    // the top level (after when/loop prefixes have been peeled), so a loop's
    // whole body can be one action string.
    if s.contains(';') {
        for op in s.split(';') {
            apply_action(state, &Value::Text(op.to_string()));
        }
        return;
    }
    let mut parts = s.splitn(3, ':');
    let (Some(op), Some(key), Some(arg)) = (parts.next(), parts.next(), parts.next()) else {
        return;
    };
    let int = |v: Option<&Value>| match v {
        Some(Value::Integer(i)) => *i,
        _ => 0,
    };
    let out = match op {
        // incr:<key>:<n> — add a constant
        "incr" => match arg.parse::<i64>() {
            Ok(n) => int(state.get(key)) + n,
            Err(_) => return,
        },
        // add:<dst>:<src> — key-to-key addition (missing keys fold from 0)
        "add" => int(state.get(key)) + int(state.get(arg)),
        // set:<dst>:<src> — key-to-key copy
        "set" => int(state.get(arg)),
        _ => return,
    };
    state.insert(key.to_string(), Value::Integer(out));
}

/// ─── DOLLS — playing house with basic algorithms ─────────────────────────────
/// (Hallie, mid-build: "have some fun with dolls, basic programming algorithms?")
/// Classic algorithms staged as succession chains: every step of the computation
/// is an EVENT laid on the chain, and the answer only exists as a raster — a
/// read over the story. Nothing below adds machinery; it exercises what's here.
#[cfg(test)]
mod dolls {
    use super::*;

    /// Fibonacci where each number is a plain state event and each step is
    /// storied. The chain IS the trace; the raster shows only the frontier.
    #[test]
    fn fibonacci_doll_the_chain_is_the_trace() {
        let mut s = StateStore::open_in_memory().unwrap();
        let (mut a, mut b) = (0i64, 1i64);
        s.lay_state("fib-0", "prev", Value::Integer(a)).unwrap();
        s.lay_state("fib-1", "cur", Value::Integer(b)).unwrap();
        for i in 2..=10 {
            let next = a + b;
            (a, b) = (b, next);
            s.lay_state(&format!("fib-{i}-prev"), "prev", Value::Integer(a)).unwrap();
            s.lay_state(&format!("fib-{i}-cur"), "cur", Value::Integer(b)).unwrap();
        }
        let state = s.rasterize().unwrap();
        assert_eq!(state["cur"], Value::Integer(55)); // fib(10)
        assert_eq!(state["prev"], Value::Integer(34)); // fib(9)
        // the whole computation is storied — every intermediate write still exists
        let rows: i64 =
            s.conn.query_row("SELECT count(*) FROM state_events", [], |r| r.get(0)).unwrap();
        assert_eq!(rows, 20); // 2 seeds + 9 steps × 2 writes
    }

    /// Bubble sort where every swap is TWO state events on the chain and the
    /// sorted array only ever exists as a raster. Mutation is storying: the
    /// unsorted past is never destroyed, just shadowed.
    #[test]
    fn bubble_sort_doll_sorted_only_in_the_raster() {
        let mut s = StateStore::open_in_memory().unwrap();
        let mut arr = vec![5i64, 3, 8, 1, 4];
        for (i, v) in arr.iter().enumerate() {
            s.lay_state(&format!("init-{i}"), &format!("arr.{i}"), Value::Integer(*v)).unwrap();
        }
        let mut ev = 0;
        for pass in 0..arr.len() {
            for i in 0..arr.len() - 1 - pass {
                if arr[i] > arr[i + 1] {
                    arr.swap(i, i + 1);
                    for j in [i, i + 1] {
                        s.lay_state(
                            &format!("swap-{ev}-{j}"),
                            &format!("arr.{j}"),
                            Value::Integer(arr[j]),
                        )
                        .unwrap();
                    }
                    ev += 1;
                }
            }
        }
        let state = s.rasterize().unwrap();
        let rastered: Vec<i64> = (0..5)
            .map(|i| match state[&format!("arr.{i}")] {
                Value::Integer(v) => v,
                _ => unreachable!(),
            })
            .collect();
        assert_eq!(rastered, vec![1, 3, 4, 5, 8]);
    }

    /// A counter driven purely by action events — Collatz from 27's little
    /// cousin (a gcd via repeated decrements would be cruel; incr will do):
    /// the fold interprets every "incr" in order, so the answer is path-dependent
    /// history, not a stored number.
    #[test]
    fn triangular_number_doll_all_actions_no_state_writes() {
        let mut s = StateStore::open_in_memory().unwrap();
        for n in 1..=10 {
            s.lay_action(&format!("add-{n}"), &format!("incr:sum:{n}")).unwrap();
        }
        assert_eq!(s.rasterize().unwrap()["sum"], Value::Integer(55)); // 1+…+10
        // and no plain state row was ever written — the value exists ONLY as a read
        let keyed: i64 = s
            .conn
            .query_row("SELECT count(*) FROM state_events WHERE key IS NOT NULL", [], |r| r.get(0))
            .unwrap();
        assert_eq!(keyed, 0);
    }

    /// Conditional events, played: a tiny state machine. A door that only
    /// opens if the latch is set — and the guard reads the fold AT ITS OWN
    /// MOMENT, so the same conditional event laid before and after the latch
    /// flips gives different outcomes. Branching, chain-order-honest.
    #[test]
    fn conditional_doll_guard_reads_the_fold_at_its_moment() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "latch", Value::Integer(0)).unwrap();
        // guard fails: latch is 0 at this moment — the event is laid, changes nothing
        s.lay_action("e2", "when:latch=1:incr:door:1").unwrap();
        s.lay_state("e3", "latch", Value::Integer(1)).unwrap();
        // same conditional, later moment: guard holds now
        s.lay_action("e4", "when:latch=1:incr:door:1").unwrap();

        let state = s.rasterize().unwrap();
        assert_eq!(state["door"], Value::Integer(1)); // only e4 fired
        // the failed attempt is still storied — nothing silent
        let rows: i64 =
            s.conn.query_row("SELECT count(*) FROM state_events", [], |r| r.get(0)).unwrap();
        assert_eq!(rows, 4);
    }

    /// The sublime prehending itself, played: one laid event whose pattern is
    /// circular; the read ingresses passes until the guard releases. One row
    /// in the table — five passes only ever exist in the raster.
    #[test]
    fn loop_doll_one_event_many_passes() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "count", Value::Integer(0)).unwrap();
        s.lay_action("e2", "loop:until:count=5:incr:count:1").unwrap();

        assert_eq!(s.rasterize().unwrap()["count"], Value::Integer(5));
        // the loop is ONE storied event; its passes are read-side only
        let rows: i64 =
            s.conn.query_row("SELECT count(*) FROM state_events", [], |r| r.get(0)).unwrap();
        assert_eq!(rows, 2);
    }

    /// A sublime that never releases is fine sublime-side — but its READ must
    /// refuse loudly, not hang: the guarded key gets poisoned with a REFUSED
    /// text, and typeof would even show the wound (text where integer was).
    #[test]
    fn loop_doll_never_releasing_read_refuses_loudly() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "x", Value::Integer(0)).unwrap();
        // inner action moves y, never x: the guard can never release
        s.lay_action("e2", "loop:until:x=5:incr:y:1").unwrap();

        let state = s.rasterize().unwrap();
        match &state["x"] {
            Value::Text(t) => assert!(t.contains("REFUSED"), "poison must be loud, got: {t}"),
            other => panic!("expected loud REFUSED text, got {other:?}"),
        }
    }

    /// The move the Vec could never make: a new event lands BETWEEN two laid
    /// events by re-pointing one link, and everything downstream refolds over
    /// the amended past. Order is topology.
    #[test]
    fn splice_doll_history_admits_a_new_event() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "count", Value::Integer(10)).unwrap();
        s.lay_action("e2", "incr:count:5").unwrap();
        assert_eq!(s.rasterize().unwrap()["count"], Value::Integer(15));

        // land a new event between e1 and e2: count reset to 0 BEFORE the incr
        s.splice_state("e1b", "count", Value::Integer(0), "e1").unwrap();
        assert_eq!(
            s.chain_oldest_to_newest().unwrap(),
            vec!["e1", "e1b", "e2"]
        );
        // the fold now runs 10 → 0 → +5: the action downstream sees the splice
        assert_eq!(s.rasterize().unwrap()["count"], Value::Integer(5));

        // splicing after the End degrades gracefully to an append
        s.splice_state("e3", "mood", Value::Text("clear".into()), "e2").unwrap();
        assert_eq!(s.end.as_deref(), Some("e3"));
        assert_eq!(s.rasterize().unwrap()["mood"], Value::Text("clear".into()));
    }

    /// Un-cheating (Hallie, mid-build: "did you do fib with recursion in the
    /// events themselves?" — no; the first fib doll was HOST-computed, chain
    /// as trace). THIS one computes IN the events: one self-prehending loop
    /// event whose body is a seq of key-to-key ops. The Rust host does zero
    /// arithmetic; the fold does it all, pass by ingressed pass.
    #[test]
    fn fibonacci_in_the_events_doll_no_host_arithmetic() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("seed-a", "a", Value::Integer(0)).unwrap();
        s.lay_state("seed-b", "b", Value::Integer(1)).unwrap();
        // ONE event; the sublime prehends itself until i=10:
        // (a,b) <- (b, a+b), via t=b; b=b+a; a=t
        s.lay_action("fib", "loop:until:i=10:set:t:b;add:b:a;set:a:t;incr:i:1").unwrap();

        let state = s.rasterize().unwrap();
        assert_eq!(state["a"], Value::Integer(55)); // fib(10)
        assert_eq!(state["b"], Value::Integer(89)); // fib(11)
        // three storied rows total: two seeds + the one circular event
        let rows: i64 =
            s.conn.query_row("SELECT count(*) FROM state_events", [], |r| r.get(0)).unwrap();
        assert_eq!(rows, 3);
    }

    /// RECURSION (Hallie, mid-build: "I want to test recursion now that we
    /// have conditionals. Looping would be, I suppose, self prehension?") —
    /// yes: looping is the sublime prehending ITSELF, flat; recursion is
    /// self-prehension THROUGH THE STORE. The definition is an ordinary TEXT
    /// value laid as a state event (the one-table design pays off: code and
    /// data in the same column), it names its own key guarded by a base case,
    /// and ONE call event unwinds the whole thing in the raster.
    #[test]
    fn recursion_doll_definition_calls_its_own_key() {
        let mut s = StateStore::open_in_memory().unwrap();
        // the definition IS state: triangular(n) recursively, base case n=0
        s.lay_state(
            "def-tri",
            "tri",
            Value::Text("unless:n=0:add:acc:n;incr:n:-1;call:tri".into()),
        )
        .unwrap();
        s.lay_state("arg", "n", Value::Integer(10)).unwrap();
        s.lay_action("go", "call:tri").unwrap();

        let state = s.rasterize().unwrap();
        assert_eq!(state["acc"], Value::Integer(55)); // 10+9+…+1, no host arithmetic
        assert_eq!(state["n"], Value::Integer(0)); // wound down to the base case
        // the definition survives its own execution, still readable state
        assert!(matches!(&state["tri"], Value::Text(t) if t.starts_with("unless:")));
    }

    /// Because the definition is state, it folds like state: a LATER state
    /// event can rewrite the definition, and a call after that moment runs
    /// the new code. Late binding all the way down — scher-time's law again.
    #[test]
    fn recursion_doll_redefinition_is_just_another_state_event() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("def1", "f", Value::Text("incr:x:1".into())).unwrap();
        s.lay_action("c1", "call:f").unwrap();
        s.lay_state("def2", "f", Value::Text("incr:x:100".into())).unwrap();
        s.lay_action("c2", "call:f").unwrap();
        assert_eq!(s.rasterize().unwrap()["x"], Value::Integer(101));
    }

    /// A recursion with no base case must refuse loudly, never overflow the
    /// borrowed host stack: omega calls omega; the fence poisons the key.
    #[test]
    fn recursion_doll_omega_refuses_loudly() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("def", "omega", Value::Text("call:omega".into())).unwrap();
        s.lay_action("go", "call:omega").unwrap();
        match &s.rasterize().unwrap()["omega"] {
            Value::Text(t) => assert!(t.contains("REFUSED"), "must refuse loudly, got: {t}"),
            other => panic!("expected loud REFUSED text, got {other:?}"),
        }
    }

    /// PARAMETERS (Hallie, mid-build: "just expect events with state values
    /// and break if not?") — yes, sharpened: params ARE state events laid
    /// before the call; a definition DECLARES its needs; a declared param
    /// absent at the call moment breaks loudly instead of running on a
    /// silent 0. Same tri, now honest about its argument.
    #[test]
    fn parameter_doll_bound_param_runs_unbound_breaks_loudly() {
        let def = Value::Text("need:n:unless:n=0:add:acc:n;incr:n:-1;call:tri".to_string());

        // unbound: no n laid before the call — REFUSED, not triangular-of-0
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("def", "tri", def.clone()).unwrap();
        s.lay_action("go", "call:tri").unwrap();
        let state = s.rasterize().unwrap();
        match &state["n"] {
            Value::Text(t) => assert!(t.contains("REFUSED"), "must break loudly, got: {t}"),
            other => panic!("expected loud REFUSED text, got {other:?}"),
        }
        assert!(!state.contains_key("acc"), "the body must not have run at all");

        // bound: the param is a state event laid before the call — runs clean
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("def", "tri", def).unwrap();
        s.lay_state("arg", "n", Value::Integer(4)).unwrap();
        s.lay_action("go", "call:tri").unwrap();
        assert_eq!(s.rasterize().unwrap()["acc"], Value::Integer(10)); // 4+3+2+1
    }

    /// Late binding, chain-shaped: the SAME call event, and the parameter
    /// SPLICED in before it after the fact — the call reads its arguments
    /// from the fold at its own moment, so the spliced binding reaches it.
    /// (scher-time's lazy_read_sees_params_bound_after_the_prehend, data-shaped.)
    #[test]
    fn parameter_doll_spliced_binding_reaches_an_existing_call() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state(
            "def",
            "tri",
            Value::Text("need:n:unless:n=0:add:acc:n;incr:n:-1;call:tri".into()),
        )
        .unwrap();
        s.lay_action("go", "call:tri").unwrap();
        // first read: REFUSED — n was never bound
        assert!(matches!(&s.rasterize().unwrap()["n"], Value::Text(t) if t.contains("REFUSED")));

        // now SPLICE the binding in between def and call
        s.splice_state("late-arg", "n", Value::Integer(3), "def").unwrap();
        // the same call event now finds its argument at its moment
        assert_eq!(s.rasterize().unwrap()["acc"], Value::Integer(6)); // 3+2+1
    }

    /// Calling an undefined key is a miss, not a silent no-op.
    #[test]
    fn recursion_doll_undefined_call_poisons_loudly() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_action("go", "call:ghost").unwrap();
        match &s.rasterize().unwrap()["ghost"] {
            Value::Text(t) => assert!(t.contains("REFUSED")),
            other => panic!("expected loud REFUSED text, got {other:?}"),
        }
    }

    /// The standpoint raster (after gen4-policy's doll_standpoint_ancestors_only,
    /// which Hallie pointed at mid-build): stand at any event and fold ONLY its
    /// ancestors. The future that succeeds the standpoint is structurally
    /// unreachable — no filtering, the edge direction IS the rule.
    #[test]
    fn standpoint_doll_raster_never_sees_the_future() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "mood", Value::Text("stormy".into())).unwrap();
        s.lay_state("e2", "count", Value::Integer(1)).unwrap();
        s.lay_state("e3", "mood", Value::Text("clear".into())).unwrap();
        s.lay_action("e4", "incr:count:9").unwrap();

        // standing at e2: e3's rewrite and e4's incr do not exist yet
        let at_e2 = s.rasterize_at("e2").unwrap();
        assert_eq!(at_e2["mood"], Value::Text("stormy".into()));
        assert_eq!(at_e2["count"], Value::Integer(1));

        // standing at the End: the whole story
        let now = s.rasterize().unwrap();
        assert_eq!(now["mood"], Value::Text("clear".into()));
        assert_eq!(now["count"], Value::Integer(10));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// THE EXPERIMENT — prove or refute: one untyped `value` column, four
    /// storage classes in, `typeof()` and round-tripped values out, no
    /// stringification anywhere.
    #[test]
    fn typed_values_round_trip_natively() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "count", Value::Integer(42)).unwrap();
        s.lay_state("e2", "temp", Value::Real(98.6)).unwrap();
        s.lay_state("e3", "name", Value::Text("penelope".into())).unwrap();
        s.lay_state("e4", "raw", Value::Blob(vec![0xDE, 0xAD, 0xBE, 0xEF])).unwrap();

        // typeof(): sqlite kept each row's storage class natively
        assert_eq!(s.stored_typeof("e1", "count").unwrap(), "integer");
        assert_eq!(s.stored_typeof("e2", "temp").unwrap(), "real");
        assert_eq!(s.stored_typeof("e3", "name").unwrap(), "text");
        assert_eq!(s.stored_typeof("e4", "raw").unwrap(), "blob");

        // and the values come back as the same Rust variants, bit-identical
        let state = s.rasterize().unwrap();
        assert_eq!(state["count"], Value::Integer(42));
        assert_eq!(state["temp"], Value::Real(98.6));
        assert_eq!(state["name"], Value::Text("penelope".into()));
        assert_eq!(state["raw"], Value::Blob(vec![0xDE, 0xAD, 0xBE, 0xEF]));
    }

    /// The raster: a fold over the chain, oldest→newest, last-write-wins.
    /// Mutation is storying — e1's row still exists after e3 shadows it.
    #[test]
    fn raster_is_a_fold_last_write_wins() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "mood", Value::Text("stormy".into())).unwrap();
        s.lay_state("e2", "count", Value::Integer(1)).unwrap();
        s.lay_state("e3", "mood", Value::Text("clear".into())).unwrap();

        let state = s.rasterize().unwrap();
        assert_eq!(state["mood"], Value::Text("clear".into()));
        assert_eq!(state["count"], Value::Integer(1));

        // never overwrite: the shadowed write is still storied in the table
        let rows: i64 = s
            .conn
            .query_row("SELECT count(*) FROM state_events WHERE key = 'mood'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(rows, 2);
    }

    /// Both change shapes in one chain: plain state events AND an action
    /// event whose content says what it changes, folded in chain order.
    #[test]
    fn fold_handles_state_and_action_events() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "count", Value::Integer(10)).unwrap();
        s.lay_action("e2", "incr:count:5").unwrap(); // says what it changes
        s.lay_state("e3", "mood", Value::Text("clear".into())).unwrap();
        s.lay_action("e4", "incr:count:1").unwrap();
        s.lay_action("e5", "incr:fresh:3").unwrap(); // acts on an unset key

        let state = s.rasterize().unwrap();
        assert_eq!(state["count"], Value::Integer(16)); // 10 +5 +1, in order
        assert_eq!(state["mood"], Value::Text("clear".into()));
        assert_eq!(state["fresh"], Value::Integer(3)); // folded from 0

        // order matters: a state write AFTER an action wins over it
        s.lay_state("e6", "count", Value::Integer(0)).unwrap();
        assert_eq!(s.rasterize().unwrap()["count"], Value::Integer(0));
    }

    /// The raster is a READ: rasterizing twice lays nothing, changes nothing.
    #[test]
    fn raster_is_a_read_idempotent() {
        let mut s = StateStore::open_in_memory().unwrap();
        s.lay_state("e1", "k", Value::Integer(7)).unwrap();
        s.lay_action("e2", "incr:k:1").unwrap();
        let a = s.rasterize().unwrap();
        let rows_before: i64 =
            s.conn.query_row("SELECT count(*) FROM state_events", [], |r| r.get(0)).unwrap();
        let b = s.rasterize().unwrap();
        let rows_after: i64 =
            s.conn.query_row("SELECT count(*) FROM state_events", [], |r| r.get(0)).unwrap();
        assert_eq!(a, b);
        assert_eq!(rows_before, rows_after);
    }
}
