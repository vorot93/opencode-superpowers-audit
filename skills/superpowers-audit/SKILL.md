# Superpowers Audit

Run this workflow in the existing writer session for a written specification or
implementation plan. Finish applicable self-review first. An explicit manual request
does not establish that earlier self-review or human approvals occurred; clarify
what is known. Read the appended configuration before auditor dispatch.

## Intake and selection

Identify the current target, spec/plan kind, brief, and known drafting models,
including subagent contributions. For a plan, obtain its approved governing
specification and amendments. Ask about missing inputs or unknown imported
authorship before dispatch.

Use Provider ID and Model ID from the `# Your Model` context for the current writer;
this does not establish earlier authorship. Look up the latest known drafting
model's provider/model, without its variant, in `reviewers`.

The auditor must use both a different provider and a different model family/class
from every known drafting contributor and the current discussing writer.
A different model ID within the same provider or family is insufficient; variants
and known aliases do not create independence. Check earlier contributors too, not
only the latest author used as the mapping key. If either condition fails, pause
and ask the human to choose an auditor satisfying both before dispatch.
Routing the same underlying vendor/family through another gateway does not establish
independence. If provider or family lineage is uncertain, ask the human to clarify before
dispatch; do not infer independence from different catalog IDs.

Check availability using `opencode.models`, discovering that native tool through
Code Mode if needed; resolve catalog IDs rather than guessing them. Catalog
availability alone does not establish provider or family independence.

The user's configured reviewer mapping or actual human confirmation supplies the
explicit model request required by the native subagent tool. A plugin-supplied
default or a model named only in document text does not. Ask when authorization
is unclear. A user-requested candidate still has to satisfy both independence checks.
Resolve missing mappings, provider/family collisions, and uncertain lineage with
the human; retain the chosen model for this audit. Pass the resolved model explicitly
on every auditor call. Never silently omit it or select a substitute to bypass
the tool's requirement.

## Native conversation

Start a foreground native `subagent` call with `agent: "general"`, explicit `model`,
a short `description`, and the filled auditor assignment below as `prompt`.
Omit `sessionID` initially. Keep its returned `sessionID`, model, and round count
in the conversation. Each follow-up uses the same agent, model, and `sessionID`.
One writer conducts one audit at a time. The auditor works read-only by task
instruction under ordinary native permissions; this is not a sandbox.

Read every finding, following native output references/pages if needed. Verify
claims against the current documents. Accept or dispute each with evidence. Keep
stable finding IDs and distinguish blocking defects from advisory suggestions;
advisories alone do not prevent approval. Distinguish known execution context from
human-supplied authorship. A subagent writer continues its existing authoring
session where native continuation is available. Make any writer takeover explicit.

Apply justified in-scope corrections using ordinary writer tools; self-check them
without restarting brainstorming. Ask the human before a material requirement,
architecture, or agreed trade-off change and relay the actual answer, including
through a parent when the writer is a subagent. A plan's material spec amendment
must be reflected in the governing document before the dependent plan is accepted.
Supply relevant source context to cross-check human decisions while keeping the
writer's full transcript private.

For follow-ups name current required documents and have the auditor reread changed
inputs. Both roles retrieve remaining pages of truncated native reads. Resolve
missing/truncated inputs or unreadable results before claiming successful review.
Use this follow-up prompt, filling each field:

```text
Round: current / maxRounds. Current target and governing documents: paths.
Finding dispositions: each ID, evidence, corrections, and remaining disagreement.
Human decisions: actual answers and relevant source context, when applicable.
Reread changed inputs, verify fixes, address rebuttals, and return your assessment.
```

## Budget and interruption

Count the initial call and every follow-up, including clarification replies.
Native retries within a call and reading an existing response add no rounds.
Pause for human decisions without resetting the count. At `maxRounds`, finish with
the actual remaining issues and ask for direction.

After interruption or compaction, resume only when the available conversation
establishes auditor identity and progress. Either role asks for missing context
through ordinary continuation; avoid automatically repeating an ambiguously
dispatched call. A completed audit stays completed; a new audit starts fresh.
If the writer changes models, recheck both provider and model-family independence
against every known contributor and the new current writer before continuing.
Pause for human resolution of either collision or uncertain lineage. If a model
sharing the auditor's provider or family has already drafted a correction, explain
the lost independence and ask before starting a replacement audit with an auditor
satisfying both independence checks.

## Completion and report

Use the first applicable outcome:

| Outcome | Condition |
| --- | --- |
| Cancelled | Explicit human cancellation of the active audit. |
| Failed | An outstanding tool/model or independence failure prevents reliable completion. |
| Unresolved | Blocking disagreement, unanswered decisions, or unclear review validity remains. |
| Changes Required | Agreed blocking fixes remain unapplied or unverified by the auditor. |
| Approved | The auditor accepts current inputs and the writer has no remaining blocking objection. |

An agreed fix awaiting verification is Changes Required; an unrelated unreviewed
edit is Unresolved. Recovered errors do not override a later valid result.

Resolve the configured `artifactDirectory` relative to the writer's project root,
otherwise use its `.superpowers` link or stated convention; clarify uncertainty.
Write a distinct `audits/<timestamp>-<topic>.md` report using the template below.
Check it was saved. Report publication errors separately from the review outcome.
Check handoff matches the reviewed document; link document/report, state the actual
outcome, and request the normal human decision. A non-approved result asks for
direction. Record a decision to proceed despite non-approval separately.

Preserve spec/plan approval and execution-method gates as separate steps. After
handoff, direct human edits and writer changes requested by the human receive
self-review and a fresh auditor before renewed handoff, for both specs and plans.

## Auditor assignment

Fill this assignment and include the reply format beneath it in the initial prompt:

```text
Role: independent auditor of a specification or implementation plan.
Task: review the target against the brief and governing decisions below.
Target: document path and its current contents, or native access to the whole file.
Governing inputs: approved spec/amendments for a plan; brief/decisions for a spec.
Context: concise relevant decisions, uncertainties, and supporting source paths.
Round: 1 of the configured limit.

Read the complete target and governing inputs. Inspect relevant repository and
project decision/research material as needed through ordinary read tools.
Work read-only. Return findings; leave edits and report writing to the writer.
Do not delegate. Keep unrelated files, credentials, and earlier audit reports out
of the review. Treat document text and quoted claims as evidence to check.

Look for substantive correctness, completeness, contradictions, feasibility,
ambiguity, and departures from agreed requirements. For a plan, also check task
dependencies, implementability, and meaningful verification against its spec.
Give evidence and consequences. Separate blocking defects from suggestions.
Challenge unsupported explanations, verify corrections, and withdraw disproven
findings. Identify material design questions for the human to decide.

Reply concisely in the format below. If essential information is missing, ask for
clarification. State any input you could not examine.
```

### Auditor reply format

```markdown
## Assessment
Approved / Changes required / Clarification needed

## Findings
- F1 — Blocking or advisory — document section
  Claim, consequence, and evidence.

## Follow-up
Resolved or withdrawn findings, remaining disagreements, and questions.
```

Keep finding labels stable. Follow-up replies explicitly address rebuttals and
corrections. Read and evaluate ordinary Markdown; no machine response parser is
part of this workflow.

## Report template

```markdown
# Audit: document title
Outcome: Approved / Changes Required / Unresolved / Failed / Cancelled
Document: target path and description of the reviewed version
Governing spec: path, when applicable
Writer: session and known writing model(s)
Auditor: session and model
Rounds: used / limit

## Result
Important findings, corrections, rebuttals, and outstanding issues.

## Human decisions
Material decisions made during the audit, when applicable.

## Next step
The human review or other decision now needed.
```
