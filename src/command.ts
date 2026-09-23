import type { Plugin } from '@opencode/plugin';
import type { CommandDefinition } from '@opencode/plugin/promise/command';
import { AUDIT_SKILL_ID } from './skill.js';

export const COMMAND_SUFFIX = `\n\nLoad the native ${AUDIT_SKILL_ID} skill and follow its workflow in this session. `
  + 'The preceding command arguments identify the target; clarify missing or ambiguous input.';

export function createAuditCommand(session: Pick<Plugin.Context['session'], 'prompt'>): CommandDefinition {
  return {
    name: 'audit',
    description: 'Discuss and correct a spec or plan with an independent auditor',
    async execute({ sessionID, prompt, delivery }) {
      // Appending keeps the native attachment mention offsets in the original text.
      await session.prompt({ ...prompt, sessionID, delivery, text: prompt.text + COMMAND_SUFFIX });
    },
  };
}
