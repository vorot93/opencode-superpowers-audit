# OpenCode Superpowers Audit

Independent review of specifications and implementation plans in OpenCode v2.
The plugin adds `/audit`, a shared audit skill, and automatic audit stages for
Superpowers **7.0.0** brainstorming and writing-plans skills.

> Write → self-review → independent audit → human document review.

For written designs, Superpowers' builder check comes before writer self-review.
Quick tasks, small in-chat changes, question opt-outs, and throwaway spikes keep
their upstream paths; automatic document auditing does not add gates to them.

The existing writer discusses findings with an auditor, verifies claims, applies
justified corrections, and saves a Markdown report. Material design changes go to
the human. Auditor approval does not replace human document approval.

## Installation

Add the plugin to `opencode.json(c)` **after Superpowers**:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "github:obra/superpowers",
    "github:vorot93/opencode-superpowers-audit"
  ]
}
```

The package loads TypeScript directly through OpenCode's Bun runtime; installation
requires no compilation. See [Integration and limits](#integration-and-limits) for
version-scoped installation and workflow evidence.

For a local checkout, run `bun install --production` and replace the GitHub target
with its absolute package directory. Configure the directory rather than an
individual source file.

If a previously failed installation cannot be updated, rerun
`opencode plugin add <same-target>` with the exact package string from your config.
Re-adding the same target preserves its existing position in the configuration.

## Usage

Run `/audit path/to/spec-or-plan.md` in the writer's session after self-review.
Provide confirmed intent, governing decisions and human answers, and known drafting
models; a brief file is optional. A plan also needs its approved specification.
Missing inputs or an ambiguous path prompt clarification.

Each audit starts a fresh `explore` auditor session (OpenCode's built-in read-only
exploration agent; it cannot edit files or launch subagents, though read-only is
still an instruction rather than a sandbox). Follow-ups continue that session and
model, with a default limit of five calls. The writer reports the actual outcome,
links the reviewed document and saved report, and asks for the human's decision.
After handoff, direct human edits or changes they request receive self-review and
a fresh audit.

The auditor must differ in **both provider and model family/class** from every
known drafting contributor and the current writer. Variants, aliases, or gateways
serving the same underlying vendor/family do not establish independence. Unknown
authorship or lineage requires clarification, and a writer-model switch triggers
a new independence check.

Without a reviewer mapping or explicit human selection, the writer asks you to
select a model. It resolves availability through native `opencode.models`; a model
named only in a document does not authorize its use.

## Configuration

Use the object form to set options. These model references are placeholders;
replace them with your explicit choices resolved through `opencode.models`.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "github:obra/superpowers",
    {
      "package": "github:vorot93/opencode-superpowers-audit",
      "options": {
        "reviewers": {
          "provider/writer-model": "other/reviewer-model#high"
        },
        "maxRounds": 5
      }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `reviewers` | `{}` | User-selected reviewer candidates keyed by drafting `provider/model`, without its variant. Values accept an optional `#variant`; model IDs may contain `/`. Candidates must still satisfy independence and availability checks. |
| `maxRounds` | `5` | Positive integer counting the initial auditor call and every explicit follow-up, including clarifications. Native retries and reading existing replies do not add rounds. |
| `artifactDirectory` | Project convention | Nonempty path for audit artifacts. Relative paths resolve from the writer's project root; reports go in `audits/` beneath it. When omitted, the writer uses the project's `.superpowers` link or stated convention, asking when unclear. |

Invalid or unknown options produce a visible correction request before dispatch
rather than silently activating defaults.

## Integration and limits

Automatic integration recognizes the exact Superpowers 7.0.0 skill bodies, not
just a package version. Older versions are not adapted.
Changed or customized definitions retain their content with an **Audit integration
unavailable** notice; missing skills stay absent. Check plugin order and the status
in the shared audit skill when integration is unavailable. Installed Superpowers
files are never modified.

Manual `/audit` remains usable independently of automatic integration when its
command and shared skill are loaded and permitted. Registry integration status is
separate from native permission denials.

The writer runs the audit using ordinary native tools and permissions. Model
independence, round limits, read-only auditing, and human gates are instructions,
not programmatic enforcement or an additional sandbox. The complete workflow and
report templates live in the [shared skill](skills/superpowers-audit/SKILL.md).

**Verification scope:**

- Older GitHub installation and native registration were verified on OpenCode
  **2.0.15**, before the Superpowers 7.0.0 adaptation. Earlier selected live audits
  do not establish acceptance of the current authoring bodies.
- Current Superpowers 7.0.0 integration is registry-verified on OpenCode **2.0.28**
  using a production-only local tarball, complete skill-body and exact path
  comparisons, and three skill/command reloads. This check uses no model.
- Reported consumer scenarios exercise instruction interpretation, not complete
  automatic authoring or actual human edit cycles.

**Live verification limit:** complete automatic Superpowers 7.0.0 spec and plan
authoring/audit/handoff paths, including renewed audits after actual direct human
edits or changes they request, have not been exercised end-to-end. Unit/package
tests, registry checks, and interpretation scenarios do not close that gap.

## Development

```sh
bun install
bun run test
bun run typecheck
bun run test:package
```

Package tests exercise a source-only tarball with production dependencies. To
distribute one after these checks, run
`bun pm pack --destination <artifact-directory>`. A consumer can install it with
`bun add /absolute/path/to/the.tgz` and configure the installed package directory.

See [AGENTS.md](AGENTS.md) for maintenance and verification conventions and
[DESIGN.md](DESIGN.md) for architectural decisions.

## Licensing

This project is licensed under [Apache-2.0](LICENSE). Superpowers instruction
excerpts and fixtures are derived from Jesse Vincent's MIT-licensed Superpowers.
See [NOTICE](NOTICE) and the [fixture attribution](tests/fixtures/superpowers-7.0.0/README.md).
