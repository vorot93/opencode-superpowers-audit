## Host dispatch: Claude Code

The superpowers-audit plugin supplies this reference with the skill just loaded.
Follow it wherever the skill defers to the host dispatch reference. The auditor
runs in OpenCode, started from Claude Code's Bash tool.

### Writer identity

Take the current model ID from Claude Code's system context. The vendor is
Anthropic whichever gateway serves it (Bedrock, Vertex, and Foundry do not change
lineage), so the writer's `reviewers` key is `anthropic/<base model id>`. First
strip gateway and context forms: a Bedrock `anthropic.` prefix, with any region
prefix such as `us.`, `eu.`, or `apac.` before it, and its `-v<N>:<N>` suffix; a
Vertex `@<date>` suffix; and a context-window suffix such as `[1m]`. For example,
`us.anthropic.claude-opus-5-5-v1:0` and `claude-opus-5-5[1m]` both become
`anthropic/claude-opus-5-5`. If the ID is neither a plain model ID nor one of
these forms (for example, an unfamiliar Foundry deployment name), do not guess:
ask the human which mapping entry applies.

### Availability

Run `opencode models` and resolve the candidate's `provider/model` in its output.
The catalog lists no variants, so a `#variant` is confirmed only at dispatch; a
dispatch error naming the variant is a tool failure.

### Auditor session

Before round 1, choose the session ID `ses_audit<YYYYMMDDHHMMSS><slug>`: the
current UTC time, then the topic as at most 12 lowercase letters and digits.
Confirm it is absent from `opencode session list --format json`. `-s` creates or
continues a session, so never reuse an existing ID for a new audit.

The auditor is OpenCode's `explore` agent. It cannot load skills, edit files, or
launch subagents; its shell remains available, so read-only is still an instruction.

### Work files

The work directory is `audits/work/<YYYYMMDDHHMMSS>-<slug>/` in the resolved
artifact directory, with the session ID's time and slug. Write each round's filled
assignment or follow-up prompt to `round<N>-prompt.md` there with the Write tool;
the dispatch writes the reply to `round<N>-reply.md` and diagnostics to
`round<N>.log`. These files are evidence to link from the report, not audit state.

### Dispatch

From the project root, run each round as one Bash call with `run_in_background: true`:

```sh
timeout 30m opencode run --agent explore -m '<provider/model#variant>' -s '<session id>' --title 'audit: <topic>' "$(cat '<work dir>/round<N>-prompt.md')" < /dev/null > '<work dir>/round<N>-reply.md' 2> '<work dir>/round<N>.log'
```

Pass the resolved model with its `#variant`, if any. Where `timeout` is absent
(macOS), replace `timeout 30m` with `perl -e 'alarm shift; exec @ARGV' 1800`.
Keep `< /dev/null`: without it, `opencode run` waits for end of input
and can stall before creating the session. Do not pass `--auto`: it would approve
requests that the user's OpenCode permissions leave to `ask`. Wait for Claude
Code's completion notice; do not poll or sleep.

### Reading a round

Read `round<N>-reply.md` with the Read tool. The round is delivered when the
command exited 0 and the reply contains an `## Assessment` section; lines before
that section are normal. Otherwise Read `round<N>.log` and treat the round as
undelivered. Exit status 124 (`timeout`) or 142 (`perl`'s alarm) means the
30-minute limit expired, most likely a stalled client or service (for example stdin
not closed) or a very long auditor turn: check delivery as below, report a tool failure,
and ask the human.

### Unknown delivery

Before resending a round that is undelivered, expired, killed, or interrupted by a
context clear, export the auditor session and Read the file:

```sh
opencode session export '<session id>' > '<work dir>/round<N>-export.json' 2>&1
```

`Session not found` means the session was never created, so no prompt arrived.
Otherwise find the round's prompt and any assistant reply after it:

- resend only if the round's prompt is absent;
- if a reply follows it, recover that reply from the export instead;
  recovering an existing reply adds no round;
- ask the human if the prompt arrived without a reply.

After compaction, the session ID and round count come from the conversation; the
work files and the OpenCode session are evidence for re-establishing them.

### Permissions

Claude Code's permission prompts for these commands remain the user's; nothing is
pre-authorized. A permission that the non-interactive run cannot ask about is auto-rejected and the
auditor continues; the assignment already requires it to state any input it could
not examine, so weigh that statement in the reply.
