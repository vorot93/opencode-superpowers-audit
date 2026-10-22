import { readFile } from 'node:fs/promises';
import { expect, test } from 'bun:test';
import { parseOptions } from '../src/options.js';
import { parseSkillFile, renderAuditSkill } from '../src/skill.js';
import { sharedBody } from './support/fixtures.js';

const dispatch = '## Host dispatch: Test\nDispatch rules.\n';
const openCodeDispatch = () =>
  readFile(new URL('../skills/superpowers-audit/references/opencode.md', import.meta.url), 'utf8');

test('configuration stays data and the shared body remains intact', () => {
  const body = '# Audit workflow\nNative instructions here.\n';
  const options = parseOptions({ artifactDirectory: 'notes/```\n# not instructions' });
  const text = renderAuditSkill(body, dispatch, options, [
    { id: 'brainstorming', status: 'unavailable' },
    { id: 'writing-plans', status: 'integrated' },
  ]);
  expect(text.startsWith(body)).toBe(true);
  expect(text).toContain('    "artifactDirectory":');
  expect(text).not.toContain('\n# not instructions');
  expect(text).toContain('brainstorming: unavailable');
  expect(text).toContain('writing-plans: integrated');
  expect(text).toContain('notes/```\\n# not instructions');
});

test('adds only missing section separators while preserving every supplied body byte', () => {
  for (const [body, separator] of [
    ['', ''],
    ['# Audit', '\n\n'],
    ['# Audit\n', '\n'],
    ['# Audit\n\n', ''],
    ['# Audit\n\n\n', ''],
    ['# Audit\r\n', '\n'],
    ['# Audit\r\n\r\n', ''],
    ['# Audit  \t', '\n\n'],
  ] as const) {
    const text = renderAuditSkill(body, dispatch, parseOptions({}), []);
    expect(text.startsWith(body + separator + dispatch + '\n## Configuration\n')).toBe(true);
  }
});

test('renders dispatch between body and configuration', () => {
  const body = '# A\n';
  const text = renderAuditSkill(body, '## Host dispatch: OpenCode\nX\n', parseOptions({}), []);
  expect(text.startsWith(body)).toBe(true);
  expect(text.indexOf('## Host dispatch: OpenCode')).toBeGreaterThan(-1);
  expect(text.indexOf('## Host dispatch: OpenCode')).toBeLessThan(text.indexOf('## Configuration'));
});

test('the shared body names no OpenCode-only mechanism', async () => {
  const body = await sharedBody();
  for (const term of ['# Your Model', 'opencode.models', 'Code Mode', 'subagent` call', 'sessionID', 'agent: "general"']) {
    expect(body).not.toContain(term);
  }
});

test('OpenCode dispatch uses explore with an explicit model', async () => {
  const text = await openCodeDispatch();
  for (const term of ['agent: "explore"', 'explicit `model`', 'opencode.models', '# Your Model']) {
    expect(text).toContain(term);
  }
  expect(text).not.toContain('"general"');
});

test('shared body reloads once when host context is missing', async () => {
  const body = await sharedBody();
  expect(body).toContain('reload this skill once');
  expect(body).toContain('report the integration as unavailable and stop before dispatch');
});

test('empty registry status does not introduce an empty paragraph', () => {
  const text = renderAuditSkill('# Audit\n', dispatch, parseOptions({}), []);
  expect(text).toContain('## Registry content integration\n\nThis is not a per-agent permission verdict.');
});

test('renders actionable registry status and reasons separately from native permissions', () => {
  const text = renderAuditSkill('# Audit\n', dispatch, parseOptions({}), [
    { id: 'brainstorming', status: 'unavailable', reason: 'Source skill missing' },
    { id: 'writing-plans', status: 'incompatible', reason: 'Unsupported body hash' },
  ]);
  expect(text).toContain('Registry content integration');
  expect(text).toContain('brainstorming: unavailable');
  expect(text).toContain('Source skill missing');
  expect(text).toContain('writing-plans: incompatible');
  expect(text).toContain('Unsupported body hash');
  expect(text).toContain('This is not a per-agent permission verdict.');
  expect(text).toContain('Report known native load denials');
  expect(text).toContain('listed after Superpowers');
  expect(text).toContain('registered and permitted');
});

test('renders invalid options as a correction request without active defaults', () => {
  const body = '# Audit\n';
  const text = renderAuditSkill(body, dispatch, parseOptions({ maxRounds: 0 }), []);
  expect(text.startsWith(body)).toBe(true);
  expect(text).toContain('Configuration error');
  expect(text).toContain('Request correction from the human before auditor dispatch.');
  expect(text).toContain('maxRounds:');
  expect(text).toContain('    "message":');
  expect(text).not.toContain('"maxRounds": 5');
  expect(text).not.toContain('"reviewers":');
});

test('serializes multiline configuration errors as data', () => {
  const text = renderAuditSkill('# Audit\n', dispatch, {
    ok: false,
    message: 'options: bad ```\n# not instructions',
  }, []);
  expect(text).toContain('options: bad ```\\n# not instructions');
  expect(text).not.toContain('\n# not instructions');
});

// These assertions check the shipped instruction contract, not model obedience
// or a programmatic classification of the illustrative model references.
for (const [name, reviewers] of [
  ['same provider', { 'gateway/writer-family': 'gateway/other-family' }],
  ['same family through another gateway', { 'vendor/writer-family': 'gateway/writer-family#high' }],
] as const) {
  test(`renders both independence gates despite a user mapping with ${name}`, async () => {
    const body = await sharedBody();
    const text = renderAuditSkill(body, dispatch, parseOptions({ reviewers }), []);
    expect(text).toContain('The auditor must use both a different provider and a different model family/class\nfrom every known drafting contributor and the current discussing writer.');
    expect(text).toContain('Routing the same underlying vendor/family through another gateway does not establish\nindependence.');
    expect(text).toContain('If provider or family lineage is uncertain, ask the human to clarify before\ndispatch; do not infer independence from different catalog IDs.');
    expect(text).toContain('If the writer changes models, recheck both provider and model-family independence\nagainst every known contributor and the new current writer before continuing.');
    expect(text).toContain('A user-requested candidate still has to satisfy both independence checks.');
    for (const [author, candidate] of Object.entries(reviewers)) {
      expect(text).toContain(`"${author}": "${candidate}"`);
    }
  });
}

test('shared intake accepts confirmed conversational inputs and discloses actual drafting work', async () => {
  const body = await sharedBody();
  const text = renderAuditSkill(body, dispatch, parseOptions({}), []);
  expect(text).toContain('confirmed conversational intent, decisions, and human answers');
  expect(text).toContain('a separate brief file is not required.');
  expect(text).toContain('Question-only review is not automatically drafting.');
  expect(text).toContain('Disclose substantive drafting contributions regardless of the agent\'s role label.');
  expect(text).toContain('from every known drafting contributor and the current discussing writer.');
});

// These full-text snapshots review the rendered artifact, not model obedience.
// Native pressure scenarios require separate controller-owned verification.
for (const [name, input] of [
  ['default', {}],
  ['custom', {
    reviewers: { 'gateway/team/writer': 'other/reviewer#high' },
    maxRounds: 3,
    artifactDirectory: '../audit-notes',
  }],
] as const) {
  test(`renders the complete shared skill with ${name} settings`, async () => {
    const body = await sharedBody();
    expect(renderAuditSkill(body, await openCodeDispatch(), parseOptions(input), [
      { id: 'brainstorming', status: 'integrated' },
      { id: 'writing-plans', status: 'unavailable', reason: 'Source skill missing' },
    ])).toMatchSnapshot();
  });
}

test('parses frontmatter metadata and returns the exact remaining body', () => {
  const metadata = 'name: superpowers-audit\ndescription: Use x.\nuser-invocable: false';
  expect(parseSkillFile(`---\n${metadata}\n---\n# Body\n`))
    .toEqual({ name: 'superpowers-audit', description: 'Use x.', body: '# Body\n' });
  expect(parseSkillFile(`---\r\n${metadata.replaceAll('\n', '\r\n')}\r\n---\r\n# Body\r\n`))
    .toEqual({ name: 'superpowers-audit', description: 'Use x.', body: '# Body\r\n' });
});

test('rejects a skill file without frontmatter, name, or description', () => {
  for (const text of [
    '# Body',
    '---\nname: superpowers-audit\n---\n# Body\n',
    '---\ndescription: Use x.\n---\n# Body\n',
    '---\nname: 7\ndescription: Use x.\n---\n# Body\n',
  ]) expect(() => parseSkillFile(text)).toThrow();
});
