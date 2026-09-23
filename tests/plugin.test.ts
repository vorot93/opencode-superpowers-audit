import { expect, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CommandInvocation } from '@opencode/plugin/promise/command';
import plugin from '../src/index.js';
import { expected, fixture, skillIDs } from './support/fixtures.js';
import { pluginContext, registry, skillInfo, sourceSkills } from './support/registry.js';
import { promptRecorder } from './support/session.js';

const auditID = 'superpowers-audit';
const invocation: CommandInvocation = {
  sessionID: 'ses_writer' as CommandInvocation['sessionID'], delivery: 'queue', prompt: { text: 'plan.md' },
};

async function loaded(host = registry(), options = {}) {
  const { session, prompt } = promptRecorder();
  const owner = pluginContext(host, session, options);
  await plugin.setup(owner.ctx);
  expect(prompt).not.toHaveBeenCalled();
  return { host, prompt, owner };
}

function assertGolden(host: ReturnType<typeof registry>) {
  for (const id of skillIDs) {
    expect(host.skills.get(id)).toEqual({ ...skillInfo(id, fixture(id)), content: expected(id) });
  }
  expect(host.skills.list().filter(skill => String(skill.id) === auditID)).toHaveLength(1);
  expect([...host.commands.keys()]).toEqual(['audit']);
}

async function assertManual({ host, prompt }: Awaited<ReturnType<typeof loaded>>) {
  expect(host.skills.get(auditID)).toBeDefined();
  await host.commands.get('audit')!.execute(invocation);
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(prompt.mock.calls[0]?.[0]).toEqual({
    sessionID: invocation.sessionID, delivery: 'queue',
    text: 'plan.md\n\nLoad the native superpowers-audit skill and follow its workflow in this session. '
      + 'The preceding command arguments identify the target; clarify missing or ambiguous input.',
  });
}

test('registers golden skills and one native command using only transforms and prompt', async () => {
  const result = await loaded();
  assertGolden(result.host);
  const audit = result.host.skills.get(auditID)!;
  const skillURL = new URL('../skills/superpowers-audit/SKILL.md', import.meta.url);
  expect(audit).toMatchObject({
    id: auditID, name: 'Superpowers Audit', path: fileURLToPath(skillURL),
    description: 'Use after spec/plan self-review or for a requested document audit.',
  });
  expect(audit.content.startsWith(fs.readFileSync(skillURL, 'utf8'))).toBe(true);
  expect(audit.content).toContain('brainstorming: integrated');
  expect(audit.content).toContain('writing-plans: integrated');
  expect(audit.content).toContain('not a per-agent permission verdict');
  expect(audit.content).toContain('Report known native load denials');
  await assertManual(result);
});

test('a changed sentence preserves the unknown definition and reports incompatibility', async () => {
  const changed = fixture('brainstorming').replace('Help turn ideas', 'Help turn local ideas');
  const host = registry([skillInfo('brainstorming', changed), skillInfo('writing-plans', fixture('writing-plans'))]);
  const result = await loaded(host);
  const content = host.skills.get('brainstorming')!.content;
  expect(content.endsWith('\n\n' + changed)).toBe(true);
  expect(content.split('## Audit integration unavailable')).toHaveLength(2);
  expect(host.skills.get('writing-plans')!.content).toBe(expected('writing-plans'));
  expect(host.skills.get(auditID)!.content).toContain('brainstorming: incompatible');
  for (let i = 0; i < 3; i++) { host.rebuild(); expect(host.skills.get('brainstorming')!.content).toBe(content); }
  await assertManual(result);
});

for (const missing of skillIDs) {
  test(`missing ${missing} is never recreated; manual audit still registers`, async () => {
    const result = await loaded(registry(sourceSkills().filter(skill => skill.id !== missing)));
    expect(result.host.skills.get(missing)).toBeUndefined();
    expect(result.host.skills.get(auditID)!.content).toContain(`${missing}: unavailable`);
    expect(result.host.skills.get(auditID)!.content).toContain('check plugin order after Superpowers');
    await assertManual(result);
  });
}

test('hidden-but-loadable and unrelated definitions retain all metadata', async () => {
  const hidden = { ...skillInfo('brainstorming', fixture('brainstorming')), autoinvoke: false };
  const unrelated = skillInfo('local-workflow', 'Project-specific rules.\r\n', false);
  const { host } = await loaded(registry([hidden, skillInfo('writing-plans', fixture('writing-plans')), unrelated]));
  expect(host.skills.get('brainstorming')).toEqual({ ...hidden, content: expected('brainstorming') });
  expect(host.skills.get('local-workflow')).toEqual(unrelated);
  expect(host.skills.get(auditID)!.content).toContain('brainstorming: integrated');
});

test('rebuild, repeated setup, and host disposal preserve effective inventory and restore originals', async () => {
  const source = sourceSkills();
  const host = registry(source);
  const first = await loaded(host);
  const skills = host.skills.list();
  for (let i = 0; i < 3; i++) { host.rebuild(); expect(host.skills.list()).toEqual(skills); assertGolden(host); }
  const second = await loaded(host);
  expect(host.skills.list()).toEqual(skills);
  assertGolden(host);
  await first.owner.dispose();
  assertGolden(host);
  await second.owner.dispose();
  expect(host.skills.list()).toEqual(source);
  expect(host.commands.size).toBe(0);
  const reloaded = await loaded(host);
  assertGolden(host);
  await reloaded.owner.dispose();
  expect(host.skills.list()).toEqual(source);
});

test('registry status recomputes when an earlier source transform changes on replay', async () => {
  const host = registry([]);
  let source = sourceSkills();
  await host.skill.transform(editor => source.forEach(skill => editor.add(skill)));
  await loaded(host);
  assertGolden(host);
  source = [skillInfo('brainstorming', 'Project replacement.')];
  host.rebuild();
  expect(host.skills.get(auditID)!.content).toContain('brainstorming: incompatible');
  expect(host.skills.get(auditID)!.content).toContain('writing-plans: unavailable');
  source = sourceSkills();
  host.rebuild();
  assertGolden(host);
});

test('invalid options remain visible through the shared skill without dispatch', async () => {
  const result = await loaded(registry(), { maxRounds: 0 });
  expect(result.host.skills.get(auditID)!.content).toContain('## Configuration error');
  expect(result.host.skills.get(auditID)!.content).toContain('Request correction from the human before auditor dispatch.');
  await assertManual(result);
});

test('existing shared skill ID is replaced, with the original restored on disposal', async () => {
  const existing = skillInfo(auditID, 'Earlier definition.');
  const result = await loaded(registry([...sourceSkills(), existing]));
  assertGolden(result.host);
  expect(result.host.skills.get(auditID)!.content).not.toBe(existing.content);
  await result.owner.dispose();
  expect(result.host.skills.get(auditID)).toEqual(existing);
});

test('audit before Superpowers reports order guidance and does not intercept later sources', async () => {
  const result = await loaded(registry([]));
  await result.host.skill.transform(editor => sourceSkills().forEach(skill => editor.add(skill)));
  for (const id of skillIDs) {
    expect(result.host.skills.get(id)!.content).toBe(fixture(id));
    expect(result.host.skills.get(auditID)!.content).toContain(`${id}: unavailable`);
  }
  expect(result.host.skills.get(auditID)!.content).toContain('check plugin order after Superpowers');
  await assertManual(result);
});

for (const writable of [true, false]) {
  test(`optional update failure reports unavailable; notice writable=${writable}`, async () => {
    const error = new Error('optional update rejected');
    let attempted = false;
    const diagnostics = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await loaded(registry(sourceSkills(), { update(id) {
        if (id === 'brainstorming' && (!writable || !attempted)) { attempted = true; throw error; }
      } }));
      expect(result.host.skills.get('writing-plans')!.content).toBe(expected('writing-plans'));
      expect(result.host.skills.get(auditID)!.content).toContain('brainstorming: unavailable');
      const text = result.host.skills.get('brainstorming')!.content;
      if (writable) {
        expect(text.split('## Audit integration unavailable')).toHaveLength(2);
        expect(text.endsWith('\n\n' + fixture('brainstorming'))).toBe(true);
      } else expect(text).toBe(fixture('brainstorming'));
      expect(diagnostics).toHaveBeenCalledTimes(writable ? 1 : 2);
      await assertManual(result);
    } finally { diagnostics.mockRestore(); }
  });
}

for (const failurePoint of ['shared skill', 'command'] as const) {
  test(`core ${failurePoint} registration failure remains visible`, async () => {
    const error = new Error(`core ${failurePoint} failure`);
    const host = registry(sourceSkills(), {
      addSkill(id) { if (failurePoint === 'shared skill' && id === auditID) throw error; },
      addCommand() { if (failurePoint === 'command') throw error; },
    });
    const { session, prompt } = promptRecorder();
    await expect(plugin.setup(pluginContext(host, session).ctx)).rejects.toBe(error);
    expect(host.commands.size).toBe(0);
    if (failurePoint === 'shared skill') expect(host.skills.get(auditID)).toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });
}

test('shared asset read failure rejects setup before any registration', async () => {
  const host = registry();
  const { session, prompt } = promptRecorder();
  const error = new Error('shared asset missing');
  const read = spyOn(fs, 'readFileSync').mockImplementationOnce(() => { throw error; });
  try {
    await expect(plugin.setup(pluginContext(host, session).ctx)).rejects.toBe(error);
    expect(host.skills.list()).toEqual(sourceSkills());
    expect(host.skills.get(auditID)).toBeUndefined();
    expect(host.commands.size).toBe(0);
    expect(prompt).not.toHaveBeenCalled();
  } finally { read.mockRestore(); }
});
