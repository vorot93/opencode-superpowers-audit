## superpowers-audit amendment to superpowers:brainstorming

This is the superpowers-audit plugin's amendment to the brainstorming skill you
just loaded. It adds an independent audit of a written design before your human
partner reviews it. Follow the skill together with this amendment; where they
differ, the amendment governs.

### When it applies

Only a project with a written design gets these stages. The skill's other routes
stay exactly as written: a quick, clear task; a small change described in chat; a
human partner who chose to skip the questions; and a spike.

### What it supersedes

- In **Builder check**, "may come back once with a few questions. Don't hand
  over the document until the check is back." Instead, when you say you're
  writing it up, say a reviewer will read it first and you may come back once
  with builder questions; additional audit questions are possible. Don't hand
  over the document until the builder check, self-review, and audit are complete.
- In **Builder check**, "Update the document with their answers, then hand it
  over with a short list of the calls you made so they can check those while
  reading." Instead, update the document with their answers, then complete Spec
  Self-Review and Adversarial Review below before human handoff; the short list
  of your calls goes into the Human Document Review handoff. That is still the
  only round of questions the builder check produces.
- In the **HARD-GATE**, "After a project's document is approved, the next step
  is the plan." Instead: after a project's builder check, self-review, audit, and
  human document approval, the next step is the plan. For software, invoke
  superpowers:writing-plans and no other skill.

The builder check itself is unchanged: dispatch it with `builder-check-prompt.md`
as the skill says (without a subagent tool, read the document as that builder
yourself) and sort what it asks into the three piles.

### Spec Self-Review

For a written project design, after resolving the builder check, review the
current document yourself for placeholders, contradictions, scope, and ambiguity.
Fix issues inline; preserve the human's decisions and label your own calls.
Then complete Adversarial Review before handing over the document.

### Adversarial Review

For a written project design, use the Skill tool to load
`superpowers-audit:superpowers-audit` after spec self-review and follow its
workflow, which defines every audit rule. Supply the written design, confirmed
conversational intent/decisions and human answers (in a brief if available), and
known drafting models; remain in this writer session. Complete its discussion and
report before human handoff. Present a non-approved result and ask for direction;
preserve the actual result if the human proceeds.
Audit questions about material decisions still go to the human;
the builder check's one question round does not waive that requirement.

### Human Document Review

For a written project design, hand over the current design and audit report,
state the actual outcome, and include a short list of calls you made so the human
can check those while reading:

> "Spec: `<spec path>`. Audit: <actual outcome>; report: `<report path>`. My calls: <short list>. Please review the full document and report. Do you approve this design for planning?"

Wait for the human's decision. After handoff, for direct human edits or changes
they request, rerun self-review and a fresh audit before renewed handoff. Only
proceed to planning once the human approves the current written design.
