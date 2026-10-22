import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parseSkillFile, type SkillFile, type SupportedSkill } from '../../src/skill.js';

export const skillIDs = ['brainstorming', 'writing-plans'] as const;

export function fixture(id: SupportedSkill): string {
  return readFileSync(new URL(`../fixtures/superpowers-7.0.0/${id}.md`, import.meta.url), 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replaceAll('\r\n', '\n');
}

export function expected(id: SupportedSkill): string {
  return readFileSync(new URL(`../expected/${id}.md`, import.meta.url), 'utf8');
}

const sentenceMutations: Record<SupportedSkill, readonly [string, string]> = {
  brainstorming: ['You are very good at building.', 'You are very good at local building.'],
  'writing-plans': ['## Overview', '## Local overview'],
};

export function mutateSentence(id: SupportedSkill, body: string): string {
  const [from, to] = sentenceMutations[id];
  const first = body.indexOf(from);
  assert(first >= 0 && body.indexOf(from, first + from.length) < 0,
    `${id}: mutation anchor must occur exactly once`);
  return body.replace(from, to);
}

const sharedSkillURL = new URL('../../skills/superpowers-audit/SKILL.md', import.meta.url);

export async function sharedSkill(): Promise<SkillFile> {
  return parseSkillFile(await readFile(sharedSkillURL, 'utf8'));
}

export async function sharedBody(): Promise<string> {
  return (await sharedSkill()).body;
}
