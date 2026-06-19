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
  isSuperseded,
  confidence as readConfidence,
  prehensionsOnto,
  type Beat,
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
  history(): Beat[];
  /** the target beat slug this fact is about (read-only; for composition). */
  readonly target: string;
}

export interface FactOptions {
  /** the frame (standpoint) that grounds — must exist in the society. */
  by: string;
  /** slug prefix for this fact's groundings (defaults to `f-${target}`). */
  prefix?: string;
}

/** Build a Fact over a target beat's establishment. This is the positivist wrapper:
 *  give it the target + who's grounding, get a get/set(boolean) handle that's
 *  desync-proof and append-only by construction. */
export function fact(soc: Society, target: string, opts: FactOptions): Fact {
  const prefix = opts.prefix ?? `f-${target}`;
  let nth = 0;

  const get = () => isEstablished(soc, target);

  const self: Fact = {
    target,
    read: derive(() => isEstablished(soc, target), [soc.rev]),
    get,
    confidence: () => readConfidence(soc, target),
    history: () =>
      soc.all().filter(
        (b) =>
          (b.object === target && prehensionsOnto(soc, target, "q-grounding").some((p) => p.slug === b.slug)) ||
          b.slug.startsWith(`sup-${prefix}`) ||
          b.slug.startsWith(prefix),
      ),
    set(value: boolean) {
      const live = get();
      if (value === live) return; // intent-idempotent — no needless append
      if (value) {
        // GROUND: always a FRESH slug → never born-superseded (kills the desync bug).
        soc.layP(`${prefix}-${nth++}`, `${opts.by} grounds ${target}`, opts.by, target, "q-grounding");
      } else {
        // UN-GROUND = SUPERSEDE every live grounding. Append-only; groundings stay in ink.
        for (const g of prehensionsOnto(soc, target, "q-grounding").filter((p) => !isSuperseded(soc, p.slug))) {
          soc.lay({ slug: `sup-${g.slug}`, content: `supersedes ${g.slug}`, subject: g.slug, object: g.slug });
        }
      }
    },
  };
  return self;
}
