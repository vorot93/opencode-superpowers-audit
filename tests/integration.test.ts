import { afterAll, afterEach, expect, spyOn, test } from 'bun:test';
import { integrateSuperpowers } from '../src/integration.js';
import { adaptSkill } from '../src/superpowers.js';
import { expected, fixture, skillIDs } from './support/fixtures.js';
import { Skills, sourceSkills } from './support/registry.js';

const diagnostics = spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => diagnostics.mockClear());
afterAll(() => diagnostics.mockRestore());

function assertIsolated(editor: Skills, statuses: ReturnType<typeof integrateSuperpowers>, writable: boolean) {
  expect(statuses).toEqual([
    { id: 'brainstorming', status: 'unavailable', reason: 'Automatic adaptation failed; see native plugin diagnostics.' },
    { id: 'writing-plans', status: 'integrated' },
  ]);
  const content = editor.get('brainstorming')!.content;
  if (writable) {
    expect(content).toContain('Reason: Automatic adaptation failed; see native plugin diagnostics.');
    expect(content.split('## Audit integration unavailable')).toHaveLength(2);
    expect(content.endsWith('\n\n' + fixture('brainstorming'))).toBe(true);
  } else {
    expect(content).toBe(fixture('brainstorming'));
  }
  expect(editor.get('writing-plans')!.content).toBe(expected('writing-plans'));
  expect(diagnostics.mock.calls[0]?.[0]).toBe('[superpowers-audit] brainstorming adaptation failed');
}

test('adapter failure keeps the source under one notice while the other skill integrates', () => {
  const editor = new Skills(sourceSkills());
  const error = new Error('broken adapter');
  const statuses = integrateSuperpowers(editor, (id, content) => {
    if (id === 'brainstorming') throw error;
    return adaptSkill(id, content);
  });
  assertIsolated(editor, statuses, true);
  expect(diagnostics.mock.calls[0]?.[1]).toBe(error);
});

for (const always of [false, true]) {
  test(`${always ? 'all' : 'first'} source updates reject without losing the other integration`, () => {
    let attempted = false;
    const error = new Error('source update rejected');
    const editor = new Skills(sourceSkills(), { update(id) {
      if (id === 'brainstorming' && (always || !attempted)) { attempted = true; throw error; }
    } });
    assertIsolated(editor, integrateSuperpowers(editor), !always);
    expect(diagnostics).toHaveBeenCalledTimes(always ? 2 : 1);
    if (always) expect(diagnostics.mock.calls[1]).toEqual([
      '[superpowers-audit] brainstorming notice could not be written', error,
    ]);
  });
}

for (const missing of skillIDs) {
  test(`missing ${missing} stays absent and returns order guidance`, () => {
    const editor = new Skills(sourceSkills().filter(skill => skill.id !== missing));
    const statuses = integrateSuperpowers(editor);
    expect(editor.get(missing)).toBeUndefined();
    expect(statuses.find(status => status.id === missing)).toEqual({
      id: missing, status: 'unavailable',
      reason: 'Source skill not visible; check plugin order after Superpowers and source availability.',
    });
    expect(diagnostics).not.toHaveBeenCalled();
  });
}
