# Working on this project

## Scope and durable documentation

Read [README.md](README.md) for user behavior and [DESIGN.md](DESIGN.md) for
architectural boundaries. The shared audit skill is the workflow source of truth.
Preserve writer-led review, ordinary native subagent calls, self-review, and human
approval. Historical process plans are not requirements for a custom orchestrator.

Keep these documents evergreen: record non-obvious constraints and decisions,
not task reports, test-run inventories, or facts evident from the code. Correct
stale guidance in the same change. Process artifacts, live evidence, and disposable
verification caches belong in `~/.superpowers/opencode-superpowers-audit/`; remove
disposable fixtures after verification. A checkout-local `.superpowers` link is
optional and must resolve to that external directory if used.

## Development

- Use the [README development commands](README.md#development). Keep package checks
  separate from the fast unit suite: they invoke Bun and tar, install production
  dependencies, and need a populated dependency cache or registry access.
- Refresh dependency resolution once at task start, then keep it stable through
  verification. To refresh direct versions, use `bun add zod@latest` and
  `bun add -d @opencode/plugin@latest typescript@latest @types/bun@latest @types/json-schema@latest`.
  `bun.lock`, `node_modules/`, and tarballs remain untracked.
- `bun run test:claude` (`claude plugin validate .`) is a separate check that needs
  the `claude` CLI; it may warn about a missing icon. The npm `files` list names the
  OpenCode skill assets individually so Claude Code-only files (`skills/audit`,
  `references/claude-code.md`, `hooks/`, `integration/`) stay out of the npm package.
- Use strict NodeNext TypeScript and type-only host imports. Bun resolves the
  `.js` imports in source/tests to TypeScript; package checks must also exercise
  that resolution outside the checkout, with only production dependencies.
- Keep `@types/json-schema` explicit: the host's transitive `@ai-sdk/provider`
  exposes those types publicly but declares them only as a development dependency.
  Do not weaken library checking or add an ambient-any shim to hide the issue.
- The transitive `protobufjs` postinstall is not needed for the plugin's checks.
  Do not trust blocked dependency scripts merely to silence installation notices.

## Packaging and installation traps

- Preserve the root `index.js`. Native absolute-directory loading can silently
  skip a package without it even when `main` or `exports` names another file.
- Ship TypeScript source without install/preparation hooks (`preinstall`, `install`,
  `postinstall`, `prepare`, `prepack`). Their presence makes npm's Git fetcher spawn
  npm even when the hook itself only invokes Bun. OpenCode 2.0.14–2.0.15's compiled
  launcher fails on that path by invoking itself with npm arguments. Run checks
  explicitly before packing; a standalone npm tarball does not prove native Git
  installation works.
- npm 12.0.2 can separately reject inherited `allow-scripts` during Git preparation.
  Preserve the user's script policy when diagnosing installation failures.
- Recover a failed cached installation with `opencode plugin add <same-target>`.
  `plugin update` may fail during its preliminary check instead of reinstalling.
  Re-adding the exact target preserves its config position. Verify active plugin
  status, `/audit` registration, and complete transformed bodies, not just CLI exit.

## Changing instructions or adaptations

- Use native tools and public OpenCode v2 documentation at
  `https://opencode.ai/v2/docs/` for host contracts.
- The shared skill's YAML frontmatter is the single metadata source: Claude Code reads it
  natively, and OpenCode registration strips it and takes `description` from it. Rendered
  bodies must never include frontmatter.
  Do not duplicate its templates in the command or adapters, or trim supplied body
  bytes while adjusting renderer separators.
- Author expected transformed bodies independently of the adapter. Review complete
  golden and snapshot diffs as instructions before changing output hashes.
  Fixture reads strip leading frontmatter and normalize CRLF; native transforms
  receive bodies, not filesystem skill files. Preserve upstream MIT attribution.
- Update diagrams and scripted handoffs alongside surrounding prose. After handoff,
  direct human edits or changes they request require renewed self-review and a
  fresh audit in both authoring skills.
- Preserve the upstream skill path when adapting content. Superpowers 7.0.0's
  builder check resolves `builder-check-prompt.md` relative to that directory;
  it remains a separate stage before writer self-review and the audit.
- Check replay and disposal as well as initial registration. Native `editor.add`
  replaces an existing skill ID, including across transforms; the registry double
  models ordered replay and host-owned disposal, not auditor execution.
- Change a stage in both hosts together: the OpenCode edit pairs in
  `src/superpowers.ts` and the Claude Code amendment in `integration/claude-code/`.
  `tests/stage-parity.test.ts` holds both to the same stage strings. Review each
  amendment as instructions beside the upstream skill: its "supersedes" quotes must
  name real upstream steps, so recheck them on every Superpowers release.

## Claude Code host traps

- Claude Code exposes no skill body or path to hooks and cannot rewrite another
  plugin's skill, so this plugin adds context beside loads instead. A Skill-tool load
  fires PostToolUse with a fully qualified `tool_input.skill`
  (`superpowers:writing-plans`, `superpowers-audit:superpowers-audit`). A typed slash
  command fires UserPromptExpansion instead, never PostToolUse, with `command_name`
  qualified even when typed bare. SessionStart input carries `source`.
  The hook reads fields by key path (`tool_input.skill`), never by bare key name: other
  objects in the input, such as `tool_response`, can carry a key of the same name.
- Bare `/audit` resolves only for the skill form (`skills/audit/SKILL.md` with
  `disable-model-invocation: true`), not a legacy `commands/audit.md`. Its body must
  name `superpowers-audit:superpowers-audit`; "load the superpowers-audit skill" made
  the model load `superpowers-audit:audit` instead.
- `userConfig` values reach hooks as `CLAUDE_PLUGIN_OPTION_<KEY uppercased>`: a
  `multiple` list comma-joined, a number as its decimal string. Unset options are not
  exported at all, even with a manifest `default`, so `hooks/audit-context` applies
  defaults. For a `--plugin-dir` probe, pass options with
  `--settings '{"pluginConfigs":{"superpowers-audit@inline":{"options":{…}}}}'`.
- Claude Code reads only `hookSpecificOutput.additionalContext` with the firing
  `hookEventName`, capped at 10,000 characters, and only from a `hooks.json` with a
  top-level `hooks` wrapper. Frame added context as this plugin's workflow material:
  text that reads like an injection is ignored. Quote `${CLAUDE_PLUGIN_ROOT}` in hook
  commands; `${CLAUDE_PLUGIN_ROOT}` is not set in the writer's Bash tool calls.
- The hook must exit 0 on every path: a failing UserPromptExpansion hook would break
  every slash command. Keep it to POSIX `sh` and stock utilities, committed with mode
  755. `/bin/sh` may be bash locally, so run `AUDIT_HOOK_SHELL=<dash or busybox sh>
  bun test tests/hook.test.ts` after changing it. Keep content and option values in
  pipes and awk: dash 0.5.13 in the C locale corrupts non-ASCII bytes on assignment.
- `opencode run` waits for end of input on a non-terminal stdin, and Claude Code's
  Bash stdin may never close, so a run without `< /dev/null` can stall before creating
  its session. Redirect it in every shipped, test, and probe command.
- `opencode run -s` creates a session for a new `ses`-prefixed ID and continues an
  existing one; the default output format prints only the reply, not the session ID.
  A round can exceed Claude Code's 10-minute foreground Bash limit, so the reference
  dispatches in the background and waits for the completion notice.
- A non-interactive `opencode run` auto-rejects an OpenCode `ask` permission (stderr
  "auto-rejecting"); the tool call fails and the model continues, so `ask` needs no
  user configuration. An apparent hang on one is the stdin stall above.

## Native verification

The controller owns live child sessions and human-interaction exercises. Delegated
workers must not duplicate those runs or infer model obedience from snapshots.
Read complete native results, following pagination and truncated-output references.
Command text displayed by a UI is not evidence that command expansion or dispatch
occurred. Keep the current live acceptance limit in README rather than copying
scenario histories into these instructions.

For isolated checks, OpenCode discovers configuration above the repository root;
a fake HOME alone is insufficient. Isolate ancestor configuration, HOME, XDG, and
temporary/cache roots. With a read-only bubblewrap root, use existing mount targets
and `--dev-bind /dev /dev` so Bun can read `/dev/urandom`.

Load `tests/native/check-plugin.ts` **last**, as a package directory rather than a
standalone configured file:

```sh
bun build tests/native/check-plugin.ts --target bun --outfile <directory>/index.js
```

Give that directory a `package.json` with `"type": "module"` and
`"main": "./index.js"`. Set `AUDIT_CHECK_OUTPUT` and `AUDIT_CHECK_EXPECTATIONS` to
external JSON paths. Expectations contain `bodies` (skill IDs mapped to full expected
text, or null for absence), `paths` (the same IDs mapped to independently supplied
exact native skill paths, or null for absence), and `statuses` (expected lines in
the shared skill). Pin upstream paths, not just relative helper availability:
the builder prompt resolves relative to the preserved brainstorming skill path.
Remove any old result before launching so a skipped checker cannot pass on stale
evidence. Require fresh `ok: true` output; the checker compares complete bodies, paths, and
three skill/command reloads. A missing shared asset instead requires a visible load
error and no successful checker result.

A bounded `opencode run --standalone --model fixture/unavailable 'Load the configured plugins'`
initializes plugins before failing with `Model unavailable` on OpenCode 2.0.14.
For no-model checks, deny `provider.use` for `*`, use an empty environment, and
disable networking. The expected CLI failure alone proves nothing: inspect the
checker result. Retain credential-free evidence for live verification, then remove
disposable databases, caches, and unpacked installs. Never ship test fixtures in the npm package (`files` lists only runtime paths).
A Claude Code install is a copy of the whole repository, so it contains `tests/fixtures`;
that is accepted.
