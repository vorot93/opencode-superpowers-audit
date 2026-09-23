import type { OptionsResult } from './options.js';

export type SupportedSkill = 'brainstorming' | 'writing-plans';

// Registry content seen by the transform, not a session permission verdict.
export interface IntegrationStatus {
  id: SupportedSkill;
  status: 'integrated' | 'unavailable' | 'incompatible';
  reason?: string;
}

export const AUDIT_SKILL_ID = 'superpowers-audit';

function indentedJson(value: unknown): string {
  return JSON.stringify(value, null, 2).split('\n').map(line => '    ' + line).join('\n');
}

export function renderAuditSkill(
  body: string,
  options: OptionsResult,
  integrations: readonly IntegrationStatus[],
): string {
  const configuration = options.ok
    ? `## Configuration\n\n${indentedJson(options.value)}`
    : `## Configuration error\n\nRequest correction from the human before auditor dispatch. Do not use fallback defaults.\n\n${indentedJson({ message: options.message })}`;
  const statuses = integrations.map(({ id, status, reason }) =>
    `- ${id}: ${status}${reason === undefined ? '' : ` — ${JSON.stringify(reason)}`}`,
  ).join('\n');

  // Add only missing separators; supplied trailing whitespace belongs to the body.
  const separator = body === '' || /(?:\r?\n){2}$/.test(body) ? '' : body.endsWith('\n') ? '\n' : '\n\n';
  return `${body}${separator}${configuration}\n\n## Registry content integration\n\n${statuses ? statuses + '\n\n' : ''}This is not a per-agent permission verdict. Report known native load denials without enumerating unknown permissions or enabling skills. For unavailable integrations, check that this plugin is listed after Superpowers and that the source skill is present. Manual auditing requires its command and this shared skill to be registered and permitted.\n`;
}
