import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { adaptSkill, supportedHashes, withIntegrationNotice } from '../src/superpowers.js';
import { expected, fixture, skillIDs } from './support/fixtures.js';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

for (const id of skillIDs) {
  const body = fixture(id);
  const golden = expected(id);

  test(`${id}: exact complete transform, CRLF, and repeat application`, () => {
    expect(hash(body)).toBe(supportedHashes[id].baseline);
    expect(hash(golden)).toBe(supportedHashes[id].transformed);
    expect(adaptSkill(id, body)).toEqual({ status: 'integrated', content: golden });
    expect(adaptSkill(id, golden)).toEqual({ status: 'integrated', content: golden });
    expect(adaptSkill(id, body.replaceAll('\n', '\r\n')).content).toBe(golden);
    expect(adaptSkill(id, golden.replaceAll('\n', '\r\n')).content).toBe(golden);
  });

  for (const [name, changed] of [
    ['appended requirement', body + '\nAdditional project requirement.\n'],
    ['same-ID replacement', 'Use this project-specific workflow instead.\n'],
    ['audit words', 'This body mentions superpowers-audit but is not supported.\n'],
    ['marker only', `<!-- opencode-superpowers-audit:unavailable:${id} -->\n${body}`],
    ['unknown CRLF', '# Local workflow\r\nKeep these bytes.\r\n'],
    ['one changed sentence', body.replace('## Overview', '## Local overview').replace('Help turn ideas', 'Help turn local ideas')],
  ]) {
    test(`${id}: ${name} stays incompatible with original bytes below one notice`, () => {
      const notice = `<!-- opencode-superpowers-audit:unavailable:${id} -->\n`
        + '## Audit integration unavailable\n'
        + `Tell the human that automatic audit integration for ${id} is unavailable\n`
        + 'for this definition. Reason: Unsupported Superpowers definition.\n'
        + 'Its original workflow follows unchanged. Manual `/audit` remains available after\n'
        + 'self-review when the command and shared audit skill are loaded and permitted.\n'
        + 'Automatic integration requires a supported Superpowers definition.\n\n';
      const once = adaptSkill(id, changed!);
      expect(once).toEqual({
        status: 'incompatible', content: notice + changed,
        reason: 'Unsupported Superpowers definition.',
      });
      expect(adaptSkill(id, once.content)).toEqual(once);
    });
  }

  test(`${id}: complete failure notices stay single and never mark an unknown body integrated`, () => {
    const reason = 'Automatic adaptation failed; see native plugin diagnostics.';
    const once = withIntegrationNotice(id, body, reason);
    expect(once.endsWith('\n\n' + body)).toBe(true);
    expect(withIntegrationNotice(id, once, reason)).toBe(once);
    expect(adaptSkill(id, once).status).toBe('incompatible');
    expect(adaptSkill(id, once).content).toBe(once);
    const crlf = once.replaceAll('\n', '\r\n');
    expect(withIntegrationNotice(id, crlf, reason)).toBe(crlf);
  });
}

test('transformed handoffs include actual outcomes, reports, and renewed review after human edits', () => {
  const spec = adaptSkill('brainstorming', fixture('brainstorming')).content;
  const plan = adaptSkill('writing-plans', fixture('writing-plans')).content;
  expect(spec).toContain('Spec: <path>. Audit: <actual outcome>; report: <report path>.');
  expect(spec).toContain('re-run self-review and a fresh audit before renewed handoff');
  expect(plan).toContain('rerun self-review and\nstart a fresh audit before renewed handoff');
  for (const ending of ['Which execution approach would you prefer?**', 'Does the plan capture what you want?"**']) {
    expect(plan).toContain('**"Plan: `<plan path>`. Audit: <actual outcome>; report: `<report path>`. Please review both. ' + ending);
  }
});
