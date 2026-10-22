## Host dispatch: OpenCode

Identify the current writer's provider and model from the Provider ID and Model ID
in the `# Your Model` context.

Check model availability using `opencode.models`, discovering that native tool
through Code Mode if needed.

Start a foreground native `subagent` call with `agent: "explore"`,
explicit `model`, a short `description`, and the filled auditor assignment as
`prompt`. Omit `sessionID` initially. Keep the returned `sessionID`. Each follow-up passes
the same agent, model, and `sessionID`. Follow native output references and pages
when reading results.

`explore` cannot load skills, edit files, or launch subagents; its shell remains
available, so read-only is still an instruction.
