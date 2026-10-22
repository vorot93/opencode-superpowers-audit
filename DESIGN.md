# Design

## Keep the writer in control

The plugin supplies a shared skill, a command, and Superpowers skill adaptations.
The existing writer owns the conversation: it retains authoring context, evaluates
findings, edits documents, consults the human, and publishes the report. The hosts
own everything else:

- In OpenCode, OpenCode owns subagent execution, permissions, session continuation,
  and interruption.
- In Claude Code, Claude Code owns background execution, completion notices, and its
  permission prompts; OpenCode owns the auditor session and its history (`-s`,
  `session export`). The writer composes those native commands from the dispatch
  reference. Round work files are report evidence, not state: delivery checks read
  OpenCode's own session rather than a plugin-maintained record.

This boundary deliberately excludes a custom audit runner, reconstructed history,
response-delivery protocol, audit-state store, or extra filesystem/permission
layer. Those mechanisms would duplicate the host and move review decisions away
from the writer. Read-only auditing and model independence are instructions under
native permissions, not security guarantees supplied by the plugin.

Reviewer authorization and independence are separate checks. User mappings or
human confirmation authorize a model request; catalog availability does not prove
independence. Lineage judgments stay with the writer and human rather than a
model-family registry that would require its own evolving source of truth.

## One workflow source

[`skills/superpowers-audit/SKILL.md`](skills/superpowers-audit/SKILL.md) owns the
workflow, outcome rules, and auditor/report templates. Both `/audit` and the
adapted authoring skills load it. Keeping the conversation rules in one place
prevents manual and automatic audits from diverging.

The shared body is host-neutral: it names no OpenCode tool, agent, or context
block. Each host appends its own dispatch reference
([`references/opencode.md`](skills/superpowers-audit/references/opencode.md) for
OpenCode, [`references/claude-code.md`](skills/superpowers-audit/references/claude-code.md)
for Claude Code), which owns writer identification, the model catalog, and the auditor
call mechanics, including the `explore` auditor agent. Because compaction can keep
the body but drop appended context, the body tells the writer to reload the skill
once and otherwise stop before dispatch.

OpenCode's renderer appends the reference and configuration to the body. Claude Code
cannot change a skill body, so [`hooks/audit-context`](hooks/audit-context) adds the
same material as hook context when the Skill tool loads the shared skill.

## Two validators, one vector set

The configuration contract is validated twice: zod in [`src/options.ts`](src/options.ts)
for OpenCode, and the hook's POSIX shell and awk for Claude Code, where no JavaScript
runtime is guaranteed. Both render the same `## Configuration` block, or an error
block that requests correction instead of falling back to defaults. One vector file,
[`tests/support/config-vectors.ts`](tests/support/config-vectors.ts), drives both
test suites, and valid vectors must render byte-identical blocks. Claude Code joins
list options with commas, so reviewer entries exclude commas in both hosts. Error
wording is host-specific; the shared contract is the block shape and the named key.

The renderer preserves the supplied body byte-for-byte and appends the dispatch
reference, validated configuration, and integration status. Configuration JSON is readable data, not a
prompt-security boundary. Invalid settings remain visible as a correction request
so the writer can explain the problem instead of losing the skill or using defaults.
Artifact paths are resolved by the writer, which has the relevant project context.

The command appends its loading instruction to the native prompt rather than
prepending or rebuilding it: attachment mention offsets must remain valid. Native
prompt admission errors propagate without retries because admission may be ambiguous.

## Adapt only known skill bodies

Superpowers adaptations are in-memory registry transforms. They insert audit
loading after self-review and before human handoff, including scripted handoffs
and renewed review after human edits. Registration order matters: the source
skills must already be visible, and a later plugin can replace them.

The supported baseline is Superpowers 7.0.0. The plugin supplies brainstorming's
writer self-review; writing-plans retains upstream self-review. Brainstorming's
builder check remains a separate upstream stage: resolve it, self-review the written
design, then audit before human approval. The builder check's one question round does
not limit material decision questions from an audit. Only written designs get
these document stages; upstream quick-task, opt-out, small-change, and spike
routes stay unchanged. After handoff, direct human edits or changes they request
require renewed self-review and a fresh audit.

Whole-body input and output hashes are deliberate compatibility boundaries.
Matching isolated headings or fragments could silently drop upstream requirements.
Only CRLF normalization is allowed when matching; unknown definitions retain
their original bytes beneath an unavailable notice. Missing skills are not created.
Independently authored golden bodies catch errors in both edit selection and the
resulting workflow. Full upstream bodies stay in attributed test fixtures; runtime
code carries only hashes and edit excerpts.

Claude Code deliberately skips the body check. It cannot rewrite another plugin's
skill, so [`hooks/audit-context`](hooks/audit-context) adds an amendment from
[`integration/claude-code/`](integration/claude-code) beside the untouched upstream
body when either skill loads or is typed. Nothing is spliced, so an upstream change
cannot be silently corrupted; at worst the amendment's "supersedes" statements no
longer match the steps they name. The hook sees only the qualified skill name, never
the body or its path, so a check would cost an extra writer step on every load. The
risk is accepted: the amendments are written against Superpowers 7.0.0 and must be
reviewed on each Superpowers release. Each amendment is framed as this plugin's
workflow amendment to the just-loaded skill, because Claude Code ignores added
context that reads like an injection, and it points to the shared skill for every
audit rule. A stage-parity test holds the amendments and the OpenCode goldens to
the same stage strings, so the hosts cannot drift silently.

Each registry replay computes status from its current sources. An optional
adaptation failure is isolated to that skill, while shared-asset and core
registration failures remain visible to OpenCode. This keeps manual auditing
available when only automatic adaptation fails, without claiming it works after
a core failure. Registry content status never implies per-agent permission to load
or execute a skill.

## Native source distribution

OpenCode's Bun runtime loads TypeScript directly, so the package ships the same
source exercised by unit tests. The root `index.js` serves both package exports
and native directory loading; the latter does not consult manifest entrypoints.
Host imports are type-only, avoiding a second runtime schema/client stack.

Installation has no compiler or lifecycle-hook dependency. Besides simplifying
distribution, this avoids the compiled host's npm Git-preparation failure. Keep
host-version diagnostics and recovery instructions in [AGENTS.md](AGENTS.md).

## What verification establishes

Unit and package tests establish rendering, registration, asset resolution, and
complete transformed-body contracts. The native checker verifies those contracts
against the real registry, including exact skill paths and reloads. Neither
snapshots nor scenario answers prove that models follow the instructions; that
requires live native conversations and actual human decisions. The current
acceptance limit is recorded in [README.md](README.md#integration-and-limits).
