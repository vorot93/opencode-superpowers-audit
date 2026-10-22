import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseOptions } from '../src/options.js';
import { renderConfiguration } from '../src/skill.js';
import { configVectors } from './support/config-vectors.js';
import { hookContext, repoRoot, runHook } from './support/hook.js';

const read = (path: string) => readFile(join(repoRoot, path), 'utf8');
const reference = await read('skills/superpowers-audit/references/claude-code.md');

const auditLoad = {
  hook_event_name: 'PostToolUse',
  tool_name: 'Skill',
  tool_input: { skill: 'superpowers-audit:superpowers-audit' },
};

async function auditContext(env: Record<string, string> = {}, input = JSON.stringify(auditLoad)) {
  const { exitCode, stdout } = await runHook(input, env);
  expect(exitCode).toBe(0);
  const output = hookContext(stdout);
  expect(output?.event).toBe('PostToolUse');
  return output!.context;
}

// The rendered block's JSON body, with its 4-space indentation removed.
function blockJson(context: string, heading: string): any {
  const start = context.lastIndexOf(`${heading}\n\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const json = context.slice(context.indexOf('\n    {', start) + 1);
  return JSON.parse(json.split('\n').map(line => line.replace(/^ {4}/, '')).join('\n'));
}

const errorPrefix = renderConfiguration({ ok: false, message: '' }).split('\n').slice(0, 3).join('\n');

test('audit skill load emits the Claude Code reference and configuration', async () => {
  expect(await auditContext()).toBe(reference + '\n' + renderConfiguration(parseOptions({})));
});

for (const vector of configVectors.filter(v => v.env !== undefined)) {
  test(`configuration matches OpenCode for every vector: ${vector.name}`, async () => {
    const context = await auditContext(vector.env);
    expect(context.startsWith(reference + '\n')).toBe(true);
    if (vector.valid) {
      // Every valid env vector has an OpenCode equivalent to compare with.
      expect(vector.options).toBeDefined();
      expect(context).toEndWith(renderConfiguration(parseOptions(vector.options)));
      return;
    }
    const block = context.slice(reference.length + 1);
    expect(block.startsWith(errorPrefix + '\n\n    {\n')).toBe(true);
    expect(block).toContain('Request correction from the human before auditor dispatch.');
    expect(blockJson(context, '## Configuration error').message).toStartWith(`${vector.errorKey}:`);
    expect(context).not.toContain('"maxRounds": 5');
  });
}

test('escapes special characters in configuration', async () => {
  const value = ' a "b" \\ c\tü\u0001 ';
  const context = await auditContext({ CLAUDE_PLUGIN_OPTION_ARTIFACTDIRECTORY: value });
  expect(blockJson(context, '## Configuration').artifactDirectory).toBe(value.trim());
  expect(context).toEndWith(renderConfiguration(parseOptions({ artifactDirectory: value })));
});

test('routes pretty-printed input', async () => {
  expect(await auditContext({}, JSON.stringify(auditLoad, null, 2))).toBe(await auditContext());
});

test('fails open', async () => {
  const empty = await mkdtemp(join(tmpdir(), 'audit-hook-'));
  try {
    const cases: [string, Record<string, string | undefined>][] = [
      ['', {}],
      [JSON.stringify(auditLoad), { CLAUDE_PLUGIN_ROOT: undefined }],
      [JSON.stringify(auditLoad), { CLAUDE_PLUGIN_ROOT: empty }],
      ['{"hook_event_name": "PostToolUse", "tool_input": {', {}],
      [JSON.stringify({ hook_event_name: 'UserPromptExpansion', command_name: 'other:thing' }), {}],
      [JSON.stringify({ ...auditLoad, tool_input: { skill: 'other:thing' } }), {}],
      [JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }), {}],
    ];
    for (const [input, env] of cases) {
      expect(await runHook(input, env)).toEqual({ exitCode: 0, stdout: '' });
    }
  } finally {
    await rm(empty, { recursive: true });
  }
});

test('stays under the context limit', async () => {
  let longest = 0;
  for (const vector of configVectors.filter(v => v.env !== undefined)) {
    longest = Math.max(longest, (await auditContext(vector.env)).length);
  }
  expect(longest).toBeLessThan(10_000);
});

test('hook is executable and registered for every event', async () => {
  expect(statSync(join(repoRoot, 'hooks/audit-context')).mode & 0o111).not.toBe(0);
  const json = JSON.parse(await read('hooks/hooks.json'));
  expect(Object.keys(json)).toEqual(['hooks']);
  // Quoted so a plugin root containing spaces stays one word.
  const command = [{ type: 'command', command: '"${CLAUDE_PLUGIN_ROOT}/hooks/audit-context"' }];
  expect(json.hooks).toEqual({
    PostToolUse: [{ matcher: 'Skill', hooks: command }],
    UserPromptExpansion: [{ hooks: command }],
    SessionStart: [{ matcher: 'compact', hooks: command }],
  });
});

test('reference covers the dispatch contract', () => {
  expect(reference).toStartWith('## Host dispatch: Claude Code\n');
  for (const text of [
    'anthropic/<base model id>', 'ses_audit', 'opencode session list --format json', '--agent explore',
    'run_in_background', 'timeout 30m', "perl -e 'alarm shift; exec @ARGV' 1800", '124', '142',
    'opencode session export', '## Assessment', 'opencode models', 'Do not pass `--auto`', '< /dev/null',
  ]) {
    expect(reference).toContain(text);
  }
  const runLines = reference.split('\n').filter(line => line.includes('opencode run'));
  expect(runLines.length).toBeGreaterThan(0);
  for (const line of runLines) expect(line).toContain('< /dev/null');
});

test('reference covers recovery and identity rules', () => {
  for (const text of [
    'ask the human which mapping entry applies', 'round<N>-prompt.md', 'round<N>-reply.md', 'round<N>.log',
    'do not poll or sleep', 'Session not found', 'resend only if the round\'s prompt is absent',
    'recovering an existing reply adds no round', 'ask the human if the prompt arrived without a reply',
  ]) {
    expect(reference).toContain(text);
  }
  const exportLines = reference.split('\n').filter(line => line.includes('opencode session export'));
  expect(exportLines.some(line => line.includes('2>&1'))).toBe(true);
});
