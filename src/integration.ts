import type { SkillEditor } from '@opencode/plugin/promise/skill';
import type { IntegrationStatus } from './skill.js';
import { adaptSkill, withIntegrationNotice } from './superpowers.js';

export function integrateSuperpowers(
  editor: SkillEditor, adapt: typeof adaptSkill = adaptSkill,
): IntegrationStatus[] {
  return (['brainstorming', 'writing-plans'] as const).map((id): IntegrationStatus => {
    let original: string | undefined;
    try {
      const current = editor.get(id);
      if (!current) return {
        id, status: 'unavailable',
        reason: 'Source skill not visible; check plugin order after Superpowers and source availability.',
      };
      original = current.content;
      const result = adapt(id, original);
      editor.update(id, skill => { skill.content = result.content; });
      return { id, status: result.status, ...(result.reason ? { reason: result.reason } : {}) };
    } catch (error) {
      console.error(`[superpowers-audit] ${id} adaptation failed`, error);
      const reason = 'Automatic adaptation failed; see native plugin diagnostics.';
      if (original !== undefined) {
        try {
          const content = withIntegrationNotice(id, original, reason);
          editor.update(id, skill => { skill.content = content; });
        } catch (noticeError) {
          console.error(`[superpowers-audit] ${id} notice could not be written`, noticeError);
        }
      }
      return { id, status: 'unavailable', reason };
    }
  });
}
