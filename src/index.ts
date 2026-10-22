import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin, Skill } from '@opencode/plugin';
import { createAuditCommand } from './command.js';
import { integrateSuperpowers } from './integration.js';
import { parseOptions } from './options.js';
import { AUDIT_SKILL_ID, parseSkillFile, renderAuditSkill } from './skill.js';

const skillURL = new URL('../skills/superpowers-audit/SKILL.md', import.meta.url);
const dispatchURL = new URL('../skills/superpowers-audit/references/opencode.md', import.meta.url);

export default {
  id: 'opencode-superpowers-audit',
  async setup(ctx) {
    const options = parseOptions(ctx.options);
    const { name, description, body } = parseSkillFile(readFileSync(skillURL, 'utf8'));
    if (name !== AUDIT_SKILL_ID) throw new Error(`Shared skill name must be ${AUDIT_SKILL_ID}, found ${name}`);
    const dispatch = readFileSync(dispatchURL, 'utf8');
    const metadata = {
      id: AUDIT_SKILL_ID as Skill.Info['id'],
      name: 'Superpowers Audit' as Skill.Info['name'],
      description,
      path: fileURLToPath(skillURL) as Skill.Info['path'],
    };
    await ctx.skill.transform(editor => {
      const integrations = integrateSuperpowers(editor);
      editor.add({ ...metadata, content: renderAuditSkill(body, dispatch, options, integrations) });
    });
    await ctx.command.transform(editor => { editor.add(createAuditCommand(ctx.session)); });
  },
} satisfies Plugin.Plugin;
