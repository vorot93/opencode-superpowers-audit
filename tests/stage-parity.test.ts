import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { SupportedSkill } from '../src/skill.js';
import { expected, fixture, skillIDs } from './support/fixtures.js';

// Claude Code adds each stage beside the unchanged upstream skill; OpenCode
// splices it into the body. These expectations keep the two hosts' stages aligned.
const amendment = (id: SupportedSkill) =>
  readFileSync(new URL(`../integration/claude-code/${id}.md`, import.meta.url), 'utf8');

const flat = (text: string) => text.replace(/\s+/g, ' ');

const sharedStages: Record<SupportedSkill, readonly string[]> = {
  brainstorming: [
    'builder check',
    'self-review',
    'superpowers-audit',
    'fresh audit',
    'Do you approve this design for planning?',
    'Spec: `<spec path>`. Audit: <actual outcome>; report: `<report path>`. My calls: <short list>.',
    "builder check's one question round does not waive",
  ],
  'writing-plans': [
    'superpowers-audit',
    'fresh audit',
    'execution method',
    'Plan: `<plan path>`. Audit: <actual outcome>; report: `<report path>`. Please review both.',
    'Which execution approach would you prefer?',
    'Does the plan capture what you want?',
  ],
};

// Upstream 7.0.0 steps each amendment quotes as superseded.
const superseded: Record<SupportedSkill, readonly string[]> = {
  brainstorming: [
    "Don't hand over the document until the check is back.",
    'then hand it over with a short list of the calls you made',
    "After a project's document is approved, the next step is the plan.",
  ],
  'writing-plans': [
    'No need to re-review — just fix and move on.',
    'After saving and self-reviewing the plan, link it for your human partner to read.',
    'Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Please review the plan.',
  ],
};

function expectInOrder(text: string, parts: readonly string[]) {
  let previous = -1;
  for (const part of parts) {
    const at = text.indexOf(part);
    expect(at).toBeGreaterThan(previous);
    previous = at;
  }
}

test('shared stage strings appear in both hosts', () => {
  for (const id of skillIDs) {
    for (const text of sharedStages[id]) {
      expect(expected(id)).toContain(text);
      expect(amendment(id)).toContain(text);
    }
  }
});

test('Claude Code amendments are complete on their own', () => {
  const brainstorming = amendment('brainstorming');
  expectInOrder(brainstorming, [
    'builder check', 'self-review', 'superpowers-audit:superpowers-audit', 'Do you approve this design for planning?',
  ]);
  for (const route of ['quick, clear task', 'small change', 'skip the questions', 'spike']) {
    expect(brainstorming).toContain(route);
  }
  expectInOrder(amendment('writing-plans'), ['superpowers-audit:superpowers-audit', 'Execution Handoff']);

  for (const id of skillIDs) {
    expect(amendment(id)).toStartWith(`## superpowers-audit amendment to superpowers:${id}\n`);
    expect(amendment(id)).toContain('supersede');
    for (const step of superseded[id]) {
      expect(flat(fixture(id))).toContain(step);
      expect(flat(amendment(id))).toContain(step);
    }
  }
});
