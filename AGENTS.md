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
- Keep the shared skill a plain Markdown body; native registration owns metadata.
  Do not duplicate its templates in the command or adapters, or trim supplied body
  bytes while adjusting renderer separators.
- Author expected transformed bodies independently of the adapter. Review complete
  golden and snapshot diffs as instructions before changing output hashes.
  Fixture reads strip leading frontmatter and normalize CRLF; native transforms
  receive bodies, not filesystem skill files. Preserve upstream MIT attribution.
- Update diagrams and scripted handoffs alongside surrounding prose. Human-requested
  changes require renewed self-review and a fresh audit in both authoring skills.
- Check replay and disposal as well as initial registration. Native `editor.add`
  replaces an existing skill ID, including across transforms; the registry double
  models ordered replay and host-owned disposal, not auditor execution.

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
text, or null for absence) and `statuses` (expected lines in the shared skill).
Remove any old result before launching so a skipped checker cannot pass on stale
evidence. Require fresh `ok: true` output; the checker compares complete bodies and
three skill/command reloads. A missing shared asset instead requires a visible load
error and no successful checker result.

A bounded `opencode run --standalone --model fixture/unavailable 'Load the configured plugins'`
initializes plugins before failing with `Model unavailable` on OpenCode 2.0.14.
For no-model checks, deny `provider.use` for `*`, use an empty environment, and
disable networking. The expected CLI failure alone proves nothing: inspect the
checker result. Retain credential-free evidence for live verification, then remove
disposable databases, caches, and unpacked installs. Never ship test fixtures.
