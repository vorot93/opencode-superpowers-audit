import { expect, test } from 'bun:test';
import { parseOptions } from '../src/options.js';
import { configVectors } from './support/config-vectors.js';

test('defaults are usable without a configured model mapping', () => {
  expect(parseOptions({})).toEqual({ ok: true, value: { reviewers: {}, maxRounds: 5 } });
});

for (const vector of configVectors.filter(v => v.options !== undefined)) {
  test(`shared vector: ${vector.name}`, () => {
    const result = parseOptions(vector.options);
    expect(result.ok).toBe(vector.valid);
    if (result.ok) return;
    const key = vector.errorKey!;
    expect(result.message.split('\n').some(line => line.startsWith(`${key}:`) || line.startsWith(`${key}.`))).toBe(true);
  });
}

for (const maxRounds of [-1, '5', Number.POSITIVE_INFINITY, Number.NaN, null]) {
  test(`rejects round limit ${maxRounds}`, () => {
    expect(parseOptions({ maxRounds }).ok).toBe(false);
  });
}

test('rejects unknown option keys', () => {
  expect(parseOptions({ rounds: 2 }).ok).toBe(false);
});

test('retains custom settings and leaves relative artifact paths for the writer', () => {
  expect(parseOptions({
    reviewers: { 'gateway/team/writer': 'other/team/reviewer#high' },
    maxRounds: 1,
    artifactDirectory: '  ../project/notes  ',
  })).toEqual({
    ok: true,
    value: {
      reviewers: { 'gateway/team/writer': 'other/team/reviewer#high' },
      maxRounds: 1,
      artifactDirectory: '../project/notes',
    },
  });
});

for (const input of [undefined, null, [], 'options', { artifactDirectory: '' },
  { artifactDirectory: 42 }, { reviewers: [] },
  { reviewers: { 'a/ writer': 'b/reviewer' } },
  { reviewers: { '/writer': 'b/reviewer' } },
]) {
  test(`rejects malformed options ${JSON.stringify(input)}`, () => {
    expect(parseOptions(input).ok).toBe(false);
  });
}

test('returns actionable paths for every configuration issue', () => {
  const result = parseOptions({ maxRounds: 0, artifactDirectory: '', rounds: 2 });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected invalid options');
  expect(result.message).toContain('maxRounds:');
  expect(result.message).toContain('artifactDirectory:');
  expect(result.message).toContain('options:');
  expect(result.message.split('\n')).toHaveLength(3);
});
