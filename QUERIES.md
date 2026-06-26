# Questions to ask before you write code

These are questions, not rules. Ask them before you write. The point isn't less code.
The point is honest code — needed, clear, nothing for show. Less code is usually what
that looks like.

(Another tool, Ponytail, does this as "be a lazy senior developer." Same idea. This
just aims at *honest* instead of *lazy* — because "is it short" is easy to game and
"is it true" isn't.)

## Before you write

- **Do you need it?** If you don't, don't write it. Extra code that's there to look
  thorough is worse than no code — it makes people think there's a reason for it.

- **Does it already exist?** Check the codebase, the standard library, the platform,
  the dependencies you already have. Don't rewrite what's already there.

- **Is it the simplest version?** Fewest moving parts that do the job. Don't add an
  abstraction before you need it. Don't be clever for its own sake.

- **Will the next person understand it?** Don't over-comment, don't over-guard, don't
  explain what the code already says. Assume they can read.

- **Is every line honest?** No dead code that looks used. No comment that's wrong. No
  name that lies. No abstraction that pretends to do more than it does.

## After you write

- **What can you delete?** Look again. Usually the best edit is taking something out.
  Done means nothing left to remove, not everything piled in.

- **Does the length earn it?** Short isn't always right. A test that proves it works, a
  clear abstraction, a longer name that's accurate — those are worth the lines. Cut
  what's for show, keep what's true, however long. (A big test suite is fine if it's
  honest and you need it. Don't cut load-bearing things just because they're long.)

- **Can you explain every line?** If someone asks "why is this here" and your only
  answer is "seemed right" or "just in case" — look at it again. That's the line to fix.

---

Use what's useful. Ignore what isn't.
