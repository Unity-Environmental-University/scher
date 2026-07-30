// ─────────────────────────────────────────────────────────────────────────────
// match3-players.ts — whose turn it is changes what falls, and they play each
// other.
//
// Hallie, 2026-07-30, two corrections in a row:
//
//   "not necessarily p = 1/6. Use the game's own logic. What if we have players
//    whose dots show up according to their abilities? Rocket Dan produces
//    rockets 2x as often, searcher Greg brings more moons"
//
//   "And if they play against each other"
//
// Both land on the same fix, and it is deeper than a parameter.
//
// THE FIRST CORRECTION: the distribution is game logic, not arithmetic.
// A hardcoded 1/kinds is an assumption about a game that has characters. If
// Rocket Dan's board really does spit out more 🚀, then an evaluator using
// 1/6 is not approximating — it is wrong about that board, and it will
// misprice every near-run involving a rocket.
//
// THE SECOND: with two players, the distribution is not a property of the
// BOARD. It is a property of WHOSE TURN CAUSED THE REFILL. The same empty cell
// fills differently depending on who cleared it. Which means:
//
//   * a "probability this gap completes" question is incomplete until you say
//     who is filling it
//   * setting up a near-run your OPPONENT completes is a gift, not a plan
//   * Dan's own ability makes rocket-runs likelier FOR DAN — an edge that
//     compounds, and that the AI can see and play around
//
// So `Affinity` rides with the player, refills are seeded by (seed, move, cell,
// PLAYER), and every probability read takes whose-turn as an argument. There is
// no player-free version of these questions, and pretending there is was the
// bug.
// ─────────────────────────────────────────────────────────────────────────────

import { Society } from "scher/society.js";
import { type BoardSpec, type Gem } from "./match3.js";

// ── AFFINITY IS READ FROM SUBLIMES, NOT AUTHORED ────────────────────────────
//
// Hallie, 2026-07-30: "This is easy. Model the players with sublimes."
//
// That retires a mistake I had just made. A first draft gave each player an
// `Affinity` — a hand-authored weight vector — which is a STAT: a stored number
// beside the character, free to drift from whatever the character actually is.
// This stack refuses stored values everywhere else and I bolted one on here.
//
// A player's pull toward 🚀 is not a stat. It IS A STAR: a wish that never
// completely comes true (`q-sublime-pole` — "a pole that never closes... a star
// to steer by, not a place to land"). Rocket Dan does not have a rocket stat;
// Rocket Dan is REACHING for something, in rockets, and the board tilts toward
// what he reaches for.
//
// So affinity is DERIVED. Change a character's stars and the board changes with
// them, because there was never a second place for the number to live. It also
// collapses Stance into the same read (`stanceBetween`): how much I regard your
// gain is how much our stars overlap.

/** A star, as this module needs it — structurally the `Star` from a game's
 *  own character model, kept local so scher-game depends on no game content. */
export interface Sublime {
  id: string;
  wish: string;
  /** which gem indices this star is told in. */
  keys: Gem[];
  /** how brightly it burns. Not a ranking — two stars can burn bright and pull
   *  opposite ways, which is what makes a character worth playing. */
  magnitude: number;
}

/** A player's pull on the gem stream. DERIVED from stars, never authored. */
export interface Affinity {
  weights: number[];
}

export interface Player {
  id: string;
  name: string;
  /** WHAT THEY REACH FOR. The only authored thing here. */
  stars: Sublime[];
  /** cards in hand — moves they can play, some carrying victory conditions. */
  hand?: Card[];
}

/**
 * THE READ: affinity is stars projected onto gem keys.
 *
 * Every gem starts at 1 (nothing is impossible for anyone); each star adds its
 * magnitude to the keys it is told in. A player with no stars reads uniform,
 * which is the right reading of someone who wants nothing in particular rather
 * than a special case.
 */
export function affinityOf(p: Player, kinds: number): Affinity {
  const w = new Array(kinds).fill(1);
  for (const s of p.stars)
    for (const k of s.keys)
      if (k >= 0 && k < kinds) w[k] += s.magnitude;
  return { weights: w };
}

/** A character who wants nothing in particular. */
export const uniform = (kinds: number): Affinity =>
  ({ weights: new Array(kinds).fill(1) });

/** A star told in one gem. Convenience for tests and worked examples; real
 *  characters bring their stars from the game's own character model. */
export const starIn = (gem: Gem, wish: string, magnitude = 1): Sublime =>
  ({ id: `star-${gem}-${wish.slice(0, 12)}`, wish, keys: [gem], magnitude });

// ── the worked examples from Hallie's message ───────────────────────────────
// gem indices follow GEMS.career: 0 🧠  1 ❤️  2 🔍  3 😎  4 🚀  5 🐛

// Note what these say now: not "Dan has rocket 2x" but "Dan is reaching for
// something, in rockets." The 2x FALLS OUT (base 1 + magnitude 1).

export const ROCKET_DAN = (): Player => ({
  id: "rocket-dan", name: "Rocket Dan",
  stars: [starIn(4, "To get off this planet.", 1)],
});

export const SEARCHER_GREG = (): Player => ({
  id: "searcher-greg", name: "Searcher Greg",
  stars: [starIn(2, "To find the thing nobody else found.", 1)],
});

/** Wants BOTH, partly — the overlap case that makes coopetition a dial rather
 *  than a binary. */
export const GENERALIST_MAB = (): Player => ({
  id: "generalist-mab", name: "Mab",
  stars: [starIn(4, "To see a launch, once.", 0.5),
          starIn(2, "To be the one who knows where things are.", 0.5)],
});

// ── the real probability, from the game's own logic ─────────────────────────

/** P(a refill caused by this player is `gem`). THE read every near-run
 *  calculation needs — and it is meaningless without a player. */
export function pGem(a: Affinity, gem: Gem): number {
  const total = a.weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || gem < 0 || gem >= a.weights.length) return 0;
  return a.weights[gem] / total;
}

/** The full distribution, for a caller that wants to reason over all of it. */
export const distribution = (a: Affinity): number[] => {
  const total = a.weights.reduce((s, w) => s + w, 0) || 1;
  return a.weights.map((w) => w / total);
};

/**
 * Draw a gem for a player, deterministically.
 *
 * Same law as the uniform version in match3.ts: a pure function of
 * (seed, move, nonce, PLAYER), never a stateful RNG — so replay is exact even
 * with two players whose abilities differ. The player id is folded into the
 * hash, which is what makes "the same cell fills differently depending on who
 * cleared it" true rather than aspirational.
 */
export function drawFor(spec: BoardSpec, p: Player, move: number, nonce: number): Gem {
  const h = hashStr(`${spec.seed}|${move}|${nonce}|${p.id}`);
  const dist = distribution(affinityOf(p, spec.kinds));
  let r = (h % 100000) / 100000;
  for (let i = 0; i < dist.length; i++) {
    r -= dist[i];
    if (r < 0) return i;
  }
  return dist.length - 1;
}

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ── turn order: whose refill is it? ─────────────────────────────────────────

export interface Match {
  players: Player[];
  /** who moves first. */
  first?: number;
}

/** Whose turn is move `n` (0-based). Alternating, which is the only order
 *  worth building until a design says otherwise. */
export const playerAt = (m: Match, n: number): Player =>
  m.players[((m.first ?? 0) + n) % m.players.length];

/**
 * P(this gap completes a run of `gem`) — asked properly, with a filler.
 *
 * `gaps` unresolved cells all have to land on `gem`, and each is drawn by
 * whoever fills it. With one player that is their affinity to the power of
 * gaps; with two it depends on who is filling, which is exactly the point.
 */
export function pCompletes(filler: Player, gem: Gem, gaps: number, kinds: number): number {
  return Math.pow(pGem(affinityOf(filler, kinds), gem), gaps);
}

// ── STANCE: competitive, cooperative, coopetitive ───────────────────────────
//
// Hallie, 2026-07-30: "I'm also interested in cooperative and coopetitive
// boards." … "That's I think how I might want to do actual performance of jobs."
//
// Which is a better use of this mechanic than a minigame, and it changes the
// evaluation from a binary to a DIAL.
//
// Doing a job with colleagues IS a coopetitive board: you share a workplace,
// your abilities genuinely differ, and setting someone else up is sometimes
// exactly right and sometimes gives away credit you needed. A pure competitor
// hoards setups; a pure cooperator feeds whoever can convert best; a real
// workplace is somewhere between, and the position on that dial is a
// CHARACTER TRAIT, not a game mode.
//
// `ally` is that dial, in [-1, 1]:
//    -1  COMPETITIVE   another player's gain is my loss, fully
//     0  INDIFFERENT   only my own score counts; theirs is noise
//    +1  COOPERATIVE   their gain is my gain, fully — one shared score
//   0.4  COOPETITIVE   the interesting middle: I want us to do well AND I
//                      want to be the one who did it
//
// Note what falls out: with ally = 1 the whole search becomes a cooperative
// solver that will happily hand a cascade to whoever converts it best — which
// is exactly the read you want for "did this team do the job well," and it is
// the same code.

export type Stance = {
  /** how much another player's gain counts as mine. [-1, 1]. */
  ally: number;
  /** per-player override, when a character gets on with one colleague and not
   *  another. Falls back to `ally`. */
  toward?: Record<string, number>;
};

export const COMPETITIVE: Stance = { ally: -1 };
export const INDIFFERENT: Stance = { ally: 0 };
export const COOPERATIVE: Stance = { ally: 1 };
export const COOPETITIVE: Stance = { ally: 0.4 };

/** How much do I count THIS player's gain? Mine always counts fully. */
export function regard(st: Stance, me: Player, other: Player): number {
  if (other.id === me.id) return 1;
  return st.toward?.[other.id] ?? st.ally;
}

/**
 * STANCE, READ FROM STARS — the same move as affinity, one level up.
 *
 * How much do I regard your gain? As much as we are reaching for the same
 * thing. Two players whose stars share keys are collaborators BY CONSTRUCTION,
 * not by a flag someone set; two reaching for different things are indifferent;
 * partial overlap is the coopetitive middle — which is what a real workplace
 * is, and now it is derived rather than declared.
 *
 * Returns overlap in [0, 1]. A designer who wants outright hostility still says
 * so explicitly (COMPETITIVE) — shared stars can explain cooperation, but they
 * cannot explain malice, and pretending otherwise would be the stat mistake
 * again in a different costume.
 */
/**
 * SCAR (2026-07-30, caught in the browser, not by a test): call this with the
 * BOARD's kind-count and it silently lies.
 *
 * Star keys are in the GAME's vocabulary (moon = 6 in GLYPHS), while a derived
 * board may only have 4 kinds. `affinityOf` bounds-checks `k < kinds`, so every
 * key at or above the board size is dropped — and two characters who both say
 * "To get to the moon" read as INDIFFERENT, 0.00, because their shared star
 * was silently discarded.
 *
 * The rule: pass the size of the GAME'S GLYPH TABLE here, never the board's.
 * Alignment is between people; it does not change because they walked into a
 * smaller job. Guarded below rather than left as a comment, since the failure
 * is invisible — a wrong number, not an error.
 */
export function stanceBetween(a: Player, b: Player, kinds: number): Stance {
  const highest = Math.max(0, ...[...a.stars, ...b.stars].flatMap((s) => s.keys));
  if (highest >= kinds)
    throw new RangeError(
      `stanceBetween: a star names key ${highest} but kinds=${kinds}. Pass the ` +
      `GAME's glyph-table size, not the board's palette size — otherwise shared ` +
      `stars above the board size are dropped and two aligned people read as ` +
      `indifferent.`,
    );
  return stanceUnchecked(a, b, kinds);
}

function stanceUnchecked(a: Player, b: Player, kinds: number): Stance {
  const wa = affinityOf(a, kinds).weights;
  const wb = affinityOf(b, kinds).weights;
  // cosine similarity on the star-derived pulls, with the uniform base removed
  // so two starless players read as indifferent rather than identical.
  const da = wa.map((w) => w - 1), db = wb.map((w) => w - 1);
  const dot = da.reduce((s, v, i) => s + v * db[i], 0);
  const na = Math.hypot(...da), nb = Math.hypot(...db);
  return { ally: na && nb ? dot / (na * nb) : 0 };
}

/**
 * VALUE OF A NEAR-RUN, given who will fill it and how I feel about them.
 *
 * A near-run is worth something to whoever CLOSES it — which is not always the
 * player who set it up. That is the whole reason multiplayer evaluation is not
 * single-player with a different distribution: a setup can be a gift.
 *
 * Competitive: their gain scores negative, so I avoid feeding them.
 * Cooperative: their gain scores positive, so I will deliberately set them up —
 *   and MORE so if their affinity converts it better than mine would.
 * Coopetitive: partially. I will feed a colleague who can really use it, but
 *   not at full weight, and I would rather close it myself.
 */
export function nearRunValue(
  m: Match, me: Player, moveIndex: number, st: Stance,
  gem: Gem, gaps: number, cells: number, kinds: number,
): number {
  const filler = playerAt(m, moveIndex);
  const p = pCompletes(filler, gem, gaps, kinds);
  return regard(st, me, filler) * p * cells * 10;
}

/** Back-compat alias for the purely competitive read. */
export const adversarialValue = (
  m: Match, me: Player, moveIndex: number, gem: Gem, gaps: number,
  cells: number, kinds: number,
) => nearRunValue(m, me, moveIndex, COMPETITIVE, gem, gaps, cells, kinds);

/**
 * WHO CONVERTS THIS BEST? The cooperative question, and the reason a
 * cooperative board is not just "everyone plays nice" — it is a real
 * optimisation. Rocket Dan should be handed the rocket setups.
 */
export function bestConverter(m: Match, gem: Gem, gaps: number, kinds: number): Player {
  return m.players.reduce((best, p) =>
    pCompletes(p, gem, gaps, kinds) > pCompletes(best, gem, gaps, kinds) ? p : best,
    m.players[0]);
}

/** The team's expected value on a near-run — what a cooperative board scores
 *  regardless of who happens to be up. */
export const teamValue = (
  m: Match, gem: Gem, gaps: number, cells: number, kinds: number,
): number =>
  pCompletes(bestConverter(m, gem, gaps, kinds), gem, gaps, kinds) * cells * 10;

// ── THE LOOP THIS IS FOR ────────────────────────────────────────────────────
//
// Hallie, 2026-07-30, naming what all of this is actually for:
//
//   "playing with/against her. So it becomes about aligning motives, building
//    out your deck, and then going to do a solo or group job."
//
// Which means the match-3 was never a minigame. It is HOW WORK HAPPENS, and
// the interview was how you got the coworkers. The three phases each already
// have their mechanism, and none of them needed inventing for this:
//
//   ALIGN MOTIVES   stanceBetween() — read from shared stars. You do not pick
//                   an ally from a menu; you find out whether what you are
//                   reaching for overlaps with what they are. Two people with
//                   the same star cooperate BY CONSTRUCTION.
//
//   BUILD A DECK    cards, which come from lore. A card is the same PbtA move
//                   shape as an interview move (MODEL.md, "moves are the
//                   universal verb"), so a chapter you lived becomes a thing
//                   you can do at work. Transposition earns you cards in keys
//                   you did not live in.
//
//   DO THE JOB      a board, solo or group, with stance set by the alignment
//                   you actually achieved. A team whose stars overlap plays
//                   cooperatively and it SHOWS in the score; a team that
//                   merely shares an employer does not.
//
// The uncomfortable, true thing this models: you can do a job with someone
// whose star is nothing like yours, and the board will be worse, and neither
// of you did anything wrong. That is a real fact about work, and it falls out
// of the arithmetic rather than being written into dialogue.
//
// ── AND WHERE THE CARDS COME FROM (Hallie, closing the loop) ────────────────
//
//   "when you add an event to your backstory, you're DRAFTING A CARD. You get
//    to fill in the description, the card you draft has the values, you pick
//    the emoji and tell the flavor."
//
// So the lore editor was a DECK BUILDER the whole time, and neither of us knew
// it while building it this morning. Adding a chapter is drafting:
//
//   the event's emoji values  →  the card's numbers      (not chosen freely)
//   the player picks the key  →  which gem it works in
//   the player writes flavor  →  the trigger, the name
//   the star it reaches       →  its victory condition   (victoryFromStar)
//
// Which means a character cannot hold a card their history does not support —
// the values come from what actually happened. You do not buy a deck, you
// LIVED one. And transposition (learning to tell a story in a key you did not
// live it in) is how you get cards in keys your history never gave you, which
// is the same mechanic doing double duty.
//
// It also settles what a job IS, mechanically: a board where the cards are
// everyone's histories, the alignment is whether your stars overlap, and the
// score is what the work produced. Nothing about that needed a game system
// bolted on; it is the character model, read at a board.
//
// ── CARDS: moves a player holds, and what they are trying to prove ──────────
//
// Hallie, 2026-07-30: "And, finally, players can have CARDS — which give them
// moves and have victory conditions."
//
// Which closes the loop back to the interview hand (MODEL.md, "moves are the
// universal verb"): the SAME card shape, PbtA trigger and all, now on a board.
// A card is not a special-case power system; it is the move vocabulary this
// project already committed to, pointed at cells instead of at an interviewer.
//
// The victory condition is the interesting half. A card does not just DO
// something — it says what would count as having done it, which means a
// coopetitive board can have players pursuing genuinely different wins on the
// same cells. "Clear 12 🚀" and "keep the board alive 20 turns" are both
// winnable, simultaneously, by different people. That is what a job is.

export interface Card {
  id: string;
  name: string;
  /** RULES TEXT: what the card actually does, plainly. Hallie caught the demo
   *  showing flavor where rules belong (2026-07-30) — "Turn 5 non-ships into
   *  Rockets" is the rule; the trigger is atmosphere. A player has to be able
   *  to read what a card does without inferring it from a mood.
   *
   *  Derivable from `effect` for the built-in kinds (see `rulesTextOf`), but
   *  overridable, because a designer will always word it better. */
  rules?: string;
  /** The PbtA trigger — WHEN this applies, not decoration.
   *
   *  NOTE (Hallie, 2026-07-30: "can you kill the flavor text"): there is no
   *  separate flavour field, deliberately. Flavour is English prose, and
   *  Simlish retires English except where it is load-bearing
   *  (career-rpg/muslins/09-language/LANGUAGE.md). A trigger is load-bearing —
   *  it says when the card is live — so it stays; atmosphere goes. If a card
   *  wants mood, the mood is the art and the glyphs. */
  trigger: string;
  /** what playing it does to the board. A READ-and-lay, like every other move:
   *  returns the cells to clear, or null if the card does not apply here. */
  effect: CardEffect;
  /** what winning WITH this card means. Read against the match's history. */
  victory?: VictoryCondition;
  /** how the ability reloads. Omit for an always-available card. */
  recharge?: Recharge;
  /** free uses before recharging matters. */
  startingCharges?: number;
}

/**
 * How many charges this card has RIGHT NOW — folded, never stored.
 *
 * RECHARGE IS A COOLDOWN, NOT A PURCHASE (Hallie, 2026-07-30: "they should
 * RECHARGE. that should be a cooldown, not an initial cost").
 *
 * The first version had you EARN charges from zero: clear 3 moons, gain a use.
 * That makes an early-game card dead weight and turns the fuel gem into a
 * price. Wrong shape. "Recharges with Moons" means the card comes to the job
 * READY, you spend it, and clearing moons brings it back — so the fuel
 * controls PACE, not access, and a card is never useless, only cooling.
 *
 * Which also fixes the moth: her ability is what she does, not something she
 * has to save up for.
 */
export function chargesOf(c: Card, r: MatchRecord, me: Player): number {
  if (!c.recharge) return Infinity;
  const capacity = c.startingCharges ?? 1;        // it arrives FULL
  const spent = r.played?.[me.id]?.[c.id] ?? 0;
  const fuel = r.cleared[me.id]?.[c.recharge.gem] ?? 0;
  const restored = Math.floor(fuel / c.recharge.per);
  // never above capacity: fuel banked while full is not saved up, it is spent
  // keeping the card topped off — which is what a cooldown does.
  return Math.max(0, Math.min(capacity, capacity - spent + restored));
}

/** How close the cooldown is to giving back a charge, 0..1. For a UI that
 *  wants to show a filling ring rather than a number that jumps. */
export function cooldownProgress(c: Card, r: MatchRecord, me: Player): number {
  if (!c.recharge) return 1;
  if (chargesOf(c, r, me) >= (c.startingCharges ?? 1)) return 1;
  const fuel = r.cleared[me.id]?.[c.recharge.gem] ?? 0;
  return (fuel % c.recharge.per) / c.recharge.per;
}

export const canPlay = (c: Card, r: MatchRecord, me: Player): boolean =>
  chargesOf(c, r, me) > 0;

export type CardEffect =
  | { kind: "clear-row" }
  | { kind: "clear-col" }
  | { kind: "detonate-gem"; gem: Gem }
  | { kind: "swap-any" }
  | { kind: "reroll-cell" }
  /** Hallie's worked example: "Turn 5 non-ships into Rockets." */
  | { kind: "transmute"; into: Gem; count: number }
  /** "Turn All spots with no same-neighbor into ?'s" — converts the LONELY
   *  cells, the ones matching nothing adjacent. A read, then a lay. */
  | { kind: "convert-lonely"; into: Gem };

/**
 * ABILITIES RECHARGE OFF A GEM — which is the part that makes a card a
 * strategy rather than a button.
 *
 * Hallie's example: Rocket Dan's ability "Recharges with Moons." So playing it
 * makes him want moons, which are NOT the thing he is scoring — his want and
 * his fuel come apart, and the interesting play is in that gap. A card whose
 * fuel is its own victory gem would be a straight line; this is a loop.
 *
 * Charge is a FOLD over cleared gems, not a counter anyone increments: the
 * MatchRecord already knows what you cleared, so `charge` is a read.
 */
export interface Recharge {
  /** which gem reloads it. */
  gem: Gem;
  /** how many of that gem to restore one charge. */
  per: number;
}

/** A victory condition is a READ over the match, not a counter someone
 *  increments — same law as everything else. */
export interface VictoryCondition {
  id: string;
  /** legible, so a player can be told what they are chasing. */
  says: string;
  /** which gems this condition is scored in. Declared rather than parsed out
   *  of `id`, because the palette read depends on it — a victory whose gems
   *  are invisible to gemsFor produces a board you cannot win on. */
  gems?: Gem[];
  /** evaluated against the match record. */
  met: (r: MatchRecord, me: Player) => boolean;
  /** 0..1, for a progress bar. */
  progress?: (r: MatchRecord, me: Player) => number;
}

/** What a victory read gets to look at. Deliberately small: cleared gems by
 *  player, moves made, turns elapsed. Anything richer should be a read over
 *  the society, not a wider record. */
export interface MatchRecord {
  /** cleared[playerId][gem] = count */
  cleared: Record<string, number[]>;
  moves: Record<string, number>;
  /** played[playerId][cardId] = times — so charge is earned minus spent. */
  played?: Record<string, Record<string, number>>;
  turns: number;
}

export const emptyRecord = (m: Match, kinds: number): MatchRecord => ({
  cleared: Object.fromEntries(m.players.map((p) => [p.id, new Array(kinds).fill(0)])),
  moves: Object.fromEntries(m.players.map((p) => [p.id, 0])),
  played: Object.fromEntries(m.players.map((p) => [p.id, {}])),
  turns: 0,
});

/** "Get the most X" — a COMPARATIVE condition, which is different from
 *  clearN in a way that matters: it cannot be met alone, only against others.
 *  A board where everyone holds one of these is competitive by construction. */
export const mostOf = (gems: Gem[], label: string): VictoryCondition => ({
  id: `most-${gems.join("-")}`,
  says: label,
  gems,
  met: (r, me) => {
    const mine = gems.reduce((n, g) => n + (r.cleared[me.id]?.[g] ?? 0), 0);
    return Object.entries(r.cleared).every(([id, cs]) =>
      id === me.id || gems.reduce((n, g) => n + cs[g], 0) < mine) && mine > 0;
  },
  progress: (r, me) => {
    const mine = gems.reduce((n, g) => n + (r.cleared[me.id]?.[g] ?? 0), 0);
    const best = Math.max(1, ...Object.entries(r.cleared)
      .filter(([id]) => id !== me.id)
      .map(([, cs]) => gems.reduce((n, g) => n + cs[g], 0)));
    return Math.min(1, mine / (best + 1));
  },
});

/** "Clear N of a gem" — the condition a star-shaped player naturally wants,
 *  and note it can be READ off their star rather than assigned. */
export const clearN = (gem: Gem, n: number, label: string): VictoryCondition => ({
  id: `clear-${gem}-${n}`,
  says: label,
  gems: [gem],
  met: (r, me) => (r.cleared[me.id]?.[gem] ?? 0) >= n,
  progress: (r, me) => Math.min(1, (r.cleared[me.id]?.[gem] ?? 0) / n),
});

/** A victory condition derived from what a player is REACHING FOR — so the
 *  win condition and the affinity come from the same place, and a character
 *  cannot be given a goal their history does not support. */
export function victoryFromStar(s: Sublime, n = 12): VictoryCondition {
  const gem = s.keys[0] ?? 0;
  return clearN(gem, n, `${s.wish} (clear ${n})`);
}

// ── HALLIE'S WORKED EXAMPLE, exactly as specified ───────────────────────────
// "Rocket Dan has 'Fly Me To The Moon' / 'Get the most Moons and Rocket Ships'
//  / 'Ability: Turn 5 non ships in to Rockets. Recharges with Moons'"
//
// Note the shape it forces, and how good it is: Dan SCORES on 🚀 and 🌙, his
// ability MAKES 🚀, and it RELOADS on 🌙. So the two halves of his victory
// condition do different jobs — rockets are points, moons are fuel — and he
// cannot just chase one. That gap is the strategy, and it fell out of one
// sentence rather than needing a system.
//
// gem indices, GEMS.career: 0 🧠  1 ❤️  2 🔍  3 😎  4 🚀  5 🐛
// (a 🌙 board would use GEMS.world: 0 🐜 1 🐝 2 🪲 3 🌙 4 ☀️ 5 🌸)

export const FLY_ME_TO_THE_MOON = (rocket: Gem = 4, moon: Gem = 3): Card => ({
  id: "fly-me-to-the-moon",
  name: "Fly Me To The Moon",
  trigger: "When you make your own luck out of what is lying around…",
  effect: { kind: "transmute", into: rocket, count: 5 },
  victory: mostOf([moon, rocket], "Get the most Moons and Rocket Ships"),
  recharge: { gem: moon, per: 3 },
  startingCharges: 1,
});

// CORRECTION (Hallie, 2026-07-30): "rocket dan and moon moth have the same
// card." Fly Me To The Moon is the MOTH's card — Rocket Dan was the worked
// example of the card's SHAPE, and I split one character into two by treating
// the example as a second person.
//
// It was always hers, and it reads better as hers: she wants the moon, she
// makes rockets to get there, and she reloads on moons. The card's fuel/points
// gap is her whole situation — the thing she wants is also the thing that lets
// her keep trying for it.
//
// ROCKET_DAN stays as a bare affinity example (a player who pulls rockets, no
// card), because the affinity demo is still worth having and deleting him
// would take the "two players pull differently" test with it.

/**
 * INVESTIGATE — Hallie's second card, and it introduces a new effect shape.
 *
 *   "Investigate (charges with Magnifying Glasses) · Have the most ???'s ·
 *    Turn All spots with no same-neighbor into ?'s"
 *
 * Two things worth naming. First, it is SELF-FUELLING in a way Dan's is not:
 * it makes ?'s, it scores on ?'s, and it reloads on 🔍 — so the investigator
 * wants glasses to keep looking, and looking makes the thing she scores on.
 * Dan's loop has a gap (rockets score, moons fuel); hers is tighter. Those are
 * different characters, mechanically, and neither needed a special system.
 *
 * Second, "all spots with no same-neighbor" is a READ over the board — the
 * lonely cells, the ones matching nothing around them. Which is a lovely fit
 * for an investigator: she converts what nobody else could use.
 */
export const INVESTIGATE = (question: Gem = 5, glass: Gem = 2): Card => ({
  id: "investigate",
  name: "Investigate",
  trigger: "When you look at the part everyone else walked past…",
  effect: { kind: "convert-lonely", into: question },
  victory: mostOf([question], "Have the most ?'s"),
  recharge: { gem: glass, per: 3 },
  startingCharges: 1,
});

/**
 * THE MOON MOTH — the one from the drawing: glasses, feathered antennae, a
 * moon nameplate on her desk and a rocket poster on the wall behind her.
 *
 * Her stars are the character work's: the moon, and never letting anyone be
 * alone. FLY ME TO THE MOON is HER card (Hallie's correction) — and the fit is
 * exact once you see it. She wants the moon; the card makes rockets, which is
 * how you get there; and it reloads on moons, so the thing she is reaching for
 * is also the thing that lets her keep reaching. That is a whole character in
 * one card, and the poster on her wall says it before she does.
 */
export const MOON_MOTH = (rocket: Gem = 4, moon: Gem = 3, heart: Gem = 1): Player => ({
  id: "moon-moth", name: "the moth at the desk",
  stars: [starIn(moon, "To get to the moon.", 1),
          starIn(heart, "To never let anyone be alone.", 0.5)],
  hand: [FLY_ME_TO_THE_MOON(rocket, moon)],
});

/** The reclamation foreman — the hard-hat bug, the other drawn character.
 *  She INVESTIGATES: makes ?'s out of what nobody else could use, and reloads
 *  on the looking itself. */
export const FOREMAN = (question: Gem = 5, glass: Gem = 2, heart: Gem = 1): Player => ({
  id: "foreman", name: "the reclamation foreman",
  stars: [starIn(glass, "To find the thing nobody else found.", 1),
          starIn(heart, "To leave the block better than I found it.", 0.5)],
  hand: [INVESTIGATE(question, glass)],
});

// ── JOB CARDS: what the WORK needs, not what a person wants ─────────────────
//
// Hallie, 2026-07-30: "THERE should also be Job Cards — things that the job
// needs to happen to finish, you're working towards a completed job."
//
// The missing half. Until now a board had personal victory conditions and no
// ENDING: you could chase "most 🌙" forever and the work was never done. A job
// card is the work itself — requirements, SHARED, that everyone's clears count
// toward.
//
// And it makes the coopetition real rather than a mood, because two reads come
// apart:
//
//   DID THE JOB GET DONE?   a shared read over everyone's clears
//   WHO CARRIED IT?         a personal read over yours
//
// A crew can finish while you got nothing you wanted. You can hit your own
// condition on a job that failed. Both happen at work, and neither needed
// writing into dialogue.

export interface Requirement {
  /** what the work needs, in a gem. */
  gem: Gem;
  /** how many, across EVERYONE. */
  need: number;
  /** legible: "log the finds". English, because it is load-bearing. */
  says: string;
}

export interface JobCard {
  id: string;
  name: string;
  /** what the client actually asked for. */
  brief: string;
  /** every requirement must be met for the job to be done. */
  requires: Requirement[];
  /** optional deadline in turns. Left in the model but NOT shown by default
   *  (Hallie, 2026-07-30) — a visible countdown turns work into a timed test,
   *  and this game is about doing a job with someone, not beating a clock. A
   *  design that wants pressure can surface it; the default does not. */
  turns?: number;
  /** a gem that works AGAINST the job. */
  hazard?: Gem;
}

/** Progress on one requirement — summed across the whole crew. */
export function requirementProgress(
  r: Requirement, rec: MatchRecord,
): { done: number; need: number; met: boolean; by: Record<string, number> } {
  const by: Record<string, number> = {};
  let done = 0;
  for (const [pid, cleared] of Object.entries(rec.cleared)) {
    const n = cleared[r.gem] ?? 0;
    by[pid] = n;
    done += n;
  }
  return { done, need: r.need, met: done >= r.need, by };
}

/** Is the job finished? A read over the shared record — no counter anywhere. */
export const jobDone = (j: JobCard, rec: MatchRecord): boolean =>
  j.requires.every((r) => requirementProgress(r, rec).met);

/** Out of time? */
export const jobFailed = (j: JobCard, rec: MatchRecord): boolean =>
  j.turns !== undefined && rec.turns >= j.turns && !jobDone(j, rec);

/** 0..1 across all requirements. */
export function jobProgress(j: JobCard, rec: MatchRecord): number {
  if (!j.requires.length) return 1;
  const each = j.requires.map((r) => {
    const p = requirementProgress(r, rec);
    return Math.min(1, p.done / Math.max(1, p.need));
  });
  return each.reduce((a, b) => a + b, 0) / each.length;
}

/**
 * WHO CARRIED IT — each player's share of the job's requirements.
 *
 * Deliberately separate from `jobDone`. A crew can finish a job in which one
 * person did almost none of it, and the game should be able to say so without
 * that changing whether the work is done.
 */
/**
 * WHO CARRIED IT. Available, and deliberately NOT displayed by default
 * (Hallie, 2026-07-30: "kill the credits") — a live credit split turns a
 * shared job into a scoreboard, which is the opposite of what a coopetitive
 * board is for. Keep the read for a post-job scene or a performance review
 * where it MEANS something; do not put it on the wall while people work.
 */
export function contribution(j: JobCard, rec: MatchRecord): Record<string, number> {
  const total: Record<string, number> = {};
  let all = 0;
  for (const req of j.requires) {
    const p = requirementProgress(req, rec);
    for (const [pid, n] of Object.entries(p.by)) {
      const counted = Math.min(n, req.need);      // work past the ask is not credit
      total[pid] = (total[pid] ?? 0) + counted;
      all += counted;
    }
  }
  if (!all) return total;
  for (const k of Object.keys(total)) total[k] = total[k] / all;
  return total;
}

/** The job's gems, so gemsFor includes what the WORK needs. */
export const gemsJobNeeds = (j: JobCard): Gem[] =>
  [...j.requires.map((r) => r.gem), ...(j.hazard !== undefined ? [j.hazard] : [])];

/** The worked example: the job the reclamation foreman would post. */
export const CLEAR_THE_LOT = (glass: Gem, heart: Gem, hazard: Gem): JobCard => ({
  id: "clear-the-lot",
  name: "Clear The Lot",
  brief: "Log what is worth keeping. Mind the neighbours.",
  requires: [
    { gem: glass, need: 12, says: "log the finds" },
    { gem: heart, need: 8,  says: "mind the neighbours" },
  ],
  hazard,
});

/** Whoever has met a victory condition. Plural on purpose: a cooperative or
 *  coopetitive board can have several winners, and forcing one is a design
 *  choice nobody asked for. */
export function winners(m: Match, r: MatchRecord): Player[] {
  return m.players.filter((p) =>
    (p.hand ?? []).some((c) => c.victory?.met(r, p)));
}

/** A player's edge on a specific gem, relative to uniform. >1 means they pull
 *  it more than chance. Useful for a UI: "Dan is 2.0x on 🚀". */
export const edgeOn = (p: Player, gem: Gem, kinds: number): number =>
  pGem(affinityOf(p, kinds), gem) * kinds;

// ── effect reads: what a card would do, computed before it is played ────────
// Every one of these is a READ (cells in → cells out). An AI can evaluate a
// card without playing it, which is the same discipline as the interview
// judge: thinking leaves no trace.

/** The lonely cells: no orthogonal neighbour of the same gem. Investigate's
 *  target set, and a decent "this board is stuck" signal on its own. */
export function lonelyCells(spec: BoardSpec, cells: Gem[]): number[] {
  const out: number[] = [];
  for (let y = 0; y < spec.h; y++) {
    for (let x = 0; x < spec.w; x++) {
      const i = y * spec.w + x;
      if (cells[i] < 0) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < spec.w && ny < spec.h)
        .map(([nx, ny]) => cells[ny * spec.w + nx]);
      if (!nb.some((g) => g === cells[i])) out.push(i);
    }
  }
  return out;
}

/** Apply a card to a board — a pure read, returning the new cells. Nothing is
 *  laid here; the caller decides whether this future becomes the past. */
export function applyCard(
  spec: BoardSpec, cells: Gem[], c: Card, at?: number,
): Gem[] {
  const out = [...cells];
  switch (c.effect.kind) {
    case "convert-lonely":
      for (const i of lonelyCells(spec, out)) out[i] = c.effect.into;
      return out;
    case "transmute": {
      const into = c.effect.into;
      let n = c.effect.count;
      for (let i = 0; i < out.length && n > 0; i++)
        if (out[i] >= 0 && out[i] !== into) { out[i] = into; n--; }
      return out;
    }
    case "clear-row": {
      if (at === undefined) return out;
      const y = Math.floor(at / spec.w);
      for (let x = 0; x < spec.w; x++) out[y * spec.w + x] = -1;
      return out;
    }
    case "clear-col": {
      if (at === undefined) return out;
      const x = at % spec.w;
      for (let y = 0; y < spec.h; y++) out[y * spec.w + x] = -1;
      return out;
    }
    case "detonate-gem": {
      const g = c.effect.gem;
      for (let i = 0; i < out.length; i++) if (out[i] === g) out[i] = -1;
      return out;
    }
    default:
      return out;
  }
}

// ── THE GEMS COME FROM WHO IS ON THE JOB ────────────────────────────────────
//
// Hallie, 2026-07-30: "the characters and job involved should determine the
// gems."
//
// Which retires the last fixed thing in this file. A hardcoded 6-gem palette
// says every job is the same job — but a reclamation crew and an admissions
// interview are not played in the same currency, and two different crews on
// the same job should not be either.
//
// So the palette is a READ: the union of what the people involved are
// reaching for (their star keys) plus what the job itself demands. Which
// means:
//
//   * a board's gems TELL YOU who is on it and what is being asked
//   * bringing a different colleague literally changes what falls
//   * a job that demands a key nobody has is a visibly hard job — the gem is
//     on the board and nobody pulls it
//
// The kind-count follows from the same read, so `kinds` stops being a magic
// number too. A two-person job with narrow stars is a small, focused board; a
// crowded one with a demanding client is a noisy board. That difficulty comes
// from the fiction rather than from a slider.

/** What a job asks for, in keys. */
export interface JobDemand {
  id: string;
  /** the keys the WORK needs, whoever shows up. */
  keys: Gem[];
  /** optional: a key the job punishes — noise, distraction, the 🐛 in the
   *  machine. Included in the palette so it can show up and be dealt with. */
  hazard?: Gem;
}

/**
 * THE PALETTE READ: which gems are on this board, given who is here.
 *
 * Ordered so the result is stable (same crew, same board) rather than
 * depending on Set iteration — a board that reshuffles its own palette
 * between reads would break replay.
 */
export function gemsFor(m: Match, job?: JobDemand | JobCard): Gem[] {
  const seen = new Set<Gem>();
  for (const p of m.players) {
    // what they REACH FOR
    for (const s of p.stars)
      for (const k of s.keys) seen.add(k);
    // …and what their CARDS NEED. This was the bug (Hallie, 2026-07-30:
    // "There are no rocketships on this board"): the moth's card makes 🚀 and
    // her victory says "most Moons and Rocket Ships", but the palette read
    // only looked at STARS — and rockets are her MEANS, not her want. So a
    // card she holds, whose whole job is making rockets, had no rockets to
    // make, and the UI called it "not on this board" as though that were a
    // design outcome rather than a broken read.
    //
    // A gem is in play if ANYONE here needs it — to want it, to make it, or
    // to fuel with it.
    for (const c of p.hand ?? []) {
      for (const k of gemsCardNeeds(c)) seen.add(k);
    }
  }
  if (job && "requires" in job) for (const k of gemsJobNeeds(job)) seen.add(k);
  else for (const k of (job as JobDemand | undefined)?.keys ?? []) seen.add(k);
  if (job?.hazard !== undefined) seen.add(job.hazard);
  return [...seen].sort((a, b) => a - b);
}

/** RULES TEXT, derived from the effect — so a card cannot ship with rules that
 *  disagree with what it does. `card.rules` overrides when a designer has a
 *  better sentence, and that override is the only place the two can drift. */
export function rulesTextOf(c: Card, glyph: (g: Gem) => string): string {
  if (c.rules) return c.rules;
  switch (c.effect.kind) {
    case "transmute":
      return `Turn ${c.effect.count} non-${glyph(c.effect.into)} into ${glyph(c.effect.into)}.`;
    case "convert-lonely":
      return `Turn every space with no matching neighbour into ${glyph(c.effect.into)}.`;
    case "detonate-gem":
      return `Clear every ${glyph(c.effect.gem)} on the board.`;
    case "clear-row":  return "Clear a row.";
    case "clear-col":  return "Clear a column.";
    case "swap-any":   return "Swap any two spaces, adjacent or not.";
    case "reroll-cell":return "Reroll one space.";
    default:           return "—";
  }
}

/** Every gem a card touches: what it makes, what fuels it, what it scores on.
 *  Kept beside gemsFor so a new CardEffect cannot quietly go unrepresented —
 *  if you add an effect kind, this switch is where the palette learns about it. */
export function gemsCardNeeds(c: Card): Gem[] {
  const out: Gem[] = [];
  switch (c.effect.kind) {
    case "transmute": out.push(c.effect.into); break;
    case "convert-lonely": out.push(c.effect.into); break;
    case "detonate-gem": out.push(c.effect.gem); break;
    default: break;                        // row/col/swap/reroll are gem-blind
  }
  if (c.recharge) out.push(c.recharge.gem); // the fuel has to be gettable
  out.push(...(c.victory?.gems ?? []));     // and you must be able to score it
  return out;
}

/** How many kinds this board has — derived, not configured. */
export const kindsFor = (m: Match, job?: JobDemand | JobCard): number =>
  Math.max(3, gemsFor(m, job).length);

/**
 * A board's palette as DISPLAY GLYPHS, given a full glyph table.
 *
 * The board's internal gem indices are 0..n-1 over the derived palette, so a
 * renderer needs this mapping to know that "gem 2 on this board" means 🔍.
 * Keeping it a read (rather than renumbering the players' star keys) means a
 * character's stars stay stated in the game's own vocabulary no matter which
 * job they walk into.
 */
export function paletteGlyphs(all: readonly string[], m: Match, job?: JobDemand | JobCard): string[] {
  return gemsFor(m, job).map((g) => all[g] ?? "❔");
}

/** Map a game-vocabulary gem to this board's index, or -1 if it is not in
 *  play. "Is my star even on this board?" is a real and answerable question. */
export const boardIndexOf = (m: Match, gem: Gem, job?: JobDemand | JobCard): number =>
  gemsFor(m, job).indexOf(gem);

/** A key the job demands that NOBODY on the crew is reaching for. The honest
 *  read of an understaffed job, and a good thing for a UI to say out loud. */
export function unmetDemands(m: Match, job: JobDemand): Gem[] {
  const wanted = new Set<Gem>();
  for (const p of m.players)
    for (const s of p.stars) for (const k of s.keys) wanted.add(k);
  return job.keys.filter((k) => !wanted.has(k));
}
