# Design

## Keep the writer in control

The plugin supplies a shared skill, a command, and Superpowers skill adaptations.
The existing writer owns the conversation: it retains authoring context, evaluates
findings, edits documents, consults the human, and publishes the report. OpenCode
owns subagent execution, permissions, session continuation, and interruption.

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

The renderer preserves the supplied body byte-for-byte and appends validated
configuration and integration status. Configuration JSON is readable data, not a
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

Whole-body input and output hashes are deliberate compatibility boundaries.
Matching isolated headings or fragments could silently drop upstream requirements.
Only CRLF normalization is allowed when matching; unknown definitions retain
their original bytes beneath an unavailable notice. Missing skills are not created.
Independently authored golden bodies catch errors in both edit selection and the
resulting workflow. Full upstream bodies stay in attributed test fixtures; runtime
code carries only hashes and edit excerpts.

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
against the real registry, including reloads. Neither snapshots nor scenario
answers prove that models follow the instructions; that requires live native
conversations and actual human decisions. The current acceptance limit is recorded
in [README.md](README.md#integration-and-limits).
