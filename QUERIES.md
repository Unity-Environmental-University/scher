# Queries for Plain Code

*A practice, not a rule. Sit with these before you write — questions to be answerable
to, not a checklist to pass. The aim is not less code. The aim is plain code — needed,
honest, with nothing for show — and less code is usually what that turns out to be.*

*Where another tool says "be a lazy senior developer," this says: be plain. Laziness
spares effort; plainness keeps faith with the next reader and with what's true. They
often reach the same small change for opposite reasons, and the reason is the thing.*

*(The shape is borrowed from how some communities use "queries" — open questions you
hold yourself to rather than rules you obey. No belief required; the practice stands on
its own. Take what is true here; leave the rest.)*

---

## Before you write it

**Is it needed?**
Wait before you write. Not all silence is a lack — the blank may already be complete.
Code written to fill a space, to look thorough, to seem finished, is ornament, and
ornament is a small untruth: it implies a need that isn't there. Write only what needs
writing.

**Does it already exist?**
Look first to what is already here — this codebase, the standard library, the platform
underneath, the dependencies already present and trusted. Writing again what already
exists isn't industry; it's a failure to look. Reuse is the plainest respect for the
work others have done.

**Does it say the thing plainly?**
Use the fewest words that carry the whole of it. No flourish, no clever turn that asks
to be admired. An abstraction reached for before its need is dressing up a generality
you don't have yet. Let the shape come from the need, not ahead of it.

**Does it trust the reader?**
Assume understanding in whoever comes next. Plain code doesn't over-explain, doesn't
guard defensively against a reader assumed careless, doesn't narrate what the code
already says. Trust the next person; write so they don't have to be defended against.

**Is every line true?**
No dead code claiming to be used. No comment that lies about what the function does. No
name that means other than it says. No abstraction pretending to a reach it doesn't have.
What's present should be present truly — the code saying only what is so.

---

## After you have written it

**What can come out?**
Read it again and ask what's superfluous now that the whole is here. Often the truest
edit is a deletion. A thing finished isn't a thing maximal — it's a thing with nothing
left to remove that was carrying weight.

**Does its length earn its keep?**
Length isn't the sin and shortness isn't the virtue — *untruth* is. A test that proves
the work holds, an abstraction that genuinely clarifies, a name longer because the short
one lied — these earn their lines. Keep what's true and needed, however long; cut what's
ornament, however short. (A thorough test suite is plain when it's needed for trust and
it's honest. Plainness doesn't prune what's load-bearing; it prunes what's for show.)

**Could you stand behind it?**
Not "did it pass" — there's no passing. Could you answer a colleague who asked, of any
line, "why is this here"? If the only answer is "it seemed right" or "to be safe" or "in
case," sit with it again. The line you can't account for is the one to look at.

---

*Held plainly, offered freely. Take what's true; leave what isn't.*

*— 2026-06-26*
