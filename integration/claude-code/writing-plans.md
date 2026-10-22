## superpowers-audit amendment to superpowers:writing-plans

This is the superpowers-audit plugin's amendment to the writing-plans skill you
just loaded. It adds an independent audit of the plan between the skill's
self-review and its handoff. Follow the skill together with this amendment;
where they differ, the amendment governs.

### Adversarial Review

After completing self-review, use the Skill tool to load
`superpowers-audit:superpowers-audit` and follow its workflow, which defines
every audit rule. Supply the plan, approved governing spec/amendments, relevant
decisions, and known drafting models. Run its conversation in this writer
session and write its report before handoff. Present the actual outcome and ask
for direction when it is not Approved.

### What it supersedes

- In **Self-Review**, "No need to re-review — just fix and move on." Instead,
  fix issues inline and add a task for any spec requirement without one, then
  complete Adversarial Review above.
- In **Execution Handoff**, "After saving and self-reviewing the plan, link it
  for your human partner to read." Instead, after saving, self-reviewing, and
  auditing the plan, link the current plan and audit report and state the actual
  outcome for your human partner. The rest of that paragraph, on confirming or
  choosing the execution method before implementation, stands.
- In both scripted handoffs, "Plan complete and saved to
  `docs/superpowers/plans/<filename>.md`. Please review the plan." Instead, link
  both documents and keep the original question:
  - When no execution method has already been supplied: **"Plan: `<plan path>`. Audit: <actual outcome>; report: `<report path>`. Please review both. Which execution approach would you prefer?** Then give the two options and your recommendation as the skill writes them.
  - When an execution method has already been supplied: **"Plan: `<plan path>`. Audit: <actual outcome>; report: `<report path>`. Please review both. Does the plan capture what you want?"**

### After handoff

Direct human edits or changes they request receive self-review and a fresh audit
before renewed handoff. Preserve an already selected execution method and wait
for approval of the revised plan.
