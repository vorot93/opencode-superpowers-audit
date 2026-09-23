import { expect, test } from 'bun:test';
import { parseOptions } from '../src/options.js';

test('defaults are usable without a configured model mapping', () => {
  expect(parseOptions({})).toEqual({ ok: true, value: { reviewers: {}, maxRounds: 5 } });
});

for (const maxRounds of [0, -1, 1.5, '5', Number.POSITIVE_INFINITY, Number.NaN, null]) {
  test(`rejects round limit ${maxRounds}`, () => {
    expect(parseOptions({ maxRounds }).ok).toBe(false);
  });
}

test('supports provider/model paths and reviewer variants', () => {
  expect(parseOptions({ reviewers: { 'gateway/team/writer': 'other/reviewer#high' } }).ok).toBe(true);
  expect(parseOptions({ reviewers: { 'a/writer#high': 'b/reviewer' } }).ok).toBe(false);
  expect(parseOptions({ reviewers: { 'a/writer': 'missing-provider' } }).ok).toBe(false);
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
  { artifactDirectory: ' \t ' }, { artifactDirectory: 42 }, { reviewers: [] },
  { reviewers: { 'a/writer': 'b/reviewer#' } },
  { reviewers: { 'a/writer': 'b/reviewer#high#extra' } },
  { reviewers: { 'a/writer': 'b/re viewer' } },
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
