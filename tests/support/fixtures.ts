import { readFileSync } from 'node:fs';
import type { SupportedSkill } from '../../src/skill.js';

export const skillIDs = ['brainstorming', 'writing-plans'] as const;

export function fixture(id: SupportedSkill): string {
  return readFileSync(new URL(`../fixtures/superpowers-6.4.1/${id}.md`, import.meta.url), 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replaceAll('\r\n', '\n');
}

export function expected(id: SupportedSkill): string {
  return readFileSync(new URL(`../expected/${id}.md`, import.meta.url), 'utf8');
}
