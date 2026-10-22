import { parse } from 'yaml';
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

export function renderConfiguration(options: OptionsResult): string {
  return options.ok
    ? `## Configuration\n\n${indentedJson(options.value)}`
    : `## Configuration error\n\nRequest correction from the human before auditor dispatch. Do not use fallback defaults.\n\n${indentedJson({ message: options.message })}`;
}

export function renderAuditSkill(
  body: string,
  dispatch: string,
  options: OptionsResult,
  integrations: readonly IntegrationStatus[],
): string {
  const configuration = renderConfiguration(options);
  const statuses = integrations.map(({ id, status, reason }) =>
    `- ${id}: ${status}${reason === undefined ? '' : ` — ${JSON.stringify(reason)}`}`,
  ).join('\n');

  // Add only missing separators; supplied trailing whitespace belongs to the body.
  const separator = body === '' || /(?:\r?\n){2}$/.test(body) ? '' : body.endsWith('\n') ? '\n' : '\n\n';
  return `${body}${separator}${dispatch.trimEnd()}\n\n${configuration}\n\n## Registry content integration\n\n${statuses ? statuses + '\n\n' : ''}This is not a per-agent permission verdict. Report known native load denials without enumerating unknown permissions or enabling skills. For unavailable integrations, check that this plugin is listed after Superpowers and that the source skill is present. Manual auditing requires its command and this shared skill to be registered and permitted.\n`;
}

export interface SkillFile {
  name: string;
  description: string;
  body: string;
}

const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

// The shared skill's YAML frontmatter is its only metadata source; the body
// after it is returned byte for byte.
export function parseSkillFile(text: string): SkillFile {
  const match = frontmatter.exec(text);
  if (!match) throw new Error('Skill file must begin with YAML frontmatter');
  const metadata: unknown = parse(match[1]!);
  const { name, description } = (typeof metadata === 'object' && metadata !== null ? metadata : {}) as
    Record<string, unknown>;
  if (typeof name !== 'string' || typeof description !== 'string') {
    throw new Error('Skill frontmatter requires string name and description');
  }
  return { name, description, body: text.slice(match[0].length) };
}
