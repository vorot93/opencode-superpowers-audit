import { expect, test } from 'bun:test';
import type { Skill } from '@opencode/plugin';
import type { CommandInvocation } from '@opencode/plugin/promise/command';
import { createAuditCommand } from '../src/command.js';
import { promptRecorder } from './support/session.js';

const suffix = '\n\nLoad the native superpowers-audit skill and follow its workflow in this session. '
  + 'The preceding command arguments identify the target; clarify missing or ambiguous input.';
const sessionID = 'ses_writer' as CommandInvocation['sessionID'];
const prompts: CommandInvocation['prompt'][] = [
  { text: '' },
  { text: '"plans/Über spec.md"' },
  {
    text: '📄 @spec @general $brainstorming',
    files: [{ uri: 'file:///project/plans/%C3%9Cber%20spec.md', name: 'Über spec.md',
      description: 'Target document', mention: { start: 3, end: 8, text: '@spec' } }],
    agents: [{ name: 'general', mention: { start: 9, end: 17, text: '@general' } }],
    skills: [{ id: 'brainstorming' as Skill.ID, mention: { start: 18, end: 32, text: '$brainstorming' } }],
  },
];

for (const delivery of ['steer', 'queue'] as const) {
  for (const input of prompts) {
    test(`${delivery}: append instructions without moving mentions in ${JSON.stringify(input.text)}`, async () => {
      const original = structuredClone(input);
      const { session, prompt } = promptRecorder();
      const command = createAuditCommand(session);
      expect(command.name).toBe('audit');
      await command.execute({ sessionID, prompt: input, delivery });
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(prompt.mock.calls[0]).toEqual([{ ...original, sessionID, delivery, text: original.text + suffix }]);
      expect(input).toEqual(original);
      const sent = prompt.mock.calls[0]![0];
      expect(sent.files).toBe(input.files);
      expect(sent.agents).toBe(input.agents);
      expect(sent.skills).toBe(input.skills);
    });
  }
}

test('native prompt rejection propagates without retry or direct auditor dispatch', async () => {
  const { session, prompt } = promptRecorder();
  const failure = new Error('native prompt denied');
  prompt.mockRejectedValueOnce(failure);
  await expect(createAuditCommand(session).execute({ sessionID, prompt: { text: 'spec.md' }, delivery: 'steer' }))
    .rejects.toBe(failure);
  expect(prompt).toHaveBeenCalledTimes(1);
});
