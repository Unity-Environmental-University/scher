// ─────────────────────────────────────────────────────────────────────────────
// fact.ts — the POSITIVIST PORCELAIN over the process core.
//
// The society is append-only and read-the-truth (process / high-Reynolds). That model
// is correct but it has a recurring footgun: the temptation to track a thing by a
// STABLE SLUG when the truth is a DERIVED READING. (That exact mistake = the toggle
// desync bug.) A developer's intuition reaches for "a checkbox has a state, I flip it"
// (positivist / laminar) — and the append-only substrate punishes it.
//
// A Fact gives them the laminar surface they want — get()/set(boolean) — and translates
// it FAITHFULLY into append-only-supersede underneath. The bug becomes UNWRITEABLE:
// there is no exposed slug to mistakenly track; get() always reads the establishment
// TRUTH; set(false) APPENDS a supersede (never deletes). This is git's porcelain over
// plumbing: `checkout` feels like "set state", the DAG underneath stays append-only.
//
// HONEST porcelain (honest-hamartia): the positivist surface must not LIE about the
// process underneath. set(false) looks laminar but stays append-only; history() exposes
// the seam on demand — the plumbing is hidden, never erased.
// ─────────────────────────────────────────────────────────────────────────────

import { derive, type Read } from "./cell.js";
import {
  Society,
  isEstablished,
  isOccluded,
  confidence as readConfidence,
  prehensionsOnto,
  type EventRow,
} from "./society.js";

/** A Fact: a positivist handle over the ESTABLISHMENT of a target beat. get()/set()
 *  feel like a boolean you own; underneath they are read-the-truth + append-only-lay.
 *  Pass a Fact to a Story instead of a raw slug, and the desync bug-class is gone. */
export interface Fact {
  /** the truth, now: is the target established (any non-superseded grounding)? */
  get(): boolean;
  /** a reactive read of get() — re-derives when the society appends. */
  readonly read: Read<boolean>;
  /** set the fact. true → lay a (fresh) grounding. false → supersede all live
   *  groundings (append-only undo). INTENT-IDEMPOTENT: set(true) when already true
   *  is inert; same for false. You never juggle slugs — Fact owns them. */
  set(value: boolean): void;
  /** confidence in [0,1] (weighted groundings vs exclusions). */
  confidence(): number;
  /** the seam, on demand: every grounding/supersede beat ever laid for this fact.
   *  The plumbing is hidden by default, never erased — ask and it's all here. */
  history(): EventRow[];
  /** the target beat slug this fact is about (read-only; for composition). */
  readonly target: string;
  // TODO(socratic): should Fact expose the grounding frame (opts.by), or keep it opaque so the caller can't forge writes as a different frame?
}

export interface FactOptions {
  /** the frame (standpoint) that grounds — must exist in the society. */
  by: string;
  /** slug prefix for this fact's groundings (defaults to `f-${target}`). */
  prefix?: string;
  // TODO(socratic): should FactOptions validate that opts.by exists in the society at construction time, or is late-binding (undefined frame = silent no-op) acceptable?
}

/** Build a Fact over a target beat's establishment. This is the positivist wrapper:
 *  give it the target + who's grounding, get a get/set(boolean) handle that's
 *  desync-proof and append-only by construction. */
export function fact(soc: Society, target: string, opts: FactOptions): Fact {
  const prefix = opts.prefix ?? `f-${target}`;
  let nth = 0;

  // TODO(socratic): why bake target into the prefix — if a fact migrates targets or is re-keyed, does `f-${target}` still anchor the history meaningfully?
  // TODO(socratic): if reads are frame-relative, whose frame is get() reading — is "the truth, now" an honest name for a frameless isEstablished, or is opts.by quietly not a standpoint here at all?
  const get = () => isEstablished(soc, target);

  const self: Fact = {
    target,
    read: derive(() => isEstablished(soc, target), [soc.rev]),
    get,
    // TODO(socratic): readConfidence reads the full target — does confidence() bleach away which frames are grounding vs which are excluding, or is it a scoped read through opts.by's lens?
    confidence: () => readConfidence(soc, target),
    // TODO(socratic): scher's one discipline is "opaque slugs, no string-matching" — so what is startsWith(prefix) doing here, and does the `sup-${prefix}` clause still match anything now that un-ground lays `occ-` beats instead of supersedes?
    // TODO(socratic): history() rebuilds the full slug-match on every call — should this be cached/derived, or is the append-only guarantee light enough that recomputing beats the coupling cost?
    // TODO(socratic): the three filter clauses (prehensionsOnto match + sup- prefix + fact prefix) — do they cover every beat this fact could have laid, or is there a fourth kind of beat (e.g., corrective, forensic, meta) that falls through?
    history: () =>
      soc.all().filter(
        (b) =>
          (b.object === target && prehensionsOnto(soc, target, "q-grounding").some((p) => p.slug === b.slug)) ||
          b.slug.startsWith(`sup-${prefix}`) ||
          b.slug.startsWith(prefix),
      ),
    set(value: boolean) {
      const live = get();
      // TODO(socratic): should intent-idempotent short-circuit check opts.by's frame — i.e., is "no needless append" absolute, or should it be "no needless append FROM THIS FRAME"?
      if (value === live) return; // intent-idempotent — no needless append
      if (value) {
        // TODO(socratic): nth lives in this closure, not in the society — if two Facts (or two sessions) share a prefix, doesn't the second one re-lay `${prefix}-0` and resurrect exactly the born-superseded collision this line claims to kill?
        // GROUND: always a FRESH slug → never born-superseded (kills the desync bug).
        // TODO(socratic): why does this line lay directly to the society (soc.layP) rather than going through any Fact-owned beat-creation surface — does that choice make the nth counter necessary for slug freshness, or is it a hygiene detail?
        soc.layP(`${prefix}-${nth++}`, `${opts.by} grounds ${target}`, opts.by, target, "q-grounding");
      } else {
        // UN-GROUND = OCCLUDE every live grounding (2026-06-26: was a self-loop supersede, which
        // the freeze 409s and isOccluded no longer reads). The actor (opts.by) is the named occluder
        // — records WHO un-grounded, and is reversible. Append-only; groundings stay in ink.
        // TODO(socratic): set(false) occludes EVERY live grounding onto target, not just this fact's — should opts.by be able to silently un-ground what other frames laid, and is `occ-${g.slug}` safe when a slug can only be laid once but a grounding can be occluded, un-occluded, and need occluding again?
        for (const g of prehensionsOnto(soc, target, "q-grounding").filter((p) => !isOccluded(soc, p.slug))) {
          soc.layP(`occ-${g.slug}`, `${opts.by} un-grounds ${g.slug}`, opts.by, g.slug, "q-occludes");
        }
      }
    },
  };
  return self;
}
