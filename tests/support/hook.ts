import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const script = fileURLToPath(new URL('../../hooks/audit-context', import.meta.url));

// AUDIT_HOOK_SHELL runs the suite under another POSIX shell (dash, busybox sh).
const shell = process.env.AUDIT_HOOK_SHELL ?? 'sh';

// Runs the hook as Claude Code does: hook input on stdin, plugin root and
// options in the environment. Only PATH is inherited, so the developer's own
// CLAUDE_PLUGIN_OPTION_* never leak in; an `undefined` entry removes a variable.
export async function runHook(
  input: string,
  env: Record<string, string | undefined> = {},
): Promise<{ exitCode: number; stdout: string }> {
  const merged: Record<string, string | undefined> = { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: repoRoot, ...env };
  const child = Bun.spawn([shell, script], {
    env: Object.fromEntries(Object.entries(merged).filter((entry): entry is [string, string] => entry[1] !== undefined)),
    stdin: new TextEncoder().encode(input),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  return { exitCode, stdout };
}

// Parses hook output, requiring exactly the shape Claude Code reads.
export function hookContext(stdout: string): { event: string; context: string } | null {
  if (stdout === '') return null;
  const output = JSON.parse(stdout);
  if (Object.keys(output).join() !== 'hookSpecificOutput'
    || Object.keys(output.hookSpecificOutput).join() !== 'hookEventName,additionalContext'
    || typeof output.hookSpecificOutput.hookEventName !== 'string'
    || typeof output.hookSpecificOutput.additionalContext !== 'string') {
    throw new Error(`Unexpected hook output shape: ${stdout}`);
  }
  return { event: output.hookSpecificOutput.hookEventName, context: output.hookSpecificOutput.additionalContext };
}
