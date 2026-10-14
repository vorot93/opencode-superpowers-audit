import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Plugin, Skill } from '@opencode/plugin';
import checker from './native/check-plugin.js';
import { skillInfo } from './support/registry.js';

const expectations = {
  bodies: { brainstorming: '# Design fixture\n', 'writing-plans': null },
  paths: { brainstorming: '/skills/brainstorming/SKILL.md', 'writing-plans': null },
  statuses: ['brainstorming: integrated'],
};

const sources = () => [
  skillInfo('brainstorming', '# Design fixture\n'),
  skillInfo('superpowers-audit', '# Superpowers Audit\nbrainstorming: integrated\n'),
];

async function check(input: unknown, skills = sources(), replay?: (skills: Skill.Info[]) => void) {
  const parent = join(homedir(), '.superpowers/opencode-superpowers-audit/verification');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'checker-test-'));
  const previous = { output: process.env.AUDIT_CHECK_OUTPUT, input: process.env.AUDIT_CHECK_EXPECTATIONS };
  const output = join(directory, 'result.json');
  let skillReloads = 0;
  let commandReloads = 0;
  const skill = {
    list: async () => ({ location: { directory: '/fixture' }, data: structuredClone(skills) }),
    reload: async () => { skillReloads++; replay?.(skills); },
  } satisfies Pick<Plugin.Context['skill'], 'list' | 'reload'>;
  const command = {
    list: async () => ({ location: { directory: '/fixture' }, data: [{ name: 'audit' }] }),
    reload: async () => { commandReloads++; },
  } satisfies Pick<Plugin.Context['command'], 'list' | 'reload'>;
  try {
    process.env.AUDIT_CHECK_OUTPUT = output;
    process.env.AUDIT_CHECK_EXPECTATIONS = join(directory, 'expectations.json');
    await writeFile(process.env.AUDIT_CHECK_EXPECTATIONS, JSON.stringify(input));
    // The checker needs only these native read/reload capabilities; real I/O stays real.
    const ctx = { app: { version: 'fixture' }, skill, command } as unknown as Plugin.Context;
    let error: unknown;
    try { await checker.setup(ctx); } catch (caught) { error = caught; }
    const result = JSON.parse(await readFile(output, 'utf8'));
    return { error, result, skillReloads, commandReloads };
  } finally {
    for (const [key, value] of [
      ['AUDIT_CHECK_OUTPUT', previous.output], ['AUDIT_CHECK_EXPECTATIONS', previous.input],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
}

test('native checker accepts independent body/path expectations, absent skills, and three reloads', async () => {
  const result = await check(expectations);
  expect(result.error).toBeUndefined();
  expect(result.result).toMatchObject({ ok: true, version: 'fixture', reloads: 3 });
  expect(result.result.skills.data.find((skill: Skill.Info) => skill.id === 'brainstorming')).toMatchObject({
    path: '/skills/brainstorming/SKILL.md', content: '# Design fixture\n',
  });
  expect(result.skillReloads).toBe(3);
  expect(result.commandReloads).toBe(3);
});

test('native checker rejects correct bodies at the wrong stable path', async () => {
  const skills = sources();
  skills[0] = { ...skills[0]!, path: '/normalized/SKILL.md' as Skill.Info['path'] };
  const result = await check(expectations, skills);
  expect(result.error).toBeDefined();
  expect(result.result).toMatchObject({ ok: false });
  expect(result.result.error).toContain('brainstorming: exact native path');
});

for (const [name, paths] of [
  ['missing paths', undefined],
  ['missing ID', { 'writing-plans': null }],
  ['extra ID', { ...expectations.paths, extra: '/extra/SKILL.md' }],
  ['absent body with present path', { ...expectations.paths, 'writing-plans': '/skills/writing-plans/SKILL.md' }],
  ['present body with null path', { ...expectations.paths, brainstorming: null }],
] as const) {
  test(`native checker rejects ${name} expectations`, async () => {
    const result = await check({ ...expectations, paths });
    expect(result.error).toBeDefined();
    expect(result.result).toMatchObject({ ok: false });
    expect(result.result.error).toContain('path expectations');
  });
}

test('native checker rejects a path changed only during replay', async () => {
  const result = await check(expectations, sources(), skills => {
    skills[0] = { ...skills[0]!, path: '/changed/SKILL.md' as Skill.Info['path'] };
  });
  expect(result.error).toBeDefined();
  expect(result.result).toMatchObject({ ok: false });
  expect(result.result.error).toContain('skill replay 1');
});

test('native checker still rejects incomplete bodies even at the correct path', async () => {
  const skills = sources();
  skills[0] = { ...skills[0]!, content: '# Design' };
  const result = await check(expectations, skills);
  expect(result.error).toBeDefined();
  expect(result.result.error).toContain('brainstorming: full native body');
});
